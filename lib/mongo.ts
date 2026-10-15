import "server-only";
import { MongoClient, type Db } from "mongodb";

const URI = process.env.MONGODB_URI;
const DB = process.env.MONGODB_DB || "countview";

let client: Promise<MongoClient> | null = null;

/** Shared database handle, or null when MONGODB_URI isn't configured. One connection per instance. */
export function db(): Promise<Db> | null {
  if (!URI) return null;
  client ??= MongoClient.connect(URI, { maxPoolSize: 5, serverSelectionTimeoutMS: 4000 }).catch((err) => {
    client = null;
    throw err;
  });
  return client.then((c) => c.db(DB));
}

// The first connect takes ~1s, so start as soon as a server module loads (not during builds).
if (process.env.NEXT_PHASE !== "phase-production-build") db()?.catch(() => {});

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
