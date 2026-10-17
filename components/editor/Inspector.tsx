"use client";

import { useState } from "react";
import { FiCopy, FiTrash2 } from "react-icons/fi";
import { RATIOS, type BannerConfig, type BannerElement, type ElementOf, type StatKey } from "@/lib/banner/schema";
import { backgrounds, findFont, findIcon, fonts } from "@/lib/catalog";
import IconPicker from "./IconPicker";
import { ColorField, Field, IconButton, inputCls, NumberField, Panel, Segmented, Select, Slider, Toggle } from "./ui";

type Patch = (patch: Partial<BannerElement>, key?: string) => void;

const STAT_OPTIONS: { value: StatKey; label: string; token?: boolean }[] = [
  { value: "streak", label: "Current streak" },
  { value: "longest", label: "Longest streak" },
  { value: "contribs", label: "Contributions (last year)" },
  { value: "total", label: "Contributions (all time)" },
  { value: "commits", label: "Commits (last year)", token: true },
  { value: "stars", label: "Total stars", token: true },
  { value: "followers", label: "Followers" },
  { value: "repos", label: "Repositories" },
  { value: "prs", label: "Pull requests", token: true },
  { value: "views", label: "Profile views (counter)" },
];

export const TYPE_LABEL: Record<BannerElement["type"], string> = {
  text: "Text",
  icon: "Icon",
  icons: "Icon row",
  stat: "GitHub stat",
  graph: "Contribution graph",
  avatar: "Avatar",
};

export function ElementInspector({
  el,
  onPatch,
  onDuplicate,
  onDelete,
}: {
  el: BannerElement;
  onPatch: Patch;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <Panel
      title={TYPE_LABEL[el.type]}
      action={
        <div className="flex gap-1.5">
          <IconButton label="Duplicate (⌘D)" onClick={onDuplicate}>
            <FiCopy />
          </IconButton>
          <IconButton label="Delete (Del)" onClick={onDelete} danger>
            <FiTrash2 />
          </IconButton>
        </div>
      }
    >
      {el.type === "text" && <TextProps el={el} onPatch={onPatch} />}
      {el.type === "icon" && <IconProps el={el} onPatch={onPatch} />}
      {el.type === "icons" && <IconsProps el={el} onPatch={onPatch} />}
      {el.type === "stat" && <StatProps el={el} onPatch={onPatch} />}
      {el.type === "graph" && <GraphProps el={el} onPatch={onPatch} />}
      {el.type === "avatar" && <AvatarProps el={el} onPatch={onPatch} />}

      <div className="grid grid-cols-3 gap-2 border-t border-line pt-3">
        <NumberField label="X" value={el.x} onChange={(x) => onPatch({ x }, "x")} />
        <NumberField label="Y" value={el.y} onChange={(y) => onPatch({ y }, "y")} />
        <NumberField label="Size" value={el.s} onChange={(s) => onPatch({ s }, "s")} />
      </div>
      <Slider
        label="Opacity"
        value={el.o ?? 1}
        min={0.1}
        max={1}
        step={0.05}
        format={(v) => `${Math.round(v * 100)}%`}
        onChange={(o) => onPatch({ o }, "o")}
      />
    </Panel>
  );
}

function FontFields({ font, weight, onPatch }: { font: string; weight: number; onPatch: Patch }) {
  const def = findFont(font);
  return (
    <div className="grid grid-cols-2 gap-2">
      <Select
        label="Font"
        value={def.id}
        options={fonts.map((f) => ({ value: f.id, label: f.family }))}
        onChange={(id) => onPatch({ font: id, w: findFont(id).weights.at(-1) } as Partial<BannerElement>)}
      />
      <Select
        label="Weight"
        value={def.weights.includes(weight) ? weight : def.weights[0]}
        options={def.weights.map((w) => ({ value: w, label: String(w) }))}
        onChange={(w) => onPatch({ w } as Partial<BannerElement>)}
      />
    </div>
  );
}

function TextProps({ el, onPatch }: { el: ElementOf<"text">; onPatch: Patch }) {
  return (
    <>
      <Field label="Text">
        <input
          className={inputCls}
          value={el.text}
          maxLength={80}
          onChange={(e) => onPatch({ text: e.target.value } as Partial<BannerElement>, "text")}
        />
      </Field>
      <FontFields font={el.font} weight={el.w} onPatch={onPatch} />
      <ColorField label="Color" value={el.color} onChange={(color) => onPatch({ color } as Partial<BannerElement>, "color")} />
      <Slider
        label="Letter spacing"
        value={el.ls ?? 0}
        min={-0.1}
        max={0.5}
        step={0.01}
        format={(v) => `${v.toFixed(2)}em`}
        onChange={(ls) => onPatch({ ls } as Partial<BannerElement>, "ls")}
      />
    </>
  );
}

