import type { NextRequest } from "next/server";
import { decodeConfig } from "@/lib/banner/codec";
import { bannerResponse } from "@/lib/banner/route-helpers";
import { parseConfig } from "@/lib/banner/schema";
import { CACHE, errorSvg, svgResponse } from "@/lib/http";

export async function GET(req: NextRequest) {
  const c = req.nextUrl.searchParams.get("c");
  if (!c) return svgResponse(errorSvg("Missing banner config"), CACHE.none, 400);

  let config;
  try {
    config = parseConfig(await decodeConfig(c));
  } catch {
    return svgResponse(errorSvg("Invalid banner config"), CACHE.none, 400);
  }
  return bannerResponse(config, { c, preview: req.nextUrl.searchParams.has("preview"), headers: req.headers });
}
