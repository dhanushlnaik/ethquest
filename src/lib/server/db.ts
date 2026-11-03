import "server-only";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// One small pool shared by Prisma (ethquest schema) and raw read-only EIPsInsight queries (public schema).
const globalForDb = globalThis as unknown as { pool?: Pool; prisma?: PrismaClient };

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");
  const schema = process.env.ETHQUEST_SCHEMA ?? "ethquest";
  if (!/^[a-z_][a-z0-9_]*$/.test(schema)) throw new Error("Invalid ETHQUEST_SCHEMA");
  // Raw SQL resolves our tables first; EIPsInsight reads always use explicit public.* names.
  return new Pool({ connectionString, max: Number(process.env.DB_POOL_MAX ?? 5), idleTimeoutMillis: 30_000, options: `-c search_path=${schema},public` });
}

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
