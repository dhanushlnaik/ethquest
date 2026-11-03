import "server-only";
import { createHash } from "node:crypto";
import { db } from "./db";
import { UserError } from "./action";
import { dayKey, getCatalog, grantPack } from "./cards";
import { recentDecisions, seriesName } from "./eipsinsight";
import { awardXP, withProgress } from "./progression";
import { EIPSINSIGHT, eipUrl } from "@/lib/config/game";
import type { EipCard } from "@/generated/prisma/client";

// Daily challenge: one question per Mumbai day, the same for everyone, generated from live data on first request.

export type DailyQuestion = {
  kind: "status" | "decision" | "upgrade" | "title";
  prompt: string;
  options: { id: string; label: string }[];
  correctId: string;
  explanation: string;
  link: { label: string; url: string };
  card: number | null;
};
export type DailyPublic = Omit<DailyQuestion, "correctId" | "explanation">;

const KINDS: DailyQuestion["kind"][] = ["status", "decision", "upgrade", "title"];
const STATUSES = ["Draft", "Review", "Last Call", "Final", "Stagnant", "Withdrawn", "Living"];
const STAGES: Record<string, string> = {
  Scheduled: "Scheduled for inclusion (SFI)",
  Considered: "Considered for inclusion (CFI)",
  Declined: "Declined for inclusion (DFI)",
  Included: "Included",
  Withdrawn: "Withdrawn",
};

/** Deterministic randomness per day, so a regenerated question is identical. */
function seeded(day: string) {
  let n = 0;
  const next = () => {
    const h = createHash("sha256").update(`${day}:${n++}`).digest();
    return h.readUInt32BE(0) / 2 ** 32;
  };
  const pick = <T,>(arr: T[]) => arr[Math.floor(next() * arr.length)];
  const shuffle = <T,>(arr: T[]) => arr.map((v) => ({ v, k: next() })).sort((a, b) => a.k - b.k).map((x) => x.v);
  return { next, pick, shuffle };
}

const label = (c: Pick<EipCard, "repo" | "number">) => `${c.repo === "erc" ? "ERC" : "EIP"}-${c.number}`;

async function build(day: string): Promise<DailyQuestion> {
  const r = seeded(day);
  const cat = await getCatalog();
  const dayIndex = Math.floor(new Date(`${day}T00:00:00Z`).getTime() / 86_400_000);
  const preferred = KINDS[dayIndex % KINDS.length];
  for (const kind of [preferred, ...KINDS.filter((k) => k !== preferred)]) {
    if (kind === "status") {
      // Freshly levelled-up cards make the best "what's its status now?" questions.
      const recent = cat.all.filter((c) => c.leveledAt && Date.now() - c.leveledAt.getTime() < 14 * 86_400_000);
      const card = r.pick(recent.length ? recent : cat.all.filter((c) => c.status !== "Final"));
      if (!card) continue;
      const options = r.shuffle([card.status, ...r.shuffle(STATUSES.filter((s) => s !== card.status)).slice(0, 3)]);
      return {
        kind, card: card.number,
        prompt: `What is the status of ${label(card)} "${card.title}" today?`,
        options: options.map((s) => ({ id: s, label: s })),
        correctId: card.status,
        explanation: `${label(card)} is "${card.status}" on EIPsInsight right now. Its card shows the same status, and levels up when it moves.`,
        link: { label: `Check ${label(card)} on EIPsInsight`, url: eipUrl(card.number, card.repo) },
      };
    }
    if (kind === "decision") {
      const decisions = (await recentDecisions(60).catch(() => [])).filter((d) => d.stageTo && STAGES[d.stageTo] && d.eips.length);
      const d = r.pick(decisions.slice(0, 20));
      if (!d) continue;
      const n = d.eips[0];
      const card = cat.byNumber.get(n);
      const options = r.shuffle([d.stageTo!, ...r.shuffle(Object.keys(STAGES).filter((s) => s !== d.stageTo)).slice(0, 3)]);
      return {
        kind, card: card ? n : null,
        prompt: `On ${d.meeting} (${seriesName(d.series)}), core devs made a call on EIP-${n}${card ? ` "${card.title}"` : ""}. What did they decide?`,
        options: options.map((s) => ({ id: s, label: STAGES[s] })),
        correctId: d.stageTo!,
        explanation: `Recorded decision: "${d.text}"`,
        link: { label: "Open the call on EIPsInsight", url: `${EIPSINSIGHT}/calls/${d.series}/${d.callNumber}` },
      };
    }
    if (kind === "upgrade") {
      const withUpgrade = cat.all.filter((c) => c.upgrade);
      const card = r.pick(withUpgrade);
      if (!card) continue;
      const others = [...new Set(withUpgrade.map((c) => c.upgrade!).filter((u) => u !== card.upgrade))];
      const options = r.shuffle([card.upgrade!, ...r.shuffle(others).slice(0, 3)]);
      return {
        kind, card: card.number,
        prompt: `${label(card)} "${card.title}" belongs to which network upgrade?`,
        options: options.map((u) => ({ id: u, label: u })),
        correctId: card.upgrade!,
        explanation: `${label(card)} is part of ${card.upgrade}. EIPsInsight tracks every upgrade's EIPs and timeline.`,
        link: { label: "Explore network upgrades", url: `${EIPSINSIGHT}/upgrade` },
      };
    }
    // title
    const card = r.pick(cat.all.filter((c) => c.status === "Final"));
    if (!card) continue;
    const same = cat.all.filter((c) => c.category === card.category && c.number !== card.number && c.title !== card.title);
    const options = r.shuffle([card, ...r.shuffle(same).slice(0, 3)]);
    return {
      kind: "title", card: card.number,
      prompt: `What is ${label(card)} called?`,
      options: options.map((c) => ({ id: String(c.number), label: c.title })),
      correctId: String(card.number),
      explanation: `${label(card)} is "${card.title}" (${card.category ?? card.type}).`,
      link: { label: `Read ${label(card)} on EIPsInsight`, url: eipUrl(card.number, card.repo) },
    };
  }
  throw new UserError("No daily challenge available right now.");
}

