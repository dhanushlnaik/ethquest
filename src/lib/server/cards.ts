import "server-only";
import { randomInt } from "node:crypto";
import { db, type Tx } from "./db";
import { UserError } from "./action";
import { eventDayStart } from "./event";
import type { CardRarity, EipCard } from "@/generated/prisma/client";
import type { CardView } from "@/lib/cards/types";

// EIP trading cards: catalog cache, booster packs, collection + sets.

export const PACK_SIZE = 4;
/** Per-slot rarity odds (%). The last card of every pack is Rare or better. */
const ODDS: [CardRarity, number][] = [["COMMON", 52], ["UNCOMMON", 28], ["RARE", 12], ["EPIC", 6], ["LEGENDARY", 2]];
const ODDS_LAST: [CardRarity, number][] = [["RARE", 70], ["EPIC", 24], ["LEGENDARY", 6]];
/** 7-day streak packs: the last card is Epic or better. */
const ODDS_STREAK: [CardRarity, number][] = [["EPIC", 80], ["LEGENDARY", 20]];
export const RARITY_ORDER: CardRarity[] = ["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"];

let catalog: { at: number; all: EipCard[]; byRarity: Map<CardRarity, EipCard[]>; byNumber: Map<number, EipCard> } | null = null;
export async function getCatalog() {
  if (catalog && Date.now() - catalog.at < 5 * 60_000) return catalog;
  const all = await db.eipCard.findMany({ orderBy: { number: "asc" } });
  const byRarity = new Map<CardRarity, EipCard[]>();
  for (const c of all) byRarity.set(c.rarity, [...(byRarity.get(c.rarity) ?? []), c]);
  catalog = { at: Date.now(), all, byRarity, byNumber: new Map(all.map((c) => [c.number, c])) };
  return catalog;
}

export function toView(c: EipCard, extra: { count?: number; isNew?: boolean } = {}): CardView {
  return {
    number: c.number, repo: c.repo as "eip" | "erc", title: c.title, status: c.status, category: c.category, type: c.type,
    year: c.year, upgrade: c.upgrade, rarity: c.rarity, lore: c.lore, buzz: c.buzz, links: c.links, stage: c.stage,
    count: extra.count ?? 0, isNew: extra.isNew ?? false,
    leveledUp: !!c.leveledAt && Date.now() - c.leveledAt.getTime() < 7 * 86_400_000,
  };
}

function roll(odds: [CardRarity, number][]) {
  const total = odds.reduce((s, [, w]) => s + w, 0);
  let r = randomInt(total);
  for (const [rarity, w] of odds) {
    if (r < w) return rarity;
    r -= w;
  }
  return odds[0][0];
}

/** Gives a pack once per key (e.g. "daily:2026-11-03", "run:guess-that-eip:2026-11-03"). Returns true if new. */
export async function grantPack(tx: Tx | typeof db, playerId: string, key: string, reason: string) {
  const r = await tx.cardPack.createMany({ data: [{ playerId, key, reason, cards: [] }], skipDuplicates: true });
  return r.count === 1;
}

export const dayKey = (d = new Date()) => eventDayStart(d).toISOString().slice(0, 10);

/** Opens a pack: rolls 4 cards, adds them to the collection. Re-opening returns the same cards. */
export async function openPack(playerId: string, packId: string) {
  const cat = await getCatalog();
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "CardPack" WHERE id = ${packId} FOR UPDATE`;
    const pack = await tx.cardPack.findFirst({ where: { id: packId, playerId } });
    if (!pack) throw new UserError("Pack not found.");
    if (pack.openedAt) return { cards: pack.cards, newOnes: [] as number[], already: true };
    const cards: number[] = [];
    for (let i = 0; i < PACK_SIZE; i++) {
      const last = i === PACK_SIZE - 1;
      const rarity = roll(last ? (pack.key.startsWith("streak:") ? ODDS_STREAK : ODDS_LAST) : ODDS);
      const pool = cat.byRarity.get(rarity) ?? cat.all;
      cards.push(pool[randomInt(pool.length)].number);
    }
    const owned = await tx.playerCard.findMany({ where: { playerId, number: { in: cards } }, select: { number: true } });
    const had = new Set(owned.map((o) => o.number));
    const newOnes: number[] = [];
    for (const number of cards) {
      const res = await tx.playerCard.updateMany({ where: { playerId, number }, data: { count: { increment: 1 } } });
      if (res.count === 0) {
        await tx.playerCard.create({ data: { playerId, number } });
        if (!had.has(number)) newOnes.push(number);
      }
    }
    await tx.cardPack.update({ where: { id: pack.id }, data: { openedAt: new Date(), cards } });
    return { cards, newOnes, already: false };
  }, { timeout: 20_000, maxWait: 10_000 });
}

/** Directly adds one card (e.g. discovered via Find Your EIP). Returns true if it was new to the collection. */
export async function grantCard(tx: Tx | typeof db, playerId: string, number: number) {
  const exists = await tx.eipCard.findUnique({ where: { number }, select: { number: true } });
  if (!exists) return false;
  const created = await tx.playerCard.createMany({ data: [{ playerId, number }], skipDuplicates: true });
  return created.count === 1;
}

export async function unopenedPacks(playerId: string) {
  return db.cardPack.findMany({ where: { playerId, openedAt: null }, orderBy: { createdAt: "asc" }, select: { id: true, reason: true, createdAt: true } });
}

export async function collection(playerId: string) {
  const cat = await getCatalog();
  const [owned, sets] = await Promise.all([
    db.playerCard.findMany({ where: { playerId }, select: { number: true, count: true } }),
    db.cardSet.findMany({ orderBy: { sortOrder: "asc" }, include: { members: { select: { number: true } } } }),
  ]);
  const counts = new Map(owned.map((o) => [o.number, o.count]));
  const total = cat.all.length;
  const byRarity = RARITY_ORDER.map((r) => ({ rarity: r, owned: (cat.byRarity.get(r) ?? []).filter((c) => counts.has(c.number)).length, total: (cat.byRarity.get(r) ?? []).length }));
  return {
    counts,
    owned: owned.length,
    total,
    duplicates: owned.reduce((s, o) => s + Math.max(0, o.count - 1), 0),
    byRarity,
    sets: sets.map((s) => {
      const members = s.members.map((m) => m.number);
      const have = members.filter((n) => counts.has(n)).length;
      return { slug: s.slug, name: s.name, description: s.description, icon: s.icon, members, have, complete: have === members.length };
    }),
  };
}

/** Cards a player owns, as views (for pickers: battles, gifts). */
export async function ownedCards(playerId: string) {
  const cat = await getCatalog();
  const owned = await db.playerCard.findMany({ where: { playerId }, select: { number: true, count: true } });
  return owned
    .map((o) => { const c = cat.byNumber.get(o.number); return c ? toView(c, { count: o.count }) : null; })
    .filter((v): v is CardView => !!v)
    .sort((a, b) => RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity) || a.number - b.number);
}
