import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C } from "../theme";
import { useK } from "../time";

const CELLS: [number, number, number][] = [
  [0, 0, 1], [1, 0, 0.85], [0, 1, 0.95], [2, 1, 0.7], [0, 2, 0.85], [1, 2, 0.65], [0, 3, 0.6],
];

/** The Profilyze "P" whose cells pop in one by one, like contributions filling a graph. */
export const LogoMark = ({ size, delay = 0, stagger = 3 }: { size: number; delay?: number; stagger?: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const k = useK();
  const box = spring({ frame: frame - delay * k, fps, config: { damping: 14 } });
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={{ overflow: "visible", transform: `scale(${0.6 + 0.4 * box})`, opacity: box }}>
      <rect width="32" height="32" rx="8" fill="#0e1a1c" />
      <rect x=".5" y=".5" width="31" height="31" rx="7.5" fill="none" stroke={C.accent} strokeOpacity={0.4} />
      {CELLS.map(([c, r, o], i) => {
        const p = spring({ frame: frame - (delay + 6 + i * stagger) * k, fps, config: { damping: 11, stiffness: 180 } });
        const x = 7 + c * 6.5;
        const y = 4 + r * 6.5;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width="5.5"
            height="5.5"
            rx="1.4"
            fill={C.accent}
            fillOpacity={o * Math.min(1, p)}
            style={{ transformOrigin: `${x + 2.75}px ${y + 2.75}px`, transform: `scale(${p})` }}
          />
        );
      })}
    </svg>
  );
};
