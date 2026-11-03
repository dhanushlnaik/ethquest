"use client";

import { useSyncExternalStore } from "react";

const subscribe = (cb: () => void) => {
  const t = setInterval(cb, 1000);
  return () => clearInterval(t);
};
const nowSec = () => Math.floor(Date.now() / 1000);

/** Live "1d 4h 12m" / "12:04" countdown. Renders a placeholder on the server to avoid hydration drift. */
export function Countdown({ to, className }: { to: string; className?: string }) {
  const now = useSyncExternalStore(subscribe, nowSec, () => 0);
  if (!now) return <span className={className}>…</span>;
  const left = Math.max(0, Math.floor(new Date(to).getTime() / 1000) - now);
  const d = Math.floor(left / 86400), h = Math.floor((left % 86400) / 3600), m = Math.floor((left % 3600) / 60), s = left % 60;
  const text = d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m` : `${m}:${String(s).padStart(2, "0")}`;
  return <span className={className}>{left ? text : "now"}</span>;
}
