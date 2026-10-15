import "server-only";
import { createHash } from "node:crypto";
import { after } from "next/server";
import { db, sleep } from "./mongo";

// Profile view counter, stored in MongoDB: { _id: "user:<login>", count }.
// Cold starts need ~1s to connect; stay well inside GitHub's image proxy timeout.
const WAIT_MS = 2500;

type ViewDoc = { _id: string; count: number; createdAt?: Date };

const collection = () => db()?.then((d) => d.collection<ViewDoc>("bannerviews")) ?? null;

// Recent visitors, so one person reloading doesn't inflate the count. Mongo's TTL index expires them.
const DEDUPE_SECONDS = 30 * 60;
type HitDoc = { _id: string; at: Date };
let hitsReady: Promise<unknown> | null = null;
const hits = () => {
  const d = db();
  if (!d) return null;
  return d.then(async (database) => {
    const col = database.collection<HitDoc>("viewhits");
    hitsReady ??= col.createIndex({ at: 1 }, { expireAfterSeconds: DEDUPE_SECONDS }).catch(() => (hitsReady = null));
    await hitsReady;
    return col;
  });
};

/**
 * Who is viewing, as an anonymous hash of IP + user agent, or null when that can't be known.
 * GitHub serves README images through its camo proxy, which hides the viewer, so those are
 * counted on every load (as every GitHub view counter does).
 */
export function visitorId(headers: Headers): string | null {
  const ua = headers.get("user-agent") ?? "";
  if (/github-camo/i.test(ua)) return null;
  const ip = headers.get("x-forwarded-for")?.split(",")[0].trim() || headers.get("x-real-ip") || "";
  if (!ip) return null;
  return createHash("sha256").update(`${ip}|${ua}`).digest("base64url").slice(0, 22);
}

/** True if this visitor already counted for `key` in the last 30 minutes (records the visit otherwise). */
async function seenRecently(key: string, visitor: string) {
  const col = hits();
  if (!col) return false;
  try {
    await (await col).insertOne({ _id: `${key}:${visitor}`, at: new Date() });
    return false;
  } catch (err) {
    // Duplicate key: the visit is already recorded and hasn't expired yet.
    return (err as { code?: number }).code === 11000;
  }
}

const lastKnown = new Map<string, number>();
const viewKey = (user: string) => `user:${user.toLowerCase()}`;

/**
 * Counts one view and returns the new total. Never holds the banner up for long:
 * if the database is slow, the last known total is returned and the write finishes after the response.
 */
export async function countView(user: string, visitor: string | null = null): Promise<number | undefined> {
  const col = collection();
  if (!col) return undefined;
  const key = viewKey(user);

  const write = col
    .then(async (c) => {
      if (visitor && (await seenRecently(key, visitor))) return c.findOne({ _id: key });
      return c.findOneAndUpdate(
        { _id: key },
        { $inc: { count: 1 }, $setOnInsert: { createdAt: new Date() } },
        { upsert: true, returnDocument: "after" },
      );
    })
    .then((doc) => {
      if (doc) lastKnown.set(key, doc.count);
      return doc?.count;
    })
    .catch((err) => {
      console.error("View count failed:", err.message);
      return lastKnown.get(key);
    });

  after(() => write);
  return Promise.race([write, sleep(WAIT_MS).then(() => lastKnown.get(key))]);
}

/** Current total without counting (for the editor preview). */
export async function readViews(user: string): Promise<number | undefined> {
  const col = collection();
  if (!col) return undefined;
  const read = col
    .then((c) => c.findOne({ _id: viewKey(user) }))
    .then((doc) => doc?.count ?? 0)
    .catch(() => undefined);
  return Promise.race([read, sleep(WAIT_MS).then(() => undefined)]);
}
