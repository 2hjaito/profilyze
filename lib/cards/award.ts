// Award-style badges ("Featured in …", "#1 Repository Of The Day"), the kind of framed card
// projects show off at the top of a README. Pure SVG; Inter is injected by embedCardFonts.

import { glyphs } from "../catalog";
import { escapeXml as esc } from "../banner/render";

export type AwardStyle = "laurel" | "gold" | "aurora" | "minimal";

export const awardStyles: Record<AwardStyle, { label: string; desc: string }> = {
  laurel: { label: "Laurel", desc: "Purple laurel wreath on white, like GitHub Trending cards." },
  gold: { label: "Gold medal", desc: "Dark card with a gold medal and ribbon." },
  aurora: { label: "Aurora", desc: "Dark gradient with a glowing border." },
  minimal: { label: "Minimal", desc: "Quiet light card with a trophy icon." },
};

export const isAwardStyle = (s: string | null): s is AwardStyle => !!s && s in awardStyles;

/** The mark in the middle of the medal/wreath. `star` is drawn solid; the others are line glyphs. */
export const awardIcons = ["star", "trophy", "flame", "zap", "code", "repo", "users", "eye"] as const;
export type AwardIcon = (typeof awardIcons)[number];
export const isAwardIcon = (s: string | null): s is AwardIcon => !!s && (awardIcons as readonly string[]).includes(s);

export type AwardOptions = { label: string; title: string; style: AwardStyle; rank?: string; icon?: AwardIcon };

// Gold for #1, silver for #2, bronze for #3 (any other rank keeps gold).
const MEDALS: Record<string, [string, string, string, string]> = {
  gold: ["#ffe08a", "#e8b23a", "#b7791f", "#9a6412"],
  silver: ["#f4f6f8", "#c3cad3", "#8a94a1", "#5f6873"],
  bronze: ["#f6c9a0", "#cd7f32", "#8c4f1c", "#6e3b12"],
};
const medal = (rank?: string) => MEDALS[rank === "2" ? "silver" : rank === "3" ? "bronze" : "gold"];

const H = 88;
const ICON = 88; // space reserved for the icon on the left
const FONT = `font-family="Inter, -apple-system, 'Segoe UI', sans-serif"`;

// Rough Inter advance widths (em). Good enough to size the card without measuring.
const em = (ch: string) =>
  /[iljI.,:;'|!]/.test(ch) ? 0.28 : /[ ]/.test(ch) ? 0.27 : /[mwMW]/.test(ch) ? 0.86 : /[A-Z]/.test(ch) ? 0.7 : /[0-9#]/.test(ch) ? 0.62 : 0.56;
const textWidth = (s: string, px: number, bold = false, spacing = 0) =>
  [...s].reduce((w, ch) => w + em(ch) * px * (bold ? 1.06 : 1) + spacing, 0);

function laurel(cx: number, cy: number, r: number, fill: string) {
  const leaves: string[] = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 7; i++) {
      let deg = 105 + i * 22;
      if (side > 0) deg = 180 - deg;
      const a = (deg * Math.PI) / 180;
      const x = cx + r * Math.cos(a);
      const y = cy - r * Math.sin(a);
      const rot = -deg + (side > 0 ? 0 : 180) + side * 30;
      leaves.push(
        `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="2.8" ry="7" transform="rotate(${rot.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="${fill}"/>`,
      );
    }
  }
  return leaves.join("");
}

