// Player card: a retro game "character select" for a profile. Identity on the left (a big two-tone
// name, a dithered portrait, role, focus, bio, status); a HUD on the right (level and XP from
// contributions, a night skyline, stats, skill bars). Always dark, like an arcade screen.
// Light animation only: twinkling stars and windows, a blinking caret, bars that fill on load and
// a glitch on the name now and then. All of it stops for prefers-reduced-motion.

import { esc, fit, measure, r1, wrap, type FontKey } from "./kit";

export type PlayerOpts = {
  name: string;
  role: string;
  focus: string;
  bio: string;
  status: string;
  note: string;
  prompt: string;
  build: string;
  motto: string;
  footer: string;
  /** Dithered portrait as a data URI. */
  portrait?: string;
  level: number;
  /** 0–1 progress to the next level. */
  xp: number;
  xpText: string;
  stats: { label: string; value: string }[];
  skills: { label: string; value: number }[];
  accent: string;
  alert: string;
  seed: number;
};

const C = {
  bg: "#0b0a10",
  panel: "#0f0e16",
  line: "#2a2838",
  text: "#e8e6f4",
  dim: "#7d7b92",
  track: "#1c1a28",
  building: "#14121d",
  warm: "#f2c9a0",
};

const W = 1000;
const H = 540;
const MONO = "'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";

type T = { size: number; fill?: string; bold?: boolean; track?: number; anchor?: "start" | "middle" | "end"; cls?: string; opacity?: number };

