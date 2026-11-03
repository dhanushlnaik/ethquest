import "server-only";
import { db } from "./db";
import { getEventConfig, rankedBests, rankedRunsToday, scoringOpen } from "./event";
import { rankOf } from "./leaderboard";
import { HOODIE_REWARD, RANKED_GAMES, TSHIRT_REWARD, WELCOME_REWARD, type RankedSlug } from "@/lib/config/game";

export type RewardState = "collected" | "ready" | "locked" | "soldout";

/** Everything the three-tier journey (home, rewards) needs for one player, in one round of parallel queries. */
export async function getJourney(player: { id: string; xpTotal: number }) {
  const cfg = await getEventConfig();
  const slugs = Object.keys(RANKED_GAMES) as RankedSlug[];
  const [rewards, claims, bests, rank, missions] = await Promise.all([
    db.reward.findMany({ where: { slug: { in: [WELCOME_REWARD, TSHIRT_REWARD, HOODIE_REWARD] } } }),
    db.rewardClaim.findMany({ where: { playerId: player.id, status: "REDEEMED" }, select: { rewardId: true } }),
    rankedBests(player.id),
    rankOf(player.id, player.xpTotal),
    db.mission.findMany({ where: { slug: { in: slugs } }, select: { id: true, slug: true } }),
  ]);
  const runs = await Promise.all(missions.map(async (m) => [m.slug, await rankedRunsToday(player.id, m.id)] as const));
  const runsToday = Object.fromEntries(runs) as Record<string, number>;
  const collected = new Set(claims.map((c) => c.rewardId));
  const bySlug = new Map(rewards.map((r) => [r.slug, r]));

  const state = (slug: string, eligible: boolean): RewardState => {
    const r = bySlug.get(slug);
    if (!r) return "locked";
    if (collected.has(r.id)) return "collected";
    if (!eligible) return "locked";
    return r.stock > 0 && r.isActive ? "ready" : "soldout";
  };

  return {
    cfg,
    open: scoringOpen(cfg),
    rank,
    welcome: { reward: bySlug.get(WELCOME_REWARD) ?? null, state: state(WELCOME_REWARD, true) },
    tshirt: { reward: bySlug.get(TSHIRT_REWARD) ?? null, state: state(TSHIRT_REWARD, player.xpTotal >= cfg.tshirtXp), need: cfg.tshirtXp },
    hoodie: { reward: bySlug.get(HOODIE_REWARD) ?? null, state: state(HOODIE_REWARD, cfg.championPlayerId === player.id) },
    games: slugs.map((slug) => {
      const g = RANKED_GAMES[slug];
      return { slug, ...g, max: g.base + g.perfect + g.speed, best: bests[slug] ?? 0, runsLeft: Math.max(0, cfg.rankedRunsPerDay - (runsToday[slug] ?? 0)) };
    }),
    sideXp: player.xpTotal - Object.values(bests).reduce((s, n) => s + n, 0),
  };
}
