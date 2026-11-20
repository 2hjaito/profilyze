import type { NextRequest } from "next/server";
import { embedMonoFonts } from "@/lib/banner/server";
import { activityCard } from "@/lib/cards/debugger";
import { modeFrom, stopsFrom, terminalCard } from "@/lib/cards/terminal";
import { getGithubData, getRecentRepos, GithubUserNotFound } from "@/lib/github/fetch";
import { CACHE, svgResponse } from "@/lib/http";

// Activity card: the contribution calendar as a memory map and recently pushed repositories as a call stack.
//   /api/activity?user=2hjaito&palette=mint&mode=dark

const USER = /^[a-zA-Z0-9-]{1,39}$/;

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const user = q.get("user") ?? "";
  const o = { mode: modeFrom(q), stops: stopsFrom(q) };
  const message = async (text: string, cache: string, status: number) =>
    svgResponse(
      await embedMonoFonts(terminalCard({ title: "activity", rows: [{ kind: "note", text }], art: [], stops: o.stops, mode: o.mode, frame: "window" })),
      cache,
      status,
    );

  if (!USER.test(user)) return message("Add ?user=<github username>", CACHE.none, 400);
  try {
    const [d, repos] = await Promise.all([getGithubData(user), getRecentRepos(user).catch(() => [])]);
    return svgResponse(await embedMonoFonts(activityCard(d, repos, o)), CACHE.live);
  } catch (err) {
    if (err instanceof GithubUserNotFound) return message(`User "${user}" not found`, CACHE.remote, 404);
    console.error("Activity card error:", err);
    return message("Couldn't reach GitHub, try again later", CACHE.none, 502);
  }
}
