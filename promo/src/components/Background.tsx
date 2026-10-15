import { AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import { C } from "../theme";
import { useK } from "../time";

const CELL = 22;
const GAP = 8;
const STEP = CELL + GAP;

/** A drifting contribution-graph grid with a soft glow, behind every scene. */
export const Background = ({ glow = C.accent, intensity = 1 }: { glow?: string; intensity?: number }) => {
  const frame = useCurrentFrame() / useK();
  const { width, height } = useVideoConfig();
  const cols = Math.ceil(width / STEP) + 2;
  const rows = Math.ceil(height / STEP) + 2;
  const drift = (frame * 0.35) % STEP;

  const cells = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const seed = x * 131 + y * 17;
      const base = random(seed);
      // Each cell slowly pulses; a few light up like busy days.
      const wave = Math.sin(frame / 18 + base * 12) * 0.5 + 0.5;
      const lit = base > 0.86 ? wave : base > 0.7 ? wave * 0.45 : 0.08;
      cells.push(
        <rect key={seed} x={x * STEP - drift} y={y * STEP - drift} width={CELL} height={CELL} rx={5} fill={C.green} fillOpacity={lit * 0.16 * intensity} />,
      );
    }
  }

  const glowShift = interpolate(Math.sin(frame / 60), [-1, 1], [-80, 80]);
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        {cells}
      </svg>
      <AbsoluteFill
        style={{
          background: `radial-gradient(900px 520px at ${50 + glowShift / 40}% 42%, ${glow}26, transparent 70%)`,
        }}
      />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 45%, #000000cc 100%)" }} />
    </AbsoluteFill>
  );
};
