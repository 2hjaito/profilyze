import { findIcon } from "../catalog";
import { parseConfig, type BannerConfig, type BannerElement } from "./schema";

const EMBED_PREFIX = "embed:";

/** Old `?name=&role=&background=&tech=&streaks=&view=&skills=` links, mapped onto the original layout. */
export function legacyToConfig(q: URLSearchParams): BannerConfig {
  const bgParam = q.get("background") ?? "";
  const legacyIcon = (name: string | null) => (name && findIcon(`a:${name}`) ? `a:${name}` : undefined);

  const els: BannerElement[] = [
    {
      id: "name",
      type: "text",
      text: (q.get("name") || "theanishtar").slice(0, 80),
      x: 166,
      y: 94,
      s: 72,
      font: "allerta",
      w: 400,
      color: "#ffffff",
    },
    {
      id: "role",
      type: "text",
      text: (q.get("role") || "FULLSTACK DEVELOPER").slice(0, 80),
      x: 184,
      y: 196,
      s: 28,
      font: "ar-one-sans",
      w: 400,
      color: "#83ebf1",
    },
    { id: "tech", type: "icon", icon: legacyIcon(q.get("tech")) ?? "a:java", x: 836, y: 62, s: 180 },
  ];

  const skills = (q.get("skills") ?? "")
    .split(",")
    .map((s) => legacyIcon(s.trim()))
    .filter((s): s is string => !!s);
  if (skills.length) els.push({ id: "skills", type: "icons", icons: skills, x: 536, y: 186, s: 32, gap: 6 });

  const streak = legacyIcon(q.get("streaks"));
  if (streak)
    els.push({ id: "streak", type: "stat", stat: "streak", icon: streak, x: 168, y: 14, s: 22, font: "ar-one-sans", w: 400, color: "#83ebf1" });

  const view = legacyIcon(q.get("view"));
  if (view)
    els.push({ id: "views", type: "stat", stat: "views", icon: view, x: 300, y: 14, s: 22, font: "ar-one-sans", w: 400, color: "#83ebf1" });

  return parseConfig({
    v: 1,
    user: q.get("user") ?? undefined,
    vk: q.get("vk") ?? undefined,
    bg: bgParam.startsWith(EMBED_PREFIX)
      ? { kind: "url", url: bgParam.slice(EMBED_PREFIX.length) }
      : { kind: "preset", name: bgParam || "thean" },
    dim: 0,
    r: 0,
    els,
  });
}
