import "server-only";
import { after } from "next/server";
import { db, sleep } from "./mongo";

// Profile view counter, stored in MongoDB: { _id: "user:<login>", count }.
// Cold starts need ~1s to connect; stay well inside GitHub's image proxy timeout.
const WAIT_MS = 2500;

type ViewDoc = { _id: string; count: number; createdAt?: Date };

const collection = () => db()?.then((d) => d.collection<ViewDoc>("bannerviews")) ?? null;

const lastKnown = new Map<string, number>();
const viewKey = (user: string) => `user:${user.toLowerCase()}`;

/**
 * Counts one view and returns the new total. Never holds the banner up for long:
 * if the database is slow, the last known total is returned and the write finishes after the response.
 */
export async function countView(user: string): Promise<number | undefined> {
  const col = collection();
  if (!col) return undefined;
  const key = viewKey(user);

  const write = col
    .then((c) =>
      c.findOneAndUpdate(
        { _id: key },
        { $inc: { count: 1 }, $setOnInsert: { createdAt: new Date() } },
        { upsert: true, returnDocument: "after" },
      ),
    )
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
