"use client";

import { useEffect, useRef, useTransition } from "react";
import Link from "next/link";
import { hostAdvance } from "@/app/actions/live";
import { music, play } from "@/lib/audio";
import { useLive, useSecondsLeft } from "./use-live";
import { cx, PixelIcon, Treasure } from "../pixel";
import { BrandMark } from "../logo";
import { SoundPanel } from "../sound-panel";
import { Burst } from "../burst";
import type { LiveState } from "@/lib/live/types";

export const LIVE_COLORS = ["#c0392b", "#3f7f8c", "#5c7a1e", "#b8860b"];

/** Projector view. Drives the room: start, reveal (automatic at 0s or when everyone answered), next, end. */
export function HostScreen({ code, joinUrl, qrSvg }: { code: string; joinUrl: string; qrSvg: string }) {
  const { state, offset, error } = useLive(code, "host");
  const left = useSecondsLeft(state, offset);
  const [pending, start] = useTransition();
  const act = (a: "start" | "reveal" | "next" | "end") => start(async () => void (await hostAdvance(code, a)));

  // Auto-reveal once per question: timer done, or every player has answered.
  const revealedFor = useRef(-1);
  useEffect(() => {
    if (!state || state.status !== "QUESTION" || !state.question) return;
    const idx = state.question.index;
    const allIn = state.players > 0 && state.answered >= state.players;
    if (revealedFor.current !== idx && ((left !== null && left <= 0) || allIn)) {
      revealedFor.current = idx;
      void hostAdvance(code, "reveal");
    }
  }, [state, left, code]);

  // Sound + music cues on each transition.
  const lastKey = useRef("");
  useEffect(() => {
    if (!state) return;
    const key = `${state.status}:${state.question?.index ?? -1}`;
    if (key === lastKey.current) return;
    lastKey.current = key;
    if (state.status === "QUESTION") { play("start"); music.want("ranked"); }
    if (state.status === "REVEAL") play(state.question?.kind === "poll" ? "unlock" : "correct");
    if (state.status === "LOBBY") music.want("map");
    if (state.status === "ENDED") { play("fanfare"); music.jingle("victory"); }
  }, [state]);
  const tickRef = useRef(-1);
  useEffect(() => {
    if (left === null) return;
    const s = Math.ceil(left);
    if (s <= 5 && s > 0 && s !== tickRef.current) { tickRef.current = s; play("tick"); }
  }, [left]);

  if (!state) return <p className="font-arcade p-10 text-center text-sm">{error ?? "Opening the room…"}</p>;

  return (
    <div className="flex min-h-dvh flex-col p-6 lg:p-10">
      <header className="flex items-center gap-4">
        <BrandMark size={48} />
        <div className="min-w-0 flex-1">
          <p className="font-arcade text-xs text-gold">EIPsInsight · Live quiz</p>
          <h1 className="font-pixel truncate text-2xl">{state.title}</h1>
        </div>
        {state.status !== "LOBBY" && <p className="wood-plate font-arcade px-4 py-2 text-sm">Join: <span className="text-[var(--gold)]">{code}</span></p>}
        <span className="wood-plate font-arcade px-4 py-2 text-sm"><PixelIcon name="user" size={16} className="mr-2 inline" />{state.players}</span>
        <SoundPanel />
      </header>

      <main className="flex flex-1 flex-col justify-center py-6">
        {state.status === "LOBBY" && <Lobby state={state} code={code} joinUrl={joinUrl} qrSvg={qrSvg} />}
        {(state.status === "QUESTION" || state.status === "REVEAL") && state.question && <Question state={state} left={left} />}
        {state.status === "ENDED" && <Podium state={state} />}
      </main>

      <footer className="flex flex-wrap items-center gap-3">
        {state.status === "LOBBY" && <button className="px-btn px-btn--gold px-btn--lg shine" disabled={pending} onClick={() => act("start")}>Start quiz ▶</button>}
        {state.status === "QUESTION" && <button className="px-btn" disabled={pending} onClick={() => act("reveal")}>Reveal now</button>}
        {state.status === "REVEAL" && (
          <button className="px-btn px-btn--gold px-btn--lg" disabled={pending} onClick={() => act("next")}>
            {state.question && state.question.index + 1 >= state.question.total ? "Final results ▶" : "Next question ▶"}
          </button>
        )}
        {state.status !== "ENDED" && <button className="px-btn px-btn--ghost px-btn--sm ml-auto" disabled={pending} onClick={() => confirm("End the quiz for everyone?") && act("end")}>End quiz</button>}
        {state.status === "ENDED" && <Link href="/live/host" className="px-btn px-btn--ghost">New room</Link>}
      </footer>
    </div>
  );
}

