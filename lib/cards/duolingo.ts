// Duolingo streak card in two looks: white with a flame, or orange with the owl.
// Pure SVG; Inter is injected by embedCardFonts.

import { escapeXml as esc } from "../banner/render";
import { LAVA_JPEG } from "./duolingo-lava";

export type DuolingoTheme = "mascot" | "lava" | "light" | "orange";
export const duolingoThemes: Record<DuolingoTheme, { label: string; desc: string }> = {
  lava: { label: "Lava", desc: "The owl hopping across lava stones, with your streak on the stone it stands on." },
  mascot: { label: "Mascot", desc: "Purple card; the owl cheers or worries depending on whether you practiced today." },
  light: { label: "Flame", desc: "White card with an orange flame." },
  orange: { label: "Owl", desc: "Orange card with the owl." },
};
export const isDuolingoTheme = (s: string | null): s is DuolingoTheme => !!s && s in duolingoThemes;

const S = 320;
const FONT = `font-family="Inter, -apple-system, 'Segoe UI', sans-serif"`;

const LOGO = {
  light: "#58cc02",
  orange: "#ffc800",
};

const flame = `<path d="M54 2C62 24 98 42 98 80c0 24-20 38-46 38S6 104 6 80c0-20 12-31 22-42 2 12 6 20 14 20 6-14 4-38 12-56z" fill="#ff9600"/>` +
  `<path d="M52 64c8 12 18 20 18 32 0 10-8 18-18 18s-18-8-18-18c0-12 10-20 18-32z" fill="#ffc800"/>` +
  `<path d="M16 10c4 6 8 10 8 15a8 8 0 0 1-16 0c0-5 4-9 8-15z" fill="#ff9600"/>`;

export type DuolingoLang = "en" | "vi";
/** What the card shows: the username label, the streak number, the message, and the picture. */
export type DuolingoShow = { name?: string; streak: boolean; message: boolean; art: boolean };
export const DEFAULT_SHOW: DuolingoShow = { streak: true, message: true, art: true };
const label = (name: string) => `@${name.length > 24 ? `${name.slice(0, 23)}…` : name}`;

/** How the mascot feels: done today, not yet, evening and still nothing (urgent), or no streak left (lost). */
export type DuolingoState = "done" | "todo" | "urgent" | "lost";
export const duolingoStates: DuolingoState[] = ["done", "todo", "urgent", "lost"];
export const isDuolingoState = (s: string | null): s is DuolingoState => !!s && (duolingoStates as string[]).includes(s);

/** Picks the state from the data; `hour` is the viewer's local hour (18+ counts as evening). */
export function stateFor(streak: number, practiced: boolean, hour: number): DuolingoState {
  if (streak <= 0) return "lost";
  if (practiced) return "done";
  return hour >= 18 ? "urgent" : "todo";
}

const MESSAGES = {
  en: { done: "You practiced today. Nice!", todo: "Come back soon!", urgent: "Don’t let it break!", lost: "Time to practice!" },
  vi: { done: "Hôm nay bạn đã học rồi!", todo: "Nhớ trở lại sớm nhé!", urgent: "Đừng để chuỗi bị đứt!", lost: "Đến lúc học rồi!" },
};

type Look = { bg: [string, string]; num: string; edge?: string; msg: string; flame: [string, string] };
const LOOKS: Record<DuolingoState, Look> = {
  done: { bg: ["#ff7a2e", "#ffa43c"], num: "#ffffff", edge: "#d9560a", msg: "#ffffff", flame: ["#ffffff", "#ffc800"] },
  todo: { bg: ["#5b2bb8", "#3a1580"], num: "#ff4b4b", msg: "#e4d9ff", flame: ["#ff4b4b", "#ffb3b3"] },
  urgent: { bg: ["#1f63b4", "#154a8e"], num: "#cfe3ff", msg: "#cfe3ff", flame: ["#a9cdff", "#6fa6ec"] },
  lost: { bg: ["#43225f", "#321849"], num: "#c9a7ff", msg: "#c9a7ff", flame: ["#c9a7ff", "#e9dcff"] },
};