function IconProps({ el, onPatch }: { el: ElementOf<"icon">; onPatch: Patch }) {
  return (
    <>
      <IconPicker
        selected={[el.icon]}
        onToggle={(icon) => onPatch({ icon, inv: findIcon(icon)?.dark || undefined } as Partial<BannerElement>)}
      />
      <Toggle label="Invert colors (for dark logos)" checked={!!el.inv} onChange={(inv) => onPatch({ inv } as Partial<BannerElement>)} />
    </>
  );
}

function IconsProps({ el, onPatch }: { el: ElementOf<"icons">; onPatch: Patch }) {
  return (
    <>
      <IconPicker
        selected={el.icons}
        max={16}
        onToggle={(id) =>
          onPatch({
            icons: el.icons.includes(id) ? el.icons.filter((i) => i !== id) : [...el.icons, id],
          } as Partial<BannerElement>)
        }
      />
      <Slider label="Gap" value={el.gap} min={0} max={60} onChange={(gap) => onPatch({ gap } as Partial<BannerElement>, "gap")} />
      <Toggle label="Invert colors" checked={!!el.inv} onChange={(inv) => onPatch({ inv } as Partial<BannerElement>)} />
    </>
  );
}

function StatProps({ el, onPatch }: { el: ElementOf<"stat">; onPatch: Patch }) {
  return (
    <>
      <Select
        label="Stat"
        value={el.stat}
        options={STAT_OPTIONS.map((o) => ({ value: o.value, label: o.token ? `${o.label} *` : o.label }))}
        onChange={(stat) => onPatch({ stat } as Partial<BannerElement>)}
      />
      <Field label="Label" hint='e.g. "day streak" → 25 day streak. Start with "-" to attach it to the number: "-day streak" → 25-day streak.'>
        <input
          className={inputCls}
          value={el.label ?? ""}
          maxLength={30}
          placeholder="day streak"
          onChange={(e) => onPatch({ label: e.target.value || undefined } as Partial<BannerElement>, "label")}
        />
      </Field>
      <div>
        <span className="mb-1.5 block text-xs font-medium text-muted">Icon</span>
        <IconPicker
          withGlyphs
          glyphColor={el.accent ?? el.color}
          selected={el.icon ? [el.icon] : []}
          onToggle={(icon) => onPatch({ icon: icon || undefined } as Partial<BannerElement>)}
        />
      </div>
      <FontFields font={el.font} weight={el.w} onPatch={onPatch} />
      <div className="grid grid-cols-2 gap-3">
        <ColorField label="Text" value={el.color} onChange={(color) => onPatch({ color } as Partial<BannerElement>, "color")} />
        <ColorField
          label="Icon"
          value={el.accent ?? el.color}
          onChange={(accent) => onPatch({ accent } as Partial<BannerElement>, "accent")}
        />
      </div>
      <p className="text-xs text-zinc-500">* Needs a GITHUB_TOKEN on the server.</p>
    </>
  );
}

function GraphProps({ el, onPatch }: { el: ElementOf<"graph">; onPatch: Patch }) {
  return (
    <>
      <Slider label="Weeks" value={el.weeks} min={4} max={53} onChange={(weeks) => onPatch({ weeks } as Partial<BannerElement>, "weeks")} />
      <ColorField label="Color" value={el.color} onChange={(color) => onPatch({ color } as Partial<BannerElement>, "color")} />
    </>
  );
}

function AvatarProps({ el, onPatch }: { el: ElementOf<"avatar">; onPatch: Patch }) {
  return (
    <>
      <Toggle
        label="Ring"
        checked={!!el.ring}
        onChange={(on) => onPatch({ ring: on ? "#83ebf1" : undefined } as Partial<BannerElement>)}
      />
      {el.ring && <ColorField label="Ring color" value={el.ring} onChange={(ring) => onPatch({ ring } as Partial<BannerElement>, "ring")} />}
    </>
  );
}

// ---------- canvas ----------

