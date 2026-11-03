"use server";

import { z } from "zod";
import { db } from "@/lib/server/db";
import { requirePlayer } from "@/lib/server/session";
import { assertRateLimit } from "@/lib/server/rate-limit";
import { awardXP, grantAchievement, withProgress } from "@/lib/server/progression";
import { buildRounds, grade, maxScoreOf, type AttemptState } from "@/lib/server/games";
import { rankedBest } from "@/lib/server/event";
import { dayKey, grantPack } from "@/lib/server/cards";
import { track } from "@/lib/server/telemetry";
import { isRanked, RANKED_GAMES, scoreRankedRun } from "@/lib/config/game";
import { safeAction, UserError } from "@/lib/server/action";
import type { AnswerResult, RankedInfo, StartResult } from "@/lib/games/types";
import type { Prisma } from "@/generated/prisma/client";

const COMPLETION_ACHIEVEMENTS: Record<string, string> = {
  "fork-detective": "fork-detective",
  "core-dev-insider": "governance-insider",
};

export async function startMission(slug: string) {
  return safeAction<StartResult>(async () => {
    const player = await requirePlayer();
    await assertRateLimit(`start:${player.id}`, 30, 60);
    const mission = await db.mission.findUnique({ where: { slug } });
    if (!mission || !mission.isActive) throw new UserError("This mission isn't available right now.");
    const config = (mission.config ?? {}) as Record<string, unknown>;
    const timerSeconds = typeof config.timerSeconds === "number" ? config.timerSeconds : null;
    const recent = await db.missionAttempt.findMany({
      where: { playerId: player.id, missionId: mission.id }, orderBy: { startedAt: "desc" }, take: 12, select: { id: true, status: true, state: true, startedAt: true },
    });

    let ranked: RankedInfo | undefined;
    if (isRanked(slug)) {
      const g = RANKED_GAMES[slug];
      ranked = { best: await rankedBest(db, player.id, slug), max: g.base + g.perfect + g.speed };
      // A refresh before answering anything resumes the same draw (and its clock) instead of dealing new questions.
      const open = recent.find((a) => a.status === "ACTIVE" && Date.now() - a.startedAt.getTime() < 15 * 60_000);
      const openState = open?.state as unknown as AttemptState | undefined;
      if (open && openState && openState.answers.every((a) => a === null)) {
        return {
          attemptId: open.id, mission: { slug, title: mission.title, world: mission.world }, difficulty: player.difficulty,
          rounds: openState.rounds.map((r) => r.pub), timerSeconds, ranked,
        };
      }
    }

    // Rotate questions: skip anything this player saw in recent runs.
    const seen = new Set(
      recent.flatMap((a) => ((a.state as unknown as AttemptState)?.rounds ?? []).map((r) => ("qid" in r ? r.qid : undefined)).filter((q): q is string => !!q)),
    );
    const rounds = await buildRounds(slug, player.difficulty, config, seen);
    if (!rounds.length) throw new UserError("Couldn't build this game right now. Try another one!");

    // Abandon any open attempt for this mission so only one round set is live at a time.
    await db.missionAttempt.updateMany({ where: { playerId: player.id, missionId: mission.id, status: "ACTIVE" }, data: { status: "ABANDONED" } });
    const state: AttemptState = { rounds, answers: rounds.map(() => null), hints: rounds.map(() => false), startedAt: Date.now(), ranked: !!ranked };
    const attempt = await db.missionAttempt.create({
      data: { playerId: player.id, missionId: mission.id, difficulty: player.difficulty, state: state as unknown as Prisma.InputJsonValue, maxScore: maxScoreOf(rounds) },
    });
    await track("mission_start", player.id, { mission: slug, difficulty: player.difficulty, ranked: !!ranked });
    return {
      attemptId: attempt.id,
      mission: { slug, title: mission.title, world: mission.world },
      difficulty: player.difficulty,
      rounds: rounds.map((r) => r.pub),
      timerSeconds,
      ranked,
    };
  });
}

const hintSchema = z.object({ attemptId: z.string().min(1).max(40), index: z.number().int().min(0).max(20) });

export async function requestHint(input: z.infer<typeof hintSchema>) {
  return safeAction<{ hint: string }>(async () => {
    const { attemptId, index } = hintSchema.parse(input);
    const player = await requirePlayer();
    const attempt = await db.missionAttempt.findFirst({ where: { id: attemptId, playerId: player.id, status: "ACTIVE" } });
    if (!attempt) throw new UserError("This game has ended.");
    const state = attempt.state as unknown as AttemptState;
    const round = state.rounds[index];
    if (!round || round.kind !== "choice" || !round.hint) throw new UserError("No hint for this one.");
    if (!state.hints[index]) {
      state.hints[index] = true;
      await db.missionAttempt.update({ where: { id: attempt.id }, data: { state: state as unknown as Prisma.InputJsonValue, hintsUsed: { increment: 1 } } });
      await track("hint_used", player.id, { attemptId, index });
    }
    return { hint: round.hint };
  });
}

const answerSchema = z.object({
  attemptId: z.string().min(1).max(40),
  index: z.number().int().min(0).max(20),
  payload: z.union([
    z.object({ optionId: z.string().max(60).nullable() }),
    z.object({ pairs: z.record(z.string().max(20), z.string().max(20)) }),
    z.object({ order: z.array(z.string().max(20)).max(30) }),
  ]),
});

