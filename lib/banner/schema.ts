import { z } from "zod";
import { AUTHOR } from "../site";

// Banner coordinate space. Everything is laid out in these units and the SVG scales cleanly.
// The width is fixed; the height follows the chosen aspect ratio, from 5:1 up to 16:9 (taller is too much for a README).
export const W = 1000;
export const H = 250;
export const MIN_H = 200;
export const MAX_H = 562.5;
export const RATIOS = [
  { label: "4:1", h: 250 },
  { label: "3:1", h: 333.3 },
  { label: "2:1", h: 500 },
  { label: "16:9", h: 562.5 },
];

const num = (min: number, max: number, fallback: number) =>
  z.number().catch(fallback).transform((n) => Math.min(max, Math.max(min, Math.round(n * 10) / 10)));
const color = (fallback: string) =>
  z
    .string()
    .regex(/^#[0-9a-fA-F]{3,8}$/)
    .catch(fallback);
const str = (max: number, fallback = "") => z.string().catch(fallback).transform((s) => s.slice(0, max));

export const STAT_KEYS = [
  "streak",
  "longest",
  "contribs",
  "total",
  "commits",
  "stars",
  "followers",
  "repos",
  "prs",
  "views",
] as const;
export type StatKey = (typeof STAT_KEYS)[number];

const base = {
  id: str(16, "el"),
  x: num(-W, W * 2, 0),
  y: num(-MAX_H, MAX_H * 2, 0),
  s: num(4, 400, 32), // primary size: font size, icon box, cell size or diameter
  o: num(0, 1, 1).optional(), // opacity
  hidden: z.boolean().optional().catch(undefined),
};

const textEl = z.object({
  ...base,
  type: z.literal("text"),
  text: str(80),
  font: str(32, "inter"),
  w: num(100, 900, 700),
  color: color("#ffffff"),
  ls: num(-0.2, 1, 0).optional(), // letter spacing, em
});

const iconEl = z.object({
  ...base,
  type: z.literal("icon"),
  icon: str(40, "react"),
  inv: z.boolean().optional().catch(undefined),
});

const iconsEl = z.object({
  ...base,
  type: z.literal("icons"),
  icons: z.array(str(40)).max(16).catch([]),
  gap: num(0, 200, 8),
  inv: z.boolean().optional().catch(undefined),
});

const statEl = z.object({
  ...base,
  type: z.literal("stat"),
  stat: z.enum(STAT_KEYS).catch("streak"),
  icon: str(40).optional(), // glyph name, or an icon id
  label: str(30).optional(),
  font: str(32, "inter"),
  w: num(100, 900, 700),
  color: color("#ffffff"),
  accent: color("#83ebf1").optional(),
});

const graphEl = z.object({
  ...base,
  type: z.literal("graph"),
  weeks: num(4, 53, 20),
  color: color("#39d353"),
});

const avatarEl = z.object({
  ...base,
  type: z.literal("avatar"),
  ring: color("#83ebf1").optional(),
});

export const elementSchema = z.discriminatedUnion("type", [textEl, iconEl, iconsEl, statEl, graphEl, avatarEl]);

const bgSchema = z
  .discriminatedUnion("kind", [
    z.object({
      kind: z.literal("preset"),
      name: str(40, "itachi1"),
      // Which part of the image shows (0–100 %, like CSS object-position) and how far it's zoomed in.
      fx: num(0, 100, 50).optional(),
      fy: num(0, 100, 50).optional(),
      zoom: num(1, 4, 1).optional(),
    }),
    z.object({ kind: z.literal("url"), url: str(500) }),
    z.object({
      kind: z.literal("gradient"),
      from: color("#0f172a"),
      to: color("#1e3a8a"),
      angle: num(0, 360, 135),
    }),
  ])
  .catch({ kind: "preset", name: "itachi1" });

const LOGIN = /^[a-zA-Z0-9-]{1,39}$/;

export const configSchema = z.object({
  v: z.literal(1).catch(1),
  user: z
    .string()
    .regex(LOGIN)
    .optional()
    .catch(undefined),
  /** Separate view-counter key (defaults to `user`), e.g. for demos that shouldn't count as profile views. */
  vk: z
    .string()
    .regex(LOGIN)
    .optional()
    .catch(undefined),
  bg: bgSchema,
  h: num(MIN_H, MAX_H, H),
  dim: num(0, 0.9, 0),
  r: num(0, 60, 0),
  els: z
    .array(z.unknown())
    .max(40)
    .catch([])
    // Drop unreadable elements individually instead of rejecting the whole banner.
    .transform((els) => els.flatMap((e) => {
      const r = elementSchema.safeParse(e);
      return r.success ? [r.data] : [];
    })),
});

export type BannerConfig = z.infer<typeof configSchema>;
export type BannerElement = z.infer<typeof elementSchema>;

/** A `u` query param overrides the username inside `c`, so after a GitHub rename only the URL needs editing. */
export const withUser = (config: BannerConfig, u: string | null | undefined): BannerConfig =>
  u && LOGIN.test(u) && u !== config.user ? { ...config, user: u } : config;

/** Query string for banner links, with the username kept readable up front. */
export const bannerQuery = (config: BannerConfig, c: string) => (config.user ? `u=${config.user}&c=${c}` : `c=${c}`);
export type ElementOf<T extends BannerElement["type"]> = Extract<BannerElement, { type: T }>;
export type BannerBackground = BannerConfig["bg"];

export const parseConfig = (input: unknown): BannerConfig => configSchema.parse(input ?? {});

export const DEFAULT_CONFIG: BannerConfig = {
  v: 1,
  user: AUTHOR.github,
  bg: { kind: "preset", name: "itachi1" },
  h: H,
  dim: 0,
  r: 12,
  els: [
    { id: "name", type: "text", text: "TRAN HUU DANG", x: 160, y: 88, s: 64, font: "inter", w: 800, color: "#ffffff" },
    { id: "role", type: "text", text: "FULLSTACK DEVELOPER", x: 164, y: 168, s: 24, font: "inter", w: 600, color: "#83ebf1", ls: 0.12 },
    { id: "tech", type: "icon", icon: "a:java", x: 850, y: 60, s: 140 },
    { id: "skills", type: "icons", icons: ["a:angular", "a:vuejs", "a:reactjs", "a:nodejs"], x: 540, y: 160, s: 34, gap: 10 },
    { id: "streak", type: "stat", stat: "streak", icon: "a:fire", label: "day streak", x: 164, y: 30, s: 20, font: "inter", w: 700, color: "#ffffff", accent: "#ff9640" },
    { id: "views", type: "stat", stat: "views", icon: "a:sharingan", label: "views", x: 344, y: 30, s: 20, font: "inter", w: 700, color: "#ffffff", accent: "#83ebf1" },
    { id: "contribs", type: "stat", stat: "contribs", icon: "activity", label: "contributions", x: 471, y: 30, s: 20, font: "inter", w: 700, color: "#ffffff", accent: "#39d353" },
  ],
};
