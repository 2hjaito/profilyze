import type { NextRequest } from "next/server";
import { listBanners } from "@/lib/registry";

// Keeps the community gallery's banners warm. Each banner is rendered once from scratch (GitHub
// stats, icons, fonts), which takes seconds on a cold instance; this loads the latest ones the same
// way the gallery does, so the build lands in the shared cache (and at the edge) before a visitor asks.
// Triggered hourly by vercel.json. With CRON_SECRET set, Vercel sends it as a bearer token.

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const COUNT = 30;
const CONCURRENCY = 4;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { items } = await listBanners(COUNT).catch(() => ({ items: [] }));
  const origin = req.nextUrl.origin;
  const started = Date.now();
  let warmed = 0;
  const failed: string[] = [];

  const queue = [...items];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (let item = queue.shift(); item; item = queue.shift()) {
        // Same URL the gallery requests, so the edge copy is the one that gets refreshed.
        const res = await fetch(`${origin}/api/banner?c=${item.c}&preview=1`, { signal: AbortSignal.timeout(60_000) }).catch(() => null);
        if (res?.ok) {
          await res.arrayBuffer();
          warmed++;
        } else failed.push(item.user);
      }
    }),
  );

  return Response.json({ total: items.length, warmed, failed, ms: Date.now() - started }, { headers: { "Cache-Control": "no-store" } });
}