export async function getDaily(day = dayKey()) {
  const existing = await db.dailyChallenge.findUnique({ where: { day } });
  if (existing) return existing.question as unknown as DailyQuestion;
  const question = await build(day);
  await db.dailyChallenge.createMany({ data: [{ day, question: question as unknown as object }], skipDuplicates: true });
  return ((await db.dailyChallenge.findUniqueOrThrow({ where: { day } })).question) as unknown as DailyQuestion;
}

export const publicDaily = (q: DailyQuestion): DailyPublic => ({ kind: q.kind, prompt: q.prompt, options: q.options, link: q.link, card: q.card });

/** Consecutive days answered, ending today (or yesterday, if today isn't answered yet). */
export async function streakOf(playerId: string) {
  const rows = await db.dailyAnswer.findMany({ where: { playerId }, orderBy: { day: "desc" }, take: 120, select: { day: true } });
  const days = new Set(rows.map((r) => r.day));
  const today = dayKey();
  const back = (d: string, n: number) => new Date(new Date(`${d}T12:00:00Z`).getTime() - n * 86_400_000).toISOString().slice(0, 10);
  let start = days.has(today) ? today : back(today, 1);
  if (!days.has(start)) return { streak: 0, answeredToday: false };
  let streak = 0;
  while (days.has(start)) { streak++; start = back(start, 1); }
  return { streak, answeredToday: days.has(today) };
}

export async function answerDaily(player: { id: string; xpTotal: number }, choice: string) {
  const day = dayKey();
  const q = await getDaily(day);
  if (!q.options.some((o) => o.id === choice)) throw new UserError("Pick one of the options.");
  const correct = choice === q.correctId;
  const inserted = await db.dailyAnswer.createMany({ data: [{ playerId: player.id, day, choice, correct }], skipDuplicates: true });
  if (inserted.count === 0) throw new UserError("You already answered today's challenge. Come back tomorrow!");
  const { streak } = await streakOf(player.id);
  const { gains } = await withProgress(player, async (tx, g) => {
    if (correct) g.xp += (await awardXP(tx, player.id, 10, "daily-challenge", `dq:${day}`)).awarded;
    if (streak === 3 && (await grantPack(tx, player.id, `streak3:${day}`, "3-day streak pack"))) g.packs++;
    if (streak % 7 === 0 && (await grantPack(tx, player.id, `streak:${day}`, `${streak}-day streak: Epic pack`))) g.packs++;
  });
  return { correct, correctId: q.correctId, explanation: q.explanation, streak, gains };
}
