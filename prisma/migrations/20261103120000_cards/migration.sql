-- CreateEnum
CREATE TYPE "CardRarity" AS ENUM ('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY');

-- CreateEnum
CREATE TYPE "CardTradeStatus" AS ENUM ('OPEN', 'CLAIMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CardBattleStatus" AS ENUM ('OPEN', 'DONE', 'CANCELLED');

-- CreateTable
CREATE TABLE "EipCard" (
    "number" INTEGER NOT NULL,
    "repo" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "category" TEXT,
    "type" TEXT,
    "year" INTEGER,
    "upgrade" TEXT,
    "rarity" "CardRarity" NOT NULL,
    "lore" INTEGER NOT NULL,
    "buzz" INTEGER NOT NULL,
    "links" INTEGER NOT NULL,
    "stage" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EipCard_pkey" PRIMARY KEY ("number")
);

-- CreateTable
CREATE TABLE "CardSet" (
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CardSet_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "CardSetMember" (
    "setSlug" TEXT NOT NULL,
    "number" INTEGER NOT NULL,

    CONSTRAINT "CardSetMember_pkey" PRIMARY KEY ("setSlug","number")
);

-- CreateTable
CREATE TABLE "PlayerCard" (
    "playerId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "firstAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerCard_pkey" PRIMARY KEY ("playerId","number")
);

-- CreateTable
CREATE TABLE "CardPack" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "cards" INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openedAt" TIMESTAMP(3),

    CONSTRAINT "CardPack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardTrade" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT,
    "number" INTEGER NOT NULL,
    "status" "CardTradeStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CardTrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardBattle" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "challengerId" TEXT NOT NULL,
    "challengerCards" INTEGER[],
    "opponentId" TEXT,
    "opponentCards" INTEGER[],
    "vsBot" BOOLEAN NOT NULL DEFAULT false,
    "rounds" JSONB,
    "winnerId" TEXT,
    "status" "CardBattleStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "CardBattle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EipCard_rarity_idx" ON "EipCard"("rarity");

-- CreateIndex
CREATE INDEX "PlayerCard_number_idx" ON "PlayerCard"("number");

-- CreateIndex
CREATE INDEX "CardPack_playerId_openedAt_idx" ON "CardPack"("playerId", "openedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CardPack_playerId_key_key" ON "CardPack"("playerId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "CardTrade_code_key" ON "CardTrade"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CardBattle_code_key" ON "CardBattle"("code");

-- CreateIndex
CREATE INDEX "CardBattle_challengerId_createdAt_idx" ON "CardBattle"("challengerId", "createdAt");

-- CreateIndex
CREATE INDEX "CardBattle_opponentId_createdAt_idx" ON "CardBattle"("opponentId", "createdAt");

-- AddForeignKey
ALTER TABLE "CardSetMember" ADD CONSTRAINT "CardSetMember_setSlug_fkey" FOREIGN KEY ("setSlug") REFERENCES "CardSet"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardSetMember" ADD CONSTRAINT "CardSetMember_number_fkey" FOREIGN KEY ("number") REFERENCES "EipCard"("number") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerCard" ADD CONSTRAINT "PlayerCard_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerCard" ADD CONSTRAINT "PlayerCard_number_fkey" FOREIGN KEY ("number") REFERENCES "EipCard"("number") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardPack" ADD CONSTRAINT "CardPack_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardTrade" ADD CONSTRAINT "CardTrade_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardTrade" ADD CONSTRAINT "CardTrade_toId_fkey" FOREIGN KEY ("toId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardBattle" ADD CONSTRAINT "CardBattle_challengerId_fkey" FOREIGN KEY ("challengerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardBattle" ADD CONSTRAINT "CardBattle_opponentId_fkey" FOREIGN KEY ("opponentId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

