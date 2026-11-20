// Debugger-style cards: a hexdump header and an activity view (memory map + call stack).
// Pure SVG in a window frame; the route embeds JetBrains Mono.

import { calendarWeeks, escapeXml as esc } from "../banner/render";
import type { GithubData, RecentRepo } from "../github/types";
import type { TerminalMode } from "./terminal";

type Colors = { bg: string; bar: string; border: string; text: string; muted: string; dim: string };
const COLORS: Record<"light" | "dark", Colors> = {
  light: { bg: "#ffffff", bar: "#f6f8fa", border: "#d0d7de", text: "#1f2328", muted: "#6e7781", dim: "#c4cbd3" },
  dark: { bg: "#0d1117", bar: "#161b22", border: "#30363d", text: "#e6edf3", muted: "#7d8590", dim: "#30363d" },
};

export type DebuggerOptions = { mode: TerminalMode; stops: string[] };

const accentOf = (stops: string[]) => stops[Math.floor((stops.length - 1) / 2)] ?? "#7B8CFF";
const hex = (n: number, w: number) => n.toString(16).toUpperCase().padStart(w, "0");

/** A stable fake address from a name, so the same repo keeps its address between renders. */
function addressOf(name: string) {
  let h = 0x811c9dc5;
  for (const c of name) h = Math.imul(h ^ c.charCodeAt(0), 0x01000193) >>> 0;
  return 0x00400000 + (h & 0x000ffff0);
}

function frame(W: number, H: number, title: string, o: DebuggerOptions, extraCss: string, body: string[]) {
  const css = (c: Colors) =>
    `.bg{fill:${c.bg};stroke:${c.border}} .bar{fill:${c.bar}} .ln{stroke:${c.border}} .x{fill:${c.text}} .m{fill:${c.muted}} .d{fill:${c.dim}}`;
  const theme = o.mode === "auto" ? `${css(COLORS.light)} @media (prefers-color-scheme: dark){ ${css(COLORS.dark)} }` : css(COLORS[o.mode]);
  const accent = accentOf(o.stops);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}">`,
    `<title>${esc(title)}</title>`,
    // embedMonoFonts injects the @font-face rules at the start of this block.
    `<style>text{font-family:'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;white-space:pre;font-size:12px}
.h{fill:${accent}} .b{font-weight:700} ${theme} ${extraCss}</style>`,
    `<clipPath id="win"><rect width="${W}" height="${H}" rx="10"/></clipPath>`,
    `<g clip-path="url(#win)"><rect class="bg" x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="10"/>`,
    `<rect class="bar" x="1" y="1" width="${W - 2}" height="30"/><line class="ln" x1="0" y1="31.5" x2="${W}" y2="31.5"/>`,
    ...["#ff5f57", "#febc2e", "#28c840"].map((c, i) => `<circle cx="${18 + i * 18}" cy="16" r="5.5" fill="${c}"/>`),
    `<text x="${W / 2}" y="20" text-anchor="middle" class="m" font-size="11">${esc(title)}</text>`,
    ...body,
    `</g></svg>`,
  ].join("\n");
}

// ---------- hexdump ----------

const CH = 12 * 0.6;

/** The bio as a hexdump: offset, 16 bytes in two groups of 8, and the printable column. */
export function hexdumpCard(text: string, title: string, o: DebuggerOptions) {
  const bytes = [...new TextEncoder().encode(text)].slice(0, 16 * 16);
  const rows = Math.max(1, Math.ceil(bytes.length / 16));
  const cols = 10 + 16 * 3 + 2 + 18;
  const W = Math.ceil(24 + cols * CH + 24);
  const top = 58;
  const H = top + rows * 20 + 16;
  const body: string[] = [];

  body.push(
    `<text x="24" y="${top - 6}" class="m" xml:space="preserve">${esc("OFFSET    00 01 02 03 04 05 06 07  08 09 0A 0B 0C 0D 0E 0F  ASCII")}</text>`,
  );
  for (let r = 0; r < rows; r++) {
    const chunk = bytes.slice(r * 16, r * 16 + 16);
    const y = top + 16 + r * 20;
    const parts = [`<tspan class="m">${hex(r * 16, 8)}  </tspan>`];
    for (let i = 0; i < 16; i++) {
      const b = chunk[i];
      const gap = i === 7 ? "  " : " ";
      if (b === undefined) parts.push(`  ${gap}`); // past the end: blank, like xxd
      else {
        // Letters and digits in the accent, other printable bytes plain, control and UTF-8 bytes dim.
        const cls = /[A-Za-z0-9]/.test(String.fromCharCode(b)) ? "h" : b >= 0x20 && b < 0x7f ? "x" : "m";
        parts.push(`<tspan class="${cls}">${hex(b, 2)}</tspan>${gap}`);
      }
    }
    const ascii = chunk.map((b) => (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : ".")).join("");
    parts.push(` <tspan class="m">|</tspan><tspan class="x">${esc(ascii.padEnd(16, " "))}</tspan><tspan class="m">|</tspan>`);
    body.push(`<text x="24" y="${y}" xml:space="preserve">${parts.join("")}</text>`);
  }

  // Blinking caret after the last byte.
  const last = bytes.length ? (bytes.length - 1) % 16 : -1;
  const caretRow = Math.max(0, rows - 1) + (last === 15 ? 1 : 0);
  const caretCol = last === 15 ? 0 : last + 1;
  if (caretRow < rows) {
    const cx = 24 + (10 + caretCol * 3 + (caretCol > 7 ? 1 : 0)) * CH;
    const cy = top + 16 + caretRow * 20 - 11;
    body.push(
      `<rect x="${cx.toFixed(1)}" y="${cy}" width="${(CH * 2).toFixed(1)}" height="14" class="h" opacity=".85"><animate attributeName="opacity" values=".85;0;.85" keyTimes="0;.5;1" dur="1.1s" calcMode="discrete" repeatCount="indefinite"/></rect>`,
    );
  }

  return frame(W, H, title, o, "", body);
}

