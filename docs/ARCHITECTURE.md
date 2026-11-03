# ETHQuest by EIPsInsight — Architecture & Implementation Plan

> Protocol Playground for the EIPsInsight Impact Booth, Devcon 8 Mumbai (Nov 3–6, 2026).
> Status: **Phases 1–6 implemented** (Nov 2, 2026). This file is the living source of truth for how the app is built.
>
> Changes from the original proposal, decided during the build:
> - **Database:** ETHQuest runs inside the EIPsInsight Postgres in its own `ethquest` schema. The pool's `search_path` is `ethquest,public`; EIPsInsight tables are read-only and always referenced as `public.*`.
> - **EIP data** comes straight from EIPsInsight's tables (no `EIPRecord` cache needed). `EIPRecord` only holds curated plain-English blurbs.
> - **Core Dev Insider** is generated live from `protocol_calls.key_decisions`, not hand-curated.
> - **Deployment:** the DB host (`ba-data`) is only reachable over Tailscale and has ~280 ms RTT from outside, so deploy ETHQuest next to it (same box/PM2 setup as eipsinsight-v4) rather than on Vercel, or expose a pooled TLS endpoint first.
> - **NFT:** eligibility only (the 60 XP "Collectible + NFT eligibility" tier). No wallet connection anywhere.

---

## 1. Product understanding

A phone-first, pixel-art game universe reached by scanning a QR code at the booth. No sign-up, no wallet.
A visitor gets an anonymous player session instantly, explores **five worlds**, plays 1–3 minute games
whose difficulty adapts to them (Explorer / Builder / Protocol Nerd), and earns **server-verified XP**.
XP unlocks levels, badges and **physical swag** that a volunteer redeems by scanning a **single-use QR**.

Every game ends by pointing at a real EIPsInsight page (`/eips/4844`, `/upgrade/pectra`, `/calls/...`,
`/decisions`), so the session turns into product discovery.

The emotional target is "I played a tiny indie game and accidentally learned what a blob is". It should not feel like a quiz website.

Constraints I am designing around:

