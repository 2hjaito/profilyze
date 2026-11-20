import type { NextRequest } from "next/server";
import { avatarUrl, deviconHref, embedFonts, fetchCardImage } from "@/lib/banner/server";
import { vectorIcons } from "@/lib/catalog";
import { kitLookFrom, param, textParam } from "@/lib/cards/kit";
import {
  buttonCard,
  contributionsCard,
  headerCard,
  labelCard,
  numbersCard,
  projectCard,
  radarCard,
  stackCard,
  type NumberItem,
  type Pill,
  type ProjectSize,
  type RadarAxis,
  type Rendered,
} from "@/lib/cards/kit-cards";
import { getGithubData, getRepoData, GithubRepoNotFound, GithubUserNotFound } from "@/lib/github/fetch";
import { formatCount, type GithubData } from "@/lib/github/types";
import { CACHE, errorSvg, svgResponse } from "@/lib/http";

// Profile kit cards: one design language for a whole README, in three looks.
// Every card takes theme=native|clay|mono, mode=auto|dark|light and accent=<hex>.
//
//   /api/kit/header?name=Dang&role=Fullstack+developer&bio=...&eyebrow=...&link=dang.dev&user=2hjaito&avatar=1
//   /api/kit/label?text=Projects&num=01&icon=folder
//   /api/kit/button?label=Portfolio&icon=globe
//   /api/kit/project?size=feature|half|small&repo=owner/name&image=og|<url>&title=&tagline=&desc=&eyebrow=&num=&meta=&status=&tags=a,b
//   /api/kit/numbers?item=7+yrs|building+and+running+production+systems&item={stars}|stars+on+GitHub&user=2hjaito
//   /api/kit/stack?group=Backend|Services+that+stay+up|java,spring,postgresql&also=docker,git&also_label=Also+in+the+toolbox
//   /api/kit/contributions?user=2hjaito
//   /api/kit/radar?title=My+Interests&data=DeFi:5,PayFi:3,DAOs:8&max=10   (or ?user= for language shares)

const USER = /^[a-zA-Z0-9-]{1,39}$/;
const REPO = /^([a-zA-Z0-9-]{1,39})\/([\w.-]{1,100})$/;

type Handler = (q: URLSearchParams) => Promise<{ card: Rendered; cache: string }>;

class BadRequest extends Error {}

const list = (s: string, max: number) =>
  s
    .split(",")
    .map((x) => x.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, max);

const domain = (url: string) => url.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");

async function githubFor(q: URLSearchParams, required: boolean): Promise<GithubData | null> {
  const user = q.get("user") ?? "";
  if (!USER.test(user)) {
    if (required) throw new BadRequest("Add ?user=<github username>");
    return null;
  }
  return getGithubData(user);
}

/** A logo by id ("csharp") or name ("C#"); anything else becomes a text-only pill. */
async function pill(name: string): Promise<Pill> {
  const key = name.toLowerCase();
  const known = vectorIcons.find((i) => i.id === key || i.label.toLowerCase() === key);
  if (known) {
    const href = await deviconHref(known.id);
    return { label: known.label, icon: href ?? undefined, invert: known.dark };
  }
  return { label: name.slice(0, 32) };
}

