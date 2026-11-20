// The profile kit's cards, drawn on a kit Canvas (see kit.ts). Each returns the SVG and the font
// faces it used; the route embeds those, subset to the text on the card.

import { calendarWeeks } from "../banner/render";
import { glyphs } from "../catalog";
import type { GithubData } from "../github/types";
import { formatCount } from "../github/types";
import { Canvas, fit, r1, wrap, type Look } from "./kit";
import { iconSvg, isSocialPlatform, platforms } from "./social";

export type Rendered = { svg: string; faces: string[] };
const done = (c: Canvas, w: number, h: number, title: string): Rendered => ({ svg: c.svg(w, h, title), faces: [...c.faces] });

// ---------- icons ----------

// Lucide line icons (ISC) for labels and buttons, on top of the stat glyphs in the catalog.
const LINE_ICONS: Record<string, string> = {
  ...Object.fromEntries(Object.entries(glyphs).map(([k, g]) => [k, g.body])),
  globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
  mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  home: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>',
  rocket:
    '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>',
  sparkles: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 3v4"/><path d="M21 5h-4"/>',
  book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  heart:
    '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  layers:
    '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
  terminal: '<polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  coffee:
    '<path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/><path d="M6 2v2"/>',
  hand: '<path d="M18 11V6a2 2 0 0 0-4 0"/><path d="M14 10V4a2 2 0 0 0-4 0v2"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>',
  folder:
    '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
  chart: '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
  arrow: '<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',
};

export const kitIcons = [...new Set([...Object.keys(platforms), ...Object.keys(LINE_ICONS)])];

/** Draws a named icon (a platform logo or a line icon) in a size×size box. */
function icon(c: Canvas, name: string, x: number, y: number, size: number, role: "text" | "muted" | "dim" | "accent") {
  if (isSocialPlatform(name)) {
    c.push(`<g class="${role}">${iconSvg(platforms[name].icon, x, y, size, "inherit")}</g>`);
    return true;
  }
  const body = LINE_ICONS[name];
  if (!body) return false;
  const stroke = { text: "ts", muted: "ms", dim: "ds", accent: "as" }[role];
  c.push(
    `<g class="${stroke}" transform="translate(${r1(x)} ${r1(y)}) scale(${r1((size / 24) * 1000) / 1000})" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</g>`,
  );
  return true;
}

const hash = (s: string) => [...s].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0, 2166136261);

// ---------- header ----------

export type HeaderOpts = {
  name: string;
  role: string;
  bio: string;
  eyebrow: string;
  link: string;
  /** Avatar as a data URI. */
  avatar?: string;
  /** Share of the year gone by (0–1), drawn by native's wave. */
  year: number;
};

