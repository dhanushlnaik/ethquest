"use client";

import { useEffect } from "react";

/** Sends a beacon whenever a player opens an EIPsInsight / resource link (any a[data-track]). */
export function ClickTracker() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a[data-track]") as HTMLAnchorElement | null;
      if (!a?.href) return;
      try {
        navigator.sendBeacon("/api/track", new Blob([JSON.stringify({ url: a.href, path: location.pathname })], { type: "application/json" }));
      } catch {}
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);
  return null;
}
