import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { EASE_OUT, MaskText } from "../components/Motion";
import { useExit } from "../components/Text";
import { COPY } from "../copy";
import { C, inter } from "../theme";
import { useK } from "../time";

type Card = { name: string; w: number; x: number; y: number; rot: number; delay: number; z: number };

const CARDS: Card[] = [
  { name: "card-streak-light", w: 430, x: 70, y: 610, rot: -9, delay: 14, z: 0 },
  { name: "card-streak-dracula", w: 430, x: 1420, y: 600, rot: 8, delay: 16, z: 0 },
  { name: "card-streak", w: 620, x: 330, y: 250, rot: -3, delay: 2, z: 1 },
  { name: "card-stats", w: 620, x: 970, y: 250, rot: 3, delay: 6, z: 1 },
  { name: "card-graph", w: 1000, x: 460, y: 560, rot: 0, delay: 10, z: 2 },
];

export const Widgets = ({ duration }: { duration: number }) => {
  const frame = useCurrentFrame();
  const k = useK();
  const exit = useExit(duration, 8);
  return (
    <AbsoluteFill style={{ opacity: exit, perspective: 2000 }}>
      {CARDS.map((c) => {
        // Cards fly up out of depth, tipping forward as they land.
        const p = interpolate(frame, [c.delay * k, (c.delay + 32) * k], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: EASE_OUT,
        });
        const float = Math.sin((frame / k + c.delay * 7) / 22) * 6;
        return (
          <Img
            key={c.name}
            src={staticFile(`capture/${c.name}.png`)}
            style={{
              position: "absolute",
              width: c.w,
              left: c.x,
              top: c.y + float,
              zIndex: c.z,
              opacity: Math.min(1, p * 1.6) * (c.z === 0 ? 0.75 : 1),
              transform: `translateZ(${(1 - p) * -900}px) translateY(${(1 - p) * 260}px) rotateX(${(1 - p) * 45}deg) rotate(${c.rot}deg)`,
              filter: "drop-shadow(0 30px 50px rgba(0,0,0,.7))",
            }}
          />
        );
      })}
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 80, zIndex: 3 }}>
        <MaskText
          lines={[COPY.widgetsTitle]}
          lineStyle={() => ({ fontFamily: inter, fontWeight: 800, fontSize: 80, letterSpacing: -2, color: C.fg, textAlign: "center" })}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