export function headerCard(look: Look, o: HeaderOpts): Rendered {
  const c = new Canvas(look);
  const W = 1000;
  const native = look.theme === "native";
  const PAD = native ? 12 : 48;
  const globe = !o.avatar && look.theme === "clay";
  const side = o.avatar ? 210 : globe ? 280 : 0;
  const textW = W - PAD * 2 - side;
  const parts: (() => void)[] = [];
  let y = PAD;

  if (o.eyebrow || native) {
    y += 16;
    const ey = y;
    if (native && !o.eyebrow) parts.push(() => c.text(PAD, ey, "</>", { font: "mono", size: 20, role: "accent" }));
    else if (native) parts.push(() => c.text(PAD, ey, o.eyebrow, { font: "inter-600", size: 16, role: "accent" }));
    else
      parts.push(() => {
        c.push(`<circle cx="${PAD + 4}" cy="${ey - 4.5}" r="4" class="accent"/>`);
        c.text(PAD + 18, ey, fit(o.eyebrow.toUpperCase(), "inter-600", 13, textW - 18, 13 * 0.16), {
          font: "inter-600",
          size: 13,
          role: "dim",
          track: 0.16,
        });
      });
    y += 22;
  }

  const font = c.type.display;
  const track = c.type.displayTrack;
  let size = look.theme === "clay" ? 76 : 64;
  while (size > 34 && c.width(o.name, { font, size, track }) > textW) size -= 2;
  y += size * 0.9;
  const nameY = y;
  parts.push(() => c.text(PAD, nameY, fit(o.name, font, size, textW, track * size), { font, size, track }));

  if (o.role) {
    y += look.theme === "clay" ? 50 : 38;
    const ry = y;
    const lines = wrap(o.role, "inter-600", 22, textW, 2);
    parts.push(() => c.lines(PAD, ry, lines, 31, { font: "inter-600", size: 22, role: look.theme === "clay" ? "text" : "muted" }));
    y += (lines.length - 1) * 31;
  }
  if (o.bio) {
    const lines = wrap(o.bio, "inter-400", 18, textW, 3);
    y += o.role ? 34 : 40;
    const by = y;
    parts.push(() => c.lines(PAD, by, lines, 28, { font: "inter-400", size: 18, role: "muted" }));
    y += (lines.length - 1) * 28;
  }
  if (o.link) {
    y += 36;
    const ly = y;
    parts.push(() => {
      const w = c.text(PAD, ly, o.link, { font: "inter-600", size: 16, role: "accent" });
      icon(c, "arrow", PAD + w + 4, ly - 13, 15, "accent");
    });
  }

  let H = y + PAD + (native ? 34 : 6);
  if (side) H = Math.max(H, side + (native ? 40 : 56));

  if (!native) c.frame(0, 0, W, H);
  parts.forEach((p) => p());

  const cx = W - PAD - side / 2 + (native ? 0 : 10);
  const cy = (native ? H - 34 : H) / 2;
  if (o.avatar) {
    const r = 86;
    const id = c.id("av");
    c.def(`<clipPath id="${id}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>`);
    c.push(
      `<image href="${o.avatar}" x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" clip-path="url(#${id})" preserveAspectRatio="xMidYMid slice"/>`,
      `<circle cx="${cx}" cy="${cy}" r="${r + 6}" fill="none" class="bd"/>`,
    );
  } else if (globe) {
    drawGlobe(c, cx, cy, Math.min(118, H / 2 - 34), hash(o.name));
  }

  if (native) drawWave(c, 0, W, H - 14, o.year);
  return done(c, W, H, [o.name, o.role].filter(Boolean).join(", "));
}

/** A dotted globe with made-up continents (seeded by the name) and a satellite on a tilted orbit. */
function drawGlobe(c: Canvas, cx: number, cy: number, R: number, seed: number) {
  const s = [0, 1, 2, 3].map((i) => ((seed >>> (i * 8)) & 255) / 40);
  const step = 8.5;
  const dots: string[] = [];
  for (let gy = -R; gy <= R; gy += step) {
    for (let gx = -R; gx <= R; gx += step) {
      const nx = gx / R;
      const ny = gy / R;
      const d = nx * nx + ny * ny;
      if (d > 0.97) continue;
      const z = Math.sqrt(1 - d);
      const lon = Math.atan2(nx, z) + s[0];
      const lat = Math.asin(ny);
      const n =
        Math.sin(lon * 2.1 + s[1]) * Math.cos(lat * 3.3 + s[2]) + 0.6 * Math.sin(lon * 4.7 + lat * 2 + s[3]) + 0.35 * Math.cos(lat * 6.1 - lon * 1.3);
      const land = n > 0.42 && Math.abs(lat) < 1.25;
      const rad = r1(0.9 + 1.2 * z);
      dots.push(
        `<circle cx="${r1(cx + gx)}" cy="${r1(cy + gy)}" r="${rad}" class="${land ? "accent" : "dim"}" opacity="${r1((land ? 0.55 + 0.45 * z : 0.18 + 0.3 * z) * 100) / 100}"/>`,
      );
    }
  }
  c.push(`<g>${dots.join("")}</g>`);
  const rx = R * 1.32;
  const ry = R * 0.36;
  const tilt = -16;
  c.push(
    `<ellipse cx="${cx}" cy="${cy}" rx="${r1(rx)}" ry="${r1(ry)}" transform="rotate(${tilt} ${cx} ${cy})" fill="none" class="ms" stroke-dasharray="2 5" opacity=".7"/>`,
  );
  const a = 0.35 + (seed % 100) / 100;
  const px = cx + rx * Math.cos(a);
  const py = cy + ry * Math.sin(a);
  const t = (tilt * Math.PI) / 180;
  const sx = cx + (px - cx) * Math.cos(t) - (py - cy) * Math.sin(t);
  const sy = cy + (px - cx) * Math.sin(t) + (py - cy) * Math.cos(t);
  c.push(`<circle cx="${r1(sx)}" cy="${r1(sy)}" r="7" class="bg as" stroke-width="2"/><circle cx="${r1(sx)}" cy="${r1(sy)}" r="2.5" class="accent"/>`);
}

