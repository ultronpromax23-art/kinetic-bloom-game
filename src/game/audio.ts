import type { WeaponDef } from "./weapons";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
    const len = ctx.sampleRate * 1;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function unlockAudio() {
  ac();
}

function noise(dur: number, gain: number, filterHz: number, q = 1, type: BiquadFilterType = "lowpass") {
  const c = ac();
  if (!c || !noiseBuf || !master) return;
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = filterHz;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  src.connect(f).connect(g).connect(master);
  src.start();
  src.stop(c.currentTime + dur + 0.02);
}

function tone(freq: number, dur: number, gain: number, type: OscillatorType = "sine", slideTo?: number) {
  const c = ac();
  if (!c || !master) return;
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), c.currentTime + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  o.connect(g).connect(master);
  o.start();
  o.stop(c.currentTime + dur + 0.02);
}

export function playShot(def: WeaponDef) {
  const t = def.tone;
  noise(t.decay, 0.6 * t.punch, 2200 + t.base * 6);
  noise(t.decay * 2.2, 0.16 * t.punch, 400, 0.6);
  tone(t.base, t.decay * 0.7, 0.35 * t.punch, "square", t.base * 0.35);
}

export function playDry() {
  noise(0.05, 0.25, 3500, 3, "bandpass");
  tone(900, 0.04, 0.06, "square");
}

export function playReload() {
  noise(0.06, 0.3, 1800, 2, "bandpass");
  setTimeout(() => noise(0.07, 0.25, 900, 2, "bandpass"), 260);
  setTimeout(() => noise(0.08, 0.35, 2600, 3, "bandpass"), 620);
}

export function playHit(head: boolean) {
  tone(head ? 1500 : 950, 0.06, 0.2, "square", head ? 2100 : 1100);
  noise(0.05, 0.12, 3000, 2, "bandpass");
}

export function playKill() {
  tone(520, 0.1, 0.22, "triangle", 900);
  setTimeout(() => tone(780, 0.16, 0.2, "triangle", 1200), 70);
  noise(0.3, 0.2, 700);
}

export function playHurt() {
  noise(0.25, 0.4, 500);
  tone(120, 0.25, 0.25, "sawtooth", 60);
}

export function playSwitch() {
  noise(0.05, 0.2, 2400, 3, "bandpass");
  setTimeout(() => noise(0.05, 0.18, 1500, 3, "bandpass"), 90);
}

export function playDeath() {
  tone(300, 0.9, 0.3, "sawtooth", 45);
  noise(0.8, 0.3, 380);
}

export function playFootstep(loud: boolean) {
  noise(0.07, loud ? 0.12 : 0.06, 620, 1);
}

export function playEnemyShot(dist: number) {
  const g = Math.max(0.05, 1 - dist / 55);
  noise(0.12, 0.35 * g, 1600);
  tone(140, 0.1, 0.15 * g, "square", 60);
}

export function setMasterVolume(v: number) {
  if (master) master.gain.value = Math.max(0, Math.min(1, v));
}
