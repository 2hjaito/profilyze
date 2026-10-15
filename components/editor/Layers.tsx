"use client";

import { FiArrowDown, FiArrowUp, FiEye, FiEyeOff } from "react-icons/fi";
import type { BannerElement } from "@/lib/banner/schema";
import { TYPE_LABEL } from "./Inspector";
import { Panel } from "./ui";

const describe = (el: BannerElement) =>
  el.type === "text" ? el.text || "Empty text" : el.type === "stat" ? `${TYPE_LABEL.stat}: ${el.stat}` : TYPE_LABEL[el.type];

export default function Layers({
  els,
  selected,
  onSelect,
  onToggle,
  onMove,
  action,
}: {
  els: BannerElement[];
  selected: string | null;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onMove: (id: string, dir: 1 | -1) => void;
  action?: React.ReactNode;
}) {
  // Last element renders on top, so list it first.
  const ordered = [...els].reverse();
  return (
    <Panel title="Layers" action={action}>
      {ordered.length === 0 && <p className="text-xs text-muted">No elements yet.</p>}
      <ul className="-mx-2 space-y-0.5">
        {ordered.map((el, i) => (
          <li key={el.id}>
            <div
              className={`group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm ${
                selected === el.id ? "bg-accent/10 text-fg" : "text-muted hover:bg-surface-2 hover:text-fg"
              }`}
            >
              <button type="button" onClick={() => onSelect(el.id)} className={`min-w-0 flex-1 truncate text-left ${el.hidden ? "opacity-40" : ""}`}>
                {describe(el)}
              </button>
              <span className="flex opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                <LayerBtn label="Bring forward" disabled={i === 0} onClick={() => onMove(el.id, 1)}>
                  <FiArrowUp />
                </LayerBtn>
                <LayerBtn label="Send backward" disabled={i === ordered.length - 1} onClick={() => onMove(el.id, -1)}>
                  <FiArrowDown />
                </LayerBtn>
              </span>
              <LayerBtn label={el.hidden ? "Show" : "Hide"} onClick={() => onToggle(el.id)}>
                {el.hidden ? <FiEyeOff /> : <FiEye />}
              </LayerBtn>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function LayerBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-6 w-6 items-center justify-center rounded text-xs hover:bg-zinc-700/50 disabled:opacity-30"
    >
      {children}
    </button>
  );
}