/** A wavy rule; the part up to `progress` (0–1) is drawn in the accent. */
function drawWave(c: Canvas, x0: number, x1: number, y: number, progress: number) {
  const period = 44;
  const amp = 5;
  const path = (from: number, to: number) => {
    const pts: string[] = [];
    for (let x = from; x <= to; x += 2) pts.push(`${r1(x)} ${r1(y + Math.sin(((x - x0) / period) * Math.PI * 2) * amp)}`);
    return `M${pts.join("L")}`;
  };
  const split = x0 + (x1 - x0) * Math.min(1, Math.max(0, progress));
  c.push(
    `<path d="${path(split, x1)}" fill="none" class="bd" stroke-width="2.5" stroke-linecap="round"/>`,
    `<path d="${path(x0, split)}" fill="none" class="as" stroke-width="2.5" stroke-linecap="round"/>`,
  );
}

// ---------- section label ----------

export type LabelOpts = { text: string; num: string; icon: string };

export function labelCard(look: Look, o: LabelOpts): Rendered {
  const c = new Canvas(look);
  const W = 1000;
  const H = 56;
  const base = 36;
  let x = 2;
  if (o.icon) {
    const size = look.theme === "mono" ? 18 : 22;
    if (icon(c, o.icon, x, base - size + (look.theme === "mono" ? 2 : 3), size, look.theme === "mono" ? "muted" : "accent")) x += size + 12;
  }
  if (o.num) {
    x += c.text(x, base, o.num, { font: "inter-600", size: 14, role: "accent", track: 0.12 }) + 14;
  }
  if (look.theme === "clay") x += c.text(x, base + 2, fit(o.text, "newsreader-400", 32, W - x - 40), { font: "newsreader-400", size: 32, track: -0.01 });
  else if (look.theme === "native") x += c.text(x, base, fit(o.text, "inter-700", 24, W - x - 40), { font: "inter-700", size: 24, track: -0.01 });
  else x += c.text(x, base, fit(o.text, "inter-600", 15, W - x - 40, 1.5), { font: "inter-600", size: 15, role: "muted", track: 0.1, upper: true });
  if (x < W - 40) c.push(`<line x1="${r1(x + 20)}" y1="${base - 7}" x2="${W - 1}" y2="${base - 7}" class="bd"/>`);
  return done(c, W, H, o.text);
}

// ---------- link button ----------

export type ButtonOpts = { label: string; icon: string };

export function buttonCard(look: Look, o: ButtonOpts): Rendered {
  const c = new Canvas(look);
  const H = 44;
  const size = 17;
  const label = fit(o.label, "inter-600", 15, 360);
  const hasIcon = Boolean(o.icon && (isSocialPlatform(o.icon) || LINE_ICONS[o.icon]));
  const W = Math.ceil(18 + (hasIcon ? size + 9 : 0) + c.width(label, { font: "inter-600", size: 15 }) + 20);
  c.frame(0, 0, W, H, look.theme === "native" ? 22 : look.theme === "clay" ? 12 : 10);
  let x = 18;
  if (hasIcon) {
    icon(c, o.icon, x, (H - size) / 2, size, look.theme === "mono" ? "muted" : "accent");
    x += size + 9;
  }
  c.text(x, 27.5, label, { font: "inter-600", size: 15 });
  return done(c, W, H, o.label);
}

// ---------- project ----------

export type ProjectSize = "feature" | "half" | "small";

export type ProjectOpts = {
  size: ProjectSize;
  title: string;
  tagline: string;
  desc: string;
  eyebrow: string;
  num: string;
  meta: string;
  status: string;
  tags: string[];
  /** Screenshot as a data URI. */
  image?: string;
  /** Half cards: keep the screenshot's space (with a monogram) so a row with one screenshot lines up. */
  reserve?: boolean;
};

