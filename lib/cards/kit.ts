// Profile kit: one set of cards (header, section label, link button, project, numbers, tech stack,
// contributions, radar) in three looks, so a README reads as one designed page.
//   native  GitHub's own greys with an amber accent; sits in GitHub's UI as if it belonged there
//   clay    warm paper tones, a serif display face and a terracotta accent
//   mono    neutral greys in a double frame
// Every card is pure SVG. Colours live in CSS classes so mode=auto can follow the viewer's colour
// scheme; READMEs get a dark and a light copy inside <picture> (GitHub follows its own theme there).
// Text is measured with real advance widths (metrics.json) so it wraps and fits without a browser.

import { isKitTheme, type KitMode, type KitTheme } from "./kit-meta";
import metrics from "./metrics.json";

export { isKitTheme, kitThemes, type KitMode, type KitTheme } from "./kit-meta";

type Tokens = {
  bg: string; // card surface
  outer: string; // outer ring of the double frame (mono), else same as bg
  border: string;
  text: string;
  muted: string;
  dim: string;
  accent: string;
  soft: string; // pill / chip fill
  cell: string; // empty contribution cell
};

const TOKENS: Record<KitTheme, Record<"dark" | "light", Tokens>> = {
  native: {
    dark: {
      bg: "#161b22",
      outer: "#161b22",
      border: "#30363d",
      text: "#f0f6fc",
      muted: "#9198a1",
      dim: "#6e7681",
      accent: "#fbbf24",
      soft: "#2a2113",
      cell: "#21262d",
    },
    light: {
      bg: "#ffffff",
      outer: "#ffffff",
      border: "#d1d9e0",
      text: "#1f2328",
      muted: "#59636e",
      dim: "#818b98",
      accent: "#b45309",
      soft: "#fdf2dc",
      cell: "#eff2f5",
    },
  },
  clay: {
    dark: {
      bg: "#171310",
      outer: "#171310",
      border: "#2c261f",
      text: "#efe8da",
      muted: "#a0968a",
      dim: "#6a6156",
      accent: "#d2683f",
      soft: "#251e18",
      cell: "#221c17",
    },
    light: {
      bg: "#f6f1e7",
      outer: "#f6f1e7",
      border: "#e2d8c7",
      text: "#181511",
      muted: "#6e6558",
      dim: "#a89d8b",
      accent: "#b8532c",
      soft: "#ece3d3",
      cell: "#e9e1d2",
    },
  },
  mono: {
    dark: {
      bg: "#171718",
      outer: "#1c1c1d",
      border: "#303032",
      text: "#e4e4e7",
      muted: "#92929a",
      dim: "#68686f",
      accent: "#e4e4e7",
      soft: "#232325",
      cell: "#222224",
    },
    light: {
      bg: "#fafafa",
      outer: "#f1f1f2",
      border: "#e2e2e5",
      text: "#1c1c1f",
      muted: "#6e6e76",
      dim: "#a3a3aa",
      accent: "#1c1c1f",
      soft: "#ececee",
      cell: "#ebebed",
    },
  },
};

// ---------- fonts and measuring ----------

type FontKey = "inter-400" | "inter-600" | "inter-700" | "newsreader-400" | "newsreader-600" | "mono";

const FAMILY = {
  sans: "'Inter',-apple-system,'Segoe UI',Helvetica,Arial,sans-serif",
  serif: "'Newsreader',Georgia,'Times New Roman',serif",
  mono: "'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace",
};

const FONTS: Record<FontKey, { family: string; weight: number; face: string }> = {
  "inter-400": { family: FAMILY.sans, weight: 400, face: "inter:400" },
  "inter-600": { family: FAMILY.sans, weight: 600, face: "inter:600" },
  "inter-700": { family: FAMILY.sans, weight: 700, face: "inter:700" },
  "newsreader-400": { family: FAMILY.serif, weight: 400, face: "newsreader:400" },
  "newsreader-600": { family: FAMILY.serif, weight: 600, face: "newsreader:600" },
  mono: { family: FAMILY.mono, weight: 400, face: "jetbrains-mono:400" },
};

type Metric = { avg: number; ranges: [number, number[]][] };
const METRICS: Record<string, Metric> = Object.fromEntries(
  Object.entries(metrics as Record<string, { avg: number; ranges: Record<string, number[]> }>).map(([k, m]) => [
    k,
    { avg: m.avg, ranges: Object.entries(m.ranges).map(([s, w]) => [Number(s), w] as [number, number[]]) },
  ]),
);

