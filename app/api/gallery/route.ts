import type { NextRequest } from "next/server";
import { listBanners } from "@/lib/registry";

const PAGE = 24;

// Latest design per user, newest first. Paginate with ?before=<updatedAt of the last item>.
export async function GET(req: NextRequest) {
  const before = req.nextUrl.searchParams.get("before");
  const date = before ? new Date(before) : undefined;
  if (date && Number.isNaN(date.getTime())) return Response.json({ error: "Invalid cursor" }, { status: 400 });

  try {
    const { items, total } = await listBanners(PAGE, date);
    return Response.json(
      { items, total, next: items.length === PAGE ? items.at(-1)!.updatedAt : null },
      { headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=3600" } },
    );
  } catch (err) {
    console.error("Gallery error:", err);
    return Response.json({ error: "Gallery unavailable" }, { status: 503 });
  }
}
