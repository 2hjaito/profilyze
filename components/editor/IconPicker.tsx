"use client";

import { useMemo, useState } from "react";
import { animatedIcons, glyphs, vectorIcons, type Icon } from "@/lib/catalog";
import { inputCls } from "./ui";

/**
 * Searchable icon grid: animated icons first, then vector logos. Single or multi select.
 * `withGlyphs` adds the line glyphs (for stats) and a "none" choice, reported as "".
 */
export default function IconPicker({
  selected,
  onToggle,
  max,
  withGlyphs,
  glyphColor = "currentColor",
  vectorOnly,
}: {
  selected: string[];
  onToggle: (id: string) => void;
  max?: number;
  withGlyphs?: boolean;
  glyphColor?: string;
  vectorOnly?: boolean;
}) {
  const [q, setQ] = useState("");
  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const match = (i: Icon) => !needle || i.label.toLowerCase().includes(needle) || i.id.includes(needle);
    return [
      { title: "Animated", icons: vectorOnly ? [] : animatedIcons.filter(match) },
      { title: "Vector · sharp at any size", icons: vectorIcons.filter(match) },
    ].filter((g) => g.icons.length);
  }, [q, vectorOnly]);

  const glyphList = withGlyphs
    ? Object.entries(glyphs).filter(([id, g]) => !q.trim() || `${id} ${g.label}`.toLowerCase().includes(q.trim().toLowerCase()))
    : [];

  return (
    <div className="space-y-2">
      <input className={`${inputCls} py-1.5`} placeholder="Search icons…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
        {withGlyphs && (
          <div>
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">Line</p>
            <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8">
              <button
                type="button"
                title="No icon"
                aria-pressed={selected.length === 0}
                onClick={() => onToggle("")}
                className={`${cellCls(selected.length === 0)} text-[10px] text-muted`}
              >
                None
              </button>
              {glyphList.map(([id, g]) => (
                <button
                  key={id}
                  type="button"
                  title={g.label}
                  aria-label={g.label}
                  aria-pressed={selected.includes(id)}
                  onClick={() => onToggle(id)}
                  className={cellCls(selected.includes(id))}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-3/5 w-3/5"
                    fill="none"
                    stroke={glyphColor}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    dangerouslySetInnerHTML={{ __html: g.body }}
                  />
                </button>
              ))}
            </div>
          </div>
        )}
        {groups.map((g) => (
          <div key={g.title}>
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">{g.title}</p>
            <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8">
              {g.icons.map((icon) => (
                <IconCell
                  key={icon.id}
                  icon={icon}
                  index={selected.indexOf(icon.id)}
                  showIndex={selected.length > 1}
                  disabled={max !== undefined && selected.length >= max}
                  onClick={() => onToggle(icon.id)}
                />
              ))}
            </div>
          </div>
        ))}
        {groups.length === 0 && glyphList.length === 0 && <p className="py-4 text-center text-xs text-muted">No icons match.</p>}
      </div>
    </div>
  );
}

function IconCell({
  icon,
  index,
  showIndex,
  disabled,
  onClick,
}: {
  icon: Icon;
  index: number;
  showIndex: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const on = index >= 0;
  return (
    <button
      type="button"
      title={icon.label}
      aria-label={icon.label}
      aria-pressed={on}
      disabled={!on && disabled}
      onClick={onClick}
      className={`${cellCls(on)} p-1.5 disabled:opacity-30`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/${icon.file}`}
        alt=""
        loading="lazy"
        className={`max-h-full max-w-full object-contain ${icon.dark ? "invert" : ""}`}
      />
      {on && showIndex && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-0.5 text-[10px] font-semibold text-zinc-900">
          {index + 1}
        </span>
      )}
    </button>
  );
}

const cellCls = (on: boolean) =>
  `relative flex aspect-square items-center justify-center rounded-lg border transition ${
    on ? "border-accent bg-accent/10" : "border-line bg-bg hover:border-zinc-500"
  }`;
