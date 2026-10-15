// Pulls backgrounds and animated icons from MongoDB (the old API's store), optimizes them for
// banners and registers them in lib/assets.json, which lib/catalog.ts reads.
//
//   npm run sync:assets               # needs MONGODB_URI in .env
//   npm run sync:assets -- --file frog.gif --background frog --label "Frog Pond"
//
// Re-running is cheap: unchanged sources (same hash) are skipped. Entries that aren't in
// MongoDB (e.g. added with --file) are kept.

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
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
    force: { type: "boolean", default: false },
  },
});

const manifest = JSON.parse(await readFile(MANIFEST, "utf8").catch(() => '{"backgrounds":[],"icons":[]}'));
const EXT = { webp: "webp", gif: "gif", png: "png", jpeg: "jpg" };

/** Backgrounds: cropped to the banner's 4:1 ratio. Stills up to 1600px wide, animations up to 640px. */
async function writeBackground(name, buf) {
  const meta = await sharp(buf, { animated: true }).metadata();
  const h0 = meta.pageHeight || meta.height;
  const animated = (meta.pages || 1) > 1;
  const w = Math.round(Math.min(animated ? 640 : 1600, meta.width, h0 * 4));
  const img = sharp(buf, { animated: true }).resize(w, Math.round(w / 4), { fit: "cover", position: "centre" });
  await img.webp({ quality: animated ? 50 : 82, effort: 6, smartSubsample: true }).toFile(`${OUT}/backgrounds/${name}.webp`);
  await sharp(buf).resize(400, 100, { fit: "cover" }).webp({ quality: 72 }).toFile(`${OUT}/thumbs/${name}.webp`);
  return { animated };
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

async function upsert(kind, name, buf, label) {
  const list = kind === "background" ? manifest.backgrounds : manifest.icons;
  const hash = createHash("sha1").update(buf).digest("hex").slice(0, 12);
  const existing = list.find((e) => e.name === name);
  if (existing?.hash === hash && !args.force) return "unchanged";

  const written = kind === "background" ? await writeBackground(name, buf) : await writeIcon(name, buf);
  const entry = { name, label: existing?.label ?? label, ...written, hash };
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
  const status = await upsert(kind, name, await readFile(args.file), args.label ?? prettify(name));
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
