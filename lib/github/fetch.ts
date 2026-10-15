import "server-only";
import type { ContributionDay, GithubData, Streak } from "./types";

export class GithubUserNotFound extends Error {}

const TOKEN = process.env.GITHUB_TOKEN || process.env.TOKEN_GITHUB;
const TTL = 60 * 60 * 1000;
const cache = new Map<string, { at: number; data: Promise<GithubData> }>();

/** Cached per instance for an hour; concurrent requests for the same user share one fetch. */
export function getGithubData(login: string): Promise<GithubData> {
  const key = login.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.data;

  // A bad or rate-limited token shouldn't take banners down: fall back to the public pages.
  const data = TOKEN
    ? fetchGraphql(login, TOKEN).catch((err) => {
        if (err instanceof GithubUserNotFound) throw err;
        console.warn("GitHub GraphQL failed, using public pages:", err.message);
        return fetchPublic(login);
      })
    : fetchPublic(login);
  data.catch(() => cache.delete(key));
  cache.set(key, { at: Date.now(), data });
  return data;
}

// ---------- streaks ----------

export function computeStreaks(days: ContributionDay[]): { current: Streak; longest: Streak } {
  // Calendar dates follow the user's timezone, so "today" may be up to a day ahead of UTC.
  const todayUtc = new Date().toISOString().slice(0, 10);
  const horizon = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const sorted = days.filter((d) => d.date <= horizon).sort((a, b) => a.date.localeCompare(b.date));

  let longest: Streak = { length: 0 };
  let run: Streak = { length: 0 };
  for (let i = 0; i < sorted.length; i++) {
    const d = sorted[i];
    if (d.count === 0) {
      run = { length: 0 };
      continue;
    }
    const extends_ = run.length > 0 && dayDiff(sorted[i - 1].date, d.date) === 1;
    run = extends_ ? { ...run, length: run.length + 1, end: d.date } : { length: 1, start: d.date, end: d.date };
    if (run.length > longest.length) longest = run;
  }

  // Walk back from the latest day. Zero days from today on are "not yet" and don't break the streak.
  let i = sorted.length - 1;
  while (i >= 0 && sorted[i].count === 0 && sorted[i].date >= todayUtc) i--;
  let current: Streak = { length: 0 };
  for (; i >= 0 && sorted[i].count > 0; i--) {
    if (current.start && dayDiff(sorted[i].date, current.start) !== 1) break;
    current = { length: current.length + 1, start: sorted[i].date, end: current.end ?? sorted[i].date };
  }
  return { current, longest };
}

const dayDiff = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

// ---------- GraphQL (with token) ----------

const LEVELS: Record<string, ContributionDay["level"]> = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
};

type GqlCalendar = {
  totalContributions: number;
  weeks: { contributionDays: { date: string; contributionCount: number; contributionLevel: string }[] }[];
};

