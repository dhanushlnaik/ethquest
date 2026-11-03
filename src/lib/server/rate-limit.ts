import "server-only";
import { db } from "./db";

/**
 * Fixed-window counter in Postgres (no Redis). Returns true when the call is allowed.
 * key should identify the actor + action, e.g. `answer:${playerId}`.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number) {
  const windowMs = windowSeconds * 1000;
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "windowStart", "count") VALUES (${key}, ${windowStart}, 1)
    ON CONFLICT ("key", "windowStart") DO UPDATE SET "count" = "RateLimit"."count" + 1
    RETURNING "count"`;
  // Opportunistic cleanup of stale windows (~1% of calls).
  if (Math.random() < 0.01) {
    await db.rateLimit.deleteMany({ where: { windowStart: { lt: new Date(Date.now() - 3_600_000) } } });
  }
  return (rows[0]?.count ?? 0) <= limit;
}

export class RateLimitError extends Error {
  constructor() {
    super("Slow down a little — too many requests.");
  }
}

export async function assertRateLimit(key: string, limit: number, windowSeconds: number) {
  if (!(await rateLimit(key, limit, windowSeconds))) throw new RateLimitError();
}
