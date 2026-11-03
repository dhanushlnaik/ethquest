"use server";

import { cookies, headers } from "next/headers";
import { refresh } from "next/cache";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { db } from "@/lib/server/db";
import { requirePlayer, startSession } from "@/lib/server/session";
import { assertRateLimit } from "@/lib/server/rate-limit";
import { track } from "@/lib/server/telemetry";
import { safeAction, UserError } from "@/lib/server/action";

// Passkeys: "Save profile" attaches a passkey to the current (anonymous) player; "Log in" finds the
// player behind a passkey on any device. The one-time challenge lives in a short-lived httpOnly cookie.

const CHALLENGE_COOKIE = "eq_wa";
const RP_NAME = "ETHQuest by EIPsInsight";

/** Relying party = the site the request came in on (localhost, a tunnel, or the real domain). */
async function relyingParty() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return { rpID: host.split(":")[0], origin: `${proto}://${host}` };
}

async function setChallenge(challenge: string) {
  (await cookies()).set(CHALLENGE_COOKIE, challenge, { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 300 });
}
async function takeChallenge() {
  const jar = await cookies();
  const c = jar.get(CHALLENGE_COOKIE)?.value;
  jar.delete(CHALLENGE_COOKIE);
  if (!c) throw new UserError("That took too long. Please try again.");
  return c;
}

export async function passkeyRegisterOptions() {
  return safeAction<PublicKeyCredentialCreationOptionsJSON>(async () => {
    const player = await requirePlayer();
    await assertRateLimit(`pk:${player.id}`, 10, 300);
    const { rpID } = await relyingParty();
    const existing = await db.passkey.findMany({ where: { playerId: player.id }, select: { id: true, transports: true } });
    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID,
      userName: player.nickname,
      userDisplayName: player.nickname,
      userID: new TextEncoder().encode(player.id),
      attestationType: "none",
      excludeCredentials: existing.map((p) => ({ id: p.id, transports: p.transports as AuthenticatorTransport[] })),
      // Discoverable, so logging in on another device needs no username.
      authenticatorSelection: { residentKey: "required", userVerification: "preferred" },
    });
    await setChallenge(options.challenge);
    return options;
  });
}

export async function passkeyRegisterVerify(response: RegistrationResponseJSON) {
  return safeAction<{ saved: true }>(async () => {
    const player = await requirePlayer();
    const { rpID, origin } = await relyingParty();
    const expectedChallenge = await takeChallenge();
    const v = await verifyRegistrationResponse({ response, expectedChallenge, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: false });
    if (!v.verified || !v.registrationInfo) throw new UserError("Your device didn't confirm the passkey. Try again.");
    const { credential } = v.registrationInfo;
    await db.passkey.create({
      data: { id: credential.id, playerId: player.id, publicKey: Buffer.from(credential.publicKey), counter: credential.counter, transports: credential.transports ?? [] },
    });
    await track("passkey_saved", player.id, {});
    refresh();
    return { saved: true };
  });
}

export async function passkeyLoginOptions() {
  return safeAction<PublicKeyCredentialRequestOptionsJSON>(async () => {
    const h = await headers();
    await assertRateLimit(`pklogin:${h.get("x-forwarded-for")?.split(",")[0] ?? "local"}`, 20, 300);
    const { rpID } = await relyingParty();
    const options = await generateAuthenticationOptions({ rpID, userVerification: "preferred" });
    await setChallenge(options.challenge);
    return options;
  });
}

export async function passkeyLoginVerify(response: AuthenticationResponseJSON) {
  return safeAction<{ nickname: string }>(async () => {
    const { rpID, origin } = await relyingParty();
    const expectedChallenge = await takeChallenge();
    const pk = await db.passkey.findUnique({ where: { id: response.id }, include: { player: { select: { id: true, nickname: true, isBanned: true } } } });
    if (!pk) throw new UserError("This passkey isn't linked to an ETHQuest profile.");
    if (pk.player.isBanned) throw new UserError("This profile is not available.");
    const v = await verifyAuthenticationResponse({
      response, expectedChallenge, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: false,
      credential: { id: pk.id, publicKey: new Uint8Array(pk.publicKey), counter: pk.counter, transports: pk.transports },
    });
    if (!v.verified) throw new UserError("Couldn't verify your passkey.");
    await db.passkey.update({ where: { id: pk.id }, data: { counter: v.authenticationInfo.newCounter, lastUsedAt: new Date() } });
    await startSession(pk.player.id);
    await track("passkey_login", pk.player.id, {});
    return { nickname: pk.player.nickname };
  });
}
