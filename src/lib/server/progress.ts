import "server-only";
import { db } from "./db";

/** Which missions a player has completed at least once (any difficulty). */
export async function completedMissions(playerId: string) {
  const [attempts, keys] = await Promise.all([
    db.missionAttempt.findMany({ where: { playerId, status: "COMPLETED" }, select: { mission: { select: { slug: true } } }, distinct: ["missionId"] }),
    db.xPTransaction.findMany({
      where: { playerId, OR: [{ idempotencyKey: { startsWith: "eip:find:" } }, { idempotencyKey: { startsWith: "hunt:" } }, { idempotencyKey: { in: ["pathfinder:complete", "dna:complete"] } }] },
      select: { idempotencyKey: true },
    }),
  ]);
  const done = new Set(attempts.map((a) => a.mission.slug));
  for (const { idempotencyKey: k } of keys) {
    if (k.startsWith("eip:find:")) done.add("find-your-eip");
    else if (k.startsWith("hunt:")) done.add("eip-hunt");
    else if (k === "pathfinder:complete") done.add("pathfinder");
    else if (k === "dna:complete") done.add("builder-dna");
  }
  return done;
}

export async function missionsByWorld() {
  const missions = await db.mission.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
  const map = new Map<string, typeof missions>();
  for (const m of missions) map.set(m.world, [...(map.get(m.world) ?? []), m]);
  return map;
}
