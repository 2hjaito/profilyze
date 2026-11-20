import "server-only";
import sharp from "sharp";

// Light to dense. Each art character cell is 0.6 wide by ~1.09 tall (5.6px glyph, 6.1px line),
// so an image squeezed to COLS x ROWS comes out at its original proportions.
const RAMP = " .:;+x";
export const ART_COLS = 76;
export const ART_ROWS = 42;
const MAX_BYTES = 5 * 1024 * 1024;

const cache = new Map<string, Promise<string[] | null>>();

/** ASCII art of an image, or null when it can't be loaded. Cached per URL for the instance's lifetime. */
export function asciiArt(url: string, invert = false): Promise<string[] | null> {
  const key = `${invert ? 1 : 0}:${url}`;
  let art = cache.get(key);
  if (!art) {
    art = load(url).then((buf) => (buf ? toAscii(buf, invert) : null));
    art.then((a) => !a && cache.delete(key)).catch(() => cache.delete(key));
    if (cache.size > 300) cache.clear();
    cache.set(key, art);
  }
  return art.catch(() => null);
}

async function load(url: string): Promise<Buffer | null> {
  try {
    const { protocol } = new URL(url);
    if (protocol !== "https:" && protocol !== "http:") return null;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok || Number(res.headers.get("content-length")) > MAX_BYTES) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length > MAX_BYTES ? null : buf;
  } catch {
    return null;
  }
}

async function toAscii(buf: Buffer, invert: boolean): Promise<string[] | null> {
  try {
    // Flatten onto white so transparent logos read as background, then stretch the contrast.
    const { data, info } = await sharp(buf, { limitInputPixels: 1e8 })
      .flatten({ background: "#ffffff" })
      .resize(ART_COLS, ART_ROWS, { fit: "fill" })
      .greyscale()
      .normalise()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const lines: string[] = [];
    for (let y = 0; y < ART_ROWS; y++) {
      let line = "";
      for (let x = 0; x < ART_COLS; x++) {
        const lum = data[(y * ART_COLS + x) * info.channels] / 255;
        const ink = invert ? lum : 1 - lum;
        line += RAMP[Math.min(RAMP.length - 1, Math.floor(ink * RAMP.length))];
      }
      lines.push(line);
    }
    // Drop blank rows at the top and bottom so the art sits centred next to the text.
    while (lines.length && !lines[0].trim()) lines.shift();
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
    return lines.length ? lines : null;
  } catch {
    return null;
  }
}
