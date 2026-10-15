import type { NextRequest } from "next/server";
import { embedCardFonts } from "@/lib/banner/server";
import { cards, findTheme, messageCard, type CardName } from "@/lib/cards/render";
import { getGithubData, GithubUserNotFound } from "@/lib/github/fetch";
import { CACHE, svgResponse } from "@/lib/http";

const USER = /^[a-zA-Z0-9-]{1,39}$/;

export async function GET(req: NextRequest, { params }: { params: Promise<{ card: string }> }) {
  const { card } = await params;
  const q = req.nextUrl.searchParams;
  const opts = {
    theme: findTheme(q.get("theme")),
    hideBorder: q.get("hide_border") === "true",
    transparent: q.get("transparent") === "true",
  };
  const render = cards[card as CardName];
  const user = q.get("user") ?? "";

  const reply = async (svg: string, cache: string, status = 200) =>
    svgResponse(await embedCardFonts(svg), cache, status);

  if (!render) return reply(messageCard(`Unknown card "${card.slice(0, 20)}"`, opts), CACHE.none, 404);
  if (!USER.test(user)) return reply(messageCard("Add ?user=<github username>", opts), CACHE.none, 400);

  try {
    return reply(render(await getGithubData(user), opts), CACHE.live);
  } catch (err) {
    if (err instanceof GithubUserNotFound) return reply(messageCard(`User "${user}" not found`, opts), CACHE.remote, 404);
    console.error("GitHub card error:", err);
    return reply(messageCard("Couldn't reach GitHub, try again later", opts), CACHE.none, 502);
  }
}
