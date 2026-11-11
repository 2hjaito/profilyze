"use client";

import { useEffect, useState } from "react";
import { platforms, socialThemes, type SocialPlatform, type SocialTheme } from "@/lib/cards/social";
import BadgePreviewCard, { slug } from "./BadgePreviewCard";
import { Field, inputCls, Panel } from "./editor/ui";
import { usePersistentState } from "./usePersistentState";

const PLATFORMS = Object.entries(platforms) as [SocialPlatform, (typeof platforms)[SocialPlatform]][];
const THEMES = Object.entries(socialThemes) as [SocialTheme, (typeof socialThemes)[SocialTheme]][];

export default function SocialBadgeBuilder() {
  const [opts, setOpts] = usePersistentState("profilyze:social-badge", {
    platform: "discord" as SocialPlatform,
    label: "",
    value: "Join The Code Well",
    link: "https://discord.com/invite/eG5txdWaqr",
  });
  const [q, setQ] = useState(opts);
  useEffect(() => {
    const t = setTimeout(() => setQ(opts), 400);
    return () => clearTimeout(t);
  }, [opts]);

  const p = platforms[opts.platform] ?? platforms.discord;
  const set = (k: "label" | "value" | "link") => (e: React.ChangeEvent<HTMLInputElement>) =>
    setOpts((o) => ({ ...o, [k]: e.target.value }));
  const pick = (id: SocialPlatform) =>
    // Switching platform resets the text to that platform's defaults so the preview makes sense.
    setOpts((o) => (o.platform === id ? o : { platform: id, label: "", value: platforms[id].value, link: "" }));

  const path = (theme: SocialTheme) => {
    const s = new URLSearchParams({ platform: q.platform });
    if (q.label.trim()) s.set("label", q.label.trim());
    s.set("value", q.value.trim());
    s.set("theme", theme);
    return `/api/badge/social?${s}`;
  };
  const alt = q.label.trim() || platforms[q.platform]?.name || "Badge";

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
      <div className="lg:sticky lg:top-20 lg:self-start">
        <Panel title="Social badge">
          <Field label="Platform">
            <div className="grid grid-cols-7 gap-1.5">
              {PLATFORMS.map(([id, x]) => (
                <button
                  key={id}
                  type="button"
                  title={x.name}
                  aria-label={x.name}
                  aria-pressed={opts.platform === id}
                  onClick={() => pick(id)}
                  className={`flex aspect-square items-center justify-center rounded-lg border text-base transition ${
                    opts.platform === id ? "border-accent bg-surface-2 text-accent" : "border-line bg-bg text-muted hover:text-fg"
                  }`}
                >
                  <x.icon />
                </button>
              ))}
            </div>
          </Field>
          <Field label="Label">
            <input className={inputCls} value={opts.label} maxLength={30} placeholder={p.name} onChange={set("label")} />
          </Field>
          <Field label="Value" hint="Leave empty for a single-part badge.">
            <input className={inputCls} value={opts.value} maxLength={40} onChange={set("value")} />
          </Field>
          <Field label="Link" hint="Where the badge points in your README.">
            <input className={inputCls} value={opts.link} placeholder="https://…" onChange={set("link")} />
          </Field>
        </Panel>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {THEMES.map(([id, t]) => (
          <BadgePreviewCard
            key={id}
            title={t.label}
            desc={t.desc}
            path={path(id)}
            alt={alt}
            link={q.link}
            light={id === "light"}
            file={`social-${q.platform}-${id}${q.value.trim() ? `-${slug(q.value)}` : ""}`}
          />
        ))}
      </div>
    </div>
  );
}
