"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FiAlertCircle, FiCheck, FiCornerUpLeft, FiCornerUpRight, FiGithub, FiLoader, FiPlus } from "react-icons/fi";
import { decodeConfig } from "@/lib/banner/codec";
import { DEFAULT_CONFIG, H, parseConfig, W, type BannerElement } from "@/lib/banner/schema";
import { templates } from "@/lib/banner/templates";
import Canvas from "./Canvas";
import EmbedPanel, { useEncoded } from "./EmbedPanel";
import { CanvasInspector, ElementInspector, TYPE_LABEL } from "./Inspector";
import Layers from "./Layers";
import { newId, useBannerHistory } from "./state";
import { IconButton } from "./ui";
import { useGithub, type GithubState } from "./useGithub";

const DRAFT_KEY = "profilyze:draft";

const NEW_ELEMENT: Record<BannerElement["type"], (id: string) => BannerElement> = {
  text: (id) => ({ id, type: "text", text: "New text", x: W / 2 - 80, y: H / 2 - 16, s: 32, font: "inter", w: 700, color: "#ffffff" }),
  icon: (id) => ({ id, type: "icon", icon: "react", x: W / 2 - 40, y: H / 2 - 40, s: 80 }),
  icons: (id) => ({ id, type: "icons", icons: ["javascript", "typescript", "react"], x: W / 2 - 60, y: H / 2 - 16, s: 32, gap: 8 }),
  stat: (id) => ({ id, type: "stat", stat: "streak", icon: "flame", label: "day streak", x: W / 2 - 80, y: H / 2 - 10, s: 20, font: "inter", w: 700, color: "#ffffff", accent: "#ff9640" }),
  graph: (id) => ({ id, type: "graph", weeks: 20, x: W / 2 - 170, y: H / 2 - 60, s: 12, color: "#39d353" }),
  avatar: (id) => ({ id, type: "avatar", x: W / 2 - 60, y: H / 2 - 60, s: 120, ring: "#83ebf1" }),
};

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));

