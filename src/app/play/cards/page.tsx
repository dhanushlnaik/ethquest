import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { db } from "@/lib/server/db";
import { getPlayer } from "@/lib/server/session";
import { collection, dayKey, getCatalog, ownedCards, toView, unopenedPacks } from "@/lib/server/cards";
import { RARITY_STYLE } from "@/lib/cards/types";
import { Bar, cx, PixelLoader, SectionTitle } from "@/components/pixel";
import { NeedPlayer } from "@/components/need-player";
import { CardGrid, DailyPackButton, PackOpener } from "@/components/cards/card-client";
import { CardBack, PixelCard } from "@/components/cards/pixel-card";
import { ChangeStrip } from "@/components/cards/card-news";
import { recentChanges } from "@/lib/server/living-cards";
import { SITE_URL } from "@/lib/site";

export const metadata = { title: "EIP Cards" };

export default function CardsPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <SectionTitle kicker="Collect them all" title="EIP Cards">
        Every proposal is a pixel card. Open packs, complete sets, gift duplicates and battle your friends.
      </SectionTitle>
      <Suspense fallback={<PixelLoader label="Shuffling the deck" />}>
        <Collection />
      </Suspense>
    </div>
  );
}

async function Collection() {
  const player = await getPlayer();
  if (!player) return <NeedPlayer next="/play/cards" title="Start your collection" />;
  await connection();
  const [col, packs, cards, cat, daily, changes] = await Promise.all([
    collection(player.id),
    unopenedPacks(player.id),
    ownedCards(player.id),
    getCatalog(),
    db.cardPack.findUnique({ where: { playerId_key: { playerId: player.id, key: `daily:${dayKey()}` } }, select: { id: true } }),
    recentChanges({ take: 12 }),
  ]);
  return (
    <div className="space-y-6">
      <PackOpener packs={packs} shareBase={SITE_URL} nickname={player.nickname} />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
        <div className="px-panel min-w-0 p-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-pixel text-2xl">{col.owned}<span className="text-base text-muted"> / {col.total} cards</span></p>
            <span className="font-arcade text-xs text-muted">{col.duplicates} duplicates</span>
          </div>
          <Bar value={col.owned / col.total} className="mt-2" label="Collection progress" />
          <ul className="mt-3 grid grid-cols-5 gap-2 text-center">
            {col.byRarity.slice().reverse().map((r) => (
              <li key={r.rarity}>
                <p className="font-arcade text-[9px] sm:text-[10px]" style={{ color: RARITY_STYLE[r.rarity].text }}>
                  <span className="sm:hidden">{RARITY_STYLE[r.rarity].label.slice(0, 3)}</span>
                  <span className="hidden sm:inline">{RARITY_STYLE[r.rarity].label}</span>
                </p>
                <p className="font-pixel text-xs sm:text-base">{r.owned}/{r.total}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="px-panel px-panel--green flex flex-col items-start justify-center gap-2 p-4">
          <p className="font-arcade text-xs text-gold">Free every day</p>
          <DailyPackButton claimed={!!daily} />
          <Link href="/play/battle" className="px-btn px-btn--sm">⚔ Battle</Link>
        </div>
      </section>

      <ChangeStrip changes={changes} title="This week in governance" subtitle="Cards follow the real proposals: when an EIP changes status on EIPsInsight, its card levels up for everyone." />

      <section>
        <h2 className="font-pixel mb-2 text-2xl [text-shadow:0_2px_0_rgba(20,14,8,0.7)]">Sets</h2>
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {col.sets.map((s) => (
            <li key={s.slug} className={cx("px-panel min-w-0 p-3", s.complete && "px-panel--gold")}>
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-pixel text-lg">{s.complete && "★ "}{s.name}</p>
                <span className="font-arcade text-xs text-gold">{s.have}/{s.members.length}</span>
              </div>
              <p className="text-sm text-muted">{s.description}</p>
              <ul className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto pb-1">
                {s.members.map((n) => {
                  const c = cat.byNumber.get(n)!;
                  const have = col.counts.has(n);
                  return (
                    <li key={n} className="shrink-0 origin-top-left scale-[0.62]" style={{ width: 132 * 0.62, height: 210 * 0.62 }}>
                      {have ? (
                        <Link href={`/play/cards/${n}`}><PixelCard card={toView(c, { count: col.counts.get(n) })} size="sm" /></Link>
                      ) : (
                        <div title={`${c.repo === "erc" ? "ERC" : "EIP"}-${n}`}><CardBack size="sm" label={`#${n}`} /></div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-pixel mb-2 text-2xl [text-shadow:0_2px_0_rgba(20,14,8,0.7)]">Your cards</h2>
        <CardGrid cards={cards} />
      </section>
    </div>
  );
}
