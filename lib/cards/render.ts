// Standalone GitHub profile cards. Pure SVG; fonts are injected by the caller.

import { glyphs } from "../catalog";
import { calendarWeeks, escapeXml as esc } from "../banner/render";
import { formatCount, type GithubData } from "../github/types";

export type Theme = {
  label: string;
  bg: string;
  border: string;
  title: string;
  text: string;
  muted: string;
  accent: string;
  /** Contribution levels 0–4 */
  levels: [string, string, string, string, string];
};

export const themes: Record<string, Theme> = {
  "github-dark": {
    label: "GitHub Dark",
    bg: "#0d1117",
    border: "#30363d",
    title: "#e6edf3",
    text: "#c9d1d9",
    muted: "#8b949e",
    accent: "#58a6ff",
    levels: ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"],
  },
  "github-light": {
    label: "GitHub Light",
    bg: "#ffffff",
    border: "#d0d7de",
    title: "#1f2328",
    text: "#1f2328",
    muted: "#656d76",
    accent: "#0969da",
    levels: ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"],
  },
  midnight: {
    label: "Midnight",
    bg: "#09090b",
    border: "#26262b",
    title: "#ededef",
    text: "#d4d4d8",
    muted: "#9b9ba4",
    accent: "#83ebf1",
    levels: ["#18181c", "#164e52", "#1f7f86", "#3fb9c1", "#83ebf1"],
  },
  tokyonight: {
    label: "Tokyo Night",
    bg: "#1a1b27",
    border: "#2a2e42",
    title: "#70a5fd",
    text: "#c0caf5",
    muted: "#565f89",
    accent: "#bf91f3",
    levels: ["#24283b", "#3b3f6b", "#5a5fa8", "#7b83e0", "#a9b1ff"],
  },
  dracula: {
    label: "Dracula",
    bg: "#282a36",
    border: "#44475a",
    title: "#ff79c6",
    text: "#f8f8f2",
    muted: "#9aa0c0",
    accent: "#bd93f9",
    levels: ["#343746", "#4b3d6e", "#6e55a8", "#9b78e0", "#bd93f9"],
  },
  sunset: {
    label: "Sunset",
    bg: "#1c1412",
    border: "#3a2a24",
    title: "#ffb86b",
    text: "#f3e6dc",
    muted: "#a48b7d",
    accent: "#ff7a59",
    levels: ["#2a1f1b", "#5c2e1f", "#97401f", "#d9602b", "#ff9b54"],
  },
};

export const findTheme = (name?: string | null) => themes[name ?? ""] ?? themes["github-dark"];

export type CardOptions = { theme: Theme; hideBorder?: boolean; transparent?: boolean };

const FONT = `font-family="Inter, -apple-system, 'Segoe UI', sans-serif"`;

function shell(w: number, h: number, o: CardOptions, title: string, body: string) {
  const t = o.theme;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}" ${FONT}>`,
    `<title>${esc(title)}</title>`,
    `<style></style>`, // embedCardFonts injects the @font-face rules here
    `<rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="10" fill="${o.transparent ? "none" : t.bg}" stroke="${o.hideBorder ? "none" : t.border}"/>`,
    body,
    `</svg>`,
  ].join("\n");
}

function glyph(name: string, x: number, y: number, size: number, color: string) {
  const g = glyphs[name];
  if (!g) return "";
  return `<g transform="translate(${x} ${y}) scale(${size / 24})" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${g.body}</g>`;
}

const fmtDate = (d?: string, withYear = true) =>
  d
    ? new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        ...(withYear ? { year: "numeric" } : {}),
        timeZone: "UTC",
      })
    : "";

const range = (start?: string, end?: string) => {
  if (!start) return "No streak yet";
  const sameYear = start.slice(0, 4) === end?.slice(0, 4);
  return start === end ? fmtDate(start) : `${fmtDate(start, !sameYear)} – ${fmtDate(end)}`;
};

// ---------- streak ----------

