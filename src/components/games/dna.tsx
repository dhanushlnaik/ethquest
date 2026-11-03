"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { completeDna } from "@/app/actions/player";
import { DNA_QUESTIONS, DNA_RESULTS, type DnaResultKey } from "@/lib/games/content";
import { useFx, Confetti } from "../fx";
import { Badge, Bar, Button, ButtonLink, ExternalLink, Panel, PixelIcon, Sprite } from "../pixel";
import { play } from "@/lib/sfx";

export function BuilderDna() {
  const [answers, setAnswers] = useState<string[]>([]);
  const [result, setResult] = useState<DnaResultKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const { celebrate } = useFx();
  const idx = answers.length;

  const answer = (id: string) => {
    play("tap");
    const next = [...answers, id];
    setAnswers(next);
    if (next.length === DNA_QUESTIONS.length) {
      start(async () => {
        const res = await completeDna(next).catch(() => null);
        if (!res?.ok) {
          setAnswers(next.slice(0, -1));
          return setError(res?.error ?? "Connection hiccup. Tap your answer again.");
        }
        play("levelup");
        setResult(res.data.result);
        celebrate(res.data.gains);
      });
    }
  };

  if (result) {
    const r = DNA_RESULTS[result];
    return (
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200, damping: 16 }}>
        <Confetti show />
        <Panel tone="blue" className="overflow-hidden text-center">
          <div className="bg-gradient-to-b from-blue-lo/40 to-transparent px-6 pt-6">
            <p className="font-arcade text-xs text-blue-hi">YOUR ETHEREUM BUILDER DNA</p>
            <Sprite name={r.sprite} size={160} className="anim-bob mx-auto mt-3" />
          </div>
          <div className="px-6 pb-6">
            <h2 className="font-pixel text-4xl text-gold">{r.name}</h2>
            <p className="mx-auto mt-3 max-w-md">{r.description}</p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <Badge icon="helix" size={56} />
              <p className="font-arcade text-xs text-muted">BADGE: BUILDER DNA</p>
            </div>
            <p className="mt-4 text-sm">
              Recommended on EIPsInsight: <ExternalLink href={r.link.url}>{r.link.label} ↗</ExternalLink>
            </p>
          </div>
        </Panel>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Button
            tone="gold"
            onClick={async () => {
              const text = `My Ethereum Builder DNA: ${r.name}! Find yours at the EIPsInsight booth, Devcon 8.`;
              try {
                if (navigator.share) await navigator.share({ title: "Ethereum Builder DNA", text, url: `${location.origin}/play/personality` });
                else await navigator.clipboard.writeText(text);
              } catch {}
            }}
          >
            <PixelIcon name="star" size={18} /> Share my DNA
          </Button>
          <ButtonLink href="/play/pathfinder" tone="ghost">Find your path next ›</ButtonLink>
        </div>
      </motion.div>
    );
  }

  const q = DNA_QUESTIONS[Math.min(idx, DNA_QUESTIONS.length - 1)];
  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <span className="font-arcade text-xs text-muted">{Math.min(idx + 1, DNA_QUESTIONS.length)}/{DNA_QUESTIONS.length}</span>
        <Bar value={idx / DNA_QUESTIONS.length} tone="blue" className="flex-1" />
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={idx} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
          <h2 className="font-pixel text-2xl sm:text-3xl">{q.q}</h2>
          <p className="mt-1 text-sm text-muted">No wrong answers. Go with your gut.</p>
          <ul className="mt-4 grid gap-3">
            {q.options.map((o) => (
              <li key={o.id}>
                <button disabled={pending} onClick={() => answer(o.id)} className="px-panel px-panel--raised px-choice font-pixel text-lg">
                  {o.label}
                </button>
              </li>
            ))}
          </ul>
        </motion.div>
      </AnimatePresence>
      {pending && <p className="font-pixel mt-4 text-center text-muted">Sequencing your DNA…</p>}
      {error && <p role="alert" className="mt-3 text-red">{error}</p>}
    </div>
  );
}
