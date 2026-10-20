// Pulls backgrounds and animated icons from MongoDB (the old API's store), optimizes them for
// banners and registers them in lib/assets.json, which lib/catalog.ts reads.
//
//   npm run sync:assets               # needs MONGODB_URI in .env
//   npm run sync:assets -- --file aurora.gif --background aurora --label "Aurora" [--position top|center|bottom] [--pixel]
//   npm run sync:assets -- --file clip.mp4 --background clip --label "Clip"   # video loops, needs ffmpeg
//
// Re-running is cheap: unchanged sources (same hash) are skipped. Entries that aren't in
// MongoDB (e.g. added with --file) are kept.

import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs, promisify } from "node:util";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const MANIFEST = path.join(ROOT, "lib/assets.json");
const OUT = path.join(ROOT, "public/assets");

const { values: args } = parseArgs({
  options: {
    file: { type: "string" },
    background: { type: "string" },
    icon: { type: "string" },
    label: { type: "string" },
    position: { type: "string", default: "center" }, // which part survives if the image is taller than 16:9
    pixel: { type: "boolean", default: false }, // pixel art: keep native size, render with crisp edges
    force: { type: "boolean", default: false },
  },
});

const manifest = JSON.parse(await readFile(MANIFEST, "utf8").catch(() => '{"backgrounds":[],"icons":[]}'));
const EXT = { webp: "webp", gif: "gif", png: "png", jpeg: "jpg" };

/** Backgrounds: cropped to the banner's 4:1 ratio. Stills up to 1600px wide, animations up to 640px. */
const POSITIONS = { top: "north", center: "centre", bottom: "south" };
const MAX_BYTES = 1200 * 1024; // keeps banners reasonably quick to load on GitHub
const TALLEST = 16 / 9; // banners are never taller than 16:9, so anything beyond that is cropped

/** Re-encodes raw RGBA frames as an animated WebP, keeping every `step`-th frame (durations merged). */
async function encodeFrames(raw, info, pageHeight, delays, step, quality) {
  const frameBytes = info.width * pageHeight * info.channels;
  const count = delays.length;
  const keep = [];
  for (let i = 0; i < count; i += step) keep.push(i);
  const data = Buffer.concat(keep.map((i) => raw.subarray(i * frameBytes, (i + 1) * frameBytes)));
  const delay = keep.map((i) => delays.slice(i, i + step).reduce((a, b) => a + b, 0));
  return sharp(data, { raw: { width: info.width, height: pageHeight * keep.length, channels: info.channels, pageHeight } })
    .webp({ quality, effort: 5, smartSubsample: true, loop: 0, delay })
    .toBuffer();
}

/**
 * Backgrounds keep their own aspect ratio (users pan and zoom them), trimmed to 16:9 if taller, and are
 * never upscaled. Sharpness wins over smoothness: when an animation is too heavy, frames are dropped
 * first (motion stays the same speed), then quality, and only as a last resort the size.
 * `pixel` keeps pixel art at its native size; the banner scales it with crisp edges.
 */
async function writeBackground(name, buf, position = "center", pixel = false) {
  const meta = await sharp(buf, { animated: true }).metadata();
  const h0 = meta.pageHeight || meta.height;
  const frames = meta.pages || 1;
  const animated = frames > 1;
  const aspect = Math.max(meta.width / h0, TALLEST);
  const crop = { fit: "cover", position: POSITIONS[position] ?? "centre" };
  let width = pixel ? meta.width : Math.min(animated ? 800 : 1600, meta.width);
  let out;

  if (!animated) {
    out = await sharp(buf).resize(width, Math.round(width / aspect), crop).webp({ quality: 84, effort: 6, smartSubsample: true }).toBuffer();
  } else {
    const delays = Array.from({ length: frames }, (_, i) => meta.delay?.[i] || 50);
    const attempts = [
      [1, 75],
      [1, 65],
      [2, 72],
      [2, 62],
      [3, 65],
      [3, 55],
    ];
    for (;;) {
      const height = Math.round(width / aspect);
      const { data, info } = await sharp(buf, { animated: true })
        .resize(width, height, { ...crop, kernel: pixel ? "nearest" : "lanczos3" })
        .raw()
        .toBuffer({ resolveWithObject: true });
      for (const [step, quality] of attempts) {
        out = await encodeFrames(data, info, height, delays, step, quality);
        if (out.length <= MAX_BYTES) break;
      }
      if (out.length <= MAX_BYTES || width <= 480) break;
      width = Math.round(width * 0.85);
    }
  }

  await writeFile(`${OUT}/backgrounds/${name}.webp`, out);
  await sharp(buf).resize(400, 100, crop).webp({ quality: 72 }).toFile(`${OUT}/thumbs/${name}.webp`);
  return { animated, w: width, h: Math.round(width / aspect), ...(pixel ? { pixel: true } : {}) };
}

/**
 * Video loops (decoded with ffmpeg) get a bigger budget than GIFs: they're the whole point of the banner.
 * The full loop is kept, at most 10fps and never past the frame count the banner can split
 * (lib/banner/server.ts); quality goes first, then the size.
 */
const VIDEO = /\.(mp4|m4v|mov|webm|mkv)$/i;
const MAX_VIDEO_BYTES = 3.5 * 1024 * 1024;
const MAX_VIDEO_FRAMES = 300;
const run = (cmd, argv) => promisify(execFile)(cmd, argv, { encoding: "buffer", maxBuffer: 2 ** 31 - 1 }).then((r) => r.stdout);

