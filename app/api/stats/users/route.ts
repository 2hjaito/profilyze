import { embedCardFonts } from "@/lib/banner/server";
import { usersBadge } from "@/lib/cards/badge";
import { formatCount } from "@/lib/github/types";
import { svgResponse } from "@/lib/http";
import { countUsers } from "@/lib/registry";

// Without this the count would be frozen at build time (the route reads no request data).
export const dynamic = "force-dynamic";

// Badge for READMEs: how many GitHub users have a Profilyze banner live.
export async function GET() {
  const n = await countUsers();
  const svg = await embedCardFonts(usersBadge("Profilyze users", formatCount(n)));
  return svgResponse(svg, "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400");
}
