"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { guessHunt, nextHunt } from "@/app/actions/player";
import type { EipInfo } from "@/lib/server/eipsinsight";
import { useFx } from "../fx";
import { Button, Panel, PixelIcon, PixelLoader, Sprite } from "../pixel";
import { EipCard } from "./eip-card";
import { play } from "@/lib/sfx";

type Hunt = { slug: string; clue: string; hint: string; solvedCount: number; total: number };

export function EipHunt() {
  const [hunt, setHunt] = useState<Hunt | null>(null);
  const [guess, setGuess] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [outcome, setOutcome] = useState<{ correct: boolean; explanation: string | null; eip: EipInfo | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const { celebrate } = useFx();

  const fetchHunt = useCallback(
    () =>
      nextHunt()
        .catch(() => null)
        .then((res) => {
          if (res?.ok) setHunt(res.data);
          else setError(res?.error ?? "Couldn't load a clue. Try again.");
        }),
    [],
  );

  const load = () => {
    setOutcome(null);
    setGuess("");
    setShowHint(false);
    void fetchHunt();
  };

  useEffect(() => {
    void fetchHunt();
  }, [fetchHunt]);

  if (!hunt) return error ? <p className="font-pixel text-red">{error}</p> : <PixelLoader label="Hiding clues" />;

  const submit = () => {
    const n = Number(guess);
    if (!n) return;
    start(async () => {
      const res = await guessHunt(hunt.slug, n).catch(() => null);
      if (!res?.ok) return setError(res?.error ?? "Connection hiccup. Try again.");
      setOutcome(res.data);
      play(res.data.correct ? "correct" : "wrong");
      celebrate(res.data.gains);
    });
  };

  return (
    <div>
      <Panel tone="gold" className="flex items-start gap-3 p-4">
        <Sprite name="researcher" size={72} className="shrink-0" />
        <div>
          <p className="font-arcade text-xs text-gold">CLUE · {hunt.solvedCount}/{hunt.total} SOLVED</p>
          <p className="font-pixel mt-1 text-2xl leading-snug">{hunt.clue}</p>
        </div>
      </Panel>
      <p className="mt-3 text-sm text-muted">
        Tip: search on <a href="https://eipsinsight.com/explore" target="_blank" rel="noopener noreferrer" data-track="product" className="text-blue underline">EIPsInsight</a> if you need to, then type the number here.
      </p>
      {!outcome?.correct && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="mt-4 flex gap-2"
        >
          <label className="px-panel px-panel--sunken flex flex-1 items-center gap-2 px-3">
            <span className="font-arcade text-xs text-gold">#</span>
            <input inputMode="numeric" maxLength={5} value={guess} onChange={(e) => setGuess(e.target.value.replace(/\D/g, ""))} className="font-arcade h-14 w-full bg-transparent text-lg outline-none" aria-label="Your answer: EIP number" placeholder="????" />
          </label>
          <Button type="submit" disabled={pending || !guess}>{pending ? "…" : "Check"}</Button>
        </form>
      )}
      {outcome && !outcome.correct && (
        <p className="font-pixel mt-3 flex items-center gap-2 text-red anim-shake">
          <PixelIcon name="cross" size={18} /> Not that one. Try again!
        </p>
      )}
      {!outcome?.correct && (
        <div className="mt-3">
          {showHint ? (
            <p className="text-sm text-gold">Hint: {hunt.hint}</p>
          ) : (
            <Button tone="ghost" size="sm" onClick={() => setShowHint(true)}>
              <PixelIcon name="question" size={16} /> Show hint
            </Button>
          )}
        </div>
      )}
      {outcome?.correct && (
        <div className="mt-5 space-y-4">
          <p className="font-arcade text-xs text-green">FOUND IT! {outcome.explanation}</p>
          {outcome.eip && <EipCard eip={outcome.eip} />}
          <Button tone="gold" className="w-full" onClick={() => void load()}>Next clue ›</Button>
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-red">{error}</p>}
    </div>
  );
}