async function gql<T>(token: string, query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${token}`, "Content-Type": "application/json", "User-Agent": "profilyze" },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`GitHub GraphQL ${res.status}`);
  const json = await res.json();
  if (json.errors?.some((e: { type?: string }) => e.type === "NOT_FOUND")) throw new GithubUserNotFound();
  if (json.errors) throw new Error(json.errors[0]?.message ?? "GitHub GraphQL error");
  return json.data;
}

const CALENDAR_FIELDS = `contributionCalendar { totalContributions weeks { contributionDays { date contributionCount contributionLevel } } }`;

const MAIN_QUERY = `query($login: String!) {
  user(login: $login) {
    login name avatarUrl
    followers { totalCount }
    pullRequests { totalCount }
    issues { totalCount }
    repositoriesContributedTo(contributionTypes: [COMMIT, PULL_REQUEST, ISSUE, REPOSITORY]) { totalCount }
    repositories(ownerAffiliations: OWNER, isFork: false, first: 100, orderBy: {field: STARGAZERS, direction: DESC}) {
      totalCount
      nodes { stargazerCount languages(first: 10, orderBy: {field: SIZE, direction: DESC}) { edges { size node { name color } } } }
    }
    contributionsCollection { totalCommitContributions restrictedContributionsCount contributionYears ${CALENDAR_FIELDS} }
  }
}`;

type MainResult = {
  user: {
    login: string;
    name: string | null;
    avatarUrl: string;
    followers: { totalCount: number };
    pullRequests: { totalCount: number };
    issues: { totalCount: number };
    repositoriesContributedTo: { totalCount: number };
    repositories: {
      totalCount: number;
      nodes: {
        stargazerCount: number;
        languages: { edges: { size: number; node: { name: string; color: string | null } }[] };
      }[];
    };
    contributionsCollection: {
      totalCommitContributions: number;
      restrictedContributionsCount: number;
      contributionYears: number[];
      contributionCalendar: GqlCalendar;
    };
  } | null;
};

const flatten = (cal: GqlCalendar): ContributionDay[] =>
  cal.weeks.flatMap((w) =>
    w.contributionDays.map((d) => ({ date: d.date, count: d.contributionCount, level: LEVELS[d.contributionLevel] ?? 0 })),
  );

async function fetchGraphql(login: string, token: string): Promise<GithubData> {
  const { user } = await gql<MainResult>(token, MAIN_QUERY, { login });
  if (!user) throw new GithubUserNotFound();
  const cc = user.contributionsCollection;

  // One aliased query for every contribution year, for all-time totals and streaks.
  const years = cc.contributionYears;
  const yearsQuery = `query($login: String!) { user(login: $login) { ${years
    .map((y) => `y${y}: contributionsCollection(from: "${y}-01-01T00:00:00Z", to: "${y}-12-31T23:59:59Z") { ${CALENDAR_FIELDS} }`)
    .join(" ")} } }`;
  const yearly = years.length
    ? (await gql<{ user: Record<string, { contributionCalendar: GqlCalendar }> }>(token, yearsQuery, { login })).user
    : {};

  const allDays = new Map<string, ContributionDay>();
  let total = 0;
  for (const y of Object.values(yearly)) {
    total += y.contributionCalendar.totalContributions;
    for (const d of flatten(y.contributionCalendar)) allDays.set(d.date, d);
  }
  const calendar = flatten(cc.contributionCalendar);
  for (const d of calendar) allDays.set(d.date, d);

  const langs = new Map<string, { name: string; color: string; size: number }>();
  for (const repo of user.repositories.nodes)
    for (const e of repo.languages.edges) {
      const l = langs.get(e.node.name) ?? { name: e.node.name, color: e.node.color ?? "#8b949e", size: 0 };
      l.size += e.size;
      langs.set(e.node.name, l);
    }

  return {
    login: user.login,
    name: user.name,
    avatarUrl: user.avatarUrl,
    followers: user.followers.totalCount,
    repos: user.repositories.totalCount,
    stars: user.repositories.nodes.reduce((n, r) => n + r.stargazerCount, 0),
    commits: cc.totalCommitContributions + cc.restrictedContributionsCount,
    prs: user.pullRequests.totalCount,
    issues: user.issues.totalCount,
    contributedTo: user.repositoriesContributedTo.totalCount,
    languages: [...langs.values()].sort((a, b) => b.size - a.size),
    calendar,
    contribs: cc.contributionCalendar.totalContributions,
    total: total || cc.contributionCalendar.totalContributions,
    ...computeStreaks([...allDays.values()]),
  };
}

// ---------- public pages (no token) ----------

const UA = { "User-Agent": "Mozilla/5.0 (compatible; profilyze)" };

async function scrapeCalendar(login: string, year?: number): Promise<ContributionDay[]> {
  const qs = year ? `?from=${year}-01-01&to=${year}-12-31` : "";
  const res = await fetch(`https://github.com/users/${encodeURIComponent(login)}/contributions${qs}`, {
    headers: UA,
    signal: AbortSignal.timeout(8000),
  });
  if (res.status === 404) throw new GithubUserNotFound();
  if (!res.ok) throw new Error(`GitHub contributions ${res.status}`);
  const html = await res.text();

  const counts = new Map<string, number>();
  for (const m of html.matchAll(/<tool-tip[^>]*\bfor="([^"]+)"[^>]*>([^<]*)</g)) {
    const n = /^(\d[\d,]*) contribution/.exec(m[2].trim());
    counts.set(m[1], n ? Number(n[1].replace(/,/g, "")) : 0);
  }
  const days: ContributionDay[] = [];
  for (const m of html.matchAll(/<td\b[^>]*ContributionCalendar-day[^>]*>/g)) {
    const tag = m[0];
    const date = /data-date="([^"]+)"/.exec(tag)?.[1];
    const id = /\bid="([^"]+)"/.exec(tag)?.[1];
    const level = Number(/data-level="(\d)"/.exec(tag)?.[1] ?? 0) as ContributionDay["level"];
    if (date) days.push({ date, level, count: (id && counts.get(id)) || (level > 0 ? 1 : 0) });
  }
  return days.sort((a, b) => a.date.localeCompare(b.date));
}

async function fetchPublic(login: string): Promise<GithubData> {
  const thisYear = new Date().getUTCFullYear();
  const [calendar, profile, ...years] = await Promise.all([
    scrapeCalendar(login),
    // Unauthenticated REST is rate limited (60/h per IP), so it's best effort.
    fetch(`https://api.github.com/users/${encodeURIComponent(login)}`, { headers: UA, signal: AbortSignal.timeout(4000) })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null),
    ...[0, 1, 2, 3, 4].map((k) => scrapeCalendar(login, thisYear - k).catch(() => [] as ContributionDay[])),
  ]);

  const allDays = new Map<string, ContributionDay>();
  for (const d of years.flat()) allDays.set(d.date, d);
  for (const d of calendar) allDays.set(d.date, d);
  const sum = (ds: ContributionDay[]) => ds.reduce((n, d) => n + d.count, 0);

  return {
    login: profile?.login ?? login,
    name: profile?.name ?? null,
    avatarUrl: profile?.avatar_url ?? `https://github.com/${encodeURIComponent(login)}.png`,
    followers: profile?.followers,
    repos: profile?.public_repos,
    calendar,
    contribs: sum(calendar),
    total: sum(years.flat()),
    ...computeStreaks([...allDays.values()]),
  };
}

