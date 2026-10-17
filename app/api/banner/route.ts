import type { NextRequest } from "next/server";
import { decodeConfig } from "@/lib/banner/codec";
import { bannerResponse } from "@/lib/banner/route-helpers";
import { parseConfig, withUser } from "@/lib/banner/schema";
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
  const q = req.nextUrl.searchParams;
  const resolved = withUser(config, q.get("u"));
  // With a `u` override, `c` no longer matches the banner, so let the registry re-encode it.
  return bannerResponse(resolved, { c: resolved === config ? c : undefined, preview: req.nextUrl.searchParams.has("preview"), headers: req.headers });
}
