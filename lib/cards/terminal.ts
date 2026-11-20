// Terminal ("neofetch") card: ASCII art on the left, `key ....... value` rows on the right.
// Pure SVG; the route embeds JetBrains Mono, so dots line up on every platform.

import { escapeXml as esc } from "../banner/render";

export type Palette = { label: string; stops: string[] };

/** Gradient stops for the art; the middle one doubles as the accent for title and highlighted values. */
export const palettes: Record<string, Palette> = {
  aurora: { label: "Aurora", stops: ["#7FD8FF", "#7B8CFF", "#B08BEB"] },
  ember: { label: "Ember", stops: ["#FFE08A", "#F0793B", "#E03A1A", "#8A1A0A"] },
  mint: { label: "Mint", stops: ["#B8F5D0", "#4CC38A", "#1F8A5B"] },
  lagoon: { label: "Lagoon", stops: ["#A6F0EA", "#3FBDB4", "#1F6F8B"] },
  rose: { label: "Rose", stops: ["#FFC2D9", "#F0609E", "#A3306B"] },
  sunset: { label: "Sunset", stops: ["#FFD36E", "#FF8A5B", "#C0508C"] },
  mono: { label: "Mono", stops: ["#c9d1d9", "#8b949e", "#57606a"] },
};

export type TerminalMode = "auto" | "dark" | "light";

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Gradient stops from `colors=hex,hex` or `palette=<name>` (aurora by default). */
export function stopsFrom(q: URLSearchParams): string[] {
  const custom = (q.get("colors") ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter((c) => HEX.test(c))
    .slice(0, 5)
    .map((c) => `#${c.replace("#", "")}`);
  if (custom.length) return custom;
  return (palettes[q.get("palette") ?? ""] ?? palettes.aurora).stops;
}

export function modeFrom(q: URLSearchParams): TerminalMode {
  const m = q.get("mode");
  return m === "dark" || m === "light" ? m : "auto";
}
export type TerminalFrame = "none" | "window";

export type TerminalRow =
  | { kind: "pair"; key: string; value: string; accent: boolean }
  | { kind: "note"; text: string };

export type TerminalOptions = {
  title: string;
  rows: TerminalRow[];
  /** Lines of ASCII art, all the same length; empty for none. */
  art: string[];
  stops: string[];
  mode: TerminalMode;
  frame: TerminalFrame;
};

const COLORS = {
  light: { m: "#57606a", d: "#d0d7de", v: "#1f2328", bg: "#ffffff", border: "#d0d7de" },
  dark: { m: "#8b8f97", d: "#33373e", v: "#e8e6e1", bg: "#0d1117", border: "#30363d" },
};

// JetBrains Mono advances 0.6em per character.
const ART_SIZE = 5.6;
const ART_LINE = 6.1;
const ROW_SIZE = 12;
const ROW_LINE = 20;
const CH = ROW_SIZE * 0.6;
const PAD = 8;
const GAP = 24;
/** Characters per info row. */
export const ROW_COLS = 58;

const len = (s: string) => [...s].length;
const cut = (s: string, n: number) => (len(s) <= n ? s : `${[...s].slice(0, Math.max(0, n - 1)).join("")}…`);

type Line = { kind: "title" } | { kind: "note"; text: string } | { kind: "pair"; prefix: string; dots: string; value: string; accent: boolean } | { kind: "cont"; text: string; accent: boolean };

/** Splits text into chunks of at most `n` characters, at spaces where possible. */
function wrap(text: string, n: number): string[] {
  const out: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (len(next) <= n) line = next;
    else {
      if (line) out.push(line);
      line = len(word) > n ? cut(word, n) : word;
    }
  }
  if (line) out.push(line);
  return out;
}

/** " . Key: ......... value" padded to exactly ROW_COLS characters; long values wrap onto up to 3 lines. */
function rowLines(r: TerminalRow): Line[] {
  if (r.kind === "note") return [{ kind: "note", text: cut(` . ${r.text}`, ROW_COLS) }];
  const prefix = cut(` . ${r.key}: `, ROW_COLS - 8);
  const room = ROW_COLS - len(prefix) - 1;
  if (len(r.value) <= room - 2) {
    return [{ kind: "pair", prefix, dots: ".".repeat(room - len(r.value)), value: r.value, accent: r.accent }];
  }
  const chunks = wrap(r.value, ROW_COLS - 5);
  const shown = chunks.slice(0, 3);
  if (chunks.length > 3) shown[2] = cut(`${shown[2]} …`, ROW_COLS - 5);
  return [
    { kind: "pair", prefix: prefix.trimEnd(), dots: "", value: "", accent: false },
    ...shown.map((text) => ({ kind: "cont" as const, text: `     ${text}`, accent: r.accent })),
  ];
}