/** Duo-style owl on a lava stone (or in a puddle when the streak is lost), centred on x=205. */
function mascot(state: DuolingoState) {
  const happy = state === "done";
  const cry = state === "urgent";
  const lost = state === "lost";
  const pupil = happy ? [4, 0] : cry ? [3, 2] : [-1, -5];
  const pupilColor = cry || lost ? "#4a2a7a" : "#5a3a1e";
  const eye = (cx: number) =>
    `<circle cx="${cx}" cy="190" r="19.5" fill="${cry ? "#f4fbff" : "#f3e6c4"}"/>` +
    `<circle cx="${cx + pupil[0]}" cy="${190 + pupil[1]}" r="${cry ? 13 : 12}" fill="${pupilColor}"/>` +
    `<circle cx="${cx + pupil[0] + 4}" cy="${190 + pupil[1] - 4}" r="3.6" fill="#fff" fill-opacity=".9"/>` +
    (cry ? `<path d="M${cx - 9} 208c5 5 8 9 8 13a8 8 0 0 1-16 0c0-4 3-8 8-13z" fill="#e6f6ff"/>` : "");
  const body =
    `<path d="M150 192C146 152 160 138 188 138c17 0 26 8 38 6 20-4 32 16 30 52-1 40-10 66-51 68-37 2-53-24-55-72z" fill="url(#owl)"/>` +
    `<path d="M168 150l7-15 10 12zM228 146l10-13 6 17z" fill="#8fbd1c"/>` +
    `<ellipse cx="205" cy="192" rx="49" ry="38" fill="#6a9a1a" fill-opacity=".45"/>`;
  const beak = cry
    ? `<path d="M197 208q8-4 16 0-3 8-8 7-5 1-8-7z" fill="#ffa31a"/>`
    : `<path d="M197 205q8-6 16 0-2 10-8 12-6-2-8-12z" fill="#ffa31a"/>`;
  const belly = `<path d="M178 236q8 6 16 0zM216 236q8 6 16 0zM197 247q8 6 16 0z" fill="#a6d04a"/>`;
  const arm = `<path d="M164 224Q172 250 204 254" fill="none" stroke="#4a7a10" stroke-width="3" stroke-linecap="round"/>`;
  const feet = `<ellipse cx="182" cy="268" rx="12" ry="7" fill="#ff9a1a"/><ellipse cx="232" cy="268" rx="12" ry="7" fill="#ff9a1a"/>`;
  if (lost) {
    // Melted into a puddle: the owl lies on its side, eyes wide and empty.
    const o = (cx: number) => `<ellipse cx="${cx}" cy="190" rx="14" ry="19" fill="#f4fbff"/><ellipse cx="${cx}" cy="193" rx="8" ry="12" fill="#4a2a7a"/>`;
    return (
      `<ellipse cx="205" cy="268" rx="120" ry="26" fill="#b99cf2"/><ellipse cx="205" cy="262" rx="96" ry="18" fill="#c9b0f7"/>` +
      `<g transform="translate(205 228) rotate(-65) scale(.85) translate(-205 -200)">${feet}${body}${o(183)}${o(227)}<ellipse cx="205" cy="222" rx="8" ry="11" fill="#5a2a1a"/></g>` +
      `<path d="M262 238c3 5 5 8 5 10a5 5 0 0 1-10 0c0-2 2-5 5-10z" fill="#e6d8ff"/>`
    );
  }
  const stand = happy
    ? `<ellipse cx="205" cy="276" rx="84" ry="18" fill="#4a2f2d"/><ellipse cx="205" cy="270" rx="78" ry="13" fill="#5f3d3a"/>`
    : cry
      ? `<ellipse cx="205" cy="276" rx="84" ry="18" fill="#12386a"/><ellipse cx="205" cy="270" rx="78" ry="13" fill="#1c4d8c"/>`
      : `<ellipse cx="205" cy="276" rx="84" ry="18" fill="#4a2f2d"/><ellipse cx="205" cy="270" rx="78" ry="13" fill="#5f3d3a"/>`;
  const drop = state === "todo"
    ? `<path d="M262 142c5 7 8 11 8 15a8 8 0 0 1-16 0c0-4 3-8 8-15z" fill="#bfe6ff"/><path d="M276 168c3 4 5 6 5 9a5 5 0 0 1-10 0c0-3 2-5 5-9z" fill="#bfe6ff"/>`
    : "";
  return stand + feet + body + eye(183) + eye(227) + beak + belly + arm + drop;
}

