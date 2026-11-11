"use client";

import { useEffect, useState } from "react";
import { FiCheck, FiCopy, FiExternalLink } from "react-icons/fi";
import { decodeConfig, encodeConfig } from "@/lib/banner/codec";
import { legacyToConfig } from "@/lib/banner/legacy";
import { bannerQuery, parseConfig, withUser, type BannerConfig } from "@/lib/banner/schema";
import { SITE_URL } from "@/lib/site";
import { inputCls, Segmented } from "./ui";

/** Accepts a banner image URL, an editor link, or a legacy query-string URL. */
export async function configFromUrl(raw: string): Promise<BannerConfig> {
  const url = new URL(raw.trim(), SITE_URL);
  const c = url.searchParams.get("c");
  if (c) return withUser(parseConfig(await decodeConfig(c)), url.searchParams.get("u"));
  if (url.pathname.endsWith("/api/profile/banner")) return legacyToConfig(url.searchParams);
  throw new Error("Not a Profilyze banner URL");
}

/** The banner's link query (`u=…&c=…`), or "" while encoding. */
export function useBannerQuery(config: BannerConfig) {
  const [query, setQuery] = useState("");
  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => encodeConfig(config).then((e) => alive && setQuery(bannerQuery(config, e))), 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [config]);
  return query;
}

/** Embed code for the banner: a slim bar under the canvas, like an export bar. */
export default function EmbedBar({ query, alt }: { query: string; alt: string }) {
  const imageUrl = `${SITE_URL}/api/banner?${query}`;
  const editUrl = `${SITE_URL}/?${query}`;
  const formats = {
    Markdown: `[![${alt}](${imageUrl})](${editUrl})`,
    HTML: `<a href="${editUrl}"><img src="${imageUrl}" alt="${alt}" width="100%" /></a>`,
    URL: imageUrl,
  };
  type Format = keyof typeof formats;
  const [tab, setTab] = useState<Format>("Markdown");
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(formats[tab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface p-3 lg:flex-nowrap lg:rounded-none lg:border-0 lg:border-t lg:px-4">
      <div className="flex w-full items-center justify-between gap-2 lg:w-auto">
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">Embed</span>
        <div className="w-52">
          <Segmented value={tab} onChange={setTab} options={(Object.keys(formats) as Format[]).map((f) => ({ value: f, label: f }))} />
        </div>
      </div>
      <code
        title={formats[tab]}
        className="min-w-0 flex-1 basis-full truncate rounded-lg border border-line bg-bg px-3 py-2 font-mono text-[11px] text-zinc-300 lg:basis-auto"
      >
        {query ? formats[tab] : "…"}
      </code>
      <a
        href={query ? `/api/banner?${query}` : undefined}
        target="_blank"
        rel="noreferrer"
        title="Open the rendered SVG"
        className="flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-xs text-muted transition hover:border-zinc-500 hover:text-fg"
      >
        <FiExternalLink /> SVG
      </a>
      <button
        type="button"
        onClick={copy}
        disabled={!query}
        className="flex h-9 min-w-24 flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent px-4 text-sm font-semibold text-zinc-900 transition hover:brightness-110 disabled:opacity-40 lg:flex-none"
      >
        {copied ? <FiCheck /> : <FiCopy />}
        {copied ? "Copied" : `Copy ${tab === "URL" ? "URL" : "code"}`}
      </button>
    </div>
  );
}

/** Loads a banner from any of its links, so existing READMEs can be edited. */
export function ImportBanner({ onImport }: { onImport: (c: BannerConfig) => void }) {
  const [importUrl, setImportUrl] = useState("");
  const [importError, setImportError] = useState<string | null>(null);

  const doImport = async () => {
    try {
      onImport(await configFromUrl(importUrl));
      setImportUrl("");
      setImportError(null);
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "Invalid URL");
    }
  };

  return (
    <div>
      <span className="mb-1.5 block text-xs font-medium text-muted">Edit an existing banner</span>
      <div className="flex gap-2">
        <input
          className={`${inputCls} py-1.5 text-xs`}
          placeholder="Paste a banner URL"
          aria-label="Banner URL to edit"
          value={importUrl}
          onChange={(e) => setImportUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && doImport()}
        />
        <button
          type="button"
          onClick={doImport}
          disabled={!importUrl.trim()}
          className="shrink-0 rounded-lg border border-line bg-surface-2 px-3 text-xs font-medium hover:border-zinc-500 disabled:opacity-40"
        >
          Load
        </button>
      </div>
      <p className="mt-1.5 text-[11px] text-zinc-500">
        {importError ? <span className="text-red-400">{importError}</span> : "Old /api/profile/banner links work too. Clicking a banner on GitHub also opens it here."}
      </p>
    </div>
  );
}
