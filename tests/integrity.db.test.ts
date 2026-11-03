// Integration tests against the real ethquest schema. Creates throwaway rows and removes them.
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/server/db";
import { awardXP } from "@/lib/server/progression";

const tag = `test-${Date.now().toString(36)}`;
let playerId = "";

beforeAll(async () => {
  const p = await db.player.create({ data: { nickname: `${tag}-p`, xpTotal: 100 } });
  playerId = p.id;
});

afterAll(async () => {
  await db.player.deleteMany({ where: { id: playerId } });
  await db.$disconnect();
});

describe("xp ledger", () => {
  it("awards an idempotency key exactly once, even concurrently", async () => {
    const before = (await db.player.findUniqueOrThrow({ where: { id: playerId } })).xpTotal;
    await Promise.allSettled(Array.from({ length: 8 }, () => db.$transaction((tx) => awardXP(tx, playerId, 5, "test", `${tag}:once`))));
    const after = (await db.player.findUniqueOrThrow({ where: { id: playerId } })).xpTotal;
    expect(after - before).toBe(5);
    const rows = await db.xPTransaction.count({ where: { playerId, idempotencyKey: `${tag}:once` } });
    expect(rows).toBe(1);
  });

  it("ledger rows are immutable", async () => {
    const row = await db.xPTransaction.findFirstOrThrow({ where: { playerId } });
    await expect(db.xPTransaction.update({ where: { id: row.id }, data: { amount: 999 } })).rejects.toThrow();
  });
});