function eyebrowRow(c: Canvas, o: ProjectOpts, x: number, y: number, w: number) {
  const upper = c.type.eyebrowUpper;
  const opts = upper
    ? ({ font: "inter-600", size: 13, role: "dim", track: 0.16, upper: true } as const)
    : ({ font: "inter-600", size: 15, role: "accent" } as const);
  let metaW = 0;
  if (o.meta) {
    const meta = fit(o.meta, opts.font, opts.size, w * 0.45, (opts.track ?? 0) * opts.size);
    metaW = c.text(x + w, y, upper ? meta.toUpperCase() : meta, { ...opts, role: "dim", anchor: "end", upper: false }) + 16;
  }
  let lx = x;
  if (o.num) lx += c.text(lx, y, o.num, { ...opts, role: "accent" }) + (upper ? 12 : 8);
  if (o.eyebrow) {
    const text = fit(upper ? o.eyebrow.toUpperCase() : o.eyebrow, opts.font, opts.size, x + w - metaW - lx, (opts.track ?? 0) * opts.size);
    c.text(lx, y, text, { ...opts, role: upper ? "muted" : "accent", upper: false });
  }
}

/** Tags as one line of text: monospace in the accent for native, small caps elsewhere. */
function tagLayout(c: Canvas, tags: string[], w: number, maxLines: number) {
  const native = c.look.theme === "native";
  const o = native
    ? ({ font: "mono", size: 15, role: "accent", track: 0 } as const)
    : ({ font: "inter-600", size: 12, role: "dim", track: 0.14 } as const);
  const text = native ? tags.join(" · ") : tags.join("  ·  ").toUpperCase();
  return { lines: tags.length ? wrap(text, o.font, o.size, w, maxLines, o.track * o.size) : [], lh: native ? 24 : 20, o };
}

function statusLine(c: Canvas, status: string, x: number, y: number, w: number) {
  c.push(`<circle cx="${x + 5}" cy="${y - 5}" r="5" class="accent"/>`);
  c.text(x + 18, y, fit(status, "inter-400", 16, w - 18), { font: "inter-400", size: 16, role: "muted" });
}

function screenshot(c: Canvas, href: string, x: number, y: number, w: number, h: number, r: number, border = true) {
  const id = c.id("img");
  c.def(`<clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/></clipPath>`);
  c.push(`<image href="${href}" x="${x}" y="${y}" width="${w}" height="${h}" clip-path="url(#${id})" preserveAspectRatio="xMidYMin slice"/>`);
  if (border) c.push(`<rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" rx="${r}" fill="none" class="bd"/>`);
}

export function projectCard(look: Look, o: ProjectOpts): Rendered {
  if (o.size === "small") return smallProject(look, o);
  if (o.size === "half") return halfProject(look, o);
  return featureProject(look, o);
}

function featureProject(look: Look, o: ProjectOpts): Rendered {
  const c = new Canvas(look);
  const W = 1000;
  const PAD = 44;
  const imageW = o.image ? 400 : 0;
  const textW = W - PAD * 2 - imageW + (o.image ? 8 : 0);
  const draw: ((c: Canvas) => void)[] = [];
  let y = PAD;

  if (o.eyebrow || o.num || o.meta) {
    y += 14;
    const ey = y;
    draw.push((c) => eyebrowRow(c, o, PAD, ey, textW));
    y += 22;
  }
  const font = c.type.display;
  const size = look.theme === "clay" ? 50 : 42;
  y += size * 0.95;
  const ty = y;
  draw.push((c) => c.text(PAD, ty, fit(o.title, font, size, textW, c.type.displayTrack * size), { font, size, track: c.type.displayTrack }));
  if (o.status) {
    y += 34;
    const sy = y;
    draw.push((c) => statusLine(c, o.status, PAD, sy, textW));
  }
  if (o.tagline) {
    const lines = wrap(o.tagline, "inter-600", 19, textW, 2);
    y += o.status ? 34 : 38;
    const gy = y;
    draw.push((c) => c.lines(PAD, gy, lines, 28, { font: "inter-600", size: 19 }));
    y += (lines.length - 1) * 28;
  }
  if (o.desc) {
    const lines = wrap(o.desc, "inter-400", 17, textW, 5);
    y += o.tagline ? 32 : 36;
    const dy = y;
    draw.push((c) => c.lines(PAD, dy, lines, 27, { font: "inter-400", size: 17, role: "muted" }));
    y += (lines.length - 1) * 27;
  }
  const tags = tagLayout(c, o.tags, textW, 2);
  if (tags.lines.length) {
    y += 38;
    const gy = y;
    draw.push((c) => c.lines(PAD, gy, tags.lines, tags.lh, tags.o));
    y += (tags.lines.length - 1) * tags.lh;
  }
  const H = Math.max(y + PAD, o.image ? 330 : 0);

  c.frame(0, 0, W, H);
  if (o.image) {
    const inset = look.theme === "mono" ? 4 : 1;
    const id = c.id("clip");
    c.def(`<clipPath id="${id}"><rect x="${inset}" y="${inset}" width="${W - inset * 2}" height="${H - inset * 2}" rx="${c.radius - (inset > 1 ? 3 : 0)}"/></clipPath>`);
    c.push(
      `<image href="${o.image}" x="${W - imageW}" y="0" width="${imageW}" height="${H}" clip-path="url(#${id})" preserveAspectRatio="xMinYMin slice"/>`,
      `<line x1="${W - imageW + 0.5}" y1="${inset}" x2="${W - imageW + 0.5}" y2="${H - inset}" class="bd"/>`,
    );
  }
  draw.forEach((d) => d(c));
  return done(c, W, H, [o.title, o.tagline || o.desc].filter(Boolean).join(": "));
}

