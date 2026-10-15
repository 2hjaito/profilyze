import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from "remotion";
import { Laptop } from "../components/Devices";
import { FOOTAGE, Footage } from "../components/Footage";
import { Disc, EASE_IN_OUT, EASE_OUT, MaskText } from "../components/Motion";
import { Pill, useExit } from "../components/Text";
import { COPY } from "../copy";
import { useK } from "../time";

const SEGMENTS = [0, 105, 210]; // caption changes, in design frames (matches the capture's 3.5 s / 7 s marks)

export const Editor = ({ duration }: { duration: number }) => {
  const k = useK();
  const frame = useCurrentFrame() / k;
  const exit = useExit(duration, 10);
  const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  // Open close on the banner canvas, pull back to reveal the laptop, push in again for templates.
  const scale = interpolate(frame, [0, 60, 205, 250], [2.2, 1, 1, 1.3], { ...clamp, easing: EASE_IN_OUT });
  const originY = interpolate(frame, [0, 60, 205, 250], [24, 30, 30, 26], { ...clamp, easing: EASE_IN_OUT });
  const tilt = interpolate(frame, [0, 60], [14, 0], { ...clamp, easing: EASE_OUT });
  const rise = interpolate(frame, [0, 60], [80, 0], { ...clamp, easing: EASE_OUT });

  return (
    <AbsoluteFill style={{ opacity: exit }}>
      <Disc size={1250} x={960} y={560} delay={20} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", perspective: 2400 }}>
        <div style={{ transform: `translateY(${rise}px) scale(${scale}) rotateX(${tilt}deg)`, transformOrigin: `50% ${originY}%`, marginTop: 30 }}>
          <Laptop width={1480}>
            <Footage name="editor" count={FOOTAGE.editor} />
          </Laptop>
        </div>
      </AbsoluteFill>
      {COPY.editor.map((text, i) => {
        const from = (SEGMENTS[i] + 8) * k;
        const to = SEGMENTS[i + 1] !== undefined ? SEGMENTS[i + 1] * k : duration;
        return (
          <Sequence key={text} from={from} durationInFrames={to - from} layout="none">
            <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 56 }}>
              <MaskText
                lines={[
                  <Pill key="p" style={{ fontSize: 40, padding: "16px 34px", background: "#0b1214ee", backdropFilter: "blur(8px)" }}>
                    <span style={{ opacity: 0.6 }}>{String(i + 1).padStart(2, "0")}</span> {text}
                  </Pill>,
                ]}
              />
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
