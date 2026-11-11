// Social / link badges ("Discord · Join server") in the Profilyze look. Pure SVG; Inter is
// injected by embedCardFonts. Icons come from react-icons, flattened to raw SVG paths.

import type { IconType } from "react-icons";
import {
  FaDiscord,
  FaEnvelope,
  FaFacebook,
  FaGithub,
  FaGlobe,
  FaInstagram,
  FaLinkedin,
  FaMugHot,
  FaReddit,
  FaTelegram,
  FaTiktok,
  FaTwitch,
  FaXTwitter,
  FaYoutube,
} from "react-icons/fa6";
import { escapeXml as esc } from "../banner/render";

type Platform = { name: string; icon: IconType; color: string; value: string; href?: (v: string) => string };

export const platforms = {
  discord: { name: "Discord", icon: FaDiscord, color: "#5865F2", value: "Join server" },
  github: { name: "GitHub", icon: FaGithub, color: "#ededef", value: "Follow", href: (v) => `https://github.com/${v}` },
  x: { name: "X", icon: FaXTwitter, color: "#ededef", value: "Follow", href: (v) => `https://x.com/${v}` },
  linkedin: { name: "LinkedIn", icon: FaLinkedin, color: "#0A66C2", value: "Connect", href: (v) => `https://www.linkedin.com/in/${v}` },
  youtube: { name: "YouTube", icon: FaYoutube, color: "#FF0033", value: "Subscribe", href: (v) => `https://youtube.com/@${v}` },
  twitch: { name: "Twitch", icon: FaTwitch, color: "#9146FF", value: "Watch live", href: (v) => `https://twitch.tv/${v}` },
  telegram: { name: "Telegram", icon: FaTelegram, color: "#26A5E4", value: "Join channel", href: (v) => `https://t.me/${v}` },
  reddit: { name: "Reddit", icon: FaReddit, color: "#FF4500", value: "Join", href: (v) => `https://reddit.com/r/${v}` },
  facebook: { name: "Facebook", icon: FaFacebook, color: "#0866FF", value: "Follow", href: (v) => `https://facebook.com/${v}` },
  instagram: { name: "Instagram", icon: FaInstagram, color: "#E4405F", value: "Follow", href: (v) => `https://instagram.com/${v}` },
  tiktok: { name: "TikTok", icon: FaTiktok, color: "#FE2C55", value: "Follow", href: (v) => `https://tiktok.com/@${v}` },
  coffee: { name: "Buy me a coffee", icon: FaMugHot, color: "#FFDD00", value: "Support" },
  website: { name: "Website", icon: FaGlobe, color: "#83ebf1", value: "Visit" },
  email: { name: "Email", icon: FaEnvelope, color: "#EA4335", value: "Say hi", href: (v) => `mailto:${v}` },
} satisfies Record<string, Platform>;

export type SocialPlatform = keyof typeof platforms;
export const isSocialPlatform = (s: string | null): s is SocialPlatform => !!s && s in platforms;

export type SocialTheme = "profilyze" | "brand" | "outline" | "light";
export const socialThemes: Record<SocialTheme, { label: string; desc: string }> = {
  profilyze: { label: "Profilyze", desc: "Graphite and cyan, matching the Profilyze users badge." },
  brand: { label: "Brand", desc: "Graphite label, value in the platform's own color." },
  outline: { label: "Outline", desc: "Dark glass with a thin glowing border." },
  light: { label: "Light", desc: "White card for light READMEs." },
};
export const isSocialTheme = (s: string | null): s is SocialTheme => !!s && s in socialThemes;

export type SocialOptions = { platform: SocialPlatform; label: string; value: string; theme: SocialTheme };

const H = 22;
const PAD = 8;
const ICON = 12;
const FONT = `font-family="Inter, -apple-system, 'Segoe UI', sans-serif"`;

