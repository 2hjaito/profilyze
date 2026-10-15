// Synthesizes the promo soundtrack (no samples, no licensing): 120 BPM, A minor, Am–F–C–G.
// Sections line up with the video's scene cuts (see src/timeline.ts):
//   0–6s intro + riser, 6s drop, 22–28s breakdown + snare build, 28s re-drop, 32s impact, outro to 36s.
import { writeFile } from "node:fs/promises";

const SR = 44100;
const BPM = 120;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
const LENGTH = 36;
const N = Math.ceil(LENGTH * SR);
const L = new Float32Array(N);
const R = new Float32Array(N);

// Deterministic noise so every render sounds the same.
let seed = 1;
const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
const mtof = (m) => 440 * 2 ** ((m - 69) / 12);
const idx = (t) => Math.floor(t * SR);

function add(buf, start, samples, gain = 1, pan = 0) {
  const s0 = idx(start);
  const gl = gain * Math.min(1, 1 - pan);
  const gr = gain * Math.min(1, 1 + pan);
  for (let i = 0; i < samples.length; i++) {
    const j = s0 + i;
    if (j < 0 || j >= N) continue;
    if (buf === "both" || buf === "L") L[j] += samples[i] * gl;
    if (buf === "both" || buf === "R") R[j] += samples[i] * gr;
  }
}

// ---------- instruments ----------

function kick(dur = 0.45) {
  const n = idx(dur);
  const out = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = 48 + 110 * Math.exp(-t * 32);
    phase += (2 * Math.PI * f) / SR;
    out[i] = Math.sin(phase) * Math.exp(-t * 7.5) + (i < 200 ? noise() * 0.3 * (1 - i / 200) : 0);
  }
  return out;
}

function hat(dur = 0.07, bright = 0.9) {
  const n = idx(dur);
  const out = new Float32Array(n);
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const x = noise();
    const hp = x - prev * bright; // crude high-pass
    prev = x;
    out[i] = hp * Math.exp(-(i / SR) * 55);
  }
  return out;
}

function clap() {
  const n = idx(0.25);
  const out = new Float32Array(n);
  let lp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = [0, 0.011, 0.022].reduce((a, o) => a + (t >= o ? Math.exp(-(t - o) * (o === 0.022 ? 18 : 140)) : 0), 0);
    lp += 0.45 * (noise() - lp);
    out[i] = (noise() - lp) * env * 0.6;
  }
  return out;
}

function snare(dur = 0.18) {
  const n = idx(dur);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    out[i] = (noise() * 0.7 + Math.sin(2 * Math.PI * 190 * t) * 0.4) * Math.exp(-t * 22);
  }
  return out;
}

/** Detuned saws through a one-pole low-pass. */
function saws(freq, dur, { voices = 3, detune = 0.008, cutoff = 1800, attack = 0.01, release = 0.2, decay = 0 } = {}) {
  const n = idx(dur + release);
  const out = new Float32Array(n);
  const phases = Array.from({ length: voices }, (_, v) => v / voices);
  let lp = 0;
  const a = 1 - Math.exp((-2 * Math.PI * cutoff) / SR);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let s = 0;
    for (let v = 0; v < voices; v++) {
      const f = freq * (1 + (v - (voices - 1) / 2) * detune);
      phases[v] = (phases[v] + f / SR) % 1;
      s += phases[v] * 2 - 1;
    }
    s /= voices;
    lp += a * (s - lp);
    let env = Math.min(1, t / attack);
    if (decay) env *= Math.exp(-t * decay);
    if (t > dur) env *= Math.max(0, 1 - (t - dur) / release);
    out[i] = lp * env;
  }
  return out;
}

function sine(freq, dur, decay = 3) {
  const n = idx(dur);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    out[i] = (Math.sin(2 * Math.PI * freq * t) + 0.25 * Math.sin(4 * Math.PI * freq * t)) * Math.min(1, t / 0.005) * Math.exp(-t * decay);
  }
  return out;
}

function riser(dur) {
  const n = idx(dur);
  const out = new Float32Array(n);
  let lp = 0;
  for (let i = 0; i < n; i++) {
    const p = i / n;
    const a = 0.01 + 0.5 * p * p;
    lp += a * (noise() - lp);
    out[i] = lp * p * p * 1.6;
  }
  return out;
}

function impact() {
  const n = idx(2.5);
  const out = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    phase += (2 * Math.PI * (35 + 60 * Math.exp(-t * 6))) / SR;
    out[i] = Math.sin(phase) * Math.exp(-t * 1.6) * 0.9 + noise() * Math.exp(-t * 9) * 0.25;
  }
  return out;
}

// ---------- arrangement ----------

// Am, F, C, G (MIDI notes)
const CHORDS = [
  [57, 60, 64],
  [53, 57, 60],
  [48, 52, 55],
  [55, 59, 62],
];
const ROOTS = [45, 41, 36, 43];
const bars = Math.ceil(LENGTH / BAR);

const sections = (t) => ({
  intro: t < 6,
  main: (t >= 6 && t < 22) || (t >= 28 && t < 32),
  breakdown: t >= 22 && t < 28,
  outro: t >= 32,
});

