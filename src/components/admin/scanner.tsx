"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { confirmRedeem, lookupClaim } from "@/app/actions/admin";
import { Button, Panel, PixelIcon, RewardArt, Sprite, Tag } from "../pixel";
import { inputCls } from "./forms";
import { play } from "@/lib/sfx";

type Preview = Extract<Awaited<ReturnType<typeof lookupClaim>>, { ok: true }>["data"];

declare global {
  interface Window {
    BarcodeDetector?: new (opts: { formats: string[] }) => { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };
  }
}

function extractToken(raw: string) {
  try {
    const u = new URL(raw);
    return u.searchParams.get("t") ?? raw;
  } catch {
    return raw;
  }
}

export function Scanner({ initialToken }: { initialToken?: string }) {
  const [input, setInput] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [lookupKey, setLookupKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [camera, setCamera] = useState(false);
  const [pending, start] = useTransition();
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasDetector = useSyncExternalStore(() => () => {}, () => !!window.BarcodeDetector, () => false);

  const lookup = useCallback((value: string) => {
    setError(null);
    setDone(null);
    setPreview(null);
    const key = extractToken(value.trim());
    setLookupKey(key);
    start(async () => {
      const res = await lookupClaim(key).catch(() => null);
      if (!res?.ok) return setError(res?.error ?? "Network error. Try again.");
      setPreview(res.data);
    });
  }, []);

  useEffect(() => {
    // Opened from the player's QR via the phone camera: load the claim straight away.
    if (!initialToken) return;
    const key = extractToken(initialToken);
    lookupClaim(key)
      .catch(() => null)
      .then((res) => {
        setLookupKey(key);
        if (!res?.ok) setError(res?.error ?? "Network error. Try again.");
        else setPreview(res.data);
      });
  }, [initialToken]);

  useEffect(() => {
    if (!camera || !window.BarcodeDetector) return;
    let stream: MediaStream | null = null;
    let stop = false;
    const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        while (!stop) {
          const codes = await detector.detect(videoRef.current).catch(() => []);
          if (codes[0]?.rawValue) {
            play("correct");
            setCamera(false);
            lookup(codes[0].rawValue);
            break;
          }
          await new Promise((r) => setTimeout(r, 250));
        }
      } catch {
        setError("Camera unavailable. Use your phone's camera app or type the code.");
        setCamera(false);
      }
    })();
    return () => {
      stop = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [camera, lookup]);

  const redeem = () => {
    if (!preview?.ok) return;
    start(async () => {
      const res = await confirmRedeem(preview.claimId).catch(() => null);
      if (!res?.ok) {
        play("wrong");
        setError(res?.error ?? "Network error: check the redemption list before retrying.");
        if (lookupKey) {
          const again = await lookupClaim(lookupKey).catch(() => null);
          if (again?.ok) setPreview(again.data);
        }
        return;
      }
      play("levelup");
      setDone(`Hand over: ${preview.reward.name}`);
      setPreview(null);
      setInput("");
    });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-4">
        <Panel variant="raised" className="p-4">
          <p className="font-pixel text-lg">1. Scan the player&apos;s QR</p>
          <p className="mt-1 text-sm text-muted">Easiest: point your phone&apos;s normal camera at their QR. It opens this page with the claim loaded (you must be logged in).</p>
          {hasDetector && (
            <Button tone="blue" size="sm" className="mt-3" onClick={() => setCamera((c) => !c)}>
              <PixelIcon name="camera" size={16} /> {camera ? "Stop camera" : "Scan here"}
            </Button>
          )}
          {camera && <video ref={videoRef} className="mt-3 aspect-square w-full bg-black object-cover" muted playsInline />}
        </Panel>
        <Panel variant="raised" className="p-4">
          <p className="font-pixel text-lg">…or type the 6-letter code</p>
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (input.trim()) lookup(input);
            }}
          >
            <input value={input} onChange={(e) => setInput(e.target.value.toUpperCase())} maxLength={7} placeholder="K7Q4MX" className={`${inputCls} font-arcade tracking-[0.3em]`} aria-label="Claim code" />
            <Button size="sm" type="submit" disabled={pending}>Look up</Button>
          </form>
        </Panel>
      </div>

      <div>
        {pending && !preview && <p className="font-pixel text-muted">Checking…</p>}
        {error && (
          <Panel tone="red" className="p-4">
            <p className="font-pixel text-lg text-red">{error}</p>
          </Panel>
        )}
        {done && (
          <Panel tone="green" className="p-6 text-center">
            <PixelIcon name="check" size={48} className="mx-auto" />
            <p className="font-pixel mt-2 text-2xl text-green">Redeemed!</p>
            <p className="mt-1">{done}</p>
          </Panel>
        )}
        {preview && !preview.ok && (
          <Panel tone="red" className="p-4">
            <p className="font-pixel text-lg">{preview.reason}</p>
          </Panel>
        )}
        {preview?.ok && (
          <Panel tone={preview.status === "ISSUED" && !preview.expired ? "gold" : "red"} className="p-5">
            <p className="font-pixel text-lg">2. Check &amp; confirm</p>
            <div className="mt-3 flex items-center gap-4">
              <RewardArt name={preview.reward.icon} size={80} />
              <div>
                <p className="font-pixel text-2xl">{preview.reward.name}</p>
                <p className="text-sm text-muted">{preview.reward.stock} left in stock</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <Sprite name={preview.player.avatar} size={48} />
              <div>
                <p className="font-pixel">{preview.player.nickname}</p>
                <p className="font-arcade text-xs text-gold">LV{preview.player.level} · {preview.player.xpTotal} XP</p>
              </div>
            </div>
            <div className="mt-3">
              {preview.status === "REDEEMED" ? (
                <Tag tone="red">Already redeemed {preview.redeemedAt ? new Date(preview.redeemedAt).toLocaleString() : ""}: do not hand out</Tag>
              ) : preview.status === "VOID" ? (
                <Tag tone="red">Voided</Tag>
              ) : preview.expired ? (
                <Tag tone="red">Expired: ask the player to tap “Claim” again for a fresh code</Tag>
              ) : (
                <Tag tone="green">Valid · single use</Tag>
              )}
            </div>
            {preview.status === "ISSUED" && !preview.expired && (
              <Button tone="green" size="lg" className="mt-5 w-full" onClick={redeem} disabled={pending || preview.reward.stock <= 0}>
                {pending ? "Redeeming…" : preview.reward.stock <= 0 ? "Out of stock" : "Confirm & hand over"}
              </Button>
            )}
          </Panel>
        )}
      </div>
    </div>
  );
}
