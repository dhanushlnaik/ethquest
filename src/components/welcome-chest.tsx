"use client";

import { useEffect, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { requestClaim } from "@/app/actions/rewards";
import { Button, PixelIcon, Treasure } from "./pixel";
import { Burst } from "./burst";
import { play } from "@/lib/sfx";

type Claim = { qrSvg: string; shortCode: string; expiresAt: string };

/**
 * Level 1 · The Drop. The chest opens with one tap and reveals a single-use claim QR.
 * Opening it only issues a code: the volunteer's scan is what marks the swag as collected.
 */
export function WelcomeChest({ collected, soldOut, nickname }: { collected: boolean; soldOut: boolean; nickname: string }) {
  const [opened, setOpened] = useState(false);
  const [claim, setClaim] = useState<Claim | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const open = () =>
    start(async () => {
      setError(null);
      setOpened(true);
      play("chest");
      setTimeout(() => play("coins"), 560);
      const res = await requestClaim("welcome-pack").catch(() => null);
      if (!res?.ok) return setError(res?.error ?? "Connection hiccup. Tap to try again.");
      setClaim(res.data);
    });

  if (collected) {
    return (
      <Shell>
        <Treasure name="chest-open" size={128} className="mx-auto" />
        <p className="font-pixel mt-3 text-xl">Welcome reward collected ✓</p>
        <p className="mt-1 text-sm text-muted">Stickers + jute bag are yours. The real hunt starts now.</p>
      </Shell>
    );
  }
  if (soldOut) {
    return (
      <Shell>
        <Treasure name="chest-closed" size={128} className="mx-auto opacity-60 grayscale" />
        <p className="font-pixel mt-3 text-xl">The welcome chest is empty for now</p>
        <p className="mt-1 text-sm text-muted">Ask a volunteer: we may be restocking. You can still play for the T-shirt and the hoodie!</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <p className="font-arcade text-sm leading-relaxed sm:text-base">
        Welcome, <span className="text-red">{nickname}</span>!<br />Take <span className="text-red">your reward</span>, hero!
      </p>
      <div className="relative mx-auto mt-4 grid h-36 w-36 place-items-center">
        <AnimatePresence mode="wait">
          {!opened ? (
            <motion.div key="closed" exit={{ scale: 1.25, opacity: 0 }} transition={{ duration: 0.18 }}>
              <Treasure name="chest-closed" size={128} className="anim-rattle" alt="Closed treasure chest" />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ scale: 0.6, y: 10 }} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 380, damping: 14 }} className="anim-glow">
              <Treasure name="chest-open" size={136} alt="Open treasure chest" />
            </motion.div>
          )}
        </AnimatePresence>
        {opened && <Burst icons={["coin", "star", "coin", "diamond"]} count={16} />}
      </div>

      {!opened && (
        <>
          <Button size="lg" className="shine mt-4 min-w-48" onClick={open}>OPEN!</Button>
          <p className="mt-3 text-xs text-muted">Free for everyone · No quiz · No sign-up</p>
        </>
      )}
      {opened && pending && <p className="font-arcade mt-4 text-xs text-muted">Unrolling your claim scroll…</p>}
      {error && (
        <div className="mt-4">
          <p className="text-sm text-red">{error}</p>
          <Button size="sm" className="mt-2" onClick={open}>Try again</Button>
        </div>
      )}
      {claim && <ClaimScroll claim={claim} onRefresh={open} />}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    // CSS entrance: visible even before JavaScript loads.
    <section className="px-panel anim-pop-in mx-auto w-full max-w-md px-6 py-7 text-center">{children}</section>
  );
}

function ClaimScroll({ claim, onRefresh }: { claim: Claim; onRefresh: () => void }) {
  const [left, setLeft] = useState(() => Math.max(0, new Date(claim.expiresAt).getTime() - Date.now()));
  useEffect(() => {
    const t = setInterval(() => setLeft(Math.max(0, new Date(claim.expiresAt).getTime() - Date.now())), 1000);
    return () => clearInterval(t);
  }, [claim.expiresAt]);
  const mins = Math.floor(left / 60000);
  const secs = Math.floor((left % 60000) / 1000);
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden">
      <p className="font-pixel mt-4 text-2xl">Stickers + Jute bag</p>
      <p className="font-arcade mt-1 text-xs text-gold">SHOW THIS TO A VOLUNTEER AT THE BOOTH</p>
      {left > 0 ? (
        <>
          <div className="mx-auto mt-3 aspect-square w-full max-w-[240px] bg-[#fff8e8] p-2 [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: claim.qrSvg }} />
          <p className="font-arcade mt-3 text-xs text-muted">OR TELL THEM THIS CODE</p>
          <p className="font-arcade mt-1 text-3xl tracking-[0.3em]">{claim.shortCode}</p>
          <p className="mt-2 text-xs text-muted">Single use · refreshes in {mins}:{String(secs).padStart(2, "0")}</p>
        </>
      ) : (
        <div className="py-4">
          <p className="font-pixel">This code expired.</p>
          <Button size="sm" className="mt-2" onClick={onRefresh}><PixelIcon name="qr" size={16} /> Fresh code</Button>
        </div>
      )}
    </motion.div>
  );
}
