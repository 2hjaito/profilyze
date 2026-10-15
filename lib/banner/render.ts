// Isomorphic banner renderer: the API inlines assets as data URIs, the editor passes plain URLs.
// Text, glyphs, graphs and vector icons are all real SVG, so the banner stays sharp at any size.

import { findBackground, findFont, findIcon, glyphs, nearestWeight } from "../catalog";
import { formatCount, type ContributionDay, type GithubData } from "../github/types";
import { W, type BannerConfig, type BannerElement, type ElementOf, type StatKey } from "./schema";

export type RenderContext = {
  /** Resolves a /public-relative file (e.g. "assets/devicon/react.svg") to an href. */
  asset: (file: string) => string;
  /** Href for a `url` background; when missing the banner falls back to a gradient. */
  bgHref?: string | null;
  avatarHref?: string | null;
  /** @font-face rules to embed (server only; the editor loads fonts via CSS). */
  fontCss?: string;
  github?: GithubData | null;
  /** Profile view count, for `views` stats (counted per request by the API). */
  views?: number;
  /** Adds data-id hooks so the editor can measure and select elements. */
  editor?: boolean;
};

export const escapeXml = (s: string) => s.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);

const r1 = (n: number) => Math.round(n * 100) / 100;

const STAT_VALUE: Record<Exclude<StatKey, "views">, (d: GithubData) => number | undefined> = {
  streak: (d) => d.current.length,
  longest: (d) => d.longest.length,
  contribs: (d) => d.contribs,
  total: (d) => d.total,
  commits: (d) => d.commits,
  stars: (d) => d.stars,
  followers: (d) => d.followers,
  repos: (d) => d.repos,
  prs: (d) => d.prs,
};

export const statValue = (el: ElementOf<"stat">, data?: GithubData | null, views?: number) =>
  formatCount(el.stat === "views" ? views : data ? STAT_VALUE[el.stat](data) : undefined);

export const hasViewsStat = (config: BannerConfig) =>
  config.els.some((e) => e.type === "stat" && e.stat === "views" && !e.hidden);

/** Every (font, weight) → characters pair a banner needs, for server-side font subsetting. */
export function fontUsage(config: BannerConfig, data?: GithubData | null, views?: number) {
  const usage = new Map<string, string>();
  const add = (fontId: string, weight: number, text: string) => {
    const font = findFont(fontId);
    const key = `${font.id}:${nearestWeight(font, weight)}`;
    usage.set(key, (usage.get(key) ?? "") + text);
  };
  for (const el of config.els) {
    if (el.hidden) continue;
    if (el.type === "text") add(el.font, el.w, el.text);
    if (el.type === "stat") {
      add(el.font, el.w, statValue(el, data, views));
      if (el.label) add(el.font, 400, el.label);
    }
  }
  return usage;
}

export function renderBanner(config: BannerConfig, ctx: RenderContext): string {
  const defs: string[] = [];
  const body: string[] = [];

  const H = config.h;
  if (ctx.fontCss) defs.push(`<style>${ctx.fontCss}</style>`);
  if (config.r > 0) defs.push(`<clipPath id="pf-clip"><rect width="${W}" height="${H}" rx="${config.r}"/></clipPath>`);
  defs.push(
    `<filter id="pf-inv" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="-1 0 0 0 1 0 -1 0 0 1 0 0 -1 0 1 0 0 0 1 0"/></filter>`,
  );

  body.push(renderBackground(config, ctx, defs));
  if (config.dim > 0) body.push(`<rect width="${W}" height="${H}" fill="#000" opacity="${config.dim}"/>`);

  config.els.forEach((el, i) => {
    if (el.hidden) return;
    const content = renderElement(el, i, ctx, defs);
    if (!content) return;
    const attrs = [
      `transform="translate(${r1(el.x)} ${r1(el.y)})"`,
      el.o !== undefined && el.o < 1 ? `opacity="${el.o}"` : "",
      ctx.editor ? `data-id="${escapeXml(el.id)}"` : "",
    ].filter(Boolean);
    body.push(`<g ${attrs.join(" ")}>${content}</g>`);
  });

  const title = config.els.find((e): e is ElementOf<"text"> => e.type === "text" && !e.hidden)?.text ?? "Profile banner";
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeXml(title)}">`,
    `<title>${escapeXml(title)}</title>`,
    `<defs>${defs.join("")}</defs>`,
    config.r > 0 ? `<g clip-path="url(#pf-clip)">${body.join("")}</g>` : body.join(""),
    `</svg>`,
  ].join("\n");
}

