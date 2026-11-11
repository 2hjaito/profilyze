import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import * as hb from "harfbuzzjs";

// Turns the <text> of a card SVG into vector paths, so the file needs no fonts and no <style>.
// Used for downloads that end up in icon libraries (davi-icons strips <style>, which would drop Inter),
// design tools and anywhere else an SVG gets re-processed.

const fonts = new Map<number, Promise<hb.Font>>();
function inter(weight: number) {
  const w = weight >= 700 ? 700 : weight >= 600 ? 600 : 400;
  let f = fonts.get(w);
  if (!f) {
    f = readFile(path.join(process.cwd(), "public", "fonts", `inter-${w}.ttf`)).then((buf) => new hb.Font(new hb.Face(new hb.Blob(buf))));
    f.catch(() => fonts.delete(w));
    fonts.set(w, f);
  }
  return f;
}

const unescape = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&");

const attr = (attrs: string, name: string) => attrs.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`))?.[1];

async function textToPath(attrs: string, raw: string) {
  const text = unescape(raw);
  const size = Number(attr(attrs, "font-size") ?? 16);
  const font = await inter(Number(attr(attrs, "font-weight") ?? 400));
  const spacing = Number(attr(attrs, "letter-spacing") ?? 0);
  const x = Number(attr(attrs, "x") ?? 0);
  const y = Number(attr(attrs, "y") ?? 0);
  const anchor = attr(attrs, "text-anchor") ?? "start";

  const buf = new hb.Buffer();
  buf.addText(text);
  buf.guessSegmentProperties();
  hb.shape(font, buf);
  const glyphs = buf.getGlyphInfosAndPositions();

  const scale = size / font.face.upem;
  let pen = 0;
  const parts: string[] = [];
  for (const g of glyphs) {
    const d = font.glyphToPath(g.codepoint);
    const gx = pen + (g.xOffset ?? 0) * scale;
    if (d) parts.push(`<path transform="translate(${gx.toFixed(2)} 0) scale(${scale.toFixed(5)} ${(-scale).toFixed(5)})" d="${d}"/>`);
    pen += (g.xAdvance ?? 0) * scale + spacing;
  }
  const width = pen - (glyphs.length ? spacing : 0);
  const left = anchor === "middle" ? x - width / 2 : anchor === "end" ? x - width : x;
  const fill = attr(attrs, "fill");
  return `<g transform="translate(${left.toFixed(2)} ${y})"${fill ? ` fill="${fill}"` : ""}>${parts.join("")}</g>`;
}

/**
 * Outlines every `<text>` in an SVG we rendered ourselves (flat text, no tspans), drops the empty
 * `<style>` slot and prefixes ids so several exported SVGs can sit inline on one page.
 */
export async function outlineSvg(svg: string, idPrefix: string) {
  const texts = [...svg.matchAll(/<text([^>]*)>([^<]*)<\/text>/g)];
  const paths = await Promise.all(texts.map((m) => textToPath(m[1], m[2])));
  let i = 0;
  let out = svg.replace(/<text([^>]*)>([^<]*)<\/text>/g, () => paths[i++]);
  out = out.replace(/<style><\/style>\n?/, "").replace(/ font-family="[^"]*"/, "");
  // A content hash keeps variants of one style (gold #1/#2/#3 all define `g`) from sharing ids.
  let h = 0x811c9dc5;
  for (let k = 0; k < svg.length; k++) h = Math.imul(h ^ svg.charCodeAt(k), 0x01000193);
  const p = `${idPrefix.replace(/[^a-zA-Z0-9-]/g, "") || "pz"}-${(h >>> 0).toString(36)}`;
  out = out.replace(/id="([^"]+)"/g, (_, id) => `id="${p}-${id}"`).replace(/url\(#([^)]+)\)/g, (_, id) => `url(#${p}-${id})`);
  return out;
}
