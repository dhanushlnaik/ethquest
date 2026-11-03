import { describe, expect, it } from "vitest";
import { levelFor, LEVELS, RANKED_GAMES, RANKED_MAX, scoreRankedRun } from "@/lib/config/game";
import { buildPathway, DNA_QUESTIONS, GOALS, INTERESTS, ROLES, scoreDna } from "@/lib/games/content";
import { grade, type PrivateRound } from "@/lib/server/games";
import { pathways as seedPathways } from "../prisma/seed/world";
import { spotFake, trivia, matchSets } from "../prisma/seed/questions";

describe("levels", () => {
  it("maps XP to the right level and progress", () => {
    expect(levelFor(0).level).toBe(1);
    expect(levelFor(24).level).toBe(1);
    expect(levelFor(25).level).toBe(2);
    expect(levelFor(250).level).toBe(7);
    expect(levelFor(9999).progress).toBe(1);
    expect(levelFor(40).progress).toBeCloseTo((40 - 25) / (60 - 25));
    expect(LEVELS.map((l) => l.xp)).toEqual([...LEVELS.map((l) => l.xp)].sort((a, b) => a - b));
  });
});

describe("ranked scoring", () => {
  it("matches the booth spec: 50/50/50/30 base, bonuses capped", () => {
    expect(RANKED_GAMES["guess-that-eip"].base).toBe(50);
    expect(RANKED_GAMES["eip-explorer"].base).toBe(30);
    expect(RANKED_MAX).toBe(250);
  });
  it("gives full marks only for a fast, perfect, hint-free run", () => {
    const best = scoreRankedRun("guess-that-eip", { points: 5, maxPoints: 5, hints: 0, seconds: 40 });
    expect(best).toMatchObject({ base: 50, perfect: 10, speed: 10, total: 70, max: 70 });
    const hinted = scoreRankedRun("guess-that-eip", { points: 5, maxPoints: 5, hints: 1, seconds: 40 });
    expect(hinted.perfect).toBe(0);
    expect(hinted.base).toBe(48);
  });
  it("fades the speed bonus and withholds it from weak runs", () => {
    const slow = scoreRankedRun("fork-detective", { points: 8, maxPoints: 8, hints: 0, seconds: 270 });
    expect(slow.speed).toBe(0);
    const mid = scoreRankedRun("fork-detective", { points: 8, maxPoints: 8, hints: 0, seconds: 180 });
    expect(mid.speed).toBe(5);
    const weak = scoreRankedRun("core-dev-insider", { points: 1, maxPoints: 3, hints: 0, seconds: 10 });
    expect(weak.speed).toBe(0);
    expect(weak.base).toBe(17);
  });
  it("never goes negative", () => {
    expect(scoreRankedRun("eip-explorer", { points: 0, maxPoints: 3, hints: 3, seconds: 5 }).total).toBe(0);
  });
});

