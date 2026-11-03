"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { LiveState } from "@/lib/live/types";

/** Polls the room about once a second. Returns the latest snapshot and the server-clock offset. */
export function useLive(code: string, role: "host" | "player") {
  const [snap, setSnap] = useState<{ state: LiveState; offset: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const res = await fetch(`/api/live/${code}${role === "host" ? "?role=host" : ""}`, { cache: "no-store" });
        const json = await res.json();
        if (!alive) return;
        if (!res.ok) setError(json.error ?? "Connection problem");
        else {
          setSnap({ state: json, offset: json.serverNow - Date.now() });
          setError(null);
        }
      } catch {
        if (alive) setError("Reconnecting…");
      }
      if (alive) timer = setTimeout(tick, document.hidden ? 4000 : 1000);
    };
    void tick();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [code, role]);
  return { state: snap?.state ?? null, offset: snap?.offset ?? 0, error };
}

const subscribe = (cb: () => void) => {
  const t = setInterval(cb, 200);
  return () => clearInterval(t);
};
const nowTenth = () => Math.floor(Date.now() / 100);

/** Seconds left on the current question, on the server's clock. */
export function useSecondsLeft(state: LiveState | null, offset: number) {
  const now = useSyncExternalStore(subscribe, nowTenth, () => 0) * 100;
  if (!state?.question || !state.startedAt || state.status !== "QUESTION" || !now) return null;
  const ms = state.startedAt + state.question.seconds * 1000 - (now + offset);
  return Math.max(0, ms / 1000);
}
