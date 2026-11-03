import "server-only";
import { createHash, randomInt } from "node:crypto";
import { db } from "./db";
import { UserError } from "./action";
import { dayKey, getCatalog, grantPack, RARITY_ORDER, toView } from "./cards";
import { eventDayStart } from "./event";
import type { CardView, StatKey } from "@/lib/cards/types";
import type { EipCard } from "@/generated/prisma/client";

// Best-of-3 card battles. Each round compares one stat, chosen per battle and per round from a hash of
// the battle code, so it is fixed once the battle exists but unknown while picking cards.

const STAT_KEYS: StatKey[] = ["lore", "buzz", "links", "stage"];
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const FRIEND_PACKS_PER_DAY = 3;

export type Round = { stat: StatKey; a: { number: number; value: number }; b: { number: number; value: number }; winner: "a" | "b" | "draw" };

export function statsFor(code: string) {
  const h = createHash("sha256").update(`battle:${code}`).digest();
  return [0, 1, 2].map((i) => STAT_KEYS[h[i] % STAT_KEYS.length]);
}

function duel(code: string, a: EipCard[], b: EipCard[]) {
  const stats = statsFor(code);
  const rounds: Round[] = stats.map((stat, i) => {
    const ca = a[i], cb = b[i];
    const va = ca[stat], vb = cb[stat];
    let winner: Round["winner"] = va > vb ? "a" : vb > va ? "b" : "draw";
    if (winner === "draw") {
      const ra = RARITY_ORDER.indexOf(ca.rarity), rb = RARITY_ORDER.indexOf(cb.rarity);
      winner = ra > rb ? "a" : rb > ra ? "b" : "draw";
    }
    return { stat, a: { number: ca.number, value: va }, b: { number: cb.number, value: vb }, winner };
  });
  const aw = rounds.filter((r) => r.winner === "a").length, bw = rounds.filter((r) => r.winner === "b").length;
  return { rounds, result: aw > bw ? ("a" as const) : bw > aw ? ("b" as const) : ("draw" as const) };
}

/** Checks the player owns these 3 distinct cards and returns them in order. */
async function hand(playerId: string, numbers: number[]) {
  if (numbers.length !== 3 || new Set(numbers).size !== 3) throw new UserError("Pick 3 different cards.");
  const owned = await db.playerCard.count({ where: { playerId, number: { in: numbers } } });
  if (owned !== 3) throw new UserError("You can only battle with cards you own.");
  const cat = await getCatalog();
  return numbers.map((n) => cat.byNumber.get(n)!);
}

