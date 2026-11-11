import type { NextRequest } from "next/server";
import { embedCardFonts } from "@/lib/banner/server";
import { isSocialPlatform, isSocialTheme, platforms, socialBadge } from "@/lib/cards/social";
import { outlineSvg } from "@/lib/cards/outline";
import { CACHE, svgResponse } from "@/lib/http";

const clean = (s: string | null, max: number) => (s ?? "").replace(/\s+/g, " ").trim().slice(0, max);

// Social badge: /api/badge/social?platform=discord&value=Join+The+Code+Well&theme=profilyze
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const p = q.get("platform");
  const t = q.get("theme");
  const platform = isSocialPlatform(p) ? p : "website";
  const theme = isSocialTheme(t) ? t : "profilyze";
  const svg = socialBadge({
    platform,
    label: clean(q.get("label"), 30) || platforms[platform].name,
    // `value=` (empty) drops the right half; leaving it out uses the platform's default.
    value: q.has("value") ? clean(q.get("value"), 40) : platforms[platform].value,
    theme,
  });
  // `outline=1` draws the text as paths (no fonts, no <style>) for icon libraries and design tools.
  const out = q.get("outline") === "1" ? await outlineSvg(svg, `${platform}-${theme}`) : await embedCardFonts(svg);
  return svgResponse(out, CACHE.static);
}