| Constraint | Consequence |
|---|---|
| Booth Wi-Fi / mobile data will be bad | Small JS, static shell prerendered (Cache Components), assets as optimized WebP/SVG, PWA offline shell, every mutation idempotent + retryable |
| Hundreds of concurrent phones in bursts | Stateless Next.js on Vercel, Postgres as the only stateful dependency, pooled connections |
| People will try to farm XP / double-claim swag | XP only ever computed server-side, ledger with unique idempotency keys, atomic conditional updates for redemption |
| Technical accuracy matters (this is EIPsInsight's brand) | Ethereum facts live in seeded, source-cited DB rows; live EIP lookups come from EIPsInsight's own API; future upgrades carry an explicit `confirmed / scheduled / planned / speculative` status |
| No Supabase / Firebase | Plain PostgreSQL + Prisma 7 (`@prisma/adapter-pg`), our own sessions, our own auth |

## 2. Environment findings (inspected, not assumed)

- **ethquest repo**: fresh `create-next-app`: **Next.js 16.4.4, React 19.3, Tailwind v4**, pnpm,
  `cacheComponents: true`, `partialPrefetching: true`, Turbopack. I read the bundled docs in
  `node_modules/next/dist/docs/` before planning. Implications:
  - `middleware.ts` is now **`proxy.ts`**.
  - All request APIs (`cookies()`, `headers()`, `params`) are async.
  - With Cache Components, reading the session cookie outside a `<Suspense>` boundary is a **build error**. Player-specific UI streams in behind boundaries, and the world map, game shells and copy prerender into the static shell.
  - Cache helpers are `'use cache'`, `'use cache: private'`, `cacheTag`, `cacheLife`, `updateTag`/`revalidateTag`.
  - PWA: `app/manifest.ts` + a hand-written service worker (no next-pwa plugin needed).
- **EIPsInsight (local `eipsinsight-v4`, live at eipsinsight.com)**:
  - Live public RPC works without auth:
    `POST https://eipsinsight.com/rpc/proposals/getProposal` body `{"json":{"repo":"eip","number":4844}}`
    returns title, authors, created, type, category, status, discussions_to, requires. ✔ verified.
  - Canonical page URLs: `/eips/{n}`, `/ercs/{n}`, `/rips/{n}`, `/upgrade/{slug}` (e.g. `cancun` = Dencun),
    `/upgrade/devnets`, `/calls/{series}/{number}`, `/decisions`, `/explore`, `/analytics`, `/blobs`, `/aa`.
  - `src/data/network-upgrades.ts` holds block-number/epoch-level activation data for every fork from Frontier to BPO2. I use it as the seed source and cross-check against ethereum.org.
  - `src/data/upgrade-registry.ts` holds upgrade narratives and status for Glamsterdam and Hegotá, used for "What comes next?". Neither has a date shown as fact.
- **PixelLab MCP**: registered in local config, but its tools only load in a **new session** (see §6).
- Tooling: Node 25, pnpm 10, `psql` and `bun` available. No `gh` CLI (not needed).

## 3. Recommended architecture

```
Phone ──► Vercel (Next.js 16 App Router)
           ├─ proxy.ts ............ admin route gate (optimistic cookie check), security headers
           ├─ RSC pages ........... static shell (worlds, game chrome) + streamed player HUD
           ├─ Server Actions ...... game moves (answer, submit timeline, choose path) — Zod-validated
           ├─ Route Handlers ...... /api/claim/*, /api/admin/*, /api/og/* (share cards), /api/health
           ├─ lib/server/* ........ Data Access Layer: session, xp, missions, rewards (server-only)
           └─ Prisma 7 + pg adapter ─► PostgreSQL (yours)
                                   └─► eipsinsight.com/rpc (EIP lookups, cached 1 day, curated fallback)
```

Key decisions:

1. **One Next.js app** for players, volunteers and admins. Admin lives under `/booth-admin`, gated twice: `proxy.ts` for a fast redirect, then the DAL for real authorization. No separate backend service.
2. **Server Actions for gameplay, Route Handlers for machine-ish endpoints.** Volunteers' scanner, OG images, health check and the kiosk SSE feed are route handlers.
3. **The server owns every game round.** Starting a game creates a `MissionAttempt` holding the server-chosen question IDs and a seed. The client never receives correct answers before submitting. Scoring and XP are computed in one DB transaction.
4. **XP is an append-only ledger** (`XPTransaction`) with a unique `idempotencyKey`, e.g. `mission:guess-that-eip:first-complete`, `attempt:<id>:q:<n>`. Replays still play, but award only what remains under per-mission caps. `Player.xpTotal` is a denormalized counter updated **in the same transaction** for a cheap leaderboard. A script reconciles it with `SUM(ledger)`.
5. **Rate limiting with no Redis.** Postgres fixed-window counters (`RateLimit` table, `INSERT … ON CONFLICT DO UPDATE … RETURNING`) on session creation, answers, EIP lookups, nickname changes and claim scans. Vercel's firewall handles the coarse layer.
6. **Sessions**:
   - Player: 32 random bytes in an HTTP-only, `Secure`, `SameSite=Lax` cookie (`eq_sid`). Only the **SHA-256 hash** is stored in `PlayerSession`. 60-day expiry, so returning on Day 3 keeps progress. A "recovery code" (8-char) lets a player move to another device.
   - Admin: separate cookie (`eq_admin`) with the same hashed-token approach. 12h expiry. Passwords hashed with Node `crypto.scrypt` (no native deps). Roles: `OWNER`, `ADMIN`, `VOLUNTEER`.
7. **Redemption is atomic.** In one transaction:
   - `UPDATE "RewardClaim" SET status='REDEEMED' … WHERE tokenHash=$1 AND status='ISSUED' AND expiresAt>now()`
   - `UPDATE "Reward" SET stock=stock-1 WHERE id=$2 AND stock>0`

   Both must affect exactly one row, otherwise the transaction rolls back. A `CHECK (stock >= 0)` constraint is the backstop. Every scan, success or failure, writes an `AuditLog`.
8. **Content in Postgres, seeded from typed source files** (`prisma/seed/*.ts`). Every factual row carries `sourceUrl` and `verifiedAt`. Admins edit it in the dashboard, and a re-seed never overwrites admin edits (upsert by stable `slug`, skip if `editedByAdmin`).
9. **EIP data**: `EIPRecord` cache table. Lookup order: DB cache (fresh < 24h) → EIPsInsight RPC → `ethereum/EIPs` raw front-matter on GitHub → "not found" state. A curated set of ~120 notable EIPs/ERCs is pre-seeded, so Find Your EIP works fully offline from upstream.
10. **Analytics** goes to our own `Event` table: event name, anonymous player id, JSON props. No third-party trackers and no PII. The admin analytics page queries it directly.

## 4. Library choices (latest stable, pinned at install)

| Need | Choice | Why |
|---|---|---|
| ORM | `prisma@7` + `@prisma/client` + `@prisma/adapter-pg` + `pg` | Same as eipsinsight-v4; standard Postgres |
| Validation | `zod@4` | Server Actions + route handlers |
| Animation | `motion` (successor package of Framer Motion, `motion/react`) | XP pops, level-ups, map transitions |
| Drag & drop | `@dnd-kit/core` + `@dnd-kit/sortable` | Touch + keyboard sensors; tap-to-swap fallback on top |
| UI primitives | shadcn/ui (Radix), restyled into the pixel design system | Dialogs, sheets, tabs, admin tables |
| QR render | `qrcode` | Claim QR + "revisit your pathway" QR |
| QR scan (volunteer) | native `BarcodeDetector` → `qr-scanner` fallback | Works on iOS Safari + Android |
| Share cards | `next/og` `ImageResponse` | Pathway card / Builder DNA card as PNG |
| Sound | Tiny WebAudio synth (own code, ~2 KB) | 8-bit blips without shipping audio files; muted by default |
| Nickname moderation | `obscenity` + custom Ethereum-aware allow/deny list | Small, English-focused, with admin override |
| Tests | `vitest` (XP engine, scoring, redemption race), `@playwright/test` (mobile flows) | |

## 5. Folder structure

```
ethquest/
├─ docs/ARCHITECTURE.md · docs/CONTENT-SOURCES.md · docs/BOOTH-RUNBOOK.md
├─ prisma/
│  ├─ schema.prisma
│  ├─ migrations/ (incl. raw SQL: CHECK stock>=0, partial indexes)
│  └─ seed/ index.ts · questions.ts · fakes.ts · upgrades.ts · eips.ts · pathways.ts
│           achievements.ts · rewards.ts · missions.ts · insider.ts · dna.ts
├─ prisma.config.ts
├─ public/
│  ├─ assets/            ← the asset pack (see §8) + README.md inventory
│  ├─ sw.js              ← service worker (offline shell + asset cache)
│  └─ icons/             ← PWA icons
├─ scripts/
│  ├─ gen-pixel-assets.ts   ← programmatic sprite/badge/tile generator (SVG → WebP)
│  └─ reconcile-xp.ts
└─ src/
   ├─ proxy.ts
   ├─ app/
   │  ├─ layout.tsx · manifest.ts · page.tsx (→ title screen) · globals.css
   │  ├─ (game)/play/
   │  │  ├─ layout.tsx            ← HUD (XP bar, level, mode switch) behind Suspense
   │  │  ├─ page.tsx              ← title screen / "START EXPLORING"
   │  │  ├─ worlds/page.tsx       ← world map
   │  │  ├─ arcade/ · guess-that-eip/ · spot-the-fake/ · fork-detective/
   │  │  ├─ upgrade-lab/ (page, timeline/, missing-piece/, match/, next/)
   │  │  ├─ eip-explorer/ · find-your-eip/
   │  │  ├─ pathfinder/ (page, result/[shareId]/)
   │  │  ├─ protocol-hq/ · core-dev-insider/ · personality/
   │  │  ├─ leaderboard/ · profile/ · rewards/ · claim/[claimId]/
   │  │  └─ recover/
   │  ├─ (share)/p/[shareId]/page.tsx   ← public pathway / DNA card page (QR target)
   │  ├─ (admin)/booth-admin/
   │  │  ├─ login/ · page.tsx (ops overview)
   │  │  ├─ scan/ ← volunteer QR scanner (mobile)
   │  │  ├─ players/ missions/ questions/ upgrades/ pathways/ rewards/
   │  │  ├─ redemptions/ achievements/ analytics/ staff/ settings/ booth-activities/
   │  ├─ kiosk/leaderboard/page.tsx    ← big-screen live leaderboard (token-gated URL)
   │  └─ api/ claim/ · admin/ · og/ · kiosk/stream · health
   ├─ components/
   │  ├─ pixel/   PixelPanel, PixelButton, PixelBorder, Sprite, XPBar, LevelBadge,
   │  │           MissionMarker, Toast, Dialog, Tabs, Loading, Empty, Stamp
   │  ├─ fx/      XPBurst, LevelUp, AchievementUnlock, CorrectFX, WrongFX, Confetti, Scanlines
   │  ├─ world/   WorldMap, WorldPortal, WorldScene
   │  ├─ games/   quiz/, spot-fake/, matcher/, timeline/, eip-lookup/, pathfinder/, insider/, dna/
   │  └─ admin/   DataTable, forms
   ├─ lib/
   │  ├─ server/  db.ts · session.ts · admin-auth.ts · dal.ts · xp.ts · levels.ts · achievements.ts
   │  │           missions.ts · rewards.ts · claims.ts · rate-limit.ts · eip-source.ts
   │  │           moderation.ts · analytics.ts · audit.ts
   │  ├─ games/   pure, unit-tested logic: quiz-scoring.ts, timeline-scoring.ts, matcher.ts, pathway-engine.ts
   │  ├─ config/  xp.ts (defaults; overridable by Setting rows) · worlds.ts · difficulty.ts
   │  └─ sfx.ts · utils.ts
   └─ actions/    game.ts · player.ts · pathfinder.ts · rewards.ts · admin/*.ts
```

## 6. Database schema (Prisma, abridged; full file comes in Phase 1)

```prisma
enum Difficulty   { EXPLORER BUILDER NERD }
enum AdminRole    { OWNER ADMIN VOLUNTEER }
enum ClaimStatus  { ISSUED REDEEMED EXPIRED VOID }
enum UpgradeStatus{ LIVE SCHEDULED IN_DEVELOPMENT PLANNED SPECULATIVE }  // only LIVE has a "fact" date
enum MissionKind  { QUIZ SPOT_FAKE MATCH TIMELINE MISSING_PIECE UPGRADE_MATCH PREDICT EIP_LOOKUP EIP_HUNT PATHFINDER INSIDER DNA HQ_TOUR BOOTH }

model Player {
  id            String   @id @default(cuid())
  nickname      String   @unique            // auto "Blobby-Validator-42", editable + moderated
  avatar        String                      // character key
  difficulty    Difficulty @default(EXPLORER)
  xpTotal       Int      @default(0)        // denormalized; ledger is truth
  level         Int      @default(1)
  recoveryHash  String?  @unique
  isBanned      Boolean  @default(false)
  createdAt     DateTime @default(now())
  sessions PlayerSession[]  xp XPTransaction[]  attempts MissionAttempt[]
  achievements PlayerAchievement[]  claims RewardClaim[]  pathways PlayerPathway[]
  @@index([xpTotal(sort: Desc), createdAt])                        // leaderboard
}
model PlayerSession { id String @id @default(cuid()); tokenHash String @unique; playerId String; expiresAt DateTime; lastSeenAt DateTime; uaHash String? ; @@index([playerId]) }

model Mission {                      // a playable unit inside a world
  id String @id @default(cuid())
  slug String @unique                // "guess-that-eip", "timeline-rebuild", "hunt-blobs"
  world String                       // arcade | upgrade-lab | eip-explorer | pathfinder | protocol-hq
  kind MissionKind
  title String  blurb String
  xpComplete Int  xpPerCorrect Int  dailyCap Int?   // anti-farm caps
  config Json                        // timer secs, question count, etc.
  isActive Boolean @default(true)  sortOrder Int
}
model MissionAttempt {
  id String @id @default(cuid())
  playerId String  missionId String  difficulty Difficulty
  state Json                         // server-held: question ids, order seed, per-step answers
  score Int @default(0)  maxScore Int  hintsUsed Int @default(0)
  status String                      // ACTIVE | COMPLETED | ABANDONED
  startedAt DateTime @default(now())  completedAt DateTime?
  @@index([playerId, missionId])  @@index([missionId, status])
}

model QuizQuestion {
  id String @id @default(cuid())
  slug String @unique  kind String           // trivia | scenario | spot-fake | match-pair | insider
  difficulty Difficulty  topic String  prompt String
  options Json                               // [{id,label,isCorrect,isFake?,explain?}]
  hint String?  explanation String
  eipNumbers Int[]  upgradeSlug String?  learnMoreUrl String
  sourceUrl String  verifiedAt DateTime  isActive Boolean @default(true)  editedByAdmin Boolean @default(false)
  @@index([kind, difficulty, isActive])
}

model Upgrade {
  id String @id @default(cuid())
  slug String @unique  name String  aka String?        // "Dencun" aka "Cancun-Deneb"
  status UpgradeStatus  activatedAt DateTime?          // required when LIVE (enforced in Zod + CHECK)
  blockNumber Int?  forkEpoch Int?  layer String        // execution | consensus | both
  oneLiner String  majorChanges String[]  eipsinsightUrl String
  inHistoryGames Boolean @default(true)  sortKey Int  sourceUrl String  verifiedAt DateTime?
  eips UpgradeEIP[]
}
model UpgradeEIP { upgradeId String; eipNumber Int; headline Boolean @default(false); @@id([upgradeId, eipNumber]) }

model EIPRecord {
  number Int  repo String  // eip | erc | rip
  title String  status String  type String?  category String?  authors String[]
  created String?  description String?  requires Int[]  discussionsTo String?
  funFact String?  curated Boolean @default(false)  fetchedAt DateTime  source String
  @@id([repo, number])  @@index([status])
}

model Pathway { id String @id @default(cuid()); slug String @unique; code String /*A|B|C|D*/; title String; summary String; steps PathwayStep[] }
model PathwayStep {
  id String @id @default(cuid())  pathwayId String  stage String  // START|EXPLORE|PARTICIPATE|CONTRIBUTE|NEXT
  roles String[]  interests String[]  goals String[]             // targeting; empty = any
  title String  action String  resources Json                    // [{label,url,kind}]
  sortOrder Int
}
model PlayerPathway { id String @id @default(cuid()); shareId String @unique; playerId String; role String; interest String; goal String; pathwayId String; snapshot Json; createdAt DateTime @default(now()) }

model Achievement { id String @id @default(cuid()); slug String @unique; name String; description String; icon String; xpBonus Int @default(0); rule Json; isSecret Boolean @default(false) }
model PlayerAchievement { playerId String; achievementId String; unlockedAt DateTime @default(now()); grantedBy String?; @@id([playerId, achievementId]) }

model XPTransaction {               // append-only: no UPDATE/DELETE from app code
  id String @id @default(cuid())
  playerId String  amount Int  reason String  missionId String?  attemptId String?
  idempotencyKey String  createdAt DateTime @default(now())  createdBy String?  // admin id for manual grants
  @@unique([playerId, idempotencyKey])  @@index([playerId, createdAt])
}

model Reward { id String @id @default(cuid()); slug String @unique; name String; tier Int; xpRequired Int; stock Int; initialStock Int; icon String; isActive Boolean; perPlayerLimit Int @default(1) }
model RewardClaim {
  id String @id @default(cuid())  playerId String  rewardId String
  tokenHash String @unique  shortCode String @unique   // manual fallback e.g. "K7Q-4MX"
  status ClaimStatus @default(ISSUED)  expiresAt DateTime
  redeemedAt DateTime?  redeemedBy String?
  @@unique([playerId, rewardId, status])   // + partial unique index: one non-VOID claim per player/reward
}

model AdminUser { id String @id @default(cuid()); email String @unique; name String; role AdminRole; passwordHash String; isActive Boolean; sessions AdminSession[] }
model AdminSession { id String @id @default(cuid()); tokenHash String @unique; adminId String; expiresAt DateTime }
model AuditLog { id String @id @default(cuid()); actorType String; actorId String?; action String; target String?; meta Json; ip String?; createdAt DateTime @default(now()); @@index([action, createdAt]) }
model Event    { id BigInt @id @default(autoincrement()); name String; playerId String?; props Json; createdAt DateTime @default(now()); @@index([name, createdAt]) }
model Setting  { key String @id; value Json; updatedAt DateTime @updatedAt; updatedBy String? }   // XP values, reward tiers, timers, kiosk token
model RateLimit{ key String; windowStart DateTime; count Int; @@id([key, windowStart]) }
```

The brief's `Event` model (as in "Devcon 8") becomes a `Setting` namespace plus an `eventCode` column. The analytics table is named `Event`. If you want multi-event support later, it is a small migration.

## 7. Visual design system

**Concept:** "Ethereum at night, as a 16-bit world." Near-black skies, purple and blue neon, chunky 2px pixel borders, and readable modern type around pixel art.

| Token | Value | Use |
|---|---|---|
| `--bg-void` | `#07060d` | page |
| `--bg-panel` | `#13111f` | panels |
| `--bg-raised` | `#1d1930` | cards, inputs |
| `--line` | `#2e2849` | pixel borders (dark edge) |
| `--purple` | `#8b5cf6` → hi `#b69cff`, lo `#4c2a9e` | brand, primary buttons |
| `--blue` | `#38bdf8` → lo `#1e5f9e` | secondary, links, info |
| `--green` | `#4ade80` | correct, success |
| `--red` | `#f43f5e` | wrong (used sparingly) |
| `--gold` | `#fbbf24` → lo `#b7791f` | XP, rewards, trophies |
| `--text` / `--muted` | `#efeaff` / `#9b93b8` | |

- **Pixel palette for sprites:** a fixed 24-colour palette derived from the tokens above, used by PixelLab prompts and the generator, so every sprite matches.
- **Type:**
  - `Pixelify Sans` for display/headings, which is far more readable than Press Start 2P at small sizes.
  - `Press Start 2P` only for tiny HUD numerals and score counters.
  - `Geist` for body copy and `Geist Mono` for EIP numbers and data.
- **Grid:** 4px base unit. Sprites are drawn at 32×32 (characters), 16×16 (icons) and 64×64 (badges), always scaled by integers with `image-rendering: pixelated`.
- **Panels:** stepped "notched corner" border built with layered `box-shadow` (no images), plus a subtle inner highlight. The variants are `panel`, `card`, `dialog`, `scoreboard` and `terminal`.
- **Motion:**
  - Steps-based easing (`steps(4)`) for sprite-y things, springs for UI.
  - XP numbers count up, and level-ups get a full-screen flash, a banner and a chiptune arpeggio.
  - Respects `prefers-reduced-motion`.
- **Background:** parallax starfield + scanline overlay (CSS only) + per-world tile strip.
- **Dark only.** It's a night-world game, and contrast is checked to WCAG AA for all text.
- **Mobile first:** 375px baseline, 48px min tap targets, bottom-anchored primary actions (thumb zone), no horizontal scroll. Desktop/kiosk widens the world map into a horizontal isometric scene.

## 8. Asset creation plan

The pipeline is hybrid, to get consistency and quality within days:

| Asset group | Method | Output |
|---|---|---|
| 5 characters (Explorer, Protocol Engineer, Researcher, Builder, Governance Wizard) + 6 Pathfinder roles + 7 Builder-DNA results | **PixelLab MCP** (character generation, 4-direction + idle/walk animation), one fixed style reference + palette | 64px sprite sheets, PNG→WebP |
| 5 world scenes (Arcade, Upgrade Lab, EIP Explorer, Pathfinder, Protocol HQ) + reward shop + achievement room | **PixelLab** isometric/scene generation, then cropped & palette-snapped | WebP @1×/@2× |
| Logo treatment "PROTOCOL PLAYGROUND" | Hand-built SVG pixel lettering (crisp at all sizes) | SVG |
| Icons (games, nav, mission markers, ?-block, lock/unlock) | **Programmatic**: `scripts/gen-pixel-assets.ts` renders 16×16 pixel matrices → SVG | SVG |
| Badges (10), medals, trophies, loot box, sticker/tee/pin/NFT reward art | Programmatic pixel matrices; trophy and loot box polished via PixelLab | SVG/WebP |
| Upgrade timeline cards (Frontier→Fusaka/BPOs) | Component + per-upgrade 16×16 pixel glyph (programmatic) | SVG + React |
| Tiles, textures, borders, starfield | CSS + small SVG tiles | CSS/SVG |
| FX: correct/wrong/XP/level-up/achievement/loading | `motion` + CSS steps() sprite animation on programmatic sheets | React components |

- Everything lives in `public/assets/{characters,worlds,icons,badges,rewards,ui,fx,timeline}/`, with a
  `public/assets/README.md` inventory listing filename, dimensions, format, source (PixelLab prompt id or generator) and where it is used.
- No copyrighted game assets, and no emoji used as artwork.
- **If PixelLab is unavailable or slow**, the generator script produces the characters too, as 32×32 hand-authored pixel matrices. They will be simpler, but nothing is ever a placeholder box.

## 9. Content accuracy policy

- Upgrade dates come from EIPsInsight's `network-upgrades.ts`, cross-checked against ethereum.org's history page. Every row stores `sourceUrl`.
- Timeline games only use `status = LIVE` upgrades as "facts".
  - **What Comes Next?** uses `IN_DEVELOPMENT / PLANNED / SPECULATIVE` rows with a visible "Prediction — not confirmed roadmap" label and a pixel crystal-ball icon.
  - Glamsterdam and Hegotá ship as `IN_DEVELOPMENT` / `PLANNED` with **no date**, unless you tell me something was confirmed by ACD before Devcon.
- Spot the Fake fakes are clearly fictional numbers or concepts (e.g. "EIP-9999: Ethereum Teleportation"). The reveal always says **"This proposal does not exist."** Fakes are never written into `EIPRecord`, so search can never return one.
- Every question gets an explanation, a learn-more link to EIPsInsight and a source. I'll write the initial bank (~40 per difficulty for trivia, ~20 Spot-the-Fake triples, ~40 match pairs, ~12 Core Dev Insider challenges) and list sources in `docs/CONTENT-SOURCES.md` for your team's review.
- Core Dev Insider will only reference real call numbers and decisions taken from EIPsInsight's `/calls` and `/decisions` data or transcripts in the eipsinsight-v4 repo. I will not paraphrase decisions from memory.

## 10. XP, levels, rewards: defaults (all live-editable in `Setting`)

- **XP:**
  - attempt question 2, correct +5, correct with hint +3, trivia complete +5
  - Fork Detective 20, Timeline 20, Find an EIP 10 (cap 3 unique EIPs), Pathfinder 30, Core Dev Insider 30, Builder DNA 10
  - Difficulty multiplier on correct answers: Explorer ×1, Builder ×1.25, Nerd ×1.5
- **Anti-farm:** completion XP is awarded once per mission per difficulty, and per-answer XP is capped per mission per day. Replays are fun but give 0 XP after the cap (the UI says so).
- **Levels:** 0 / 20 / 50 / 90 / 140 / 200 / 280 XP for L1 Curious Newcomer → L7 Ecosystem Legend.
- **Rewards:**
  - 20 XP sticker, 40 sticker pack, 60 collectible/NFT eligibility, 80 premium swag
  - Each tier claimable once, with stock decremented atomically
  - Claim QR expires after 30 min (regenerable)

## 11. Implementation roadmap

| Phase | Scope | Exit criteria |
|---|---|---|
| **1 Foundation** | deps, Prisma schema + migrations, seed pipeline, design tokens, pixel component kit, asset pipeline + first assets, player session, title screen, world map, HUD, difficulty switch, PWA manifest | Scan → playable world map on a phone, session persisted, Lighthouse mobile ≥ 90 |
| **2 Core games** | Guess That EIP, Spot the Fake, Fork Detective, Timeline (Rebuild / Missing Piece / Upgrade Match / What's Next), Find Your EIP + clue hunts | All five games fully playable across all 3 difficulties, server-scored |
| **3 Pathfinder** | role → interest → goal → pathway engine, 4 pathways, result card, OG share image, QR revisit page | Card generated for every role×interest×goal combination with real links |
| **4 Gamification** | XP ledger engine, levels, achievements + unlock FX, profile, leaderboard | Vitest suite: no double XP under concurrent replays |
| **5 Booth ops** | admin auth + roles, CRUD for content, rewards & inventory, claim QR, volunteer scanner, manual code, kiosk leaderboard, booth-activity manual grants, audit log | Concurrency test: 50 parallel redeems of one token → exactly 1 success; stock never < 0 |
| **6 Extras** | Builder DNA, Core Dev Insider, Protocol HQ tours, analytics dashboard, offline polish, NFT eligibility list export | Full Playwright mobile run green; booth runbook written |

NFTs: I propose shipping **eligibility only** (an admin CSV export of opted-in players with a wallet address they paste) and minting/airdropping after Devcon. Wallet connection stays out of the critical path, as you specified.

## 12. What I need from you

1. **`DATABASE_URL`**: a PostgreSQL connection string. If it's pooled (PgBouncer/Neon/RDS proxy), also send a **direct** URL for migrations.
2. **Approval of this plan.** Specifically, confirm:
   - dark-only UI
   - the XP/level/reward numbers above as starting values
   - NFT = eligibility-only for Devcon
3. **PixelLab**: restart the Claude session (or run `/mcp` in a terminal session) so the `pixellab` tools load. Until then I'll build the programmatic asset layer, which is needed anyway.
4. **Confirmed future upgrade facts**, if any, as of Devcon (e.g. is Glamsterdam scheduled with a date?). Otherwise they ship as "in development".
5. **First admin account**: an email to seed. I generate a strong password into `.env.local`, never into git.
6. **Deployment**: the Vercel project/team you want this under, and the booth domain (e.g. `play.eipsinsight.com`) for QR codes.
