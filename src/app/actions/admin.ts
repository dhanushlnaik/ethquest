"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { refresh } from "next/cache";
import { db } from "@/lib/server/db";
import { createAdminSession, destroyAdminSession, requireAdmin } from "@/lib/server/admin";
import { hashPassword, verifyPassword } from "@/lib/server/crypto";
import { rateLimit } from "@/lib/server/rate-limit";
import { audit } from "@/lib/server/telemetry";
import { previewClaim, redeemClaim } from "@/lib/server/rewards";
import { awardXP, bustProgressionCaches, grantAchievement, settleLevel, emptyGains } from "@/lib/server/progression";
import { UserError } from "@/lib/server/action";
import { bustEventCache, getEventConfig } from "@/lib/server/event";
import type { EventConfig } from "@/lib/config/game";
import type { Prisma } from "@/generated/prisma/client";

type Result<T = null> = { ok: true; data: T } | { ok: false; error: string };

async function run<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) throw err;
    if (err instanceof UserError) return { ok: false, error: err.message };
    if (err instanceof Error && err.message === "Not authorized") return { ok: false, error: "You don't have permission for that." };
    console.error(err);
    return { ok: false, error: "Something went wrong." };
  }
}

// ---------------- Auth ----------------

export async function adminLogin(_prev: Result | null, formData: FormData): Promise<Result> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!(await rateLimit(`adminlogin:${ip}`, 8, 600))) return { ok: false, error: "Too many attempts. Wait 10 minutes." };
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const admin = await db.adminUser.findUnique({ where: { email } });
  const valid = admin?.isActive && (await verifyPassword(password, admin.passwordHash));
  if (!admin || !valid) {
    await audit("system", null, "admin.login_failed", email, { ip });
    return { ok: false, error: "Wrong email or password." };
  }
  await createAdminSession(admin.id);
  await audit("admin", admin.id, "admin.login", admin.email, { ip });
  redirect("/booth-admin");
}

export async function adminLogout() {
  await destroyAdminSession();
  redirect("/booth-admin/login");
}

// ---------------- Redemption ----------------

export async function lookupClaim(tokenOrCode: string) {
  return run(async () => {
    const admin = await requireAdmin("VOLUNTEER");
    if (!(await rateLimit(`scan:${admin.id}`, 60, 60))) throw new UserError("Scanning too fast. Wait a moment.");
    const v = z.string().min(4).max(200).parse(tokenOrCode);
    return previewClaim(v);
  });
}

export async function confirmRedeem(claimId: string) {
  return run(async () => {
    const admin = await requireAdmin("VOLUNTEER");
    try {
      const claim = await redeemClaim(z.string().max(40).parse(claimId), admin.id);
      refresh();
      return { claimId: claim.id };
    } catch (err) {
      await audit("admin", admin.id, "reward.redeem_failed", claimId, { reason: err instanceof Error ? err.message : "unknown" });
      throw err;
    }
  });
}

export async function voidClaim(claimId: string) {
  return run(async () => {
    const admin = await requireAdmin("ADMIN");
    const res = await db.rewardClaim.updateMany({ where: { id: claimId, status: "ISSUED" }, data: { status: "VOID" } });
    if (res.count !== 1) throw new UserError("Only unredeemed claims can be voided.");
    await audit("admin", admin.id, "reward.void", claimId);
    refresh();
    return null;
  });
}

// ---------------- Players ----------------

export async function grantBoothAchievement(playerId: string, slug: string) {
  return run(async () => {
    const admin = await requireAdmin("VOLUNTEER");
    const achievement = await db.achievement.findUnique({ where: { slug } });
    if (!achievement?.manual) throw new UserError("That achievement can't be granted manually.");
    await db.$transaction(async (tx) => {
      const gains = emptyGains();
      await grantAchievement(tx, playerId, slug, gains, admin.id);
      await settleLevel(tx, playerId, gains);
    });
    await audit("admin", admin.id, "player.grant_achievement", playerId, { slug });
    refresh();
    return null;
  });
}

export async function grantBonusXP(playerId: string, amount: number, note: string) {
  return run(async () => {
    const admin = await requireAdmin("ADMIN");
    const n = z.number().int().min(-100).max(100).parse(amount);
    const reason = z.string().min(3).max(80).parse(note);
    await db.$transaction(async (tx) => {
      await awardXP(tx, playerId, n, `admin:${reason}`, `admin:${admin.id}:${Date.now()}`, { createdBy: admin.id });
      await settleLevel(tx, playerId, emptyGains());
    });
    await audit("admin", admin.id, "player.bonus_xp", playerId, { amount: n, reason });
    refresh();
    return null;
  });
}

