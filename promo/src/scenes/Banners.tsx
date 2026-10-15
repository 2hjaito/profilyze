import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { EASE_OUT, MaskText, useProgress } from "../components/Motion";
import { Pill, useExit } from "../components/Text";
import { COPY } from "../copy";
import { C, inter } from "../theme";
import { useK } from "../time";

// Five cards, staggered. The two "featured" ones are real designs captured from the live site
// (`npm run capture`, step "banners"); heights follow each banner's aspect ratio (4:1 or 3:1).
const STACK: { name: string; ratio: number }[] = [
  { name: "banner-showcase", ratio: 4 },
  { name: "featured-1", ratio: 4 },
  { name: "banner-minimal", ratio: 4 },
  { name: "featured-2", ratio: 3 },
  { name: "banner-stats", ratio: 4 },
];
const CARD_W = 1000;
const OVERLAP = 25;
const CARDS = STACK.reduce<{ name: string; top: number; left: number }[]>((acc, c, i) => {
  const prev = acc[i - 1];
  const top = prev ? prev.top + CARD_W / STACK[i - 1].ratio - OVERLAP : 40;
  return [...acc, { name: c.name, top, left: (i % 2) * 90 }];
}, []);

const Card = ({ name, i, top, left }: { name: string; i: number; top: number; left: number }) => {
  const k = useK();
  const frame = useCurrentFrame();
  const p = interpolate(frame, [(4 + i * 5) * k, (34 + i * 5) * k], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });
  return (
    <Img
      src={staticFile(`capture/${name}.png`)}
      style={{
        position: "absolute",
        width: 1000,
        top,
        left,
        borderRadius: 18,
        boxShadow: "0 40px 80px -20px rgba(0,0,0,.9)",
        opacity: Math.min(1, p * 1.5),
        transform: `translateZ(${(1 - p) * -700 + i * 20}px) translateX(${(1 - p) * 700}px) rotateY(${(1 - p) * -30}deg)`,
      }}
    />
  );
};

export const Banners = ({ duration }: { duration: number }) => {
  const frame = useCurrentFrame();
  const exit = useExit(duration, 10);
  const drift = interpolate(frame, [0, duration], [60, -140]);
  const chip = useProgress(28, 24);
  return (
    <AbsoluteFill style={{ opacity: exit }}>
      <AbsoluteFill style={{ perspective: 1900 }}>
        <div
          style={{
            position: "absolute",
            left: 720,
            top: 0,
            transformStyle: "preserve-3d",
            transform: `rotateX(22deg) rotateY(-26deg) rotateZ(6deg) translateY(${drift}px)`,
          }}
        >
          {CARDS.map((c, i) => (
            <Card key={c.name} name={c.name} i={i} top={c.top} left={c.left} />
          ))}
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: `linear-gradient(90deg, ${C.bg} 26%, transparent 46%)` }} />
      <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 120 }}>
        <MaskText
          delay={6}
          lines={[COPY.bannersTitle]}
          lineStyle={() => ({ fontFamily: inter, fontWeight: 800, fontSize: 84, letterSpacing: -2, color: C.fg, whiteSpace: "nowrap" })}
        />
        <MaskText
          delay={14}
          lines={[COPY.bannersSub]}
          lineStyle={() => ({ fontFamily: inter, fontSize: 34, color: C.muted, marginTop: 24, maxWidth: 640, lineHeight: 1.4 })}
        />
        <div style={{ marginTop: 40, opacity: chip, transform: `translateY(${(1 - chip) * 30}px)` }}>
          <Pill>{COPY.bannersChip}</Pill>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
