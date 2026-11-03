"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { liveAnswer, liveJoin } from "@/app/actions/live";
import { play } from "@/lib/audio";
import { useLive, useSecondsLeft } from "./use-live";
import { LIVE_COLORS } from "./host-screen";
import { cx, PixelIcon, Treasure } from "../pixel";
import { Burst } from "../burst";

/** Join form: room code (prefilled from the QR) + a display name. No account needed. */
export function JoinForm({ initialCode }: { initialCode: string }) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const submit = () =>
    start(async () => {
      setError(null);
      const res = await liveJoin(code, name).catch(() => null);
      if (!res?.ok) return setError(res?.error ?? "Connection problem. Try again.");
      play("coin");
      router.push(`/live/${res.data.code}`);
    });
  return (
    <form className="px-panel mx-auto w-full max-w-sm space-y-4 p-6" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <label className="block">
        <span className="font-arcade text-xs text-gold">Room code</span>
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4))} placeholder="ABCD" autoCapitalize="characters" inputMode="text"
          className="font-pixel mt-1 w-full bg-[#fffaf0] px-3 py-3 text-center text-3xl tracking-[0.3em] text-ink outline-none ring-2 ring-[var(--parch-edge)] focus:ring-[3px] focus:ring-[var(--gold-dk)]" />
      </label>
      <label className="block">
        <span className="font-arcade text-xs text-gold">Your name</span>
        <input value={name} onChange={(e) => setName(e.target.value.slice(0, 20))} placeholder="e.g. BlobEnjoyer" autoComplete="nickname"
          className="mt-1 w-full bg-[#fffaf0] px-3 py-3 text-xl text-ink outline-none ring-2 ring-[var(--parch-edge)] focus:ring-[3px] focus:ring-[var(--gold-dk)]" />
      </label>
      {error && <p className="text-base text-red">{error}</p>}
      <button className="px-btn px-btn--gold px-btn--lg w-full" disabled={pending || code.length !== 4 || name.trim().length < 3}>{pending ? "Joining…" : "Join quiz ▶"}</button>
    </form>
  );
}

