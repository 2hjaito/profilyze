import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { MaskText } from "../components/Motion";
import { useExit } from "../components/Text";
import { COPY } from "../copy";
import { C, inter } from "../theme";

export const Hook = ({ duration }: { duration: number }) => {
  const frame = useCurrentFrame();
  const exit = useExit(duration, 10);
  const zoom = interpolate(frame, [0, duration], [1, 1.06]);
  const [a, b, c] = COPY.hook;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: exit, transform: `scale(${zoom})` }}>
      <MaskText
        delay={2}
        stagger={9}
        style={{ textAlign: "center", fontFamily: inter, color: C.fg }}
        lineStyle={(i) =>
          i < 2
            ? { fontSize: 84, fontWeight: 700, letterSpacing: -2, color: i === 1 ? C.muted : C.fg }
            : {
                fontSize: 176,
                fontWeight: 800,
                letterSpacing: -6,
                lineHeight: 1.12,
                background: `linear-gradient(90deg, ${C.accent}, ${C.green})`,
                WebkitBackgroundClip: "text",
                color: "transparent",
              }
        }
        lines={[a, b, c]}
      />
    </AbsoluteFill>
  );
};
