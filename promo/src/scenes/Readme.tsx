import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Browser, Phone } from "../components/Devices";
import { FOOTAGE, Footage } from "../components/Footage";
import { Disc, EASE_OUT, MaskText } from "../components/Motion";
import { useExit } from "../components/Text";
import { COPY } from "../copy";
import { C, inter } from "../theme";
import { useK } from "../time";

const PHONE_H = 900;
const MOBILE_IMG = { w: 1170, h: 3552 };

export const Readme = ({ duration }: { duration: number }) => {
  const frame = useCurrentFrame();
  const k = useK();
  const exit = useExit(duration, 10);
  const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

  // The phone flips in from edge-on, like the reference's 3D device reveal.
  const flip = interpolate(frame, [4 * k, 44 * k], [0, 1], { ...clamp, easing: EASE_OUT });
  const browserIn = interpolate(frame, [0, 40 * k], [0, 1], { ...clamp, easing: EASE_OUT });
  const parallax = interpolate(frame, [0, duration], [0, -40]);

  const screenH = PHONE_H - PHONE_H * 0.016 * 2;
  const screenW = screenH * (390 / 844);
  const imgH = (screenW / MOBILE_IMG.w) * MOBILE_IMG.h;
  const scroll = interpolate(frame, [40 * k, duration - 20 * k], [0, imgH - screenH], { ...clamp, easing: Easing.inOut(Easing.quad) });

  return (
    <AbsoluteFill style={{ opacity: exit }}>
      <Disc size={980} x={1480} y={540} delay={8} />
      <AbsoluteFill style={{ perspective: 2200 }}>
        <div
          style={{
            position: "absolute",
            left: 700,
            top: 160,
            opacity: browserIn * 0.85,
            transform: `rotateY(-20deg) translateX(${(1 - browserIn) * 420 + parallax}px) scale(0.9)`,
          }}
        >
          <Browser width={1040}>
            <div style={{ height: 650, overflow: "hidden" }}>
              <Footage name="readme" count={FOOTAGE.readme} style={{ height: "auto" }} />
            </div>
          </Browser>
        </div>
        <div
          style={{
            position: "absolute",
            right: 170,
            top: 90,
            transform: `translateX(${(1 - flip) * 260}px) rotateY(${-12 + (1 - flip) * 86}deg) rotateZ(${(1 - flip) * -6}deg)`,
          }}
        >
          <Phone height={PHONE_H}>
            <Img src={staticFile("capture/readme-mobile.png")} style={{ width: "100%", transform: `translateY(${-scroll}px)` }} />
          </Phone>
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: `linear-gradient(90deg, ${C.bg} 28%, transparent 55%)` }} />
      <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 120 }}>
        <MaskText
          delay={6}
          lines={COPY.readmeTitle}
          lineStyle={() => ({ fontFamily: inter, fontWeight: 800, fontSize: 84, letterSpacing: -2, color: C.fg, lineHeight: 1.05 })}
        />
        <MaskText
          delay={20}
          stagger={7}
          style={{ marginTop: 36 }}
          lines={COPY.readmeBullets.map((b) => (
            <div key={b} style={{ display: "flex", alignItems: "center", gap: 18, fontFamily: inter, fontSize: 36, color: C.fg, margin: "10px 0" }}>
              <span
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: `${C.accent}22`,
                  color: C.accent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                  fontWeight: 800,
                }}
              >
                ✓
              </span>
              {b}
            </div>
          ))}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
