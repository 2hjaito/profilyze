// Pulls backgrounds and animated icons from MongoDB (the old API's store), optimizes them for
// banners and registers them in lib/assets.json, which lib/catalog.ts reads.
//
//   npm run sync:assets               # needs MONGODB_URI in .env
//   npm run sync:assets -- --file aurora.gif --background aurora --label "Aurora" [--position top|center|bottom] [--pixel]
//   npm run sync:assets -- --file clip.mp4 --background clip --label "Clip" [--start 12.5 --length 4] [--crossfade 0.6]
//                                     # video loops, needs ffmpeg; the loop is found automatically if not given
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
    start: { type: "string" }, // video: loop start (s); found automatically when omitted
    length: { type: "string" }, // video: loop length (s)
    crossfade: { type: "string", default: "0.6" }, // video: seconds blended across the loop seam
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
 * Video loops (decoded with ffmpeg) are cut to a short loop so every frame can stay sharp: 1280px at
 * 12fps, quality first. The loop is found automatically (the two frames that look most alike, 3–6s
 * apart), or set with --start/--length, and its seam is hidden by crossfading the frames after it into
 * its start. Clips already that short are kept whole. Files this big are inlined whole, not split into
 * frames (lib/banner/server.ts).
 */
const VIDEO = /\.(mp4|m4v|mov|webm|mkv)$/i;
const MAX_VIDEO_BYTES = 6 * 1024 * 1024;
const VIDEO_WIDTH = 1280;
const LOOP_FPS = 12;
const LOOP_SECONDS = [3, 6];
const run = (cmd, argv) => promisify(execFile)(cmd, argv, { encoding: "buffer", maxBuffer: 2 ** 31 - 1 }).then((r) => r.stdout);

/** Best loop in the clip: start and length (s), and how big its seam is compared to a normal frame step. */
async function findLoop(file) {
  const W = 96, H = 54, px = W * H;
  const raw = await run("ffmpeg", ["-v", "error", "-i", file, "-an", "-vf", `fps=${LOOP_FPS},scale=${W}:${H}:flags=area,format=gray`, "-f", "rawvideo", "-"]);
  const n = raw.length / px;
  const diff = (a, b) => {
    let sum = 0;
    for (let k = 0; k < px; k++) sum += (raw[a * px + k] - raw[b * px + k]) ** 2;
    return Math.sqrt(sum / px);
  };
  let step = 0;
  for (let i = 1; i < n; i++) step += diff(i - 1, i);
  step = step / (n - 1) || 1;

  const [min, max] = LOOP_SECONDS.map((s) => s * LOOP_FPS);
  let best = { i: 0, L: Math.min(max, n - 1), d: Infinity };
  // Leave room after the loop for the crossfade frames.
  for (let L = min; L <= max; L++)
    for (let i = 0; i + L + LOOP_FPS < n; i++) {
      const d = diff(i, i + L);
      if (d < best.d) best = { i, L, d };
    }
  return { start: best.i / LOOP_FPS, length: best.L / LOOP_FPS, seam: best.d / step };
}

async function writeVideoBackground(name, file, position = "center") {
  const probe = JSON.parse(
    await run("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:format=duration", "-of", "json", file]),
  );
  const { width: w0, height: h0 } = probe.streams[0];
  const duration = Number(probe.format.duration);
  const aspect = Math.max(w0 / h0, TALLEST);
  const cropY = { top: "0", bottom: "ih-oh" }[position] ?? "(ih-oh)/2";

  let loop;
  if (args.start || args.length) loop = { start: Number(args.start ?? 0), length: Number(args.length ?? LOOP_SECONDS[1]) };
  else if (duration <= LOOP_SECONDS[1] + 1) loop = { start: 0, length: duration, whole: true };
  else loop = await findLoop(file);
  const fade = loop.whole ? 0 : Math.round(Number(args.crossfade) * LOOP_FPS);
  console.log(
    `  loop ${loop.start.toFixed(1)}s +${loop.length.toFixed(1)}s` +
      (loop.seam !== undefined ? `, seam ${loop.seam.toFixed(2)}x a frame step` : "") +
      (fade ? `, crossfade ${args.crossfade}s` : ""),
  );

  const decode = (width, height) =>
    run("ffmpeg", [
      "-v", "error", "-ss", String(loop.start), "-t", String(loop.length + (fade + 2) / LOOP_FPS), "-i", file, "-an",
      "-vf", `fps=${LOOP_FPS},scale=${width}:${height}:force_original_aspect_ratio=increase:flags=lanczos,crop=${width}:${height}:(iw-ow)/2:${cropY}`,
      "-pix_fmt", "rgb24", "-f", "rawvideo", "-",
    ]);

  let width = Math.min(VIDEO_WIDTH, w0);
  let height, out, quality;
  for (;;) {
    height = Math.round(width / aspect / 2) * 2;
    const fb = width * height * 3;
    const raw = await decode(width, height);
    const decoded = Math.floor(raw.length / fb);
    const frames = Math.min(Math.round(loop.length * LOOP_FPS), decoded - (fade ? fade : 0));
    const data = Buffer.from(raw.subarray(0, frames * fb));
    // The loop's first frames fade in from the frames right after its end, so wrapping around is seamless.
    for (let i = 0; i < Math.min(fade, decoded - frames); i++) {
      const t = (i + 1) / (fade + 1);
      const tail = raw.subarray((frames + i) * fb, (frames + i + 1) * fb);
      for (let k = 0; k < fb; k++) data[i * fb + k] = Math.round(tail[k] * (1 - t) + data[i * fb + k] * t);
    }
    const input = sharp(data, { raw: { width, height: height * frames, channels: 3, pageHeight: height } });
    for (quality of [85, 80, 75, 70]) {
      const delay = Array(frames).fill(Math.round(1000 / LOOP_FPS));
      out = await input.clone().webp({ quality, effort: 5, smartSubsample: true, loop: 0, delay }).toBuffer();
      if (out.length <= MAX_VIDEO_BYTES) break;
    }
    if (out.length <= MAX_VIDEO_BYTES || width <= 640) break;
    width = Math.round((width * 0.85) / 2) * 2;
  }
  console.log(`  ${width}x${height} q${quality} ${(out.length / 1024 / 1024).toFixed(2)} MB`);

  await writeFile(`${OUT}/backgrounds/${name}.webp`, out);
  const still = await run("ffmpeg", ["-v", "error", "-ss", String(loop.start + loop.length / 2), "-i", file, "-frames:v", "1", "-f", "image2pipe", "-c:v", "png", "-"]);
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