export function streakCard(d: GithubData, o: CardOptions) {
  const t = o.theme;
  const W = 495;
  const H = 195;
  const col = (cx: number, value: string, label: string, sub: string, color: string) =>
    `<g text-anchor="middle">
<text x="${cx}" y="88" font-size="28" font-weight="700" fill="${color}">${esc(value)}</text>
<text x="${cx}" y="120" font-size="14" font-weight="600" fill="${t.text}">${esc(label)}</text>
<text x="${cx}" y="142" font-size="12" fill="${t.muted}">${esc(sub)}</text></g>`;

  const body = [
    col(82, formatCount(d.total), "Total Contributions", "All time", t.title),
    `<line x1="165" y1="40" x2="165" y2="155" stroke="${t.border}"/>`,
    `<line x1="330" y1="40" x2="330" y2="155" stroke="${t.border}"/>`,
    // current streak: ring + flame
    `<g>
<circle cx="247.5" cy="78" r="40" fill="none" stroke="${t.accent}" stroke-width="5"/>
<rect x="235.5" y="26" width="24" height="24" fill="${o.transparent ? "none" : t.bg}"/>
${glyph("flame", 237.5, 27, 20, t.accent)}
<text x="247.5" y="88" text-anchor="middle" font-size="28" font-weight="700" fill="${t.title}">${d.current.length}</text>
<text x="247.5" y="146" text-anchor="middle" font-size="14" font-weight="600" fill="${t.accent}">Current Streak</text>
<text x="247.5" y="166" text-anchor="middle" font-size="12" fill="${t.muted}">${esc(range(d.current.start, d.current.end))}</text></g>`,
    col(412.5, String(d.longest.length), "Longest Streak", range(d.longest.start, d.longest.end), t.title),
  ];
  return shell(W, H, o, `${d.login}'s contribution streak`, body.join("\n"));
}

// ---------- stats ----------

export function statsCard(d: GithubData, o: CardOptions) {
  const t = o.theme;
  // Without a token only some numbers exist; show those rather than a column of dashes.
  const rows = (
    [
      ["star", "Total Stars", d.stars],
      ["commit", "Commits (last year)", d.commits],
      ["pr", "Pull Requests", d.prs],
      ["issue", "Issues", d.issues],
      ["repo", "Contributed to", d.contributedTo],
      ["users", "Followers", d.followers],
      ["repo", "Repositories", d.repos],
      ["calendar", "Total Contributions", d.total],
      ["flame", "Longest Streak", d.longest.length],
    ] as [string, string, number | undefined][]
  )
    .filter(([, , v]) => v !== undefined)
    .slice(0, 6);
  const W = 495;
  const H = 195;
  const lines = rows.map(([icon, label, value], i) => {
    const y = 64 + i * 22 + (6 - rows.length) * 11;
    return `<g>${glyph(icon, 25, y - 13, 16, t.accent)}
<text x="50" y="${y}" font-size="14" font-weight="600" fill="${t.text}">${esc(label)}:</text>
<text x="250" y="${y}" font-size="14" font-weight="700" fill="${t.title}" text-anchor="end">${formatCount(value)}</text></g>`;
  });

  // Contribution ring on the right
  const pct = Math.min(1, d.contribs / 1000);
  const C = 2 * Math.PI * 52;
  const ring = `<g>
<circle cx="390" cy="110" r="52" fill="none" stroke="${t.border}" stroke-width="8"/>
<circle cx="390" cy="110" r="52" fill="none" stroke="${t.accent}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${(C * pct).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 390 110)"/>
<text x="390" y="114" text-anchor="middle" font-size="22" font-weight="700" fill="${t.title}">${formatCount(d.contribs)}</text>
<text x="390" y="132" text-anchor="middle" font-size="10" fill="${t.muted}">past year</text></g>`;

  const name = d.name || d.login;
  const title = `<text x="25" y="34" font-size="18" font-weight="700" fill="${t.title}">${esc(name)}'s GitHub Stats</text>`;
  return shell(W, H, o, `${name}'s GitHub stats`, [title, ...lines, ring].join("\n"));
}

// ---------- contribution graph ----------

