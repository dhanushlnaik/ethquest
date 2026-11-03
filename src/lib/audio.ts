"use client";

// ETHQuest audio engine: an 8-bit synth on WebAudio. No audio files, nothing to download or license.
// Two buses (effects, music) with their own switches and volumes, saved per device.
// Effects are on by default, music is off by default (booths are loud). Nothing plays until a tap.

import { TRACKS, type TrackName } from "./tracks";

export type Sfx =
  | "tap" | "tick" | "correct" | "wrong" | "xp" | "levelup" | "unlock"
  | "chest" | "coins" | "coin" | "fanfare" | "pair" | "page" | "achievement" | "start";

export type AudioSettings = { sfx: boolean; music: boolean; sfxVol: number; musicVol: number };
const DEFAULTS: AudioSettings = { sfx: true, music: false, sfxVol: 0.7, musicVol: 0.5 };
const KEY = "eq_audio";

// ---------------- settings store (useSyncExternalStore-friendly) ----------------

let settings: AudioSettings | null = null;
const listeners = new Set<() => void>();

export function getSettings(): AudioSettings {
  if (settings) return settings;
  try {
    settings = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    settings = { ...DEFAULTS };
  }
  return settings!;
}
export const SERVER_SETTINGS = DEFAULTS;
export function subscribeSettings(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
export function updateSettings(patch: Partial<AudioSettings>) {
  settings = { ...getSettings(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {}
  applyVolumes();
  if (patch.music === true) music.resume();
  if (patch.music === false) music.stop(true);
  listeners.forEach((l) => l());
}

// ---------------- graph ----------------

let ctx: AudioContext | null = null;
let sfxBus: GainNode | null = null;
let musicBus: GainNode | null = null;
let noise: AudioBuffer | null = null;
const waves = new Map<number, PeriodicWave>();

function ensure(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      // iOS 17+: "ambient" follows the ring/silent switch and mixes with other audio.
      const nav = navigator as Navigator & { audioSession?: { type: string } };
      if (nav.audioSession) nav.audioSession.type = "ambient";
      ctx = new AudioContext();
    } catch {
      return null;
    }
    sfxBus = ctx.createGain();
    musicBus = ctx.createGain();
    sfxBus.connect(ctx.destination);
    musicBus.connect(ctx.destination);
    applyVolumes();
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    document.addEventListener("visibilitychange", () => {
      if (!ctx) return;
      if (document.hidden) void ctx.suspend();
      else void ctx.resume();
    });
  }
  if (ctx.state === "suspended" && !document.hidden) void ctx.resume();
  return ctx;
}

function applyVolumes() {
  if (!ctx || !sfxBus || !musicBus) return;
  const s = getSettings();
  sfxBus.gain.setTargetAtTime(s.sfx ? s.sfxVol : 0, ctx.currentTime, 0.02);
  musicBus.gain.setTargetAtTime(s.music ? s.musicVol * 0.55 : 0, ctx.currentTime, 0.05);
}

/** NES-style pulse wave with a given duty cycle (0.125, 0.25, 0.5). */
function pulse(duty: number) {
  let w = waves.get(duty);
  if (!w && ctx) {
    const n = 32;
    const real = new Float32Array(n);
    const imag = new Float32Array(n);
    for (let k = 1; k < n; k++) imag[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
    w = ctx.createPeriodicWave(real, imag);
    waves.set(duty, w);
  }
  return w!;
}

type Voice = "pulse12" | "pulse25" | "pulse50" | "tri" | "saw" | "sine";

/** One enveloped note on a bus. `at` is an absolute AudioContext time. */
function note(bus: GainNode, voice: Voice, freq: number, at: number, dur: number, vol: number, glideTo?: number) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  if (voice.startsWith("pulse")) osc.setPeriodicWave(pulse({ pulse12: 0.125, pulse25: 0.25, pulse50: 0.5 }[voice as "pulse12"]));
  else osc.type = voice === "tri" ? "triangle" : voice === "saw" ? "sawtooth" : "sine";
  osc.frequency.setValueAtTime(freq, at);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, at + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.linearRampToValueAtTime(vol, at + 0.006);
  g.gain.setTargetAtTime(vol * 0.6, at + 0.03, 0.05);
  g.gain.setTargetAtTime(0.0001, at + Math.max(0.03, dur - 0.03), 0.025);
  osc.connect(g).connect(bus);
  osc.start(at);
  osc.stop(at + dur + 0.15);
}

/** Filtered noise burst: hats, snares, swooshes, chest creaks. */
function hiss(bus: GainNode, at: number, dur: number, vol: number, type: BiquadFilterType, freq: number, sweepTo?: number) {
  if (!ctx || !noise) return;
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, at);
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, at + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(f).connect(g).connect(bus);
  src.start(at, Math.random() * 0.5);
  src.stop(at + dur + 0.02);
}

