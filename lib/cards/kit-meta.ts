// Profile kit looks, safe to import from client components (no font metrics).

export type KitTheme = "native" | "clay" | "mono";
export type KitMode = "auto" | "dark" | "light";

export const kitThemes: Record<KitTheme, { label: string; desc: string }> = {
  native: { label: "Native", desc: "GitHub's greys with an amber accent." },
  clay: { label: "Clay", desc: "Warm paper, a serif display face and terracotta." },
  mono: { label: "Mono", desc: "Neutral greys in a double frame." },
};

export const isKitTheme = (s: string | null): s is KitTheme => !!s && s in kitThemes;
