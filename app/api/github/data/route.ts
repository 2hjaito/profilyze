import type { NextRequest } from "next/server";
import { getGithubData, GithubUserNotFound } from "@/lib/github/fetch";
import { readViews } from "@/lib/views";

// JSON for the editor's live preview of stats, graphs and avatars.
export async function GET(req: NextRequest) {
  const user = req.nextUrl.searchParams.get("user") ?? "";
  if (!/^[a-zA-Z0-9-]{1,39}$/.test(user)) return Response.json({ error: "Invalid username" }, { status: 400 });
  try {
    const [data, views] = await Promise.all([getGithubData(user), readViews(user)]);
    return Response.json(
      // `full` is false when only the public contributions page was available (no valid token).
      { data, views, full: data.stars !== undefined },
      { headers: { "Cache-Control": "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400" } },
    );
  } catch (err) {
    if (err instanceof GithubUserNotFound) return Response.json({ error: "User not found" }, { status: 404 });
    return Response.json({ error: "Couldn't reach GitHub" }, { status: 502 });
  }
}
