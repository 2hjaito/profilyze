"use client";

import { useState } from "react";

export const inputCls =
  "w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-fg placeholder:text-zinc-600 outline-none transition focus:border-accent focus:ring-1 focus:ring-accent";

export function Panel({
  title,
  action,
  children,
  className = "",
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-line bg-surface ${className}`}>
      <div className="flex min-h-11 items-center justify-between gap-2 border-b border-line px-4 py-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      <div className="space-y-3 p-4">{children}</div>
    </section>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-zinc-500">{hint}</span>}
    </label>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode }[];
}) {
  return (
    <div className="flex rounded-lg border border-line bg-bg p-0.5 text-xs">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 transition ${
            value === o.value ? "bg-surface-2 text-fg" : "text-muted hover:text-fg"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format = (v) => String(v),
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex justify-between text-xs font-medium text-muted">
        {label}
        <span className="tabular-nums text-zinc-400">{format(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--color-accent)]"
      />
    </label>
  );
}

export function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-line bg-bg px-2.5 py-1.5 text-sm focus-within:border-accent">
      <span className="text-xs text-muted">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => e.target.value !== "" && onChange(Number(e.target.value))}
        className="w-full min-w-0 bg-transparent text-right tabular-nums outline-none"
      />
    </label>
  );
}

const SWATCHES = ["#ffffff", "#83ebf1", "#39d353", "#ff9640", "#f472b6", "#a78bfa", "#facc15", "#0f172a"];

export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <div>
      <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>
      <div className="flex items-center gap-2">
        <label
          className="relative h-8 w-8 shrink-0 cursor-pointer overflow-hidden rounded-md border border-line"
          style={{ background: value }}
        >
          <input
            type="color"
            value={value.length === 7 ? value : "#ffffff"}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label={label}
          />
        </label>
        <input
          className={`${inputCls} py-1.5 font-mono text-xs`}
          value={draft ?? value}
          onChange={(e) => {
            setDraft(e.target.value);
            if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) onChange(e.target.value);
          }}
          onBlur={() => setDraft(null)}
        />
      </div>
      <div className="mt-2 flex gap-1.5">
        {SWATCHES.map((c) => (
          <button
            key={c}
            type="button"
            title={c}
            onClick={() => onChange(c)}
            className={`h-5 w-5 rounded-full border ${value.toLowerCase() === c ? "border-accent ring-1 ring-accent" : "border-line"}`}
            style={{ background: c }}
          />
        ))}
      </div>
    </div>
  );
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 text-sm"
    >
      <span className="text-xs font-medium text-muted">{label}</span>
      <span className={`relative h-5 w-9 shrink-0 rounded-full transition ${checked ? "bg-accent" : "bg-zinc-700"}`}>
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? "left-4.5" : "left-0.5"}`}
        />
      </span>
    </button>
  );
}

export function Select<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <Field label={label}>
      <select
        className={inputCls}
        value={String(value)}
        onChange={(e) => {
          const o = options.find((o) => String(o.value) === e.target.value);
          if (o) onChange(o.value);
        }}
      >
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function IconButton({
  label,
  onClick,
  disabled,
  children,
  danger,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-md border border-line bg-surface-2 text-muted transition hover:border-zinc-500 hover:text-fg disabled:cursor-not-allowed disabled:opacity-40 ${
        danger ? "hover:text-red-400" : ""
      }`}
    >
      {children}
    </button>
  );
}