const starPath = (cx: number, cy: number, R: number) => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? R * 0.45 : R;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join("L")}Z`;
};

/** The centre of the icon: a number when `rank` is set, otherwise a star. */
function core(cx: number, cy: number, size: number, o: AwardOptions, fill: string, stroke: string, text: string) {
  if (o.rank)
    return `<text x="${cx}" y="${cy + size * 0.36}" text-anchor="middle" font-size="${size}" font-weight="700" fill="${text}">${esc(o.rank)}</text>`;
  if (o.icon && o.icon !== "star") return glyph(o.icon, cx - size * 0.55, cy - size * 0.55, size * 1.1, text);
  return `<path d="${starPath(cx, cy, size * 0.62)}" fill="${fill}" stroke="${stroke}" stroke-width="1.2" stroke-linejoin="round"/>`;
}

function glyph(name: string, x: number, y: number, size: number, color: string) {
  const g = glyphs[name];
  return g
    ? `<g transform="translate(${x} ${y}) scale(${size / 24})" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${g.body}</g>`
    : "";
}

type Look = {
  defs?: string;
  bg: string;
  border: string;
  borderWidth: number;
  icon: string;
  label: string;
  title: string;
};

function look(o: AwardOptions, cx: number, cy: number): Look {
  switch (o.style) {
    case "gold": {
      const [hi, mid, lo, edge] = medal(o.rank);
      return {
        defs: `<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${hi}"/><stop offset=".55" stop-color="${mid}"/><stop offset="1" stop-color="${lo}"/></linearGradient>`,
        bg: "#0d1117",
        border: "url(#g)",
        borderWidth: 2,
        icon:
          `<path d="M${cx - 13} ${cy - 30}l8 18h10l-8-18z" fill="#c0392b"/><path d="M${cx + 13} ${cy - 30}l-8 18h-10l8-18z" fill="#2e86de"/>` +
          `<circle cx="${cx}" cy="${cy + 4}" r="18" fill="url(#g)"/><circle cx="${cx}" cy="${cy + 4}" r="13.5" fill="none" stroke="${edge}" stroke-opacity=".55" stroke-width="1.5"/>` +
          core(cx, cy + 4, 16, o, "#fffdf5", edge, edge),
        label: mid,
        title: "#f5f5f7",
      };
    }
    case "aurora":
      return {
        defs:
          `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#14112b"/><stop offset="1" stop-color="#0b1d2a"/></linearGradient>` +
          `<linearGradient id="a" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#a78bfa"/><stop offset=".5" stop-color="#60a5fa"/><stop offset="1" stop-color="#83ebf1"/></linearGradient>`,
        bg: "url(#bg)",
        border: "url(#a)",
        borderWidth: 2,
        icon:
          `<circle cx="${cx}" cy="${cy}" r="24" fill="url(#a)" fill-opacity=".14"/><circle cx="${cx}" cy="${cy}" r="24" fill="none" stroke="url(#a)" stroke-width="1.5"/>` +
          core(cx, cy, 20, o, "url(#a)", "none", o.rank ? "#c4b5fd" : "#83ebf1"),
        label: "#83ebf1",
        title: "#ffffff",
      };
    case "minimal":
      return {
        bg: "#ffffff",
        border: "#d0d7de",
        borderWidth: 1,
        icon:
          `<circle cx="${cx}" cy="${cy}" r="24" fill="#f6f8fa" stroke="#d0d7de"/>` +
          (o.rank || (o.icon && o.icon !== "star")
            ? core(cx, cy, 20, o, "", "", "#1f2328")
            : o.icon === "star"
              ? core(cx, cy, 20, o, "#1f2328", "#1f2328", "#1f2328")
              : glyph("trophy", cx - 12, cy - 12, 24, "#1f2328")),
        label: "#656d76",
        title: "#1f2328",
      };
    default:
      return {
        bg: "#ffffff",
        border: "#5b3fa8",
        borderWidth: 2.5,
        icon: laurel(cx, cy, 25, "#5b3fa8") + core(cx, cy - 1, o.rank ? 22 : 18, o, "#f2b632", "#c98a12", o.rank ? "#5b3fa8" : "#c98a12"),
        label: "#5b3fa8",
        title: "#2d1b69",
      };
  }
}

export function awardBadge(o: AwardOptions) {
  const label = o.label.toUpperCase();
  const textW = Math.max(textWidth(label, 13, false, 1.3), textWidth(o.title, 22, true));
  const w = Math.ceil(ICON + textW + 28);
  const L = look(o, 46, H / 2);
  const bw = L.borderWidth;
  const aria = `${o.label} ${o.title}`.trim();
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${H}" viewBox="0 0 ${w} ${H}" role="img" aria-label="${esc(aria)}" ${FONT}>
<title>${esc(aria)}</title>
<style></style>
${L.defs ? `<defs>${L.defs}</defs>` : ""}
<rect x="${bw / 2}" y="${bw / 2}" width="${w - bw}" height="${H - bw}" rx="14" fill="${L.bg}" stroke="${L.border}" stroke-width="${bw}"/>
${L.icon}
${label ? `<text x="${ICON}" y="35" font-size="13" font-weight="600" letter-spacing="1.3" fill="${L.label}">${esc(label)}</text>` : ""}
<text x="${ICON}" y="${label ? 63 : 52}" font-size="22" font-weight="700" fill="${L.title}">${esc(o.title)}</text>
</svg>`;
}
