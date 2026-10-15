import { useVideoConfig } from "remotion";

/**
 * Timings in the scenes are written in 30 fps "design frames". Multiply by K to get real frames,
 * so the video can render at any frame rate (60 fps by default) with the same pacing.
 */
export const useK = () => useVideoConfig().fps / 30;
