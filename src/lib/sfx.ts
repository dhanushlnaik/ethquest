"use client";

// Tiny 8-bit synth on WebAudio: no audio files to download. Muted by default; preference kept in localStorage.
type Sfx = "tap" | "correct" | "wrong" | "xp" | "levelup" | "unlock" | "tick";

let ctx: AudioContext | null = null;
const KEY = "eq_sound";

export function soundEnabled() {
  try {
    return localStorage.getItem(KEY) === "on";
  } catch {
    return false;
  }
}
export function setSoundEnabled(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {}
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = "square", gain = 0.06) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
  g.gain.setValueAtTime(gain, ctx.currentTime + start);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + dur + 0.02);
}

export function play(kind: Sfx) {
  if (typeof window === "undefined" || !soundEnabled()) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    switch (kind) {
      case "tap": tone(660, 0, 0.05, "square", 0.03); break;
      case "tick": tone(1200, 0, 0.03, "square", 0.02); break;
      case "correct": tone(784, 0, 0.08); tone(1047, 0.08, 0.14); break;
      case "wrong": tone(220, 0, 0.12, "sawtooth", 0.05); tone(165, 0.1, 0.2, "sawtooth", 0.05); break;
      case "xp": [988, 1319].forEach((f, i) => tone(f, i * 0.06, 0.08, "square", 0.04)); break;
      case "unlock": [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.12)); break;
      case "levelup": [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.08, 0.12)); break;
    }
  } catch {}
}
