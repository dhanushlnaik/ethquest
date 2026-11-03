// Shared, client-safe shapes for server-run game rounds.

export type PublicOption = { id: string; label: string; text?: string; sub?: string };

export type PublicRound =
  | {
      kind: "choice";
      prompt: string;
      options: PublicOption[];
      hasHint: boolean;
      layout?: "list" | "cards";
      /** Optional visual context, e.g. a partial timeline for Missing Piece. */
      sequence?: { label: string; sub?: string; missing?: boolean }[];
      link?: { label: string; url: string };
      badge?: string;
    }
  | { kind: "match"; prompt: string; left: PublicOption[]; right: PublicOption[] }
  | { kind: "order"; prompt: string; items: PublicOption[] }
  | { kind: "predict"; prompt: string; options: PublicOption[]; note: string };

export type Reveal =
  | { kind: "choice"; correct: boolean; correctId: string; explanation: string; learnMoreUrl?: string; learnMoreLabel?: string; extra?: string }
  | { kind: "match"; correctPairs: Record<string, string>; correctCount: number; total: number; explanation: string; learnMoreUrl?: string }
  | {
      kind: "order";
      correctOrder: { id: string; label: string; date: string; oneLiner: string; changes: string[]; url: string; eips: { n: number; title: string }[] }[];
      correctCount: number;
      total: number;
      perfect: boolean;
    }
  | { kind: "predict"; statuses: { id: string; label: string; status: string; note: string; share: number }[]; explanation: string; learnMoreUrl?: string };

export type GainsDTO = {
  xp: number;
  levelUp: { level: number; name: string } | null;
  achievements: { slug: string; name: string; icon: string; description: string }[];
  capped: boolean;
  packs: number;
};

export type StartResult = {
  attemptId: string;
  mission: { slug: string; title: string; world: string };
  difficulty: "EXPLORER" | "BUILDER" | "NERD";
  rounds: PublicRound[];
  timerSeconds: number | null;
  /** Present for the four leaderboard games. */
  ranked?: RankedInfo;
};

export type RankedInfo = { best: number; max: number };

export type RankedRun = { base: number; perfect: number; speed: number; total: number; max: number; best: number; improvedBy: number; seconds: number };

export type AnswerResult = {
  reveal: Reveal;
  gains: GainsDTO;
  done: boolean;
  summary?: { score: number; maxScore: number; perfect: boolean; ranked?: RankedRun };
};

export type ActionError = { error: string; code?: "NO_PLAYER" | "RATE_LIMIT" | "INVALID" | "UNAVAILABLE" };
