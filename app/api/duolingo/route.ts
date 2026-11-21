import type { NextRequest } from "next/server";
import { embedCardFonts } from "@/lib/banner/server";
import { duolingoCard, isDuolingoTheme } from "@/lib/cards/duolingo";
import { DuolingoUserNotFound, getDuolingoStatus } from "@/lib/duolingo";
import { CACHE, errorSvg, svgResponse } from "@/lib/http";

// Duolingo streak card:
//   /api/duolingo?user=haothiendz&theme=light|orange
//   theme=mascot|light|orange   (mascot is the default)
//   tz=Asia/Ho_Chi_Minh         your time zone, to tell whether today's lesson is done (default UTC)
//   lang=en|vi                  mascot card message
// `streak=` (and `today=0|1`) skip the lookup and draw those values (handy for previews).

const USER = /^[\w.-]{1,40}$/;

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const user = q.get("user") ?? "";
  const t = q.get("theme");
  const theme = isDuolingoTheme(t) ? t : "mascot";
  const lang = q.get("lang") === "vi" ? "vi" : "en";
  const tz = (q.get("tz") ?? "").slice(0, 64) || "UTC";
  const fixed = Number(q.get("streak"));

  if (Number.isInteger(fixed) && fixed >= 0 && q.has("streak"))
    return svgResponse(await embedCardFonts(duolingoCard(Math.min(fixed, 99999), theme, q.get("today") !== "0", lang)), CACHE.static);
  if (!USER.test(user)) return svgResponse(errorSvg("Add ?user=<duolingo username>"), CACHE.none, 400);

  try {
    const { streak, practicedToday } = await getDuolingoStatus(user, tz);
    // Short cache: the mascot should react soon after a lesson.
    return svgResponse(
      await embedCardFonts(duolingoCard(streak, theme, practicedToday, lang)),
      "public, max-age=300, s-maxage=900, stale-while-revalidate=300",
    );
  } catch (err) {
    if (err instanceof DuolingoUserNotFound) return svgResponse(errorSvg(`Duolingo user "${user}" not found`), CACHE.remote, 404);
    console.error("Duolingo card error:", err);
    return svgResponse(errorSvg("Couldn't reach Duolingo, try again later"), CACHE.none, 502);
  }
}
