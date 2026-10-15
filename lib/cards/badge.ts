// Shields-style badge with the Profilyze mark. Text widths are estimated for Inter at 11px.

const CELLS: [number, number, number][] = [
  [0, 0, 1], [1, 0, 0.85], [0, 1, 0.95], [2, 1, 0.7], [0, 2, 0.85], [1, 2, 0.65], [0, 3, 0.6],
];

const textWidth = (s: string, px = 11) =>
  [...s].reduce((w, ch) => w + (/[0-9]/.test(ch) ? 0.6 : /[A-Z]/.test(ch) ? 0.68 : /[ ,.]/.test(ch) ? 0.3 : 0.55) * px, 0);

export function usersBadge(label: string, value: string) {
  const h = 24;
  const logo = 26;
  const lw = Math.ceil(logo + textWidth(label) + 10);
  const vw = Math.ceil(textWidth(value, 11.5) + 18);
  const w = lw + vw;
  const mark = CELLS.map(
    ([c, r, o]) => `<rect x="${9 + c * 3.4}" y="${5 + r * 3.4}" width="2.8" height="2.8" rx=".7" fill="#83ebf1" fill-opacity="${o}"/>`,
  ).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}: ${value}">
<title>${label}: ${value}</title>
<style></style>
<clipPath id="r"><rect width="${w}" height="${h}" rx="6"/></clipPath>
<g clip-path="url(#r)"><rect width="${lw}" height="${h}" fill="#18181c"/><rect x="${lw}" width="${vw}" height="${h}" fill="#83ebf1"/></g>
${mark}
<g font-family="Inter, -apple-system, 'Segoe UI', sans-serif" font-size="11">
<text x="${logo}" y="15.5" fill="#ededef" font-weight="600">${label}</text>
<text x="${lw + vw / 2}" y="15.5" fill="#0b2a2d" font-weight="700" font-size="11.5" text-anchor="middle">${value}</text>
</g>
</svg>`;
}
