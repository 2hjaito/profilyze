import { AbsoluteFill, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { LogoMark } from "../components/LogoMark";
import { Disc, MaskText } from "../components/Motion";
import { Rise } from "../components/Text";
import { COPY } from "../copy";
import { C, grotesk, inter } from "../theme";
import { useK } from "../time";

const GithubIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
  </svg>
);

export const Outro = ({ duration }: { duration: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const k = useK();
  const fadeOut = interpolate(frame, [duration - 14 * k, duration], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const pill = spring({ frame: frame - 34 * k, fps, config: { damping: 13, stiffness: 140 } });

  // Little stars bursting from the GitHub pill.
  const stars = Array.from({ length: 14 }, (_, i) => {
    const t = frame / k - 40 - random(i) * 20;
    if (t < 0) return null;
    const ang = random(i + 50) * Math.PI * 2;
    const dist = 140 + random(i + 90) * 260;
    const p = Math.min(1, t / 26);
    return (
      <div
        key={i}
        style={{
          position: "absolute",
          left: "50%",
          top: 790,
          fontSize: 26 + random(i + 7) * 22,
          opacity: 1 - p,
          transform: `translate(${Math.cos(ang) * dist * p}px, ${Math.sin(ang) * dist * 0.6 * p}px) scale(${0.6 + p})`,
        }}
      >
        ⭐
      </div>
    );
  });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: fadeOut }}>
      <Disc size={1150} x={960} y={540} />
      <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
        <LogoMark size={110} />
        <Rise delay={8} distance={20}>
          <div style={{ fontFamily: grotesk, fontWeight: 700, fontSize: 88, color: C.fg, letterSpacing: -2 }}>Profilyze</div>
        </Rise>
      </div>
      <Rise delay={14}>
        <div style={{ fontFamily: inter, fontSize: 34, color: C.muted, marginTop: 40, textAlign: "center" }}>{COPY.outroCta}</div>
      </Rise>
      <MaskText
        delay={18}
        lines={[COPY.url]}
        lineStyle={() => ({
          fontFamily: inter,
          fontWeight: 800,
          fontSize: 104,
          letterSpacing: -3,
          background: `linear-gradient(90deg, ${C.accent}, ${C.green})`,
          WebkitBackgroundClip: "text",
          color: "transparent",
          marginTop: 6,
        })}
      />
      {stars}
      <div
        style={{
          marginTop: 56,
          display: "flex",
          alignItems: "center",
          gap: 22,
          padding: "22px 40px",
          borderRadius: 999,
          background: "#ffffff",
          color: "#0d1117",
          fontFamily: inter,
          transform: `scale(${pill})`,
          boxShadow: `0 0 0 8px ${C.accent}33, 0 30px 60px -10px rgba(0,0,0,.8)`,
        }}
      >
        <GithubIcon size={52} />
        <div>
          <div style={{ fontSize: 36, fontWeight: 800 }}>{COPY.star}</div>
          <div style={{ fontSize: 26, color: "#57606a", marginTop: 2 }}>{COPY.repo}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
