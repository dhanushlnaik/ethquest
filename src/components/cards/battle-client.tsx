"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { answerBattle, startBattle, withdrawBattle } from "@/app/actions/battles";
import { music, play } from "@/lib/audio";
import { STATS, type CardView } from "@/lib/cards/types";
import type { BattleView } from "@/lib/server/battles";
import { Button, cx, PixelIcon, Sprite } from "../pixel";
import { Burst } from "../burst";
import { CardBack, PixelCard } from "./pixel-card";

/** Pick exactly 3 cards, in order: card 1 fights round 1, and so on. */
export function DeckPicker({ cards, onConfirm, confirmLabel, pending }: { cards: CardView[]; onConfirm: (n: number[]) => void; confirmLabel: string; pending?: boolean }) {
  const [picked, setPicked] = useState<number[]>([]);
  const toggle = (n: number) => {
    play("tap");
    setPicked((p) => (p.includes(n) ? p.filter((x) => x !== n) : p.length < 3 ? [...p, n] : p));
  };
  if (cards.length < 3) {
    return <p className="px-panel p-4">You need at least 3 cards to battle. <Link href="/play/cards" className="underline">Open some packs first</Link>.</p>;
  }
  return (
    <div>
      <div className="px-panel sticky top-[70px] z-20 mb-3 flex items-center gap-3 p-3">
        <span className="font-arcade text-xs text-gold">Your hand</span>
        <ol className="flex flex-1 gap-2">
          {[0, 1, 2].map((i) => (
            <li key={i} className="font-arcade grid h-10 min-w-0 flex-1 place-items-center truncate border-[3px] border-dashed border-[var(--parch-edge)] px-1 text-[11px]">
              {picked[i] ? `R${i + 1}: #${picked[i]}` : `Round ${i + 1}`}
            </li>
          ))}
        </ol>
        <Button tone="gold" size="sm" disabled={picked.length !== 3 || pending} onClick={() => onConfirm(picked)}>{pending ? "…" : confirmLabel}</Button>
      </div>
      <p className="mb-2 text-sm [text-shadow:0_1px_0_rgba(20,14,8,0.7)]">Each round compares one hidden stat (Lore, Buzz, Links or Stage). Balanced cards are safer bets.</p>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))] justify-items-center gap-3">
        {cards.map((c) => {
          const at = picked.indexOf(c.number);
          return (
            <li key={c.number}>
              <button onClick={() => toggle(c.number)} className={cx("relative block transition-transform", at >= 0 ? "-translate-y-2" : "hover:-translate-y-1")} aria-pressed={at >= 0}>
                <PixelCard card={c} size="sm" />
                {at >= 0 && <span className="font-arcade absolute -right-2 -top-2 grid h-8 w-8 place-items-center border-[3px] border-[var(--wood-dk)] bg-[var(--gold)] text-sm text-ink">{at + 1}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function NewBattle({ cards }: { cards: CardView[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<"friend" | "bot" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (!mode) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <button onClick={() => setMode("friend")} className="px-panel px-panel--gold flex items-center gap-3 p-4 text-left transition-transform hover:-translate-y-0.5">
          <PixelIcon name="user" size={36} />
          <span><span className="font-pixel block text-xl">Challenge a friend</span><span className="block text-sm text-muted">Lock in 3 cards, share a code or QR. Winner gets a booster pack.</span></span>
        </button>
        <button onClick={() => setMode("bot")} className="px-panel flex items-center gap-3 p-4 text-left transition-transform hover:-translate-y-0.5">
          <Sprite name="governance-wizard" size={44} />
          <span><span className="font-pixel block text-xl">Practice vs the House</span><span className="block text-sm text-muted">Instant battle against a matched deck. First win each day earns a pack.</span></span>
        </button>
      </div>
    );
  }
  return (
    <div>
      <button className="font-arcade mb-2 text-xs text-muted" onClick={() => setMode(null)}>‹ Back</button>
      {msg && <p className="mb-2 text-red">{msg}</p>}
      <DeckPicker cards={cards} pending={pending} confirmLabel={mode === "bot" ? "Battle!" : "Lock in"} onConfirm={(hand) => start(async () => {
        setMsg(null);
        play("start");
        const res = await startBattle(hand, mode === "bot").catch(() => null);
        if (!res?.ok) return setMsg(res?.error ?? "Couldn't start the battle.");
        router.push(`/play/battle/${res.data.code}`);
      })} />
    </div>
  );
}

export function AnswerBattle({ code, cards }: { code: string; cards: CardView[] }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div>
      {msg && <p className="mb-2 text-red">{msg}</p>}
      <DeckPicker cards={cards} pending={pending} confirmLabel="Fight!" onConfirm={(hand) => start(async () => {
        play("start");
        const res = await answerBattle(code, hand).catch(() => null);
        if (!res?.ok) return setMsg(res?.error ?? "Couldn't join the battle.");
        router.refresh();
      })} />
    </div>
  );
}

export function CancelBattle({ code }: { code: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return <Button tone="ghost" size="sm" disabled={pending} onClick={() => start(async () => { await withdrawBattle(code); router.push("/play/battle"); })}>Cancel battle</Button>;
}

const statLabel = (k: string) => STATS.find((s) => s.key === k)?.label ?? k;

/** Animated replay: rounds reveal one by one, then the verdict. */
export function BattleReplay({ battle, viewerId }: { battle: BattleView; viewerId: string | null }) {
  const rounds = battle.rounds ?? [];
  const [shown, setShown] = useState(0);
  const a = battle.challengerCards ?? [];
  const b = battle.opponentCards;
  useEffect(() => {
    if (shown >= rounds.length) return;
    const t = setTimeout(() => {
      const r = rounds[shown];
      const meIsA = viewerId === battle.challenger.id;
      const iWon = (r.winner === "a" && meIsA) || (r.winner === "b" && !meIsA);
      play(r.winner === "draw" ? "tap" : iWon ? "correct" : "wrong");
      setShown(shown + 1);
    }, shown === 0 ? 700 : 1500);
    return () => clearTimeout(t);
  }, [shown, rounds, viewerId, battle.challenger.id]);
  const finished = shown >= rounds.length;
  const youWon = battle.winnerId && battle.winnerId === viewerId;
  const draw = finished && !battle.winnerId;
  useEffect(() => {
    if (!finished) return;
    if (youWon) { play("fanfare"); music.jingle("victory"); }
  }, [finished, youWon]);

  const side = (p: { nickname: string; avatar: string } | null, cards: CardView[], key: "a" | "b") => (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2"><Sprite name={p?.avatar ?? "explorer"} size={36} /><span className="font-pixel text-lg">{p?.nickname ?? "?"}</span></div>
      <div className="flex gap-2">
        {cards.map((c, i) => {
          const r = rounds[i];
          const lit = i < shown && r;
          const won = lit && r.winner === key;
          return (
            <div key={c.number} className={cx("relative transition-all duration-300", lit && !won && r.winner !== "draw" && "opacity-45", won && "-translate-y-2")}>
              {i < shown || battle.status === "DONE" ? <PixelCard card={c} size="sm" /> : <CardBack size="sm" />}
              {lit && <span className={cx("font-arcade absolute -bottom-2 left-1/2 -translate-x-1/2 border-[3px] border-[var(--wood-dk)] px-2 text-sm", won ? "bg-[var(--gold)] text-ink" : "bg-[#efe2c2] text-ink")}>{r[key].value}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {side(battle.challenger, a, "a")}
      <div className="flex flex-wrap justify-center gap-2">
        {rounds.map((r, i) => (
          <span key={i} className={cx("px-panel font-arcade px-3 py-1 text-xs transition-opacity", i < shown ? "opacity-100" : "opacity-40")}>
            R{i + 1}: {i < shown ? statLabel(r.stat) : "?"}
          </span>
        ))}
      </div>
      {side(battle.opponent, b, "b")}
      {finished && (
        <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="px-panel px-panel--gold relative mx-auto max-w-sm p-5 text-center">
          {youWon && <Burst icons={["coin", "star", "diamond"]} count={16} />}
          <p className="font-pixel text-3xl">{draw ? "Draw!" : youWon ? "Victory!" : viewerId && [battle.challenger.id, battle.opponent?.id].includes(viewerId) ? "Defeat" : "Battle over"}</p>
          <p className="mt-1 text-muted">
            {draw ? "Evenly matched." : `${battle.winnerId === battle.challenger.id ? battle.challenger.nickname : battle.opponent?.nickname} wins the best of 3.`}
          </p>
          <Link href="/play/battle" className="px-btn px-btn--sm mt-3">Battle again</Link>
        </motion.div>
      )}
    </div>
  );
}
