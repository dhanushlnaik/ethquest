"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { db } from "@/lib/server/db";
import { getPlayer, requirePlayer, startSession, endSession } from "@/lib/server/session";
import { assertRateLimit, rateLimit } from "@/lib/server/rate-limit";
import { awardXP, getXPConfig, grantAchievement, withProgress } from "@/lib/server/progression";
import { cleanNickname, randomNickname } from "@/lib/server/nickname";
import { getEip, type EipInfo } from "@/lib/server/eipsinsight";
import { randomToken, sha256, shortCode } from "@/lib/server/crypto";
import { track } from "@/lib/server/telemetry";
import { safeAction, UserError } from "@/lib/server/action";
import { buildPathway, DNA_QUESTIONS, scoreDna, type DnaResultKey } from "@/lib/games/content";
import { headers } from "next/headers";
import type { GainsDTO } from "@/lib/games/types";
import type { Prisma } from "@/generated/prisma/client";

const AVATARS = ["explorer", "protocol-engineer", "researcher", "builder", "governance-wizard"] as const;

async function clientKey() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

/** Title-screen START button: creates an anonymous player + HTTP-only session cookie. */
export async function startPlaying(formData: FormData) {
  const existing = await getPlayer();
  const next = String(formData.get("next") ?? "/play/worlds");
  const dest = next.startsWith("/play") ? next : "/play/worlds";
  if (!existing) {
    if (!(await rateLimit(`newplayer:${await clientKey()}`, 40, 600))) redirect("/play?busy=1");
    const avatar = AVATARS.includes(String(formData.get("avatar")) as never) ? String(formData.get("avatar")) : "explorer";
    let player = null;
    for (let i = 0; i < 5 && !player; i++) {
      player = await db.player.create({ data: { nickname: randomNickname(), avatar } }).catch(() => null);
    }
    if (!player) throw new Error("Could not create player");
    await startSession(player.id);
    await track("player_created", player.id, {});
  }
  redirect(dest);
}

export async function setDifficulty(difficulty: "EXPLORER" | "BUILDER" | "NERD") {
  return safeAction(async () => {
    const d = z.enum(["EXPLORER", "BUILDER", "NERD"]).parse(difficulty);
    const player = await requirePlayer();
    await db.player.update({ where: { id: player.id }, data: { difficulty: d } });
    await track("difficulty_set", player.id, { difficulty: d });
    refresh();
    return { difficulty: d };
  });
}

export async function updateProfile(input: { nickname?: string; avatar?: string }) {
  return safeAction(async () => {
    const player = await requirePlayer();
    await assertRateLimit(`profile:${player.id}`, 10, 300);
    const data: { nickname?: string; avatar?: string } = {};
    if (input.nickname !== undefined) {
      const clean = cleanNickname(input.nickname);
      if (!clean) throw new UserError("Pick a friendly name: 3–20 letters or numbers.");
      data.nickname = clean;
    }
    if (input.avatar !== undefined) {
      if (!AVATARS.includes(input.avatar as never)) throw new UserError("Unknown avatar.");
      data.avatar = input.avatar;
    }
    try {
      await db.player.update({ where: { id: player.id }, data });
    } catch {
      throw new UserError("That name is taken. Try another!");
    }
    refresh();
    return data;
  });
}

/** Returns a one-time recovery code so a player can continue on another device. */
export async function createRecoveryCode() {
  return safeAction(async () => {
    const player = await requirePlayer();
    await assertRateLimit(`recovery:${player.id}`, 5, 600);
    const code = `${shortCode(4)}-${shortCode(4)}`;
    await db.player.update({ where: { id: player.id }, data: { recoveryHash: sha256(code) } });
    return { code };
  });
}

export async function recoverPlayer(formData: FormData) {
  const code = String(formData.get("code") ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!(await rateLimit(`recover:${await clientKey()}`, 10, 600))) redirect("/play/recover?error=busy");
  const formatted = `${code.slice(0, 4)}-${code.slice(4, 8)}`;
  const player = code.length === 8 ? await db.player.findUnique({ where: { recoveryHash: sha256(formatted) } }) : null;
  if (!player || player.isBanned) redirect("/play/recover?error=notfound");
  await endSession();
  await startSession(player.id);
  // Recovery codes are single-use.
  await db.player.update({ where: { id: player.id }, data: { recoveryHash: null } });
  redirect("/play/profile");
}

// ---------------- EIP Explorer ----------------

export type LookupResult = { eip: EipInfo | null; plain: string | null; upgrade: { name: string; url: string } | null; gains: GainsDTO; fresh: boolean };

