"use client";

import BadgeBuilder from "./BadgeBuilder";
import SocialBadgeBuilder from "./SocialBadgeBuilder";
import { usePersistentState } from "./usePersistentState";

type Tab = "all" | "social" | "award";

const TABS: { value: Tab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "social", label: "Social" },
  { value: "award", label: "Award" },
];

const SECTIONS = {
  social: {
    title: "Social badges",
    desc: "Discord, GitHub, YouTube and more, in the Profilyze look or each platform's own colors.",
    body: <SocialBadgeBuilder />,
  },
  award: {
    title: "Award badges",
    desc: "Framed badges for features, rankings and shout-outs, like the ones at the top of popular repos.",
    body: <BadgeBuilder />,
  },
};

export default function BadgesBuilder() {
  const [s, setS] = usePersistentState("profilyze:badges-tab", { tab: "all" as Tab });
  const tab = TABS.some((t) => t.value === s.tab) ? s.tab : "all";
  const shown = tab === "all" ? (["social", "award"] as const) : ([tab] as const);

  return (
    <div className="space-y-6">
      <div role="tablist" aria-label="Badge type" className="flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => setS({ tab: t.value })}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              tab === t.value ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {shown.map((k) => (
        <section key={k} className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{SECTIONS[k].title}</h2>
            <p className="text-sm text-muted">{SECTIONS[k].desc}</p>
          </div>
          {SECTIONS[k].body}
        </section>
      ))}
    </div>
  );
}