export async function setBanned(playerId: string, banned: boolean) {
  return run(async () => {
    const admin = await requireAdmin("ADMIN");
    await db.player.update({ where: { id: playerId }, data: { isBanned: banned } });
    if (banned) await db.playerSession.deleteMany({ where: { playerId } });
    await audit("admin", admin.id, banned ? "player.ban" : "player.unban", playerId);
    refresh();
    return null;
  });
}

export async function renamePlayer(playerId: string, nickname: string) {
  return run(async () => {
    const admin = await requireAdmin("VOLUNTEER");
    const clean = z.string().min(3).max(20).regex(/^[\p{L}\p{N}_\-. ]+$/u).parse(nickname.trim());
    await db.player.update({ where: { id: playerId }, data: { nickname: clean } }).catch(() => {
      throw new UserError("That name is taken.");
    });
    await audit("admin", admin.id, "player.rename", playerId, { nickname: clean });
    refresh();
    return null;
  });
}

// ---------------- Content ----------------

const rewardSchema = z.object({
  id: z.string(),
  name: z.string().min(2).max(60),
  description: z.string().max(200),
  xpRequired: z.coerce.number().int().min(0).max(10000),
  stockDelta: z.coerce.number().int().min(-10000).max(10000),
  isActive: z.coerce.boolean(),
});

export async function updateReward(_prev: Result | null, formData: FormData): Promise<Result> {
  return run(async () => {
    const admin = await requireAdmin("ADMIN");
    const data = rewardSchema.parse({ ...Object.fromEntries(formData), isActive: formData.get("isActive") === "on" });
    await db.$transaction(async (tx) => {
      const reward = await tx.reward.findUniqueOrThrow({ where: { id: data.id } });
      if (reward.stock + data.stockDelta < 0) throw new UserError("Stock can't go below zero.");
      await tx.reward.update({
        where: { id: data.id },
        data: {
          name: data.name, description: data.description, xpRequired: data.xpRequired, isActive: data.isActive,
          stock: { increment: data.stockDelta }, initialStock: data.stockDelta > 0 ? { increment: data.stockDelta } : undefined,
        },
      });
    });
    await audit("admin", admin.id, "reward.update", data.id, data);
    refresh();
    return null;
  });
}

export async function createReward(_prev: Result | null, formData: FormData): Promise<Result> {
  return run(async () => {
    const admin = await requireAdmin("ADMIN");
    const d = z.object({
      slug: z.string().regex(/^[a-z0-9-]{2,40}$/), name: z.string().min(2).max(60), description: z.string().max(200),
      icon: z.enum(["sticker-pack", "tshirt", "nft-card", "pin", "medal", "trophy", "loot-box"]),
      xpRequired: z.coerce.number().int().min(0), stock: z.coerce.number().int().min(0),
    }).parse(Object.fromEntries(formData));
    await db.reward.create({ data: { ...d, initialStock: d.stock, sortOrder: 99 } });
    await audit("admin", admin.id, "reward.create", d.slug, d);
    refresh();
    return null;
  });
}

export async function toggleQuestion(id: string, isActive: boolean) {
  return run(async () => {
    const admin = await requireAdmin("ADMIN");
    await db.quizQuestion.update({ where: { id }, data: { isActive, editedByAdmin: true } });
    await audit("admin", admin.id, "question.toggle", id, { isActive });
    refresh();
    return null;
  });
}