const newCode = () => Array.from({ length: 5 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");

/** House deck for practice: same rarities as yours, different cards. */
async function houseDeck(mine: EipCard[]) {
  const cat = await getCatalog();
  return mine.map((c) => {
    const pool = (cat.byRarity.get(c.rarity) ?? cat.all).filter((x) => !mine.some((m) => m.number === x.number));
    return pool[randomInt(pool.length)];
  });
}

async function rewardWinner(winnerId: string, key: string, reason: string, cap: number) {
  const since = eventDayStart();
  const prefix = key.split(":")[0];
  const today = await db.cardPack.count({ where: { playerId: winnerId, key: { startsWith: `${prefix}:` }, createdAt: { gte: since } } });
  if (today >= cap) return false;
  return grantPack(db, winnerId, key, reason);
}

export async function createBattle(playerId: string, numbers: number[], vsBot: boolean) {
  const mine = await hand(playerId, numbers);
  for (let i = 0; i < 6; i++) {
    const code = newCode();
    if (vsBot) {
      const house = await houseDeck(mine);
      const { rounds, result } = duel(code, mine, house);
      const battle = await db.cardBattle
        .create({ data: { code, challengerId: playerId, challengerCards: numbers, opponentCards: house.map((c) => c.number), vsBot: true, rounds, winnerId: result === "a" ? playerId : null, status: "DONE", finishedAt: new Date() } })
        .catch(() => null);
      if (!battle) continue;
      const packed = result === "a" ? await rewardWinner(playerId, `botwin:${dayKey()}`, "Beat the House", 1) : false;
      return { battle, packed };
    }
    const battle = await db.cardBattle.create({ data: { code, challengerId: playerId, challengerCards: numbers, opponentCards: [] } }).catch(() => null);
    if (battle) return { battle, packed: false };
  }
  throw new UserError("Couldn't create a battle code. Try again.");
}

export async function joinBattle(playerId: string, code: string, numbers: number[]) {
  const theirs = await hand(playerId, numbers);
  const done = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "CardBattle" WHERE code = ${code} FOR UPDATE`;
    const b = await tx.cardBattle.findUnique({ where: { code } });
    if (!b || b.status !== "OPEN") throw new UserError("This battle is already over.");
    if (b.challengerId === playerId) throw new UserError("You can't battle yourself. Share the code with a friend!");
    const cat = await getCatalog();
    const mine = b.challengerCards.map((n) => cat.byNumber.get(n)!);
    const { rounds, result } = duel(code, mine, theirs);
    const winnerId = result === "a" ? b.challengerId : result === "b" ? playerId : null;
    return tx.cardBattle.update({ where: { id: b.id }, data: { opponentId: playerId, opponentCards: numbers, rounds, winnerId, status: "DONE", finishedAt: new Date() } });
  });
  const packed = done.winnerId ? await rewardWinner(done.winnerId, `battle:${done.id}`, "Battle win", FRIEND_PACKS_PER_DAY) : false;
  return { battle: done, packed };
}

export async function cancelBattle(playerId: string, code: string) {
  const r = await db.cardBattle.updateMany({ where: { code, challengerId: playerId, status: "OPEN" }, data: { status: "CANCELLED" } });
  if (r.count !== 1) throw new UserError("This battle can't be cancelled.");
}

export type BattleView = {
  code: string;
  status: "OPEN" | "DONE" | "CANCELLED";
  vsBot: boolean;
  challenger: { id: string; nickname: string; avatar: string };
  opponent: { id: string; nickname: string; avatar: string } | null;
  /** Challenger cards are hidden from the opponent until the battle is done. */
  challengerCards: CardView[] | null;
  opponentCards: CardView[];
  rounds: Round[] | null;
  winnerId: string | null;
};

export async function battleView(code: string, viewerId: string | null): Promise<BattleView | null> {
  const b = await db.cardBattle.findUnique({
    where: { code },
    include: { challenger: { select: { id: true, nickname: true, avatar: true } }, opponent: { select: { id: true, nickname: true, avatar: true } } },
  });
  if (!b) return null;
  const cat = await getCatalog();
  const view = (ns: number[]) => ns.map((n) => toView(cat.byNumber.get(n)!));
  const reveal = b.status === "DONE" || b.challengerId === viewerId;
  return {
    code: b.code,
    status: b.status,
    vsBot: b.vsBot,
    challenger: b.challenger,
    opponent: b.vsBot ? { id: "house", nickname: "The House", avatar: "governance-wizard" } : b.opponent,
    challengerCards: reveal ? view(b.challengerCards) : null,
    opponentCards: view(b.opponentCards),
    rounds: (b.rounds as Round[] | null) ?? null,
    winnerId: b.vsBot && b.status === "DONE" && !b.winnerId ? (b.rounds && duelWinnerIsHouse(b.rounds as Round[]) ? "house" : null) : b.winnerId,
  };
}

function duelWinnerIsHouse(rounds: Round[]) {
  const aw = rounds.filter((r) => r.winner === "a").length, bw = rounds.filter((r) => r.winner === "b").length;
  return bw > aw;
}

export async function myBattles(playerId: string) {
  return db.cardBattle.findMany({
    where: { OR: [{ challengerId: playerId }, { opponentId: playerId }], status: { not: "CANCELLED" } },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { challenger: { select: { nickname: true } }, opponent: { select: { nickname: true } } },
  });
}
