"use client";

import { marked } from "marked";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FiArrowDown, FiArrowUp, FiCheck, FiCopy, FiDownload, FiEdit2, FiPlus, FiTrash2, FiUser, FiX } from "react-icons/fi";
import { encodeConfig } from "@/lib/banner/codec";
import { bannerQuery, DEFAULT_CONFIG, parseConfig, type BannerConfig } from "@/lib/banner/schema";
import { kitThemes } from "@/lib/cards/kit-meta";
import { themes } from "@/lib/cards/render";
import { palettes } from "@/lib/cards/terminal";
import { vectorIcons } from "@/lib/catalog";
import { dicts, sectionText, type Dict, type Lang, type SectionId } from "@/lib/readme/i18n";
import {
  ALL_SECTIONS,
  applyTemplate,
  findTemplate,
  INITIAL,
  NEW_PROJECT,
  normalizeState,
  templates,
  type CardMode,
  type KitStyle,
  type Links,
  type Project,
  type ReadmeState,
  type Sketch,
} from "@/lib/readme/templates";
import { logoColor, shieldText, stackBadges } from "@/lib/shields";
import { AUTHOR, SITE_URL } from "@/lib/site";
import IconPicker from "./editor/IconPicker";
import { ColorField, Field, IconButton, inputCls, Panel, Segmented, Select, Toggle } from "./editor/ui";
import ConfirmDialog from "./ConfirmDialog";
import { usePersistentState } from "./usePersistentState";

const DRAFT_KEY = "profilyze:draft";
const LANG_KEY = "profilyze:lang";

const BADGES: { key: keyof Links; label: string; color: string; logo: string; href: (v: string) => string }[] = [
  { key: "website", label: "Website", color: "0f172a", logo: "googlechrome", href: (v) => (/^https?:\/\//.test(v) ? v : `https://${v}`) },
  { key: "github", label: "GitHub", color: "181717", logo: "github", href: (v) => `https://github.com/${v}` },
  { key: "linkedin", label: "LinkedIn", color: "0A66C2", logo: "linkedin", href: (v) => `https://www.linkedin.com/in/${v}` },
  { key: "x", label: "X", color: "000000", logo: "x", href: (v) => `https://x.com/${v}` },
  { key: "youtube", label: "YouTube", color: "FF0000", logo: "youtube", href: (v) => `https://www.youtube.com/@${v.replace(/^@/, "")}` },
  { key: "email", label: "Email", color: "EA4335", logo: "gmail", href: (v) => `mailto:${v}` },
];

const PALETTE_OPTIONS = Object.entries(palettes).map(([value, p]) => ({ value, label: p.label }));
const KIT_ACCENTS: Record<string, string> = { native: "#fbbf24", clay: "#d2683f", mono: "#e4e4e7" };

/** Query string for the terminal / hexdump / activity cards; mode is left out when it follows the viewer. */
function cardQuery(params: [string, string][], mode: CardMode) {
  const p = new URLSearchParams(params.filter(([, v]) => v));
  if (mode !== "auto") p.set("mode", mode);
  return p.toString();
}

const lines = (s: string) =>
  s
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

/** The banner from the editor's saved draft (or the default), with this README's username. */
function useBannerQs(user: string) {
  const [qs, setQs] = useState("");
  useEffect(() => {
    let alive = true;
    let config: BannerConfig = DEFAULT_CONFIG;
    try {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) config = parseConfig(JSON.parse(draft));
    } catch {
      /* use default */
    }
    const banner = { ...config, user: user || config.user, vk: undefined };
    encodeConfig(banner).then((e) => alive && setQs(bannerQuery(banner, e)));
    return () => {
      alive = false;
    };
  }, [user]);
  return qs;
}

/** UI language: saved choice, else the browser's (Vietnamese or English). */
function useLang() {
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LANG_KEY);
      if (saved === "en" || saved === "vi") return setLang(saved);
    } catch {
      /* storage unavailable */
    }
    if (navigator.language?.toLowerCase().startsWith("vi")) setLang("vi");
  }, []);
  const change = (l: Lang) => {
    setLang(l);
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {
      /* storage unavailable */
    }
  };
  return [lang, change] as const;
}

// ---------- markdown ----------

