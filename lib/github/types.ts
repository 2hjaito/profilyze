export type ContributionDay = { date: string; count: number; level: 0 | 1 | 2 | 3 | 4 };

export type Streak = { length: number; start?: string; end?: string };

export type GithubData = {
  login: string;
  name: string | null;
  avatarUrl: string;
  // Only available with a GITHUB_TOKEN (GraphQL); undefined otherwise.
  followers?: number;
  repos?: number;
  stars?: number;
  commits?: number; // commits in the last year
  prs?: number;
  issues?: number;
  contributedTo?: number;
  languages?: { name: string; color: string; size: number }[];
  // Always available (GraphQL or the public contributions page).
  calendar: ContributionDay[]; // rolling last year, oldest first
  contribs: number; // last year
  total: number; // all time
  current: Streak;
  longest: Streak;
};

export function formatCount(n: number | undefined): string {
  if (n === undefined) return "—";
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${+(n / 1000).toFixed(1)}k`;
  return n.toLocaleString("en-US");
}
