import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { C, inter } from "../theme";
import { useK } from "../time";

/** After Effects-style curves: fast out, long soft settle; and a symmetric in-out for camera moves. */
export const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
export const EASE_IN_OUT = Easing.bezier(0.65, 0, 0.35, 1);

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** 0→1 over `dur` design frames after `delay`, eased. */
export const useProgress = (delay: number, dur: number, easing = EASE_OUT) => {
  const k = useK();
  const frame = useCurrentFrame();
  return interpolate(frame, [delay * k, (delay + dur) * k], [0, 1], { ...clamp, easing });
};

/** Lines slide up from behind an invisible slot, one after another. */
export const MaskText = ({
  lines,
  delay = 0,
  stagger = 6,
  dur = 22,
  style,
  lineStyle,
}: {
  lines: ReactNode[];
  delay?: number;
  stagger?: number;
  dur?: number;
  style?: CSSProperties;
  lineStyle?: (i: number) => CSSProperties;
}) => {
  const k = useK();
  const frame = useCurrentFrame();
  return (
    <div style={style}>
      {lines.map((line, i) => {
        const p = interpolate(frame, [(delay + i * stagger) * k, (delay + i * stagger + dur) * k], [0, 1], { ...clamp, easing: EASE_OUT });
        return (
          // Padding gives descenders and diacritics room inside the mask.
          <div key={i} style={{ overflow: "hidden", padding: "0.08em 0.02em", margin: "-0.08em -0.02em" }}>
            <div style={{ transform: `translateY(${(1 - p) * 115}%) rotate(${(1 - p) * 4}deg)`, transformOrigin: "0 100%", ...lineStyle?.(i) }}>{line}</div>
          </div>
        );
      })}
    </div>
  );
};

/** Soft disc behind a device, as a focal point. */
export const Disc = ({ size, x, y, delay = 0, color = C.accent }: { size: number; x: number; y: number; delay?: number; color?: string }) => {
  const p = useProgress(delay, 30);
  return (
    <div
      style={{
        position: "absolute",
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: "50%",
        background: `radial-gradient(circle at 35% 30%, ${color}30, ${color}0d 55%, transparent 72%)`,
        border: `1px solid ${color}22`,
        transform: `scale(${0.6 + 0.4 * p})`,
        opacity: p,
      }}
    />
  );
};

/**
 * Full-screen slanted panel that sweeps across a cut, carrying a big caps label.
 * Mount it centered on the cut: it covers the screen at the midpoint.
 */
export const Wipe = ({ duration, label, color = C.accent }: { duration: number; label?: string; color?: string }) => {
  const frame = useCurrentFrame();
  const x = interpolate(frame, [0, duration], [120, -120], { ...clamp, easing: EASE_IN_OUT });
  const textX = interpolate(frame, [0, duration], [40, -40], clamp);
  return (
    <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: "-20% -40%",
          transform: `translateX(${x}%) skewX(-14deg)`,
          background: `linear-gradient(90deg, ${color}, #5fd3db 45%, ${C.green})`,
          boxShadow: "0 0 120px rgba(0,0,0,.6)",
        }}
      />
      {label && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", transform: `translateX(${x + textX}%)` }}>
          <div style={{ fontFamily: inter, fontWeight: 800, fontSize: 120, letterSpacing: 6, color: "#05201f", whiteSpace: "nowrap" }}>{label}</div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
