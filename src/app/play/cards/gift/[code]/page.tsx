import { Suspense } from "react";
import { db } from "@/lib/server/db";
import { getPlayer } from "@/lib/server/session";
import { getCatalog, toView } from "@/lib/server/cards";
import { PixelLoader } from "@/components/pixel";
import { NeedPlayer } from "@/components/need-player";
import { PixelCard } from "@/components/cards/pixel-card";
import { ClaimGiftButton } from "@/components/cards/card-client";

export const metadata = { title: "A card for you" };

export default function GiftPage({ params }: PageProps<"/play/cards/gift/[code]">) {
  return (
    <div className="mx-auto max-w-md pt-4 text-center">
      <Suspense fallback={<PixelLoader label="Unwrapping" />}>
        <Gift params={params} />
      </Suspense>
    </div>
  );
}

async function Gift({ params }: { params: PageProps<"/play/cards/gift/[code]">["params"] }) {
  const code = (await params).code.toUpperCase();
  const trade = await db.cardTrade.findUnique({ where: { code }, include: { from: { select: { nickname: true } } } });
  if (!trade) return <p className="font-pixel text-xl">This gift code doesn&apos;t exist.</p>;
  const card = (await getCatalog()).byNumber.get(trade.number)!;
  const player = await getPlayer();
  return (
    <div className="space-y-4">
      <p className="font-arcade text-xs text-gold">A gift from {trade.from.nickname}</p>
      <div className="flex justify-center"><PixelCard card={toView(card)} size="lg" dim={trade.status !== "OPEN"} /></div>
      {trade.status !== "OPEN" ? (
        <p className="font-pixel text-lg">This gift was already {trade.status === "CLAIMED" ? "claimed" : "cancelled"}.</p>
      ) : player ? (
        <ClaimGiftButton code={code} />
      ) : (
        <NeedPlayer next={`/play/cards/gift/${code}`} title="Start playing to claim it" />
      )}
    </div>
  );
}
