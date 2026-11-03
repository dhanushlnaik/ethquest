"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { submitDaily } from "@/app/actions/daily";
import { play } from "@/lib/audio";
import type { DailyPublic } from "@/lib/server/daily";
import { cx, ExternalLink, PixelIcon } from "./pixel";
import { Burst } from "./burst";
import { useFx } from "./fx";
import { ShareButtons } from "./share-buttons";
import { Flame, nextMilestone } from "./streak";

const COLORS = ["#c0392b", "#3f7f8c", "#5c7a1e", "#b8860b"];

type Result = { correct: boolean; correctId: string; explanation: string; streak: number };

export function DailyQuiz({ q, answered, streak, shareUrl }: { q: DailyPublic; answered: (Result & { choice: string }) | null; streak: number; shareUrl: string }) {
  const { celebrate } = useFx();
  const [picked, setPicked] = useState<string | null>(answered?.choice ?? null);
  const [result, setResult] = useState<Result | null>(answered);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const shown = result?.streak ?? streak;
  const next = nextMilestone(shown);

  const answer = (id: string) =>
    start(async () => {
      if (result) return;
      setPicked(id);
      play("tap");
      const res = await submitDaily(id).catch(() => null);
      if (!res?.ok) return setMsg(res?.error ?? "Couldn't send your answer. Try again.");
      setResult(res.data);
      play(res.data.correct ? "correct" : "wrong");
      celebrate(res.data.gains);
    });

  return (
    <div className="space-y-4">
      <div className="px-panel flex flex-wrap items-center gap-4 p-4">
        <Flame streak={shown} size="lg" />
        <p className="min-w-0 flex-1 text-sm text-muted">
          {result ? "Come back tomorrow to keep your streak alive." : "Answer today to keep your streak alive."} Day {next.at} unlocks {next.reward}.
        </p>
      </div>

      <section className="px-panel px-panel--gold p-5">
        <p className="font-arcade text-xs text-gold">Today&apos;s challenge</p>
        <h2 className="font-pixel mt-1 text-2xl leading-snug">{q.prompt}</h2>
        <ExternalLink href={q.link.url} className="mt-2 inline-block text-sm">{q.link.label} ↗</ExternalLink>
        <ul className="mt-4 grid gap-3">
          {q.options.map((o, i) => {
            const state = !result ? (picked === o.id ? "selected" : undefined) : o.id === result.correctId ? "correct" : o.id === picked ? "wrong" : "dim";
            return (
              <li key={o.id} className="relative">
                <button disabled={!!result || pending} onClick={() => answer(o.id)} data-state={state} className="px-panel px-panel--raised px-choice flex items-center gap-3">
                  <span className="font-arcade grid h-9 w-9 shrink-0 place-items-center border-[3px] border-[var(--wood-dk)] text-sm text-[#fff3d6]" style={{ background: COLORS[i % 4] }}>{String.fromCharCode(65 + i)}</span>
                  <span className="text-lg leading-tight">{o.label}</span>
                </button>
                {result?.correct && o.id === result.correctId && <Burst icons={["star", "coin"]} count={12} />}
              </li>
            );
          })}
        </ul>
        {msg && <p className="mt-3 text-red">{msg}</p>}
        {result && (
          <div className={cx("px-panel anim-pop-in mt-4 p-4", result.correct ? "px-panel--green" : "px-panel--red")}>
            <p className="font-pixel text-xl">{result.correct ? "Correct! +10 XP" : "Not quite."}</p>
            <p className="mt-1">{result.explanation}</p>
          </div>
        )}
      </section>

      {result && (
        <section className="px-panel p-4">
          <p className="font-arcade text-xs text-gold">Show off your streak</p>
          <div className="mt-2"><ShareButtons url={shareUrl} title={`🔥 ${shown}-day streak on the ETHQuest daily EIP challenge by @EIPsInsight. Can you keep up?`} /></div>
          <Link href="/play/cards" className="px-btn px-btn--sm mt-3"><PixelIcon name="gift" size={16} /> Check your packs</Link>
        </section>
      )}
    </div>
  );
}
