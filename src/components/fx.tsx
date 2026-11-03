"use client";

import { createContext, use, useCallback, useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { Badge, Button, PixelIcon, RewardArt } from "./pixel";
import { play } from "@/lib/sfx";
import type { GainsDTO } from "@/lib/games/types";

type Fx = { celebrate: (g: GainsDTO | undefined | null) => void };
const FxContext = createContext<Fx | null>(null);

export function useFx() {
  const ctx = use(FxContext);
  if (!ctx) throw new Error("useFx must be used inside <FxProvider>");
  return ctx;
}

type Pop = { id: number; xp: number; capped: boolean };

export function FxProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pops, setPops] = useState<Pop[]>([]);
  const [queue, setQueue] = useState<({ type: "level"; level: number; name: string } | { type: "ach"; name: string; icon: string; description: string })[]>([]);

  const celebrate = useCallback(
    (g: GainsDTO | undefined | null) => {
      if (!g) return;
      if (g.xp > 0 || g.capped) {
        const id = Date.now() + Math.random();
        setPops((p) => [...p, { id, xp: g.xp, capped: g.capped && g.xp === 0 }]);
        if (g.xp > 0) play("xp");
        setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 1800);
      }
      const modal = [
        ...g.achievements.map((a) => ({ type: "ach" as const, name: a.name, icon: a.icon, description: a.description })),
        ...(g.levelUp ? [{ type: "level" as const, level: g.levelUp.level, name: g.levelUp.name }] : []),
      ];
      if (modal.length) setQueue((q) => [...q, ...modal]);
      if (g.xp > 0 || modal.length) router.refresh();
    },
    [router],
  );

  const current = queue[0];
  const dismiss = () => setQueue((q) => q.slice(1));

  return (
    <FxContext value={{ celebrate }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-20 z-50 flex flex-col items-center gap-2" aria-live="polite">
        <AnimatePresence>
          {pops.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 20, scale: 0.6 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ type: "spring", stiffness: 500, damping: 22 }}
              className="px-panel px-panel--gold flex items-center gap-2 px-4 py-2"
            >
              <PixelIcon name={p.capped ? "hourglass" : "bolt"} size={22} />
              <span className="font-arcade text-xs text-gold">{p.capped ? "XP CAP REACHED TODAY" : `+${p.xp} XP`}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {current && <CelebrationModal key={`${current.type}-${current.name}`} item={current} onClose={dismiss} />}
      </AnimatePresence>
    </FxContext>
  );
}

function CelebrationModal({ item, onClose }: { item: { type: "level"; level: number; name: string } | { type: "ach"; name: string; icon: string; description: string }; onClose: () => void }) {
  useEffect(() => {
    play(item.type === "level" ? "levelup" : "unlock");
  }, [item.type]);
  return (
    <motion.div className="fixed inset-0 z-[70] flex items-center justify-center bg-void/60 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} role="dialog" aria-modal="true">
      <motion.div
        initial={{ scale: 0.4, rotate: -6 }}
        animate={{ scale: 1, rotate: 0 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 16 }}
        className={`px-panel ${item.type === "level" ? "px-panel--purple" : "px-panel--gold"} w-full max-w-sm px-6 py-8 text-center`}
        onClick={(e) => e.stopPropagation()}
      >
        <Rays />
        {item.type === "level" ? (
          <>
            <p className="font-arcade text-xs text-purple-hi">LEVEL UP!</p>
            <div className="relative mx-auto my-4 w-fit anim-bob">
              <RewardArt name="trophy" size={112} />
            </div>
            <p className="font-arcade text-2xl text-gold">LV {item.level}</p>
            <p className="font-pixel mt-2 text-2xl">{item.name}</p>
          </>
        ) : (
          <>
            <p className="font-arcade text-xs text-gold">ACHIEVEMENT UNLOCKED</p>
            <div className="relative mx-auto my-5 w-fit">
              <Badge icon={item.icon} size={112} className="anim-float" />
            </div>
            <p className="font-pixel text-2xl">{item.name}</p>
            <p className="mt-2 text-sm text-muted">{item.description}</p>
          </>
        )}
        <Button tone={item.type === "level" ? "purple" : "gold"} className="mt-6 w-full" onClick={onClose} autoFocus>
          Nice!
        </Button>
      </motion.div>
    </motion.div>
  );
}

function Rays() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="anim-spin absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 opacity-20" style={{ background: "repeating-conic-gradient(var(--c-orange) 0 10deg, transparent 10deg 30deg)", animationDuration: "12s" }} />
    </div>
  );
}

export function Confetti({ show }: { show: boolean }) {
  const [pieces] = useState(() => Array.from({ length: 40 }, (_, i) => ({ i, x: Math.random() * 100, d: Math.random() * 0.6, c: ["var(--c-red)", "var(--c-yellow)", "var(--c-blue)", "var(--c-green)", "var(--c-pink)", "var(--c-orange)"][i % 6] })));
  if (!show) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {pieces.map((p) => (
        <motion.span
          key={p.i}
          className="absolute top-0 block h-2 w-2"
          style={{ left: `${p.x}%`, background: p.c }}
          initial={{ y: -20, opacity: 1 }}
          animate={{ y: "100vh", opacity: 0, rotate: 360 }}
          transition={{ duration: 1.8, delay: p.d, ease: "easeIn" }}
        />
      ))}
    </div>
  );
}
