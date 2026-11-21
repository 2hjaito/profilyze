// Duolingo streak card in two looks: white with a flame, or orange with the owl.
// Pure SVG; Inter is injected by embedCardFonts.

import { escapeXml as esc } from "../banner/render";

export type DuolingoTheme = "mascot" | "light" | "orange";
export const duolingoThemes: Record<DuolingoTheme, { label: string; desc: string }> = {
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

// Line-art owl, scaled from a 48-unit box. Drawn in the sun-yellow of the card's glow.
const owl = (c: string) =>
  `<g fill="none" stroke="${c}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">` +
  `<path d="M13.06 22.11c-.329 0-.654.064-.958.188a2.124 2.124 0 0 1-1.59 3.166v2.288a2.547 2.547 0 0 0 5.095 0v-3.095a2.547 2.547 0 0 0-2.547-2.547m21.805 0c-.329 0-.654.064-.959.188a2.124 2.124 0 0 1-1.588 3.166v2.288a2.547 2.547 0 0 0 5.094 0v-3.095a2.547 2.547 0 0 0-2.547-2.547"/>` +
  `<path d="M5.6 17.86a8.76 8.76 0 0 0-2.1 5.7v5.19a8.826 8.826 0 0 0 13.2 7.67a8.784 8.784 0 0 0 3.22-3.16M5.87 15.75c.23-1.41.73-2.65 1.61-2.65c.56 0 1.09.35 1.52.75m.98-1.86c.19-.86.62-1.57 1.53-1.57c3.33 0 5.09 8.96 12.49 8.96c2.2 0 3.9-.79 5.29-1.91m1.84-1.79c2.13-2.47 3.5-5.26 5.36-5.26c2.24 0 1.58 4.26 1.53 4.61"/>` +
  `<path d="M38.01 15.05s0-.01.01-.02c.14-.22 1.27-1.93 2.5-1.93c.65 0 1.09.67 1.37 1.59c.28.91.4 2.07.4 3.03a8.79 8.79 0 0 1 2.21 5.84v5.19c0 2.44-.99 4.65-2.58 6.25a8.846 8.846 0 0 1-6.25 2.58c-3.12 0-6-1.64-7.59-4.32"/>` +
  `<path d="m24 33.833l4.9-.694a4.504 4.504 0 0 0-4.9-4.222a4.504 4.504 0 0 0-4.9 4.222z"/>` +
  `<path d="M27.578 33.326a3.582 3.582 0 1 1-7.156 0m-4.564-13.219c.063-2.61-1.251-4.87-2.13-5.41s-1.49 1.166-1.49 1.166s-1.356-4.569-4.724-5.326c1.404 1.388 2.663 6.975.856 7.546s-1.224-2.696-2.504-2.334S7.08 23.56 7.08 23.56m30.872-4.03c-.583-2.2-2.531-4.963-3.527-3.818c-.645.741.38 1.609-.304 2.139c-1.803-1.247-4.14-3.557-5.085-2.354c-1.197 1.522 1.842 1.53.847 8.132m.256-12.423c-.833-.29-1.402-.28-2.997-1.46c.263 1.727.923 2.78 2.096 3.357c.704.346 1.433.12 1.712-.504c.325-.7-.064-1.135-.811-1.393"/>` +
  `<path d="m15.9 32.29l-8.22-1.81C7.25 29.69 7 28.77 7 27.8v-3.29c0-3.09 2.5-5.59 5.59-5.59s5.6 2.5 5.6 5.59v3.29c0 1.85-.9 3.49-2.29 4.49m24.41-1.8L32.1 32.3c-.23-.16-.45-.35-.65-.55a5.579 5.579 0 0 1-1.64-3.95v-3.29c0-3.09 2.51-5.59 5.6-5.59S41 21.42 41 24.51v3.29c0 .98-.25 1.89-.69 2.69"/>` +
  `</g>`;

export type DuolingoLang = "en" | "vi";
const MESSAGES = {
  en: { done: "You practiced today. Nice!", todo: "Come back soon!" },
  vi: { done: "Hôm nay bạn đã học rồi!", todo: "Nhớ trở lại sớm nhé!" },
};

/** The line-art owl, centred on x=200 and standing on the bottom edge: bright green when practiced, dim with a worried drop when not. */
function mascot(practiced: boolean) {
  const color = practiced ? "#89e219" : "#a79bc9";
  const drop = practiced ? "" : `<path d="M40 7c1.6 2.4 2.6 3.7 2.6 5a2.6 2.6 0 0 1-5.2 0c0-1.3 1-2.6 2.6-5z" fill="#6cc0ff"/>`;
  return (
    `<circle cx="200" cy="205" r="62" fill="${color}" fill-opacity=".12"/>` +
    `<g transform="translate(118 119) scale(3.4)">${owl(color)}${drop}</g>`
  );
}

const sparkle = (x: number, y: number, r: number, c: string) =>
  `<path d="M${x} ${y - r}L${x + r} ${y}L${x} ${y + r}L${x - r} ${y}Z" fill="${c}"/>`;

function mascotCard(streak: number, practiced: boolean, lang: DuolingoLang) {
  const W = 400;
  const H = 280;
  const size = String(streak).length > 3 ? 40 : 46;
  const numW = String(streak).length * size * 0.6;
  const x0 = (W - (30 + 8 + numW)) / 2;
  const color = practiced ? "#ff9600" : "#ff4b4b";
  const msg = MESSAGES[lang][practiced ? "done" : "todo"];
  const aria = `${streak} day Duolingo streak, ${practiced ? "practiced today" : "not practiced yet today"}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(aria)}" ${FONT}>
<title>${esc(aria)}</title>
<style></style>
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5b2bb8"/><stop offset="1" stop-color="#3a1580"/></linearGradient>
<linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<clipPath id="c"><rect width="${W}" height="${H}" rx="22"/></clipPath>
</defs>
<g clip-path="url(#c)">
<rect width="${W}" height="${H}" fill="url(#bg)"/>
<path d="M150 0H250L340 ${H}H60Z" fill="url(#beam)"/>
${sparkle(78, 176, 9, "#4aa8ff")}${sparkle(98, 222, 6, "#c77dff")}${sparkle(314, 168, 6, "#ffd24a")}${sparkle(332, 204, 11, "#ff6ad5")}${sparkle(300, 244, 5, "#4aa8ff")}
${mascot(practiced)}
</g>
<g transform="translate(${x0.toFixed(1)} 26) scale(.3)">${flame.replace(/#ff9600/g, color).replace(/#ffc800/g, practiced ? "#ffc800" : "#ffb3b3")}</g>
<text x="${(x0 + 38).toFixed(1)}" y="${26 + size * 0.78}" font-size="${size}" font-weight="700" fill="${color}">${streak}</text>
<text x="${W / 2}" y="${26 + size + 36}" text-anchor="middle" font-size="22" font-weight="500" fill="#e4d9ff">${esc(msg)}</text>
</svg>`;
}

export function duolingoCard(streak: number, theme: DuolingoTheme, practiced = true, lang: DuolingoLang = "en") {
  if (theme === "mascot") return mascotCard(streak, practiced, lang);
  const light = theme === "light";
  const bg = light ? "#ffffff" : "#ff9600";
  const text = light ? "#ff9600" : "#ffffff";
  const edge = light ? "#ff9600" : "#e08400";
  const digits = String(streak).length;
  const size = digits <= 2 ? 80 : digits === 3 ? 72 : digits === 4 ? 58 : 46;
  const art = light
    ? `<g transform="translate(176 26) scale(1.15)">${flame}</g>`
    : `<circle cx="246" cy="150" r="74" fill="none" stroke="#ffc800" stroke-opacity=".35" stroke-width="3"/>` +
      `<circle cx="246" cy="150" r="56" fill="#ffc800" fill-opacity=".22"/>` +
      `<g transform="translate(186 100) scale(2.6)">${owl("#ffd900")}</g>`;
  const aria = `${streak} day language learning streak on Duolingo`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}" role="img" aria-label="${esc(aria)}" ${FONT}>
<title>${esc(aria)}</title>
<style></style>
<clipPath id="c"><rect width="${S}" height="${S}" rx="20"/></clipPath>
<g clip-path="url(#c)">
<rect width="${S}" height="${S}" fill="${bg}"/>
${art}
</g>
${light ? `<rect x=".5" y=".5" width="${S - 1}" height="${S - 1}" rx="20" fill="none" stroke="#e5e5e5"/>` : ""}
<text x="28" y="84" font-size="22" font-weight="700" fill="${text}">I’m on a</text>
<text x="28" y="${84 + size * 0.95}" font-size="${size}" font-weight="700" fill="#ffffff" stroke="${edge}" stroke-width="${Math.round(size / 7)}" stroke-linejoin="round" paint-order="stroke">${streak}</text>
<text x="28" y="${84 + size * 0.95 + 44}" font-size="22" font-weight="700" fill="${text}">day language</text>
<text x="28" y="${84 + size * 0.95 + 70}" font-size="22" font-weight="700" fill="${text}">learning streak!</text>
<text x="28" y="${S - 28}" font-size="26" font-weight="700" letter-spacing="-.5" fill="${LOGO[theme]}">duolingo</text>
</svg>`;
}