const wide = (cp: number) =>
  (cp >= 0x1100 && cp <= 0x115f) || (cp >= 0x2e80 && cp <= 0xa4cf) || (cp >= 0xac00 && cp <= 0xd7a3) || (cp >= 0xf900 && cp <= 0xfaff) || (cp >= 0xff00 && cp <= 0xff60);

/** Width of `text` in px. `spacing` is letter-spacing in px. */
export function measure(text: string, font: FontKey, size: number, spacing = 0) {
  const chars = [...text];
  if (font === "mono") return chars.length * (0.6 * size + spacing);
  const m = METRICS[font];
  let units = 0;
  for (const ch of chars) {
    const cp = ch.codePointAt(0)!;
    let w = -1;
    for (const [start, widths] of m.ranges) {
      if (cp >= start && cp < start + widths.length) {
        w = widths[cp - start];
        break;
      }
    }
    if (w < 0) w = cp >= 0x1f000 ? 1250 : wide(cp) ? 1000 : cp >= 0xfe00 && cp <= 0xfe0f ? 0 : m.avg;
    units += w;
  }
  return (units / 1000) * size + chars.length * spacing;
}

/** Cuts `text` to fit `max` px, ending in an ellipsis when anything was dropped. */
export function fit(text: string, font: FontKey, size: number, max: number, spacing = 0) {
  if (measure(text, font, size, spacing) <= max) return text;
  const chars = [...text];
  while (chars.length && measure(`${chars.join("").trimEnd()}…`, font, size, spacing) > max) chars.pop();
  return `${chars.join("").trimEnd()}…`;
}

/** Greedy word wrap into at most `maxLines` lines; the last one gets an ellipsis if text was left over. */
export function wrap(text: string, font: FontKey, size: number, max: number, maxLines = Infinity, spacing = 0) {
  const all: string[] = [];
  for (const para of text.replace(/\r/g, "").split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (!line || measure(next, font, size, spacing) <= max) line = next;
      else {
        all.push(line);
        line = word;
      }
    }
    if (line) all.push(line);
  }
  const lines = all.slice(0, maxLines).map((l) => fit(l, font, size, max, spacing));
  if (all.length > lines.length && lines.length) {
    const last = lines[lines.length - 1].replace(/…$/, "");
    lines[lines.length - 1] = fit(`${last}…`, font, size, max, spacing);
  }
  return lines;
}

// ---------- drawing context ----------

export const esc = (s: string) => s.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);
const r1 = (n: number) => Math.round(n * 10) / 10;

type Role = "text" | "muted" | "dim" | "accent";

type TextOpts = {
  font: FontKey;
  size: number;
  role?: Role;
  /** Letter-spacing in em. */
  track?: number;
  anchor?: "start" | "middle" | "end";
  upper?: boolean;
  opacity?: number;
};

export type Look = {
  theme: KitTheme;
  mode: KitMode;
  accent?: string;
};

/** Typography for each look. */
const TYPE: Record<KitTheme, { display: FontKey; displayTrack: number; heading: FontKey; strong: FontKey; tag: FontKey; eyebrowUpper: boolean }> = {
  native: { display: "inter-700", displayTrack: -0.025, heading: "inter-700", strong: "inter-600", tag: "mono", eyebrowUpper: false },
  clay: { display: "newsreader-400", displayTrack: -0.015, heading: "newsreader-400", strong: "inter-600", tag: "inter-600", eyebrowUpper: true },
  mono: { display: "inter-600", displayTrack: -0.02, heading: "inter-600", strong: "inter-600", tag: "inter-600", eyebrowUpper: true },
};

const RADIUS: Record<KitTheme, number> = { native: 12, clay: 16, mono: 12 };

const HEX = /^#?([0-9a-f]{6})$/i;

