-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "newsSeenAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "EipCard" ADD COLUMN     "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "leveledAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "EipCardChange" (
    "id" SERIAL NOT NULL,
    "number" INTEGER NOT NULL,
    "field" TEXT NOT NULL,
    "fromValue" TEXT,
    "toValue" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EipCardChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyChallenge" (
    "day" TEXT NOT NULL,
    "question" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyChallenge_pkey" PRIMARY KEY ("day")
);

-- CreateTable
CREATE TABLE "DailyAnswer" (
    "playerId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "choice" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyAnswer_pkey" PRIMARY KEY ("playerId","day")
);

-- CreateIndex
CREATE INDEX "EipCardChange_createdAt_idx" ON "EipCardChange"("createdAt");

-- CreateIndex
CREATE INDEX "EipCardChange_number_createdAt_idx" ON "EipCardChange"("number", "createdAt");

-- AddForeignKey
ALTER TABLE "DailyAnswer" ADD CONSTRAINT "DailyAnswer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