export function graphCard(d: GithubData, o: CardOptions) {
  const t = o.theme;
  const cell = 11;
  const step = 14;
  const left = 44;
  const top = 64;
  const cols = calendarWeeks(d.calendar, 53);
  const W = left + cols.length * step + 24;
  const H = top + 7 * step + 46;

  const rects: string[] = [];
  const months: string[] = [];
  let lastMonth = -1;
  cols.forEach((col, x) => {
    const first = col.find(Boolean);
    if (first) {
      const m = new Date(`${first.date}T00:00:00Z`).getUTCMonth();
      if (m !== lastMonth && x < cols.length - 2) {
        months.push(
          `<text x="${left + x * step}" y="${top - 10}" font-size="11" fill="${t.muted}">${new Date(Date.UTC(2000, m, 1)).toLocaleString("en-US", { month: "short", timeZone: "UTC" })}</text>`,
        );
        lastMonth = m;
      }
    }
    col.forEach((day, y) => {
      if (!day) return;
      rects.push(
        `<rect x="${left + x * step}" y="${top + y * step}" width="${cell}" height="${cell}" rx="2.5" fill="${t.levels[day.level]}"><title>${day.count} on ${day.date}</title></rect>`,
      );
    });
  });

  const days = [
    [1, "Mon"],
    [3, "Wed"],
    [5, "Fri"],
  ]
    .map(([r, l]) => `<text x="${left - 10}" y="${top + (r as number) * step + 9}" font-size="11" fill="${t.muted}" text-anchor="end">${l}</text>`)
    .join("");

  const ly = top + 7 * step + 16;
  const lx = W - 24 - 34 - 5 * step; // leaves room for "More" on the right
  const legend = [
    `<text x="${lx - 6}" y="${ly + 9}" font-size="11" fill="${t.muted}" text-anchor="end">Less</text>`,
    ...t.levels.map((c, i) => `<rect x="${lx + i * step}" y="${ly}" width="${cell}" height="${cell}" rx="2.5" fill="${c}"/>`),
    `<text x="${lx + 5 * step + 3}" y="${ly + 9}" font-size="11" fill="${t.muted}">More</text>`,
  ].join("");

  const summary = `<text x="24" y="32" font-size="15" font-weight="600" fill="${t.title}">${formatCount(d.contribs)} contributions in the last year</text>
<text x="${W - 24}" y="32" font-size="12" fill="${t.muted}" text-anchor="end">@${esc(d.login)}</text>`;

  return shell(W, H, o, `${d.login}'s contribution graph`, [summary, months.join(""), days, `<g>${rects.join("")}</g>`, legend].join("\n"));
}

// ---------- languages ----------

export function languagesCard(d: GithubData, o: CardOptions) {
  const t = o.theme;
  const langs = (d.languages ?? []).slice(0, 8);
  const total = langs.reduce((n, l) => n + l.size, 0) || 1;
  const W = 350;
  const rowsN = Math.ceil(langs.length / 2);
  const H = 92 + rowsN * 24;

  let x = 25;
  const barW = W - 50;
  const segments = langs.map((l) => {
    const w = (l.size / total) * barW;
    const seg = `<rect x="${x.toFixed(2)}" y="50" width="${Math.max(w, 0).toFixed(2)}" height="8" fill="${l.color}"/>`;
    x += w;
    return seg;
  });

  const legend = langs.map((l, i) => {
    const lx = 25 + (i % 2) * 160;
    const ly = 84 + Math.floor(i / 2) * 24;
    return `<g><circle cx="${lx + 5}" cy="${ly - 4}" r="5" fill="${l.color}"/>
<text x="${lx + 16}" y="${ly}" font-size="12" fill="${t.text}">${esc(l.name)} <tspan fill="${t.muted}">${((l.size / total) * 100).toFixed(1)}%</tspan></text></g>`;
  });

  const empty = langs.length
    ? ""
    : `<text x="25" y="84" font-size="12" fill="${t.muted}">Language data needs a GITHUB_TOKEN on the server.</text>`;

  return shell(
    W,
    langs.length ? H : 110,
    o,
    `${d.login}'s top languages`,
    [
      `<text x="25" y="34" font-size="18" font-weight="700" fill="${t.title}">Most Used Languages</text>`,
      `<clipPath id="bar"><rect x="25" y="50" width="${barW}" height="8" rx="4"/></clipPath>`,
      langs.length ? `<g clip-path="url(#bar)">${segments.join("")}</g>` : "",
      ...legend,
      empty,
    ].join("\n"),
  );
}

export function messageCard(message: string, o: CardOptions) {
  return shell(
    495,
    80,
    o,
    message,
    `<text x="247.5" y="45" text-anchor="middle" font-size="14" font-weight="600" fill="${o.theme.muted}">${esc(message)}</text>`,
  );
}

export const cards = {
  streak: streakCard,
  stats: statsCard,
  graph: graphCard,
  languages: languagesCard,
};
export type CardName = keyof typeof cards;
