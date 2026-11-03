"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { cancelGift, claimDailyPack, claimGift, createGift, markNewsSeen, openPackAction } from "@/app/actions/cards";
import { play } from "@/lib/audio";
import { cardLabel, RARITY_STYLE, type CardView, type Rarity } from "@/lib/cards/types";
import { ShareButtons } from "../share-buttons";

const RANK: Rarity[] = ["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"];
import { Button, cx, PixelIcon, Treasure } from "../pixel";
import { Burst } from "../burst";
import { Portal } from "../portal";
import { useFx } from "../fx";
import { CardBack, PixelCard } from "./pixel-card";

const RARITY_SFX: Record<Rarity, Parameters<typeof play>[0]> = { COMMON: "tap", UNCOMMON: "coin", RARE: "correct", EPIC: "achievement", LEGENDARY: "fanfare" };

/** Unopened packs + the reveal ceremony. */
export function PackOpener({ packs, shareBase, nickname }: { packs: { id: string; reason: string }[]; shareBase: string; nickname: string }) {
  const router = useRouter();
  const { celebrate } = useFx();
  // Packs come from the server (and refresh after claims); only the ones opened here are tracked locally.
  const [opened, setOpened] = useState<string[]>([]);
  const queue = packs.filter((p) => !opened.includes(p.id));
  const [reveal, setReveal] = useState<{ cards: CardView[]; flipped: number; sets: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const open = () =>
    start(async () => {
      const pack = queue[0];
      if (!pack) return;
      setError(null);
      play("chest");
      const res = await openPackAction(pack.id).catch(() => null);
      if (!res?.ok) return setError(res?.error ?? "Couldn't open the pack. Try again.");
      setOpened((o) => [...o, pack.id]);
      setReveal({ cards: res.data.cards, flipped: 0, sets: res.data.completedSets });
      celebrate(res.data.gains);
    });

  const flip = () => {
    if (!reveal) return;
    const next = reveal.cards[reveal.flipped];
    if (next) play(RARITY_SFX[next.rarity]);
    setReveal({ ...reveal, flipped: reveal.flipped + 1 });
  };

  const done = reveal && reveal.flipped >= reveal.cards.length;

  return (
    <section className="px-panel px-panel--gold p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-4">
        <Treasure name={queue.length ? "chest-closed" : "chest-open"} size={72} className={cx(queue.length > 0 && "anim-rattle")} />
        <div className="min-w-0 flex-1">
          <p className="font-arcade text-xs text-gold">Booster packs</p>
          <p className="font-pixel text-2xl">{queue.length ? `${queue.length} pack${queue.length === 1 ? "" : "s"} to open` : "No packs right now"}</p>
          <p className="text-sm text-muted">{queue[0] ? `Next: ${queue[0].reason}` : "Earn packs by playing quests, levelling up, battling and claiming your daily pack."}</p>
        </div>
        {queue.length > 0 && <Button size="lg" className="shine" disabled={pending || (!!reveal && !done)} onClick={open}>{pending ? "Opening…" : "Open pack"}</Button>}
      </div>
      {error && <p className="mt-2 text-red">{error}</p>}

      <Portal>
        <AnimatePresence>
          {reveal && (
            <motion.div className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-6 overflow-y-auto bg-[rgba(20,24,28,0.9)] p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="font-arcade text-sm text-[var(--gold)]">{done ? "Pack opened!" : "Tap a card to flip it"}</p>
              <div className="flex flex-wrap justify-center gap-3">
                {reveal.cards.map((c, i) => (
                  <motion.button
                    key={`${c.number}-${i}`}
                    initial={{ y: 40, opacity: 0, rotate: -4 }}
                    animate={{ y: 0, opacity: 1, rotate: 0 }}
                    transition={{ delay: i * 0.08, type: "spring", stiffness: 300, damping: 20 }}
                    onClick={() => i === reveal.flipped && flip()}
                    className="relative"
                    aria-label={i < reveal.flipped ? c.title : "Flip card"}
                  >
                    {i < reveal.flipped ? (
                      <motion.div initial={{ rotateY: 90 }} animate={{ rotateY: 0 }} transition={{ duration: 0.25 }}>
                        <PixelCard card={c} size="md" />
                        {(c.rarity === "EPIC" || c.rarity === "LEGENDARY") && <Burst icons={["star", "coin", "diamond"]} count={14} />}
                      </motion.div>
                    ) : (
                      <div className={cx(i === reveal.flipped && "anim-bob")}><CardBack size="md" label={i === reveal.flipped ? "TAP" : "EIP"} /></div>
                    )}
                  </motion.button>
                ))}
              </div>
              {done && (() => {
                const best = [...reveal.cards].sort((a, b) => RANK.indexOf(b.rarity) - RANK.indexOf(a.rarity))[0];
                if (!best || RANK.indexOf(best.rarity) < RANK.indexOf("EPIC")) return null;
                return (
                  <div className="px-panel px-4 py-3 text-center">
                    <p className="font-arcade mb-2 text-xs text-gold">Show off your {RARITY_STYLE[best.rarity].label} pull</p>
                    <ShareButtons url={`${shareBase}/s/card/${best.number}?by=${encodeURIComponent(nickname)}`} title={`I just pulled a ${RARITY_STYLE[best.rarity].label} card: ${cardLabel(best)} "${best.title}" on ETHQuest by @EIPsInsight`} label="Share pull" />
                  </div>
                );
              })()}
              {done && reveal.sets.length > 0 && (
                <p className="px-panel px-panel--gold anim-pop px-4 py-2 text-center font-pixel text-lg">Set complete: {reveal.sets.join(", ")}!</p>
              )}
              {done ? (
                <div className="flex gap-3">
                  {queue.length > 0 && <Button onClick={() => { setReveal(null); open(); }}>Open next ({queue.length})</Button>}
                  <Button tone="ghost" onClick={() => { setReveal(null); router.refresh(); }}>Done</Button>
                </div>
              ) : (
                <Button tone="ghost" size="sm" onClick={() => { const left = reveal.cards.slice(reveal.flipped); left.forEach((c, i) => setTimeout(() => play(RARITY_SFX[c.rarity]), i * 120)); setReveal({ ...reveal, flipped: reveal.cards.length }); }}>Flip all</Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Portal>
    </section>
  );
}

export function DailyPackButton({ claimed }: { claimed: boolean }) {
  const router = useRouter();
  const [done, setDone] = useState(claimed);
  const [pending, start] = useTransition();
  if (done) return <span className="font-arcade text-xs text-muted">Daily pack claimed · back tomorrow</span>;
  return (
    <Button tone="green" size="sm" disabled={pending} onClick={() => start(async () => {
      const res = await claimDailyPack().catch(() => null);
      if (res?.ok) { play("unlock"); setDone(true); router.refresh(); }
    })}>
      <PixelIcon name="gift" size={16} /> Claim daily pack
    </Button>
  );
}

const FILTERS: (Rarity | "ALL")[] = ["ALL", "LEGENDARY", "EPIC", "RARE", "UNCOMMON", "COMMON"];

/** Your cards with a rarity filter. */
export function CardGrid({ cards }: { cards: CardView[] }) {
  const [filter, setFilter] = useState<Rarity | "ALL">("ALL");
  const shown = filter === "ALL" ? cards : cards.filter((c) => c.rarity === filter);
  return (
    <div>
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-2">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cx("px-btn px-btn--sm shrink-0 !min-h-[36px] !text-[0.75rem]", filter === f ? "px-btn--gold" : "px-btn--ghost")}>
            {f === "ALL" ? `All ${cards.length}` : `${RARITY_STYLE[f].label} ${cards.filter((c) => c.rarity === f).length}`}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="mt-3 text-muted">No cards here yet. Open packs to find some!</p>
      ) : (
        <ul className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))] justify-items-center gap-3">
          {shown.map((c) => (
            <li key={c.number}>
              <Link href={`/play/cards/${c.number}`} className="block transition-transform hover:-translate-y-1"><PixelCard card={c} size="sm" /></Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Gift a duplicate: reserves one copy and shows a QR a friend can scan. */
export function GiftButton({ number, count }: { number: number; count: number }) {
  const router = useRouter();
  const [gift, setGift] = useState<{ code: string; url: string; qrSvg: string } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (count < 2) return <p className="text-sm text-muted">Get a duplicate to gift this card to a friend.</p>;
  return (
    <>
      <Button tone="green" disabled={pending} onClick={() => start(async () => {
        const res = await createGift(number).catch(() => null);
        if (!res?.ok) return setMsg(res?.error ?? "Couldn't create the gift.");
        play("coins");
        setGift(res.data);
      })}>
        <PixelIcon name="gift" size={18} /> Gift a duplicate
      </Button>
      {msg && <p className="mt-2 text-red">{msg}</p>}
      <Portal>
        {gift && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[rgba(20,24,28,0.88)] p-4" role="dialog" aria-label="Gift QR">
            <div className="px-panel px-panel--gold anim-pop-in w-full max-w-sm p-5 text-center">
              <p className="font-arcade text-xs text-gold">Show this to a friend</p>
              <div className="mx-auto mt-3 aspect-square w-full max-w-[240px] bg-[#fff8e8] p-2 [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: gift.qrSvg }} />
              <p className="font-arcade mt-3 text-2xl tracking-[0.3em]">{gift.code}</p>
              <p className="mt-2 text-sm text-muted">They scan it and the card moves to their collection. Unclaimed gifts come back after 24h.</p>
              <div className="mt-4 flex gap-2">
                <Button tone="ghost" size="sm" className="flex-1" onClick={() => start(async () => { await cancelGift(gift.code); setGift(null); router.refresh(); })}>Cancel gift</Button>
                <Button size="sm" className="flex-1" onClick={() => { setGift(null); router.refresh(); }}>Done</Button>
              </div>
            </div>
          </div>
        )}
      </Portal>
    </>
  );
}

export function ClaimGiftButton({ code }: { code: string }) {
  const [card, setCard] = useState<CardView | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (card) {
    return (
      <div className="relative flex flex-col items-center gap-3">
        <Burst icons={["star", "coin"]} count={12} />
        <PixelCard card={card} size="lg" />
        <p className="font-pixel text-xl">It&apos;s yours!</p>
        <Link href="/play/cards" className="px-btn px-btn--gold">See your collection</Link>
      </div>
    );
  }
  return (
    <div className="text-center">
      <Button size="lg" className="shine" disabled={pending} onClick={() => start(async () => {
        const res = await claimGift(code).catch(() => null);
        if (!res?.ok) return setMsg(res?.error ?? "Couldn't claim this gift.");
        play("fanfare");
        setCard(res.data.card);
      })}>
        {pending ? "Claiming…" : "Claim this card"}
      </Button>
      {msg && <p className="mt-3 text-red">{msg}</p>}
    </div>
  );
}

export function MarkNewsSeen() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button tone="ghost" size="sm" disabled={pending} onClick={() => start(async () => { await markNewsSeen(); router.refresh(); })}>Got it</Button>
  );
}
