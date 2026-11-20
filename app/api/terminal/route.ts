import type { NextRequest } from "next/server";
import { embedMonoFonts } from "@/lib/banner/server";
import { asciiArt } from "@/lib/cards/ascii";
import { modeFrom, parseRows, stopsFrom, terminalCard, type TerminalRow } from "@/lib/cards/terminal";
import { getGithubData, getRepoData, GithubRepoNotFound, GithubUserNotFound } from "@/lib/github/fetch";
import { formatCount, type GithubData, type RepoData } from "@/lib/github/types";
import { CACHE, svgResponse } from "@/lib/http";

// Terminal card, neofetch style:
//   /api/terminal?user=2hjaito
//   /api/terminal?repo=2hjaito/profilyze&palette=ember
// Options:
//   row=Key: value     repeatable, up to 14. {placeholders} fill in live data; *value* highlights.
//   title=...          defaults to "<login>@github" / "<repo>@github"
//   palette=aurora|ember|mint|lagoon|rose|sunset|mono, or colors=hex,hex,hex
//   art=avatar|none    image=<url> uses another picture for the art; invert=1 flips it
//   mode=auto|dark|light  (auto follows the viewer's colour scheme)
//   frame=none|window

const USER = /^[a-zA-Z0-9-]{1,39}$/;
const REPO = /^([a-zA-Z0-9-]{1,39})\/([\w.-]{1,100})$/;
const MAX_ROWS = 14;

const USER_ROWS = [
  "Name: {name}",
  "Repos: {repos}",
  "Stars: {stars}",
  "Commits (last year): {commits}",
  "PRs: {prs}",
  "Followers: {followers}",
  "Contributions: {total}",
  "Longest streak: {longest} days",
  "Languages: {languages}",
];

const REPO_ROWS = [
  "What: {description}",
  "Stars: {stars}",
  "Forks: {forks}",
  "Language: {language}",
  "Topics: {topics}",
  "License: {license}",
];

const count = (n: number | undefined) => (n === undefined ? undefined : formatCount(n));

const userVars = (d: GithubData): Record<string, string | undefined> => ({
  login: d.login,
  name: d.name || d.login,
  followers: count(d.followers),
  repos: count(d.repos),
  stars: count(d.stars),
  commits: count(d.commits),
  prs: count(d.prs),
  issues: count(d.issues),
  contributed: count(d.contributedTo),
  contribs: count(d.contribs),
  total: count(d.total),
  streak: String(d.current.length),
  longest: String(d.longest.length),
  languages: d.languages?.length ? d.languages.slice(0, 4).map((l) => l.name).join(", ") : undefined,
});

const repoVars = (r: RepoData): Record<string, string | undefined> => ({
  name: r.name,
  owner: r.owner,
  full_name: r.fullName,
  description: r.description ?? undefined,
  homepage: r.homepage?.replace(/^https?:\/\//, "") ?? undefined,
  stars: formatCount(r.stars),
  forks: formatCount(r.forks),
  watchers: formatCount(r.watchers),
  issues: formatCount(r.openIssues),
  language: r.language ?? undefined,
  topics: r.topics.length ? r.topics.slice(0, 4).join(" · ") : undefined,
  license: r.license ?? undefined,
});

const clean = (s: string | null, max: number) => (s ?? "").replace(/\s+/g, " ").trim().slice(0, max);

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const user = q.get("user") ?? "";
  const repo = REPO.exec(q.get("repo") ?? "");
  const mode = modeFrom(q);
  const frame = q.get("frame") === "window" ? "window" : "none";
  const stops = stopsFrom(q);
  const specs = q.getAll("row").map((r) => clean(r, 160)).filter(Boolean).slice(0, MAX_ROWS);

  const reply = async (title: string, rows: TerminalRow[], art: string[] | null, cache: string, status = 200) =>
    svgResponse(await embedMonoFonts(terminalCard({ title, rows, art: art ?? [], stops, mode, frame })), cache, status);
  const message = (text: string, cache: string, status: number) =>
    reply("profilyze@terminal", [{ kind: "note", text }], null, cache, status);

  if (!repo && !USER.test(user)) return message("Add ?user=<github username> or ?repo=<owner/name>", CACHE.none, 400);

  try {
    let vars: Record<string, string | undefined>;
    let title: string;
    let avatar: string;
    if (repo) {
      const r = await getRepoData(repo[1], repo[2]);
      vars = repoVars(r);
      title = `${r.name.toLowerCase()}@github`;
      avatar = `${r.ownerAvatarUrl}${r.ownerAvatarUrl.includes("?") ? "&" : "?"}s=160`;
    } else {
      const d = await getGithubData(user);
      vars = userVars(d);
      title = `${d.login}@github`;
      avatar = `${d.avatarUrl}${d.avatarUrl.includes("?") ? "&" : "?"}s=160`;
    }

    const rows = specs.length ? parseRows(specs, vars) : parseRows(repo ? REPO_ROWS : USER_ROWS, vars, true);
    const image = q.get("image");
    const art =
      q.get("art") === "none" ? null : await asciiArt(image && /^https?:\/\//.test(image) ? image : avatar, q.get("invert") === "1");
    return reply(clean(q.get("title"), 48) || title, rows, art, CACHE.live);
  } catch (err) {
    if (err instanceof GithubUserNotFound) return message(`User "${user}" not found`, CACHE.remote, 404);
    if (err instanceof GithubRepoNotFound) return message(`Repository "${repo?.[0]}" not found`, CACHE.remote, 404);
    console.error("Terminal card error:", err);
    return message("Couldn't reach GitHub, try again later", CACHE.none, 502);
  }
}
