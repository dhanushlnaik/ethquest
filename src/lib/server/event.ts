import "server-only";
import { connection } from "next/server";
import { db, type Tx } from "./db";
import { EVENT_TZ, RANKED_GAMES, type RankedSlug } from "@/lib/config/game";

/** Start of the current day in Mumbai, as a UTC Date (daily leaderboard, daily rewards). */
export function eventDayStart(now = new Date()) {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: EVENT_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  return new Date(`${ymd}T00:00:00+05:30`);
}

/** Current credited best for a ranked game = sum of its improvement rows in the XP ledger. */
export async function rankedBest(tx: Tx | typeof db, playerId: string, slug: string) {
  const agg = await tx.xPTransaction.aggregate({ _sum: { amount: true }, where: { playerId, idempotencyKey: { startsWith: `rk:${slug}:` } } });
  return agg._sum.amount ?? 0;
}

export async function rankedBests(playerId: string) {
  const rows = await db.xPTransaction.findMany({ where: { playerId, idempotencyKey: { startsWith: "rk:" } }, select: { idempotencyKey: true, amount: true } });
  const best: Record<string, number> = {};
  for (const r of rows) {
    const slug = r.idempotencyKey.split(":")[1];
    best[slug] = (best[slug] ?? 0) + r.amount;
  }
  return best;
}

/** What the start screen of a ranked game shows. */
export async function rankedPreview(playerId: string, slug: RankedSlug) {
  await connection(); // render path: reads the clock, so never prerender
  const mission = await db.mission.findUnique({ where: { slug }, select: { id: true } });
  const [best, open] = await Promise.all([
    rankedBest(db, playerId, slug),
    // Mirrors startMission: an unanswered run from the last 15 minutes is resumed, not replaced.
    mission
      ? db.missionAttempt.findFirst({
          where: { playerId, missionId: mission.id, status: "ACTIVE", startedAt: { gte: new Date(Date.now() - 15 * 60_000) } },
          select: { state: true },
        })
      : null,
  ]);
  const resumable = !!open && ((open.state as { answers?: unknown[] }).answers ?? []).every((a) => a === null);
  const g = RANKED_GAMES[slug];
  return { resumable, best, max: g.base + g.perfect + g.speed, base: g.base, perfect: g.perfect, speed: g.speed, targetSeconds: g.targetSeconds };
}
export type RankedPreview = Awaited<ReturnType<typeof rankedPreview>>;
