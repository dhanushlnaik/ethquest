# ETHQuest by EIPsInsight: The Protocol Playground

A pixel-art game universe for the EIPsInsight Impact Booth at **Devcon 8, Mumbai (Nov 3–6, 2026)**.
Scan → play short games across five worlds → earn server-verified XP → collect real swag with a single-use QR.

> Explore. Play. Discover. Contribute. *"Ethereum is serious. Learning about it doesn't have to be."*

- Architecture & decisions: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Where every fact comes from: [`docs/CONTENT-SOURCES.md`](docs/CONTENT-SOURCES.md)
- Asset pack inventory: [`public/assets/README.md`](public/assets/README.md)

## Stack

Next.js 16 (App Router, Cache Components, Turbopack) · React 19 · TypeScript · Tailwind v4 · `motion` · `@dnd-kit` · Prisma 7 + `@prisma/adapter-pg` · PostgreSQL · Zod · Vitest. No Supabase/Firebase/Redis.

## Data model in one paragraph

ETHQuest lives in its **own Postgres schema, `ethquest`**, inside the EIPsInsight database. It writes only there.
It **reads** EIPsInsight's `public.eips`, `eip_snapshots`, `upgrades`, `upgrade_composition_current` and `protocol_calls` (raw SQL, `src/lib/server/eipsinsight.ts`) for live EIP lookups and real All Core Devs decisions, falling back to EIPsInsight's public RPC if the DB is unreachable.

## Run locally

```bash
pnpm install          # also runs prisma generate
```

`.env` (gitignored) needs: `DATABASE_URL`, `ETHQUEST_SCHEMA=ethquest`, `SESSION_SECRET`, `ADMIN_SEED_EMAIL`, `ADMIN_SEED_PASSWORD`, `KIOSK_TOKEN`, `NEXT_PUBLIC_SITE_URL` (and `PIXELLAB_API_KEY` only to regenerate art).

**Database layout.** ETHQuest writes only to its own `ethquest` schema. It also reads a few EIPsInsight tables
(EIPs, snapshots, upgrades, ACD calls) from the schema named by `EIPSINSIGHT_SCHEMA` (default `public`, i.e. running on
the EIPsInsight database itself). On a separate database, those tables are mirrored into an `eipsinsight` schema:

- `DATABASE_URL`: runtime connection. For servers with a self-signed TLS cert use `?uselibpqcompat=true&sslmode=require`.
- `DIRECT_DATABASE_URL`: used by the Prisma CLI (`migrate`, `studio`); `?sslmode=prefer` works there.
- `EIPSINSIGHT_SCHEMA=eipsinsight` and `EIPSINSIGHT_SOURCE_DATABASE_URL`: where the mirror reads from.
- Refresh the mirror (e.g. before each booth day, for the latest ACD decisions):
  `SOURCE_DATABASE_URL=$EIPSINSIGHT_SOURCE_DATABASE_URL TARGET_DATABASE_URL=$DATABASE_URL node scripts/move-db.mjs mirror`

```bash
pnpm prisma migrate deploy   # creates/updates the ethquest schema only
```

```bash
pnpm db:seed                 # idempotent; never overwrites admin edits or live stock
```

```bash
pnpm dev
```

```bash
pnpm test                    # unit + DB integration (redemption race, XP idempotency)
```

## Booth runbook

| What | Where |
|---|---|
| QR to print for players | `NEXT_PUBLIC_SITE_URL` + `/play` |
| Volunteer scanner | `/booth-admin/scan` (log in first, then players' QR codes open straight into it from the phone camera; 6-letter code as fallback) |
| Big-screen leaderboard | `/kiosk/leaderboard?token=$KIOSK_TOKEN` (auto-refreshes every 10s) |
| Restock / change tiers | `/booth-admin/rewards` (stock changes are relative and can't go below zero) |
| Grant EIP Wall / video badges, bonus XP | `/booth-admin/players` |
| Edit questions, upgrades, pathways, missions | `/booth-admin/*` |
| XP values, staff accounts | `/booth-admin/settings` (OWNER) |
| Shorts host prompts + consent rules | `/booth-admin/host` |

Roles: **VOLUNTEER** (scan/redeem, grant booth badges), **ADMIN** (+ content, inventory, bans), **OWNER** (+ XP config, staff).

## Security notes

- Player and staff sessions: random 256-bit tokens in HTTP-only cookies. Only SHA-256 hashes are stored.
- All scoring and XP happen on the server. Correct answers never reach the client before you answer.
- XP is an **append-only ledger** with a unique `(player, idempotencyKey)`: refreshes, double-taps and replays can't double-award. A DB trigger blocks edits.
- Redemption is a single transaction with conditional updates (`ISSUED→REDEEMED`, `stock > 0`), plus a `CHECK (stock >= 0)` constraint. Every scan is audit-logged.
- Postgres-backed rate limits on session creation, answers, lookups, claims, logins and scans.