export async function submitAnswer(input: z.infer<typeof answerSchema>) {
  return safeAction<AnswerResult>(async () => {
    const { attemptId, index, payload } = answerSchema.parse(input);
    const player = await requirePlayer();
    await assertRateLimit(`answer:${player.id}`, 60, 60);
    const { result, gains } = await withProgress(player, async (tx, gains) => {
      // Row lock: concurrent double-taps on the same attempt are serialized here.
      await tx.$queryRaw`SELECT id FROM "MissionAttempt" WHERE id = ${attemptId} FOR UPDATE`;
      const attempt = await tx.missionAttempt.findFirst({ where: { id: attemptId, playerId: player.id }, include: { mission: true } });
      if (!attempt) throw new UserError("Game not found.");
      const state = attempt.state as unknown as AttemptState;
      const round = state.rounds[index];
      if (!round) throw new UserError("Invalid round.");
      const slug = attempt.mission.slug;
      const g = grade(round, payload);

      // Already answered (refresh / double tap): return the same reveal, award nothing.
      if (state.answers[index] || attempt.status !== "ACTIVE") {
        return { reveal: g.reveal, done: attempt.status === "COMPLETED", summary: undefined as AnswerResult["summary"] };
      }

      state.answers[index] = { correct: g.correct, points: g.points, hint: state.hints[index], payload };

      const done = state.answers.every(Boolean);
      const score = state.answers.reduce((s, a) => s + (a?.points ?? 0), 0);
      await tx.missionAttempt.update({
        where: { id: attemptId },
        data: {
          state: state as unknown as Prisma.InputJsonValue,
          score,
          ...(done ? { status: "COMPLETED", completedAt: new Date() } : {}),
        },
      });

      let summary: AnswerResult["summary"];
      if (done) {
        const perfect = score === attempt.maxScore;
        summary = { score, maxScore: attempt.maxScore, perfect };
        if (isRanked(slug)) {
          // Only the best run counts: credit the improvement over the previous best, nothing otherwise.
          const seconds = (Date.now() - state.startedAt) / 1000;
          const run = scoreRankedRun(slug, { points: score, maxPoints: attempt.maxScore, hints: state.hints.filter(Boolean).length, seconds });
          let best = await rankedBest(tx, player.id, slug);
          let improvedBy = 0;
          if (state.ranked && run.total > best) {
            const r = await awardXP(tx, player.id, run.total - best, `${slug}:ranked`, `rk:${slug}:${attemptId}`, { attemptId });
            improvedBy = r.awarded;
            best += r.awarded;
            gains.xp += r.awarded;
          }
          summary.ranked = { ...run, best, improvedBy, seconds: Math.round(seconds) };
          // One booster pack per ranked game per day.
          if (await grantPack(tx, player.id, `run:${slug}:${dayKey()}`, `${attempt.mission.title} run`)) gains.packs++;
        } else {
          // Side quest: a one-time reward. Replays are for fun only.
          const r = await awardXP(tx, player.id, attempt.mission.xpComplete, `${slug}:complete`, `sq:${slug}`, { attemptId });
          gains.xp += r.awarded;
          if (await grantPack(tx, player.id, `sq:${slug}`, `${attempt.mission.title} cleared`)) gains.packs++;
        }
        if (COMPLETION_ACHIEVEMENTS[slug]) await grantAchievement(tx, player.id, COMPLETION_ACHIEVEMENTS[slug], gains);
        if (attempt.difficulty === "NERD") await grantAchievement(tx, player.id, "protocol-nerd", gains);
        if (perfect && slug === "guess-that-eip") await grantAchievement(tx, player.id, "perfect-round", gains);
        if (perfect && slug === "timeline-rebuild") await grantAchievement(tx, player.id, "timeline-master", gains);
        if (perfect && slug === "spot-the-fake") await grantAchievement(tx, player.id, "fake-buster", gains);
      }
      return { reveal: g.reveal, done, summary };
    });

    // Crowd predictions: share of players choosing each option (after recording this vote).
    if (result.reveal.kind === "predict" && "optionId" in payload) {
      // Written synchronously (not via after()) so this vote is included in the crowd share below.
      await db.event.create({ data: { name: "prediction", playerId: player.id, props: { attemptId, index, optionId: payload.optionId } } });
      const rows = await db.$queryRaw<{ option: string; n: bigint }[]>`
        SELECT props->>'optionId' AS option, COUNT(*) AS n FROM "Event"
        WHERE name = 'prediction' AND (props->>'index')::int = ${index}
        GROUP BY 1`;
      const total = rows.reduce((s, r) => s + Number(r.n), 0) || 1;
      const share = new Map(rows.map((r) => [r.option, Math.round((Number(r.n) / total) * 100)]));
      const attempt = await db.missionAttempt.findUnique({ where: { id: attemptId } });
      const round = (attempt!.state as unknown as AttemptState).rounds[index];
      const options = round.pub.kind === "predict" ? round.pub.options : [];
      result.reveal = {
        ...result.reveal,
        statuses: options.map((o) => {
          const s = result.reveal.kind === "predict" ? result.reveal.statuses.find((x) => x.id === o.id) : undefined;
          return { id: o.id, label: o.label, status: s?.status ?? "", note: s?.note ?? "", share: share.get(o.id) ?? 0 };
        }),
      };
    }

    await track("answer", player.id, { attemptId, index, correct: result.reveal.kind === "choice" ? result.reveal.correct : undefined, kind: result.reveal.kind });
    if (result.done && result.summary) await track("mission_complete", player.id, { attemptId, ...result.summary });
    return { ...result, gains };
  });
}