export function PlayerScreen({ code }: { code: string }) {
  const router = useRouter();
  const { state, offset, error } = useLive(code, "player");
  const left = useSecondsLeft(state, offset);
  const [picked, setPicked] = useState<{ index: number; choice: number } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Not joined (cookie missing or another room): back to the join form with the code filled in.
  useEffect(() => {
    if (state && !state.me) router.replace(`/live?code=${code}`);
  }, [state, code, router]);

  // Reveal sound for my answer.
  const heardFor = useRef(-1);
  useEffect(() => {
    if (state?.status !== "REVEAL" || !state.question || heardFor.current === state.question.index) return;
    heardFor.current = state.question.index;
    const a = state.me?.answer;
    if (state.question.kind === "poll") play("unlock");
    else play(a?.correct ? "correct" : "wrong");
  }, [state]);

  if (!state || !state.me) return <p className="font-arcade p-10 text-center text-sm">{error ?? "Connecting…"}</p>;
  const q = state.question;
  const me = state.me;
  const myChoice = me.answer?.choice ?? (picked && q && picked.index === q.index ? picked.choice : null);

  const answer = (choice: number) =>
    start(async () => {
      if (!q) return;
      setPicked({ index: q.index, choice });
      setMsg(null);
      play("tap");
      const res = await liveAnswer(code, choice).catch(() => null);
      if (!res?.ok) setMsg(res?.error ?? "Didn't reach the server. Tap again.");
    });

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col p-4">
      <header className="wood-plate flex items-center gap-3 px-3 py-2">
        <span className="font-pixel min-w-0 flex-1 truncate">{me.name}</span>
        <span className="font-arcade text-xs text-[var(--gold)]">{me.score} pts</span>
        {me.score > 0 && <span className="font-arcade text-xs">#{me.rank}</span>}
      </header>

      <main className="flex flex-1 flex-col justify-center py-6">
        {state.status === "LOBBY" && (
          <div className="px-panel p-6 text-center">
            <Treasure name="chest-closed" size={96} className="anim-rattle mx-auto" />
            <p className="font-pixel mt-3 text-2xl">You&apos;re in!</p>
            <p className="mt-1 text-lg text-muted">Watch the big screen. The quiz starts soon. {state.players} players joined.</p>
          </div>
        )}

        {state.status === "QUESTION" && q && (
          <div>
            <div className="flex items-center gap-3">
              <span className="font-arcade text-xs text-gold">Q{q.index + 1}/{q.total}{q.kind === "poll" ? " · Poll" : ""}</span>
              <div className="px-bar h-3 flex-1"><span style={{ width: `${left === null ? 0 : (left / q.seconds) * 100}%`, transition: "width 200ms linear" }} /></div>
              <span className="font-pixel w-8 text-right">{left === null ? "" : Math.ceil(left)}</span>
            </div>
            <p className="font-pixel mt-4 text-xl leading-snug [text-shadow:0_2px_0_rgba(20,14,8,0.7)]">{q.prompt}</p>
            {myChoice === null ? (
              <ul className="mt-5 grid gap-3">
                {q.options.map((o, i) => (
                  <li key={i}>
                    <button disabled={pending || left === 0} onClick={() => answer(i)} className="px-panel px-choice flex w-full items-center gap-3 p-4 text-left">
                      <span className="font-arcade grid h-10 w-10 shrink-0 place-items-center border-[3px] border-[var(--wood-dk)] text-base text-[#fff3d6]" style={{ background: LIVE_COLORS[i] }}>{String.fromCharCode(65 + i)}</span>
                      <span className="text-xl leading-tight">{o}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-panel mt-6 p-6 text-center">
                <span className="font-arcade mx-auto grid h-16 w-16 place-items-center border-[3px] border-[var(--wood-dk)] text-2xl text-[#fff3d6]" style={{ background: LIVE_COLORS[myChoice] }}>{String.fromCharCode(65 + myChoice)}</span>
                <p className="font-pixel mt-3 text-xl">{q.kind === "poll" ? "Vote in!" : "Locked in!"}</p>
                <p className="mt-1 text-lg text-muted">Eyes on the big screen…</p>
              </div>
            )}
            {msg && <p className="mt-3 text-center text-lg text-red">{msg}</p>}
          </div>
        )}

        {state.status === "REVEAL" && q && (
          <div className={cx("px-panel relative p-6 text-center", q.kind === "quiz" && (me.answer?.correct ? "px-panel--green" : "px-panel--red"))}>
            {q.kind === "poll" ? (
              <>
                <PixelIcon name={me.answer ? "check" : "hourglass"} size={48} className="mx-auto" />
                <p className="font-pixel mt-3 text-2xl">{me.answer ? "Thanks for voting!" : "You missed this vote"}</p>
              </>
            ) : me.answer?.correct ? (
              <>
                <Burst icons={["coin", "star"]} count={12} />
                <p className="font-pixel text-3xl">Correct!</p>
                <p className="font-arcade mt-2 text-lg text-gold">+{me.answer.points} pts</p>
              </>
            ) : (
              <>
                <p className="font-pixel text-3xl">{me.answer ? "Not quite" : "Too slow!"}</p>
                {state.reveal?.correct != null && <p className="mt-2 text-lg">Answer: <b>{String.fromCharCode(65 + state.reveal.correct)}</b>, {q.options[state.reveal.correct]}</p>}
              </>
            )}
            <p className="mt-4 text-lg text-muted">You&apos;re <b className="text-ink">#{me.rank}</b> with {me.score} pts</p>
          </div>
        )}

        {state.status === "ENDED" && (
          <div className="px-panel px-panel--gold relative p-6 text-center">
            {me.rank <= 3 && me.score > 0 && <Burst icons={["coin", "star", "diamond"]} count={16} />}
            <Treasure name={me.rank === 1 && me.score > 0 ? "crown" : "chest-open"} size={96} className="anim-float mx-auto" />
            <p className="font-pixel mt-3 text-3xl">#{me.rank}</p>
            <p className="font-arcade text-lg text-gold">{me.score} pts</p>
            <p className="mt-3 text-lg">Thanks for playing! Dig into every EIP and upgrade at <a href="https://eipsinsight.com" className="underline">eipsinsight.com</a>.</p>
            <a href="https://x.com/EIPsInsight" target="_blank" rel="noopener noreferrer" className="px-btn px-btn--sm mt-4">Follow @EIPsInsight</a>
          </div>
        )}
      </main>
    </div>
  );
}
