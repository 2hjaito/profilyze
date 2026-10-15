"use client";

import { marked } from "marked";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FiCheck, FiCopy, FiDownload, FiEdit2 } from "react-icons/fi";
import { encodeConfig } from "@/lib/banner/codec";
import { DEFAULT_CONFIG, parseConfig, type BannerConfig } from "@/lib/banner/schema";
import { themes } from "@/lib/cards/render";
import { vectorIcons } from "@/lib/catalog";
import { AUTHOR, SITE_URL } from "@/lib/site";
import IconPicker from "./editor/IconPicker";
import { Field, inputCls, Panel, Segmented, Select, Toggle } from "./editor/ui";
import { usePersistentState } from "./usePersistentState";

const DRAFT_KEY = "profilyze:draft";

type Links = { website: string; linkedin: string; x: string; youtube: string; email: string };

type ReadmeState = {
  user: string;
  name: string;
  banner: boolean;
  greeting: string;
  about: string;
  stack: string[];
  streak: boolean;
  graph: boolean;
  stats: boolean;
  languages: boolean;
  theme: string;
  links: Links;
  align: "left" | "center";
};

const INITIAL: ReadmeState = {
  user: AUTHOR.github,
  name: AUTHOR.name,
  banner: true,
  greeting: "Hi there 👋, I'm {name}",
  about: "🔭 I'm currently working on …\n🌱 I'm learning …\n💬 Ask me about …\n⚡ Fun fact: …",
  stack: ["typescript", "react", "nodejs", "docker"],
  streak: true,
  graph: true,
  stats: true,
  languages: true,
  theme: "github-dark",
  links: { website: AUTHOR.site.replace(/^https?:\/\//, ""), linkedin: "", x: "", youtube: "", email: "" },
  align: "center",
};

const BADGES: { key: keyof Links; label: string; color: string; logo: string; href: (v: string) => string }[] = [
  { key: "website", label: "Website", color: "0f172a", logo: "googlechrome", href: (v) => (/^https?:\/\//.test(v) ? v : `https://${v}`) },
  { key: "linkedin", label: "LinkedIn", color: "0A66C2", logo: "linkedin", href: (v) => `https://www.linkedin.com/in/${v}` },
  { key: "x", label: "X", color: "000000", logo: "x", href: (v) => `https://x.com/${v}` },
  { key: "youtube", label: "YouTube", color: "FF0000", logo: "youtube", href: (v) => `https://www.youtube.com/@${v.replace(/^@/, "")}` },
  { key: "email", label: "Email", color: "EA4335", logo: "gmail", href: (v) => `mailto:${v}` },
];

/** The banner from the editor's saved draft (or the default), with this README's username. */
function useBannerC(user: string) {
  const [c, setC] = useState("");
  useEffect(() => {
    let alive = true;
    let config: BannerConfig = DEFAULT_CONFIG;
    try {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) config = parseConfig(JSON.parse(draft));
    } catch {
      /* use default */
    }
    encodeConfig({ ...config, user: user || config.user, vk: undefined }).then((e) => alive && setC(e));
    return () => {
      alive = false;
    };
  }, [user]);
  return c;
}

function buildMarkdown(s: ReadmeState, bannerC: string) {
  const user = s.user.trim();
  const name = s.name.trim() || user || "there";
  const center = s.align === "center";
  const out: string[] = [];
  const block = (html: string) => out.push(center ? `<p align="center">\n${html}\n</p>` : html);
  const card = (kind: string) =>
    `${SITE_URL}/api/github/${kind}?user=${encodeURIComponent(user)}&theme=${s.theme}`;

  if (s.banner && bannerC) {
    out.push(`[![${name}](${SITE_URL}/api/banner?c=${bannerC})](${SITE_URL}/?c=${bannerC})`);
  }

  if (s.greeting.trim()) {
    const text = s.greeting.replace(/\{name\}/g, name);
    out.push(center ? `<h2 align="center">${text}</h2>` : `## ${text}`);
  }

  const about = s.about
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (about.length) out.push(about.map((l) => `- ${l}`).join("\n"));

  if (s.stack.length) {
    out.push("### Tech stack");
    const icons = s.stack
      .map((id) => vectorIcons.find((i) => i.id === id))
      .filter((i) => i !== undefined)
      .map((i) => `  <img src="${SITE_URL}/${i.file}" alt="${i.label}" title="${i.label}" width="40" height="40" />`)
      .join("\n");
    block(icons);
  }

  if (user && (s.streak || s.graph || s.stats || s.languages)) {
    out.push("### GitHub activity");
    if (s.streak) block(`  <img src="${card("streak")}" alt="GitHub streak" />`);
    if (s.graph) block(`  <img src="${card("graph")}" alt="Contribution graph" />`);
    const pair = [
      s.stats && `  <img src="${card("stats")}" alt="GitHub stats" height="180" />`,
      s.languages && `  <img src="${card("languages")}" alt="Top languages" height="180" />`,
    ].filter(Boolean);
    if (pair.length) block(pair.join("\n"));
  }

  const links = BADGES.filter((b) => s.links[b.key].trim()).map(
    (b) =>
      `  <a href="${b.href(s.links[b.key].trim())}"><img src="https://img.shields.io/badge/${encodeURIComponent(b.label)}-${b.color}?style=for-the-badge&logo=${b.logo}&logoColor=white" alt="${b.label}" /></a>`,
  );
  if (links.length) {
    out.push("### Connect with me");
    block(links.join("\n"));
  }

  out.push(`<sub>Made with [Profilyze](${SITE_URL})</sub>`);
  return out.join("\n\n") + "\n";
}

export default function ReadmeBuilder() {
  const [s, setS, loaded] = usePersistentState<ReadmeState>("profilyze:readme", INITIAL);
  const set = <K extends keyof ReadmeState>(k: K, v: ReadmeState[K]) => setS((p) => ({ ...p, [k]: v }));
  const setLink = (k: keyof Links, v: string) => setS((p) => ({ ...p, links: { ...p.links, [k]: v } }));
  const bannerC = useBannerC(s.user.trim());

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

  const markdown = useMemo(() => buildMarkdown(s, bannerC), [s, bannerC]);
  // Preview loads images from this deployment and never counts views or usage.
  const previewHtml = useMemo(() => {
    const local = markdown
      .replaceAll(SITE_URL, "")
      .replace(/\/api\/(banner|profile\/banner)\?([^)"\s]+)/g, "/api/$1?$2&preview=1");
    return marked.parse(local, { async: false }) as string;
  }, [markdown]);

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

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <div className="space-y-4">
        <Panel title="Profile">
          <div className="grid grid-cols-2 gap-2">
            <Field label="GitHub username">
              <input
                className={inputCls}
                value={s.user}
                placeholder={AUTHOR.github}
                onChange={(e) => set("user", e.target.value.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 39))}
              />
            </Field>
            <Field label="Display name">
              <input className={inputCls} value={s.name} placeholder={AUTHOR.name} onChange={(e) => set("name", e.target.value)} />
            </Field>
          </div>
          <Segmented
            value={s.align}
            onChange={(v) => set("align", v)}
            options={[
              { value: "center", label: "Centered" },
              { value: "left", label: "Left aligned" },
            ]}
          />
        </Panel>

        <Panel
          title="Banner"
          action={
            <Link href="/" className="flex items-center gap-1 text-xs text-accent hover:underline">
              <FiEdit2 /> Edit design
            </Link>
          }
        >
          <Toggle label="Include the banner from the editor" checked={s.banner} onChange={(v) => set("banner", v)} />
        </Panel>

        <Panel title="Intro">
          <Field label="Greeting" hint="{name} is replaced by your display name.">
            <input className={inputCls} value={s.greeting} onChange={(e) => set("greeting", e.target.value)} />
          </Field>
          <Field label="About (one line per bullet)">
            <textarea className={`${inputCls} min-h-28 resize-y`} value={s.about} onChange={(e) => set("about", e.target.value)} />
          </Field>
        </Panel>

        <Panel title="Tech stack" action={<span className="text-xs text-muted">{s.stack.length} selected</span>}>
          <VectorOnlyPicker
            selected={s.stack}
            onToggle={(id) => set("stack", s.stack.includes(id) ? s.stack.filter((x) => x !== id) : [...s.stack, id])}
          />
        </Panel>

        <Panel title="GitHub widgets">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <Toggle label="Streak" checked={s.streak} onChange={(v) => set("streak", v)} />
            <Toggle label="Contribution graph" checked={s.graph} onChange={(v) => set("graph", v)} />
            <Toggle label="Stats" checked={s.stats} onChange={(v) => set("stats", v)} />
            <Toggle label="Top languages" checked={s.languages} onChange={(v) => set("languages", v)} />
          </div>
          <Select
            label="Theme"
            value={s.theme}
            options={Object.entries(themes).map(([value, t]) => ({ value, label: t.label }))}
            onChange={(v) => set("theme", v)}
          />
        </Panel>

        <Panel title="Links">
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
        </Panel>
      </div>

      <div className="lg:sticky lg:top-20 lg:self-start">
        <Panel
          title="README.md"
          action={
            <div className="flex gap-2">
              <button
                type="button"
                onClick={download}
                className="flex items-center gap-1.5 rounded-md border border-line bg-surface-2 px-2.5 py-1.5 text-xs font-medium hover:border-zinc-500"
              >
                <FiDownload /> Download
              </button>
              <button
                type="button"
                onClick={copy}
                className="flex items-center gap-1.5 rounded-md bg-accent px-2.5 py-1.5 text-xs font-semibold text-zinc-900 hover:brightness-110"
              >
                {copied ? <FiCheck /> : <FiCopy />}
                {copied ? "Copied" : "Copy Markdown"}
              </button>
            </div>
          }
        >
          <PreviewTabs markdown={markdown} html={previewHtml} />
          {!s.user && <p className="text-xs text-amber-300">Add your GitHub username to include the widgets.</p>}
        </Panel>
      </div>
    </div>
  );
}

function VectorOnlyPicker({ selected, onToggle }: { selected: string[]; onToggle: (id: string) => void }) {
  // README tech stacks link the static SVGs, so only vector logos are offered.
  return <IconPicker selected={selected} onToggle={onToggle} vectorOnly />;
}

function PreviewTabs({ markdown, html }: { markdown: string; html: string }) {
  const [tab, setTab] = useState<"preview" | "markdown">("preview");
  return (
    <div className="space-y-3">
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "preview", label: "Preview" },
          { value: "markdown", label: "Markdown" },
        ]}
      />
      {tab === "preview" ? (
        <div
          className="md-preview max-h-[calc(100vh-14rem)] overflow-y-auto rounded-lg border border-line bg-[#0d1117] p-5"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre className="max-h-[calc(100vh-14rem)] overflow-auto whitespace-pre-wrap break-all rounded-lg border border-line bg-bg p-4 font-mono text-xs leading-relaxed text-zinc-300">
          {markdown}
        </pre>
      )}
    </div>
  );
}
