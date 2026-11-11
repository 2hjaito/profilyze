import "server-only";
import { createHash } from "node:crypto";
import { after } from "next/server";
import { db, sleep } from "../mongo";

const TIMEOUT = Symbol("timeout");

// Rendered banners, kept so a request only has to fill in the view count instead of
// fetching GitHub, splitting animated icons and subsetting fonts again (seconds on a cold instance).
// Each instance keeps a memory copy; MongoDB shares them across instances and survives cold starts.
// Entries older than FRESH_MS are still served, and rebuilt after the response.

/** GitHub stats in a cached banner are refreshed after this long. */
const FRESH_MS = 4 * 60 * 60 * 1000;
/** A banner built while GitHub or a remote image was unreachable is retried this soon. */
const RETRY_MS = 5 * 60 * 1000;
/** Designs nobody has loaded for this long drop out of the database. */
const EXPIRE_SECONDS = 14 * 24 * 60 * 60;
/** MongoDB documents max out at 16 MB; heavy video banners stay in memory only. */
const MAX_STORED_BYTES = 8 * 1024 * 1024;
const MAX_MEMORY_BYTES = 96 * 1024 * 1024;
/** Past this, a slow database read gets a build racing it (a cold cross-region connect can take seconds). */
const READ_HEAD_START_MS = 2000;

export type Built = { svg: string; /** False when GitHub data or a remote image was missing. */ complete: boolean };
type Entry = { svg: string; at: number };
type CacheDoc = { _id: string; svg: string; at: Date; used: Date };

export const templateKey = (config: unknown) =>
  createHash("sha256").update(JSON.stringify(config)).digest("base64url").slice(0, 32);

// ---------- memory (LRU by insertion order, re-inserted on use) ----------

const memory = new Map<string, Entry>();
let memoryBytes = 0;

function remember(key: string, entry: Entry) {
  const old = memory.get(key);
  if (old) memoryBytes -= old.svg.length;
  memory.delete(key);
  memory.set(key, entry);
  memoryBytes += entry.svg.length;
  for (const [k, e] of memory) {
    if (memoryBytes <= MAX_MEMORY_BYTES || k === key) break;
    memory.delete(k);
    memoryBytes -= e.svg.length;
  }
}

// ---------- database ----------

let indexReady: Promise<unknown> | null = null;
const collection = () => {
  const d = db();
  if (!d) return null;
  return d.then(async (database) => {
    const col = database.collection<CacheDoc>("bannercache");
    indexReady ??= col.createIndex({ used: 1 }, { expireAfterSeconds: EXPIRE_SECONDS }).catch(() => (indexReady = null));
    await indexReady;
    return col;
  });
};

async function load(key: string): Promise<Entry | null> {
  const col = collection();
  if (!col) return null;
  return col
    .then((c) => c.findOneAndUpdate({ _id: key }, { $set: { used: new Date() } }, { projection: { svg: 1, at: 1 } }))
    .then((doc) => (doc ? { svg: doc.svg, at: doc.at.getTime() } : null))
    .catch((err) => {
      console.error("Banner cache read failed:", err.message);
      return null;
    });
}

async function store(key: string, entry: Entry) {
  if (entry.svg.length > MAX_STORED_BYTES) return;
  try {
    const col = collection();
    if (!col) return;
    const now = new Date();
    await (await col).replaceOne({ _id: key }, { svg: entry.svg, at: new Date(entry.at), used: now }, { upsert: true });
  } catch (err) {
    console.error("Banner cache write failed:", (err as Error).message);
  }
}

// ---------- lookup ----------

const inflight = new Map<string, Promise<Entry>>();

/** Builds once per key at a time, then keeps the result (incomplete builds only briefly). */
function rebuild(key: string, build: () => Promise<Built>): Promise<Entry> {
  let p = inflight.get(key);
  if (!p) {
    p = build()
      .then(({ svg, complete }) => {
        // Backdating an incomplete build makes it stale RETRY_MS from now.
        const entry = { svg, at: complete ? Date.now() : Date.now() - FRESH_MS + RETRY_MS };
        remember(key, entry);
        if (complete) after(() => store(key, entry));
        return entry;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, p);
  }
  return p;
}

function refreshIfStale(key: string, entry: Entry, build: () => Promise<Built>) {
  if (Date.now() - entry.at < FRESH_MS || inflight.has(key)) return;
  after(() => rebuild(key, build).catch((err) => console.error("Banner refresh failed:", err)));
}

/** The cached banner for `key`, building it on a miss. Stale entries are served while they rebuild. */
export async function cachedBanner(key: string, build: () => Promise<Built>): Promise<string> {
  const hit = memory.get(key);
  if (hit) {
    remember(key, hit);
    refreshIfStale(key, hit, build);
    return hit.svg;
  }
  const running = inflight.get(key);
  if (running) return (await running).svg;

  // Reading is far cheaper than building, so a slow read isn't abandoned: after a head start a build
  // races it, and whichever has the banner first wins.
  const reading = load(key);
  const early = await Promise.race([reading, sleep(READ_HEAD_START_MS).then((): typeof TIMEOUT => TIMEOUT)]);
  if (early === TIMEOUT) {
    const building = rebuild(key, build);
    const stored = await Promise.race([reading, building.then(() => null)]);
    return stored ? serveStored(key, stored, build) : (await building).svg;
  }
  return early ? serveStored(key, early, build) : (await rebuild(key, build)).svg;
}

function serveStored(key: string, entry: Entry, build: () => Promise<Built>) {
  if (!memory.has(key)) remember(key, entry);
  refreshIfStale(key, entry, build);
  return entry.svg;
}