// Pad on every bar; brighter as the track goes on.
for (let b = 0; b < bars; b++) {
  const t = b * BAR;
  const chord = CHORDS[b % 4];
  const s = sections(t);
  const cutoff = s.intro ? 500 + b * 350 : s.breakdown ? 900 : s.outro ? 1400 : 1800;
  chord.forEach((m, k) =>
    add("both", t, saws(mtof(m), BAR, { voices: 4, detune: 0.01, cutoff, attack: 0.35, release: 0.8 }), 0.09, (k - 1) * 0.5),
  );
}

// Drums, bass and arp.
const kickTimes = [];
for (let beat = 0; beat * BEAT < LENGTH; beat++) {
  const t = beat * BEAT;
  const s = sections(t);
  const bar = Math.floor(t / BAR);
  if (s.main) {
    add("both", t, kick(), 0.95);
    kickTimes.push(t);
    add("both", t + BEAT / 2, hat(0.09), 0.22, 0.3);
    add("both", t + BEAT / 4, hat(0.04), 0.08, -0.4);
    add("both", t + (3 * BEAT) / 4, hat(0.04), 0.08, -0.4);
    if (beat % 4 === 1 || beat % 4 === 3) add("both", t, clap(), 0.55);
  }
  if (s.main || s.breakdown) {
    // Bass: offbeat eighths on the chord root.
    const root = ROOTS[bar % 4];
    add("both", t + BEAT / 2, saws(mtof(root), BEAT / 2 - 0.02, { voices: 2, detune: 0.004, cutoff: s.breakdown ? 380 : 650, release: 0.03 }), 0.32);
  }
}

// Breakdown build: snare roll accelerating into the re-drop at 28s.
for (let t = 26, step = BEAT / 2; t < 28; t += step) {
  if (t > 27) step = BEAT / 8;
  else if (t > 26.5) step = BEAT / 4;
  add("both", t, snare(), 0.18 + 0.25 * ((t - 26) / 2));
}

// Arpeggio: sixteenths over the chord, with a ping-pong echo.
const arpL = new Float32Array(N);
const arpR = new Float32Array(N);
for (let step = 0; step * (BEAT / 4) < LENGTH; step++) {
  const t = step * (BEAT / 4);
  const s = sections(t);
  if (!(s.main || s.breakdown) || t < 6) continue;
  const chord = CHORDS[Math.floor(t / BAR) % 4];
  const pattern = [0, 1, 2, 1, 2, 0, 1, 2];
  const note = chord[pattern[step % 8]] + 12 + (step % 16 >= 8 ? 12 : 0);
  const pluck = saws(mtof(note), 0.09, { voices: 2, detune: 0.005, cutoff: s.breakdown ? 1500 : 3200, decay: 18, release: 0.05 });
  const s0 = idx(t);
  for (let i = 0; i < pluck.length && s0 + i < N; i++) {
    arpL[s0 + i] += pluck[i] * 0.13;
    arpR[s0 + i] += pluck[i] * 0.13;
  }
}
const delay = idx((BEAT * 3) / 4);
for (let i = delay; i < N; i++) {
  arpL[i] += arpR[i - delay] * 0.42;
  arpR[i] += arpL[i - delay] * 0.42;
}
for (let i = 0; i < N; i++) {
  L[i] += arpL[i];
  R[i] += arpR[i];
}

// Transitions.
add("both", 4.3, riser(1.7), 0.35);
add("both", 6, impact(), 0.7);
add("both", 26.2, riser(1.8), 0.3);
add("both", 28, impact(), 0.55);
add("both", 32, impact(), 0.75);
CHORDS[0].forEach((m, k) => add("both", 32, saws(mtof(m + 12), 3.4, { voices: 4, cutoff: 2200, attack: 0.01, decay: 0.7, release: 0.4 }), 0.1, (k - 1) * 0.6));
add("both", 32, sine(mtof(45), 3, 1.2), 0.35);

// Sidechain-style pump: duck everything except drums a little after each kick.
const duck = new Float32Array(N).fill(1);
for (const k of kickTimes) {
  const s0 = idx(k);
  for (let i = 0; i < idx(0.32) && s0 + i < N; i++) duck[s0 + i] = Math.min(duck[s0 + i], 0.55 + 0.45 * (i / idx(0.32)) ** 0.8);
}

// Master: duck, fades, soft clip, normalize.
let peak = 0;
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const fade = Math.min(1, t / 0.8) * Math.min(1, (LENGTH - t) / 2.5);
  const d = 0.35 + 0.65 * duck[i];
  L[i] = Math.tanh(L[i] * d * 1.3) * fade;
  R[i] = Math.tanh(R[i] * d * 1.3) * fade;
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}

const data = Buffer.alloc(N * 4);
const norm = 0.89 / peak;
for (let i = 0; i < N; i++) {
  data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * norm)) * 32767), i * 4);
  data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * norm)) * 32767), i * 4 + 2);
}
const header = Buffer.alloc(44);
header.write("RIFF", 0);
header.writeUInt32LE(36 + data.length, 4);
header.write("WAVEfmt ", 8);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(2, 22);
header.writeUInt32LE(SR, 24);
header.writeUInt32LE(SR * 4, 28);
header.writeUInt16LE(4, 32);
header.writeUInt16LE(16, 34);
header.write("data", 36);
header.writeUInt32LE(data.length, 40);
const out = new URL("../public/music.wav", import.meta.url);
await writeFile(out, Buffer.concat([header, data]));
console.log(`wrote ${out.pathname} (${LENGTH}s)`);