async function writeVideoBackground(name, file, position = "center") {
  const probe = JSON.parse(
    await run("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:format=duration", "-of", "json", file]),
  );
  const { width: w0, height: h0 } = probe.streams[0];
  const duration = Number(probe.format.duration);
  const aspect = Math.max(w0 / h0, TALLEST);
  const delay = Math.max(100, Math.ceil((duration * 1000) / MAX_VIDEO_FRAMES));
  const cropY = { top: "0", bottom: "ih-oh" }[position] ?? "(ih-oh)/2";
  const decode = (width, height) =>
    run("ffmpeg", [
      "-v", "error", "-i", file, "-an",
      "-vf", `fps=1000/${delay},scale=${width}:${height}:force_original_aspect_ratio=increase:flags=lanczos,crop=${width}:${height}:(iw-ow)/2:${cropY}`,
      "-pix_fmt", "rgb24", "-f", "rawvideo", "-",
    ]);

  let width = Math.min(640, w0);
  let height, out;
  for (;;) {
    height = Math.round(width / aspect / 2) * 2;
    const raw = await decode(width, height);
    const frames = Math.min(raw.length / (width * height * 3), MAX_VIDEO_FRAMES);
    const input = sharp(raw.subarray(0, frames * width * height * 3), {
      raw: { width, height: height * frames, channels: 3, pageHeight: height },
    });
    for (const quality of [70, 62, 55]) {
      out = await input.clone().webp({ quality, effort: 5, smartSubsample: true, loop: 0, delay: Array(frames).fill(delay) }).toBuffer();
      if (out.length <= MAX_VIDEO_BYTES) break;
    }
    if (out.length <= MAX_VIDEO_BYTES || width <= 400) break;
    width = Math.round((width * 0.85) / 2) * 2;
  }

  await writeFile(`${OUT}/backgrounds/${name}.webp`, out);
  const still = await run("ffmpeg", ["-v", "error", "-ss", String(duration / 2), "-i", file, "-frames:v", "1", "-f", "image2pipe", "-c:v", "png", "-"]);
  await sharp(still).resize(400, 100, { fit: "cover", position: POSITIONS[position] ?? "centre" }).webp({ quality: 72 }).toFile(`${OUT}/thumbs/${name}.webp`);
  return { animated: true, w: width, h: height };
}

/** Icons: fit in 128px (badge icons render tiny, so 96/64). Keeps the original if it's already smaller. */
async function writeIcon(name, buf) {
  const meta = await sharp(buf, { animated: true }).metadata();
  const h0 = meta.pageHeight || meta.height;
  const animated = (meta.pages || 1) > 1;
  const box = { fire: 96, sharingan: 64 }[name] ?? 128;
  const webp = await sharp(buf, { animated: true })
    .resize(box, box, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: animated ? 70 : 80, effort: 6, smartSubsample: true })
    .toBuffer();
  const useRaw = buf.length <= webp.length && Math.max(meta.width, h0) <= 256 && EXT[meta.format];
  const file = `icons/${name}.${useRaw ? EXT[meta.format] : "webp"}`;
  await writeFile(`${OUT}/${file}`, useRaw ? buf : webp);
  return { file, animated };
}

const prettify = (name, description) =>
  (description || name)
    .replace(/\b(giphy|logo|profile|gradien)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase()) || name;

async function upsert(kind, name, buf, label, file) {
  const list = kind === "background" ? manifest.backgrounds : manifest.icons;
  const hash = createHash("sha1").update(buf).digest("hex").slice(0, 12);
  const existing = list.find((e) => e.name === name);
  if (existing?.hash === hash && !args.force) return "unchanged";

  const written =
    kind === "icon"
      ? await writeIcon(name, buf)
      : VIDEO.test(file ?? "")
        ? await writeVideoBackground(name, file, args.position)
        : await writeBackground(name, buf, args.position, args.pixel);
  const entry = { name, label: existing?.label ?? label, pixel: undefined, ...written, hash };
  if (existing) Object.assign(existing, entry);
  else list.push(entry);
  return existing ? "updated" : "added";
}

await mkdir(`${OUT}/backgrounds`, { recursive: true });
await mkdir(`${OUT}/thumbs`, { recursive: true });
await mkdir(`${OUT}/icons`, { recursive: true });

if (args.file) {
  const kind = args.background ? "background" : "icon";
  const name = args.background ?? args.icon;
  if (!name) throw new Error("Pass --background <name> or --icon <name> with --file");
  const status = await upsert(kind, name, await readFile(args.file), args.label ?? prettify(name), args.file);
  console.log(`${kind} ${name}: ${status}`);
} else {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set (add it to .env)");
  const { MongoClient } = await import("mongodb");
  const client = await MongoClient.connect(process.env.MONGODB_URI);
  const db = client.db(process.env.MONGODB_DB || "countview");
  try {
    for (const [collection, kind] of [
      ["backgrounds", "background"],
      ["technicals", "icon"],
    ]) {
      for await (const doc of db.collection(collection).find({})) {
        const m = /^data:[^;]+;base64,(.*)$/s.exec(doc.data ?? "");
        if (!doc.name || !m) continue;
        const status = await upsert(kind, doc.name, Buffer.from(m[1], "base64"), prettify(doc.name, doc.description));
        console.log(`${kind.padEnd(10)} ${doc.name.padEnd(16)} ${status}`);
      }
    }
  } finally {
    await client.close();
  }
}

await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
console.log(`\n${manifest.backgrounds.length} backgrounds, ${manifest.icons.length} icons in lib/assets.json`);
