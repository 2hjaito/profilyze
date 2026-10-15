"use client";

import { useEffect, useState } from "react";
import type { GithubData } from "@/lib/github/types";

export type GithubState =
  | { status: "idle" | "loading"; data: GithubData | null; views?: number }
  | { status: "ok"; data: GithubData; full: boolean; views?: number }
  | { status: "error"; data: null; message: string; views?: undefined };

export function useGithub(user: string | undefined): GithubState {
  const [state, setState] = useState<GithubState>({ status: "idle", data: null });

  useEffect(() => {
    if (!user) {
      setState({ status: "idle", data: null });
      return;
    }
    const ctrl = new AbortController();
    setState((s) => ({ status: "loading", data: s.data, views: s.views }));
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/github/data?user=${encodeURIComponent(user)}`, { signal: ctrl.signal });
        const json = await res.json();
        if (!res.ok) setState({ status: "error", data: null, message: json.error ?? "Failed to load" });
        else setState({ status: "ok", data: json.data, full: json.full, views: json.views });
      } catch (e) {
        if (!ctrl.signal.aborted) setState({ status: "error", data: null, message: String(e) });
      }
    }, 500);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [user]);

  return state;
}