export async function saveQuestion(_prev: Result | null, formData: FormData): Promise<Result> {
  return run(async () => {
    const admin = await requireAdmin("ADMIN");
    const d = z.object({
      id: z.string().optional(),
      kind: z.enum(["trivia", "spot-fake", "match"]),
      difficulty: z.enum(["EXPLORER", "BUILDER", "NERD"]),
      topic: z.string().min(2).max(40),
      prompt: z.string().min(5).max(400),
      options: z.string(),
      hint: z.string().max(300).optional(),
      explanation: z.string().min(5).max(1200),
      learnMoreUrl: z.string().url(),
      sourceUrl: z.string().url(),
    }).parse(Object.fromEntries(formData));
    let options: unknown;
    try {
      options = JSON.parse(d.options);
    } catch {
      throw new UserError("Options must be valid JSON.");
    }
    const arr = z.array(z.record(z.string(), z.unknown())).min(2).max(8).parse(options);
    if (d.kind === "trivia" && arr.filter((o) => o.correct === true).length !== 1) throw new UserError("Trivia needs exactly one option with \"correct\": true.");
    if (d.kind === "spot-fake" && arr.filter((o) => o.fake === true).length !== 1) throw new UserError("Spot the Fake needs exactly one option with \"fake\": true.");
    if (d.kind === "match" && !arr.every((o) => typeof o.left === "string" && typeof o.right === "string")) throw new UserError("Match options need \"left\" and \"right\".");
    const data = { kind: d.kind, difficulty: d.difficulty, topic: d.topic, prompt: d.prompt, options: arr as Prisma.InputJsonValue, hint: d.hint || null, explanation: d.explanation, learnMoreUrl: d.learnMoreUrl, sourceUrl: d.sourceUrl, editedByAdmin: true, verifiedAt: new Date() };
    if (d.id) await db.quizQuestion.update({ where: { id: d.id }, data });
    else await db.quizQuestion.create({ data: { ...data, slug: `admin-${Date.now().toString(36)}` } });
    await audit("admin", admin.id, d.id ? "question.update" : "question.create", d.id ?? null, { prompt: d.prompt });
    refresh();
    return null;
  });
}

export async function saveUpgrade(_prev: Result | null, formData: FormData): Promise<Result> {
  return run(async () => {
    const admin = await requireAdmin("ADMIN");
    const d = z.object({
      id: z.string(),
      name: z.string().min(2).max(40),
      status: z.enum(["LIVE", "SCHEDULED", "IN_DEVELOPMENT", "PLANNED", "SPECULATIVE"]),
      activatedAt: z.string().optional(),
      oneLiner: z.string().min(3).max(200),
      majorChanges: z.string().max(1000),
      eipsinsightUrl: z.string().url(),
      inHistoryGames: z.boolean(),
    }).parse({ ...Object.fromEntries(formData), inHistoryGames: formData.get("inHistoryGames") === "on" });
    if (d.status === "LIVE" && !d.activatedAt) throw new UserError("Live upgrades need a verified activation date.");
    await db.upgrade.update({
      where: { id: d.id },
      data: {
        name: d.name, status: d.status, activatedAt: d.status === "LIVE" && d.activatedAt ? new Date(`${d.activatedAt}T00:00:00Z`) : null,
        oneLiner: d.oneLiner, majorChanges: d.majorChanges.split("\n").map((s) => s.trim()).filter(Boolean), eipsinsightUrl: d.eipsinsightUrl,
        inHistoryGames: d.status === "LIVE" ? d.inHistoryGames : false, editedByAdmin: true,
      },
    });
    await audit("admin", admin.id, "upgrade.update", d.id, { status: d.status, activatedAt: d.activatedAt });
    refresh();
    return null;
  });
}

export async function saveMission(_prev: Result | null, formData: FormData): Promise<Result> {
  return run(async () => {
    const admin = await requireAdmin("ADMIN");
    const d = z.object({
      id: z.string(), title: z.string().min(2).max(60), blurb: z.string().max(200),
      xpComplete: z.coerce.number().int().min(0).max(200), xpPerCorrect: z.coerce.number().int().min(0).max(50), isActive: z.boolean(), config: z.string(),
    }).parse({ ...Object.fromEntries(formData), isActive: formData.get("isActive") === "on" });
    let config: Prisma.InputJsonValue;
    try {
      config = JSON.parse(d.config || "{}");
    } catch {
      throw new UserError("Config must be valid JSON.");
    }
    await db.mission.update({ where: { id: d.id }, data: { title: d.title, blurb: d.blurb, xpComplete: d.xpComplete, xpPerCorrect: d.xpPerCorrect, isActive: d.isActive, config } });
    await audit("admin", admin.id, "mission.update", d.id, { xpComplete: d.xpComplete, isActive: d.isActive });
    refresh();
    return null;
  });
}

