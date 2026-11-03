import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { db } from "./db";
import { randomToken, sha256 } from "./crypto";

export const PLAYER_COOKIE = "eq_sid";
const SESSION_DAYS = 60;

export type CurrentPlayer = NonNullable<Awaited<ReturnType<typeof getPlayer>>>;

/** Read-only: resolves the player for this request, or null. Safe to call from Server Components. */
export const getPlayer = cache(async () => {
  const token = (await cookies()).get(PLAYER_COOKIE)?.value;
  if (!token) return null;
  const session = await db.playerSession.findUnique({
    where: { tokenHash: sha256(token) },
    include: { player: true },
  });
  if (!session || session.expiresAt < new Date() || session.player.isBanned) return null;
  return session.player;
});

/** Server Actions / Route Handlers only: returns the player or throws. */
export async function requirePlayer() {
  const player = await getPlayer();
  if (!player) throw new PlayerRequiredError();
  return player;
}

export class PlayerRequiredError extends Error {
  constructor() {
    super("No active player session");
  }
}

/** Creates a session for a player and sets the HTTP-only cookie. Server Actions only. */
export async function startSession(playerId: string) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.playerSession.create({ data: { tokenHash: sha256(token), playerId, expiresAt } });
  (await cookies()).set(PLAYER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(PLAYER_COOKIE)?.value;
  if (token) await db.playerSession.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(PLAYER_COOKIE);
}
