"use client";

import { useEffect, useState } from "react";
import { FiCheck, FiCopy } from "react-icons/fi";
import { themes } from "@/lib/cards/render";
import { SITE_URL } from "@/lib/site";
import { inputCls, Panel, Select, Toggle } from "./editor/ui";

const CARDS = [
  { id: "streak", title: "Streak", desc: "All-time contributions, current and longest streak." },
  { id: "graph", title: "Contribution graph", desc: "The last year of activity, in any theme." },
  { id: "stats", title: "Stats", desc: "Stars, commits, PRs, issues and followers." },
  { id: "languages", title: "Top languages", desc: "Languages across your own repositories." },
] as const;

export default function WidgetsBuilder() {
  const [user, setUser] = useState("torvalds");
  const [debouncedUser, setDebouncedUser] = useState(user);
  const [theme, setTheme] = useState("github-dark");
  const [hideBorder, setHideBorder] = useState(false);
  const [transparent, setTransparent] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedUser(user), 500);
    return () => clearTimeout(t);
  }, [user]);

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
      </div>

      <div className="space-y-4">
        {CARDS.map((c) => (
          <Card key={c.id} title={c.title} desc={c.desc} path={debouncedUser ? query(c.id) : ""} />
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
