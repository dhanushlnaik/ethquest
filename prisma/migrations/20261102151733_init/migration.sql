-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EXPLORER', 'BUILDER', 'NERD');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('OWNER', 'ADMIN', 'VOLUNTEER');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('ISSUED', 'REDEEMED', 'VOID');

-- CreateEnum
CREATE TYPE "UpgradeStatus" AS ENUM ('LIVE', 'SCHEDULED', 'IN_DEVELOPMENT', 'PLANNED', 'SPECULATIVE');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ABANDONED');

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "avatar" TEXT NOT NULL DEFAULT 'explorer',
    "difficulty" "Difficulty" NOT NULL DEFAULT 'EXPLORER',
    "xpTotal" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "recoveryHash" TEXT,
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerSession" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mission" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "world" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "blurb" TEXT NOT NULL,
    "xpComplete" INTEGER NOT NULL DEFAULT 0,
    "xpPerCorrect" INTEGER NOT NULL DEFAULT 5,
    "config" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionAttempt" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "state" JSONB NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "maxScore" INTEGER NOT NULL DEFAULT 0,
    "hintsUsed" INTEGER NOT NULL DEFAULT 0,
    "status" "AttemptStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "MissionAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizQuestion" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "topic" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "hint" TEXT,
    "explanation" TEXT NOT NULL,
    "eipNumbers" INTEGER[],
    "upgradeSlug" TEXT,
    "learnMoreUrl" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "editedByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Upgrade" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "aka" TEXT,
    "status" "UpgradeStatus" NOT NULL,
    "activatedAt" DATE,
    "blockNumber" INTEGER,
    "forkEpoch" INTEGER,
    "layer" TEXT NOT NULL,
    "oneLiner" TEXT NOT NULL,
    "majorChanges" TEXT[],
    "eipsinsightUrl" TEXT NOT NULL,
    "glyph" TEXT NOT NULL DEFAULT 'diamond',
    "inHistoryGames" BOOLEAN NOT NULL DEFAULT true,
    "difficultyMin" "Difficulty" NOT NULL DEFAULT 'EXPLORER',
    "sourceUrl" TEXT NOT NULL,
    "editedByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Upgrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UpgradeEIP" (
    "upgradeId" TEXT NOT NULL,
    "eipNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "headline" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UpgradeEIP_pkey" PRIMARY KEY ("upgradeId","eipNumber")
);

-- CreateTable
CREATE TABLE "EIPRecord" (
    "repo" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "type" TEXT,
    "category" TEXT,
    "authors" TEXT[],
    "created" TEXT,
    "plainEnglish" TEXT,
    "funFact" TEXT,
    "upgradeSlug" TEXT,
    "curated" BOOLEAN NOT NULL DEFAULT false,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EIPRecord_pkey" PRIMARY KEY ("repo","number")
);

-- CreateTable
CREATE TABLE "EIPHunt" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "clue" TEXT NOT NULL,
    "hint" TEXT NOT NULL,
    "answer" INTEGER NOT NULL,
    "repo" TEXT NOT NULL DEFAULT 'eip',
    "difficulty" "Difficulty" NOT NULL,
    "explanation" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "EIPHunt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EIPLookup" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "repo" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "found" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EIPLookup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pathway" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "color" TEXT NOT NULL,

    CONSTRAINT "Pathway_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PathwayStep" (
    "id" TEXT NOT NULL,
    "pathwayId" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "roles" TEXT[],
    "goals" TEXT[],
    "title" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resources" JSONB NOT NULL DEFAULT '[]',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PathwayStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerPathway" (
    "id" TEXT NOT NULL,
    "shareId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "pathwayId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "interest" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerPathway_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "xpBonus" INTEGER NOT NULL DEFAULT 0,
    "isSecret" BOOLEAN NOT NULL DEFAULT false,
    "manual" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerAchievement" (
    "playerId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grantedBy" TEXT,
    "seen" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PlayerAchievement_pkey" PRIMARY KEY ("playerId","achievementId")
);

-- CreateTable
CREATE TABLE "XPTransaction" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "attemptId" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "XPTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reward" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "xpRequired" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL,
    "initialStock" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Reward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardClaim" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "rewardId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "shortCode" TEXT NOT NULL,
    "status" "ClaimStatus" NOT NULL DEFAULT 'ISSUED',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "redeemedAt" TIMESTAMP(3),
    "redeemedBy" TEXT,

    CONSTRAINT "RewardClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminSession" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "target" TEXT,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "playerId" TEXT,
    "props" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key","windowStart")
);

-- CreateIndex
CREATE UNIQUE INDEX "Player_nickname_key" ON "Player"("nickname");

-- CreateIndex
CREATE UNIQUE INDEX "Player_recoveryHash_key" ON "Player"("recoveryHash");

