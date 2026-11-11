import type { NextRequest } from "next/server";
import { embedCardFonts } from "@/lib/banner/server";
import { awardBadge, isAwardIcon, isAwardStyle } from "@/lib/cards/award";
import { outlineSvg } from "@/lib/cards/outline";
import { CACHE, svgResponse } from "@/lib/http";

const clean = (s: string | null, max: number) => (s ?? "").replace(/\s+/g, " ").trim().slice(0, max);

// Award-style badge: /api/badge?label=XERJ+Corpus+Hub&title=Featured+Repository&style=laurel
// `outline=1` draws the text as paths (no fonts, no <style>) for icon libraries and design tools.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const style = q.get("style");
  const icon = q.get("icon");
  const opts = {
    label: clean(q.get("label"), 40),
    title: clean(q.get("title"), 40) || "Featured Repository",
    style: isAwardStyle(style) ? style : "laurel",
    rank: clean(q.get("rank"), 3) || undefined,
    icon: isAwardIcon(icon) ? icon : undefined,
  } as const;
  const svg = awardBadge(opts);
  const out = q.get("outline") === "1" ? await outlineSvg(svg, `award-${opts.style}`) : await embedCardFonts(svg);
  return svgResponse(out, CACHE.static);
}
