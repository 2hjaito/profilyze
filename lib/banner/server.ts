import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import subsetFont from "subset-font";
import { findFont, fontFile } from "../catalog";
import { getGithubData } from "../github/fetch";
import type { GithubData } from "../github/types";
import { countView, readViews } from "../views";
import { fontUsage, hasViewsStat, renderBanner } from "./render";
import type { BannerConfig } from "./schema";

const PUBLIC = path.join(process.cwd(), "public");
const MIME: Record<string, string> = {
  webp: "image/webp",
  gif: "image/gif",
  png: "image/png",
  jpg: "image/jpeg",
  svg: "image/svg+xml",
};

const toDataUri = (mime: string, buf: Buffer | Uint8Array) =>
  `data:${mime};base64,${Buffer.from(buf).toString("base64")}`;

// Assets never change at runtime, so each file is read and encoded once per instance.
const fileCache = new Map<string, Promise<Buffer>>();
function readPublic(file: string): Promise<Buffer> {
  let p = fileCache.get(file);
  if (!p) {
    p = readFile(path.join(PUBLIC, file));
    p.catch(() => fileCache.delete(file));
    fileCache.set(file, p);
  }
  return p;
}

const assetCache = new Map<string, string>();
async function preloadAssets(files: string[]) {
  await Promise.all(
    files
      .filter((f) => !assetCache.has(f))
      .map(async (f) => {
        const mime = MIME[path.extname(f).slice(1)] ?? "application/octet-stream";
        assetCache.set(f, toDataUri(mime, await readPublic(f)));
      }),
  );
}

// Subsetting keeps each embedded font to a few KB while supporting any script the font covers.
const subsetCache = new Map<string, Promise<string>>();
async function fontFace(key: string, chars: string): Promise<string> {
  const [fontId, weight] = key.split(":");
  const font = findFont(fontId);
  const unique = [...new Set(chars)].sort().join("");
  const cacheKey = `${key}:${unique}`;
  let face = subsetCache.get(cacheKey);
  if (!face) {
    face = readPublic(fontFile(font, Number(weight)))
      .then((buf) => subsetFont(buf, unique, { targetFormat: "woff2" }))
      .then(
        (woff2) =>
          `@font-face{font-family:'${font.family}';font-weight:${weight};src:url(${toDataUri("font/woff2", woff2)}) format('woff2')}`,
      );
    face.catch(() => subsetCache.delete(cacheKey));
    if (subsetCache.size > 500) subsetCache.clear();
    subsetCache.set(cacheKey, face);
  }
  return face;
}

const MAX_REMOTE_BYTES = 3 * 1024 * 1024;

/** Fetches a remote image and inlines it, since an SVG inside <img> can't load external files. */
export async function fetchImageDataUri(url: string): Promise<string | null> {
  try {
    const { protocol } = new URL(url);
    if (protocol !== "https:" && protocol !== "http:") return null;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const type = res.headers.get("content-type")?.split(";")[0].trim() ?? "";
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_REMOTE_BYTES) return null;
    // raw.githubusercontent.com serves SVGs as text/plain
    const isSvg = type === "image/svg+xml" || /^\s*(<\?xml|<svg)/.test(buf.subarray(0, 256).toString());
    const mime = isSvg ? "image/svg+xml" : type.startsWith("image/") ? type : null;
    return mime ? toDataUri(mime, buf) : null;
  } catch {
    return null;
  }
}

export const avatarUrl = (data: GithubData, size: number) =>
  `${data.avatarUrl}${data.avatarUrl.includes("?") ? "&" : "?"}s=${size}`;

export function needsGithub(config: BannerConfig) {
  return config.els.some(
    (e) => !e.hidden && ((e.type === "stat" && e.stat !== "views") || e.type === "graph" || e.type === "avatar"),
  );
}

/**
 * `preview` renders without counting a view (gallery thumbnails, previews).
 * `visitor` (see visitorId) lets repeat views from the same person within 30 minutes count once.
 */
export async function renderBannerSvg(
  config: BannerConfig,
  { preview = false, visitor = null }: { preview?: boolean; visitor?: string | null } = {},
): Promise<string> {
  const viewsKey = config.vk ?? config.user;
  const [github, views] = await Promise.all([
    config.user && needsGithub(config) ? getGithubData(config.user).catch(() => null) : null,
    viewsKey && hasViewsStat(config) ? (preview ? readViews(viewsKey) : countView(viewsKey, visitor)) : undefined,
  ]);

  // Collect every file the renderer will ask for, then load them in parallel.
  const files = new Set<string>();
  const collect = (file: string) => {
    files.add(file);
    return file;
  };
  renderBanner(config, { asset: collect, github, views });

  const avatarEl = config.els.find((e) => e.type === "avatar" && !e.hidden);
  const [bgHref, avatarHref, faces] = await Promise.all([
    config.bg.kind === "url" ? fetchImageDataUri(config.bg.url) : null,
    avatarEl && github ? fetchImageDataUri(avatarUrl(github, Math.min(460, Math.ceil(avatarEl.s * 3)))) : null,
    Promise.all([...fontUsage(config, github, views)].map(([key, chars]) => fontFace(key, chars))),
    preloadAssets([...files]),
  ]);

  return renderBanner(config, {
    asset: (file) => assetCache.get(file) ?? "",
    bgHref,
    avatarHref,
    fontCss: faces.join(""),
    github,
    views,
  });
}

/** Embeds Inter, subset to the text actually present in a card SVG. */
export async function embedCardFonts(svg: string): Promise<string> {
  const chars = [...svg.matchAll(/>([^<>]+)</g)]
    .map((m) => m[1])
    .join("")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
  const faces = await Promise.all([400, 600, 700].map((w) => fontFace(`inter:${w}`, chars)));
  return svg.replace("<style>", `<style>${faces.join("")}`);
}
