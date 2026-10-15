import type { NextRequest } from "next/server";
import { legacyToConfig } from "@/lib/banner/legacy";
import { bannerResponse } from "@/lib/banner/route-helpers";

// Original query-string API, kept so existing READMEs keep working.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  return bannerResponse(legacyToConfig(q), { preview: q.has("preview") });
}
