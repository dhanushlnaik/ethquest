"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { startMission, submitAnswer, requestHint } from "@/app/actions/game";
import type { AnswerResult, PublicRound, Reveal, StartResult } from "@/lib/games/types";
import type { RankedPreview } from "@/lib/server/event";
import { useFx, Confetti } from "../fx";
import { Bar, Button, ButtonLink, ExternalLink, Panel, PixelIcon, PixelLoader, Sprite, Tag, cx } from "../pixel";
import { music, play } from "@/lib/audio";
import { DIFFICULTIES } from "@/lib/config/game";
import { MatchRound } from "./match";
import { TimelineRound } from "./timeline";
import { Burst } from "../burst";

// Rust, teal, moss, gold: one per answer slot, from the treasure palette.
const ANSWER_COLORS = ["#c0392b", "#3f7f8c", "#5c7a1e", "#b8860b"];

type Phase = { name: "gate" } | { name: "loading" } | { name: "error"; message: string } | { name: "playing"; game: StartResult; index: number; result: AnswerResult | null; totalXP: number };

export function GameRunner({ slug, backHref, backLabel, character = "explorer", intro, gate }: { slug: string; backHref: string; backLabel: string; character?: string; intro?: string; gate?: RankedPreview }) {
  const [phase, setPhase] = useState<Phase>(gate ? { name: "gate" } : { name: "loading" });
  const [startedOnce, setStartedOnce] = useState(false);

  const begin = useCallback(async () => {
    setPhase({ name: "loading" });
    const res = await startMission(slug);
    if (!res.ok) return setPhase({ name: "error", message: res.error });
    setPhase({ name: "playing", game: res.data, index: 0, result: null, totalXP: 0 });
    setStartedOnce(true);
  }, [slug]);

  const kicked = useRef(false);
  useEffect(() => {
    // Kick off the first round set once on mount (guards against dev double-invocation);
    // network failures land in the error state with a retry.
    // Ranked games wait for the player to press Start on the gate screen.
    if (kicked.current || gate) return;
    kicked.current = true;
    void begin().catch(() => setPhase({ name: "error", message: "Couldn't reach the server. Check your connection." }));
  }, [begin, gate]);

  if (phase.name === "gate" && gate) return <RankedGate gate={gate} character={character} onStart={() => void begin().catch(() => setPhase({ name: "error", message: "Couldn't reach the server. Check your connection." }))} />;
  if (phase.name === "loading" || phase.name === "gate") return <PixelLoader label={startedOnce ? "Shuffling" : "Loading game"} />;
  if (phase.name === "error")
    return (
      <Panel tone="red" className="mx-auto max-w-md p-6 text-center">
        <PixelIcon name="cross" size={40} className="mx-auto" />
        <p className="font-pixel mt-3 text-xl">{phase.message}</p>
        <Button className="mt-4" onClick={() => void begin()}>Try again</Button>
      </Panel>
    );

  const { game, index, result } = phase;
  const round = game.rounds[index];
  const done = result?.done && index === game.rounds.length - 1;

  if (done && result?.summary) {
    return <Summary summary={result.summary} totalXP={phase.totalXP} game={game} onReplay={() => void begin()} backHref={backHref} backLabel={backLabel} character={character} />;
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <span className="font-arcade text-xs text-muted">
          {index + 1}/{game.rounds.length}
        </span>
        <Bar value={(index + (result ? 1 : 0)) / game.rounds.length} tone="purple" className="flex-1" label="Game progress" />
        <span className="font-arcade text-xs" style={{ color: DIFFICULTIES[game.difficulty].color }}>
          {DIFFICULTIES[game.difficulty].short}
        </span>
      </div>
      {game.ranked && index === 0 && !result && <RankedBanner info={game.ranked} />}
      {intro && index === 0 && !result && <p className="mb-3 text-sm text-muted">{intro}</p>}
      <AnimatePresence mode="wait">
        <motion.div key={`${game.attemptId}-${index}`} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.18 }}>
          <RoundView
            round={round}
            game={game}
            index={index}
            result={result}
            onResult={(r) => setPhase({ ...phase, result: r, totalXP: phase.totalXP + r.gains.xp })}
            onNext={() => setPhase({ ...phase, index: index + 1, result: null })}
            isLast={index === game.rounds.length - 1}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function RoundView({ round, game, index, result, onResult, onNext, isLast }: { round: PublicRound; game: StartResult; index: number; result: AnswerResult | null; onResult: (r: AnswerResult) => void; onNext: () => void; isLast: boolean }) {
  const { celebrate } = useFx();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submit = (payload: Parameters<typeof submitAnswer>[0]["payload"]) => {
    if (pending || result) return;
    setError(null);
    start(async () => {
      try {
        const res = await submitAnswer({ attemptId: game.attemptId, index, payload });
        if (!res.ok) return setError(res.error);
        const reveal = res.data.reveal;
        const good = reveal.kind === "choice" ? reveal.correct : reveal.kind === "predict" ? true : reveal.correctCount === reveal.total;
        play(good ? "correct" : "wrong");
        onResult(res.data);
        celebrate(res.data.gains);
      } catch {
        setError("Connection hiccup. Tap again to resend your answer.");
      }
    });
  };

  return (
    <>
      {round.kind === "choice" && <ChoiceRound round={round} game={game} index={index} reveal={result?.reveal} pending={pending} onPick={(optionId) => submit({ optionId })} />}
      {round.kind === "predict" && <PredictRound round={round} reveal={result?.reveal} pending={pending} onPick={(optionId) => submit({ optionId })} />}
      {round.kind === "match" && <MatchRound round={round} reveal={result?.reveal} pending={pending} onSubmit={(pairs) => submit({ pairs })} />}
      {round.kind === "order" && <TimelineRound round={round} reveal={result?.reveal} pending={pending} onSubmit={(order) => submit({ order })} />}
      {error && (
        <p role="alert" className="font-pixel mt-3 text-center text-red">
          {error}
        </p>
      )}
      {result && <RevealPanel reveal={result.reveal} />}
      {result && (
        <div className="mt-4">
          <Button tone={isLast ? "gold" : "purple"} className="w-full" onClick={() => { play("tap"); onNext(); }} autoFocus>
            {isLast ? "See results" : "Next"} <span aria-hidden>›</span>
          </Button>
        </div>
      )}
    </>
  );
}

