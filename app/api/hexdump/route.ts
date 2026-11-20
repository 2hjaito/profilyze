import type { NextRequest } from "next/server";
import { embedMonoFonts } from "@/lib/banner/server";
import { hexdumpCard } from "@/lib/cards/debugger";
import { modeFrom, stopsFrom } from "@/lib/cards/terminal";
import { getGithubData } from "@/lib/github/fetch";
import { CACHE, svgResponse } from "@/lib/http";

// Hexdump header: your intro as a memory dump in a debugger window.
//   /api/hexdump?user=2hjaito
//   /api/hexdump?text=Hi%2C+I'm+Dang.%0AFullstack+dev&title=dang.exe&palette=mint
// text: up to 256 bytes (newlines allowed). Without it, the user's name and top languages are used.
// title: window title, default "<user>.exe — memory dump". palette / colors / mode as in /api/terminal.

const USER = /^[a-zA-Z0-9-]{1,39}$/;

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const user = q.get("user") ?? "";
  const o = { mode: modeFrom(q), stops: stopsFrom(q) };
  let text = (q.get("text") ?? "").replace(/\r/g, "").slice(0, 256);
  const hasUser = USER.test(user);

  if (!text && hasUser) {
    const d = await getGithubData(user).catch(() => null);
    const langs = d?.languages?.slice(0, 4).map((l) => l.name).join(" / ");
    text = `Hi, I'm ${d?.name || user}.\n${langs ? `${langs}\n` : ""}github.com/${d?.login ?? user}`;
  }
  if (!text) text = "Add ?user=<github username> or ?text=<your intro>";

  const title = (q.get("title") ?? "").replace(/\s+/g, " ").trim().slice(0, 60) || `${hasUser ? user.toLowerCase() : "profile"}.exe — memory dump`;
  return svgResponse(await embedMonoFonts(hexdumpCard(text, title, o)), q.get("text") ? CACHE.static : CACHE.live);
}