function kick(bus: GainNode, at: number, vol: number) {
  note(bus, "sine", 150, at, 0.14, vol, 45);
}

// ---------------- sound effects ----------------

export function play(kind: Sfx) {
  const s = getSettings();
  if (!s.sfx) return;
  const c = ensure();
  if (!c || !sfxBus) return;
  const t = c.currentTime + 0.01;
  const b = sfxBus;
  const seq = (notes: number[], step: number, voice: Voice = "pulse25", vol = 0.12, len = step) => notes.forEach((f, i) => note(b, voice, f, t + i * step, len, vol));
  switch (kind) {
    case "tap": note(b, "pulse50", 880, t, 0.04, 0.05); break;
    case "tick": note(b, "pulse12", 1500, t, 0.03, 0.05); break;
    case "page": hiss(b, t, 0.16, 0.08, "bandpass", 1800, 4500); break;
    case "pair": note(b, "tri", 330, t, 0.08, 0.22, 220); hiss(b, t, 0.05, 0.06, "lowpass", 900); break;
    case "correct": seq([784, 1047], 0.08, "pulse25", 0.13, 0.12); break;
    case "wrong": note(b, "saw", 196, t, 0.14, 0.07, 147); note(b, "saw", 147, t + 0.12, 0.22, 0.07, 110); break;
    case "coin": note(b, "pulse25", 988, t, 0.06, 0.1); note(b, "pulse25", 1319, t + 0.06, 0.22, 0.1); break;
    case "xp": seq([988, 1319, 1760], 0.05, "pulse12", 0.09); break;
    case "start": seq([392, 523, 659, 784], 0.07, "pulse50", 0.09); note(b, "tri", 196, t, 0.3, 0.2); break;
    case "unlock": seq([523, 659, 784, 1047], 0.09, "pulse25", 0.11, 0.14); break;
    case "levelup": seq([523, 659, 784, 1047, 784, 1047, 1319], 0.08, "pulse25", 0.11, 0.12); note(b, "tri", 131, t, 0.6, 0.2); break;
    case "achievement": seq([784, 988, 1175, 1568], 0.07, "pulse12", 0.1, 0.16); seq([392, 494, 587, 784], 0.07, "tri", 0.18, 0.16); break;
    case "fanfare":
      seq([523, 523, 523, 659, 784, 0, 659, 784], 0.11, "pulse25", 0.12, 0.13);
      seq([262, 0, 262, 0, 392, 0, 330, 392], 0.11, "tri", 0.22, 0.13);
      kick(b, t, 0.4); kick(b, t + 0.44, 0.4);
      break;
    case "chest":
      // rattle, creak, then the lid pops
      for (let i = 0; i < 4; i++) hiss(b, t + i * 0.06, 0.05, 0.12, "bandpass", 700 + i * 120);
      note(b, "saw", 110, t + 0.26, 0.28, 0.05, 240);
      hiss(b, t + 0.52, 0.2, 0.18, "lowpass", 2500, 400);
      kick(b, t + 0.52, 0.5);
      break;
    case "coins":
      for (let i = 0; i < 9; i++) {
        const f = [1319, 1568, 1760, 1976, 2093][i % 5];
        note(b, "pulse25", f, t + i * 0.055 + Math.random() * 0.02, 0.09, 0.07);
      }
      break;
  }
}