export async function lookupEip(rawNumber: number) {
  return safeAction<LookupResult>(async () => {
    const number = z.number().int().min(1).max(99999).parse(rawNumber);
    const player = await requirePlayer();
    await assertRateLimit(`lookup:${player.id}`, 40, 60);
    const eip = await getEip(number);
    const curated = await db.eIPRecord.findFirst({ where: { number, curated: true } });
    const upgradeSlug = curated?.upgradeSlug ?? null;
    const upgrade = upgradeSlug ? await db.upgrade.findUnique({ where: { slug: upgradeSlug } }) : null;
    const xpCfg = await getXPConfig();

    const { result: fresh, gains } = await withProgress(player, async (tx, gains) => {
      const prior = await tx.eIPLookup.findFirst({ where: { playerId: player.id, number, found: true } });
      await tx.eIPLookup.create({ data: { playerId: player.id, repo: eip?.repo ?? "eip", number, found: !!eip } });
      if (!eip || prior) return !prior && !!eip;
      const distinct = await tx.eIPLookup.findMany({ where: { playerId: player.id, found: true }, distinct: ["number"], select: { number: true } });
      if (distinct.length <= xpCfg.findEipMaxRewarded) {
        const r = await awardXP(tx, player.id, xpCfg.findEip, "find-your-eip", `eip:find:${number}`);
        gains.xp += r.awarded;
      }
      if (distinct.length >= 3) await grantAchievement(tx, player.id, "eip-explorer", gains);
      return true;
    });
    await track("eip_search", player.id, { number, found: !!eip });
    return {
      eip,
      plain: curated?.plainEnglish ?? null,
      upgrade: upgrade ? { name: upgrade.name, url: upgrade.eipsinsightUrl } : eip?.upcoming ? { name: eip.upcoming.upgrade, url: `https://eipsinsight.com/upgrade/${eip.upcoming.slug}` } : null,
      gains,
      fresh,
    };
  });
}

export async function nextHunt() {
  return safeAction(async () => {
    const player = await requirePlayer();
    const solved = await db.xPTransaction.findMany({ where: { playerId: player.id, idempotencyKey: { startsWith: "hunt:" } }, select: { idempotencyKey: true } });
    const solvedSlugs = new Set(solved.map((s) => s.idempotencyKey.slice(5)));
    const hunts = await db.eIPHunt.findMany({ where: { isActive: true } });
    const order = ["EXPLORER", "BUILDER", "NERD"];
    const mine = hunts.filter((h) => h.difficulty === player.difficulty && !solvedSlugs.has(h.slug));
    const any = hunts.filter((h) => !solvedSlugs.has(h.slug)).sort((a, b) => order.indexOf(a.difficulty) - order.indexOf(b.difficulty));
    const pool = mine.length ? mine : any.length ? any : hunts;
    const hunt = pool[Math.floor(Math.random() * pool.length)];
    return { slug: hunt.slug, clue: hunt.clue, hint: hunt.hint, solvedCount: solvedSlugs.size, total: hunts.length };
  });
}

export async function guessHunt(slug: string, guess: number) {
  return safeAction(async () => {
    const player = await requirePlayer();
    await assertRateLimit(`hunt:${player.id}`, 40, 60);
    const hunt = await db.eIPHunt.findUnique({ where: { slug: z.string().max(40).parse(slug) } });
    if (!hunt) throw new UserError("Unknown hunt.");
    const n = z.number().int().min(0).max(99999).parse(guess);
    const correct = n === hunt.answer;
    const xpCfg = await getXPConfig();
    const { gains } = await withProgress(player, async (tx, gains) => {
      if (!correct) return;
      const r = await awardXP(tx, player.id, xpCfg.hunt, "eip-hunt", `hunt:${hunt.slug}`);
      gains.xp += r.awarded;
    });
    await track("hunt_guess", player.id, { slug, correct });
    const eip = correct ? await getEip(hunt.answer) : null;
    return { correct, explanation: correct ? hunt.explanation : null, eip, gains };
  });
}

// ---------------- Pathfinder ----------------

const pathSchema = z.object({ role: z.string().max(30), interest: z.string().max(30), goal: z.string().max(30) });

export async function completePathfinder(input: z.infer<typeof pathSchema>) {
  return safeAction(async () => {
    const choice = pathSchema.parse(input);
    const player = await requirePlayer();
    await assertRateLimit(`path:${player.id}`, 10, 60);
    const pathways = await db.pathway.findMany({ include: { steps: { orderBy: { sortOrder: "asc" } } } });
    const built = buildPathway(choice, pathways);
    if (!built) throw new UserError("Please pick a role, an interest and a goal.");
    const xpCfg = await getXPConfig();
    const shareId = randomToken(9);
    const { gains } = await withProgress(player, async (tx, gains) => {
      await tx.playerPathway.create({
        data: { shareId, playerId: player.id, pathwayId: built.pathwayId, role: choice.role, interest: choice.interest, goal: choice.goal, snapshot: { ...built, nickname: player.nickname } as unknown as Prisma.InputJsonValue },
      });
      const r = await awardXP(tx, player.id, xpCfg.pathfinder, "pathfinder", "pathfinder:complete");
      gains.xp += r.awarded;
      await grantAchievement(tx, player.id, "pathfinder", gains);
    });
    await track("pathfinder_complete", player.id, { ...choice, pathway: built.code });
    return { shareId, gains };
  });
}

// ---------------- Builder DNA ----------------

export async function completeDna(answers: string[]) {
  return safeAction<{ result: DnaResultKey; gains: GainsDTO }>(async () => {
    const parsed = z.array(z.string().max(20)).length(DNA_QUESTIONS.length).parse(answers);
    const player = await requirePlayer();
    const result = scoreDna(parsed);
    const xpCfg = await getXPConfig();
    const { gains } = await withProgress(player, async (tx, gains) => {
      const r = await awardXP(tx, player.id, xpCfg.dna, "builder-dna", "dna:complete");
      gains.xp += r.awarded;
      await grantAchievement(tx, player.id, "builder-dna", gains);
    });
    await track("dna_result", player.id, { result });
    return { result, gains };
  });
}

export async function markAchievementsSeen() {
  const player = await getPlayer();
  if (!player) return;
  await db.playerAchievement.updateMany({ where: { playerId: player.id, seen: false }, data: { seen: true } });
}
