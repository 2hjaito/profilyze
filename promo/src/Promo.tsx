import { CameraMotionBlur } from "@remotion/motion-blur";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { Background } from "./components/Background";
import { Wipe } from "./components/Motion";
import { COPY } from "./copy";
import { Banners } from "./scenes/Banners";
import { Editor } from "./scenes/Editor";
import { Hook } from "./scenes/Hook";
import { Logo } from "./scenes/Logo";
import { Outro } from "./scenes/Outro";
import { Readme } from "./scenes/Readme";
import { Widgets } from "./scenes/Widgets";
import { FPS, SCENES } from "./timeline";

const SCENE_COMPONENTS = { hook: Hook, logo: Logo, editor: Editor, banners: Banners, readme: Readme, widgets: Widgets, outro: Outro };

// Motion blur renders each frame several times at sub-frame offsets. MOTION_BLUR_SAMPLES=1 disables it for quick drafts.
const SAMPLES = Number(process.env.REMOTION_MOTION_BLUR_SAMPLES ?? 6);

const WIPE = Math.round(0.8 * FPS);
const WIPES = [
  { at: SCENES.readme.from, label: COPY.wipeReadme },
  { at: SCENES.outro.from, label: COPY.wipeOutro },
];

export const Promo = () => (
  <AbsoluteFill>
    <Background />
    {(Object.keys(SCENES) as (keyof typeof SCENES)[]).map((key) => {
      const { from, to } = SCENES[key];
      const Scene = SCENE_COMPONENTS[key];
      const scene = <Scene duration={to - from} />;
      return (
        <Sequence key={key} from={from} durationInFrames={to - from} name={key}>
          {SAMPLES > 1 ? (
            <CameraMotionBlur samples={SAMPLES} shutterAngle={200}>
              {scene}
            </CameraMotionBlur>
          ) : (
            scene
          )}
        </Sequence>
      );
    })}
    {WIPES.map(({ at, label }) => (
      <Sequence key={at} from={at - WIPE / 2} durationInFrames={WIPE} name={`wipe ${label}`}>
        <CameraMotionBlur samples={Math.max(1, SAMPLES)} shutterAngle={240}>
          <Wipe duration={WIPE} label={label} />
        </CameraMotionBlur>
      </Sequence>
    ))}
    <Audio src={staticFile("music.wav")} />
  </AbsoluteFill>
);
