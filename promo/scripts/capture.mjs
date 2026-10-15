// Records the real app for the promo video: screen recordings of the editor and README
// generator, plus 2x PNGs of banners and cards. Run against a dev server:
//   BASE=http://localhost:3000 npm run capture
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE ?? "http://localhost:3000";
const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = new URL("../public/capture/", import.meta.url).pathname;
const USER = "2hjaito";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The name shown in the video. Captures rewrite every response from the app (HTML, JS, JSON, SVG),
// so the real author's name never appears on screen. Override with PROMO_NAME.
const REAL_NAME = "Tran Huu Dang";
const PROMO_NAME = process.env.PROMO_NAME ?? "Nguyen Van Muoi";
const renames = [
  [REAL_NAME, PROMO_NAME],
  [REAL_NAME.toUpperCase(), PROMO_NAME.toUpperCase()],
];
const rename = (text) => renames.reduce((t, [from, to]) => t.split(from).join(to), text);

async function interceptNames(page) {
  await page.setRequestInterception(true);
  page.on("request", async (req) => {
    if (!req.url().startsWith(BASE) || req.isInterceptResolutionHandled()) return req.continue();
    try {
      const res = await fetch(req.url(), { method: req.method(), headers: req.headers(), body: req.postData() });
      const type = res.headers.get("content-type") ?? "";
      const headers = Object.fromEntries([...res.headers].filter(([k]) => !["content-encoding", "content-length", "transfer-encoding"].includes(k)));
      const textual = /text|json|javascript|svg|xml/.test(type);
      const body = textual ? rename(await res.text()) : Buffer.from(await res.arrayBuffer());
      await req.respond({ status: res.status, headers, body });
    } catch {
      if (!req.isInterceptResolutionHandled()) req.continue();
    }
  });
}

/** Re-encodes a banner config (base64url deflate-raw JSON) with the promo name. */
async function renameConfig(c) {
  const json = await new Response(new Blob([Buffer.from(c, "base64url")]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).text();
  const out = await new Response(new Blob([rename(json)]).stream().pipeThrough(new CompressionStream("deflate-raw"))).arrayBuffer();
  return Buffer.from(out).toString("base64url");
}

// Headless Chrome draws no cursor; this one follows the mouse and pulses on click.
const CURSOR = `(() => {
  const s = document.createElement('style');
  s.textContent = 'nextjs-portal{display:none!important}#pz-cursor{position:fixed;left:0;top:0;width:26px;height:26px;z-index:2147483647;pointer-events:none;transition:transform .05s linear}#pz-cursor svg{filter:drop-shadow(0 2px 4px rgba(0,0,0,.5))}#pz-ring{position:fixed;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;border:3px solid #83ebf1;opacity:0;pointer-events:none;z-index:2147483646}';
  document.head.appendChild(s);
  const c = document.createElement('div'); c.id = 'pz-cursor';
  c.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M4 2l16 9-7 2-3 7z" fill="#fff" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/></svg>';
  const r = document.createElement('div'); r.id = 'pz-ring';
  document.body.append(c, r);
  addEventListener('mousemove', e => { c.style.transform = 'translate(' + (e.clientX - 3) + 'px,' + (e.clientY - 2) + 'px)'; }, true);
  addEventListener('mousedown', e => { r.style.left = e.clientX + 'px'; r.style.top = e.clientY + 'px'; r.animate([{opacity:.9,transform:'scale(.4)'},{opacity:0,transform:'scale(1.3)'}], {duration:450}); }, true);
})()`;

// ---------- frame-stepped recording ----------
// Instead of a real-time screencast (lossy, uneven frame rate), every video frame is a 2x JPEG taken
// after moving the mouse one step. Motion is perfectly even at 60 fps and as sharp as a screenshot.
const FPS = 60;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2); // ease-in-out cubic

