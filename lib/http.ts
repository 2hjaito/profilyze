const HOUR = 60 * 60;
const DAY = 24 * HOUR;

export const CACHE = {
  /** Static content (no live data): cache at the edge for a month. */
  static: `public, max-age=${DAY}, s-maxage=${30 * DAY}, stale-while-revalidate=${7 * DAY}`,
  /** Remote images can change; refresh daily. */
  remote: `public, max-age=${HOUR}, s-maxage=${DAY}, stale-while-revalidate=${7 * DAY}`,
  /** GitHub stats: refresh every few hours, serve stale while revalidating. */
  live: `public, max-age=${HOUR}, s-maxage=${4 * HOUR}, stale-while-revalidate=${DAY}`,
  /** Always revalidate; GitHub's camo proxy honours this, so counters update on each view. */
  none: "max-age=0, no-cache, no-store, must-revalidate",
};

export function svgResponse(svg: string, cacheControl: string, status = 200) {
  return new Response(svg, {
    status,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": cacheControl,
      "Access-Control-Allow-Origin": "*",
      // Stop the SVG from running anything if someone opens it directly.
      "Content-Security-Policy": "default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:",
    },
  });
}

export const errorSvg = (message: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="495" height="60" viewBox="0 0 495 60"><rect width="495" height="60" rx="10" fill="#0d1117"/><text x="247.5" y="35" text-anchor="middle" font-family="-apple-system,'Segoe UI',sans-serif" font-size="14" fill="#f85149">${message.replace(/[<>&]/g, "")}</text></svg>`;
