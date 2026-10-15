import type { CSSProperties, ReactNode } from "react";
import { C } from "../theme";

/** MacBook-style frame; children fill the 16:10 screen. */
export const Laptop = ({ width, children, style }: { width: number; children: ReactNode; style?: CSSProperties }) => {
  const bezel = width * 0.022;
  const screenW = width - bezel * 2;
  const screenH = screenW / 1.6;
  return (
    <div style={{ width, ...style }}>
      <div
        style={{
          background: "#0c0d10",
          borderRadius: width * 0.026,
          padding: bezel,
          paddingBottom: bezel * 1.4,
          border: "2px solid #2a2b31",
          boxShadow: "0 60px 120px -30px rgba(0,0,0,.85), 0 0 0 1px #000, inset 0 0 0 1px #1c1d22",
        }}
      >
        <div style={{ width: screenW, height: screenH, overflow: "hidden", borderRadius: 6, background: "#000", position: "relative" }}>
          {children}
        </div>
      </div>
      <div
        style={{
          height: width * 0.03,
          margin: "0 -6%",
          background: "linear-gradient(#3a3b42, #1b1c20)",
          borderRadius: `0 0 ${width * 0.04}px ${width * 0.04}px`,
          boxShadow: "0 30px 60px -10px rgba(0,0,0,.8)",
        }}
      >
        <div style={{ width: "16%", height: "40%", margin: "0 auto", background: "#16171b", borderRadius: "0 0 10px 10px" }} />
      </div>
    </div>
  );
};

/** Phone frame with a dynamic island; children fill the 390×844 screen. */
export const Phone = ({ height, children, style }: { height: number; children: ReactNode; style?: CSSProperties }) => {
  const bezel = height * 0.016;
  const screenH = height - bezel * 2;
  const screenW = screenH * (390 / 844);
  const radius = height * 0.07;
  return (
    <div
      style={{
        width: screenW + bezel * 2,
        height,
        padding: bezel,
        borderRadius: radius,
        background: "linear-gradient(145deg, #3b3d45, #121317 40%, #2a2c33)",
        boxShadow: "0 60px 120px -20px rgba(0,0,0,.9), inset 0 0 0 2px #4a4c55",
        position: "relative",
        ...style,
      }}
    >
      <div style={{ width: screenW, height: screenH, borderRadius: radius - bezel, overflow: "hidden", position: "relative", background: "#0d1117" }}>
        {children}
        <div
          style={{
            position: "absolute",
            top: screenH * 0.014,
            left: "50%",
            width: screenW * 0.3,
            height: screenH * 0.036,
            transform: "translateX(-50%)",
            background: "#000",
            borderRadius: 999,
          }}
        />
      </div>
    </div>
  );
};

/** A dark browser-window card with traffic lights. */
export const Browser = ({ width, children, style }: { width: number; children: ReactNode; style?: CSSProperties }) => (
  <div
    style={{
      width,
      borderRadius: 14,
      overflow: "hidden",
      border: `1px solid ${C.line}`,
      background: C.surface,
      boxShadow: "0 50px 100px -30px rgba(0,0,0,.85)",
      ...style,
    }}
  >
    <div style={{ height: 34, display: "flex", alignItems: "center", gap: 8, padding: "0 14px", borderBottom: `1px solid ${C.line}` }}>
      {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
        <div key={c} style={{ width: 11, height: 11, borderRadius: 99, background: c }} />
      ))}
    </div>
    {children}
  </div>
);