// ---------- activity ----------

const ago = (iso: string) => {
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  if (s < 86400 * 60) return `${Math.round(s / 86400)}d ago`;
  return `${Math.round(s / 86400 / 30)}mo ago`;
};

/** Contribution calendar as a memory map, recently pushed repositories as a call stack. */
export function activityCard(d: GithubData, repos: RecentRepo[], o: DebuggerOptions) {
  const step = 13;
  const cell = 10;
  const left = 68;
  const mapTop = 70;
  const weeks = calendarWeeks(d.calendar, 53);
  const W = left + weeks.length * step + 24;
  const stack = repos.filter((r) => !r.fork).slice(0, 6);
  const stackTop = mapTop + 7 * step + 46;
  const H = stackTop + Math.max(1, stack.length) * 20 + 14;
  const body: string[] = [];

  body.push(
    `<text x="24" y="54" xml:space="preserve"><tspan class="h b">memory map</tspan><tspan class="m">  ${esc(
      `${d.contribs.toLocaleString("en-US")} writes in the last year · streak ${d.current.length}d · longest ${d.longest.length}d`,
    )}</tspan></text>`,
  );
  for (let r = 0; r < 7; r += 2)
    body.push(`<text x="24" y="${mapTop + r * step + 9}" class="m" font-size="10">${hex(r * 0x10, 4)}</text>`);

  // Four intensities of the accent; empty days are drawn dim.
  const levelOpacity = [0, 0.3, 0.55, 0.8, 1];
  const cells: string[] = [];
  weeks.forEach((col, x) =>
    col.forEach((day, y) => {
      if (!day) return;
      const at = `x="${left + x * step}" y="${mapTop + y * step}" width="${cell}" height="${cell}" rx="2"`;
      cells.push(
        day.level === 0
          ? `<rect ${at} class="d"><title>${day.date}: 0</title></rect>`
          : `<rect ${at} class="h" opacity="${levelOpacity[day.level]}"><title>${day.date}: ${day.count}</title></rect>`,
      );
    }),
  );
  body.push(`<g>${cells.join("")}</g>`);

  body.push(`<line class="ln" x1="24" y1="${stackTop - 30.5}" x2="${W - 24}" y2="${stackTop - 30.5}"/>`);
  body.push(`<text x="24" y="${stackTop - 8}" xml:space="preserve"><tspan class="h b">call stack</tspan><tspan class="m">  recently pushed</tspan></text>`);
  if (!stack.length) body.push(`<text x="24" y="${stackTop + 14}" class="m">  (empty)</text>`);
  const nameCols = Math.max(10, Math.min(24, Math.floor((W - 48) / CH) - 52));
  stack.forEach((r, i) => {
    const y = stackTop + 14 + i * 20;
    const name = r.name.length > nameCols ? `${r.name.slice(0, nameCols - 1)}…` : r.name;
    const lang = (r.language ?? "—").slice(0, 12);
    body.push(
      `<text x="24" y="${y}" xml:space="preserve"><tspan class="m">#${i}  </tspan><tspan class="m">0x${hex(addressOf(r.name), 8)}  </tspan><tspan class="x b">${esc(
        name.padEnd(nameCols),
      )}</tspan><tspan class="m">  ${esc(lang.padEnd(12))}  </tspan><tspan class="h">★${r.stars}</tspan><tspan class="m">${esc(`  ${ago(r.pushedAt)}`)}</tspan></text>`,
    );
  });

  return frame(W, H, `${d.login} — activity`, o, "", body);
}
