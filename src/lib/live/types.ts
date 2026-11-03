// Client-safe shapes for the live quiz. The answer key never leaves the server before a reveal.

export type LiveKind = "quiz" | "poll";

/** What phones and the big screen get while a question is open. */
export type LiveQuestionPublic = { index: number; total: number; kind: LiveKind; prompt: string; options: string[]; seconds: number; level: string };

export type LiveState = {
  code: string;
  title: string;
  status: "LOBBY" | "QUESTION" | "REVEAL" | "ENDED";
  serverNow: number;
  /** ms since epoch when the current question opened. */
  startedAt: number | null;
  question: LiveQuestionPublic | null;
  /** Only after reveal (and always for polls once revealed). */
  reveal: { correct: number | null; explanation: string; counts: number[] } | null;
  players: number;
  answered: number;
  leaderboard: { name: string; score: number }[];
  /** Host only: live vote counts while the question is open, and everyone's name for the lobby. */
  liveCounts?: number[];
  roster?: string[];
  /** Player only. */
  me?: { name: string; score: number; rank: number; answer: { choice: number; correct: boolean | null; points: number } | null } | null;
};
