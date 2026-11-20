"use client";

import { useEffect, useState } from "react";
import { FiCheck, FiCopy } from "react-icons/fi";
import { themes } from "@/lib/cards/render";
import { palettes } from "@/lib/cards/terminal";
import { AUTHOR, SITE_URL } from "@/lib/site";
import { inputCls, Panel, Select, Toggle } from "./editor/ui";
import { usePersistentState } from "./usePersistentState";

const CARDS = [
  { id: "streak", title: "Streak", desc: "All-time contributions, current and longest streak." },
  { id: "graph", title: "Contribution graph", desc: "The last year of activity, in any theme." },
  { id: "stats", title: "Stats", desc: "Stars, commits, PRs, issues and followers." },
  { id: "languages", title: "Top languages", desc: "Languages across your own repositories." },
] as const;

// Monospace cards with their own palette and light/dark handling.
const TERMINAL_CARDS = [
  { id: "terminal", title: "Terminal", desc: "Neofetch style: your avatar as ASCII art next to live stats." },
  { id: "terminal-repo", title: "Repository terminal", desc: "The same card for one repository." },
  { id: "hexdump", title: "Hexdump header", desc: "Your intro as a memory dump in a debugger window." },
  { id: "activity", title: "Activity", desc: "Contributions as a memory map, recent pushes as a call stack." },
] as const;

export default function WidgetsBuilder() {
  const [opts, setOpts] = usePersistentState("profilyze:widgets", {
    user: AUTHOR.github,
    theme: "github-dark",
    hideBorder: false,
    transparent: false,
    palette: "aurora",
    mode: "dark",
    repo: "2hjaito/profilyze",
  });
  const { user, theme, hideBorder, transparent } = opts;
  const setOpt = <K extends keyof typeof opts>(k: K) => (v: (typeof opts)[K]) => setOpts((o) => ({ ...o, [k]: v }));
  const setUser = setOpt("user");
  const setTheme = setOpt("theme");
  const setHideBorder = setOpt("hideBorder");
  const setTransparent = setOpt("transparent");
  const [debounced, setDebounced] = useState({ user, repo: opts.repo });
  const debouncedUser = debounced.user;

  useEffect(() => {
    const t = setTimeout(() => setDebounced({ user, repo: opts.repo }), 500);
    return () => clearTimeout(t);
  }, [user, opts.repo]);

  const terminalQuery = (id: string) => {
    const p = new URLSearchParams({ palette: opts.palette });
    if (opts.mode !== "auto") p.set("mode", opts.mode);
    if (id === "terminal-repo") {
      if (!/^[\w-]+\/[\w.-]+$/.test(debounced.repo)) return "";
      p.set("repo", debounced.repo);
      return `/api/terminal?${p}`;
    }
    if (!debouncedUser) return "";
    p.set("user", debouncedUser);
    return `/api/${id}?${p}`;
  };

  const query = (card: string) => {
    const p = new URLSearchParams({ user: debouncedUser, theme });
    if (hideBorder) p.set("hide_border", "true");
    if (transparent) p.set("transparent", "true");
    return `/api/github/${card}?${p}`;
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
      <div className="lg:sticky lg:top-20 lg:self-start">
        <Panel title="Options">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted">GitHub username</span>
            <input
              className={inputCls}
              value={user}
              onChange={(e) => setUser(e.target.value.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 39))}
            />
          </label>
          <Select label="Theme" value={theme} options={Object.entries(themes).map(([value, t]) => ({ value, label: t.label }))} onChange={setTheme} />
          <Toggle label="Hide border" checked={hideBorder} onChange={setHideBorder} />
          <Toggle label="Transparent background" checked={transparent} onChange={setTransparent} />
        </Panel>
        <Panel title="Terminal cards" className="mt-4">
          <Select
            label="Palette"
            value={opts.palette}
            options={Object.entries(palettes).map(([value, p]) => ({ value, label: p.label }))}
            onChange={setOpt("palette")}
          />
          <Select
            label="Colours"
            value={opts.mode}
            options={[
              { value: "auto", label: "Follow viewer" },
              { value: "dark", label: "Always dark" },
              { value: "light", label: "Always light" },
            ]}
            onChange={setOpt("mode")}
          />
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted">Repository</span>
            <input className={inputCls} value={opts.repo} placeholder="owner/name" onChange={(e) => setOpt("repo")(e.target.value.trim())} />
          </label>
        </Panel>
      </div>

      <div className="space-y-4">
        {CARDS.map((c) => (
          <Card key={c.id} title={c.title} desc={c.desc} path={debouncedUser ? query(c.id) : ""} />
        ))}
        {TERMINAL_CARDS.map((c) => (
          <Card key={c.id} title={c.title} desc={c.desc} path={terminalQuery(c.id)} />
        ))}
      </div>
    </div>
  );
}

function Card({ title, desc, path }: { title: string; desc: string; path: string }) {
  const [copied, setCopied] = useState(false);
  const markdown = `![${title}](${SITE_URL}${path})`;
  const copy = async () => {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <section className="rounded-xl border border-line bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="truncate text-xs text-muted">{desc}</p>
        </div>
        <button
          type="button"
          onClick={copy}
          disabled={!path}
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-line bg-surface-2 px-2.5 py-1.5 text-xs font-medium transition hover:border-zinc-500"
        >
          {copied ? <FiCheck className="text-emerald-400" /> : <FiCopy />}
          {copied ? "Copied" : "Copy Markdown"}
        </button>
      </div>
      <div className="flex min-h-40 items-center justify-center overflow-x-auto bg-[conic-gradient(#1a1a1f_25%,#141418_0_50%,#1a1a1f_0_75%,#141418_0)] [background-size:16px_16px] p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {path && <img key={path} src={path} alt={title} className="max-w-full" />}
      </div>
    </section>
  );
}
