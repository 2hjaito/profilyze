import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { LogoMark } from "../components/LogoMark";
import { EASE_OUT, MaskText } from "../components/Motion";
import { COPY } from "../copy";
import { C, grotesk, inter } from "../theme";
import { useK } from "../time";

export const Logo = ({ duration }: { duration: number }) => {
  const frame = useCurrentFrame();
  const k = useK();
  const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  // The wordmark types itself out from behind the mark, then everything punches into the next scene.
  const reveal = interpolate(frame, [14 * k, 40 * k], [0, 100], { ...clamp, easing: EASE_OUT });
  const slide = interpolate(frame, [0, 40 * k], [210, 0], { ...clamp, easing: EASE_OUT });
  const punch = interpolate(frame, [duration - 14 * k, duration], [1, 3.2], { ...clamp, easing: Easing.in(Easing.cubic) });
  const fade = interpolate(frame, [duration - 8 * k, duration], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", transform: `scale(${punch})`, opacity: fade }}>
      <div style={{ display: "flex", alignItems: "center", gap: 44, transform: `translateX(${slide}px)` }}>
        <LogoMark size={210} />
        <div>
          <div
            style={{
              fontFamily: grotesk,
              fontWeight: 700,
              fontSize: 150,
              color: C.fg,
              letterSpacing: -4,
              lineHeight: 1,
              clipPath: `inset(-10% ${100 - reveal}% -20% 0)`,
            }}
          >
            Profilyze
          </div>
          <MaskText
            delay={30}
            lines={[COPY.tagline]}
            lineStyle={() => ({ fontFamily: inter, fontSize: 38, color: C.accent, marginTop: 14, fontWeight: 500 })}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
