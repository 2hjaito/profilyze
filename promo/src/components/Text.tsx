import type { CSSProperties, ReactNode } from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, inter } from "../theme";
import { useK } from "../time";

/** Slides up and fades in after `delay` frames. */
export const Rise = ({ delay = 0, children, style, distance = 40 }: { delay?: number; children: ReactNode; style?: CSSProperties; distance?: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay * useK(), fps, config: { damping: 200, stiffness: 120 } });
  return (
    <div style={{ opacity: p, transform: `translateY(${(1 - p) * distance}px)`, filter: `blur(${(1 - p) * 8}px)`, ...style }}>
      {children}
    </div>
  );
};

/** Fades everything out over the last `frames` frames of a scene of length `duration`. */
export const useExit = (duration: number, designFrames = 8) => {
  const frame = useCurrentFrame();
  const frames = designFrames * useK();
  return interpolate(frame, [duration - frames, duration], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
};

export const Pill = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 12,
      padding: "12px 24px",
      borderRadius: 999,
      background: "#83ebf11a",
      border: `1px solid ${C.accent}55`,
      color: C.accent,
      fontFamily: inter,
      fontSize: 28,
      fontWeight: 600,
      ...style,
    }}
  >
    {children}
  </div>
);

export const Title = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => (
  <div style={{ fontFamily: inter, fontWeight: 800, fontSize: 76, letterSpacing: -2, color: C.fg, lineHeight: 1.05, ...style }}>{children}</div>
);
