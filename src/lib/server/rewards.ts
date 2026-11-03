import "server-only";
import { db } from "./db";
import { randomToken, sha256, shortCode } from "./crypto";
import { emptyGains, grantAchievement, settleLevel } from "./progression";
import { audit, track } from "./telemetry";
import { UserError } from "./action";
import { getEventConfig } from "./event";
import { HOODIE_REWARD, TSHIRT_REWARD } from "@/lib/config/game";

const CLAIM_MINUTES = 30;

/** Issues (or re-issues) a single-use claim token for a reward the player has earned. */
export async function issueClaim(playerId: string, rewardSlug: string) {
  const cfg = await getEventConfig();
  return db.$transaction(async (tx) => {
    // Serialize claim issuance per player.
    await tx.$queryRaw`SELECT id FROM "Player" WHERE id = ${playerId} FOR UPDATE`;
    const player = await tx.player.findUniqueOrThrow({ where: { id: playerId } });
    const reward = await tx.reward.findUnique({ where: { slug: rewardSlug } });
    if (!reward || !reward.isActive) throw new UserError("This reward isn't available.");
    if (reward.slug === HOODIE_REWARD) {
      if (cfg.championPlayerId !== playerId) throw new UserError("The hoodie goes to the Protocol Champion, announced at the booth.");
    } else {
      const need = reward.slug === TSHIRT_REWARD ? cfg.tshirtXp : reward.xpRequired;
      if (player.xpTotal < need) throw new UserError(`You need ${need} XP for this reward.`);
    }
    if (reward.stock <= 0) throw new UserError("This reward just ran out. Ask the booth team about alternatives!");

    const token = randomToken(24);
    const code = shortCode(6);
    const expiresAt = new Date(Date.now() + CLAIM_MINUTES * 60_000);
    const existing = await tx.rewardClaim.findFirst({ where: { playerId, rewardId: reward.id, status: { not: "VOID" } } });
    if (existing?.status === "REDEEMED") throw new UserError("You've already collected this reward.");
    const claim = existing
      ? await tx.rewardClaim.update({ where: { id: existing.id }, data: { tokenHash: sha256(token), shortCode: code, expiresAt } })
      : await tx.rewardClaim.create({ data: { playerId, rewardId: reward.id, tokenHash: sha256(token), shortCode: code, expiresAt } });
    return { claimId: claim.id, token, shortCode: code, expiresAt, reward: { name: reward.name, icon: reward.icon } };
  }, { timeout: 15_000, maxWait: 10_000 });
}

function findClaimWhere(tokenOrCode: string) {
  const v = tokenOrCode.trim();
  const code = v.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return code.length === 6 ? { shortCode: code } : { tokenHash: sha256(v) };
}

/** Volunteer preview before confirming a redemption. */
export async function previewClaim(tokenOrCode: string) {
  const claim = await db.rewardClaim.findFirst({
    where: findClaimWhere(tokenOrCode),
    include: { reward: true, player: { select: { nickname: true, avatar: true, xpTotal: true, level: true } } },
  });
  if (!claim) return { ok: false as const, reason: "No claim found for this code." };
  const expired = claim.expiresAt < new Date();
  return {
    ok: true as const,
    claimId: claim.id,
    status: claim.status,
    expired,
    redeemedAt: claim.redeemedAt,
    reward: { name: claim.reward.name, icon: claim.reward.icon, stock: claim.reward.stock },
    player: claim.player,
  };
}

/**
 * Atomic redemption: the claim flips ISSUED→REDEEMED and stock decrements by exactly one, or nothing happens.
 * Both updates are conditional, so concurrent scans of the same token can never double-redeem,
 * and the CHECK (stock >= 0) constraint is the final backstop.
 */
export async function redeemClaim(claimId: string, adminId: string) {
  const outcome = await db.$transaction(async (tx) => {
    const claim = await tx.rewardClaim.findUnique({ where: { id: claimId } });
    if (!claim) throw new UserError("Claim not found.");
    const flipped = await tx.rewardClaim.updateMany({
      where: { id: claimId, status: "ISSUED", expiresAt: { gt: new Date() } },
      data: { status: "REDEEMED", redeemedAt: new Date(), redeemedBy: adminId },
    });
    if (flipped.count !== 1) {
      throw new UserError(claim.status === "REDEEMED" ? "Already redeemed. Do not hand out again." : "This claim has expired. Ask the player to refresh their QR.");
    }
    const decremented = await tx.reward.updateMany({ where: { id: claim.rewardId, stock: { gt: 0 } }, data: { stock: { decrement: 1 } } });
    if (decremented.count !== 1) throw new UserError("Out of stock. Nothing was redeemed.");
    const gains = emptyGains();
    await grantAchievement(tx, claim.playerId, "devcon-og", gains, adminId);
    await settleLevel(tx, claim.playerId, gains);
    return claim;
  }, { timeout: 20_000, maxWait: 15_000 });
  await audit("admin", adminId, "reward.redeem", outcome.id, { rewardId: outcome.rewardId, playerId: outcome.playerId });
  await track("reward_redeemed", outcome.playerId, { rewardId: outcome.rewardId });
  return outcome;
}