function halfProject(look: Look, o: ProjectOpts): Rendered {
  const c = new Canvas(look);
  const W = 490;
  const PAD = 26;
  const inner = W - PAD * 2;
  const slot = Boolean(o.image || o.reserve);
  const imgH = slot ? Math.round(inner * 0.56) : 0;
  // Fixed slots, so two cards side by side always line up.
  const H = PAD + 22 + (slot ? imgH + 22 : 0) + 42 + 30 + 3 * 23 + 30 + PAD + 4;
  c.frame(0, 0, W, H);
  let y = PAD + 14;
  eyebrowRow(c, o, PAD, y, inner);
  y += 8;
  if (o.image) {
    y += 14;
    screenshot(c, o.image, PAD, y, inner, imgH, 10);
    y += imgH;
  } else if (o.reserve) {
    y += 14;
    c.push(`<rect x="${PAD}" y="${y}" width="${inner}" height="${imgH}" rx="10" class="so"/>`);
    const letter = [...o.title.trim()][0]?.toUpperCase() ?? "";
    if (letter) c.text(PAD + inner / 2, y + imgH / 2 + 30, letter, { font: c.type.display, size: 88, role: "dim", anchor: "middle", opacity: 0.6 });
    y += imgH;
  }
  const font = c.type.display;
  const size = look.theme === "clay" ? 36 : 30;
  y += size + 6;
  c.text(PAD, y, fit(o.title, font, size, inner, c.type.displayTrack * size), { font, size, track: c.type.displayTrack });
  if (o.tagline) {
    y += 30;
    c.text(PAD, y, fit(o.tagline, "inter-600", 16, inner), { font: "inter-600", size: 16 });
  } else if (o.status) {
    y += 30;
    statusLine(c, o.status, PAD, y, inner);
  } else y += 6;
  if (o.desc) {
    y += 27;
    c.lines(PAD, y, wrap(o.desc, "inter-400", 15, inner, o.tags.length ? 3 : 4), 23, { font: "inter-400", size: 15, role: "muted" });
  }
  const tags = tagLayout(c, o.tags, inner, 1);
  if (tags.lines.length) c.lines(PAD, H - PAD - 4, tags.lines, tags.lh, tags.o);
  return done(c, W, H, [o.title, o.tagline || o.desc].filter(Boolean).join(": "));
}

function smallProject(look: Look, o: ProjectOpts): Rendered {
  const c = new Canvas(look);
  const W = 330;
  const H = 158;
  const PAD = 24;
  const inner = W - PAD * 2;
  c.frame(0, 0, W, H);
  let metaW = 0;
  const y = PAD + 24;
  if (o.meta) {
    const upper = c.type.eyebrowUpper;
    metaW =
      c.text(W - PAD, y - 4, fit(upper ? o.meta.toUpperCase() : o.meta, "inter-600", 11, inner * 0.4, 1.6), {
        font: "inter-600",
        size: 11,
        role: "dim",
        track: upper ? 0.15 : 0,
        anchor: "end",
      }) + 12;
  }
  const font = c.type.display;
  const size = look.theme === "clay" ? 28 : 22;
  c.text(PAD, y, fit(o.title, font, size, inner - metaW, c.type.displayTrack * size), { font, size, track: c.type.displayTrack });
  const desc = o.desc || o.tagline;
  if (desc) c.lines(PAD, y + 32, wrap(desc, "inter-400", 15, inner, 3), 22, { font: "inter-400", size: 15, role: "muted" });
  return done(c, W, H, [o.title, desc].filter(Boolean).join(": "));
}