export async function saveStep(_prev: Result | null, formData: FormData): Promise<Result> {
  return run(async () => {
    const admin = await requireAdmin("ADMIN");
    const d = z.object({ id: z.string(), title: z.string().min(2).max(120), action: z.string().min(5).max(600), resources: z.string() }).parse(Object.fromEntries(formData));
    let resources: unknown;
    try {
      resources = JSON.parse(d.resources);
    } catch {
      throw new UserError("Resources must be valid JSON.");
    }
    const parsed = z.array(z.object({ label: z.string().min(1).max(80), url: z.string().url() })).max(6).parse(resources);
    await db.pathwayStep.update({ where: { id: d.id }, data: { title: d.title, action: d.action, resources: parsed } });
    await audit("admin", admin.id, "pathway.step_update", d.id);
    refresh();
    return null;
  });
}

export async function saveXPConfig(_prev: Result | null, formData: FormData): Promise<Result> {
  return run(async () => {
    const admin = await requireAdmin("OWNER");
    let value: Record<string, number>;
    try {
      value = z.record(z.string(), z.number().int().min(0).max(500)).parse(JSON.parse(String(formData.get("xp") ?? "{}")));
    } catch {
      throw new UserError("XP config must be a JSON object of whole numbers.");
    }
    await db.setting.upsert({ where: { key: "xp" }, create: { key: "xp", value, updatedBy: admin.id }, update: { value, updatedBy: admin.id } });
    bustProgressionCaches();
    await audit("admin", admin.id, "settings.xp", "xp", value);
    refresh();
    return null;
  });
}

export async function createStaff(_prev: Result<{ password: string }> | null, formData: FormData): Promise<Result<{ password: string }>> {
  return run(async () => {
    const admin = await requireAdmin("OWNER");
    const d = z.object({ email: z.string().email(), name: z.string().min(2).max(60), role: z.enum(["VOLUNTEER", "ADMIN", "OWNER"]) }).parse(Object.fromEntries(formData));
    const { randomToken } = await import("@/lib/server/crypto");
    const password = randomToken(9);
    await db.adminUser.create({ data: { email: d.email.toLowerCase(), name: d.name, role: d.role, passwordHash: await hashPassword(password) } }).catch(() => {
      throw new UserError("That email already has an account.");
    });
    await audit("admin", admin.id, "staff.create", d.email, { role: d.role });
    refresh();
    return { password };
  });
}

export async function setStaffActive(id: string, isActive: boolean) {
  return run(async () => {
    const admin = await requireAdmin("OWNER");
    if (id === admin.id) throw new UserError("You can't deactivate yourself.");
    await db.adminUser.update({ where: { id }, data: { isActive } });
    if (!isActive) await db.adminSession.deleteMany({ where: { adminId: id } });
    await audit("admin", admin.id, isActive ? "staff.activate" : "staff.deactivate", id);
    refresh();
    return null;
  });
}

// ---------------- Event rules + hoodie champion ----------------

const eventSchema = z.object({
  tshirtXp: z.coerce.number().int().min(0).max(1000),
  rankedRunsPerDay: z.coerce.number().int().min(1).max(20),
  leaderboardClosesAt: z.string().refine((s) => !Number.isNaN(Date.parse(s)), "Invalid close time"),
  announceAt: z.string().refine((s) => !Number.isNaN(Date.parse(s)), "Invalid announce time"),
  eventDays: z.string().min(1).max(60),
});

async function writeEvent(patch: Partial<EventConfig>, adminId: string, action: string) {
  const value = { ...(await getEventConfig()), ...patch };
  await db.setting.upsert({ where: { key: "event" }, create: { key: "event", value, updatedBy: adminId }, update: { value, updatedBy: adminId } });
  bustEventCache();
  await audit("admin", adminId, action, "event", patch);
  refresh();
}

export async function saveEventConfig(_prev: Result | null, formData: FormData): Promise<Result> {
  return run(async () => {
    const admin = await requireAdmin("OWNER");
    const parsed = eventSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) throw new UserError(parsed.error.issues[0]?.message ?? "Check the fields.");
    await writeEvent(parsed.data, admin.id, "settings.event");
    return null;
  });
}

/** Declares (or clears) the hoodie winner after any sudden-death tie-break. Only they can then claim the hoodie. */
export async function declareChampion(playerId: string) {
  return run(async () => {
    const admin = await requireAdmin("ADMIN");
    const id = z.string().max(40).parse(playerId);
    if (id && !(await db.player.findUnique({ where: { id } }))) throw new UserError("Player not found.");
    await writeEvent({ championPlayerId: id }, admin.id, id ? "event.champion" : "event.champion_cleared");
    return null;
  });
}
