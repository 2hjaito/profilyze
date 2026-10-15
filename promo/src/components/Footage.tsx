import { Img, staticFile, useCurrentFrame } from "remotion";

/**
 * Plays a frame-stepped capture (public/capture/<name>/0000.jpg …) one image per video frame,
 * so screen recordings stay as sharp as screenshots. Holds the last frame when it runs out.
 */
export const Footage = ({ name, count, style }: { name: string; count: number; style?: React.CSSProperties }) => {
  // Motion blur renders at fractional frames; snap to the captured image.
  const frame = Math.min(count - 1, Math.max(0, Math.floor(useCurrentFrame())));
  return (
    <Img
      src={staticFile(`capture/${name}/${String(frame).padStart(4, "0")}.jpg`)}
      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", ...style }}
    />
  );
};

export const FOOTAGE = { editor: 660, readme: 360 };
