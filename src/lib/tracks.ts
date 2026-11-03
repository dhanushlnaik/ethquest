// Original chiptune loops for ETHQuest, written as step patterns for the sequencer in audio.ts.
// One token per step: a note ("E5", "Bb3"), "-" to hold, "." for a rest, drums "k" (kick), "s" (snare), "h" (hat).

type Part = { voice: "pulse12" | "pulse25" | "pulse50" | "tri" | "saw" | "sine" | "drums"; vol: number; notes: string };
export type Track = { bpm: number; stepsPerBeat: number; loop: boolean; parts: Part[] };

const bars = (...b: string[]) => b.join(" ");
const repeat = (s: string, n: number) => Array(n).fill(s).join(" ");

// Map theme: an easy-going adventure march in C major (8 bars, eighth-note steps).
const MAP: Track = {
  bpm: 104,
  stepsPerBeat: 2,
  loop: true,
  parts: [
    {
      voice: "pulse25", vol: 0.07,
      notes: bars(
        "E5 - G5 - C6 - B5 A5", "G5 - - - E5 - D5 -", "F5 - A5 - D6 - C6 B5", "A5 - - - G5 - - -",
        "E5 - G5 - C6 - D6 E6", "D6 - C6 - A5 - G5 -", "F5 - E5 - D5 - G5 -", "C5 - - - . . . .",
      ),
    },
    {
      voice: "tri", vol: 0.16,
      notes: bars(
        "C3 . G3 . C3 . G3 .", "E3 . B3 . E3 . B3 .", "F3 . C4 . F3 . C4 .", "G3 . D4 . G3 . D4 .",
        "C3 . G3 . C3 . G3 .", "A2 . E3 . A2 . E3 .", "D3 . A3 . G3 . D4 .", "C3 . G3 . C3 . . .",
      ),
    },
    {
      voice: "pulse12", vol: 0.025,
      notes: bars(
        "C4 E4 G4 E4 C4 E4 G4 E4", "E4 G4 B4 G4 E4 G4 B4 G4", "F4 A4 C5 A4 F4 A4 C5 A4", "G4 B4 D5 B4 G4 B4 D5 B4",
        "C4 E4 G4 E4 C4 E4 G4 E4", "A3 C4 E4 C4 A3 C4 E4 C4", "D4 F4 A4 F4 G4 B4 D5 B4", "C4 E4 G4 E4 C4 . . .",
      ),
    },
    { voice: "drums", vol: 0.05, notes: repeat("k . h . k . h .", 8) },
  ],
};

// Ranked run: a driving A-minor chase at 138 bpm.
const RANKED: Track = {
  bpm: 138,
  stepsPerBeat: 2,
  loop: true,
  parts: [
    {
      voice: "pulse25", vol: 0.07,
      notes: bars(
        "A4 . C5 . E5 - D5 C5", "A4 - - - . . E4 G4", "A4 . C5 . E5 - G5 E5", "D5 - - - . . . .",
        "F5 - E5 - D5 - C5 -", "E5 - - - C5 - A4 -", "B4 - C5 - D5 - E5 -", "E5 - - - . . . .",
      ),
    },
    {
      voice: "tri", vol: 0.17,
      notes: bars(
        repeat("A2 A3", 4), repeat("F2 F3", 4), repeat("C3 C4", 4), repeat("G2 G3", 4),
        repeat("F2 F3", 4), repeat("C3 C4", 4), repeat("G2 G3", 4), repeat("E2 E3", 4),
      ),
    },
    {
      voice: "pulse12", vol: 0.022,
      notes: bars(
        repeat("A4 C5 E5 C5", 2), repeat("F4 A4 C5 A4", 2), repeat("C5 E5 G5 E5", 2), repeat("G4 B4 D5 B4", 2),
        repeat("F4 A4 C5 A4", 2), repeat("C5 E5 G5 E5", 2), repeat("G4 B4 D5 B4", 2), repeat("E4 G#4 B4 G#4", 2),
      ),
    },
    { voice: "drums", vol: 0.06, notes: repeat("k h s h k k s h", 8) },
  ],
};

// Victory jingle: plays once over the results screen, then the loop returns.
const VICTORY: Track = {
  bpm: 150,
  stepsPerBeat: 2,
  loop: false,
  parts: [
    { voice: "pulse25", vol: 0.1, notes: "C5 E5 G5 C6 - G5 C6 - E6 - - - - - . ." },
    { voice: "pulse12", vol: 0.05, notes: "G4 C5 E5 G5 - E5 G5 - C6 - - - - - . ." },
    { voice: "tri", vol: 0.2, notes: "C3 . . . G3 . . . C3 - - - - - . ." },
    { voice: "drums", vol: 0.07, notes: "k . . . s . . . k . s . k . . ." },
  ],
};

// Kiosk: slow, quiet arpeggios for the booth TV. Sits under conversation.
const KIOSK: Track = {
  bpm: 76,
  stepsPerBeat: 2,
  loop: true,
  parts: [
    {
      voice: "tri", vol: 0.1,
      notes: bars(
        "F4 A4 C5 E5 C5 A4 F4 A4", "A3 C4 E4 G4 E4 C4 A3 C4", "Bb3 D4 F4 A4 F4 D4 Bb3 D4", "C4 E4 G4 Bb4 G4 E4 C4 E4",
        "F4 A4 C5 E5 C5 A4 F4 A4", "D4 F4 A4 C5 A4 F4 D4 F4", "Bb3 D4 F4 A4 F4 D4 Bb3 D4", "C4 E4 G4 C5 G4 E4 C4 .",
      ),
    },
    {
      voice: "sine", vol: 0.12,
      notes: bars("F2 - - - - - - -", "A2 - - - - - - -", "Bb2 - - - - - - -", "C3 - - - - - - -", "F2 - - - - - - -", "D2 - - - - - - -", "Bb2 - - - - - - -", "C3 - - - - - - -"),
    },
    {
      voice: "pulse12", vol: 0.03,
      notes: bars("C6 - - - - - - -", ". . . . . . . .", "A5 - - - G5 - - -", ". . . . . . . .", "C6 - - - D6 - - -", "A5 - - - - - - -", "F5 - - - G5 - - -", "E5 - - - . . . ."),
    },
  ],
};

export const TRACKS = { map: MAP, ranked: RANKED, victory: VICTORY, kiosk: KIOSK };
export type TrackName = keyof typeof TRACKS;
