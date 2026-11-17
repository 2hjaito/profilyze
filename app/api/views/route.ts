import { countPageView, readPageViews, visitorId } from "@/lib/views";

// Page view counter for websites (e.g. Davipress sites):
//   POST /api/views   body: {"path":"/my-post"}   counts one view (once per visitor per 30 min)
//   GET  /api/views?path=/my-post                 reads the total without counting
// Both answer {"views": number | null}. The site is taken from the browser's Origin header,
// which page scripts cannot fake, so one site cannot count views for another. GET also accepts
// ?site=<host> for reads made outside a browser.
//
// VIEW_SITES (optional): comma-separated hosts allowed to use the counter, e.g.
// "dangth.dev,blog.example.com". Unset means any site may use it.

export const dynamic = "force-dynamic";

const MAX_PATH = 256;
const LOCAL_HOST = /^(localhost|127\.\d+\.\d+\.\d+|\[::1\]|0\.0\.0\.0|.+\.local)$/i;

const allowedSites = (process.env.VIEW_SITES ?? "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

function hostOf(origin: string | null): string | null {
  if (!origin) return null;
  try {
    return new URL(origin).host.toLowerCase();
  } catch {
    return null;
  }
}

const isLocal = (host: string) => LOCAL_HOST.test(host.replace(/:\d+$/, ""));

/** Local development is always allowed (it only reads, see POST). */
function siteAllowed(host: string) {
  return allowedSites.length === 0 || allowedSites.includes(host) || isLocal(host);
}

/** "/a/b/?x#y" -> "/a/b"; null when it isn't a plain site path. */
function cleanPath(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const path = raw.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  if (!path.startsWith("/") || path.length > MAX_PATH || /[\s\x00-\x1f]/.test(path)) return null;
  return path;
}

function json(body: unknown, origin: string | null, status = 200) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers });
}

export function OPTIONS(req: Request) {
  return json(null, req.headers.get("origin"), 204);
}

export async function GET(req: Request) {
  const origin = req.headers.get("origin");
  const url = new URL(req.url);
  const host = hostOf(origin) ?? url.searchParams.get("site")?.trim().toLowerCase() ?? null;
  const path = cleanPath(url.searchParams.get("path"));
  if (!host || !path) return json({ error: "Need a path and a site (Origin header or ?site=)." }, origin, 400);
  if (!siteAllowed(host)) return json({ error: "This site is not allowed to use the counter." }, origin, 403);
  return json({ views: (await readPageViews(host, path)) ?? null }, origin);
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  const host = hostOf(origin);
  if (!host) return json({ error: "Counting needs a browser Origin header." }, origin, 400);
  if (!siteAllowed(host)) return json({ error: "This site is not allowed to use the counter." }, origin, 403);

  // Sent as text/plain so the browser skips the CORS preflight.
  let body: unknown;
  try {
    body = JSON.parse(await req.text());
  } catch {
    body = null;
  }
  const path = cleanPath((body as { path?: unknown } | null)?.path);
  if (!path) return json({ error: "Need a JSON body like {\"path\":\"/my-post\"}." }, origin, 400);

  // Local development reads the total but never counts.
  const views = isLocal(host)
    ? await readPageViews(host, path)
    : await countPageView(host, path, visitorId(req.headers));
  return json({ views: views ?? null }, origin);
}
