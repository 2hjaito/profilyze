import "server-only";
import { db } from "./mongo";

// Latest banner design per GitHub user, recorded when a banner is actually served
// (e.g. GitHub loading it in someone's README). Powers the community gallery and usage stats.
export type BannerDoc = {
  _id: string; // lowercase login
  user: string;
  c: string; // encoded config
  createdAt: Date;
  updatedAt: Date;
};

const collection = () => db()?.then((d) => d.collection<BannerDoc>("banners")) ?? null;

const REFRESH_MS = 60 * 60 * 1000;
const recent = new Map<string, { c: string; at: number }>();
const knownUsers = new Map<string, boolean>();

/** Only list accounts that exist, so the gallery can't be filled with made-up names. */
async function githubUserExists(login: string) {
  const hit = knownUsers.get(login.toLowerCase());
  if (hit !== undefined) return hit;
  const res = await fetch(`https://github.com/${encodeURIComponent(login)}`, {
    method: "HEAD",
    redirect: "manual",
    signal: AbortSignal.timeout(4000),
  }).catch(() => null);
  if (!res) return false;
  const exists = res.status === 200;
  knownUsers.set(login.toLowerCase(), exists);
  return exists;
}

/** Records `user`'s current design. Cheap to call on every request: writes at most hourly or on change. */
export async function registerBanner(user: string, c: string) {
  const key = user.toLowerCase();
  const last = recent.get(key);
  if (last && last.c === c && Date.now() - last.at < REFRESH_MS) return;
  recent.set(key, { c, at: Date.now() });

  try {
    const col = collection();
    if (!col || !(await githubUserExists(user))) return;
    const now = new Date();
    await (await col).updateOne(
      { _id: key },
      { $set: { user, c, updatedAt: now }, $setOnInsert: { createdAt: now } },
      { upsert: true },
    );
  } catch (err) {
    recent.delete(key);
    console.error("Banner registry failed:", (err as Error).message);
  }
}

export type GalleryItem = { user: string; c: string; updatedAt: string };

export async function listBanners(limit: number, before?: Date) {
  const col = collection();
  if (!col) return { items: [] as GalleryItem[], total: 0 };
  const c = await col;
  const [docs, total] = await Promise.all([
    c
      .find(before ? { updatedAt: { $lt: before } } : {})
      .sort({ updatedAt: -1 })
      .limit(limit)
      .toArray(),
    c.estimatedDocumentCount(),
  ]);
  return {
    items: docs.map((d) => ({ user: d.user, c: d.c, updatedAt: d.updatedAt.toISOString() })),
    total,
  };
}

export async function countUsers(): Promise<number | undefined> {
  const col = collection();
  if (!col) return undefined;
  return (await col).estimatedDocumentCount().catch(() => undefined);
}