// ---------------- Choice ----------------

function ChoiceRound({ round, game, index, reveal, pending, onPick }: { round: Extract<PublicRound, { kind: "choice" }>; game: StartResult; index: number; reveal?: Reveal; pending: boolean; onPick: (id: string | null) => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const r = reveal?.kind === "choice" ? reveal : null;
  const timerBase = game.timerSeconds ? (game.difficulty === "EXPLORER" ? game.timerSeconds * 2 : game.timerSeconds) : null;

  const askHint = async () => {
    setHintLoading(true);
    const res = await requestHint({ attemptId: game.attemptId, index }).catch(() => null);
    setHintLoading(false);
    if (res?.ok) setHint(res.data.hint);
  };

  const pick = (id: string | null) => {
    if (r || pending) return;
    play("tap");
    setPicked(id);
    onPick(id);
  };

  return (
    <div>
      {timerBase && !r && <Timer seconds={timerBase} paused={pending} onTimeout={() => pick(null)} />}
      {round.badge && <Tag tone="blue" className="mb-2">{round.badge}</Tag>}
      <h2 className="font-pixel text-2xl leading-snug sm:text-3xl">{round.prompt}</h2>
      {round.sequence && <Sequence items={round.sequence} reveal={r} options={round.options} />}
      {round.link && (
        <a href={round.link.url} target="_blank" rel="noopener noreferrer" data-track="product" className="px-btn px-btn--blue px-btn--sm mt-3">
          <PixelIcon name="map" size={16} /> {round.link.label} ↗
        </a>
      )}
      <ul className={cx("mt-4 grid gap-3", round.layout === "cards" && "sm:grid-cols-3")}>
        {round.options.map((o, i) => {
          const state = r ? (o.id === r.correctId ? "correct" : o.id === picked ? "wrong" : "dim") : picked === o.id ? "selected" : undefined;
          return (
            <li key={o.id}>
              <button
                onClick={() => pick(o.id)}
                disabled={!!r || pending}
                data-state={state}
                className={cx("px-panel px-panel--raised px-choice anim-pop-in relative h-full", state === "wrong" && "anim-shake")}
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <span className="flex items-start gap-3">
                  <span className="font-arcade mt-0.5 grid h-8 w-8 shrink-0 place-items-center border-[3px] border-[var(--wood-dk)] text-sm text-[#fff3d6] shadow-[inset_0_-3px_0_rgba(0,0,0,0.3),inset_0_2px_0_rgba(255,255,255,0.25)] [text-shadow:0_2px_0_rgba(0,0,0,0.5)]" style={{ background: ANSWER_COLORS[i % ANSWER_COLORS.length] }}>{String.fromCharCode(65 + i)}</span>
                  <span className="min-w-0">
                    <span className={cx("block", round.layout === "cards" ? "font-arcade text-xs text-gold" : "font-pixel text-lg leading-snug")}>{o.label}</span>
                    {o.sub && <span className="block text-xs text-muted">{o.sub}</span>}
                    {o.text && <span className="mt-1 block text-[15px] leading-snug text-text">{o.text}</span>}
                    {r && round.layout === "cards" && o.id === r.correctId && <span className="font-arcade mt-2 block text-xs text-red">FAKE!</span>}
                  </span>
                  {state === "correct" && <PixelIcon name="check" size={22} className="ml-auto shrink-0" />}
                  {state === "correct" && o.id === picked && <Burst />}
                  {state === "wrong" && <PixelIcon name="cross" size={20} className="ml-auto shrink-0" />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {round.hasHint && !r && (
        <div className="mt-4">
          {hint ? (
            <Panel tone="gold" variant="sunken" className="flex items-start gap-2 p-3">
              <PixelIcon name="question" size={20} />
              <p className="text-sm">{hint}</p>
            </Panel>
          ) : (
            <Button tone="ghost" size="sm" onClick={askHint} disabled={hintLoading || pending}>
              <PixelIcon name="question" size={16} /> {hintLoading ? "…" : game.ranked?.counts ? "Hint (−2 pts)" : "Hint"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function Sequence({ items, reveal, options }: { items: NonNullable<Extract<PublicRound, { kind: "choice" }>["sequence"]>; reveal: Extract<Reveal, { kind: "choice" }> | null; options: { id: string; label: string }[] }) {
  return (
    <ol className="no-scrollbar mt-4 flex items-stretch gap-2 overflow-x-auto pb-2">
      {items.map((it, i) => (
        <li key={i} className="flex items-center gap-2">
          <div className={cx("px-panel min-w-[92px] px-3 py-2 text-center", it.missing ? "px-panel--gold" : "px-panel--raised")}>
            <p className={cx("font-pixel text-sm leading-tight", it.missing && "text-gold")}>
              {it.missing && reveal ? options.find((o) => o.id === reveal.correctId)?.label : it.label}
            </p>
            {it.sub && <p className="font-arcade mt-1 text-[11px] text-muted">{it.sub}</p>}
            {it.missing && !reveal && <PixelIcon name="question" size={18} className="anim-bob mx-auto mt-1" />}
          </div>
          {i < items.length - 1 && <span className="font-arcade text-xs text-faint">›</span>}
        </li>
      ))}
    </ol>
  );
}

function Timer({ seconds, paused, onTimeout }: { seconds: number; paused: boolean; onTimeout: () => void }) {
  const [left, setLeft] = useState(seconds);
  const fired = useRef(false);
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => clearInterval(t);
  }, [paused]);
  useEffect(() => {
    if (left <= 5 && left > 0) play("tick");
    if (left === 0 && !fired.current) {
      fired.current = true;
      onTimeout();
    }
  }, [left, onTimeout]);
  return (
    <div className="mb-3 flex items-center gap-2" aria-label={`${left} seconds left`}>
      <PixelIcon name="hourglass" size={18} />
      <Bar value={left / seconds} tone={left <= 5 ? "gold" : "blue"} className="flex-1" />
      <span className={cx("font-arcade w-8 text-right text-xs", left <= 5 ? "text-gold anim-blink" : "text-muted")}>{left}s</span>
    </div>
  );
}

// ---------------- Predict ----------------

function PredictRound({ round, reveal, pending, onPick }: { round: Extract<PublicRound, { kind: "predict" }>; reveal?: Reveal; pending: boolean; onPick: (id: string) => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  const r = reveal?.kind === "predict" ? reveal : null;
  return (
    <div>
      <Tag tone="purple" className="mb-2">
        <PixelIcon name="star" size={10} /> Prediction, not confirmed roadmap
      </Tag>
      <h2 className="font-pixel text-2xl leading-snug sm:text-3xl">{round.prompt}</h2>
      <p className="mt-1 text-sm text-muted">{round.note}</p>
      <ul className="mt-4 grid gap-3">
        {round.options.map((o) => {
          const s = r?.statuses.find((x) => x.id === o.id);
          return (
            <li key={o.id}>
              <button
                disabled={!!r || pending}
                onClick={() => { setPicked(o.id); play("tap"); onPick(o.id); }}
                data-state={picked === o.id ? "selected" : r ? "dim" : undefined}
                className="px-panel px-panel--raised px-choice relative overflow-hidden"
              >
                {r && <span aria-hidden className="absolute inset-y-0 left-0 bg-purple-lo/40" style={{ width: `${s?.share ?? 0}%` }} />}
                <span className="relative flex items-center gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="font-pixel block text-lg leading-tight">{o.label}</span>
                    {o.sub && <span className="block text-xs text-muted">{o.sub}</span>}
                    {s?.status && <span className="font-arcade mt-1 block text-xs text-blue-hi">{s.status}</span>}
                  </span>
                  {r && <span className="font-arcade text-xs text-gold">{s?.share ?? 0}%</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---------------- Reveal ----------------

function RevealPanel({ reveal }: { reveal: Reveal }) {
  if (reveal.kind === "order") return null; // timeline renders its own rich reveal
  const good = reveal.kind === "choice" ? reveal.correct : reveal.kind === "match" ? reveal.correctCount === reveal.total : true;
  const heading =
    reveal.kind === "choice" ? (reveal.correct ? "Correct!" : "Not quite!") : reveal.kind === "match" ? `${reveal.correctCount}/${reveal.total} matched` : "Thanks for predicting!";
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      ref={(el) => {
        if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 250);
      }}
    >
      <Panel tone={good ? "green" : "gold"} className="mt-5 p-4">
        <p className={cx("font-arcade text-xs", good ? "text-green" : "text-gold")}>{heading.toUpperCase()}</p>
        <p className="mt-2 leading-relaxed">{reveal.explanation}</p>
        {reveal.kind === "choice" && reveal.extra && <p className="mt-2 text-sm text-muted">{reveal.extra}</p>}
        {"learnMoreUrl" in reveal && reveal.learnMoreUrl && (
          <p className="mt-3 text-sm">
            <ExternalLink href={reveal.learnMoreUrl}>{(reveal.kind === "choice" && reveal.learnMoreLabel) || "Learn more on EIPsInsight"} ↗</ExternalLink>
          </p>
        )}
      </Panel>
    </motion.div>
  );
}

// ---------------- Ranked ----------------

function RankedGate({ gate, character, onStart }: { gate: RankedPreview; character: string; onStart: () => void }) {
  const counts = gate.resumable || (!gate.closed && gate.runsLeft > 0);
  return (
    <Panel tone={counts ? "gold" : "default"} className="mx-auto max-w-md p-6 text-center">
      <Sprite name={character} size={104} className="mx-auto" />
      <p className="font-arcade mt-3 text-xs text-gold">{counts ? "Ranked run" : "Practice run"}</p>
      <p className="font-pixel mt-1 text-2xl">Best: {gate.best}<span className="text-base text-muted">/{gate.max} XP</span></p>
      <ul className="mt-4 space-y-1 text-left text-base">
        <li className="flex justify-between"><span className="text-muted">Accuracy</span><span>up to {gate.base}</span></li>
        <li className="flex justify-between"><span className="text-muted">Perfect, no hints</span><span>+{gate.perfect}</span></li>
        <li className="flex justify-between"><span className="text-muted">Speed (under {gate.targetSeconds}s)</span><span>+{gate.speed}</span></li>
        <li className="flex justify-between"><span className="text-muted">Each hint</span><span>−2</span></li>
      </ul>
      <p className="mt-4 text-base">
        {gate.resumable
          ? <>You already started a ranked run. It resumes where you left off, <b>and its clock kept running</b>.</>
          : gate.closed
          ? "Leaderboard scoring has closed. Play for fun!"
          : counts
            ? <>Only your best run counts. <b>{gate.runsLeft} of {gate.runsPerDay}</b> ranked runs left today; starting one uses it.</>
            : <>You&apos;ve used today&apos;s {gate.runsPerDay} ranked runs. Practice runs don&apos;t change your score.</>}
      </p>
      <Button tone={counts ? "gold" : "purple"} size="lg" className="shine mt-5 w-full" onClick={() => { play("start"); onStart(); }}>
        {gate.resumable ? "Resume ranked run" : counts ? "Start ranked run" : "Start practice run"}
      </Button>
    </Panel>
  );
}

function RankedBanner({ info }: { info: NonNullable<StartResult["ranked"]> }) {
  return (
    <Panel tone={info.counts ? "gold" : "default"} variant={info.counts ? undefined : "sunken"} className="mb-4 flex items-center gap-3 p-3">
      <PixelIcon name={info.counts ? "trophy" : "hourglass"} size={28} />
      <p className="min-w-0 flex-1 text-sm">
        {info.counts ? (
          <><b>Ranked run.</b> Your best: {info.best}/{info.max} XP. Beat it to climb the leaderboard. {info.runsLeft} more ranked run{info.runsLeft === 1 ? "" : "s"} today after this one.</>
        ) : info.closed ? (
          <><b>Practice run.</b> Leaderboard scoring has closed. Play for fun!</>
        ) : (
          <><b>Practice run.</b> You&apos;ve used today&apos;s {info.runsPerDay} ranked runs. Your best ({info.best} XP) still counts; ranked runs refill tomorrow.</>
        )}
      </p>
    </Panel>
  );
}

function RankedBreakdown({ run }: { run: NonNullable<NonNullable<AnswerResult["summary"]>["ranked"]> }) {
  // A coin "ding" for every line that scored, counted up like an arcade tally.
  useEffect(() => {
    const scored = [run.base, run.perfect, run.speed].filter((v) => v > 0).length;
    const timers = Array.from({ length: scored }, (_, i) => setTimeout(() => play("coin"), 500 + i * 220));
    return () => timers.forEach(clearTimeout);
  }, [run.base, run.perfect, run.speed]);
  const lines = [
    ["Accuracy", run.base],
    ["Perfect bonus", run.perfect],
    [`Speed bonus (${run.seconds}s)`, run.speed],
  ] as const;
  return (
    <Panel variant="raised" className="mx-auto mt-4 max-w-xs p-4 text-left">
      <ul className="space-y-1 text-sm">
        {lines.map(([l, v]) => (
          <li key={l} className="flex justify-between"><span className="text-muted">{l}</span><span className="font-arcade">{v}</span></li>
        ))}
        <li className="flex justify-between border-t-2 border-dashed border-[var(--parch-lo)] pt-1"><b>Run score</b><span className="font-arcade text-gold">{run.total}/{run.max}</span></li>
      </ul>
      <p className="mt-2 text-xs text-muted">
        {!run.counts
          ? "Practice run: not counted on the leaderboard."
          : run.improvedBy > 0
            ? `New best! +${run.improvedBy} XP on the leaderboard (best is now ${run.best}).`
            : `Your best (${run.best}) still stands. Only your best run counts.`}
      </p>
    </Panel>
  );
}

// ---------------- Summary ----------------

function Summary({ summary, totalXP, game, onReplay, backHref, backLabel, character }: { summary: NonNullable<AnswerResult["summary"]>; totalXP: number; game: StartResult; onReplay: () => void; backHref: string; backLabel: string; character: string }) {
  const ratio = summary.maxScore ? summary.score / summary.maxScore : 1;
  const verdict = summary.perfect ? "PERFECT!" : ratio >= 0.6 ? "GREAT JOB!" : "NICE TRY!";
  const triumph = summary.perfect || (summary.ranked?.improvedBy ?? 0) > 0;
  // Fanfare + victory jingle for a perfect run or a new best; a softer chime otherwise.
  useEffect(() => {
    play(triumph ? "fanfare" : "unlock");
    if (triumph) music.jingle("victory");
  }, [triumph]);
  return (
    <div className="text-center">
      <Confetti show={summary.perfect} />
      <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 16 }}>
        <p className="font-arcade text-sm text-gold">{verdict}</p>
        <Sprite name={character} size={128} anim={summary.perfect || (summary.ranked?.improvedBy ?? 0) > 0 ? "jump" : "idle"} className="mx-auto mt-4" />
        <p className="font-pixel mt-3 text-5xl">
          {summary.score}
          <span className="text-2xl text-muted">/{summary.maxScore}</span>
        </p>
        <p className="mt-1 text-muted">{game.mission.title} · {DIFFICULTIES[game.difficulty].label}</p>
        <Panel tone="gold" className="mx-auto mt-5 flex max-w-xs items-center justify-center gap-2 p-3">
          <PixelIcon name="bolt" size={22} />
          <span className="font-arcade text-sm text-gold">+{totalXP} XP</span>
        </Panel>
        {summary.ranked ? <RankedBreakdown run={summary.ranked} /> : totalXP === 0 && <p className="mt-2 text-xs text-muted">Side-quest XP is a one-time bonus, and it&apos;s already banked. Replays are for fun!</p>}
      </motion.div>
      <div className="mx-auto mt-6 grid max-w-sm gap-3">
        <Button onClick={onReplay}>{summary.ranked ? "Try for a better score" : "Play again"}</Button>
        <ButtonLink href={backHref} tone="ghost">{backLabel}</ButtonLink>
        <Link href="/play/leaderboard" className="font-pixel text-gold underline underline-offset-4">See the leaderboard ›</Link>
      </div>
    </div>
  );
}
