"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { backgroundRect, renderBanner } from "@/lib/banner/render";
import { W, type BannerConfig, type BannerElement } from "@/lib/banner/schema";
import type { GithubData } from "@/lib/github/types";

type Box = { x: number; y: number; w: number; h: number };
type Guide = { axis: "x" | "y"; at: number };

type Props = {
  config: BannerConfig;
  github: GithubData | null;
  views?: number;
  selected: string | null;
  onSelect: (id: string | null) => void;
  onChange: (id: string, patch: Partial<BannerElement>) => void;
  /** Background image moves (focus point in %) and zoom, from dragging it or its corners. */
  onBackground: (patch: { fx?: number; fy?: number; zoom?: number }) => void;
  onCommit: () => void;
};

const SNAP = 6; // canvas units

export const BG_ID = "__background";

export default function Canvas({ config, github, views, selected, onSelect, onChange, onBackground, onCommit }: Props) {
  const H = config.h;
  const wrapRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<SVGSVGElement>(null);
  const [boxes, setBoxes] = useState<Record<string, Box>>({});
  const [scale, setScale] = useState(1);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [fontsTick, setFontsTick] = useState(0);
  const [hover, setHover] = useState<string | null>(null);

  const svg = useMemo(
    () =>
      renderBanner(config, {
        asset: (f) => `/${f}`,
        bgHref: config.bg.kind === "url" ? config.bg.url : null,
        avatarHref: github?.avatarUrl ?? null,
        github,
        views,
        editor: true,
      }),
    [config, github, views],
  );

  // Re-measure when fonts finish loading, since text boxes change size.
  useEffect(() => {
    const fonts = document.fonts;
    const bump = () => setFontsTick((t) => t + 1);
    fonts.addEventListener("loadingdone", bump);
    fonts.ready.then(bump);
    return () => fonts.removeEventListener("loadingdone", bump);
  }, []);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const next: Record<string, Box> = {};
    for (const g of wrap.querySelectorAll<SVGGElement>("[data-id]")) {
      const id = g.dataset.id!;
      const el = config.els.find((e) => e.id === id);
      if (!el) continue;
      const b = g.getBBox();
      next[id] = { x: el.x + b.x, y: el.y + b.y, w: b.width, h: b.height };
    }
    setBoxes(next);
  }, [svg, fontsTick, config.els]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(() => setScale(wrap.clientWidth / W));
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  const toCanvas = useCallback((e: { clientX: number; clientY: number }) => {
    const rect = overlayRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * W, y: ((e.clientY - rect.top) / rect.height) * H };
  }, [H]);

  /** Snaps a moving box to the canvas and other elements; returns the offset to apply and guides to draw. */
  const snap = useCallback(
    (id: string, box: Box, disabled: boolean) => {
      if (disabled) return { dx: 0, dy: 0, guides: [] as Guide[] };
      const xs = [0, W / 2, W];
      const ys = [0, H / 2, H];
      for (const [other, b] of Object.entries(boxes)) {
        if (other === id) continue;
        xs.push(b.x, b.x + b.w / 2, b.x + b.w);
        ys.push(b.y, b.y + b.h / 2, b.y + b.h);
      }
      const best = (edges: number[], targets: number[]) => {
        let found: { d: number; at: number } | null = null;
        for (const e of edges)
          for (const t of targets) {
            const d = t - e;
            if (Math.abs(d) <= SNAP && (!found || Math.abs(d) < Math.abs(found.d))) found = { d, at: t };
          }
        return found;
      };
      const sx = best([box.x, box.x + box.w / 2, box.x + box.w], xs);
      const sy = best([box.y, box.y + box.h / 2, box.y + box.h], ys);
      const g: Guide[] = [];
      if (sx) g.push({ axis: "x", at: sx.at });
      if (sy) g.push({ axis: "y", at: sy.at });
      return { dx: sx?.d ?? 0, dy: sy?.d ?? 0, guides: g };
    },
    [boxes, H],
  );

  const placed = backgroundRect(config);
  const pannable = !!placed?.rect && (placed.rect.w > W + 0.5 || placed.rect.h > H + 0.5);

  const clampPct = (n: number) => Math.round(Math.min(100, Math.max(0, n)) * 10) / 10;

  /** Click empty canvas to select the background; drag to move the image (its focus point follows). */
  const startPan = (e: React.PointerEvent) => {
    onSelect(placed?.rect ? BG_ID : null);
    if (!pannable || !placed?.rect || config.bg.kind !== "preset") return;
    e.preventDefault();
    const start = toCanvas(e);
    const { w, h } = placed.rect;
    const fx0 = config.bg.fx ?? 50;
    const fy0 = config.bg.fy ?? 50;
    const target = e.currentTarget as Element;
    target.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      const p = toCanvas(ev);
      onBackground({
        fx: w > W ? clampPct(fx0 + ((p.x - start.x) / (W - w)) * 100) : fx0,
        fy: h > H ? clampPct(fy0 + ((p.y - start.y) / (H - h)) * 100) : fy0,
      });
    };
    const up = () => {
      target.removeEventListener("pointermove", move as EventListener);
      target.removeEventListener("pointerup", up);
      onCommit();
    };
    target.addEventListener("pointermove", move as EventListener);
    target.addEventListener("pointerup", up);
  };

  const startDrag = (e: React.PointerEvent, el: BannerElement) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(el.id);
    const box = boxes[el.id];
    if (!box) return;
    const start = toCanvas(e);
    const target = e.currentTarget as Element;
    target.setPointerCapture(e.pointerId);

    const move = (ev: PointerEvent) => {
      const p = toCanvas(ev);
      let dx = p.x - start.x;
      let dy = p.y - start.y;
      const s = snap(el.id, { ...box, x: box.x + dx, y: box.y + dy }, ev.altKey);
      dx += s.dx;
      dy += s.dy;
      setGuides(s.guides);
      onChange(el.id, { x: round(el.x + dx), y: round(el.y + dy) });
    };
    const up = () => {
      target.removeEventListener("pointermove", move as EventListener);
      target.removeEventListener("pointerup", up);
      setGuides([]);
      onCommit();
    };
    target.addEventListener("pointermove", move as EventListener);
    target.addEventListener("pointerup", up);
  };

  const startResize = (e: React.PointerEvent, el: BannerElement, corner: [number, number]) => {
    e.preventDefault();
    e.stopPropagation();
    const box = boxes[el.id];
    if (!box) return;
    const target = e.currentTarget as Element;
    target.setPointerCapture(e.pointerId);
    // Scale around the opposite corner, which stays fixed.
    const ax = box.x + (corner[0] < 0 ? box.w : 0);
    const ay = box.y + (corner[1] < 0 ? box.h : 0);
    const diag = box.w * box.w + box.h * box.h;

    const move = (ev: PointerEvent) => {
      const p = toCanvas(ev);
      const r = Math.max(0.1, ((p.x - ax) * corner[0] * box.w + (p.y - ay) * corner[1] * box.h) / diag);
      const patch: Partial<BannerElement> & { gap?: number } = {
        s: round(el.s * r),
        x: round(ax - (ax - el.x) * r),
        y: round(ay - (ay - el.y) * r),
      };
      if (el.type === "icons") patch.gap = round(el.gap * r);
      onChange(el.id, patch);
    };
    const up = () => {
      target.removeEventListener("pointermove", move as EventListener);
      target.removeEventListener("pointerup", up);
      onCommit();
    };
    target.addEventListener("pointermove", move as EventListener);
    target.addEventListener("pointerup", up);
  };

  /** Drag a corner of the background image: zoom around the opposite corner, keeping its aspect ratio. */
  const startBgResize = (e: React.PointerEvent, corner: [number, number]) => {
    e.preventDefault();
    e.stopPropagation();
    if (!placed?.rect || config.bg.kind !== "preset") return;
    const r0 = placed.rect;
    const z0 = config.bg.zoom ?? 1;
    const target = e.currentTarget as Element;
    target.setPointerCapture(e.pointerId);
    const ax = r0.x + (corner[0] < 0 ? r0.w : 0);
    const ay = r0.y + (corner[1] < 0 ? r0.h : 0);
    const diag = r0.w * r0.w + r0.h * r0.h;
    const move = (ev: PointerEvent) => {
      const p = toCanvas(ev);
      const ratio = ((p.x - ax) * corner[0] * r0.w + (p.y - ay) * corner[1] * r0.h) / diag;
      const zoom = Math.min(4, Math.max(1, z0 * ratio));
      const r = zoom / z0;
      const w = r0.w * r;
      const h = r0.h * r;
      const x = ax - (ax - r0.x) * r;
      const y = ay - (ay - r0.y) * r;
      onBackground({
        zoom: Math.round(zoom * 100) / 100,
        fx: w > W + 0.5 ? clampPct((x / (W - w)) * 100) : 50,
        fy: h > H + 0.5 ? clampPct((y / (H - h)) * 100) : 50,
      });
    };
    const up = () => {
      target.removeEventListener("pointermove", move as EventListener);
      target.removeEventListener("pointerup", up);
      onCommit();
    };
    target.addEventListener("pointermove", move as EventListener);
    target.addEventListener("pointerup", up);
  };

  const k = 1 / scale; // one screen pixel in canvas units
  const sel = selected ? config.els.find((e) => e.id === selected) : undefined;
  const selBox = selected ? boxes[selected] : undefined;

  return (
    <div ref={wrapRef} className="relative select-none" style={{ aspectRatio: `${W} / ${H}` }}>
      <div className="absolute inset-0 [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
      <svg
        ref={overlayRef}
        viewBox={`0 0 ${W} ${H}`}
        className={`absolute inset-0 h-full w-full touch-none overflow-visible ${pannable ? "cursor-grab active:cursor-grabbing" : ""}`}
        onPointerDown={startPan}
      >
        {config.els.map((el) => {
          const b = boxes[el.id];
          if (!b || el.hidden) return null;
          return (
            <rect
              key={el.id}
              x={b.x}
              y={b.y}
              width={Math.max(b.w, 4 * k)}
              height={Math.max(b.h, 4 * k)}
              fill="transparent"
              stroke={hover === el.id && selected !== el.id ? "#83ebf1" : "none"}
              strokeOpacity={0.6}
              strokeWidth={k}
              className="cursor-move"
              onPointerEnter={() => setHover(el.id)}
              onPointerLeave={() => setHover(null)}
              onPointerDown={(e) => startDrag(e, el)}
            />
          );
        })}

        {selected === BG_ID && placed?.rect && (
          <g>
            <rect
              x={placed.rect.x}
              y={placed.rect.y}
              width={placed.rect.w}
              height={placed.rect.h}
              fill="none"
              stroke="#facc15"
              strokeWidth={1.5 * k}
              strokeDasharray={`${6 * k} ${4 * k}`}
              pointerEvents="none"
            />
            {(
              [
                [-1, -1],
                [1, -1],
                [-1, 1],
                [1, 1],
              ] as [number, number][]
            ).map(([cx, cy]) => (
              <rect
                key={`bg${cx}${cy}`}
                x={placed.rect!.x + (cx > 0 ? placed.rect!.w : 0) - 6 * k}
                y={placed.rect!.y + (cy > 0 ? placed.rect!.h : 0) - 6 * k}
                width={12 * k}
                height={12 * k}
                rx={2 * k}
                fill="#facc15"
                stroke="#713f12"
                strokeWidth={1.5 * k}
                className={cx === cy ? "cursor-nwse-resize" : "cursor-nesw-resize"}
                onPointerDown={(e) => startBgResize(e, [cx, cy])}
              />
            ))}
          </g>
        )}

        {guides.map((g, i) =>
          g.axis === "x" ? (
            <line key={i} x1={g.at} x2={g.at} y1={0} y2={H} stroke="#f472b6" strokeWidth={k} strokeDasharray={`${4 * k} ${3 * k}`} />
          ) : (
            <line key={i} y1={g.at} y2={g.at} x1={0} x2={W} stroke="#f472b6" strokeWidth={k} strokeDasharray={`${4 * k} ${3 * k}`} />
          ),
        )}

        {sel && selBox && !sel.hidden && (
          <g>
            <rect
              x={selBox.x}
              y={selBox.y}
              width={selBox.w}
              height={selBox.h}
              fill="none"
              stroke="#83ebf1"
              strokeWidth={1.5 * k}
              pointerEvents="none"
            />
            {(
              [
                [-1, -1],
                [1, -1],
                [-1, 1],
                [1, 1],
              ] as [number, number][]
            ).map(([cx, cy]) => (
              <rect
                key={`${cx}${cy}`}
                x={selBox.x + (cx > 0 ? selBox.w : 0) - 5 * k}
                y={selBox.y + (cy > 0 ? selBox.h : 0) - 5 * k}
                width={10 * k}
                height={10 * k}
                rx={2 * k}
                fill="#fff"
                stroke="#0ea5b7"
                strokeWidth={1.5 * k}
                className={cx === cy ? "cursor-nwse-resize" : "cursor-nesw-resize"}
                onPointerDown={(e) => startResize(e, sel, [cx, cy])}
              />
            ))}
          </g>
        )}
      </svg>
    </div>
  );
}

const round = (n: number) => Math.round(n * 10) / 10;
