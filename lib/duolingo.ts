import "server-only";

export class DuolingoUserNotFound extends Error {}

export type DuolingoStatus = { streak: number; practicedToday: boolean };

/** Today's date (YYYY-MM-DD) in an IANA time zone; UTC if the zone is unknown. */
export function todayIn(tz: string) {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

/** Current hour (0-23) in an IANA time zone; UTC if the zone is unknown. */
export function hourIn(tz: string) {
  try {
    return Number(new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hourCycle: "h23" }).format(new Date()));
  } catch {
    return new Date().getUTCHours();
  }
}

/**
 * Current streak and whether today's lesson is done. `streakData.currentStreak.length` is the live
 * value (`streak` can lag); the streak's endDate is the last day with a lesson, so endDate >= today
 * means the streak is already extended today.
 */
export async function getDuolingoStatus(username: string, tz = "UTC"): Promise<DuolingoStatus> {
  const res = await fetch(`https://www.duolingo.com/2017-06-30/users?username=${encodeURIComponent(username)}`, {
    headers: { "User-Agent": "profilyze", Accept: "application/json" },
    next: { revalidate: 600 },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Duolingo responded ${res.status}`);
  const data = (await res.json()) as {
    users?: { streak?: number; streakData?: { currentStreak?: { length?: number; endDate?: string } | null } }[];
  };
  const u = data.users?.[0];
  if (!u) throw new DuolingoUserNotFound(username);
  const current = u.streakData?.currentStreak;
  const streak = current?.length ?? u.streak ?? 0;
  return { streak, practicedToday: streak > 0 && !!current?.endDate && current.endDate >= todayIn(tz) };
}
