"use client";

import { useSyncExternalStore } from "react";

const subscribe = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};

/** Booth Wi-Fi is unreliable: tell players we're offline instead of failing silently. */
export function NetworkBanner() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  if (online) return null;
  return (
    <div role="status" className="font-pixel sticky top-16 z-20 bg-gold-lo px-4 py-2 text-center text-sm text-gold-hi">
      You&apos;re offline. Your progress is safe. Answers will send when you reconnect.
    </div>
  );
}