// ---------- numbers ----------

export type NumberItem = { value: string; label: string };

export function numbersCard(look: Look, items: NumberItem[]): Rendered {
  const c = new Canvas(look);
  const W = 1000;
  const native = look.theme === "native";
  const PADX = native ? 0 : 40;
  const n = Math.max(1, items.length);
  const colW = (W - PADX * 2) / n;
  const font = c.type.display;
  const size = look.theme === "clay" ? 54 : 46;
  const labelLines = items.map((it) => wrap(it.label, "inter-400", 16, colW - 48, 2));
  const maxLines = Math.max(1, ...labelLines.map((l) => l.length));
  const top = native ? 30 : 34;
  const H = top + size * 0.9 + 18 + maxLines * 24 + (native ? 24 : 30);
  if (native) c.push(`<line x1="0" y1="0.5" x2="${W}" y2="0.5" class="bd"/>`, `<line x1="0" y1="${H - 0.5}" x2="${W}" y2="${H - 0.5}" class="bd"/>`);
  else c.frame(0, 0, W, H);
  items.forEach((it, i) => {
    const x = PADX + i * colW + (i === 0 && native ? 4 : i === 0 ? 0 : 32);
    if (i > 0) c.push(`<line x1="${r1(PADX + i * colW + 0.5)}" y1="${top - 4}" x2="${r1(PADX + i * colW + 0.5)}" y2="${H - (native ? 20 : 26)}" class="bd"/>`);
    const w = colW - (i === 0 ? 8 : 40);
    const vy = top + size * 0.9;
    c.text(x, vy, fit(it.value, font, size, w, c.type.displayTrack * size), { font, size, track: c.type.displayTrack });
    c.lines(x, vy + 34, labelLines[i], 24, { font: "inter-400", size: 16, role: "muted" });
  });
  return done(c, W, H, items.map((it) => `${it.value} ${it.label}`).join(". "));
}

// ---------- tech stack ----------

export type Pill = { label: string; icon?: string; invert?: boolean };
export type StackGroup = { title: string; desc: string; items: Pill[] };

const PILL_H = 38;

function pillWidth(c: Canvas, p: Pill) {
  return Math.ceil((p.icon ? 44 : 18) + c.width(p.label, { font: "inter-600", size: 15 }) + 18);
}

function drawPill(c: Canvas, p: Pill, x: number, y: number) {
  const w = pillWidth(c, p);
  c.push(`<rect x="${x}" y="${y}" width="${w}" height="${PILL_H}" rx="${PILL_H / 2}" class="so"/>`);
  if (p.icon) c.push(`<image href="${p.icon}" x="${x + 14}" y="${y + 9}" width="20" height="20"${p.invert ? ' class="inv"' : ""}/>`);
  c.text(x + (p.icon ? 44 : 18), y + 24.5, p.label, { font: "inter-600", size: 15 });
  return w;
}

/** Lays pills out in rows within `w`; returns their positions and the total height. */
function flow(c: Canvas, pills: Pill[], w: number, gap = 10) {
  const at: { p: Pill; x: number; y: number }[] = [];
  let x = 0;
  let y = 0;
  for (const p of pills) {
    const pw = Math.min(pillWidth(c, p), w);
    if (x > 0 && x + pw > w) {
      x = 0;
      y += PILL_H + gap;
    }
    at.push({ p, x, y });
    x += pw + gap;
  }
  return { at, h: pills.length ? y + PILL_H : 0 };
}

