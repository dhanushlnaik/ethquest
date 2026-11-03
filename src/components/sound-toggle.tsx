"use client";

import { useSyncExternalStore } from "react";
import { play, setSoundEnabled, soundEnabled } from "@/lib/sfx";
import { PixelIcon } from "./pixel";

const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

export function SoundToggle() {
  const on = useSyncExternalStore(subscribe, soundEnabled, () => false);
  return (
    <button
      onClick={() => {
        setSoundEnabled(!on);
        listeners.forEach((l) => l());
        if (!on) play("correct");
      }}
      className="grid h-10 w-10 shrink-0 place-items-center"
      aria-label={on ? "Mute sound effects" : "Turn on sound effects"}
      aria-pressed={on}
    >
      <PixelIcon name={on ? "sound" : "mute"} size={24} />
    </button>
  );
}