const cards: Record<string, Handler> = {
  async header(q) {
    const look = kitLookFrom(q);
    const github = await githubFor(q, false).catch(() => null);
    const avatar = q.get("avatar") === "1" && github ? await fetchCardImage(avatarUrl(github, 360), 360) : null;
    const now = new Date();
    const start = Date.UTC(now.getUTCFullYear(), 0, 1);
    const year = (now.getTime() - start) / (Date.UTC(now.getUTCFullYear() + 1, 0, 1) - start);
    const card = headerCard(look, {
      name: param(q, "name", 60) || github?.name || github?.login || "Your name",
      role: param(q, "role", 90),
      bio: textParam(q, "bio", 320),
      eyebrow: param(q, "eyebrow", 60),
      link: param(q, "link", 60),
      avatar: avatar ?? undefined,
      year,
    });
    // The native wave tracks the year, so it is redrawn daily.
    return { card, cache: github || look.theme === "native" ? CACHE.remote : CACHE.static };
  },

  async label(q) {
    const text = param(q, "text", 80);
    if (!text) throw new BadRequest("Add ?text=<section title>");
    return { card: labelCard(kitLookFrom(q), { text, num: param(q, "num", 8), icon: param(q, "icon", 20) }), cache: CACHE.static };
  },

  async button(q) {
    const label = param(q, "label", 40);
    if (!label) throw new BadRequest("Add ?label=<text>");
    return { card: buttonCard(kitLookFrom(q), { label, icon: param(q, "icon", 20) }), cache: CACHE.static };
  },

  async project(q) {
    const look = kitLookFrom(q);
    const size = (["feature", "half", "small"].includes(q.get("size") ?? "") ? q.get("size") : "half") as ProjectSize;
    const repoMatch = REPO.exec(q.get("repo") ?? "");
    const repo = repoMatch ? await getRepoData(repoMatch[1], repoMatch[2]) : null;
    const imageParam = q.get("image") ?? "";
    const imageUrl =
      imageParam === "og" && repoMatch ? `https://opengraph.githubassets.com/1/${repoMatch[1]}/${repoMatch[2]}` : /^https?:\/\//.test(imageParam) ? imageParam : "";
    const image = imageUrl && size !== "small" ? await fetchCardImage(imageUrl, size === "feature" ? 800 : 880) : null;
    const tags = q.has("tags") ? list(q.get("tags") ?? "", 14) : repo ? [repo.language, ...repo.topics].filter((t): t is string => Boolean(t)).slice(0, 6) : [];
    const card = projectCard(look, {
      size,
      title: param(q, "title", 60) || repo?.name || "Project",
      tagline: param(q, "tagline", 120),
      desc: textParam(q, "desc", 400) || repo?.description || "",
      eyebrow: q.has("eyebrow") ? param(q, "eyebrow", 60) : repo ? domain(repo.homepage ?? repo.fullName) : "",
      num: param(q, "num", 6),
      meta: q.has("meta") ? param(q, "meta", 40) : repo ? `★ ${formatCount(repo.stars)}` : "",
      status: param(q, "status", 60),
      tags,
      image: image ?? undefined,
      reserve: q.get("reserve") === "1",
    });
    return { card, cache: repo || image ? CACHE.remote : CACHE.static };
  },

  async numbers(q) {
    const github = await githubFor(q, false);
    const vars: Record<string, string> = github
      ? {
          repos: formatCount(github.repos),
          stars: formatCount(github.stars),
          followers: formatCount(github.followers),
          commits: formatCount(github.commits),
          prs: formatCount(github.prs),
          contribs: formatCount(github.contribs),
          total: formatCount(github.total),
          streak: String(github.current.length),
          longest: String(github.longest.length),
          languages: String(github.languages?.length ?? "—"),
        }
      : {};
    const fill = (s: string) => s.replace(/\{([a-z]+)\}/g, (m, k: string) => vars[k] ?? (github ? "—" : m));
    let specs = q.getAll("item").slice(0, 4);
    if (!specs.length && github)
      // Contributions and streaks have their own card, so the defaults leave them out.
      specs = ["{stars}|stars on GitHub", "{repos}|public repositories", "{followers}|followers", "{prs}|pull requests"];
    if (!specs.length) throw new BadRequest("Add ?item=<value>|<label> (up to 4)");
    const items: NumberItem[] = specs.map((s) => {
      const [value, ...rest] = s.split("|");
      return { value: fill(value.trim()).slice(0, 16), label: fill(rest.join("|").trim()).slice(0, 80) };
    });
    return { card: numbersCard(kitLookFrom(q), items), cache: github ? CACHE.live : CACHE.static };
  },

  async stack(q) {
    const groups = await Promise.all(
      q
        .getAll("group")
        .slice(0, 4)
        .map(async (g) => {
          const [title = "", desc = "", ids = ""] = g.split("|");
          return { title: title.trim().slice(0, 60), desc: desc.trim().slice(0, 200), items: await Promise.all(list(ids, 16).map(pill)) };
        }),
    );
    const also = await Promise.all(list(q.get("also") ?? "", 40).map(pill));
    if (!groups.length && !also.length) throw new BadRequest("Add ?group=<title>|<description>|<ids> or ?also=<ids>");
    return { card: stackCard(kitLookFrom(q), groups, also, param(q, "also_label", 60)), cache: CACHE.static };
  },

  async contributions(q) {
    const github = (await githubFor(q, true))!;
    return { card: contributionsCard(kitLookFrom(q), github), cache: CACHE.live };
  },

  async radar(q) {
    const max = Math.min(1000, Math.max(1, Number(q.get("max")) || 10));
    let axes: RadarAxis[] = list(q.get("data") ?? "", 12).map((d) => {
      const i = d.lastIndexOf(":");
      return i < 0 ? { label: d, value: 0 } : { label: d.slice(0, i).trim().slice(0, 24), value: Number(d.slice(i + 1)) || 0 };
    });
    let title = param(q, "title", 60);
    let cache = CACHE.static;
    if (!axes.length) {
      const github = await githubFor(q, false);
      const langs = github?.languages?.slice(0, 8) ?? [];
      if (langs.length < 3) throw new BadRequest(github ? "Not enough languages to draw" : "Add ?data=<label>:<value>,… (3 to 12)");
      const top = langs[0].size;
      // Square root, so one dominant language still leaves the others a visible shape.
      axes = langs.map((l) => ({ label: l.name, value: Math.sqrt(l.size / top) * max }));
      if (!q.has("title")) title = "Top languages";
      cache = CACHE.live;
    }
    if (axes.length < 3) throw new BadRequest("A radar needs at least 3 values");
    return { card: radarCard(kitLookFrom(q), title, axes, max), cache };
  },
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ card: string }> }) {
  const { card } = await params;
  const handler = cards[card];
  if (!handler) return svgResponse(errorSvg(`Unknown card "${card.slice(0, 20)}"`), CACHE.none, 404);
  try {
    const { card: out, cache } = await handler(req.nextUrl.searchParams);
    return svgResponse(await embedFonts(out.svg, out.faces), cache);
  } catch (err) {
    if (err instanceof BadRequest) return svgResponse(errorSvg(err.message), CACHE.none, 400);
    if (err instanceof GithubUserNotFound) return svgResponse(errorSvg("GitHub user not found"), CACHE.remote, 404);
    if (err instanceof GithubRepoNotFound) return svgResponse(errorSvg("Repository not found"), CACHE.remote, 404);
    console.error(`Kit card "${card}" error:`, err);
    return svgResponse(errorSvg("Couldn't reach GitHub, try again later"), CACHE.none, 502);
  }
}
