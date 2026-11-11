"use client";

import { useEffect, useState } from "react";
import { awardIcons, awardStyles, type AwardIcon, type AwardStyle } from "@/lib/cards/award";
import { glyphs } from "@/lib/catalog";
import BadgePreviewCard, { slug } from "./BadgePreviewCard";
import { Field, inputCls, Panel, Segmented } from "./editor/ui";
import { usePersistentState } from "./usePersistentState";

const STYLES = Object.entries(awardStyles) as [AwardStyle, (typeof awardStyles)[AwardStyle]][];
const RANKS = ["", "1", "2", "3"] as const;

function IconPreview({ name }: { name: AwardIcon }) {
  if (name === "star")
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
        <path d="M12 2.5l2.9 6.2 6.6.7-5 4.5 1.4 6.6L12 17.3l-5.9 3.2 1.4-6.6-5-4.5 6.6-.7z" />
      </svg>
    );
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: glyphs[name]?.body ?? "" }}
    />
  );
}

export default function BadgeBuilder() {
  const [opts, setOpts] = usePersistentState("profilyze:badges", {
    label: "Profilyze",
    title: "Featured Banner",
    rank: "",
    icon: "star" as AwardIcon,
    link: "",
  });
  const set = (k: "label" | "title" | "rank" | "link") => (e: React.ChangeEvent<HTMLInputElement>) =>
    setOpts((o) => ({ ...o, [k]: e.target.value }));
  const [q, setQ] = useState(opts);

  useEffect(() => {
    const t = setTimeout(() => setQ(opts), 400);
    return () => clearTimeout(t);
  }, [opts]);

  const path = (style: AwardStyle) => {
    const p = new URLSearchParams({ label: q.label, title: q.title, style });
    if (q.rank) p.set("rank", q.rank);
    else if (q.icon !== "star") p.set("icon", q.icon);
    return `/api/badge?${p}`;
  };
  const rankPreset = (RANKS as readonly string[]).includes(opts.rank) ? opts.rank : "custom";

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
      <div className="lg:sticky lg:top-20 lg:self-start">
        <Panel title="Award badge">
          <Field label="Label (small, above)">
            <input className={inputCls} value={opts.label} maxLength={40} onChange={set("label")} />
          </Field>
          <Field label="Title">
            <input className={inputCls} value={opts.title} maxLength={40} onChange={set("title")} />
          </Field>
          <div>
            <span className="mb-1.5 block text-xs font-medium text-muted">Center</span>
            <Segmented
              value={rankPreset === "custom" ? "" : rankPreset}
              onChange={(rank) => setOpts((o) => ({ ...o, rank }))}
              options={[
                { value: "", label: "Icon" },
                { value: "1", label: "#1" },
                { value: "2", label: "#2" },
                { value: "3", label: "#3" },
              ]}
            />
            <span className="mt-1.5 block text-xs text-zinc-500">#2 and #3 turn the gold medal silver and bronze.</span>
          </div>
          {opts.rank ? (
            <Field label="Rank" hint="Any number up to 3 digits.">
              <input className={inputCls} value={opts.rank} maxLength={3} onChange={set("rank")} />
            </Field>
          ) : (
            <Field label="Icon">
              <div className="grid grid-cols-8 gap-1.5">
                {awardIcons.map((name) => (
                  <button
                    key={name}
                    type="button"
                    title={name}
                    aria-label={name}
                    aria-pressed={opts.icon === name}
                    onClick={() => setOpts((o) => ({ ...o, icon: name }))}
                    className={`flex aspect-square items-center justify-center rounded-lg border transition ${
                      opts.icon === name ? "border-accent bg-surface-2 text-accent" : "border-line bg-bg text-muted hover:text-fg"
                    }`}
                  >
                    <IconPreview name={name} />
                  </button>
                ))}
              </div>
            </Field>
          )}
          <Field label="Link" hint="Optional. Where the badge points in your README.">
            <input className={inputCls} value={opts.link} placeholder="https://…" onChange={set("link")} />
          </Field>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {STYLES.map(([id, s]) => (
          <BadgePreviewCard
            key={id}
            title={s.label}
            desc={s.desc}
            path={path(id)}
            alt={`${q.label} ${q.title}`.trim()}
            link={q.link}
            file={`award-${id}-${slug(q.title) || "badge"}${q.rank ? `-${q.rank}` : ""}`}
          />
        ))}
      </div>
    </div>
  );
}
