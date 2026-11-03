import "server-only";
import { connection } from "next/server";
import { db } from "./db";
import { eventDayStart } from "./event";

export type BoardRow = { id: string; nickname: string; avatar: string; level: number; xp: number; rank: number; tied: boolean };

/** Competition ranking: equal XP shares a rank (1, 2, 2, 4). */
function ranked<T extends { xp: number }>(rows: T[]): (T & { rank: number; tied: boolean })[] {
  let rank = 0;
  return rows.map((r, i) => {
    if (i === 0 || r.xp !== rows[i - 1].xp) rank = i + 1;
    const tied = rows[i - 1]?.xp === r.xp || rows[i + 1]?.xp === r.xp;
    return { ...r, rank, tied };
  });
}

/** All-time board: every valid XP counts, nothing resets. */
export async function topPlayers(limit = 50): Promise<BoardRow[]> {
  const rows = await db.player.findMany({
    where: { isBanned: false, xpTotal: { gt: 0 } },
    orderBy: [{ xpTotal: "desc" }, { createdAt: "asc" }],
    take: limit + 1, // one extra so a tie at the cut-off is still flagged
    select: { id: true, nickname: true, avatar: true, xpTotal: true, level: true },
  });
  return ranked(rows.map(({ xpTotal, ...p }) => ({ ...p, xp: xpTotal }))).slice(0, limit);
}

/** Today's board (Mumbai time): XP earned since midnight. Just for bragging rights. */
export async function dailyTop(limit = 50): Promise<BoardRow[]> {
  await connection();
  const since = eventDayStart();
  const rows = await db.$queryRaw<{ id: string; nickname: string; avatar: string; level: number; xp: number }[]>`
    SELECT p.id, p.nickname, p.avatar, p.level, SUM(x.amount)::int AS xp
      FROM "XPTransaction" x JOIN "Player" p ON p.id = x."playerId"
     WHERE x."createdAt" >= ${since} AND NOT p."isBanned"
     GROUP BY p.id
    HAVING SUM(x.amount) > 0
     ORDER BY xp DESC, MAX(x."createdAt") ASC
     LIMIT ${limit + 1}`;
  return ranked(rows).slice(0, limit);
}

export async function rankOf(playerId: string, xp: number) {
  if (xp <= 0) return null;
  const ahead = await db.player.count({ where: { isBanned: false, xpTotal: { gt: xp } } });
  return ahead + 1;
}

export async function eventStats() {
  const [players, xp, games] = await Promise.all([
    db.player.count(),
    db.player.aggregate({ _sum: { xpTotal: true } }),
    db.missionAttempt.count({ where: { status: "COMPLETED" } }),
  ]);
  return { players, xp: xp._sum.xpTotal ?? 0, games };
}
