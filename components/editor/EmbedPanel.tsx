"use client";

import { useEffect, useState } from "react";
import { FiCheck, FiCopy, FiExternalLink } from "react-icons/fi";
import { decodeConfig, encodeConfig } from "@/lib/banner/codec";
import { legacyToConfig } from "@/lib/banner/legacy";
import { parseConfig, type BannerConfig } from "@/lib/banner/schema";
import { SITE_URL } from "@/lib/site";
import { inputCls, Panel, Segmented } from "./ui";

/** Accepts a banner image URL, an editor link, or a legacy query-string URL. */
export async function configFromUrl(raw: string): Promise<BannerConfig> {
  const url = new URL(raw.trim(), SITE_URL);
  const c = url.searchParams.get("c");
  if (c) return parseConfig(await decodeConfig(c));
  if (url.pathname.endsWith("/api/profile/banner")) return legacyToConfig(url.searchParams);
  throw new Error("Not a Profilyze banner URL");
}

export function useEncoded(config: BannerConfig) {
  const [encoded, setEncoded] = useState("");
  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => encodeConfig(config).then((e) => alive && setEncoded(e)), 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [config]);
  return encoded;
}

export default function EmbedPanel({
  encoded,
  alt,
  onImport,
}: {
  encoded: string;
  alt: string;
  onImport: (c: BannerConfig) => void;
}) {
  const imageUrl = `${SITE_URL}/api/banner?c=${encoded}`;
  const editUrl = `${SITE_URL}/?c=${encoded}`;
  const formats = {
    Markdown: `[![${alt}](${imageUrl})](${editUrl})`,
    HTML: `<a href="${editUrl}"><img src="${imageUrl}" alt="${alt}" width="100%" /></a>`,
    URL: imageUrl,
  };
  type Format = keyof typeof formats;
  const [tab, setTab] = useState<Format>("Markdown");
  const [copied, setCopied] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importError, setImportError] = useState<string | null>(null);

  const copy = async () => {
    await navigator.clipboard.writeText(formats[tab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

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
    <Panel
      title="Embed"
      action={
        <div className="w-56">
          <Segmented value={tab} onChange={setTab} options={(Object.keys(formats) as Format[]).map((f) => ({ value: f, label: f }))} />
        </div>
      }
    >
      <div className="relative -mx-1">
        <pre className="max-h-36 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-line bg-bg p-3 pr-20 font-mono text-[11px] leading-relaxed text-zinc-300">
          {encoded ? formats[tab] : "…"}
        </pre>
        <button
          type="button"
          onClick={copy}
          disabled={!encoded}
          className="absolute right-2 top-2 flex items-center gap-1.5 rounded-md border border-line bg-surface-2 px-2.5 py-1.5 text-xs font-medium transition hover:border-zinc-500"
        >
          {copied ? <FiCheck className="text-emerald-400" /> : <FiCopy />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="text-xs text-muted">
        Clicking the banner on GitHub opens it back in this editor.{" "}
        <a href={encoded ? `/api/banner?c=${encoded}` : undefined} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">
          Open rendered SVG <FiExternalLink />
        </a>
      </p>

      <div className="border-t border-line pt-3">
        <span className="mb-1.5 block text-xs font-medium text-muted">Edit an existing banner</span>
        <div className="flex gap-2">
          <input
            className={`${inputCls} py-1.5 text-xs`}
            placeholder="Paste a banner URL (old links work too)"
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
        {importError && <p className="mt-1.5 text-xs text-red-400">{importError}</p>}
      </div>
    </Panel>
  );
}
