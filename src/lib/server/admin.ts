import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { randomToken, sha256 } from "./crypto";
import type { AdminRole } from "@/generated/prisma/client";

export const ADMIN_COOKIE = "eq_admin";
const ADMIN_HOURS = 14;

export const getAdmin = cache(async () => {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  const session = await db.adminSession.findUnique({ where: { tokenHash: sha256(token) }, include: { admin: true } });
  if (!session || session.expiresAt < new Date() || !session.admin.isActive) return null;
  const { passwordHash: _omit, ...admin } = session.admin;
  return admin;
});

const RANK: Record<AdminRole, number> = { VOLUNTEER: 1, ADMIN: 2, OWNER: 3 };

/** For pages: redirects to login. */
export async function requireAdminPage(min: AdminRole = "VOLUNTEER") {
  const admin = await getAdmin();
  if (!admin) redirect("/booth-admin/login");
  if (RANK[admin.role] < RANK[min]) redirect("/booth-admin?denied=1");
  return admin;
}

export class AdminRequiredError extends Error {}

/** For actions / route handlers: throws. */
export async function requireAdmin(min: AdminRole = "VOLUNTEER") {
  const admin = await getAdmin();
  if (!admin || RANK[admin.role] < RANK[min]) throw new AdminRequiredError("Not authorized");
  return admin;
}

export async function createAdminSession(adminId: string) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + ADMIN_HOURS * 3_600_000);
  await db.adminSession.create({ data: { tokenHash: sha256(token), adminId, expiresAt } });
  (await cookies()).set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroyAdminSession() {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (token) await db.adminSession.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(ADMIN_COOKIE);
}