/**
 * Plays a list of steps, one screenshot per frame. A step is
 *   { frames, to?: point | () => point, down?: true, up?: true, click?: true, wheel?: deltaY-per-frame, run?: fn }
 * `to` glides the cursor there over `frames` (eased); targets are resolved when the step starts.
 */
async function recordSteps(page, name, start, steps) {
  const dir = `${OUT}${name}/`;
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  let pos = start;
  let n = 0;
  await page.mouse.move(pos.x, pos.y);
  await page.evaluate(() => (window.__pzSlow = true));
  const shoot = async () => {
    await page.screenshot({ path: `${dir}${String(n++).padStart(4, "0")}.jpg`, type: "jpeg", quality: 92 });
  };
  for (const step of steps) {
    if (step.run) await step.run();
    const target = typeof step.to === "function" ? await step.to() : step.to;
    if (step.down) await page.mouse.down();
    if (step.up) await page.mouse.up();
    if (step.click) {
      await page.mouse.down();
      await page.mouse.up();
    }
    const from = pos;
    for (let i = 1; i <= step.frames; i++) {
      if (target) {
        const t = ease(i / step.frames);
        pos = { x: from.x + (target.x - from.x) * t, y: from.y + (target.y - from.y) * t };
        await page.mouse.move(pos.x, pos.y);
      }
      if (step.wheel) await page.mouse.wheel({ deltaY: step.wheel });
      // Let React commit the change before the frame is taken.
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      await shoot();
    }
  }
  console.log(`  ${name}: ${n} frames (${(n / FPS).toFixed(2)}s)`);
}

const center = (page, sel) =>
  page.$eval(sel, (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });

const buttonCenter = async (page, text) => {
  const handle = await page.evaluateHandle(
    (t) => [...document.querySelectorAll("button")].find((b) => b.textContent.trim().includes(t)),
    text,
  );
  const box = await handle.boundingBox();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

// Frame-stepped capture runs ~10x slower than real time, so while recording, the page's timers
// (debounces, "Copied" resets…) are stretched to match the on-screen pace.
const TIME_SCALE = 10;
const SLOW_TIMERS = `(() => {
  const st = window.setTimeout;
  window.setTimeout = (fn, ms, ...a) => st(fn, window.__pzSlow ? (ms || 0) * ${TIME_SCALE} : ms, ...a);
})()`;

async function setup(page) {
  await interceptNames(page);
  await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 2 });
  await page.evaluateOnNewDocument(SLOW_TIMERS);
  await page.evaluateOnNewDocument(`addEventListener('DOMContentLoaded', () => ${CURSOR})`);
}

/** 11 s: drag the name (0–3.5 s), resize the logo (3.5–7 s), switch templates (7–11 s). */
async function recordEditor(browser) {
  const page = await browser.newPage();
  await setup(page);
  await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle0" });
  await sleep(3000);

  let name;
  let handle;
  await recordSteps(page, "editor", { x: 1250, y: 130 }, [
    { frames: 30 },
    { frames: 45, to: async () => (name = await center(page, '[data-id="name"]')) },
    { frames: 60, down: true, to: () => ({ x: name.x + 150, y: name.y + 20 }) },
    { frames: 12 },
    { frames: 50, to: () => name },
    { frames: 13, up: true },
    { frames: 40, to: () => center(page, '[data-id="tech"]') },
    { frames: 20, click: true },
    {
      frames: 30,
      to: async () =>
        (handle = await page.$$eval("svg rect.cursor-nwse-resize", (els) => {
          const r = els.at(-1).getBoundingClientRect();
          return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
        })),
    },
    { frames: 50, down: true, to: () => ({ x: handle.x + 45, y: handle.y + 32 }) },
    { frames: 70, up: true },
    { frames: 45, to: () => buttonCenter(page, "Minimal") },
    { frames: 75, click: true },
    { frames: 45, to: () => buttonCenter(page, "Stats") },
    { frames: 75, click: true },
  ]);
  await page.close();
}

