import { DEFAULT_CONFIG, type BannerConfig } from "./schema";

export const templates: { id: string; label: string; config: BannerConfig }[] = [
  { id: "classic", label: "Classic", config: DEFAULT_CONFIG },
  {
    id: "minimal",
    label: "Minimal",
    config: {
      v: 1,
      bg: { kind: "gradient", from: "#0b1020", to: "#24306b", angle: 120 },
      h: 250,
      dim: 0,
      r: 16,
      els: [
        { id: "avatar", type: "avatar", x: 48, y: 45, s: 160, ring: "#8ea2ff" },
        { id: "name", type: "text", text: "Your Name", x: 244, y: 62, s: 56, font: "inter", w: 800, color: "#ffffff" },
        { id: "role", type: "text", text: "SOFTWARE ENGINEER", x: 247, y: 136, s: 20, font: "space-grotesk", w: 500, color: "#a5b4fc", ls: 0.14 },
        { id: "skills", type: "icons", icons: ["typescript", "react", "nodejs", "docker", "postgresql"], x: 247, y: 176, s: 30, gap: 12 },
      ],
    },
  },
  {
    id: "stats",
    label: "Stats",
    config: {
      v: 1,
      bg: { kind: "gradient", from: "#0d1117", to: "#10251a", angle: 160 },
      h: 250,
      dim: 0,
      r: 16,
      els: [
        { id: "name", type: "text", text: "Your Name", x: 44, y: 44, s: 46, font: "space-grotesk", w: 700, color: "#ffffff" },
        { id: "role", type: "text", text: "Building things for the web", x: 46, y: 104, s: 20, font: "inter", w: 400, color: "#9fb0a6" },
        { id: "streak", type: "stat", stat: "streak", icon: "flame", label: "-day streak", x: 46, y: 168, s: 20, font: "inter", w: 700, color: "#ffffff", accent: "#ff9640" },
        { id: "total", type: "stat", stat: "contribs", icon: "activity", label: "this year", x: 46, y: 202, s: 20, font: "inter", w: 700, color: "#ffffff", accent: "#39d353" },
        { id: "graph", type: "graph", x: 560, y: 52, s: 14, weeks: 23, color: "#39d353" },
      ],
    },
  },
];
