"use client";

import { useEffect, useState } from "react";

/**
 * useState that survives reloads via localStorage. Reads after mount (so server and first client
 * render match) and merges into `initial`, so newly added fields get their defaults.
 */
export function usePersistentState<T extends object>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setValue((v) => ({ ...v, ...JSON.parse(raw) }));
    } catch {
      /* storage unavailable or corrupt: keep defaults */
    }
    setLoaded(true);
  }, [key]);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage unavailable */
    }
  }, [key, value, loaded]);

  return [value, setValue, loaded] as const;
}
