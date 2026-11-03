import "dotenv/config";
import { defineConfig } from "prisma/config";

// Scope the CLI (migrate, studio) to the ethquest schema so it can never touch EIPsInsight's public tables.
function withSchema(url: string) {
  const u = new URL(url);
  u.searchParams.set("schema", process.env.ETHQUEST_SCHEMA ?? "ethquest");
  return u.toString();
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed/index.ts",
  },
  datasource: {
    url: withSchema(process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL!),
  },
});
