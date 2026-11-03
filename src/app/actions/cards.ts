"use server";

import { z } from "zod";
import QRCode from "qrcode";
import { randomInt } from "node:crypto";
import { refresh } from "next/cache";
import { db } from "@/lib/server/db";
import { requirePlayer } from "@/lib/server/session";
import { assertRateLimit } from "@/lib/server/rate-limit";
import { dayKey, getCatalog, grantPack, openPack, toView } from "@/lib/server/cards";
import { grantAchievement, withProgress } from "@/lib/server/progression";
import { track } from "@/lib/server/telemetry";
import { safeAction, UserError } from "@/lib/server/action";
import { SITE_URL } from "@/lib/site";
import type { CardView } from "@/lib/cards/types";
import type { GainsDTO } from "@/lib/games/types";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const code6 = () => Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
const qr = (url: string) => QRCode.toString(url, { type: "svg", margin: 1, color: { dark: "#2a1d12", light: "#fff8e8" } });

export async function openPackAction(packId: string) {
  return safeAction<{ cards: CardView[]; completedSets: string[]; gains: GainsDTO }>(async () => {
    const player = await requirePlayer();
    await assertRateLimit(`pack:${player.id}`, 30, 60);
    const setsBefore = await completeSets(player.id);
    const { cards, newOnes } = await openPack(player.id, z.string().max(40).parse(packId));
    const cat = await getCatalog();
    const setsAfter = await completeSets(player.id);
    const completedSets = [...setsAfter.keys()].filter((s) => !setsBefore.has(s));
    const { gains } = await withProgress(player, async (tx, g) => {
      await grantAchievement(tx, player.id, "pack-opener", g);
      if (cards.some((n) => cat.byNumber.get(n)?.rarity === "LEGENDARY")) await grantAchievement(tx, player.id, "legendary-pull", g);
      if (completedSets.length) await grantAchievement(tx, player.id, "set-collector", g);
    });
    await track("pack_opened", player.id, { cards, newOnes: newOnes.length });
    refresh();
    const counts = new Map((await db.playerCard.findMany({ where: { playerId: player.id, number: { in: cards } } })).map((c) => [c.number, c.count]));
    return {
      cards: cards.map((n) => toView(cat.byNumber.get(n)!, { count: counts.get(n) ?? 1, isNew: newOnes.includes(n) })),
      completedSets: completedSets.map((s) => setsAfter.get(s)!),
      gains,
    };
  });
}

async function completeSets(playerId: string) {
  const [sets, owned] = await Promise.all([
    db.cardSet.findMany({ include: { members: { select: { number: true } } } }),
    db.playerCard.findMany({ where: { playerId }, select: { number: true } }),
  ]);
  const have = new Set(owned.map((o) => o.number));
  return new Map(sets.filter((s) => s.members.every((m) => have.has(m.number))).map((s) => [s.slug, s.name]));
}

/** One free pack per day (Mumbai time). */
export async function claimDailyPack() {
  return safeAction<{ granted: boolean }>(async () => {
    const player = await requirePlayer();
    const granted = await grantPack(db, player.id, `daily:${dayKey()}`, "Daily pack");
    refresh();
    return { granted };
  });
}

// ---------------- Gifts (trade by QR) ----------------

/** Reserves one duplicate and returns a QR anyone can scan to claim it (24h). */
export async function createGift(number: number) {
  return safeAction<{ code: string; url: string; qrSvg: string }>(async () => {
    const player = await requirePlayer();
    await assertRateLimit(`gift:${player.id}`, 20, 300);
    const n = z.number().int().min(1).max(99999).parse(number);
    const trade = await db.$transaction(async (tx) => {
      const taken = await tx.playerCard.updateMany({ where: { playerId: player.id, number: n, count: { gte: 2 } }, data: { count: { decrement: 1 } } });
      if (taken.count !== 1) throw new UserError("You can only gift duplicates. Keep at least one copy!");
      for (let i = 0; i < 5; i++) {
        const t = await tx.cardTrade.create({ data: { code: code6(), fromId: player.id, number: n, expiresAt: new Date(Date.now() + 24 * 3_600_000) } }).catch(() => null);
        if (t) return t;
      }
      throw new UserError("Couldn't create a gift code. Try again.");
    });
    const url = `${SITE_URL}/play/cards/gift/${trade.code}`;
    await track("gift_created", player.id, { number: n });
    refresh();
    return { code: trade.code, url, qrSvg: await qr(url) };
  });
}

export async function cancelGift(code: string) {
  return safeAction(async () => {
    const player = await requirePlayer();
    await db.$transaction(async (tx) => {
      const t = await tx.cardTrade.updateMany({ where: { code, fromId: player.id, status: "OPEN" }, data: { status: "CANCELLED" } });
      if (t.count !== 1) throw new UserError("This gift was already claimed.");
      const trade = await tx.cardTrade.findUniqueOrThrow({ where: { code } });
      await tx.playerCard.update({ where: { playerId_number: { playerId: player.id, number: trade.number } }, data: { count: { increment: 1 } } });
    });
    refresh();
    return null;
  });
}

export async function claimGift(code: string) {
  return safeAction<{ card: CardView }>(async () => {
    const player = await requirePlayer();
    await assertRateLimit(`claimgift:${player.id}`, 20, 300);
    const c = z.string().trim().toUpperCase().regex(/^[A-Z0-9]{6}$/).parse(code);
    const trade = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "CardTrade" WHERE code = ${c} FOR UPDATE`;
      const t = await tx.cardTrade.findUnique({ where: { code: c } });
      if (!t || t.status !== "OPEN") throw new UserError("This gift has already been claimed.");
      if (t.fromId === player.id) throw new UserError("That's your own gift! Show the QR to a friend.");
      if (t.expiresAt < new Date()) {
        // Expired: the card goes back to its owner.
        await tx.cardTrade.update({ where: { id: t.id }, data: { status: "CANCELLED" } });
        await tx.playerCard.update({ where: { playerId_number: { playerId: t.fromId, number: t.number } }, data: { count: { increment: 1 } } });
        throw new UserError("This gift expired and went back to its owner.");
      }
      await tx.cardTrade.update({ where: { id: t.id }, data: { status: "CLAIMED", toId: player.id, claimedAt: new Date() } });
      const up = await tx.playerCard.updateMany({ where: { playerId: player.id, number: t.number }, data: { count: { increment: 1 } } });
      if (up.count === 0) await tx.playerCard.create({ data: { playerId: player.id, number: t.number } });
      return t;
    });
    await withProgress(player, async (tx, g) => {
      await grantAchievement(tx, trade.fromId, "generous", g);
    });
    await track("gift_claimed", player.id, { number: trade.number });
    refresh();
    const card = (await getCatalog()).byNumber.get(trade.number)!;
    return { card: toView(card, { isNew: true }) };
  });
}