/** Where a preset background sits: covers the banner, zoomed, positioned by its focus point. */
export function backgroundRect(config: BannerConfig) {
  if (config.bg.kind !== "preset") return null;
  const preset = findBackground(config.bg.name) ?? findBackground("itachi1")!;
  if (!preset.w || !preset.h) return { preset, rect: null };
  const H = config.h;
  const scale = Math.max(W / preset.w, H / preset.h) * (config.bg.zoom ?? 1);
  const w = preset.w * scale;
  const h = preset.h * scale;
  return {
    preset,
    rect: { x: ((W - w) * (config.bg.fx ?? 50)) / 100, y: ((H - h) * (config.bg.fy ?? 50)) / 100, w, h },
  };
}

function renderBackground(config: BannerConfig, ctx: RenderContext, defs: string[]) {
  const bg = config.bg;
  const H = config.h;
  const image = (href: string) =>
    `<image href="${href}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice"/>`;

  const placed = backgroundRect(config);
  if (placed) {
    const href = ctx.asset(placed.preset.file);
    const r = placed.rect;
    // Pixel art is stored at native size and scaled up with hard edges instead of blur.
    const crisp = placed.preset.pixel ? ` style="image-rendering:crisp-edges;image-rendering:pixelated"` : "";
    return r
      ? // slice, not none: if the stored size were ever off, the image crops instead of stretching
        `<image href="${href}" x="${r1(r.x)}" y="${r1(r.y)}" width="${r1(r.w)}" height="${r1(r.h)}" preserveAspectRatio="xMidYMid slice"${crisp}/>`
      : image(href);
  }
  if (bg.kind === "url" && ctx.bgHref) return image(ctx.bgHref);

  const g = bg.kind === "gradient" ? bg : { from: "#0f172a", to: "#1e3a8a", angle: 135 };
  defs.push(
    `<linearGradient id="pf-bg" gradientTransform="rotate(${g.angle - 90} .5 .5)"><stop offset="0" stop-color="${g.from}"/><stop offset="1" stop-color="${g.to}"/></linearGradient>`,
  );
  return `<rect width="${W}" height="${H}" fill="url(#pf-bg)"/>`;
}

function iconImage(id: string, size: number, x: number, y: number, ctx: RenderContext, inv?: boolean) {
  const icon = findIcon(id);
  if (!icon) return "";
  const filter = inv ? ` filter="url(#pf-inv)"` : "";
  return `<image href="${ctx.asset(icon.file)}" x="${r1(x)}" y="${r1(y)}" width="${r1(size)}" height="${r1(size)}"${filter}/>`;
}

function fontAttrs(fontId: string, weight: number) {
  const font = findFont(fontId);
  return `font-family="'${font.family}', sans-serif" font-weight="${nearestWeight(font, weight)}"`;
}

