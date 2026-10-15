import "server-only";
import { MongoClient } from "mongodb";
import { after } from "next/server";

// Profile view counter, stored in MongoDB: { _id: "user:<login>", count }.
const URI = process.env.MONGODB_URI;
const DB = process.env.MONGODB_DB || "countview";
// Cold starts need ~1s to connect; stay well inside GitHub's image proxy timeout.
const WAIT_MS = 2500;

type ViewDoc = { _id: string; count: number; createdAt?: Date };

let client: Promise<MongoClient> | null = null;
function collection() {
  if (!URI) return null;
  // One connection per instance, reused across requests (the first connect takes ~1s).
  client ??= MongoClient.connect(URI, { maxPoolSize: 5, serverSelectionTimeoutMS: 4000 }).catch((err) => {
    client = null;
    throw err;
  });
  return client.then((c) => c.db(DB).collection<ViewDoc>("bannerviews"));
}

// Start connecting as soon as the module loads rather than on the first counted view (not during builds).
if (process.env.NEXT_PHASE !== "phase-production-build") collection()?.catch(() => {});

const lastKnown = new Map<string, number>();
const viewKey = (user: string) => `user:${user.toLowerCase()}`;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

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
