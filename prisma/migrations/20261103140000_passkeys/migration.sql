-- CreateTable
CREATE TABLE "Passkey" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "publicKey" BYTEA NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "transports" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "Passkey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Passkey_playerId_idx" ON "Passkey"("playerId");

-- AddForeignKey
ALTER TABLE "Passkey" ADD CONSTRAINT "Passkey_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

