"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/server/admin";
import { advance, createSession, joinSession, submitAnswer } from "@/lib/server/live";
import { assertRateLimit } from "@/lib/server/rate-limit";
import { audit } from "@/lib/server/telemetry";
import { safeAction } from "@/lib/server/action";

const code = z.string().trim().toUpperCase().regex(/^[A-Z]{4}$/, "Room codes are 4 letters.");

/** Host: open a fresh room for a quiz and go to its big screen. */
export async function hostCreateSession(quizSlug: string) {
  const admin = await requireAdmin("VOLUNTEER");
  const session = await createSession(z.string().max(40).parse(quizSlug), admin.id);
  await audit("admin", admin.id, "live.create", session.code, { quizSlug });
  redirect(`/live/host/${session.code}`);
}

export async function hostAdvance(roomCode: string, action: "start" | "reveal" | "next" | "end") {
  return safeAction(async () => {
    await requireAdmin("VOLUNTEER");
    await advance(code.parse(roomCode), z.enum(["start", "reveal", "next", "end"]).parse(action));
    return null;
  });
}

export async function liveJoin(roomCode: string, name: string) {
  return safeAction(async () => {
    const c = code.parse(roomCode);
    await assertRateLimit(`livejoin:${c}`, 60, 60);
    await joinSession(c, z.string().max(40).parse(name));
    return { code: c };
  });
}

export async function liveAnswer(roomCode: string, choice: number) {
  return safeAction(async () => {
    await submitAnswer(code.parse(roomCode), z.number().int().min(0).max(5).parse(choice));
    return null;
  });
}