describe("pathfinder engine", () => {
  const pathways = seedPathways.map((p, i) => ({
    id: `p${i}`, code: p.code, title: p.title, tagline: p.tagline, summary: p.summary, color: p.color,
    steps: p.steps.map((s, j) => ({ ...s, roles: s.roles ?? [], goals: s.goals ?? [], sortOrder: j })),
  }));

  it("produces a full 5-stage journey for every role × interest × goal", () => {
    for (const r of ROLES) for (const i of INTERESTS) for (const g of GOALS) {
      const built = buildPathway({ role: r.id, interest: i.id, goal: g.id }, pathways);
      expect(built, `${r.id}/${i.id}/${g.id}`).not.toBeNull();
      expect(built!.steps.map((s) => s.stage)).toEqual(["START", "EXPLORE", "PARTICIPATE", "CONTRIBUTE", "NEXT"]);
      for (const s of built!.steps) for (const res of s.resources) expect(res.url).toMatch(/^https:\/\//);
    }
  });

  it("routes proposal writers to Governance & Editorial and personalizes steps", () => {
    const b = buildPathway({ role: "student", interest: "scaling", goal: "proposals" }, pathways)!;
    expect(b.code).toBe("A");
    expect(b.steps.find((s) => s.stage === "CONTRIBUTE")!.title).toMatch(/Draft your own idea/);
    expect(b.steps.find((s) => s.stage === "START")!.title).toMatch(/language/); // student-specific start
  });

  it("rejects unknown choices", () => {
    expect(buildPathway({ role: "x", interest: "eips", goal: "build" }, pathways)).toBeNull();
  });
});

describe("builder dna", () => {
  it("always returns a known result", () => {
    expect(scoreDna(DNA_QUESTIONS.map(() => "a"))).toBeTruthy();
    expect(scoreDna(["b", "b", "b", "c", "c"])).toBe("gas-optimizer");
  });
});

describe("grading", () => {
  it("grades choice rounds server-side", () => {
    const r: PrivateRound = { kind: "choice", pub: { kind: "choice", prompt: "?", options: [{ id: "a", label: "A" }, { id: "b", label: "B" }], hasHint: false }, correctId: "b", explanation: "x" };
    expect(grade(r, { optionId: "b" }).correct).toBe(true);
    expect(grade(r, { optionId: "a" }).correct).toBe(false);
    expect(grade(r, { optionId: null }).points).toBe(0); // timeout
  });
  it("scores timelines by correct positions", () => {
    const item = (id: string) => ({ id, label: id, date: "", oneLiner: "", changes: [], url: "", eips: [] });
    const r: PrivateRound = { kind: "order", pub: { kind: "order", prompt: "", items: [] }, correctOrder: ["a", "b", "c", "d"].map(item) };
    expect(grade(r, { order: ["a", "b", "c", "d"] })).toMatchObject({ points: 4, correct: true });
    expect(grade(r, { order: ["b", "a", "c", "d"] })).toMatchObject({ points: 2, correct: false });
  });
  it("scores matches per pair", () => {
    const r: PrivateRound = { kind: "match", pub: { kind: "match", prompt: "", left: [], right: [] }, pairs: { l1: "r1", l2: "r2" }, explanation: "" };
    expect(grade(r, { pairs: { l1: "r1", l2: "r1" } }).points).toBe(1);
  });
});

describe("content integrity", () => {
  it("every trivia has 4 unique options and sources", () => {
    for (const q of trivia) {
      expect(new Set(q.options).size, q.slug).toBe(4);
      expect(q.sourceUrl).toMatch(/^https:\/\//);
      expect(q.learnMoreUrl).toMatch(/^https:\/\/eipsinsight\.com/);
    }
  });
  it("every spot-the-fake round has exactly one fake, explicitly called fictional", () => {
    for (const s of spotFake) {
      expect(s.cards.filter((c) => c.fake).length, s.slug).toBe(1);
      const fake = s.cards.find((c) => c.fake)!;
      expect(s.explanation).toContain(fake.label);
      expect(s.explanation).toMatch(/fictional|made it up|made up|does not exist/i);
    }
  });
  it("match sets have unique sides", () => {
    for (const m of matchSets) {
      expect(new Set(m.pairs.map((p) => p[0])).size).toBe(m.pairs.length);
      expect(new Set(m.pairs.map((p) => p[1])).size).toBe(m.pairs.length);
    }
  });
});

describe("nickname filter", () => {
  it("accepts real names that merely contain a flagged fragment", async () => {
    const { cleanNickname } = await import("@/lib/server/nickname");
    for (const n of ["Dhanush", "Harshit", "Shitij", "Arshit", "Cassandra", "Analyst", "BlobEnjoyer"]) expect(cleanNickname(n), n).toBe(n);
  });
  it("still rejects offensive names", async () => {
    const { cleanNickname } = await import("@/lib/server/nickname");
    for (const n of ["fuck", "FuckYou", "shit happens", "big_slut", "ass"]) expect(cleanNickname(n), n).toBeNull();
  });
});
