import { Suspense } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { getPlayer } from "@/lib/server/session";
import { ownedCards } from "@/lib/server/cards";
import { battleView } from "@/lib/server/battles";
import { PixelLoader, Sprite } from "@/components/pixel";
import { NeedPlayer } from "@/components/need-player";
import { AnswerBattle, BattleReplay, CancelBattle } from "@/components/cards/battle-client";
import { CardBack } from "@/components/cards/pixel-card";
import { SITE_URL } from "@/lib/site";

export const metadata = { title: "Battle" };

export default function BattleRoom({ params }: PageProps<"/play/battle/[code]">) {
  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/play/battle" className="font-arcade text-xs text-muted">‹ Battles</Link>
      <Suspense fallback={<PixelLoader label="Entering the arena" />}>
        <Room params={params} />
      </Suspense>
    </div>
  );
}

async function Room({ params }: { params: PageProps<"/play/battle/[code]">["params"] }) {
  const code = (await params).code.toUpperCase();
  const player = await getPlayer();
  const battle = await battleView(code, player?.id ?? null);
  if (!battle) return <p className="font-pixel mt-6 text-xl">No battle with that code.</p>;
  if (battle.status === "CANCELLED") return <p className="font-pixel mt-6 text-xl">This battle was cancelled.</p>;
  if (battle.status === "DONE") return <div className="mt-4"><BattleReplay battle={battle} viewerId={player?.id ?? null} shareBase={SITE_URL} /></div>;

  // OPEN: the challenger waits and shares; anyone else answers with 3 cards.
  if (player?.id === battle.challenger.id) {
    const url = `${SITE_URL}/play/battle/${code}`;
    const qr = await QRCode.toString(url, { type: "svg", margin: 1, color: { dark: "#2a1d12", light: "#fff8e8" } });
    return (
      <div className="px-panel px-panel--gold mx-auto mt-4 max-w-sm p-5 text-center">
        <p className="font-arcade text-xs text-gold">Waiting for a challenger</p>
        <div className="mx-auto mt-3 aspect-square w-full max-w-[220px] bg-[#fff8e8] p-2 [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: qr }} />
        <p className="font-arcade mt-3 text-3xl tracking-[0.3em]">{code}</p>
        <p className="mt-2 text-sm text-muted">Your friend scans this (or opens Battles and enters the code) and picks 3 cards. You&apos;ll see the result here.</p>
        <div className="mt-4"><CancelBattle code={code} /></div>
      </div>
    );
  }
  if (!player) return <NeedPlayer next={`/play/battle/${code}`} title="You've been challenged!" />;
  const cards = await ownedCards(player.id);
  return (
    <div className="mt-4 space-y-4">
      <div className="px-panel flex flex-wrap items-center gap-4 p-4">
        <Sprite name={battle.challenger.avatar} size={56} />
        <div className="min-w-0 flex-1">
          <p className="font-arcade text-xs text-gold">Challenge</p>
          <p className="font-pixel text-2xl">{battle.challenger.nickname} wants to battle!</p>
          <p className="text-sm text-muted">Their 3 cards are face down. Pick yours: card 1 fights round 1, and so on.</p>
        </div>
        <div className="flex gap-1">{[0, 1, 2].map((i) => <div key={i} className="origin-top scale-[0.5]" style={{ width: 66, height: 105 }}><CardBack size="sm" /></div>)}</div>
      </div>
      <AnswerBattle code={code} cards={cards} />
    </div>
  );
}
