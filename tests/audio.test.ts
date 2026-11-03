import { describe, expect, it } from "vitest";
import { freqOf, parseLine } from "@/lib/audio";
import { TRACKS } from "@/lib/tracks";

describe("music engine", () => {
  it("maps note names to frequencies", () => {
    expect(freqOf("A4")).toBeCloseTo(440);
    expect(freqOf("C4")).toBeCloseTo(261.63, 1);
    expect(freqOf("Bb3")).toBeCloseTo(233.08, 1);
    expect(freqOf("k")).toBe(0);
  });
  it("parses holds, rests and drums", () => {
    const ev = parseLine("E5 - - . G5 k");
    expect(ev.map((e) => [e.token, e.step, e.len])).toEqual([["E5", 0, 3], ["G5", 4, 1], ["k", 5, 1]]);
  });
  it("keeps every part of a track the same length, so loops stay in sync", () => {
    for (const [name, t] of Object.entries(TRACKS)) {
      const lengths = new Set(t.parts.map((p) => p.notes.trim().split(/\s+/).length));
      expect(lengths.size, name).toBe(1);
      for (const p of t.parts) {
        if (p.voice === "drums") continue;
        for (const tok of p.notes.trim().split(/\s+/)) if (tok !== "-" && tok !== ".") expect(freqOf(tok), `${name}: ${tok}`).toBeGreaterThan(0);
      }
    }
  });
});
