import "server-only";
import { db, type Tx } from "./db";
import { DEFAULT_XP, LEVELS, levelFor, type XPConfig } from "@/lib/config/game";
import { grantPack } from "./cards";

// Small in-process caches: XP settings and the achievement catalog change rarely (admin edits bust them).
let xpCache: { at: number; value: XPConfig } | null = null;
let achCache: { at: number; bySlug: Map<string, { id: string; name: string; icon: string; description: string; xpBonus: number }> } | null = null;
const TTL = 30_000;

export async function getXPConfig(): Promise<XPConfig> {
  if (xpCache && Date.now() - xpCache.at < TTL) return xpCache.value;
  const row = await db.setting.findUnique({ where: { key: "xp" } });
  const value = { ...DEFAULT_XP, ...((row?.value as Partial<XPConfig>) ?? {}) };
  xpCache = { at: Date.now(), value };
  return value;
}

async function achievementBySlug(tx: Tx, slug: string) {
  if (!achCache || Date.now() - achCache.at > TTL) {
    // Use the transaction's own connection: grabbing a second pool connection inside a
    // transaction can deadlock when every connection is held by waiting transactions.
    const all = await tx.achievement.findMany();
    achCache = { at: Date.now(), bySlug: new Map(all.map((a) => [a.slug, a])) };
  }
  return achCache.bySlug.get(slug) ?? null;
}

export function bustProgressionCaches() {
  xpCache = null;
  achCache = null;
}

export type Gains = {
  xp: number;
  levelUp: { level: number; name: string } | null;
  achievements: { slug: string; name: string; icon: string; description: string }[];
  /** XP that was not awarded because of anti-farming caps. */
  capped: boolean;
  /** Booster packs earned by this action. */
  packs: number;
};

export const emptyGains = (): Gains => ({ xp: 0, levelUp: null, achievements: [], capped: false, packs: 0 });

/**
 * Appends to the XP ledger. The (playerId, idempotencyKey) unique index makes every award
 * happen at most once, so replays, refreshes and double-taps can never double-count.
 * Returns the amount actually awarded (0 if the key was already used).
 */
export async function awardXP(
  tx: Tx,
  playerId: string,
  amount: number,
  reason: string,
  idempotencyKey: string,
  opts: { attemptId?: string; createdBy?: string; dailyCapKeyPrefix?: string; dailyCap?: number } = {},
): Promise<{ awarded: number; capped: boolean }> {
  if (amount === 0) return { awarded: 0, capped: false };
  let grant = amount;
  let capped = false;
  if (opts.dailyCapKeyPrefix && opts.dailyCap != null && amount > 0) {
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    const agg = await tx.xPTransaction.aggregate({
      _sum: { amount: true },
      where: { playerId, idempotencyKey: { startsWith: opts.dailyCapKeyPrefix }, createdAt: { gte: since } },
    });
    const room = opts.dailyCap - (agg._sum.amount ?? 0);
    if (room <= 0) return { awarded: 0, capped: true };
    if (grant > room) {
      grant = room;
      capped = true;
    }
  }
  const inserted = await tx.xPTransaction.createMany({
    data: [{ playerId, amount: grant, reason, idempotencyKey, attemptId: opts.attemptId, createdBy: opts.createdBy }],
    skipDuplicates: true,
  });
  if (inserted.count === 0) return { awarded: 0, capped };
  await tx.player.update({ where: { id: playerId }, data: { xpTotal: { increment: grant } } });
  return { awarded: grant, capped };
}

/** Idempotent achievement grant; also awards the achievement's XP bonus. */
export async function grantAchievement(tx: Tx, playerId: string, slug: string, gains: Gains, grantedBy?: string) {
  const achievement = await achievementBySlug(tx, slug);
  if (!achievement) return;
  const created = await tx.playerAchievement.createMany({
    data: [{ playerId, achievementId: achievement.id, grantedBy }],
    skipDuplicates: true,
  });
  if (created.count === 0) return;
  gains.achievements.push({ slug, name: achievement.name, icon: achievement.icon, description: achievement.description });
  if (achievement.xpBonus > 0) {
    const { awarded } = await awardXP(tx, playerId, achievement.xpBonus, `achievement:${slug}`, `ach:${slug}`, { createdBy: grantedBy });
    gains.xp += awarded;
  }
}

/** Recomputes level from the (already updated) xpTotal and unlocks level-based achievements. */
export async function settleLevel(tx: Tx, playerId: string, gains: Gains) {
  const player = await tx.player.findUniqueOrThrow({ where: { id: playerId }, select: { xpTotal: true, level: true } });
  const lvl = levelFor(player.xpTotal);
  if (lvl.level !== player.level) {
    await tx.player.update({ where: { id: playerId }, data: { level: lvl.level } });
    if (lvl.level > player.level) {
      gains.levelUp = { level: lvl.level, name: lvl.name };
      if (await grantPack(tx, playerId, `level:${lvl.level}`, `Reached level ${lvl.level}`)) gains.packs++;
    }
  }
  if (lvl.level >= LEVELS[LEVELS.length - 1].level) await grantAchievement(tx, playerId, "champion", gains);
}

/**
 * Runs fn in a transaction with a Gains accumulator, then settles level.
 * Pass the player's XP before the action so "First Steps" is only checked for brand-new players.
 */
export async function withProgress<T>(player: { id: string; xpTotal: number }, fn: (tx: Tx, gains: Gains) => Promise<T>) {
  const playerId = player.id;
  return db.$transaction(
    async (tx) => {
      const gains = emptyGains();
      const result = await fn(tx, gains);
      if (gains.xp > 0 || gains.achievements.length) {
        if (player.xpTotal === 0) await grantAchievement(tx, playerId, "first-steps", gains);
        await settleLevel(tx, playerId, gains);
      }
      return { result, gains };
    },
    { timeout: 20_000, maxWait: 10_000 },
  );
}
