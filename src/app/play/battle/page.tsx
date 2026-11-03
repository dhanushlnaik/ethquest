import { Suspense } from "react";
import Link from "next/link";
import { getPlayer } from "@/lib/server/session";
import { ownedCards } from "@/lib/server/cards";
import { myBattles } from "@/lib/server/battles";
import { PixelLoader, SectionTitle, Tag } from "@/components/pixel";
import { NeedPlayer } from "@/components/need-player";
import { NewBattle } from "@/components/cards/battle-client";

export const metadata = { title: "Card Battles" };

export default function BattlePage() {
  return (
    <div className="mx-auto max-w-4xl">
      <SectionTitle kicker="Best of 3" title="Card Battles">
        Pick 3 EIP cards. Each round compares a hidden stat. Win 2 of 3 to take the battle.
      </SectionTitle>
      <Suspense fallback={<PixelLoader label="Shuffling decks" />}>
        <Hub />
      </Suspense>
    </div>
  );
}

async function Hub() {
  const player = await getPlayer();
  if (!player) return <NeedPlayer next="/play/battle" title="Ready to battle?" />;
  const [cards, battles] = await Promise.all([ownedCards(player.id), myBattles(player.id)]);
  return (
    <div className="space-y-6">
      <NewBattle cards={cards} />
      {battles.length > 0 && (
        <section className="px-panel p-4">
          <h2 className="font-pixel text-xl">Recent battles</h2>
          <ul className="mt-2 space-y-2">
            {battles.map((b) => {
              const won = b.winnerId === player.id;
              const vs = b.vsBot ? "The House" : b.challengerId === player.id ? b.opponent?.nickname ?? "waiting for a friend" : b.challenger.nickname;
              return (
                <li key={b.id} className="flex items-center gap-3">
                  <Link href={`/play/battle/${b.code}`} className="font-arcade text-sm underline underline-offset-4">{b.code}</Link>
                  <span className="min-w-0 flex-1 truncate">vs {vs}</span>
                  {b.status === "OPEN" ? <Tag tone="blue">Open</Tag> : won ? <Tag tone="green">Won</Tag> : b.winnerId || b.vsBot ? <Tag tone="red">Lost</Tag> : <Tag>Draw</Tag>}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
