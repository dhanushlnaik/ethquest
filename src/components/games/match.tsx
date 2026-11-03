"use client";

import { useState } from "react";
import type { PublicRound, Reveal } from "@/lib/games/types";
import { Button, PixelIcon, cx } from "../pixel";
import { play } from "@/lib/sfx";

// Treasure-palette pair badges: rust, teal, moss, gold, violet, copper.
const PAIR_COLORS = ["#c0392b", "#3f7f8c", "#5c7a1e", "#b8860b", "#6b4a8a", "#a3501a"];

/** Tap a left card, then a right card to pair them (works everywhere). On desktop you can also drag left onto right. */
export function MatchRound({ round, reveal, pending, onSubmit }: { round: Extract<PublicRound, { kind: "match" }>; reveal?: Reveal; pending: boolean; onSubmit: (pairs: Record<string, string>) => void }) {
  const [pairs, setPairs] = useState<Record<string, string>>({});
  const [active, setActive] = useState<string | null>(null);
  const r = reveal?.kind === "match" ? reveal : null;
  const indexOf = (leftId: string) => round.left.findIndex((l) => l.id === leftId);
  const colorOf = (leftId: string) => PAIR_COLORS[indexOf(leftId) % PAIR_COLORS.length];
  /** Numbered badge shown on both halves of a pair, so matches read at a glance. */
  const pairBadge = (leftId: string) => (
    <span
      aria-hidden
      className="font-arcade grid h-7 w-7 shrink-0 place-items-center border-[3px] border-[var(--wood-dk)] text-xs text-[#fff3d6] [text-shadow:0_2px_0_rgba(0,0,0,0.5)]"
      style={{ background: colorOf(leftId) }}
    >
      {indexOf(leftId) + 1}
    </span>
  );
  const leftFor = (rightId: string) => Object.keys(pairs).find((l) => pairs[l] === rightId);

  const pair = (leftId: string, rightId: string) => {
    play("tap");
    setPairs((p) => {
      const next = { ...p };
      for (const k of Object.keys(next)) if (next[k] === rightId) delete next[k];
      next[leftId] = rightId;
      return next;
    });
    setActive(null);
  };

  const complete = Object.keys(pairs).length === round.left.length;

  return (
    <div>
      <h2 className="font-pixel text-2xl leading-snug sm:text-3xl">{round.prompt}</h2>
      {!r && <p className="mt-1 text-sm text-muted">Tap a card on the left, then its match on the right.</p>}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <ul className="space-y-3">
          {round.left.map((l) => {
            const mine = pairs[l.id];
            const correct = r ? r.correctPairs[l.id] === pairs[l.id] : null;
            return (
              <li key={l.id}>
                <button
                  draggable={!r}
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", l.id)}
                  onClick={() => !r && setActive(active === l.id ? null : l.id)}
                  disabled={!!r || pending}
                  data-state={active === l.id ? "selected" : r ? (correct ? "correct" : "wrong") : undefined}
                  className="px-panel px-panel--raised px-choice flex min-h-[64px] items-center gap-2"
                  aria-pressed={active === l.id}
                >
                  {mine && !r && pairBadge(l.id)}
                  <span className="font-pixel text-base leading-tight sm:text-lg">{l.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <ul className="space-y-3">
          {round.right.map((rt) => {
            const owner = leftFor(rt.id);
            const correctLeft = r ? Object.keys(r.correctPairs).find((k) => r.correctPairs[k] === rt.id) : null;
            return (
              <li key={rt.id}>
                <button
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const id = e.dataTransfer.getData("text/plain");
                    if (id && !r) pair(id, rt.id);
                  }}
                  onClick={() => active && !r && pair(active, rt.id)}
                  disabled={!!r || pending || (!active && !r)}
                  className={cx("px-panel px-choice flex min-h-[64px] items-center gap-2", active ? "px-panel--blue" : "px-panel--sunken")}
                >
                  {owner && !r && pairBadge(owner)}
                  <span className="text-sm leading-snug sm:text-base">
                    {rt.label}
                    {r && correctLeft && (
                      <span className="font-arcade mt-1 block text-[11px] text-green">= {round.left.find((l) => l.id === correctLeft)?.label}</span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      {!r && (
        <Button className="mt-5 w-full" disabled={!complete || pending} onClick={() => onSubmit(pairs)}>
          {pending ? "Checking…" : complete ? "Lock in matches" : `Match ${round.left.length - Object.keys(pairs).length} more`}
        </Button>
      )}
      {r && (
        <p className="font-arcade mt-4 flex items-center justify-center gap-2 text-xs text-gold">
          <PixelIcon name="magnifier" size={18} /> CASE {r.correctCount === r.total ? "SOLVED" : "REVIEWED"}
        </p>
      )}
    </div>
  );
}
