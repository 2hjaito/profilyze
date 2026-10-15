// Scene boundaries in frames. Cuts land on beats of the 120 BPM soundtrack
// (scripts/music.mjs): the drop at 6s, breakdown 22–28s, impact at 32s.
export const FPS = 60;
const s = (sec: number) => Math.round(sec * FPS);

export const SCENES = {
  hook: { from: 0, to: s(3) },
  logo: { from: s(3), to: s(6) },
  editor: { from: s(6), to: s(17) },
  banners: { from: s(17), to: s(22) },
  readme: { from: s(22), to: s(28) },
  widgets: { from: s(28), to: s(32) },
  outro: { from: s(32), to: s(36) },
};

export const TOTAL = SCENES.outro.to;