function renderElement(el: BannerElement, i: number, ctx: RenderContext, defs: string[]): string {
  switch (el.type) {
    case "text": {
      const ls = el.ls ? ` letter-spacing="${r1(el.ls * el.s)}"` : "";
      return `<text y="${r1(el.s * 0.82)}" font-size="${el.s}" ${fontAttrs(el.font, el.w)} fill="${el.color}"${ls} xml:space="preserve">${escapeXml(el.text)}</text>`;
    }

    case "icon":
      return iconImage(el.icon, el.s, 0, 0, ctx, el.inv);

    case "icons":
      return el.icons.map((id, k) => iconImage(id, el.s, k * (el.s + el.gap), 0, ctx, el.inv)).join("");

    case "stat": {
      const s = el.s;
      const accent = el.accent ?? el.color;
      let icon = "";
      if (el.icon && glyphs[el.icon]) {
        const k = (s * 1.1) / 24;
        icon = `<g transform="translate(0 ${r1(-s * 0.08)}) scale(${r1(k * 1000) / 1000})" fill="none" stroke="${accent}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${glyphs[el.icon].body}</g>`;
      } else if (el.icon) {
        icon = iconImage(el.icon, s * 1.25, 0, -s * 0.15, ctx);
      }
      const x = el.icon ? s * 1.45 : 0;
      const label = el.label
        ? // A label starting with "-" attaches to the number: "25" + "-day streak" → "25-day streak".
          `<tspan dx="${el.label.startsWith("-") ? 0 : r1(s * 0.3)}" ${fontAttrs(el.font, 400)} fill-opacity="0.75">${escapeXml(el.label)}</tspan>`
        : "";
      return `${icon}<text x="${r1(x)}" y="${r1(s * 0.87)}" font-size="${s}" ${fontAttrs(el.font, el.w)} fill="${el.color}" xml:space="preserve">${escapeXml(statValue(el, ctx.github, ctx.views))}${label}</text>`;
    }

    case "graph":
      return renderGraph(el, ctx.github?.calendar ?? []);

    case "avatar": {
      const rad = el.s / 2;
      const id = `pf-av${i}`;
      defs.push(`<clipPath id="${id}"><circle cx="${rad}" cy="${rad}" r="${rad}"/></clipPath>`);
      const img = ctx.avatarHref
        ? `<image href="${ctx.avatarHref}" width="${el.s}" height="${el.s}" clip-path="url(#${id})" preserveAspectRatio="xMidYMid slice"/>`
        : `<circle cx="${rad}" cy="${rad}" r="${rad}" fill="#ffffff" fill-opacity="0.15"/>`;
      const ring = el.ring
        ? `<circle cx="${rad}" cy="${rad}" r="${r1(rad - el.s * 0.02)}" fill="none" stroke="${el.ring}" stroke-width="${r1(el.s * 0.04)}"/>`
        : "";
      return img + ring;
    }
  }
}

const LEVEL_OPACITY = [0.14, 0.4, 0.6, 0.8, 1];

/** Splits a calendar into Sunday-first weeks, keeping only the last `weeks` columns. */
export function calendarWeeks(calendar: ContributionDay[], weeks: number) {
  const cols: (ContributionDay | null)[][] = [];
  for (const day of calendar) {
    const dow = new Date(`${day.date}T00:00:00Z`).getUTCDay();
    if (dow === 0 || cols.length === 0) cols.push(Array(7).fill(null));
    cols[cols.length - 1][dow] = day;
  }
  return cols.slice(-weeks);
}

function renderGraph(el: ElementOf<"graph">, calendar: ContributionDay[]) {
  const cell = el.s;
  const step = cell * 1.25;
  const rx = r1(cell * 0.22);
  let cols = calendarWeeks(calendar, el.weeks);
  // Without data, draw an empty grid of the same size so the layout is stable.
  if (cols.length === 0) cols = Array.from({ length: el.weeks }, () => Array(7).fill(null));

  const rects: string[] = [];
  cols.forEach((col, x) =>
    col.forEach((day, y) => {
      if (!day && calendar.length) return;
      const op = LEVEL_OPACITY[day?.level ?? 0];
      rects.push(
        `<rect x="${r1(x * step)}" y="${r1(y * step)}" width="${cell}" height="${cell}" rx="${rx}" fill-opacity="${op}"/>`,
      );
    }),
  );
  return `<g fill="${el.color}">${rects.join("")}</g>`;
}