/** 6 s: scroll the README preview, then copy it. */
async function recordReadme(browser) {
  const page = await browser.newPage();
  await setup(page);
  await page.goto(`${BASE}/readme`, { waitUntil: "networkidle0" });
  // Start from the default banner, not whatever the editor recording left in the draft.
  await page.evaluate(() => {
    localStorage.removeItem("profilyze:readme");
    localStorage.removeItem("profilyze:draft");
  });
  await page.reload({ waitUntil: "networkidle0" });
  await sleep(4000);

  await recordSteps(page, "readme", { x: 800, y: 420 }, [
    { frames: 24 },
    { frames: 40, to: () => center(page, ".md-preview") },
    { frames: 180, wheel: 7 },
    { frames: 40, to: () => buttonCenter(page, "Copy Markdown") },
    { frames: 76, click: true },
  ]);
  await page.close();
}

/** Tall mobile screenshot of the generated README, for the phone mockup. */
async function mobileReadme(browser) {
  const page = await browser.newPage();
  await interceptNames(page);
  await page.goto(`${BASE}/readme`, { waitUntil: "networkidle0" });
  await sleep(2500);
  const html = await page.$eval(".md-preview", (el) => el.innerHTML);
  const css = (await readFile(new URL("../../app/globals.css", import.meta.url), "utf8")).match(/\.md-preview[^}]*}/g).join("\n");
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3 });
  await page.setContent(
    `<html><head><base href="${BASE}/"><style>body{margin:0;background:#0d1117;font-family:-apple-system,'Segoe UI',sans-serif}${css}.md-preview{padding:16px}</style></head><body><div class="md-preview">${html}</div></body></html>`,
    { waitUntil: "load", timeout: 90000 },
  );
  await sleep(1500);
  await page.screenshot({ path: `${OUT}readme-mobile.png`, fullPage: true });
  await page.close();
}

// The banners featured in the 3D banner scene: real designs from the live site, shot as 2x stills.
const SITE = process.env.SITE ?? "https://profilyze.vercel.app";
const FEATURED = {
  "featured-1":
    "nZFRb9owEMe_Cvr39RTZCU3pvVUbm6YxOm2j0lT1wQQHXFIH2YYWIb57ZZNCt3XStLyc5dz597u7HTZgSVh77cDIF_fKhBaE6Ry8w9LYGRgrp70OIFj1oMEwQVULI7EnLMD5uSDMzANYEBxY5gTdePDtDiaWpyrCE7gYZCVhC5ZykF0QPPg8XYXtKj4c9FPEpMAYf5z8HI57N1fj3pfJ9ScQ6tbGH8YG7UB4BA-EIFRt00b9szp92FNHdm3zOzkXl1k_kfP-X7gfJqPR9x9X7z733g9vhqPrr8Nvb7LLX9iDQk9rCUJsXWTyKOGXpmn8QaMvZKQnD5ksipOFqVob8w6Rb6FY2fm6UZGneLPW9z6dnFZV6M62ncXrO8JcrcBSnLjBabXsuIfmC3HoXByZPqjYeQqvSqICGIpr4-IEGzXVDRgzte0dk_6cyMVb2yCoqtIp9ayuL8u-OC1oY_RjN5q8LLPinyxfio6SfqGcsXNlX5m-JP2HZLfJ_d3-GQ",
  "featured-2":
    "pdHNjoMgFAXgV5mcbm-M_6b3MWbbdIGKSuuAEezUNH33CWobZzGrYcMNHOADHriBI8Jk5QhG3F2EcgaEsgU_cFW6BmMYpZUOBC2-JBhatZ37VLUcQWju4CwkNDM4z4L0SejASZIECaFWX-CQMIKjmCB7Cz49oPyu9qr63oJwB-dpEuSEGRwf46AgWHCSEtw8-ANVZbRPrj2fIFjoduqFBwi-TfJil2qUonJbrU39Gm7N0Mk12yrXTeVSbpPD7DqjcSa0YgBH4ZNeQjdKcV2F2TENokUYFUG2AOPwDbRO-PdZut067wVDcKNGCUIvStmDUYv54x1qjPaLlHYL8RtchCGhMr3xf3JoluapVSWX6KFpjnkaYgcVLsIfmspoN6rS7jyVUzfl5p1oC01OrS99BxdFuP3Jrxv_g3t-_gA",
};

