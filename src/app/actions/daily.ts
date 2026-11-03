"use server";

import { z } from "zod";
import { refresh } from "next/cache";
import { requirePlayer } from "@/lib/server/session";
import { assertRateLimit } from "@/lib/server/rate-limit";
import { answerDaily } from "@/lib/server/daily";
import { track } from "@/lib/server/telemetry";
import { safeAction } from "@/lib/server/action";
import type { GainsDTO } from "@/lib/games/types";

export async function submitDaily(choice: string) {
  return safeAction<{ correct: boolean; correctId: string; explanation: string; streak: number; gains: GainsDTO }>(async () => {
    const player = await requirePlayer();
    await assertRateLimit(`daily:${player.id}`, 10, 60);
    const res = await answerDaily(player, z.string().min(1).max(80).parse(choice));
    await track("daily_answer", player.id, { correct: res.correct, streak: res.streak });
    refresh();
    return res;
  });
}
