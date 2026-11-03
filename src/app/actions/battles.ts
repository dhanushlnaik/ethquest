"use server";

import { z } from "zod";
import { refresh } from "next/cache";
import { requirePlayer } from "@/lib/server/session";
import { assertRateLimit } from "@/lib/server/rate-limit";
import { cancelBattle, createBattle, joinBattle } from "@/lib/server/battles";
import { grantAchievement, withProgress } from "@/lib/server/progression";
import { track } from "@/lib/server/telemetry";
import { safeAction } from "@/lib/server/action";

const handSchema = z.array(z.number().int().min(1).max(99999)).length(3);
const codeSchema = z.string().trim().toUpperCase().regex(/^[A-Z0-9]{5}$/);

async function onWin(winnerId: string | null) {
  if (!winnerId || winnerId === "house") return;
  await withProgress({ id: winnerId, xpTotal: 1 }, async (tx, g) => {
    await grantAchievement(tx, winnerId, "card-battler", g);
  });
}

export async function startBattle(cards: number[], vsBot: boolean) {
  return safeAction<{ code: string; packed: boolean }>(async () => {
    const player = await requirePlayer();
    await assertRateLimit(`battle:${player.id}`, 20, 300);
    const { battle, packed } = await createBattle(player.id, handSchema.parse(cards), !!vsBot);
    if (battle.vsBot) await onWin(battle.winnerId);
    await track("battle_created", player.id, { vsBot });
    refresh();
    return { code: battle.code, packed };
  });
}

export async function answerBattle(code: string, cards: number[]) {
  return safeAction<{ code: string; packed: boolean }>(async () => {
    const player = await requirePlayer();
    await assertRateLimit(`battle:${player.id}`, 20, 300);
    const { battle, packed } = await joinBattle(player.id, codeSchema.parse(code), handSchema.parse(cards));
    await onWin(battle.winnerId);
    await track("battle_joined", player.id, {});
    refresh();
    return { code: battle.code, packed };
  });
}

export async function withdrawBattle(code: string) {
  return safeAction(async () => {
    const player = await requirePlayer();
    await cancelBattle(player.id, codeSchema.parse(code));
    refresh();
    return null;
  });
}