export function stackCard(look: Look, groups: StackGroup[], also: Pill[], alsoLabel: string): Rendered {
  const c = new Canvas(look);
  const W = 1000;
  const gap = 20;
  const perRow = groups.length === 3 ? 3 : groups.length === 1 ? 1 : 2;
  const colW = (W - gap * (perRow - 1)) / perRow;
  const P = 26;
  const headFont = c.type.heading;
  const headSize = look.theme === "clay" ? 27 : 21;
  let y = 0;

  for (let r = 0; r < groups.length; r += perRow) {
    const row = groups.slice(r, r + perRow).map((g) => {
      const desc = g.desc ? wrap(g.desc, "inter-400", 16, colW - P * 2, 3) : [];
      const pills = flow(c, g.items, colW - P * 2);
      return { g, desc, pills };
    });
    const body = (d: (typeof row)[number]) => headSize + (d.desc.length ? 14 + d.desc.length * 24 : 0) + (d.pills.h ? 22 + d.pills.h : 0);
    const h = P * 2 + Math.max(...row.map(body)) + 4;
    row.forEach((d, i) => {
      const x = i * (colW + gap);
      c.frame(r1(x), y, r1(colW), h);
      let yy = y + P + headSize * 0.85;
      c.text(x + P, yy, fit(d.g.title, headFont, headSize, colW - P * 2), { font: headFont, size: headSize, track: -0.01 });
      if (d.desc.length) {
        yy += 32;
        c.lines(x + P, yy, d.desc, 24, { font: "inter-400", size: 16, role: "muted" });
        yy += (d.desc.length - 1) * 24;
      }
      const top = yy + 26;
      d.pills.at.forEach((p) => drawPill(c, p.p, r1(x + P + p.x), r1(top + p.y)));
    });
    y += h + gap;
  }

  if (also.length) {
    if (groups.length && alsoLabel) {
      y += 8;
      c.text(2, y + 14, alsoLabel, { font: "inter-400", size: 16, role: "muted" });
      y += 30;
    }
    const f = flow(c, also, W);
    f.at.forEach((p) => drawPill(c, p.p, r1(p.x), r1(y + p.y)));
    y += f.h + gap;
  }
  const H = Math.max(PILL_H, y - gap);
  const names = [...groups.flatMap((g) => g.items), ...also].map((p) => p.label);
  return done(c, W, H, `Tech stack: ${names.join(", ")}`);
}

// ---------- contributions ----------

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function contributionsCard(look: Look, d: GithubData): Rendered {
  const c = new Canvas(look);
  const W = 1000;
  const P = 32;
  const cell = 13;
  const step = 16.5;
  const weeks = calendarWeeks(d.calendar, 53);
  const cols = weeks.length ? weeks : Array.from({ length: 53 }, () => Array(7).fill(null));
  const gridX = W - P - cols.length * step + (step - cell);
  const font = c.type.display;
  const size = look.theme === "clay" ? 46 : 40;

  const top = P + size * 0.85;
  const busiest = d.calendar.reduce<{ count: number; date?: string }>((b, day) => (day.count > b.count ? day : b), { count: 0 });
  const H = top + 30 + 26 + 7 * step + 46;
  c.frame(0, 0, W, H);

  c.text(P, top, formatCount(d.contribs), { font, size, track: c.type.displayTrack });
  c.text(P, top + 30, "contributions in the last year", { font: "inter-400", size: 16, role: "muted" });

  const stats = [
    ["Current streak", `${d.current.length} ${d.current.length === 1 ? "day" : "days"}`],
    ["Longest streak", `${d.longest.length} ${d.longest.length === 1 ? "day" : "days"}`],
    ["Busiest day", busiest.date ? `${busiest.count} · ${shortDate(busiest.date)}` : "—"],
  ];
  let sx = W - P;
  for (const [label, value] of [...stats].reverse()) {
    const vw = c.width(value, { font: "inter-600", size: 18 });
    const lw = c.width(label, { font: "inter-600", size: 11, track: 0.14, upper: true });
    const w = Math.max(vw, lw);
    c.text(sx - w, P + 12, label, { font: "inter-600", size: 11, role: "dim", track: 0.14, upper: true });
    c.text(sx - w, P + 38, value, { font: "inter-600", size: 18 });
    sx -= w + 40;
  }

  const gy = top + 30 + 40;
  let lastMonth = -1;
  cols.forEach((col, x) => {
    const first = col.find((day) => day);
    if (first) {
      const m = new Date(`${first.date}T00:00:00Z`).getUTCMonth();
      if (m !== lastMonth && x < cols.length - 2) {
        if (lastMonth !== -1 || col[0]) c.text(gridX + x * step, gy - 10, MONTHS[m], { font: "inter-400", size: 12, role: "dim" });
        lastMonth = m;
      }
    }
  });
  ["Mon", "Wed", "Fri"].forEach((label, i) => c.text(P, gy + (1 + i * 2) * step + 10, label, { font: "inter-400", size: 12, role: "dim" }));

  const rects: string[] = [];
  cols.forEach((col, x) =>
    col.forEach((day, yy) => {
      if (!day && d.calendar.length) return;
      rects.push(`<rect x="${r1(gridX + x * step)}" y="${r1(gy + yy * step)}" width="${cell}" height="${cell}" rx="3" class="c${day?.level ?? 0}"/>`);
    }),
  );
  c.push(`<g>${rects.join("")}</g>`);

  const ly = H - 22;
  let lx = W - P - 5 * step - c.width("More", { font: "inter-400", size: 12 }) - 8;
  c.text(lx - 8, ly + 10.5, "Less", { font: "inter-400", size: 12, role: "dim", anchor: "end" });
  for (let i = 0; i < 5; i++) {
    c.push(`<rect x="${r1(lx)}" y="${ly}" width="${cell}" height="${cell}" rx="3" class="c${i}"/>`);
    lx += step;
  }
  c.text(lx + 6, ly + 10.5, "More", { font: "inter-400", size: 12, role: "dim" });
  return done(c, W, H, `${formatCount(d.contribs)} contributions in the last year`);
}