const sparkle = (x: number, y: number, r: number, c: string) =>
  `<path d="M${x} ${y - r}L${x + r} ${y}L${x} ${y + r}L${x - r} ${y}Z" fill="${c}"/>`;
const lavaDrop = (x: number, y: number, w: number) =>
  `<path d="M${x} ${y}C${x + w * 0.2} ${y + w * 0.7} ${x + w * 0.5} ${y + w * 0.9} ${x + w * 0.5} ${y + w * 1.3}a${w * 0.5} ${w * 0.5} 0 0 1-${w} 0c0-${w * 0.4} ${w * 0.3}-${w * 0.6} ${w * 0.5}-${w * 1.3}z" fill="#ffd36a" fill-opacity=".38"/>`;

function mascotCard(streak: number, state: DuolingoState, lang: DuolingoLang, show: DuolingoShow) {
  const W = 400;
  const H = 280;
  const L = LOOKS[state];
  const size = String(streak).length > 3 ? 40 : 46;
  const numW = String(streak).length * size * 0.6;
  const x0 = (W - (30 + 8 + numW)) / 2;
  const msg = MESSAGES[lang][state];
  const aria = `${streak} day Duolingo streak, ${state === "done" ? "practiced today" : "not practiced yet today"}`;
  const scene = {
    done:
      lavaDrop(40, 150, 60) + lavaDrop(120, 200, 34) + lavaDrop(300, 130, 70) + lavaDrop(352, 210, 40) +
      sparkle(76, 120, 4, "#ffe08a") + sparkle(334, 108, 3, "#ffe08a") + sparkle(96, 236, 3, "#ffe08a"),
    todo:
      `<path d="M150 0H250L340 ${H}H60Z" fill="url(#beam)"/>` +
      sparkle(78, 176, 9, "#4aa8ff") + sparkle(98, 222, 6, "#c77dff") + sparkle(314, 168, 6, "#ffd24a") + sparkle(332, 204, 11, "#ff6ad5"),
    urgent: sparkle(70, 190, 5, "#8fc2ff") + sparkle(340, 176, 4, "#8fc2ff") + sparkle(320, 230, 3, "#8fc2ff"),
    lost: "",
  }[state];
  // Stack what's switched on from the top: name, flame + number, message.
  let y = 22;
  let top = "";
  if (show.name) {
    top += `<text x="${W / 2}" y="${y + 16}" text-anchor="middle" font-size="17" font-weight="600" fill="${L.msg}" fill-opacity=".9">${esc(label(show.name))}</text>`;
    y += 32;
  }
  if (show.streak) {
    const badge =
      state === "urgent"
        ? `<circle cx="${(x0 + 26).toFixed(1)}" cy="${y + 28}" r="9" fill="#ff4b4b" stroke="#fff" stroke-width="2"/><text x="${(x0 + 26).toFixed(1)}" y="${y + 33}" text-anchor="middle" font-size="13" font-weight="700" fill="#fff">!</text>`
        : "";
    top +=
      `<g transform="translate(${x0.toFixed(1)} ${y}) scale(.3)">${flame.replace(/#ff9600/g, L.flame[0]).replace(/#ffc800/g, L.flame[1])}</g>${badge}` +
      `<text x="${(x0 + 38).toFixed(1)}" y="${y + size * 0.78}" font-size="${size}" font-weight="700" fill="${L.num}"${L.edge ? ` stroke="${L.edge}" stroke-width="6" stroke-linejoin="round" paint-order="stroke"` : ""}>${streak}</text>`;
    y += size + 12;
  }
  if (show.message) top += `<text x="${W / 2}" y="${y + 22}" text-anchor="middle" font-size="22" font-weight="600" fill="${L.msg}">${esc(msg)}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(aria)}" ${FONT}>
<title>${esc(aria)}</title>
<style></style>
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${L.bg[0]}"/><stop offset="1" stop-color="${L.bg[1]}"/></linearGradient>
<linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<linearGradient id="owl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d6e61a"/><stop offset=".14" stop-color="#a3c81c"/><stop offset="1" stop-color="#7cae1c"/></linearGradient>
<clipPath id="c"><rect width="${W}" height="${H}" rx="22"/></clipPath>
</defs>
<g clip-path="url(#c)">
<rect width="${W}" height="${H}" fill="url(#bg)"/>
${scene}
${show.art ? mascot(state) : ""}
</g>
${top}
</svg>`;
}

