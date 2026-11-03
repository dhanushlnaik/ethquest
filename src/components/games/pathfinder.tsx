"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { completePathfinder } from "@/app/actions/player";
import { GOALS, INTERESTS, ROLES } from "@/lib/games/content";
import { useFx } from "../fx";
import { Button, Panel, PixelIcon, Sprite, cx } from "../pixel";
import { play } from "@/lib/sfx";
import type { IconName } from "@/lib/pixel/icons";

const STEPS = ["Role", "Interest", "Goal"] as const;

export function Pathfinder() {
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<string | null>(null);
  const [interest, setInterest] = useState<string | null>(null);
  const [goal, setGoal] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [walking, setWalking] = useState(false);
  const router = useRouter();
  const { celebrate } = useFx();
  const roleSprite = ROLES.find((r) => r.id === role)?.sprite ?? "explorer";

  const finish = (g: string) => {
    setGoal(g);
    setWalking(true);
    start(async () => {
      const res = await completePathfinder({ role: role!, interest: interest!, goal: g }).catch(() => null);
      if (!res?.ok) {
        setWalking(false);
        return setError(res?.error ?? "Connection hiccup. Tap your goal again.");
      }
      // Let the walk animation breathe before revealing the card.
      await new Promise((r) => setTimeout(r, 1400));
      celebrate(res.data.gains);
      router.push(`/play/pathfinder/result/${res.data.shareId}`);
    });
  };

  return (
    <div>
      <div className="relative -mx-4 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/worlds/world-pathfinder.png" alt="" className="pixelated aspect-[16/8] w-full object-cover sm:aspect-[16/6]" />
        <div className="absolute inset-0 bg-gradient-to-t from-page via-transparent to-transparent" />
        <motion.div
          className="absolute bottom-3"
          initial={false}
          animate={walking ? { left: "78%", bottom: "38%", scale: 0.6 } : { left: `${10 + step * 18}%`, bottom: "6%", scale: 1 }}
          transition={{ duration: walking ? 1.4 : 0.5, ease: "easeInOut" }}
        >
          <Sprite name={roleSprite} size={80} className="anim-bob" />
        </motion.div>
        <div className="absolute inset-x-0 top-3 text-center">
          <p className="font-arcade text-xs text-gold">WORLD 04 · THE PATHFINDER</p>
        </div>
      </div>

      <div className="mt-4">
        <h1 className="font-arcade text-lg leading-snug text-gold sm:text-2xl">FIND YOUR PATH INTO ETHEREUM</h1>
        <p className="font-pixel mt-1 text-lg text-muted">You don&apos;t need to know everything. You just need somewhere to start.</p>
      </div>

      <ol className="mt-4 flex gap-2" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s} className={cx("font-arcade flex-1 border-b-4 pb-1 text-xs", i <= step ? "border-gold text-gold" : "border-line text-faint")}>
            {i + 1}. {s.toUpperCase()}
          </li>
        ))}
      </ol>

      <AnimatePresence mode="wait">
        {walking ? (
          <motion.div key="walk" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-10 text-center">
            <PixelIcon name="compass" size={56} className="anim-spin mx-auto" />
            <p className="font-pixel mt-4 text-2xl">Charting your path…</p>
            <p className="text-sm text-muted">Matching you with real resources from EIPsInsight and the community.</p>
          </motion.div>
        ) : step === 0 ? (
          <motion.section key="role" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="mt-5">
            <h2 className="font-pixel text-2xl">Where are you starting from?</h2>
            <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {ROLES.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => { play("tap"); setRole(r.id); setStep(1); }}
                    data-state={role === r.id ? "selected" : undefined}
                    className="px-panel px-panel--raised px-choice flex h-full flex-col items-center text-center"
                  >
                    <Sprite name={r.sprite} size={80} />
                    <span className="font-pixel mt-1 block text-lg leading-tight">{r.label}</span>
                    <span className="block text-xs text-muted">{r.blurb}</span>
                  </button>
                </li>
              ))}
            </ul>
          </motion.section>
        ) : step === 1 ? (
          <motion.section key="interest" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="mt-5">
            <h2 className="font-pixel text-2xl">What pulls you in?</h2>
            <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {INTERESTS.map((it) => (
                <li key={it.id}>
                  <button
                    onClick={() => { play("tap"); setInterest(it.id); setStep(2); }}
                    data-state={interest === it.id ? "selected" : undefined}
                    className="px-panel px-panel--raised px-choice flex h-full items-center gap-3"
                  >
                    <PixelIcon name={it.icon as IconName} size={32} />
                    <span className="font-pixel text-base leading-tight sm:text-lg">{it.label}</span>
                  </button>
                </li>
              ))}
            </ul>
            <Button tone="ghost" size="sm" className="mt-4" onClick={() => setStep(0)}>‹ Back</Button>
          </motion.section>
        ) : (
          <motion.section key="goal" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="mt-5">
            <h2 className="font-pixel text-2xl">What do you want to do next?</h2>
            <ul className="mt-3 grid gap-3">
              {GOALS.map((g) => (
                <li key={g.id}>
                  <button disabled={pending} onClick={() => { play("tap"); finish(g.id); }} data-state={goal === g.id ? "selected" : undefined} className="px-panel px-panel--raised px-choice flex items-center gap-3">
                    <PixelIcon name="flame" size={24} />
                    <span className="font-pixel text-lg">{g.label}</span>
                  </button>
                </li>
              ))}
            </ul>
            <Button tone="ghost" size="sm" className="mt-4" onClick={() => setStep(1)}>‹ Back</Button>
          </motion.section>
        )}
      </AnimatePresence>
      {error && (
        <Panel tone="red" className="mt-4 p-3">
          <p className="font-pixel">{error}</p>
        </Panel>
      )}
    </div>
  );
}
