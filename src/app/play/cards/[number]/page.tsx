import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/server/db";
import { getPlayer } from "@/lib/server/session";
import { getCatalog, toView } from "@/lib/server/cards";
import { cardLabel, RARITY_STYLE, STATS } from "@/lib/cards/types";
import { eipUrl } from "@/lib/config/game";
import { PixelLoader } from "@/components/pixel";
import { PixelCard } from "@/components/cards/pixel-card";
import { GiftButton } from "@/components/cards/card-client";
import { ShareButtons } from "@/components/share-buttons";
import { SITE_URL } from "@/lib/site";

export default function CardPage({ params }: PageProps<"/play/cards/[number]">) {
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/play/cards" className="font-arcade text-xs text-muted">‹ Collection</Link>
      <Suspense fallback={<PixelLoader />}>
        <Detail params={params} />
      </Suspense>
    </div>
  );
}

async function Detail({ params }: { params: PageProps<"/play/cards/[number]">["params"] }) {
  const n = Number((await params).number);
  const card = Number.isInteger(n) ? (await getCatalog()).byNumber.get(n) : undefined;
  if (!card) notFound();
  const player = await getPlayer();
  const [mine, owners, sets] = await Promise.all([
    player ? db.playerCard.findUnique({ where: { playerId_number: { playerId: player.id, number: n } } }) : null,
    db.playerCard.count({ where: { number: n } }),
    db.cardSetMember.findMany({ where: { number: n }, include: { set: { select: { name: true } } } }),
  ]);
  const view = toView(card, { count: mine?.count ?? 0 });
  const rs = RARITY_STYLE[card.rarity];
  return (
    <div className="mt-3 grid items-start gap-6 sm:grid-cols-[auto_1fr]">
      <div className="mx-auto"><PixelCard card={view} size="lg" dim={!mine} /></div>
      <section className="px-panel p-5">
        <p className="font-arcade text-xs" style={{ color: rs.text }}>{rs.label} · {cardLabel(view)}</p>
        <h1 className="font-pixel text-2xl leading-tight">{card.title}</h1>
        <p className="mt-1 text-muted">{[card.status, card.category ?? card.type, card.year && `created ${card.year}`].filter(Boolean).join(" · ")}</p>
        {card.upgrade && <p className="mt-1">Part of the <b>{card.upgrade}</b> network upgrade.</p>}
        {sets.length > 0 && <p className="mt-1 text-sm text-muted">Sets: {sets.map((s) => s.set.name).join(", ")}</p>}
        <ul className="mt-3 space-y-1 text-sm">
          {STATS.map((s) => <li key={s.key}><b>{s.label} {card[s.key]}</b> <span className="text-muted">· {s.hint}</span></li>)}
        </ul>
        <p className="mt-3 text-sm text-muted">{mine ? `You own ${mine.count}.` : "You don't own this card yet."} {owners} collector{owners === 1 ? "" : "s"} have it.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a href={eipUrl(card.number, card.repo)} target="_blank" rel="noopener noreferrer" data-track="product" className="px-btn px-btn--gold px-btn--sm">Read it on EIPsInsight ↗</a>
        </div>
        {mine && player && (
          <div className="mt-4">
            <ShareButtons
              url={`${SITE_URL}/s/card/${n}?by=${encodeURIComponent(player.nickname)}`}
              title={`I collected ${cardLabel(view)} "${card.title}" (${rs.label}) on ETHQuest by @EIPsInsight`}
              label="Share card"
            />
          </div>
        )}
        {mine && <div className="mt-4"><GiftButton number={n} count={mine.count} /></div>}
      </section>
    </div>
  );
}
