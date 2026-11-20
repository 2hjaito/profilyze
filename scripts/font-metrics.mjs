// Writes lib/cards/metrics.json: per-character advance widths (in 1/1000 em) for the fonts the
// profile cards draw with, so text can be measured and wrapped without a browser.
// Run after adding or changing a font in public/fonts: node scripts/font-metrics.mjs

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Blob, Face, Font } from "harfbuzzjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const FONTS = ["inter-400", "inter-600", "inter-700", "newsreader-400", "newsreader-600"];
// Latin, Latin Extended, combining marks, Vietnamese, general punctuation and arrows.
const RANGES = [
  [0x20, 0x24f],
  [0x300, 0x36f],
  [0x1e00, 0x1eff],
  [0x2010, 0x2199],
];

const out = {};
for (const name of FONTS) {
  const face = new Face(new Blob(await readFile(path.join(ROOT, "public/fonts", `${name}.ttf`))));
  const font = new Font(face);
  const ranges = {};
  let sum = 0;
  let n = 0;
  for (const [from, to] of RANGES) {
    const widths = [];
    for (let cp = from; cp <= to; cp++) {
      const glyph = font.nominalGlyph(cp);
      const w = glyph === undefined ? -1 : Math.round((font.glyphHAdvance(glyph) / face.upem) * 1000);
      widths.push(w);
      if (w > 0 && cp >= 0x61 && cp <= 0x7a) {
        sum += w;
        n++;
      }
    }
    ranges[from] = widths;
  }
  out[name] = { avg: Math.round(sum / n), ranges };
}

await writeFile(path.join(ROOT, "lib/cards/metrics.json"), JSON.stringify(out));
console.log("Wrote lib/cards/metrics.json for", FONTS.join(", "));