export function CanvasInspector({
  config,
  onChange,
}: {
  config: BannerConfig;
  onChange: (fn: (c: BannerConfig) => BannerConfig, key?: string) => void;
}) {
  const bg = config.bg;
  const [urlDraft, setUrlDraft] = useState(bg.kind === "url" ? bg.url : "");
  const setBg = (next: BannerConfig["bg"], key?: string) => onChange((c) => ({ ...c, bg: next }), key);

  const ratio = RATIOS.reduce((best, r) => (Math.abs(r.h - config.h) < Math.abs(best.h - config.h) ? r : best));
  return (
    <Panel title="Canvas">
      <div>
        <span className="mb-1.5 block text-xs font-medium text-muted">Aspect ratio</span>
        <Segmented
          value={ratio.label}
          onChange={(label) => onChange((c) => ({ ...c, h: RATIOS.find((r) => r.label === label)!.h }))}
          options={RATIOS.map((r) => ({ value: r.label, label: r.label }))}
        />
      </div>
      <Segmented
        value={bg.kind}
        onChange={(kind) =>
          setBg(
            kind === "preset"
              ? { kind, name: "itachi1" }
              : kind === "gradient"
                ? { kind, from: "#0f172a", to: "#1e3a8a", angle: 135 }
                : { kind, url: urlDraft },
          )
        }
        options={[
          { value: "preset", label: "Image" },
          { value: "gradient", label: "Gradient" },
          { value: "url", label: "Custom URL" },
        ]}
      />

      {bg.kind === "preset" && (
        <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto pr-1">
          {backgrounds.map((b) => (
            <button
              key={b.name}
              type="button"
              aria-pressed={bg.name === b.name}
              onClick={() => setBg({ kind: "preset", name: b.name, fx: bg.fx, fy: bg.fy, zoom: bg.zoom })}
              className={`relative overflow-hidden rounded-lg border text-left transition ${
                bg.name === b.name ? "border-accent ring-1 ring-accent" : "border-line hover:border-zinc-500"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/assets/thumbs/${b.name}.webp`} alt="" loading="lazy" className="aspect-[4/1] w-full object-cover" />
              <span className="flex items-center justify-between gap-1 bg-surface-2 px-2 py-1 text-xs text-muted">
                <span className="truncate">{b.label}</span>
                {b.animated && (
                  <span className="rounded bg-zinc-800 px-1 text-[10px] font-medium uppercase text-zinc-300">Live</span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}

      {bg.kind === "preset" && (
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Slider
              label="Background zoom"
              value={bg.zoom ?? 1}
              min={1}
              max={3}
              step={0.05}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(zoom) => setBg({ ...bg, zoom }, "zoom")}
            />
          </div>
          <button
            type="button"
            onClick={() => setBg({ kind: "preset", name: bg.name })}
            className="rounded-md border border-line px-2.5 py-1.5 text-xs text-muted hover:border-zinc-500 hover:text-fg"
          >
            Reset position
          </button>
        </div>
      )}
      {bg.kind === "preset" && (
        <p className="-mt-1 text-xs text-zinc-500">Click the background on the banner, then drag it or its yellow corners.</p>
      )}

      {bg.kind === "gradient" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <ColorField label="From" value={bg.from} onChange={(from) => setBg({ ...bg, from }, "from")} />
            <ColorField label="To" value={bg.to} onChange={(to) => setBg({ ...bg, to }, "to")} />
          </div>
          <Slider label="Angle" value={bg.angle} min={0} max={360} format={(v) => `${v}°`} onChange={(angle) => setBg({ ...bg, angle }, "angle")} />
        </>
      )}

      {bg.kind === "url" && (
        <Field label="Image URL" hint="SVG, PNG, JPG, GIF or WebP · max 3 MB · 4:1 looks best">
          <input
            className={inputCls}
            type="url"
            placeholder="https://raw.githubusercontent.com/…/background.svg"
            value={urlDraft}
            onChange={(e) => {
              setUrlDraft(e.target.value);
              setBg({ kind: "url", url: e.target.value }, "url");
            }}
          />
        </Field>
      )}

      <div className="grid grid-cols-2 gap-3 border-t border-line pt-3">
        <Slider
          label="Darken"
          value={config.dim}
          min={0}
          max={0.8}
          step={0.05}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(dim) => onChange((c) => ({ ...c, dim }), "dim")}
        />
        <Slider label="Corner radius" value={config.r} min={0} max={40} onChange={(r) => onChange((c) => ({ ...c, r }), "r")} />
      </div>
    </Panel>
  );
}
