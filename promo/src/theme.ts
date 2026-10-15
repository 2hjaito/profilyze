import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadGrotesk } from "@remotion/google-fonts/SpaceGrotesk";

export const inter = loadInter("normal", { weights: ["400", "600", "700", "800"], subsets: ["latin", "latin-ext", "vietnamese"] }).fontFamily;
export const grotesk = loadGrotesk("normal", { weights: ["500", "700"], subsets: ["latin", "latin-ext", "vietnamese"] }).fontFamily;

export const C = {
  bg: "#07080b",
  surface: "#111114",
  line: "#26262b",
  fg: "#ededef",
  muted: "#9b9ba4",
  accent: "#83ebf1",
  green: "#39d353",
};