function Lobby({ state, code, joinUrl, qrSvg }: { state: LiveState; code: string; joinUrl: string; qrSvg: string }) {
  return (
    <div className="grid items-center gap-8 lg:grid-cols-[auto_1fr]">
      <section className="px-panel px-panel--gold p-6 text-center">
        <p className="font-arcade text-sm text-gold">Scan to join</p>
        <div className="mx-auto mt-3 aspect-square w-72 bg-[#fff8e8] p-2 [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />
        <p className="mt-3 text-base text-muted">or open <b className="text-ink">{joinUrl.replace(/^https?:\/\//, "")}</b></p>
        <p className="font-arcade mt-3 text-sm">Room code</p>
        <p className="font-pixel text-6xl tracking-[0.2em] text-gold">{code}</p>
      </section>
      <section>
        <h2 className="title-outline font-pixel text-4xl leading-tight lg:text-5xl">Get your phones out!</h2>
        <p className="mt-2 text-xl">Fast correct answers score more. Two quick polls, ten questions, from easy to expert.</p>
        <ul className="mt-6 flex flex-wrap gap-2">
          {(state.roster ?? []).map((n, i) => (
            <li key={n} className="px-panel px-panel--raised anim-pop-in font-pixel px-3 py-2 text-lg" style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}>{n}</li>
          ))}
          {!state.roster?.length && <li className="font-arcade anim-blink text-sm text-muted">Waiting for players…</li>}
        </ul>
      </section>
    </div>
  );
}

function Question({ state, left }: { state: LiveState; left: number | null }) {
  const q = state.question!;
  const revealed = state.status === "REVEAL" && state.reveal;
  const counts = revealed ? state.reveal!.counts : q.kind === "poll" ? state.liveCounts ?? [] : [];
  const maxCount = Math.max(1, ...counts);
  const pct = left === null ? 0 : left / q.seconds;
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section>
        <div className="flex items-center gap-4">
          <span className="font-arcade text-sm text-gold">Q{q.index + 1}/{q.total} · {q.kind === "poll" ? "Poll" : q.level}</span>
          {!revealed && (
            <>
              <div className="px-bar h-5 flex-1"><span style={{ width: `${pct * 100}%`, transition: "width 200ms linear" }} /></div>
              <span className={cx("font-pixel w-16 text-right text-3xl", left !== null && left <= 5 && "anim-blink text-red")}>{left === null ? "" : Math.ceil(left)}</span>
            </>
          )}
          <span className="font-arcade text-sm">{state.answered}/{state.players} answered</span>
        </div>
        <h2 className="font-pixel mt-5 text-4xl leading-tight [text-shadow:0_3px_0_rgba(20,14,8,0.7)] lg:text-5xl">{q.prompt}</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {q.options.map((o, i) => {
            const isRight = revealed && state.reveal!.correct === i;
            const dim = revealed && state.reveal!.correct !== null && !isRight;
            return (
              <li key={i} className={cx("px-panel relative flex items-center gap-4 p-4 transition-opacity", isRight && "px-panel--green anim-pop", dim && "opacity-50")}>
                <span className="font-arcade grid h-12 w-12 shrink-0 place-items-center border-[3px] border-[var(--wood-dk)] text-xl text-[#fff3d6]" style={{ background: LIVE_COLORS[i] }}>{String.fromCharCode(65 + i)}</span>
                <span className="min-w-0 flex-1 text-2xl leading-tight">{o}</span>
                {counts.length > 0 && (
                  <span className="flex w-28 items-center gap-2">
                    <span className="h-4 flex-1 bg-[var(--parch-lo)]"><span className="block h-full transition-all duration-500" style={{ width: `${(counts[i] / maxCount) * 100}%`, background: LIVE_COLORS[i] }} /></span>
                    <span className="font-arcade w-6 text-right text-sm">{counts[i]}</span>
                  </span>
                )}
                {isRight && <PixelIcon name="check" size={32} />}
                {isRight && <Burst icons={["coin", "star"]} count={10} />}
              </li>
            );
          })}
        </ul>
        {revealed && <p className="px-panel px-panel--raised anim-pop-in mt-5 p-4 text-xl">{state.reveal!.explanation}</p>}
      </section>
      <Leaderboard state={state} />
    </div>
  );
}

function Leaderboard({ state }: { state: LiveState }) {
  return (
    <aside className="px-panel self-start p-4">
      <p className="font-arcade text-xs text-gold">Top 5</p>
      <ol className="mt-2 space-y-2">
        {state.leaderboard.map((p, i) => (
          <li key={p.name} className="flex items-center gap-2">
            <span className="font-arcade w-7 text-sm text-muted">{i + 1}.</span>
            {i === 0 && p.score > 0 && <PixelIcon name="crown" size={18} />}
            <span className="font-pixel min-w-0 flex-1 truncate text-lg">{p.name}</span>
            <span className="font-arcade text-sm text-gold">{p.score}</span>
          </li>
        ))}
        {!state.leaderboard.length && <li className="text-muted">No players yet.</li>}
      </ol>
    </aside>
  );
}

function Podium({ state }: { state: LiveState }) {
  const [first, second, third] = state.leaderboard;
  const spot = (p: { name: string; score: number } | undefined, place: number, h: string) =>
    p ? (
      <div className="flex flex-col items-center">
        {place === 1 && <Treasure name="crown" size={96} className="anim-float anim-glow" />}
        <p className="font-pixel mt-2 max-w-56 truncate text-3xl">{p.name}</p>
        <p className="font-arcade text-lg text-gold">{p.score} pts</p>
        <div className={cx("px-panel mt-3 grid w-48 place-items-center", place === 1 ? "px-panel--gold" : "px-panel--raised", h)}>
          <span className="font-pixel text-6xl">{place}</span>
        </div>
      </div>
    ) : <div className="w-48" />;
  return (
    <div className="relative text-center">
      <h2 className="title-outline font-pixel text-5xl">Final results</h2>
      <div className="mt-10 flex items-end justify-center gap-6">
        {spot(second, 2, "h-32")}
        {spot(first, 1, "h-48")}
        {spot(third, 3, "h-24")}
      </div>
      <Burst icons={["coin", "star", "diamond"]} count={18} />
      <p className="mt-8 text-xl">Keep exploring every EIP and upgrade at <b className="text-gold">eipsinsight.com</b> · follow <b className="text-gold">@EIPsInsight</b></p>
    </div>
  );
}
