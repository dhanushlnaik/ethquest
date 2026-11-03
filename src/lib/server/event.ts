import "server-only";
import { db, type Tx } from "./db";
import { DEFAULT_EVENT, EVENT_TZ, type EventConfig } from "@/lib/config/game";

let cache: { at: number; value: EventConfig } | null = null;

/** Booth event rules (T-shirt threshold, ranked run cap, scoring close time, declared champion). */
export async function getEventConfig(): Promise<EventConfig> {
  if (cache && Date.now() - cache.at < 15_000) return cache.value;
  const row = await db.setting.findUnique({ where: { key: "event" } });
  const value = { ...DEFAULT_EVENT, ...((row?.value as Partial<EventConfig>) ?? {}) };
  cache = { at: Date.now(), value };
  return value;
}
export const bustEventCache = () => void (cache = null);

export const scoringOpen = (cfg: EventConfig, now = new Date()) => now < new Date(cfg.leaderboardClosesAt);

/** Start of the current booth day (midnight in Mumbai), as a UTC Date. */
export function eventDayStart(now = new Date()) {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: EVENT_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  return new Date(`${ymd}T00:00:00+05:30`);
}

/** Ranked runs started today for one game. Starting counts, so abandoning a bad draw doesn't refund the run. */
export async function rankedRunsToday(playerId: string, missionId: string) {
  return db.missionAttempt.count({
    where: { playerId, missionId, startedAt: { gte: eventDayStart() }, state: { path: ["ranked"], equals: true } },
  });
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