function mix(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (p: number, s: number) => (p >> s) & 255;
  const c = [16, 8, 0].map((s) => Math.round(ch(pa, s) + (ch(pb, s) - ch(pa, s)) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function tokensFor(look: Look, scheme: "dark" | "light"): Tokens {
  const t = TOKENS[look.theme][scheme];
  return look.accent ? { ...t, accent: look.accent } : t;
}

function css(t: Tokens, dark: boolean) {
  const levels = [0, 0.3, 0.55, 0.8, 1].map((k, i) => (i === 0 ? t.cell : mix(t.cell, t.accent, k)));
  return [
    `.bg{fill:${t.bg}}.ou{fill:${t.outer}}.bd{stroke:${t.border}}.bf{fill:${t.border}}`,
    `.text{fill:${t.text}}.muted{fill:${t.muted}}.dim{fill:${t.dim}}.accent{fill:${t.accent}}`,
    `.as{stroke:${t.accent}}.ds{stroke:${t.dim}}.ms{stroke:${t.muted}}.so{fill:${t.soft}}.ts{stroke:${t.text}}`,
    ...levels.map((c, i) => `.c${i}{fill:${c}}`),
    // Black logos (Rust, Vercel, GitHub…) flip to white on dark cards.
    dark ? ".inv{filter:invert(1) hue-rotate(180deg)}" : "",
  ].join("");
}

export class Canvas {
  readonly faces = new Set<string>();
  readonly type: (typeof TYPE)[KitTheme];
  readonly radius: number;
  private parts: string[] = [];
  private defs: string[] = [];
  private ids = 0;

  constructor(readonly look: Look) {
    this.type = TYPE[look.theme];
    this.radius = RADIUS[look.theme];
  }

  push(...s: string[]) {
    this.parts.push(...s);
  }

  def(s: string) {
    this.defs.push(s);
  }

  id(prefix: string) {
    return `${prefix}${++this.ids}`;
  }

  /** Width of a string drawn with `o`. */
  width(s: string, o: TextOpts) {
    const str = o.upper ? s.toUpperCase() : s;
    return measure(str, o.font, o.size, (o.track ?? 0) * o.size);
  }

  text(x: number, y: number, s: string, o: TextOpts) {
    const f = FONTS[o.font];
    this.faces.add(f.face);
    const str = o.upper ? s.toUpperCase() : s;
    const attrs = [
      `x="${r1(x)}" y="${r1(y)}"`,
      `class="${o.role ?? "text"}"`,
      `font-family="${f.family}"`,
      `font-size="${o.size}"`,
      f.weight !== 400 ? `font-weight="${f.weight}"` : "",
      o.track ? `letter-spacing="${r1(o.track * o.size * 100) / 100}"` : "",
      o.anchor && o.anchor !== "start" ? `text-anchor="${o.anchor}"` : "",
      o.opacity !== undefined ? `opacity="${o.opacity}"` : "",
    ]
      .filter(Boolean)
      .join(" ");
    this.parts.push(`<text ${attrs}>${esc(str)}</text>`);
    return this.width(s, o);
  }

  /** Lines of text, `lh` px apart, first baseline at `y`. Returns the y after the last line. */
  lines(x: number, y: number, lines: string[], lh: number, o: TextOpts) {
    lines.forEach((l, i) => this.text(x, y + i * lh, l, o));
    return y + Math.max(0, lines.length - 1) * lh;
  }

  /** The card's background: one frame, or two nested ones for mono. */
  frame(x: number, y: number, w: number, h: number, r = this.radius) {
    if (this.look.theme === "mono") {
      this.parts.push(
        `<rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" rx="${r}" class="ou bd"/>`,
        `<rect x="${x + 3.5}" y="${y + 3.5}" width="${w - 7}" height="${h - 7}" rx="${Math.max(2, r - 3)}" class="bg bd"/>`,
      );
    } else {
      this.parts.push(`<rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" rx="${r}" class="bg bd"/>`);
    }
  }

  svg(w: number, h: number, title: string) {
    const schemes =
      this.look.mode === "auto"
        ? `${css(tokensFor(this.look, "light"), false)}@media (prefers-color-scheme:dark){${css(tokensFor(this.look, "dark"), true)}}`
        : css(tokensFor(this.look, this.look.mode), this.look.mode === "dark");
    return [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${Math.ceil(h)}" viewBox="0 0 ${w} ${Math.ceil(h)}" role="img" aria-label="${esc(title)}">`,
      `<title>${esc(title)}</title>`,
      // The route adds @font-face rules at the start of this block.
      `<style>${schemes}</style>`,
      this.defs.length ? `<defs>${this.defs.join("")}</defs>` : "",
      ...this.parts,
      `</svg>`,
    ]
      .filter(Boolean)
      .join("\n");
  }
}

export function kitLookFrom(q: URLSearchParams): Look {
  const theme = q.get("theme");
  const mode = q.get("mode");
  const accent = HEX.exec(q.get("accent") ?? "");
  return {
    theme: isKitTheme(theme) ? theme : "native",
    mode: mode === "dark" || mode === "light" ? mode : "auto",
    accent: accent ? `#${accent[1].toLowerCase()}` : undefined,
  };
}

/** A short, single-line value from the query string. */
export const param = (q: URLSearchParams, key: string, max: number) => (q.get(key) ?? "").replace(/\s+/g, " ").trim().slice(0, max);
/** A multi-line value from the query string (newlines kept). */
export const textParam = (q: URLSearchParams, key: string, max: number) =>
  (q.get(key) ?? "")
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .join("\n")
    .trim()
    .slice(0, max);

export { r1 };
