import "server-only";
import { REPO_URL } from "../site";

const TOKEN = process.env.GITHUB_TOKEN || process.env.TOKEN_GITHUB;

/** Stargazers of this project's repository, refreshed hourly (ISR); undefined if GitHub can't be reached. */
export async function repoStars(): Promise<number | undefined> {
  const repo = new URL(REPO_URL).pathname.replace(/^\/|\/$/g, "");
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}`, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "profilyze",
        ...(TOKEN ? { Authorization: `bearer ${TOKEN}` } : {}),
      },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return undefined;
    const { stargazers_count } = (await res.json()) as { stargazers_count?: number };
    return typeof stargazers_count === "number" ? stargazers_count : undefined;
  } catch {
    return undefined;
  }
}
