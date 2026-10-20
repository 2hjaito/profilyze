"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { FiCheck, FiCopy, FiEdit2, FiGithub } from "react-icons/fi";
import { H, W } from "@/lib/banner/schema";
import type { GalleryItem } from "@/lib/registry";
import { SITE_URL } from "@/lib/site";

type Page = { items: GalleryItem[]; total: number; next: string | null };

const timeAgo = (iso: string) => {
  const s = (Date.now() - Date.parse(iso)) / 1000;
  const units: [number, string][] = [
    [31536000, "y"],
    [2592000, "mo"],
    [86400, "d"],
    [3600, "h"],
    [60, "m"],
  ];
  for (const [n, u] of units) if (s >= n) return `${Math.floor(s / n)}${u} ago`;
  return "just now";
};

export default function Gallery() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [next, setNext] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "idle" | "error">("loading");
  const columns = useColumns();

  const load = useCallback(async (before?: string) => {
    setState("loading");
    try {
      const res = await fetch(`/api/gallery${before ? `?before=${encodeURIComponent(before)}` : ""}`);
      if (!res.ok) throw new Error();
      const page: Page = await res.json();
      // Responses cached before `h` existed lack it; treat those as the default 4:1.
      const fresh = page.items.map((it) => ({ ...it, h: it.h || H }));
      setItems((prev) => (before ? [...prev, ...fresh] : fresh));
      setTotal(page.total);
      setNext(page.next);
      setState("idle");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Community</h1>
          <p className="mt-1 text-sm text-muted">
            {total === null
              ? "Loading…"
              : `${total.toLocaleString("en-US")} GitHub ${total === 1 ? "profile uses" : "profiles use"} a Profilyze banner.`} Pick one
            to start from.
          </p>
        </div>
        <BadgeSnippet />
      </div>

      {state === "error" && items.length === 0 && (
        <p className="rounded-xl border border-line bg-surface p-6 text-center text-sm text-muted">
          The gallery is unavailable right now.
        </p>
      )}
      {state === "idle" && items.length === 0 && (
        <p className="rounded-xl border border-line bg-surface p-6 text-center text-sm text-muted">
          No banners yet. Yours appears here once GitHub shows it on your profile.
        </p>
      )}

      {/* Masonry: each card joins the shorter column, so a 4:1 banner never sits beside a 16:9 one's empty space. */}
      <div className="flex items-start gap-4">
        {masonry(items, columns).map((col, i) => (
          <div key={i} className="min-w-0 flex-1 space-y-4">
            {col.map((item) => (
              <BannerCard key={item.user} item={item} />
            ))}
            {state === "loading" &&
              Array.from({ length: items.length ? 1 : 2 }, (_, j) => (
                <div key={j} className="aspect-[4/1.35] animate-pulse rounded-xl border border-line bg-surface" />
              ))}
          </div>
        ))}
      </div>

      {next && state !== "loading" && (
        <div className="text-center">
          <button
            type="button"
            onClick={() => load(next)}
            className="rounded-lg border border-line bg-surface px-4 py-2 text-sm hover:border-zinc-500"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}

const MD = "(min-width: 768px)";

/** Two columns from Tailwind's md breakpoint up, one below. */
function useColumns() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(MD);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => (window.matchMedia(MD).matches ? 2 : 1),
    () => 2,
  );
}

// The card footer is about 56px on a ~600px-wide column, in banner-width units.
const FOOTER = 0.1;

/** Deals items in order to the currently shortest column; appending a page never moves earlier cards. */
function masonry(items: GalleryItem[], n: number) {
  const cols: GalleryItem[][] = Array.from({ length: n }, () => []);
  const heights = new Array<number>(n).fill(0);
  for (const item of items) {
    const i = heights.indexOf(Math.min(...heights));
    cols[i].push(item);
    heights[i] += item.h / W + FOOTER;
  }
  return cols;
}

function BannerCard({ item }: { item: GalleryItem }) {
  return (
    <article className="overflow-hidden rounded-xl border border-line bg-surface">
      <a href={`/?c=${item.c}`} className="block bg-bg" title="Open in the editor">
        <BannerImage src={`/api/banner?c=${item.c}&preview=1`} alt={`${item.user}'s banner`} ratio={W / item.h} />
      </a>
      <div className="flex items-center gap-3 px-4 py-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`https://github.com/${item.user}.png?size=64`} alt="" width={28} height={28} className="rounded-full" loading="lazy" />
        <div className="min-w-0 flex-1">
          <a
            href={`https://github.com/${item.user}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 truncate text-sm font-medium hover:text-accent"
          >
            {item.user} <FiGithub className="shrink-0 text-muted" />
          </a>
          <p className="text-xs text-muted">Updated {timeAgo(item.updatedAt)}</p>
        </div>
        <a
          href={`/?c=${item.c}`}
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-line bg-surface-2 px-2.5 py-1.5 text-xs font-medium hover:border-zinc-500"
        >
          <FiEdit2 /> Use this design
        </a>
      </div>
    </article>
  );
}

/** Banner preview with a pulsing placeholder in the banner's own ratio until the image arrives. */
function BannerImage({ src, alt, ratio }: { src: string; alt: string; ratio: number }) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  // A cached image can finish before hydration attaches onLoad, so check on mount too.
  const ref = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete) setStatus(img.naturalWidth ? "loaded" : "error");
  }, []);
  return (
    <div
      className={status === "loaded" ? "" : `relative bg-surface-2 ${status === "loading" ? "animate-pulse" : ""}`}
      style={status === "loaded" ? undefined : { aspectRatio: ratio }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={ref}
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("error")}
        className={status === "loaded" ? "h-auto w-full" : "absolute inset-0 h-full w-full opacity-0"}
      />
    </div>
  );
}

function BadgeSnippet() {
  const [copied, setCopied] = useState(false);
  const md = `[![Profilyze users](${SITE_URL}/api/stats/users)](${SITE_URL}/community)`;
  return (
    <button
      type="button"
      title="Copy badge Markdown"
      onClick={async () => {
        await navigator.clipboard.writeText(md);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-muted hover:border-zinc-500 hover:text-fg"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/api/stats/users" alt="Profilyze users" height={24} />
      {copied ? <FiCheck className="text-emerald-400" /> : <FiCopy />}
      {copied ? "Copied" : "Copy badge"}
    </button>
  );
}
