"use client";

import { useEffect, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { requestClaim } from "@/app/actions/rewards";
import { Button, PixelIcon, RewardArt } from "./pixel";
import { play } from "@/lib/sfx";
import { Portal } from "./portal";

type Claim = { qrSvg: string; shortCode: string; expiresAt: string; reward: { name: string; icon: string } };

export function ClaimButton({ slug, label = "Claim at booth", redeemed }: { slug: string; label?: string; redeemed?: boolean }) {
  const [claim, setClaim] = useState<Claim | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const open = () =>
    start(async () => {
      setError(null);
      const res = await requestClaim(slug).catch(() => null);
      if (!res?.ok) return setError(res?.error ?? "Connection hiccup. Try again.");
      play("unlock");
      setClaim(res.data);
    });

  if (redeemed) return <p className="font-arcade text-xs text-green">COLLECTED ✓</p>;

  return (
    <>
      <Button tone="gold" size="sm" onClick={open} disabled={pending}>
        <PixelIcon name="qr" size={16} /> {pending ? "…" : label}
      </Button>
      {error && <p className="mt-2 text-sm text-red">{error}</p>}
      <Portal>
        <AnimatePresence>
          {claim && <ClaimModal claim={claim} onClose={() => setClaim(null)} onRefresh={open} />}
        </AnimatePresence>
      </Portal>
    </>
  );
}

function ClaimModal({ claim, onClose, onRefresh }: { claim: Claim; onClose: () => void; onRefresh: () => void }) {
  const [left, setLeft] = useState(() => Math.max(0, new Date(claim.expiresAt).getTime() - Date.now()));
  useEffect(() => {
    const t = setInterval(() => setLeft(Math.max(0, new Date(claim.expiresAt).getTime() - Date.now())), 1000);
    return () => clearInterval(t);
  }, [claim.expiresAt]);
  const mins = Math.floor(left / 60000);
  const secs = Math.floor((left % 60000) / 1000);
  return (
    <motion.div className="fixed inset-0 z-[70] flex items-center justify-center bg-[rgba(20,24,28,0.86)] p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-label="Reward claim code">
      <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="px-panel px-panel--gold w-full max-w-sm p-5 text-center">
        <RewardArt name={claim.reward.icon} size={72} className="mx-auto" />
        <p className="font-arcade mt-2 text-xs text-gold">SHOW THIS TO A VOLUNTEER</p>
        <p className="font-pixel text-2xl">{claim.reward.name}</p>
        {left > 0 ? (
          <>
            <div className="mx-auto mt-4 aspect-square w-full max-w-[260px] bg-[#fff8e8] p-2 [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: claim.qrSvg }} />
            <p className="font-arcade mt-4 text-xs text-muted">OR TELL THEM THIS CODE</p>
            <p className="font-arcade mt-1 text-2xl tracking-[0.3em] text-text">{claim.shortCode}</p>
            <p className="mt-3 text-xs text-muted">
              Single use · expires in {mins}:{String(secs).padStart(2, "0")}
            </p>
          </>
        ) : (
          <div className="py-6">
            <p className="font-pixel text-lg">This code expired.</p>
            <Button className="mt-3" onClick={onRefresh}>Get a fresh code</Button>
          </div>
        )}
        <Button tone="ghost" size="sm" className="mt-4 w-full" onClick={onClose}>Close</Button>
      </motion.div>
    </motion.div>
  );
}