const shortDate = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
};

// ---------- radar ----------

export type RadarAxis = { label: string; value: number };

export function radarCard(look: Look, title: string, axes: RadarAxis[], max: number): Rendered {
  const c = new Canvas(look);
  const W = 560;
  const R = 150;
  const n = axes.length;
  const titleH = title ? 64 : 24;
  const cx = W / 2;
  const cy = titleH + 40 + R;
  const H = cy + R + 52;
  c.frame(0, 0, W, H);
  if (title) {
    const font = c.type.heading;
    const size = look.theme === "clay" ? 30 : 22;
    c.text(cx, 30 + size * 0.85, fit(title, font, size, W - 60), { font, size, anchor: "middle", track: -0.01 });
  }
  const angle = (i: number) => -Math.PI / 2 + (i * Math.PI * 2) / n;
  const pt = (i: number, r: number) => [cx + Math.cos(angle(i)) * r, cy + Math.sin(angle(i)) * r] as const;
  const ring = (r: number) => axes.map((_, i) => pt(i, r).map(r1).join(",")).join(" ");

  for (let l = 1; l <= 4; l++) {
    c.push(
      `<polygon points="${ring((R * l) / 4)}" fill="none" class="${l === 4 ? "ms" : "ds"}"${l === 4 ? ' opacity=".8"' : ' stroke-dasharray="2 4" opacity=".7"'}/>`,
    );
  }
  axes.forEach((_, i) => {
    const [x, y] = pt(i, R);
    c.push(`<line x1="${cx}" y1="${cy}" x2="${r1(x)}" y2="${r1(y)}" class="ds" opacity=".7"/>`);
  });
  const value = (v: number) => (Math.max(0, Math.min(max, v)) / max) * R;
  const data = axes.map((a, i) => pt(i, value(a.value)));
  c.push(
    `<polygon points="${data.map((p) => p.map(r1).join(",")).join(" ")}" class="accent as" fill-opacity=".2" stroke-width="2" stroke-linejoin="round"/>`,
    ...data.map(([x, y]) => `<circle cx="${r1(x)}" cy="${r1(y)}" r="4" class="accent"/>`),
  );
  axes.forEach((a, i) => {
    const [x, y] = pt(i, R + 18);
    const cos = Math.cos(angle(i));
    const sin = Math.sin(angle(i));
    const anchor = cos > 0.3 ? "start" : cos < -0.3 ? "end" : "middle";
    const dy = sin < -0.5 ? -2 : sin > 0.5 ? 14 : 6;
    const room = anchor === "middle" ? 160 : anchor === "start" ? W - x - 12 : x - 12;
    c.text(x, y + dy, fit(a.label, "inter-600", 16, room), { font: "inter-600", size: 16, anchor });
  });
  return done(c, W, H, `${title || "Radar"}: ${axes.map((a) => `${a.label} ${a.value}`).join(", ")}`);
}