export function terminalCard(o: TerminalOptions): string {
  const artW = o.art.length ? len(o.art[0]) * ART_SIZE * 0.6 : 0;
  const artH = o.art.length * ART_LINE;
  const textX = PAD + (artW ? artW + GAP : 0);
  const textW = ROW_COLS * CH;
  const lines: Line[] = [{ kind: "title" }, ...o.rows.flatMap(rowLines)];
  const rowsH = lines.length * ROW_LINE;
  const top = o.frame === "window" ? 34 : PAD;
  const bodyH = Math.max(artH, rowsH) + 8;
  const W = Math.ceil(textX + textW + PAD + (o.frame === "window" ? 8 : 0));
  const H = Math.ceil(top + bodyH + PAD);

  const rowsTop = top + (bodyH - rowsH) / 2 + 12;
  const artTop = top + (bodyH - artH) / 2 + ART_LINE - 1;
  const accent = o.stops[Math.floor((o.stops.length - 1) / 2)] ?? "#7B8CFF";

  const stops = o.stops
    .map((c, i) => `<stop offset="${o.stops.length > 1 ? Math.round((i / (o.stops.length - 1)) * 100) : 0}%" stop-color="${c}"/>`)
    .join("");

  const palette = (c: (typeof COLORS)["light"]) =>
    `.m{fill:${c.m}} .d{fill:${c.d}} .v{fill:${c.v}} .bg{fill:${c.bg};stroke:${c.border}}`;
  const theme =
    o.mode === "auto"
      ? `${palette(COLORS.light)} @media (prefers-color-scheme: dark){ ${palette(COLORS.dark)} }`
      : palette(COLORS[o.mode]);

  const out: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.title)}">`,
    `<title>${esc(o.title)}</title>`,
    `<defs><linearGradient id="tg" x1="0" y1="${artTop - ART_LINE}" x2="0" y2="${artTop + artH}" gradientUnits="userSpaceOnUse">${stops}</linearGradient></defs>`,
    // embedMonoFonts injects the @font-face rules at the start of this block.
    `<style>text{font-family:'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;white-space:pre;font-size:${ROW_SIZE}px}
.a{fill:url(#tg);font-size:${ART_SIZE}px} .t{fill:${accent};font-weight:700} .h{fill:${accent}}
${theme}</style>`,
  ];

  if (o.frame === "window") {
    out.push(
      `<rect class="bg" x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="10"/>`,
      ...["#ff5f57", "#febc2e", "#28c840"].map((c, i) => `<circle cx="${18 + i * 18}" cy="17" r="5.5" fill="${c}"/>`),
    );
  }

  o.art.forEach((line, i) => {
    if (line.trim()) out.push(`<text x="${PAD}" y="${(artTop + i * ART_LINE).toFixed(1)}" class="a" xml:space="preserve">${esc(line)}</text>`);
  });

  const titleText = `${cut(o.title, ROW_COLS - 4)} `;
  lines.forEach((l, i) => {
    const y = rowsTop + i * ROW_LINE;
    const at = `x="${textX.toFixed(1)}" y="${y.toFixed(1)}" xml:space="preserve"`;
    if (l.kind === "title")
      out.push(`<text ${at}><tspan class="t">${esc(titleText)}</tspan><tspan class="d">${"─".repeat(Math.max(3, ROW_COLS - len(titleText)))}</tspan></text>`);
    else if (l.kind === "note") out.push(`<text ${at} class="m">${esc(l.text)}</text>`);
    else if (l.kind === "cont") out.push(`<text ${at} class="${l.accent ? "h" : "v"}">${esc(l.text)}</text>`);
    else
      out.push(
        `<text ${at}><tspan class="m">${esc(l.prefix)}</tspan>${l.dots ? `<tspan class="d">${l.dots}</tspan><tspan class="${l.accent ? "h" : "v"}"> ${esc(l.value)}</tspan>` : ""}</text>`,
      );
  });

  out.push(`</svg>`);
  return out.join("\n");
}

/**
 * Parses `Key: value` row specs. `{placeholder}` values come from `vars`; numbers are highlighted,
 * as is any value wrapped in `*stars*`. A spec without a colon is a muted note line.
 * Rows whose placeholders are all unknown are dropped when `dropMissing` is set (the defaults).
 */
export function parseRows(specs: string[], vars: Record<string, string | undefined>, dropMissing = false): TerminalRow[] {
  const rows: TerminalRow[] = [];
  for (const raw of specs) {
    const spec = raw.trim();
    if (!spec) continue;
    const colon = spec.indexOf(":");
    if (colon < 0) {
      rows.push({ kind: "note", text: spec });
      continue;
    }
    const key = spec.slice(0, colon).trim();
    let value = spec.slice(colon + 1).trim();
    let missing = false;
    let numeric = false;
    value = value.replace(/\{([a-z_]+)\}/g, (m, name: string) => {
      if (!(name in vars)) return m;
      const v = vars[name];
      if (v === undefined || v === "") missing = true;
      else if (/^[\d$€£¥]/.test(v)) numeric = true;
      return v || "—";
    });
    if (missing && dropMissing) continue;
    const starred = /^\*(.+)\*$/.exec(value);
    if (starred) value = starred[1];
    rows.push({ kind: "pair", key, value, accent: numeric || Boolean(starred) });
  }
  return rows;
}