// Rough Inter advance widths (em), enough to size the badge without measuring.
const em = (ch: string) =>
  /[iljI.,:;'|!]/.test(ch) ? 0.28 : ch === " " ? 0.27 : /[mwMW]/.test(ch) ? 0.86 : /[A-Z]/.test(ch) ? 0.68 : /[0-9#@]/.test(ch) ? 0.62 : 0.56;
const textWidth = (s: string, px: number, spacing = 0) => [...s].reduce((w, ch) => w + em(ch) * px + spacing, 0);

/** Pick readable text for a fill: dark on bright colors (coffee yellow, cyan), white otherwise. */
function onColor(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? "#0b0b0e" : "#ffffff";
}

type Node = { type: unknown; props: Record<string, unknown> & { children?: unknown } };

/** Flattens a react-icons component into raw SVG children, scaled into a size×size box at (x, y). */
function iconSvg(icon: IconType, x: number, y: number, size: number, fill: string) {
  const root = icon({}) as unknown as Node;
  const [, , vw, vh] = String((root.props.attr as { viewBox?: string })?.viewBox ?? "0 0 24 24")
    .split(/\s+/)
    .map(Number);
  const s = size / Math.max(vw, vh);
  const dx = x + (size - vw * s) / 2;
  const dy = y + (size - vh * s) / 2;
  const walk = (c: unknown): string => {
    if (Array.isArray(c)) return c.map(walk).join("");
    if (!c || typeof c !== "object" || typeof (c as Node).type !== "string") return "";
    const { children, ...attrs } = (c as Node).props;
    const a = Object.entries(attrs)
      .filter(([, v]) => typeof v === "string" || typeof v === "number")
      .map(([k, v]) => ` ${k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}="${esc(String(v))}"`)
      .join("");
    return `<${(c as Node).type}${a}>${walk(children)}</${(c as Node).type}>`;
  };
  return `<g transform="translate(${dx.toFixed(2)} ${dy.toFixed(2)}) scale(${s.toFixed(5)})" fill="${fill}">${walk(root.props.children)}</g>`;
}

type Look = { bg: string; border?: string; icon: string; label: string; valueBg?: string; value: string; divider?: string };

function look(theme: SocialTheme, color: string): Look {
  switch (theme) {
    case "brand":
      return { bg: "#18181c", icon: color, label: "#ededef", valueBg: color, value: onColor(color) };
    case "outline":
      return { bg: "#0d0d10", border: color, icon: color, label: "#ededef", value: color, divider: color };
    case "light": {
      // Near-white brand colors (GitHub, X) vanish on white, so fall back to ink.
      const ink = onColor(color) === "#0b0b0e" && color !== "#FFDD00" ? "#1f2328" : color;
      return { bg: "#ffffff", border: "#d0d7de", icon: ink, label: "#1f2328", value: "#656d76", divider: "#d0d7de" };
    }
    default:
      return { bg: "#18181c", icon: "#83ebf1", label: "#ededef", valueBg: "#83ebf1", value: "#0b2a2d" };
  }
}

export function socialBadge(o: SocialOptions) {
  const p = platforms[o.platform];
  const label = o.label.toUpperCase();
  const L = look(o.theme, p.color);
  const labelX = PAD + ICON + 6;
  const lw = Math.ceil(labelX + textWidth(label, 9, 0.8) + PAD);
  const vw = o.value ? Math.ceil(textWidth(o.value, 10) + PAD * 2) : 0;
  const w = lw + vw;
  const aria = [o.label, o.value].filter(Boolean).join(": ");
  const bw = L.border ? 1 : 0;
  const frame = `x="${bw / 2}" y="${bw / 2}" width="${w - bw}" height="${H - bw}" rx="6"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${H}" viewBox="0 0 ${w} ${H}" role="img" aria-label="${esc(aria)}" ${FONT}>
<title>${esc(aria)}</title>
<style></style>
<defs><clipPath id="r"><rect width="${w}" height="${H}" rx="6"/></clipPath>
<linearGradient id="sh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".09"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
<g clip-path="url(#r)">
<rect width="${w}" height="${H}" fill="${L.bg}"/>
${L.valueBg && vw ? `<rect x="${lw}" width="${vw}" height="${H}" fill="${L.valueBg}"/>` : ""}
${o.theme === "light" ? "" : `<rect width="${w}" height="${H}" fill="url(#sh)"/>`}
</g>
${L.border ? `<rect ${frame} fill="none" stroke="${L.border}" stroke-opacity="${o.theme === "outline" ? 0.7 : 1}"/>` : ""}
${L.divider && vw ? `<line x1="${lw}" y1="5" x2="${lw}" y2="${H - 5}" stroke="${L.divider}" stroke-opacity=".45"/>` : ""}
${iconSvg(p.icon, PAD, (H - ICON) / 2, ICON, L.icon)}
<text x="${labelX}" y="14.2" font-size="9" font-weight="600" letter-spacing=".8" fill="${L.label}">${esc(label)}</text>
${vw ? `<text x="${lw + vw / 2}" y="14.6" font-size="10" font-weight="700" text-anchor="middle" fill="${L.value}">${esc(o.value)}</text>` : ""}
</svg>`;
}
