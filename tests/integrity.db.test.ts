// Integration tests against the real ethquest schema. Creates throwaway rows and removes them.
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/server/db";
import { issueClaim, redeemClaim } from "@/lib/server/rewards";
import { awardXP } from "@/lib/server/progression";

const tag = `test-${Date.now().toString(36)}`;
let playerId = "";
let rewardId = "";
let adminId = "";

beforeAll(async () => {
  const p = await db.player.create({ data: { nickname: `${tag}-p`, xpTotal: 100 } });
  const r = await db.reward.create({ data: { slug: `${tag}-r`, name: "Test reward", description: "", icon: "pin", xpRequired: 10, stock: 1, initialStock: 1, isActive: true } });
  const a = await db.adminUser.create({ data: { email: `${tag}@example.test`, name: "Test", role: "VOLUNTEER", passwordHash: "x" } });
  playerId = p.id;
  rewardId = r.id;
  adminId = a.id;
});

afterAll(async () => {
  await db.rewardClaim.deleteMany({ where: { rewardId } });
  await db.reward.deleteMany({ where: { id: rewardId } });
  await db.player.deleteMany({ where: { id: playerId } });
  await db.auditLog.deleteMany({ where: { actorId: adminId } });
  await db.adminUser.deleteMany({ where: { id: adminId } });
  await db.$disconnect();
});

describe("redemption", () => {
  it("is single-use under concurrent scans and never drives stock negative", async () => {
    const claim = await issueClaim(playerId, `${tag}-r`);
    const row = await db.rewardClaim.findFirstOrThrow({ where: { playerId, rewardId } });
    expect(claim.shortCode).toHaveLength(6);
    const results = await Promise.allSettled(Array.from({ length: 12 }, () => redeemClaim(row.id, adminId)));
    const reasons = results.filter((r) => r.status === "rejected").map((r) => String((r as PromiseRejectedResult).reason?.message ?? r).slice(0, 120));
    expect(results.filter((r) => r.status === "fulfilled"), [...new Set(reasons)].join(" | ")).toHaveLength(1);
    const reward = await db.reward.findUniqueOrThrow({ where: { id: rewardId } });
    expect(reward.stock).toBe(0);
    await expect(issueClaim(playerId, `${tag}-r`)).rejects.toThrow(/already collected|ran out/);
  });

  it("database rejects negative stock even if app logic is bypassed", async () => {
    await expect(db.reward.update({ where: { id: rewardId }, data: { stock: -1 } })).rejects.toThrow();
  });
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