async function featuredBanners(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1100, height: 600, deviceScaleFactor: 2 });
  for (const [name, c] of Object.entries(FEATURED)) {
    // preview=1: render without counting a view
    await page.setContent(`<html><body style="margin:0;background:transparent"><img id="i" src="${SITE}/api/banner?c=${c}&preview=1"></body></html>`);
    await page.waitForFunction(() => document.getElementById("i").complete && document.getElementById("i").naturalWidth > 0, { timeout: 90000 });
    await sleep(500);
    await (await page.$("#i")).screenshot({ path: `${OUT}${name}.png`, omitBackground: true });
    console.log("  featured", name);
  }
  await page.close();
}

/** Banners and cards as crisp 2x PNGs. */
async function stills(browser, demos) {
  const page = await browser.newPage();
  await interceptNames(page);
  for (const k of Object.keys(demos)) demos[k] = await renameConfig(demos[k]);
  await page.setViewport({ width: 1100, height: 400, deviceScaleFactor: 2 });
  const shots = {
    ...Object.fromEntries(Object.entries(demos).map(([k, c]) => [`banner-${k}`, `/api/banner?c=${c}&preview=1`])),
    "banner-chill": `/api/profile/banner?name=${encodeURIComponent(PROMO_NAME.toUpperCase())}&role=FULLSTACK+DEVELOPER&background=chillGaming&tech=gopher&skills=reactjs,vuejs,nodejs&preview=1`,
    "card-streak": `/api/github/streak?user=${USER}&theme=github-dark`,
    "card-graph": `/api/github/graph?user=${USER}&theme=midnight`,
    "card-stats": `/api/github/stats?user=${USER}&theme=tokyonight`,
    "card-streak-light": `/api/github/streak?user=${USER}&theme=github-light`,
    "card-streak-dracula": `/api/github/streak?user=${USER}&theme=dracula`,
  };
  for (const [name, path] of Object.entries(shots)) {
    await page.setContent(`<html><body style="margin:0;background:transparent"><img id="i" src="${BASE}${path}"></body></html>`);
    await page.waitForFunction(() => document.getElementById("i").complete && document.getElementById("i").naturalWidth > 0, { timeout: 60000 });
    await sleep(300);
    const el = await page.$("#i");
    await el.screenshot({ path: `${OUT}${name}.png`, omitBackground: true });
    console.log("  still", name);
  }
  await page.close();
}

await mkdir(OUT, { recursive: true });
const demos = JSON.parse(await readFile(new URL("./demos.json", import.meta.url), "utf8"));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new" });
// So "Copy Markdown" succeeds and flips to "Copied" on camera.
await browser.defaultBrowserContext().overridePermissions(BASE, ["clipboard-read", "clipboard-write", "clipboard-sanitized-write"]);
try {
  // ONLY=stills,mobile,editor,readme re-captures just those.
  const only = process.env.ONLY?.split(",");
  const steps = { banners: () => featuredBanners(browser), stills: () => stills(browser, demos), mobile: () => mobileReadme(browser), editor: () => recordEditor(browser), readme: () => recordReadme(browser) };
  for (const [name, run] of Object.entries(steps)) {
    if (only && !only.includes(name)) continue;
    console.log(`${name}…`);
    await run();
  }
} finally {
  await browser.close();
}
await writeFile(`${OUT}done.txt`, new Date().toISOString());
console.log("done");