function text(x: number, y: number, s: string, o: T) {
  const attrs = [
    `x="${r1(x)}" y="${r1(y)}"`,
    `font-size="${o.size}"`,
    `fill="${o.fill ?? C.text}"`,
    o.bold ? `font-weight="700"` : "",
    o.track ? `letter-spacing="${r1(o.track * o.size * 100) / 100}"` : "",
    o.anchor && o.anchor !== "start" ? `text-anchor="${o.anchor}"` : "",
    o.cls ? `class="${o.cls}"` : "",
    o.opacity !== undefined ? `opacity="${o.opacity}"` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return `<text ${attrs}>${esc(s)}</text>`;
}

const font = (bold?: boolean): FontKey => (bold ? "mono-700" : "mono");
const width = (s: string, size: number, track = 0) => measure(s, "mono", size, track * size);

/** Deterministic pseudo-random numbers, so a card looks the same on every load. */
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

export function playerCard(o: PlayerOpts): string {
  const out: string[] = [];
  const rand = rng(o.seed);
  const A = o.accent;

  // ---- frame and top bar ----
  out.push(
    `<rect width="${W}" height="${H}" fill="${C.bg}"/>`,
    `<rect x="6.5" y="6.5" width="${W - 13}" height="${H - 13}" fill="none" stroke="${C.text}" stroke-opacity=".55"/>`,
  );
  const prompt = fit(o.prompt, "mono", 12, 560, 1.4);
  out.push(text(24, 32, prompt, { size: 12, fill: C.text, track: 0.12, opacity: 0.85 }));
  out.push(`<rect x="${r1(24 + width(prompt, 12, 0.12) + 4)}" y="22" width="8" height="13" fill="${A}" class="caret"/>`);
  out.push(text(W - 24, 32, fit(o.build, "mono", 12, 360, 1.4), { size: 12, fill: C.text, track: 0.12, anchor: "end", opacity: 0.85 }));
  out.push(`<line x1="20" y1="46.5" x2="${W - 20}" y2="46.5" stroke="${C.line}"/>`);

  // ---- left: identity ----
  const LX = 20;
  const LY = 58;
  const LW = 340;
  const LH = H - 58 - 54;
  out.push(`<rect x="${LX + 0.5}" y="${LY + 0.5}" width="${LW}" height="${LH}" fill="${C.panel}" stroke="${C.line}"/>`);
  const px = LX + 16;
  if (o.role) out.push(text(px, LY + 24, fit(`ROLE: ${o.role.toUpperCase()}`, "mono", 10.5, LW - 32, 2.1), { size: 10.5, fill: C.dim, track: 0.2 }));

  // portrait with corner brackets
  const PS = 96;
  const ppx = LX + LW - 16 - PS;
  const ppy = LY + 46;
  out.push(`<rect x="${ppx - 4.5}" y="${ppy - 4.5}" width="${PS + 9}" height="${PS + 9}" fill="none" stroke="${A}" stroke-opacity=".9"/>`);
  if (o.portrait)
    out.push(`<image href="${o.portrait}" x="${ppx}" y="${ppy}" width="${PS}" height="${PS}" style="image-rendering:pixelated" preserveAspectRatio="xMidYMid slice"/>`);
  else out.push(text(ppx + PS / 2, ppy + PS / 2 + 14, [...o.name][0]?.toUpperCase() ?? "?", { size: 44, bold: true, fill: A, anchor: "middle" }));
  const br = (x: number, y: number, dx: number, dy: number) =>
    `<path d="M${x} ${y + dy * 12}V${y}H${x + dx * 12}" fill="none" stroke="${A}" stroke-width="1.5"/>`;
  out.push(br(ppx - 10, ppy - 10, 1, 1), br(ppx + PS + 10, ppy + PS + 10, -1, -1));
  out.push(text(ppx + PS + 4, ppy + PS + 24, `ID // P1 // LV.${o.level}`, { size: 9, fill: C.dim, track: 0.2, anchor: "end" }));

  // name: first word in ink, the rest in the accent
  const words = o.name.trim().toUpperCase().split(/\s+/).filter(Boolean);
  const first = words[0] ?? "PLAYER";
  const rest = words.slice(1).join(" ");
  const nameW = ppx - 16 - px;
  let size = 62;
  while (size > 26 && Math.max(width(first, size, -0.02), width(rest, size, -0.02)) > nameW) size -= 2;
  const y1 = LY + 46 + size * 0.78;
  const y2 = y1 + size * 0.92;
  out.push(text(px, y1, fit(first, "mono-700", size, nameW, -0.02 * size), { size, bold: true, track: -0.02 }));
  if (rest) {
    const line2 = fit(rest, "mono-700", size, nameW, -0.02 * size);
    out.push(
      text(px + 3, y2, line2, { size, bold: true, track: -0.02, fill: o.alert, cls: "glitch" }),
      text(px, y2, line2, { size, bold: true, track: -0.02, fill: A }),
    );
  }

  let y = Math.max(rest ? y2 : y1, ppy + PS + 24) + 34;
  if (o.focus) {
    out.push(`<rect x="${px}" y="${y - 9}" width="8" height="8" fill="${A}"/>`);
    out.push(text(px + 16, y, fit(o.focus.toUpperCase(), "mono-700", 12, LW - 48, 1.4), { size: 12, bold: true, fill: A, track: 0.12 }));
    y += 32;
  }
  if (o.bio) {
    const lines = wrap(o.bio, font(), 13.5, LW - 32, 4);
    lines.forEach((l, i) => out.push(text(px, y + i * 21, l, { size: 13.5 })));
    y += lines.length * 21;
  }

  // skill bars, as many as fit above the status badge
  const bottom = LY + LH - (o.status ? 54 : 18);
  const skillTop = Math.max(y + 10, LY + 250);
  const fits = Math.max(0, Math.floor((bottom - skillTop - 14) / 22));
  const skills = o.skills.slice(0, Math.min(4, fits));
  if (skills.length) {
    out.push(`<line x1="${px}" y1="${skillTop - 10.5}" x2="${LX + LW - 16}" y2="${skillTop - 10.5}" stroke="${C.line}"/>`);
    out.push(text(px, skillTop + 6, "SKILL XP", { size: 9.5, fill: C.dim, track: 0.2 }));
    const labelW = 118;
    const barX = px + labelW;
    const barW = LW - 32 - labelW - 30;
    skills.forEach((sk, i) => {
      const yy = skillTop + 28 + i * 22;
      const v = Math.max(0, Math.min(100, sk.value));
      out.push(
        text(px, yy, fit(sk.label.toUpperCase(), "mono-700", 11, labelW - 10, 1.3), { size: 11, bold: true, track: 0.12 }),
        `<rect x="${barX}" y="${yy - 9}" width="${barW}" height="9" fill="${C.track}" stroke="${C.line}"/>`,
        `<rect x="${barX}" y="${yy - 9}" width="${r1(Math.max(2, (barW * v) / 100))}" height="9" fill="${A}" class="grow" style="animation-delay:${0.5 + i * 0.15}s"/>`,
        text(barX + barW + 28, yy, String(Math.round(v)), { size: 11, fill: C.dim, anchor: "end" }),
      );
    });
  }

  // status badge at the bottom of the panel
  if (o.status) {
    const by = LY + LH - 38;
    const label = fit(o.status.toUpperCase(), "mono-700", 12, 200, 1.2);
    const bw = width(label, 12, 0.1) + 44;
    out.push(
      `<rect x="${px}" y="${by}" width="${r1(bw)}" height="26" fill="${C.text}"/>`,
      `<circle cx="${px + 15}" cy="${by + 13}" r="4.5" fill="${A}" class="pulse"/>`,
      text(px + 28, by + 17.5, label, { size: 12, bold: true, fill: C.bg, track: 0.1 }),
    );
    if (o.note) out.push(text(px + bw + 12, by + 17.5, fit(o.note.toUpperCase(), "mono", 10, LW - 32 - bw - 12, 1.5), { size: 10, fill: C.dim, track: 0.15 }));
  }

  // ---- right: HUD ----
  const RX = LX + LW + 16;
  const RW = W - 20 - RX;
  out.push(`<rect x="${RX + 0.5}" y="${LY + 0.5}" width="${RW}" height="${LH}" fill="${C.panel}" stroke="${C.line}"/>`);
  const hx = RX + 18;
  out.push(
    `<rect x="${hx}" y="${LY + 16}" width="30" height="22" fill="none" stroke="${A}"/>`,
    text(hx + 15, LY + 31.5, "P1", { size: 11, bold: true, fill: A, anchor: "middle" }),
    text(hx + 42, LY + 32, fit(first + (rest ? ` ${rest}` : ""), "mono-700", 15, RW - 200, 1.5), { size: 15, bold: true, track: 0.1 }),
    text(RX + RW - 18, LY + 34, `LV.${o.level}`, { size: 22, bold: true, fill: A, anchor: "end" }),
  );
  // XP bar, slanted at both ends
  const bx = hx;
  const bw = RW - 36;
  const byy = LY + 50;
  const slant = (x: number, w: number) => `M${r1(x + 8)} ${byy}H${r1(x + w)}L${r1(x + w - 8)} ${byy + 14}H${r1(x)}Z`;
  out.push(
    `<path d="${slant(bx, bw)}" fill="${C.track}"/>`,
    `<path d="${slant(bx, Math.max(16, bw * o.xp))}" fill="${A}" class="grow"/>`,
    text(bx, byy + 32, fit(o.xpText.toUpperCase(), "mono", 10.5, bw, 1.6), { size: 10.5, fill: A, track: 0.16, opacity: 0.85 }),
  );

  // night skyline
  const sy = LY + 100;
  const sh = 150;
  out.push(`<clipPath id="scene"><rect x="${RX + 1}" y="${sy}" width="${RW - 1}" height="${sh}"/></clipPath>`, `<g clip-path="url(#scene)">`);
  for (let i = 0; i < 46; i++) {
    const x = RX + rand() * RW;
    const yy = sy + rand() * sh * 0.62;
    const r = rand() < 0.15 ? 1.4 : 0.8;
    out.push(`<circle cx="${r1(x)}" cy="${r1(yy)}" r="${r}" fill="${C.text}" class="tw${1 + Math.floor(rand() * 3)}"/>`);
  }
  const mx = RX + RW * 0.58;
  out.push(
    `<radialGradient id="moon" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#2a2740"/><stop offset="1" stop-color="${C.bg}"/></radialGradient>`,
    `<circle cx="${r1(mx)}" cy="${sy + sh - 4}" r="${sh * 0.62}" fill="url(#moon)" stroke="${C.line}"/>`,
  );
  let bxx = RX + 2;
  while (bxx < RX + RW) {
    const w = 26 + Math.floor(rand() * 34);
    const h = 30 + Math.floor(rand() * (sh * 0.62));
    const top = sy + sh - h;
    out.push(`<rect x="${bxx}" y="${top}" width="${w}" height="${h}" fill="${C.building}" stroke="${C.line}"/>`);
    for (let wy = top + 8; wy < sy + sh - 8; wy += 11) {
      for (let wx = bxx + 6; wx < bxx + w - 6; wx += 10) {
        const k = rand();
        if (k > 0.86) {
          const fill = k > 0.97 ? o.alert : k > 0.93 ? C.warm : A;
          out.push(`<rect x="${wx}" y="${wy}" width="3" height="3" fill="${fill}" opacity=".85"${k > 0.95 ? ` class="tw${1 + Math.floor(rand() * 3)}"` : ""}/>`);
        }
      }
    }
    bxx += w + 2 + Math.floor(rand() * 8);
  }
  out.push(`</g>`, `<line x1="${RX + 1}" y1="${sy + sh + 0.5}" x2="${RX + RW}" y2="${sy + sh + 0.5}" stroke="${C.text}" stroke-opacity=".6"/>`);

  // stats: up to two rows of four
  const stats = o.stats.slice(0, 8);
  const perRow = 4;
  const cw = (RW - 36) / perRow;
  stats.forEach((st, i) => {
    const col = i % perRow;
    const x = hx + col * cw;
    const yy = sy + sh + 30 + Math.floor(i / perRow) * 64;
    if (col > 0) out.push(`<line x1="${r1(x - 10)}" y1="${yy - 10}" x2="${r1(x - 10)}" y2="${yy + 30}" stroke="${C.line}"/>`);
    out.push(
      text(x, yy, fit(st.label.toUpperCase(), "mono", 9.5, cw - 18, 1.7), { size: 9.5, fill: C.dim, track: 0.18 }),
      text(x, yy + 26, fit(st.value, "mono-700", 22, cw - 18), { size: 22, bold: true }),
    );
  });

  // ---- footer ----
  out.push(`<line x1="20" y1="${H - 40.5}" x2="${W - 20}" y2="${H - 40.5}" stroke="${C.line}"/>`);
  if (o.motto) out.push(text(24, H - 20, fit(o.motto.toUpperCase(), "mono", 10.5, 460, 2.1), { size: 10.5, fill: C.dim, track: 0.2 }));
  if (o.footer) out.push(text(W - 24, H - 20, fit(o.footer.toUpperCase(), "mono", 10.5, 460, 2.1), { size: 10.5, fill: C.dim, track: 0.2, anchor: "end" }));

  const title = [o.name, o.role].filter(Boolean).join(", ");
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}" font-family="${MONO}">`,
    `<title>${esc(title)}</title>`,
    // The route adds @font-face rules at the start of this block.
    `<style>
@keyframes tw{0%,60%{opacity:.85}61%,100%{opacity:.12}}
.tw1{animation:tw 1.7s linear infinite}.tw2{animation:tw 2.3s linear -.8s infinite}.tw3{animation:tw 3.1s linear -1.4s infinite}
@keyframes blink{0%,49%{opacity:1}50%,100%{opacity:0}}.caret{animation:blink 1.1s steps(1) infinite}
@keyframes grow{from{transform:scaleX(0)}}.grow{transform-box:fill-box;transform-origin:left;animation:grow 1.4s cubic-bezier(.2,.8,.2,1) .3s both}
@keyframes gl{0%,90%{opacity:0;transform:translateX(0)}91%,93%{opacity:.9;transform:translateX(-2px)}94%,96%{opacity:.9;transform:translateX(3px)}97%,100%{opacity:0}}.glitch{opacity:0;animation:gl 5s linear 1.5s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}.pulse{animation:pulse 1.6s ease-in-out infinite}
@media (prefers-reduced-motion:reduce){*{animation:none!important}.glitch{opacity:0}}
</style>`,
    ...out,
    `</svg>`,
  ].join("\n");
}
