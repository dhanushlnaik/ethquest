import "server-only";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// One small pool shared by Prisma (ethquest schema) and raw read-only EIPsInsight queries.
const globalForDb = globalThis as unknown as { pool?: Pool; prisma?: PrismaClient };

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");
  const schema = process.env.ETHQUEST_SCHEMA ?? "ethquest";
  if (!/^[a-z_][a-z0-9_]*$/.test(schema)) throw new Error("Invalid ETHQUEST_SCHEMA");
  // Raw SQL resolves our tables first; EIPsInsight reads always use explicit `${EI}.table` names.
  return new Pool({ connectionString, max: Number(process.env.DB_POOL_MAX ?? 5), idleTimeoutMillis: 30_000, options: `-c search_path=${schema},public` });
}

/**
 * Schema holding EIPsInsight's tables: "public" when running on the EIPsInsight database itself,
 * or a mirrored schema (e.g. "eipsinsight") when ETHQuest runs on its own database.
 */
export const EI = process.env.EIPSINSIGHT_SCHEMA ?? "public";
if (!/^[a-z_][a-z0-9_]*$/.test(EI)) throw new Error("Invalid EIPSINSIGHT_SCHEMA");

export const pool = globalForDb.pool ?? createPool();
export const db =
  globalForDb.prisma ??
  new PrismaClient({
    adapter: new PrismaPg(pool, { schema: process.env.ETHQUEST_SCHEMA ?? "ethquest" }),
    log: ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pool = pool;
  globalForDb.prisma = db;
}

export type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];