const attr = (v: string) => v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const withProtocol = (url: string) => (/^https?:\/\//.test(url) ? url : `https://${url}`);
const bareDomain = (url: string) => url.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");

// Profile kit link buttons, by link key.
const KIT_BUTTONS: Record<keyof Links, { icon: string; label: (v: string) => string }> = {
  website: { icon: "globe", label: bareDomain },
  github: { icon: "github", label: () => "GitHub" },
  linkedin: { icon: "linkedin", label: () => "LinkedIn" },
  x: { icon: "x", label: (v) => `@${v.replace(/^@/, "")}` },
  youtube: { icon: "youtube", label: () => "YouTube" },
  email: { icon: "mail", label: () => "Email" },
};

// Line icons for kit section labels (native and mono; clay labels are type only).
const LABEL_ICONS: Partial<Record<SectionId, string>> = {
  stack: "layers",
  about: "sparkles",
  projects: "folder",
  widgets: "chart",
  links: "link",
  philosophy: "book",
};

function buildMarkdown(s: ReadmeState, bannerQs: string) {
  const user = s.user.trim();
  const name = s.name.trim() || user || "there";
  const center = s.align === "center";
  const out: string[] = [];
  // Always a <p>, so a row of images keeps its spacing from what follows (raw HTML has no margins).
  const block = (html: string) => out.push(center ? `<p align="center">\n${html}\n</p>` : `<p>\n${html}\n</p>`);
  const card = (kind: string) => `${SITE_URL}/api/github/${kind}?user=${encodeURIComponent(user)}&theme=${s.theme}`;
  const api = (q: string) => `${SITE_URL}/api/${q}`;

  // ---- profile kit ----
  const kit = s.kit !== "off";
  const kitUrl = (cardName: string, params: [string, string][]) => {
    const p = new URLSearchParams(params.filter(([, v]) => v));
    p.set("theme", kit ? s.kit : "native");
    const accent = s.kitAccent.replace("#", "");
    if (/^[0-9a-f]{6}$/i.test(accent)) p.set("accent", accent);
    return `${SITE_URL}/api/kit/${cardName}?${p}`;
  };
  // GitHub picks the <source> matching its own theme; a fixed mode gets a single image.
  const pic = (url: string, alt: string, size: string) =>
    s.cardMode === "auto"
      ? `<picture><source media="(prefers-color-scheme: dark)" srcset="${url}&mode=dark" /><img src="${url}&mode=light" alt="${attr(alt)}" ${size} /></picture>`
      : `<img src="${url}&mode=${s.cardMode}" alt="${attr(alt)}" ${size} />`;
  const link = (href: string, html: string) => (href ? `<a href="${attr(href)}">${html}</a>` : html);
  const heading = (text: string, section: SectionId, level = "###") => {
    if (!text) return;
    if (!kit) return void out.push(`${level} ${text}`);
    const icon = s.kit === "clay" ? "" : (LABEL_ICONS[section] ?? "");
    out.push(`<p>${pic(kitUrl("label", [["text", text], ["icon", icon]]), text, 'width="100%"')}</p>`);
  };

  const render: Record<SectionId, () => void> = {
    header() {
      if (s.headerImage.trim()) block(`  <img src="${s.headerImage.trim()}" alt="${name}" width="100%" />`);
      if (kit && s.kitHeader) {
        const url = kitUrl("header", [
          ["name", name],
          ["role", s.role.trim()],
          ["bio", s.blurb.trim()],
          ["eyebrow", s.eyebrow.trim()],
          ["link", bareDomain(s.headerLink.trim())],
          ["user", s.avatar ? user : ""],
          ["avatar", s.avatar && user ? "1" : ""],
        ]);
        const href = s.headerLink.trim() ? withProtocol(s.headerLink.trim()) : "";
        out.push(`<p>${link(href, pic(url, [name, s.role.trim()].filter(Boolean).join(", "), 'width="100%"'))}</p>`);
      }
      if (s.player) {
        const p = new URLSearchParams(
          (
            [
              ["user", user],
              ["name", name],
              ["role", s.role.trim()],
              ["focus", s.eyebrow.trim()],
              ["bio", s.blurb.trim()],
              ["status", s.playerStatus.trim()],
            ] as [string, string][]
          ).filter(([, v]) => v),
        );
        const accent = s.kitAccent.replace("#", "");
        if (/^[0-9a-f]{6}$/i.test(accent)) p.set("accent", accent);
        out.push(`<p><img src="${SITE_URL}/api/kit/player?${p}" alt="${attr([name, s.role.trim()].filter(Boolean).join(", "))}" width="100%" /></p>`);
      }
      if (s.banner && bannerQs) out.push(`[![${name}](${SITE_URL}/api/banner?${bannerQs})](${SITE_URL}/?${bannerQs})`);
      if (s.hexdump && (user || s.hexText.trim())) {
        const q = cardQuery(
          [
            ["user", user],
            ["text", s.hexText.trim()],
            ["palette", s.palette],
          ],
          s.cardMode,
        );
        out.push(`<img src="${api(`hexdump?${q}`)}" alt="Hexdump of ${name}" width="100%" />`);
      }
    },

    intro() {
      if (s.greeting.trim()) {
        const text = s.greeting.replace(/\{name\}/g, name);
        out.push(center ? `<h2 align="center">${text}</h2>` : `## ${text}`);
      }
      if (s.tagline.trim()) out.push(center ? `<p align="center">${s.tagline.trim()}</p>` : s.tagline.trim());
    },

    stack() {
      const picked = s.stack.map((id) => vectorIcons.find((i) => i.id === id)).filter((i) => i !== undefined);
      if (kit) {
        const groups = lines(s.stackGroups)
          .slice(0, 4)
          .map((g) => g.split("|").map((x) => x.trim()))
          .filter(([title, , ids]) => title && ids)
          .map(([title, desc = "", ids = ""]) => ["group", `${title}|${desc}|${ids}`] as [string, string]);
        if (!groups.length && !picked.length) return;
        heading("Tech stack", "stack");
        const url = kitUrl("stack", [...groups, ["also", picked.map((i) => i.id).join(",")], ["also_label", groups.length ? s.alsoLabel.trim() : ""]]);
        const nameOf = (id: string) => vectorIcons.find((i) => i.id === id.trim().toLowerCase())?.label ?? id.trim();
        const names = [...groups.flatMap(([, g]) => g.split("|")[2].split(",").map(nameOf)), ...picked.map((i) => i.label)];
        const alt = `Tech stack: ${[...new Set(names)].filter(Boolean).join(", ")}`;
        out.push(`<p>${pic(url, alt, 'width="100%"')}</p>`);
        return;
      }
      if (!picked.length) return;
      if (s.stackStyle === "badges") {
        const badges = picked.map((i) => {
          const b = stackBadges[i.id] ?? { logo: "", color: "555555" };
          return `  <img src="https://img.shields.io/badge/-${shieldText(i.label)}-${b.color}?style=flat-square${b.logo ? `&logo=${b.logo}&logoColor=${logoColor(b.color)}` : ""}" alt="${i.label}" />`;
        });
        block(badges.join("\n"));
      } else {
        out.push("### Tech stack");
        block(picked.map((i) => `  <img src="${SITE_URL}/${i.file}" alt="${i.label}" title="${i.label}" width="40" height="40" />`).join("\n"));
      }
    },

    bio() {
      const bio = lines(s.bio);
      if (bio.length) out.push(s.bioQuote ? bio.map((l) => `> ${l}`).join("\n>\n") : bio.join("\n\n"));
    },

    identity() {
      if (!user) return;
      const q = cardQuery(
        [["user", user], ["palette", s.palette], ...lines(s.terminalRows).slice(0, 14).map((r): [string, string] => ["row", r])],
        s.cardMode,
      );
      block(`  <img src="${api(`terminal?${q}`)}" alt="${user}@github" />`);
    },

    about() {
      const about = lines(s.about);
      if (!about.length) return;
      heading(s.aboutTitle.trim(), "about");
      out.push(about.map((l) => `- ${l}`).join("\n"));
    },

    numbers() {
      const items = lines(s.numbers)
        .slice(0, 4)
        .map((l): [string, string] => ["item", l.includes("|") ? l : `${l}|`]);
      if (!items.length && !user) return;
      // Live values ({stars}…) aren't known here, so their items are described by the label alone.
      const describe = (item: string) => {
        const [value, ...rest] = item.split("|").map((x) => x.trim());
        const label = rest.join(" ");
        return value.includes("{") ? label : [value, label].filter(Boolean).join(" ");
      };
      const alt = items.length ? items.map(([, v]) => describe(v)).join(". ") : `GitHub numbers for ${user}`;
      out.push(`<p>${pic(kitUrl("numbers", [...items, ["user", user]]), alt, 'width="100%"')}</p>`);
    },

    interests() {
      const data = lines(s.interests)
        .slice(0, 12)
        .map((l) => {
          const i = l.lastIndexOf(":");
          return i < 0 ? "" : `${l.slice(0, i).replace(/,/g, " ").trim()}:${Number(l.slice(i + 1)) || 0}`;
        })
        .filter(Boolean);
      if (data.length < 3 && !user) return;
      const title = s.interestsTitle.trim();
      const url = data.length >= 3 ? kitUrl("radar", [["title", title], ["data", data.join(",")]]) : kitUrl("radar", [["title", title], ["user", user]]);
      out.push(`<p align="center">${pic(url, title || "Radar chart", 'width="460"')}</p>`);
    },

    projects() {
      const projects = s.projects.filter((p) => p.name.trim() || p.repo.trim());
      if (!projects.length) return;
      if (kit) return kitProjects(projects);
      if (s.projectsTitle.trim()) out.push(`## ${s.projectsTitle.trim()}`);
      for (const p of projects) {
        const repo = /^[\w-]+\/[\w.-]+$/.test(p.repo.trim()) ? p.repo.trim() : "";
        const title = p.name.trim() || repo.split("/")[1];
        out.push(`### ${title}`);
        if (p.desc.trim()) out.push(p.desc.trim());
        if (p.card && repo) {
          const q = cardQuery(
            [
              ["repo", repo],
              ["palette", p.palette],
            ],
            s.cardMode,
          );
          block(`  <img src="${api(`terminal?${q}`)}" alt="${title}" />`);
        }
        const color = (palettes[p.palette]?.stops ?? palettes.ember.stops)[1].slice(1);
        const url = p.url.trim();
        const badges = [
          url &&
            `<a href="${withProtocol(url)}"><img src="https://img.shields.io/badge/${shieldText(bareDomain(url))}-${color}?style=flat-square&logo=safari&logoColor=white" alt="${title} website" /></a>`,
          repo &&
            `<a href="https://github.com/${repo}"><img src="https://img.shields.io/github/stars/${repo}?style=flat-square&logo=github&label=GitHub&color=181717" alt="${title} on GitHub" /></a>`,
        ].filter(Boolean);
        if (badges.length) block(`  ${badges.join(" ")}`);
      }
    },

    widgets() {
      if (!user || !(s.streak || s.graph || s.stats || s.languages || s.activity)) return;
      heading("GitHub activity", "widgets");
      if (s.activity) {
        const q = cardQuery(
          [
            ["user", user],
            ["palette", s.palette],
          ],
          s.cardMode,
        );
        block(`  <img src="${api(`activity?${q}`)}" alt="Contributions as a memory map, recent repositories as a call stack" width="100%" />`);
      }
      if (kit) {
        if (s.graph || s.streak) out.push(`<p>${pic(kitUrl("contributions", [["user", user]]), "GitHub contributions in the last year", 'width="100%"')}</p>`);
        if (s.stats) out.push(`<p>${pic(kitUrl("numbers", [["user", user]]), `GitHub numbers for ${user}`, 'width="100%"')}</p>`);
        if (s.languages) out.push(`<p align="center">${pic(kitUrl("radar", [["user", user]]), "Top languages", 'width="460"')}</p>`);
        return;
      }
      if (s.streak) block(`  <img src="${card("streak")}" alt="GitHub streak" />`);
      if (s.graph) block(`  <img src="${card("graph")}" alt="Contribution graph" />`);
      const pair = [
        s.stats && `  <img src="${card("stats")}" alt="GitHub stats" height="180" />`,
        s.languages && `  <img src="${card("languages")}" alt="Top languages" height="180" />`,
      ].filter(Boolean);
      if (pair.length) block(pair.join("\n"));
    },

    links() {
      const set = BADGES.filter((b) => s.links[b.key].trim());
      if (!set.length) return;
      if (kit) {
        heading("Connect", "links");
        const buttons = set.map((b) => {
          const v = s.links[b.key].trim();
          const k = KIT_BUTTONS[b.key];
          return `  ${link(b.href(v), pic(kitUrl("button", [["label", k.label(v)], ["icon", k.icon]]), b.label, 'height="40"'))}`;
        });
        block(buttons.join("\n"));
        return;
      }
      const links = set.map(
        (b) =>
          `  <a href="${b.href(s.links[b.key].trim())}"><img src="https://img.shields.io/badge/${encodeURIComponent(b.label)}-${b.color}?style=${s.badgeStyle}&logo=${b.logo}&logoColor=white" alt="${b.label}" /></a>`,
      );
      out.push("### Connect with me");
      block(links.join("\n"));
    },

    philosophy() {
      if (!s.quote.trim() && !s.quoteText.trim()) return;
      if (!kit) out.push("---");
      heading(s.quoteTitle.trim(), "philosophy");
      if (s.quote.trim()) out.push(`> ${s.quote.trim()}`);
      if (s.quoteText.trim()) out.push(lines(s.quoteText).join("\n\n"));
    },
  };

  /** First project wide, then two per row; small ones three per row. */
  function kitProjects(projects: Project[]) {
    heading(s.projectsTitle.trim(), "projects", "##");
    const big = projects.filter((p) => !p.small);
    const small = projects.filter((p) => p.small);
    const cardFor = (p: Project, size: "feature" | "half" | "small", i: number, width: string, reserve = false) => {
      const repo = /^[\w-]+\/[\w.-]+$/.test(p.repo.trim()) ? p.repo.trim() : "";
      const title = p.name.trim() || repo.split("/")[1];
      const url = p.url.trim();
      const params: [string, string][] = [
        ["size", size],
        ["repo", repo],
        ["title", p.name.trim()],
        ["tagline", p.tagline.trim()],
        ["desc", p.desc.trim()],
        ["tags", p.tags.trim()],
        ["meta", p.meta.trim()],
        ["status", p.status.trim()],
        ["image", size === "small" ? "" : p.image.trim()],
        ["num", s.kit === "clay" && size !== "small" ? String(i + 1).padStart(2, "0") : ""],
        ["reserve", reserve && !p.image.trim() ? "1" : ""],
      ];
      if (url) params.push(["eyebrow", bareDomain(url)]);
      const href = url ? withProtocol(url) : repo ? `https://github.com/${repo}` : "";
      return link(href, pic(kitUrl("project", params), [title, p.tagline.trim() || p.desc.trim()].filter(Boolean).join(": "), `width="${width}"`));
    };
    if (big.length) out.push(`<p>${cardFor(big[0], "feature", 0, "100%")}</p>`);
    for (let i = 1; i < big.length; i += 2) {
      // A space between the two keeps them apart; 49% leaves room for it.
      const row = big.slice(i, i + 2);
      // If one card in the row has a screenshot, the other keeps the space so their heights match.
      const reserve = row.some((p) => p.image.trim());
      out.push(`<p>\n${row.map((p, j) => `  ${cardFor(p, "half", i + j, "49%", reserve)}`).join("\n")}\n</p>`);
    }
    for (let i = 0; i < small.length; i += 3) {
      out.push(`<p>\n${small
        .slice(i, i + 3)
        .map((p, j) => `  ${cardFor(p, "small", big.length + i + j, "32.5%")}`)
        .join("\n")}\n</p>`);
    }
  }

  for (const id of s.sections) render[id]?.();
  out.push(`<sub>Made with [Profilyze](${SITE_URL})</sub>`);
  return out.join("\n\n") + "\n";
}

// ---------- component ----------

export default function ReadmeBuilder() {
  const [lang, setLang] = useLang();
  const t = dicts[lang];
  const [saved, setS, loaded] = usePersistentState<ReadmeState>("profilyze:readme", INITIAL);
  // Saved state is merged shallowly, so nested values from older versions get their defaults here.
  const s = useMemo(() => normalizeState(saved), [saved]);
  const set = <K extends keyof ReadmeState>(k: K, v: ReadmeState[K]) => setS((p) => ({ ...p, [k]: v }));
  const setLink = (k: keyof Links, v: string) => setS((p) => ({ ...p, links: { ...INITIAL.links, ...p.links, [k]: v } }));
  const setProject = (i: number, patch: Partial<Project>) =>
    setS((p) => ({ ...p, projects: s.projects.map((x, j) => (j === i ? { ...x, ...patch } : x)) }));
  const bannerQs = useBannerQs(s.user.trim());

  // Default the username to the one used in the banner editor.
  useEffect(() => {
    if (!loaded || s.user) return;
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null");
      if (draft?.user) setS((p) => ({ ...p, user: draft.user }));
    } catch {
      /* ignore */
    }
  }, [loaded, s.user, setS]);

  // Applying a template replaces the user's text, so it always asks first (even for the current one, which resets it).
  const [pending, setPending] = useState<ReadmeState["template"] | null>(null);
  const cancelTemplate = useCallback(() => setPending(null), []);
  const confirmTemplate = () => {
    if (pending) setS(applyTemplate(s, pending, lang));
    setPending(null);
  };
  const moveSection = (i: number, by: -1 | 1) =>
    setS((p) => {
      const list = [...s.sections];
      const j = i + by;
      if (j < 0 || j >= list.length) return p;
      [list[i], list[j]] = [list[j], list[i]];
      return { ...p, sections: list };
    });
  const [selected, setSelected] = useState<SectionId | "profile">("profile");
  const removeSection = (id: SectionId) => {
    setS((p) => ({ ...p, sections: s.sections.filter((x) => x !== id) }));
    if (selected === id) setSelected("profile");
  };
  const addSection = (id: SectionId) => {
    setS((p) => ({ ...p, sections: [...s.sections, id] }));
    setSelected(id);
    setAddOpen(false);
  };
  const [addOpen, setAddOpen] = useState(false);
  // A template can drop the section being edited.
  const current = selected !== "profile" && !s.sections.includes(selected) ? "profile" : selected;

  const markdown = useMemo(() => buildMarkdown(s, bannerQs), [s, bannerQs]);
  // Preview loads images from this deployment and never counts views or usage.
  const previewHtml = useMemo(() => {
    const local = markdown
      .replaceAll(SITE_URL, "")
      .replace(/\/api\/(banner|profile\/banner)\?([^)"\s]+)/g, "/api/$1?$2&preview=1")
      // The preview pane is dark; cards that follow the viewer's colour scheme are shown dark there.
      .replace(/\/api\/(terminal|hexdump|activity)\?([^)"\s]+)/g, (m) => (m.includes("mode=") ? m : `${m}&mode=dark`))
      .replace(/<picture><source media="\(prefers-color-scheme: dark\)" srcset="([^"]+)" \/><img src="[^"]+"([^>]*)\/><\/picture>/g, '<img src="$1"$2/>');
    return marked.parse(local, { async: false }) as string;
  }, [markdown]);

  const [tab, setTab] = useState<"preview" | "markdown">("preview");
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "README.md" });
    a.click();
    URL.revokeObjectURL(url);
  };

  const missing = ALL_SECTIONS.filter((id) => !s.sections.includes(id));
  const rowCls = (active: boolean) =>
    `group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm ${active ? "bg-accent/10 text-fg" : "text-muted hover:bg-surface-2 hover:text-fg"}`;

  return (
    <div className="flex flex-col gap-4 lg:grid lg:h-[calc(100dvh-3.5rem)] lg:grid-cols-[17rem_minmax(0,1fr)_24rem] lg:grid-rows-[minmax(0,1fr)] lg:gap-0 xl:grid-cols-[19rem_minmax(0,1fr)_26rem]">
      <ConfirmDialog
        open={pending !== null}
        title={t.applyTitle.replace("{template}", pending ? findTemplate(pending).name[lang] : "")}
        message={t.applyConfirm}
        confirmLabel={t.applyButton}
        cancelLabel={t.cancel}
        onConfirm={confirmTemplate}
        onCancel={cancelTemplate}
      />

      {/* ---- left: templates + sections ---- */}
      <aside className="space-y-4 lg:flex lg:flex-col lg:space-y-0 lg:overflow-y-auto lg:border-r lg:border-line lg:bg-surface">
        <Panel
          title={t.templatesPanel}
          className="lg:rounded-none lg:border-0 lg:border-b"
          action={
            <div className="w-24">
              <Segmented
                value={lang}
                onChange={setLang}
                options={[
                  { value: "en", label: "EN" },
                  { value: "vi", label: "VI" },
                ]}
              />
            </div>
          }
        >
          <div className="grid grid-cols-2 gap-2">
            {templates.map((tpl) => {
              const active = tpl.id === s.template;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setPending(tpl.id)}
                  aria-pressed={active}
                  title={tpl.desc[lang]}
                  className={`flex flex-col gap-1.5 rounded-lg border p-1.5 text-left transition ${
                    active ? "border-accent ring-1 ring-accent" : "border-line hover:border-zinc-500"
                  }`}
                >
                  <TemplateSketch blocks={tpl.sketch} />
                  <span className={`px-0.5 text-xs font-semibold ${active ? "text-accent" : ""}`}>{tpl.name[lang]}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs leading-snug text-muted">{findTemplate(s.template).desc[lang]}</p>
        </Panel>

        <Panel
          title={t.sectionsPanel}
          className="lg:flex-1 lg:rounded-none lg:border-0"
          action={
            <div className="relative">
              <button
                type="button"
                onClick={() => setAddOpen((o) => !o)}
                disabled={!missing.length}
                className="flex h-7 items-center gap-1 rounded-md bg-accent px-2.5 text-xs font-semibold text-zinc-900 transition hover:brightness-110 disabled:opacity-40"
              >
                <FiPlus /> {t.addShort}
              </button>
              {addOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setAddOpen(false)} />
                  <ul className="absolute right-0 top-9 z-50 w-60 overflow-hidden rounded-lg border border-line bg-surface-2 py-1 shadow-xl">
                    {missing.map((id) => (
                      <li key={id}>
                        <button type="button" onClick={() => addSection(id)} className="w-full px-3 py-2 text-left hover:bg-zinc-700/40">
                          <span className="block text-sm">{sectionText[lang][id].title}</span>
                          <span className="block text-xs text-muted">{sectionText[lang][id].desc}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          }
        >
          <p className="-mt-1 text-xs text-muted">{t.sectionsHint}</p>
          <ul className="-mx-2 space-y-0.5">
            <li>
              <div className={rowCls(current === "profile")}>
                <button type="button" onClick={() => setSelected("profile")} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                  <FiUser className="shrink-0 opacity-70" /> <span className="truncate">{t.profileRow}</span>
                </button>
              </div>
            </li>
            {s.sections.map((id, i) => (
              <li key={id}>
                <div className={rowCls(current === id)}>
                  <button type="button" onClick={() => setSelected(id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                    <span className="w-4 shrink-0 text-center font-mono text-[10px] text-zinc-500">{i + 1}</span>
                    <span className="truncate">{sectionText[lang][id].title}</span>
                  </button>
                  <span className="flex opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                    <RowBtn label={t.moveUp} disabled={i === 0} onClick={() => moveSection(i, -1)}>
                      <FiArrowUp />
                    </RowBtn>
                    <RowBtn label={t.moveDown} disabled={i === s.sections.length - 1} onClick={() => moveSection(i, 1)}>
                      <FiArrowDown />
                    </RowBtn>
                    <RowBtn label={t.remove} onClick={() => removeSection(id)}>
                      <FiX />
                    </RowBtn>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </aside>

      {/* ---- centre: preview ---- */}
      <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-line bg-surface lg:rounded-none lg:border-0 lg:bg-transparent">
        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface/60 px-4 py-2.5">
          <div className="min-w-0 leading-tight">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted">{t.livePreview}</p>
            <p className="text-sm font-semibold">README.md</p>
          </div>
          <div className="ml-auto w-44">
            <Segmented
              value={tab}
              onChange={setTab}
              options={[
                { value: "preview", label: t.preview },
                { value: "markdown", label: t.markdown },
              ]}
            />
          </div>
          <button
            type="button"
            onClick={download}
            className="flex items-center gap-1.5 rounded-md border border-line bg-surface-2 px-2.5 py-1.5 text-xs font-medium hover:border-zinc-500"
          >
            <FiDownload /> {t.download}
          </button>
          <button
            type="button"
            onClick={copy}
            className="flex items-center gap-1.5 rounded-md bg-accent px-2.5 py-1.5 text-xs font-semibold text-zinc-900 hover:brightness-110"
          >
            {copied ? <FiCheck /> : <FiCopy />}
            {copied ? t.copied : t.copy}
          </button>
        </div>
        <div className="max-h-[70vh] min-h-0 flex-1 overflow-y-auto p-4 lg:max-h-none lg:p-8">
          {!s.user && <p className="mx-auto mb-3 max-w-[860px] text-xs text-amber-300">{t.needUser}</p>}
          {tab === "preview" ? (
            <div
              className="md-preview mx-auto max-w-[860px] rounded-lg border border-line bg-[#0d1117] p-6 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.8)]"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          ) : (
            <pre className="mx-auto max-w-[860px] whitespace-pre-wrap break-all rounded-lg border border-line bg-bg p-4 font-mono text-xs leading-relaxed text-zinc-300">
              {markdown}
            </pre>
          )}
        </div>
      </section>

      {/* ---- right: properties of the selected section ---- */}
      <aside className="lg:overflow-y-auto lg:border-l lg:border-line lg:bg-surface">
        <Panel
          title={current === "profile" ? t.profileRow : sectionText[lang][current].title}
          className="lg:rounded-none lg:border-0"
          action={
            current !== "profile" && (
              <IconButton label={t.remove} danger onClick={() => removeSection(current)}>
                <FiTrash2 />
              </IconButton>
            )
          }
        >
          {current === "profile" ? (
            <>
              <p className="-mt-1 text-xs text-muted">{t.profileDesc}</p>
              <Field label={t.username}>
                <input
                  className={inputCls}
                  value={s.user}
                  placeholder={AUTHOR.github}
                  onChange={(e) => set("user", e.target.value.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 39))}
                />
              </Field>
              <Field label={t.displayName}>
                <input className={inputCls} value={s.name} placeholder={AUTHOR.name} onChange={(e) => set("name", e.target.value)} />
              </Field>
              <Segmented
                value={s.align}
                onChange={(v) => set("align", v)}
                options={[
                  { value: "center", label: t.centered },
                  { value: "left", label: t.leftAligned },
                ]}
              />
              <Select label={t.cardPalette} value={s.palette} options={PALETTE_OPTIONS} onChange={(v) => set("palette", v)} />
              <Select
                label={t.cardMode}
                value={s.cardMode}
                options={[
                  { value: "auto", label: t.modeAuto },
                  { value: "dark", label: t.modeDark },
                  { value: "light", label: t.modeLight },
                ]}
                onChange={(v) => set("cardMode", v)}
              />
              <Select<KitStyle>
                label={t.kitStyle}
                value={s.kit}
                options={[
                  { value: "off", label: t.kitOff },
                  ...Object.entries(kitThemes).map(([value, k]) => ({ value: value as KitStyle, label: `${k.label} · ${k.desc}` })),
                ]}
                onChange={(v) => set("kit", v)}
              />
              <p className="-mt-1 text-xs text-muted">{t.kitHint}</p>
              {s.kit !== "off" && (
                <div className="space-y-1">
                  <ColorField label={t.kitAccent} value={s.kitAccent || KIT_ACCENTS[s.kit]} onChange={(v) => set("kitAccent", v)} />
                  {s.kitAccent && (
                    <button type="button" onClick={() => set("kitAccent", "")} className="text-xs text-accent hover:underline">
                      {t.reset}
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <p className="-mt-1 text-xs text-muted">{sectionText[lang][current].desc}</p>
              <SectionBody id={current} s={s} t={t} set={set} setLink={setLink} setProject={setProject} />
            </>
          )}
        </Panel>
      </aside>
    </div>
  );
}

function RowBtn({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-6 w-6 items-center justify-center rounded text-muted hover:bg-zinc-700/50 hover:text-fg disabled:opacity-30"
    >
      {children}
    </button>
  );
}

// ---------- section forms ----------

function SectionBody({
  id,
  s,
  t,
  set,
  setLink,
  setProject,
}: {
  id: SectionId;
  s: ReadmeState;
  t: Dict;
  set: <K extends keyof ReadmeState>(k: K, v: ReadmeState[K]) => void;
  setLink: (k: keyof Links, v: string) => void;
  setProject: (i: number, patch: Partial<Project>) => void;
}) {
  switch (id) {
    case "header":
      return (
        <>
          {s.kit !== "off" && <Toggle label={t.kitHeader} checked={s.kitHeader} onChange={(v) => set("kitHeader", v)} />}
          <Toggle label={t.player} checked={s.player} onChange={(v) => set("player", v)} />
          {s.player && <p className="-mt-1 text-xs text-muted">{t.playerHint}</p>}
          {((s.kit !== "off" && s.kitHeader) || s.player) && (
            <div className="space-y-3 rounded-lg border border-line bg-bg/40 p-3">
              <Field label={t.eyebrow}>
                <input className={inputCls} value={s.eyebrow} placeholder="Hanoi · Building in public" onChange={(e) => set("eyebrow", e.target.value)} />
              </Field>
              <Field label={t.role}>
                <input className={inputCls} value={s.role} placeholder="Fullstack developer" onChange={(e) => set("role", e.target.value)} />
              </Field>
              <Field label={t.blurb}>
                <textarea className={`${inputCls} min-h-16 resize-y`} value={s.blurb} onChange={(e) => set("blurb", e.target.value)} />
              </Field>
              <Field label={t.headerLink}>
                <input className={inputCls} value={s.headerLink} placeholder="example.com" onChange={(e) => set("headerLink", e.target.value)} />
              </Field>
              {s.kit !== "off" && s.kitHeader && <Toggle label={t.avatar} checked={s.avatar} onChange={(v) => set("avatar", v)} />}
              {s.player && (
                <Field label={t.playerStatus}>
                  <input className={inputCls} value={s.playerStatus} onChange={(e) => set("playerStatus", e.target.value)} />
                </Field>
              )}
            </div>
          )}
          <Toggle label={t.useBanner} checked={s.banner} onChange={(v) => set("banner", v)} />
          {s.banner && (
            <Link href="/" className="flex items-center gap-1 text-xs text-accent hover:underline">
              <FiEdit2 /> {t.editBanner}
            </Link>
          )}
          <Toggle label={t.useHexdump} checked={s.hexdump} onChange={(v) => set("hexdump", v)} />
          {s.hexdump && (
            <Field label={t.hexText} hint={t.hexTextHint}>
              <textarea
                className={`${inputCls} min-h-20 resize-y font-mono text-xs`}
                value={s.hexText}
                placeholder={"Hi, I'm Dang.\nFullstack dev · Java / TypeScript"}
                onChange={(e) => set("hexText", e.target.value)}
              />
            </Field>
          )}
          <Field label={t.headerImage} hint={t.headerImageHint}>
            <input className={inputCls} value={s.headerImage} placeholder="https://…/header.gif" onChange={(e) => set("headerImage", e.target.value)} />
          </Field>
        </>
      );

    case "intro":
      return (
        <>
          <Field label={t.greeting} hint={t.greetingHint}>
            <input className={inputCls} value={s.greeting} onChange={(e) => set("greeting", e.target.value)} />
          </Field>
          <Field label={t.tagline} hint={t.taglineHint}>
            <input
              className={inputCls}
              value={s.tagline}
              placeholder="🔥 Founder @ [Acme](https://acme.dev) · 📍 Vietnam"
              onChange={(e) => set("tagline", e.target.value)}
            />
          </Field>
        </>
      );

    case "bio":
      return (
        <>
          <Field label={t.bio} hint={t.bioHint}>
            <textarea className={`${inputCls} min-h-20 resize-y`} value={s.bio} onChange={(e) => set("bio", e.target.value)} />
          </Field>
          <Toggle label={t.bioQuote} checked={s.bioQuote} onChange={(v) => set("bioQuote", v)} />
        </>
      );

    case "stack":
      return (
        <>
          {s.kit !== "off" && (
            <>
              <Field label={t.stackGroups} hint={t.stackGroupsHint}>
                <textarea
                  className={`${inputCls} min-h-24 resize-y font-mono text-xs`}
                  value={s.stackGroups}
                  placeholder={"Backend | APIs that stay up | java,spring,postgresql"}
                  onChange={(e) => set("stackGroups", e.target.value)}
                />
              </Field>
              {s.stackGroups.trim() && (
                <Field label={t.alsoLabel}>
                  <input className={inputCls} value={s.alsoLabel} onChange={(e) => set("alsoLabel", e.target.value)} />
                </Field>
              )}
            </>
          )}
          <div className={`flex items-center gap-3 ${s.kit !== "off" ? "hidden" : ""}`}>
            <div className="flex-1">
              <Segmented
                value={s.stackStyle}
                onChange={(v) => set("stackStyle", v)}
                options={[
                  { value: "logos", label: t.stackLogos },
                  { value: "badges", label: t.stackBadges },
                ]}
              />
            </div>
            <span className="shrink-0 text-xs text-muted">
              {s.stack.length} {t.selected}
            </span>
          </div>
          {/* README tech stacks link the static SVGs, so only vector logos are offered. */}
          <IconPicker
            selected={s.stack}
            onToggle={(icon) => set("stack", s.stack.includes(icon) ? s.stack.filter((x) => x !== icon) : [...s.stack, icon])}
            vectorOnly
          />
        </>
      );

    case "identity":
      return (
        <>
          <p className="text-xs text-muted">{t.identityIntro}</p>
          <Field label={t.rows} hint={t.rowsHint}>
            <textarea
              className={`${inputCls} min-h-32 resize-y font-mono text-xs`}
              value={s.terminalRows}
              placeholder={"Name: {name}\nRole: Fullstack developer\nCommits: {commits}\nLanguages: {languages}"}
              onChange={(e) => set("terminalRows", e.target.value)}
            />
          </Field>
        </>
      );

    case "about":
      return (
        <>
          <Field label={t.listTitle}>
            <input className={inputCls} value={s.aboutTitle} onChange={(e) => set("aboutTitle", e.target.value)} />
          </Field>
          <Field label={t.listItems}>
            <textarea className={`${inputCls} min-h-28 resize-y`} value={s.about} onChange={(e) => set("about", e.target.value)} />
          </Field>
        </>
      );

    case "projects":
      return (
        <>
          <Field label={t.projectsHeading}>
            <input className={inputCls} value={s.projectsTitle} onChange={(e) => set("projectsTitle", e.target.value)} />
          </Field>
          {!s.projects.length && <p className="text-xs text-muted">{t.noProjects}</p>}
          {s.kit !== "off" && s.projects.length > 0 && <p className="text-xs text-muted">{t.kitProjectsHint}</p>}
          {s.projects.map((p, i) => (
            <div key={i} className="space-y-2 rounded-lg border border-line bg-bg/40 p-3">
              <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                <Field label={t.projectName}>
                  <input className={inputCls} value={p.name} placeholder="Profilyze" onChange={(e) => setProject(i, { name: e.target.value })} />
                </Field>
                <Field label={t.projectRepo}>
                  <input
                    className={inputCls}
                    value={p.repo}
                    placeholder="owner/name"
                    onChange={(e) => setProject(i, { repo: e.target.value.replace(/\s/g, "") })}
                  />
                </Field>
                <IconButton label={t.removeProject} danger onClick={() => set("projects", s.projects.filter((_, j) => j !== i))}>
                  <FiTrash2 />
                </IconButton>
              </div>
              <Field label={t.projectDesc}>
                <textarea className={`${inputCls} min-h-16 resize-y`} value={p.desc} onChange={(e) => setProject(i, { desc: e.target.value })} />
              </Field>
              {s.kit === "off" ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label={t.projectUrl}>
                      <input className={inputCls} value={p.url} placeholder="example.com" onChange={(e) => setProject(i, { url: e.target.value })} />
                    </Field>
                    <Select label={t.projectPalette} value={p.palette} options={PALETTE_OPTIONS} onChange={(v) => setProject(i, { palette: v })} />
                  </div>
                  <Toggle label={t.projectCard} checked={p.card} onChange={(v) => setProject(i, { card: v })} />
                </>
              ) : (
                <>
                  <Field label={t.projectTagline}>
                    <input className={inputCls} value={p.tagline} onChange={(e) => setProject(i, { tagline: e.target.value })} />
                  </Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label={t.projectUrl}>
                      <input className={inputCls} value={p.url} placeholder="example.com" onChange={(e) => setProject(i, { url: e.target.value })} />
                    </Field>
                    <Field label={t.projectMeta}>
                      <input className={inputCls} value={p.meta} placeholder="2025 · iOS" onChange={(e) => setProject(i, { meta: e.target.value })} />
                    </Field>
                    <Field label={t.projectStatus}>
                      <input className={inputCls} value={p.status} placeholder="Live · v1.2" onChange={(e) => setProject(i, { status: e.target.value })} />
                    </Field>
                    <Field label={t.projectTags}>
                      <input className={inputCls} value={p.tags} placeholder="Rust, TypeScript" onChange={(e) => setProject(i, { tags: e.target.value })} />
                    </Field>
                  </div>
                  {!p.small && (
                    <Field label={t.projectImage} hint={t.projectImageHint}>
                      <input className={inputCls} value={p.image} placeholder="og" onChange={(e) => setProject(i, { image: e.target.value.trim() })} />
                    </Field>
                  )}
                  <Toggle label={t.projectSmall} checked={p.small} onChange={(v) => setProject(i, { small: v })} />
                </>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => set("projects", [...s.projects, { ...NEW_PROJECT }])}
            className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-line py-2 text-xs text-muted hover:border-accent hover:text-accent"
          >
            <FiPlus /> {t.addProject}
          </button>
        </>
      );

    case "widgets":
      return (
        <>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <Toggle label={t.streak} checked={s.streak} onChange={(v) => set("streak", v)} />
            <Toggle label={t.graph} checked={s.graph} onChange={(v) => set("graph", v)} />
            <Toggle label={t.stats} checked={s.stats} onChange={(v) => set("stats", v)} />
            <Toggle label={t.languages} checked={s.languages} onChange={(v) => set("languages", v)} />
            <Toggle label={t.activity} checked={s.activity} onChange={(v) => set("activity", v)} />
          </div>
          {s.kit !== "off" && <p className="text-xs text-muted">{t.kitWidgetsHint}</p>}
          <Select
            label={t.theme}
            value={s.theme}
            options={Object.entries(themes).map(([value, th]) => ({ value, label: th.label }))}
            onChange={(v) => set("theme", v)}
          />
        </>
      );

    case "links":
      return (
        <>
          <Segmented
            value={s.badgeStyle}
            onChange={(v) => set("badgeStyle", v)}
            options={[
              { value: "for-the-badge", label: t.badgesLarge },
              { value: "flat-square", label: t.badgesFlat },
            ]}
          />
          <div className="grid grid-cols-2 gap-2">
            {BADGES.map((b) => (
              <Field key={b.key} label={b.label}>
                <input
                  className={inputCls}
                  value={s.links[b.key]}
                  placeholder={b.key === "email" ? "you@example.com" : b.key === "website" ? "example.com" : "username"}
                  onChange={(e) => setLink(b.key, e.target.value)}
                />
              </Field>
            ))}
          </div>
        </>
      );

    case "numbers":
      return (
        <Field label={t.numbersLines} hint={t.numbersHint}>
          <textarea
            className={`${inputCls} min-h-24 resize-y font-mono text-xs`}
            value={s.numbers}
            placeholder={"5 yrs | building production systems\n{repos} | public repositories\n{stars} | stars on GitHub"}
            onChange={(e) => set("numbers", e.target.value)}
          />
        </Field>
      );

    case "interests":
      return (
        <>
          <Field label={t.interestsTitle}>
            <input className={inputCls} value={s.interestsTitle} onChange={(e) => set("interestsTitle", e.target.value)} />
          </Field>
          <Field label={t.interestsLines} hint={t.interestsHint}>
            <textarea
              className={`${inputCls} min-h-32 resize-y font-mono text-xs`}
              value={s.interests}
              placeholder={"Frontend: 8\nBackend: 6\nDesign: 5\nAI: 7"}
              onChange={(e) => set("interests", e.target.value)}
            />
          </Field>
        </>
      );

    case "philosophy":
      return (
        <>
          <Field label={t.quoteTitle}>
            <input className={inputCls} value={s.quoteTitle} onChange={(e) => set("quoteTitle", e.target.value)} />
          </Field>
          <Field label={t.quote}>
            <input className={inputCls} value={s.quote} placeholder="Keep trying." onChange={(e) => set("quote", e.target.value)} />
          </Field>
          <Field label={t.quoteText}>
            <textarea className={`${inputCls} min-h-20 resize-y`} value={s.quoteText} onChange={(e) => set("quoteText", e.target.value)} />
          </Field>
        </>
      );
  }
}

// ---------- bits ----------

/** A wireframe of a template's layout, drawn with blocks. */
function TemplateSketch({ blocks }: { blocks: Sketch[] }) {
  const bar = "rounded-sm bg-zinc-600/70";
  return (
    <div className="flex h-20 flex-col gap-1 overflow-hidden rounded-md border border-line bg-[#0d1117] p-1.5">
      {blocks.map((b, i) => {
        switch (b) {
          case "image":
            return <div key={i} className="h-7 shrink-0 rounded bg-gradient-to-r from-sky-500/60 via-indigo-500/60 to-fuchsia-500/60" />;
          case "hex":
            return (
              <div key={i} className="shrink-0 space-y-0.5 rounded border border-zinc-700 p-1">
                {[0, 1].map((r) => (
                  <div key={r} className="flex gap-0.5">
                    {Array.from({ length: 12 }, (_, k) => (
                      <div key={k} className={`h-1 flex-1 rounded-[1px] ${k % 3 ? "bg-emerald-400/60" : "bg-zinc-600"}`} />
                    ))}
                  </div>
                ))}
              </div>
            );
          case "title":
            return <div key={i} className="h-2.5 w-1/2 shrink-0 rounded-sm bg-zinc-300/80" />;
          case "line":
            return <div key={i} className={`h-1.5 w-4/5 shrink-0 ${bar}`} />;
          case "pills":
            return (
              <div key={i} className="flex shrink-0 gap-1">
                {["bg-sky-500/70", "bg-amber-400/70", "bg-emerald-500/70", "bg-rose-500/70"].map((c) => (
                  <div key={c} className={`h-1.5 w-5 rounded-sm ${c}`} />
                ))}
              </div>
            );
          case "logos":
            return (
              <div key={i} className="flex shrink-0 gap-1">
                {Array.from({ length: 6 }, (_, k) => (
                  <div key={k} className="h-3 w-3 rounded-full bg-zinc-500/80" />
                ))}
              </div>
            );
          case "card":
            return (
              <div key={i} className="flex h-6 shrink-0 gap-1.5 rounded border border-zinc-700 p-1">
                <div className="w-5 rounded-sm bg-gradient-to-b from-sky-300/70 to-violet-400/70" />
                <div className="flex flex-1 flex-col justify-center gap-0.5">
                  <div className="h-1 w-1/3 rounded-sm bg-indigo-400/80" />
                  <div className={`h-1 w-full ${bar}`} />
                </div>
              </div>
            );
          case "list":
            return (
              <div key={i} className="shrink-0 space-y-1">
                {[3, 4, 2].map((w) => (
                  <div key={w} className={`h-1 ${bar}`} style={{ width: `${w * 20}%` }} />
                ))}
              </div>
            );
          case "grid":
            return (
              <div key={i} className="grid shrink-0 grid-cols-[repeat(16,1fr)] gap-0.5">
                {Array.from({ length: 48 }, (_, k) => (
                  <div key={k} className={`aspect-square rounded-[1px] ${(k * 7) % 5 ? "bg-emerald-500/50" : "bg-zinc-700"}`} />
                ))}
              </div>
            );
          case "quote":
            return <div key={i} className={`ml-0 h-1.5 w-2/3 shrink-0 border-l-2 border-zinc-500 pl-1 ${bar}`} />;
          case "tiles":
            return (
              <div key={i} className="grid h-5 shrink-0 grid-cols-2 gap-1">
                {[0, 1].map((k) => (
                  <div key={k} className="flex flex-col justify-end gap-0.5 rounded border border-zinc-700 p-0.5">
                    <div className="h-1 w-1/2 rounded-sm bg-amber-400/70" />
                    <div className={`h-0.5 w-full ${bar}`} />
                  </div>
                ))}
              </div>
            );
          case "stats":
            return (
              <div key={i} className="flex h-3 shrink-0 items-end divide-x divide-zinc-700 border-y border-zinc-700 py-0.5">
                {[0, 1, 2].map((k) => (
                  <div key={k} className="flex-1 px-1">
                    <div className="h-1.5 w-3/5 rounded-sm bg-zinc-300/80" />
                  </div>
                ))}
              </div>
            );
          case "radar":
            return (
              <svg key={i} viewBox="0 0 40 20" className="h-5 shrink-0 self-center">
                <polygon points="20,1 31,6 31,14 20,19 9,14 9,6" fill="none" stroke="#52525b" strokeWidth=".8" />
                <polygon points="20,5 28,8 24,13 20,16 12,12 14,7" fill="#a1a1aa55" stroke="#d4d4d8" strokeWidth=".8" />
              </svg>
            );
        }
      })}
    </div>
  );
}