/** The lava scene with the streak painted on the stone the owl stands on. */
function lavaCard(streak: number, show: DuolingoShow) {
  const W = 900;
  const H = 600;
  const digits = String(streak).length;
  const size = digits <= 2 ? 72 : digits === 3 ? 62 : digits === 4 ? 50 : 40;
  const aria = `${streak} day Duolingo streak`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="450" height="300" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(aria)}" ${FONT}>
<title>${esc(aria)}</title>
<style></style>
<clipPath id="c"><rect width="${W}" height="${H}" rx="44"/></clipPath>
<g clip-path="url(#c)">
<rect width="${W}" height="${H}" fill="#ff6a35"/>
${show.art ? `<image href="${LAVA_JPEG}" width="${W}" height="${H}"/>` : ""}
</g>
${show.name ? `<text x="44" y="84" font-size="40" font-weight="700" fill="#ffffff">${esc(label(show.name))}</text>` : ""}
${show.streak ? `<text x="318" y="${330 + size * 0.2}" text-anchor="middle" font-size="${size}" font-weight="700" fill="#ffffff" stroke="#4a2f2d" stroke-width="10" stroke-linejoin="round" paint-order="stroke">${streak}</text>` : ""}
</svg>`;
}

export function duolingoCard(streak: number, theme: DuolingoTheme, state: DuolingoState = "done", lang: DuolingoLang = "en", show: DuolingoShow = DEFAULT_SHOW) {
  if (theme === "mascot") return mascotCard(streak, state, lang, show);
  if (theme === "lava") return lavaCard(streak, show);
  const light = theme === "light";
  const bg = light ? "#ffffff" : "#ff9600";
  const text = light ? "#ff9600" : "#ffffff";
  const edge = light ? "#ff9600" : "#e08400";
  const digits = String(streak).length;
  const size = digits <= 2 ? 80 : digits === 3 ? 72 : digits === 4 ? 58 : 46;
  const art = light
    ? `<g transform="translate(176 26) scale(1.15)">${flame}</g>`
    : `<circle cx="262" cy="248" r="66" fill="none" stroke="#ffc800" stroke-opacity=".35" stroke-width="3"/>` +
      `<circle cx="262" cy="248" r="48" fill="#ffc800" fill-opacity=".22"/>` +
      `<g transform="translate(118 103) scale(.7)">${mascot("done")}</g>`;
  const aria = `${streak} day language learning streak on Duolingo`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}" role="img" aria-label="${esc(aria)}" ${FONT}>
<title>${esc(aria)}</title>
<style></style>
<defs><linearGradient id="owl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d6e61a"/><stop offset=".14" stop-color="#a3c81c"/><stop offset="1" stop-color="#7cae1c"/></linearGradient></defs>
<clipPath id="c"><rect width="${S}" height="${S}" rx="20"/></clipPath>
<g clip-path="url(#c)">
<rect width="${S}" height="${S}" fill="${bg}"/>
${show.art ? art : ""}
</g>
${light ? `<rect x=".5" y=".5" width="${S - 1}" height="${S - 1}" rx="20" fill="none" stroke="#e5e5e5"/>` : ""}
${show.name ? `<text x="28" y="46" font-size="18" font-weight="700" fill="${text}">${esc(label(show.name))}</text>` : ""}
${show.streak ? `<text x="28" y="84" font-size="22" font-weight="700" fill="${text}">I’m on a</text>
<text x="28" y="${84 + size * 0.95}" font-size="${size}" font-weight="700" fill="#ffffff" stroke="${edge}" stroke-width="${Math.round(size / 7)}" stroke-linejoin="round" paint-order="stroke">${streak}</text>` : ""}
${show.message ? `<text x="28" y="${show.streak ? 84 + size * 0.95 + 44 : 130}" font-size="22" font-weight="700" fill="${text}">day language</text>
<text x="28" y="${show.streak ? 84 + size * 0.95 + 70 : 156}" font-size="22" font-weight="700" fill="${text}">learning streak!</text>` : ""}
<text x="28" y="${S - 28}" font-size="26" font-weight="700" letter-spacing="-.5" fill="${LOGO[theme]}">duolingo</text>
</svg>`;
}