// ---------------- music sequencer ----------------

const NOTE_INDEX: Record<string, number> = { C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11 };
export function freqOf(name: string) {
  const m = /^([A-G](?:#|b)?)(-?\d)$/.exec(name);
  if (!m) return 0;
  const midi = (Number(m[2]) + 1) * 12 + NOTE_INDEX[m[1]];
  return 440 * 2 ** ((midi - 69) / 12);
}

type Event = { step: number; len: number; freq: number; token: string };
/** "E5 - G5 . k h s" → note events. "-" holds the previous note, "." is a rest, k/s/h are drums. */
export function parseLine(line: string): Event[] {
  const tokens = line.trim().split(/\s+/);
  const events: Event[] = [];
  tokens.forEach((tok, i) => {
    if (tok === "-") {
      const last = events[events.length - 1];
      if (last && last.step + last.len === i) last.len++;
      return;
    }
    if (tok === ".") return;
    events.push({ step: i, len: 1, freq: freqOf(tok), token: tok });
  });
  return events;
}

class Music {
  private track: TrackName | null = null;
  private wanted: TrackName | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private step = 0;
  private nextAt = 0;
  private compiled: { voice: Voice | "drums"; vol: number; byStep: Map<number, Event[]> }[] = [];
  private length = 0;
  private stepDur = 0;
  private loop = true;
  private afterJingle: TrackName | null = null;

  /** Which track the current screen wants. Starts it only if music is switched on. */
  want(name: TrackName) {
    this.wanted = name;
    if (this.afterJingle) {
      this.afterJingle = name;
      return;
    }
    if (getSettings().music && this.track !== name) this.start(name);
  }

  resume() {
    if (this.wanted) this.start(this.wanted);
  }

  /** One-shot jingle over the top: the loop stops, the jingle plays, then the wanted loop comes back. */
  jingle(name: TrackName) {
    if (!getSettings().music) return;
    this.afterJingle = this.wanted;
    this.start(name);
  }

  private start(name: TrackName) {
    const c = ensure();
    if (!c || !musicBus) return;
    this.stop(false);
    const t = TRACKS[name];
    this.track = name;
    this.loop = t.loop;
    this.stepDur = 60 / t.bpm / t.stepsPerBeat;
    this.compiled = t.parts.map((p) => {
      const byStep = new Map<number, Event[]>();
      for (const e of parseLine(p.notes)) byStep.set(e.step, [...(byStep.get(e.step) ?? []), e]);
      return { voice: p.voice, vol: p.vol, byStep };
    });
    this.length = Math.max(...t.parts.map((p) => p.notes.trim().split(/\s+/).length));
    this.step = 0;
    this.nextAt = c.currentTime + 0.08;
    this.timer = setInterval(() => this.schedule(), 25);
  }

  private schedule() {
    if (!ctx || !musicBus) return;
    while (this.nextAt < ctx.currentTime + 0.15) {
      for (const part of this.compiled) {
        for (const e of part.byStep.get(this.step) ?? []) {
          const dur = e.len * this.stepDur;
          if (part.voice === "drums") {
            if (e.token === "k") kick(musicBus, this.nextAt, part.vol * 2.2);
            else if (e.token === "s") hiss(musicBus, this.nextAt, 0.12, part.vol, "bandpass", 1800);
            else if (e.token === "h") hiss(musicBus, this.nextAt, 0.035, part.vol * 0.6, "highpass", 7000);
          } else if (e.freq) {
            note(musicBus, part.voice, e.freq, this.nextAt, dur * 0.95, part.vol);
          }
        }
      }
      this.nextAt += this.stepDur;
      this.step++;
      if (this.step >= this.length) {
        if (this.loop) this.step = 0;
        else {
          const back = this.afterJingle;
          this.afterJingle = null;
          this.stop(false);
          if (back && getSettings().music) setTimeout(() => this.start(back), 400);
          return;
        }
      }
    }
  }

  stop(clearWanted: boolean) {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.track = null;
    if (clearWanted) this.afterJingle = null;
  }
}

export const music = new Music();
