"use client";

import { useState } from "react";
import { FiCheck, FiCopy, FiDownload } from "react-icons/fi";
import { SITE_URL } from "@/lib/site";

const btn =
  "flex shrink-0 items-center gap-1.5 rounded-md border border-line bg-surface-2 px-2.5 py-1.5 text-xs font-medium transition hover:border-zinc-500 disabled:opacity-60";

/**
 * One badge preview with Copy Markdown and Download SVG. The download asks for `outline=1`, so the
 * file has its text as paths and needs no fonts (icon libraries like davi-icons strip <style>).
 */
export default function BadgePreviewCard({
  title,
  desc,
  path,
  alt,
  link,
  file,
  light = false,
}: {
  title: string;
  desc: string;
  path: string;
  alt: string;
  link: string;
  file: string;
  light?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const img = `![${alt.replace(/[[\]]/g, "")}](${SITE_URL}${path})`;
  const markdown = /^(https?:|mailto:)/.test(link.trim()) ? `[${img}](${link.trim()})` : img;

  const copy = async () => {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const download = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${path}&outline=1`);
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `${file}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="flex flex-col overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="truncate text-xs text-muted">{desc}</p>
        </div>
        <div className="flex gap-1.5">
          <button type="button" onClick={download} disabled={saving} className={btn} title="Download SVG (text as paths, no fonts)">
            <FiDownload />
            SVG
          </button>
          <button type="button" onClick={copy} className={btn}>
            {copied ? <FiCheck className="text-emerald-400" /> : <FiCopy />}
            {copied ? "Copied" : "Copy Markdown"}
          </button>
        </div>
      </div>
      <div
        className={`flex min-h-24 flex-1 items-center justify-center overflow-x-auto p-4 ${
          light ? "bg-white" : "bg-[conic-gradient(#1a1a1f_25%,#141418_0_50%,#1a1a1f_0_75%,#141418_0)] [background-size:16px_16px]"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={path} src={path} alt={alt} className="max-w-full" />
      </div>
    </section>
  );
}

/** "Join The Code Well" -> "join-the-code-well", for download file names. */
export const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
