"use client";

import { useOptimistic, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { setDifficulty } from "@/app/actions/player";
import { DIFFICULTIES, type DifficultyKey } from "@/lib/config/game";
import { Button, PixelIcon } from "./pixel";
import { play } from "@/lib/sfx";
import { Portal } from "./portal";

export function DifficultySwitch({ value }: { value: DifficultyKey }) {
  const [open, setOpen] = useState(false);
  const [optimistic, setOptimistic] = useOptimistic(value);
  const [pending, start] = useTransition();
  const current = DIFFICULTIES[optimistic];

  const choose = (d: DifficultyKey) => {
    play("tap");
    setOpen(false);
    start(async () => {
      setOptimistic(d);
      await setDifficulty(d);
    });
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-panel px-panel--raised font-arcade shrink-0 px-2 py-1 text-xs leading-none"
        style={{ color: current.color }}
        aria-label={`Difficulty: ${current.label}. Change difficulty`}
        disabled={pending}
      >
        {current.short}
      </button>
      <Portal>
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-[65] flex items-end justify-center bg-void/60 sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)}>
            <motion.div
              initial={{ y: 40 }}
              animate={{ y: 0 }}
              exit={{ y: 40 }}
              className="px-panel px-panel--purple w-full max-w-md p-5 pb-8"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-label="Choose difficulty"
            >
              <p className="font-arcade text-xs text-purple-hi">DIFFICULTY</p>
              <p className="mt-1 text-sm text-muted">Changes which questions you get. Ranked scores are equal at every level, so pick what feels fun.</p>
              <div className="mt-4 space-y-3">
                {(Object.keys(DIFFICULTIES) as DifficultyKey[]).map((d) => (
                  <button key={d} onClick={() => choose(d)} className="px-panel px-panel--raised px-choice flex items-center gap-3" data-state={d === optimistic ? "selected" : undefined}>
                    <PixelIcon name={d === "EXPLORER" ? "compass" : d === "BUILDER" ? "bolt" : "brain"} size={28} />
                    <span>
                      <span className="font-pixel block text-lg" style={{ color: DIFFICULTIES[d].color }}>
                        {DIFFICULTIES[d].label}
                      </span>
                      <span className="block text-sm text-muted">{DIFFICULTIES[d].blurb}</span>
                    </span>
                  </button>
                ))}
              </div>
              <Button tone="ghost" size="sm" className="mt-4 w-full" onClick={() => setOpen(false)}>
                Close
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </Portal>
    </>
  );
}