-- CreateIndex
CREATE INDEX "Player_xpTotal_createdAt_idx" ON "Player"("xpTotal" DESC, "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerSession_tokenHash_key" ON "PlayerSession"("tokenHash");

-- CreateIndex
CREATE INDEX "PlayerSession_playerId_idx" ON "PlayerSession"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "Mission_slug_key" ON "Mission"("slug");

-- CreateIndex
CREATE INDEX "MissionAttempt_playerId_missionId_idx" ON "MissionAttempt"("playerId", "missionId");

-- CreateIndex
CREATE INDEX "MissionAttempt_missionId_status_idx" ON "MissionAttempt"("missionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "QuizQuestion_slug_key" ON "QuizQuestion"("slug");

-- CreateIndex
CREATE INDEX "QuizQuestion_kind_difficulty_isActive_idx" ON "QuizQuestion"("kind", "difficulty", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Upgrade_slug_key" ON "Upgrade"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "EIPHunt_slug_key" ON "EIPHunt"("slug");

-- CreateIndex
CREATE INDEX "EIPLookup_playerId_idx" ON "EIPLookup"("playerId");

-- CreateIndex
CREATE INDEX "EIPLookup_repo_number_idx" ON "EIPLookup"("repo", "number");

-- CreateIndex
CREATE UNIQUE INDEX "Pathway_code_key" ON "Pathway"("code");

-- CreateIndex
CREATE INDEX "PathwayStep_pathwayId_stage_idx" ON "PathwayStep"("pathwayId", "stage");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerPathway_shareId_key" ON "PlayerPathway"("shareId");

-- CreateIndex
CREATE INDEX "PlayerPathway_playerId_idx" ON "PlayerPathway"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_slug_key" ON "Achievement"("slug");

-- CreateIndex
CREATE INDEX "XPTransaction_playerId_createdAt_idx" ON "XPTransaction"("playerId", "createdAt");

-- CreateIndex
CREATE INDEX "XPTransaction_createdAt_idx" ON "XPTransaction"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "XPTransaction_playerId_idempotencyKey_key" ON "XPTransaction"("playerId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "Reward_slug_key" ON "Reward"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "RewardClaim_tokenHash_key" ON "RewardClaim"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "RewardClaim_shortCode_key" ON "RewardClaim"("shortCode");

-- CreateIndex
CREATE INDEX "RewardClaim_playerId_idx" ON "RewardClaim"("playerId");

-- CreateIndex
CREATE INDEX "RewardClaim_status_createdAt_idx" ON "RewardClaim"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AdminSession_tokenHash_key" ON "AdminSession"("tokenHash");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "Event_name_createdAt_idx" ON "Event"("name", "createdAt");

-- AddForeignKey
ALTER TABLE "PlayerSession" ADD CONSTRAINT "PlayerSession_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionAttempt" ADD CONSTRAINT "MissionAttempt_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionAttempt" ADD CONSTRAINT "MissionAttempt_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpgradeEIP" ADD CONSTRAINT "UpgradeEIP_upgradeId_fkey" FOREIGN KEY ("upgradeId") REFERENCES "Upgrade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EIPLookup" ADD CONSTRAINT "EIPLookup_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PathwayStep" ADD CONSTRAINT "PathwayStep_pathwayId_fkey" FOREIGN KEY ("pathwayId") REFERENCES "Pathway"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerPathway" ADD CONSTRAINT "PlayerPathway_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerPathway" ADD CONSTRAINT "PlayerPathway_pathwayId_fkey" FOREIGN KEY ("pathwayId") REFERENCES "Pathway"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerAchievement" ADD CONSTRAINT "PlayerAchievement_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerAchievement" ADD CONSTRAINT "PlayerAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XPTransaction" ADD CONSTRAINT "XPTransaction_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardClaim" ADD CONSTRAINT "RewardClaim_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardClaim" ADD CONSTRAINT "RewardClaim_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "Reward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminSession" ADD CONSTRAINT "AdminSession_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ===== Hand-written integrity guards =====
-- Inventory can never go negative, even if application code has a bug.
ALTER TABLE "Reward" ADD CONSTRAINT "Reward_stock_nonnegative" CHECK ("stock" >= 0);

-- A player holds at most one live (ISSUED or REDEEMED) claim per reward.
CREATE UNIQUE INDEX "RewardClaim_one_live_per_player" ON "RewardClaim" ("playerId", "rewardId") WHERE "status" <> 'VOID';

-- Live upgrades must carry a verified activation date; non-live ones are never presented as dated facts.
ALTER TABLE "Upgrade" ADD CONSTRAINT "Upgrade_live_has_date" CHECK ("status" <> 'LIVE' OR "activatedAt" IS NOT NULL);

-- XP ledger is append-only: rows can be inserted (or removed with their player), never edited.
CREATE OR REPLACE FUNCTION xp_ledger_no_update() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'XPTransaction is append-only';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "XPTransaction_no_update" BEFORE UPDATE ON "XPTransaction"
  FOR EACH ROW EXECUTE FUNCTION xp_ledger_no_update();
