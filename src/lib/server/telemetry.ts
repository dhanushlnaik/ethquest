import "server-only";
import { after } from "next/server";
import { db } from "./db";
import type { Prisma } from "@/generated/prisma/client";

/** Anonymous analytics event, written after the response is sent. Never throws into gameplay. */
export async function track(name: string, playerId: string | null, props: Record<string, unknown> = {}) {
  const write = async () => {
    try {
      await db.event.create({ data: { name, playerId, props: props as Prisma.InputJsonValue } });
    } catch (err) {
      console.error("track failed", name, err);
    }
  };
  try {
    after(write);
  } catch {
    await write(); // outside a request scope (scripts)
  }
}

export async function audit(
  actorType: "admin" | "player" | "system",
  actorId: string | null,
  action: string,
  target: string | null,
  meta: Record<string, unknown> = {},
) {
  await db.auditLog.create({ data: { actorType, actorId, action, target, meta: meta as Prisma.InputJsonValue } });
}
