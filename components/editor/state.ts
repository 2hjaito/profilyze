import { useCallback, useReducer } from "react";
import type { BannerConfig, BannerElement } from "@/lib/banner/schema";

type History = {
  past: BannerConfig[];
  present: BannerConfig;
  future: BannerConfig[];
  /** Snapshot taken before a transient change (drag/resize), pushed on commit. */
  pending: BannerConfig | null;
  lastKey: string | null;
  lastAt: number;
};

type Action =
  | { type: "update"; fn: (c: BannerConfig) => BannerConfig; transient?: boolean; key?: string }
  | { type: "commit" }
  | { type: "load"; config: BannerConfig }
  | { type: "undo" }
  | { type: "redo" };

const LIMIT = 100;

function reducer(h: History, a: Action): History {
  switch (a.type) {
    case "update": {
      const next = a.fn(h.present);
      if (next === h.present) return h;
      if (a.transient) return { ...h, present: next, pending: h.pending ?? h.present };
      // Typing in one field within a short window collapses into a single undo step.
      const now = Date.now();
      const coalesce = a.key && a.key === h.lastKey && now - h.lastAt < 1000;
      return {
        past: coalesce ? h.past : [...h.past, h.present].slice(-LIMIT),
        present: next,
        future: [],
        pending: null,
        lastKey: a.key ?? null,
        lastAt: now,
      };
    }
    case "commit":
      if (!h.pending) return h;
      return { ...h, past: [...h.past, h.pending].slice(-LIMIT), future: [], pending: null, lastKey: null };
    case "load":
      return { ...h, past: [...h.past, h.present].slice(-LIMIT), present: a.config, future: [], pending: null, lastKey: null };
    case "undo": {
      const prev = h.past.at(-1);
      if (!prev) return h;
      return { ...h, past: h.past.slice(0, -1), present: prev, future: [h.present, ...h.future], pending: null, lastKey: null };
    }
    case "redo": {
      const [next, ...rest] = h.future;
      if (!next) return h;
      return { ...h, past: [...h.past, h.present], present: next, future: rest, pending: null, lastKey: null };
    }
  }
}

export function useBannerHistory(initial: BannerConfig) {
  const [h, dispatch] = useReducer(reducer, {
    past: [],
    present: initial,
    future: [],
    pending: null,
    lastKey: null,
    lastAt: 0,
  });

  const update = useCallback(
    (fn: (c: BannerConfig) => BannerConfig, opts?: { transient?: boolean; key?: string }) =>
      dispatch({ type: "update", fn, ...opts }),
    [],
  );

  const updateElement = useCallback(
    (id: string, patch: Partial<BannerElement>, opts?: { transient?: boolean; key?: string }) =>
      dispatch({
        type: "update",
        fn: (c) => ({ ...c, els: c.els.map((e) => (e.id === id ? ({ ...e, ...patch } as BannerElement) : e)) }),
        ...opts,
      }),
    [],
  );

  return {
    config: h.present,
    canUndo: h.past.length > 0,
    canRedo: h.future.length > 0,
    update,
    updateElement,
    commit: useCallback(() => dispatch({ type: "commit" }), []),
    load: useCallback((config: BannerConfig) => dispatch({ type: "load", config }), []),
    undo: useCallback(() => dispatch({ type: "undo" }), []),
    redo: useCallback(() => dispatch({ type: "redo" }), []),
  };
}

export const newId = (type: string, els: BannerElement[]) => {
  let i = 1;
  while (els.some((e) => e.id === `${type}${i}`)) i++;
  return `${type}${i}`;
};