export default function Editor() {
  const h = useBannerHistory(DEFAULT_CONFIG);
  const { config, update, updateElement, commit, load, undo, redo } = h;
  const [selected, setSelected] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const github = useGithub(config.user);
  const encoded = useEncoded(config);

  // Load from ?c= (links from READMEs), else the last draft.
  useEffect(() => {
    (async () => {
      const c = new URLSearchParams(window.location.search).get("c");
      try {
        // Load the draft first so a shared ?c= design replaces it but stays one undo away.
        const draft = localStorage.getItem(DRAFT_KEY);
        if (draft) load(parseConfig(JSON.parse(draft)));
        if (c) load(parseConfig(await decodeConfig(c)));
      } catch {
        /* fall back to the default banner */
      }
      setReady(true);
    })();
  }, [load]);

  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(config));
      } catch {
        /* storage unavailable */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [config, ready]);

  const selectedEl = config.els.find((e) => e.id === selected);

  const addElement = (type: BannerElement["type"]) => {
    const id = newId(type, config.els);
    update((c) => ({ ...c, els: [...c.els, NEW_ELEMENT[type](id)] }));
    setSelected(id);
    setAddOpen(false);
  };

  const removeElement = useCallback(
    (id: string) => {
      update((c) => ({ ...c, els: c.els.filter((e) => e.id !== id) }));
      setSelected(null);
    },
    [update],
  );

  const duplicateElement = useCallback(
    (id: string) => {
      const el = config.els.find((e) => e.id === id);
      if (!el) return;
      const copy = { ...el, id: newId(el.type, config.els), x: el.x + 16, y: el.y + 16 } as BannerElement;
      update((c) => ({ ...c, els: [...c.els, copy] }));
      setSelected(copy.id);
    },
    [config.els, update],
  );

  const moveLayer = (id: string, dir: 1 | -1) =>
    update((c) => {
      const i = c.els.findIndex((e) => e.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= c.els.length) return c;
      const els = [...c.els];
      [els[i], els[j]] = [els[j], els[i]];
      return { ...c, els };
    });

  // Keyboard: nudge, delete, duplicate, undo/redo.
  const nudgeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") return (e.preventDefault(), redo());
      if (!selectedEl) return;
      if (mod && e.key.toLowerCase() === "d") return (e.preventDefault(), duplicateElement(selectedEl.id));
      if (e.key === "Delete" || e.key === "Backspace") return (e.preventDefault(), removeElement(selectedEl.id));
      if (e.key === "Escape") return setSelected(null);
      const step = e.shiftKey ? 10 : 1;
      const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
      if (delta) {
        e.preventDefault();
        updateElement(selectedEl.id, { x: selectedEl.x + delta[0], y: selectedEl.y + delta[1] }, { transient: true });
        if (nudgeRef.current) clearTimeout(nudgeRef.current);
        nudgeRef.current = setTimeout(commit, 400);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedEl, undo, redo, commit, updateElement, duplicateElement, removeElement]);

  const nameText = config.els.find((e) => e.type === "text")?.text;
  const alt = `${(nameText as string | undefined)?.trim() || "Profile"} banner`;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => setAddOpen((o) => !o)}
            aria-expanded={addOpen}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3 text-sm font-semibold text-zinc-900 transition hover:brightness-110"
          >
            <FiPlus /> Add element
          </button>
          {addOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setAddOpen(false)} />
              <ul className="absolute left-0 top-11 z-50 w-52 overflow-hidden rounded-lg border border-line bg-surface-2 py-1 shadow-xl">
                {(Object.keys(NEW_ELEMENT) as BannerElement["type"][]).map((type) => (
                  <li key={type}>
                    <button type="button" onClick={() => addElement(type)} className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-700/40">
                      {TYPE_LABEL[type]}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <IconButton label="Undo (⌘Z)" onClick={undo} disabled={!h.canUndo}>
          <FiCornerUpLeft />
        </IconButton>
        <IconButton label="Redo (⇧⌘Z)" onClick={redo} disabled={!h.canRedo}>
          <FiCornerUpRight />
        </IconButton>

        <div className="mx-1 hidden h-6 w-px bg-line sm:block" />

        <div className="flex items-center gap-1 text-xs text-muted">
          <span className="hidden sm:inline">Templates:</span>
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                load({ ...t.config, user: config.user });
                setSelected(null);
              }}
              className="rounded-md border border-line px-2.5 py-1.5 hover:border-zinc-500 hover:text-fg"
            >
              {t.label}
            </button>
          ))}
        </div>

        <GithubUserInput
          value={config.user ?? ""}
          state={github}
          onChange={(user) => update((c) => ({ ...c, user: user || undefined }), { key: "user" })}
        />
      </div>

      {/* Canvas */}
      <div className="sticky top-16 z-30 rounded-xl border border-line bg-surface p-3 shadow-[0_12px_24px_-12px_rgb(0_0_0/0.6)] sm:p-5">
        <div className="bg-[conic-gradient(#1a1a1f_25%,#141418_0_50%,#1a1a1f_0_75%,#141418_0)] [background-size:16px_16px]">
          <Canvas
            config={config}
            github={github.data}
            views={github.views}
            selected={selected}
            onSelect={setSelected}
            onChange={(id, patch) => updateElement(id, patch, { transient: true })}
            onCommit={commit}
          />
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          Drag to move · corners to resize · arrows to nudge (⇧ ×10) · hold ⌥ to disable snapping
          {github.status === "error" && <span className="text-red-400"> · {github.message}</span>}
          {github.status === "ok" && !github.full && (
            <span> · Stars, commits and PRs need a GITHUB_TOKEN on the server</span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_minmax(0,1fr)_minmax(0,400px)]">
        <Layers
          els={config.els}
          selected={selected}
          onSelect={setSelected}
          onToggle={(id) => update((c) => ({ ...c, els: c.els.map((e) => (e.id === id ? { ...e, hidden: !e.hidden || undefined } : e)) }))}
          onMove={moveLayer}
          action={
            selected && (
              <button type="button" onClick={() => setSelected(null)} className="text-xs text-muted hover:text-fg">
                Canvas
              </button>
            )
          }
        />
        {selectedEl ? (
          <ElementInspector
            key={selectedEl.id}
            el={selectedEl}
            onPatch={(patch, key) => updateElement(selectedEl.id, patch, { key: key && `${selectedEl.id}.${key}` })}
            onDuplicate={() => duplicateElement(selectedEl.id)}
            onDelete={() => removeElement(selectedEl.id)}
          />
        ) : (
          <CanvasInspector config={config} onChange={(fn, key) => update(fn, { key })} />
        )}
        <EmbedPanel
          encoded={encoded}
          alt={alt}
          onImport={(c) => {
            load(c);
            setSelected(null);
          }}
        />
      </div>
    </div>
  );
}

const USER_STYLES: Record<GithubState["status"], { ring: string; icon: string }> = {
  idle: { ring: "border-line focus-within:border-accent focus-within:ring-accent", icon: "text-muted" },
  loading: { ring: "border-amber-400/60 ring-amber-400/30", icon: "text-amber-300" },
  ok: { ring: "border-emerald-500/70 ring-emerald-500/25", icon: "text-emerald-400" },
  error: { ring: "border-red-500/70 ring-red-500/25", icon: "text-red-400" },
};

/** Username field whose GitHub icon and border reflect the lookup: spinning, found, or not found. */
function GithubUserInput({ value, state, onChange }: { value: string; state: GithubState; onChange: (v: string) => void }) {
  const style = USER_STYLES[value ? state.status : "idle"];
  const title =
    state.status === "error" ? state.message : state.status === "ok" ? `${state.data.name ?? state.data.login} · connected` : undefined;
  return (
    <label
      title={title}
      className={`ml-auto flex h-9 w-full items-center gap-2 rounded-lg border bg-bg px-3 ring-1 ring-transparent transition sm:w-64 ${style.ring}`}
    >
      {value && state.status === "loading" ? (
        <FiLoader className={`shrink-0 animate-spin ${style.icon}`} aria-label="Loading GitHub data" />
      ) : (
        <FiGithub className={`shrink-0 transition-colors ${style.icon}`} aria-hidden="true" />
      )}
      <input
        className="w-full min-w-0 bg-transparent text-sm text-fg outline-none placeholder:text-zinc-600"
        placeholder="GitHub username"
        aria-label="GitHub username"
        aria-invalid={state.status === "error"}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 39))}
      />
      {value && state.status === "ok" && <FiCheck className="shrink-0 text-emerald-400" aria-label="Connected" />}
      {value && state.status === "error" && <FiAlertCircle className="shrink-0 text-red-400" aria-label={state.message} />}
    </label>
  );
}
