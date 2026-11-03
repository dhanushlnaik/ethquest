"use client";

import { useState, useSyncExternalStore } from "react";
import { getSettings, play, SERVER_SETTINGS, subscribeSettings, updateSettings, type AudioSettings } from "@/lib/audio";
import { Portal } from "./portal";
import { cx, PixelIcon } from "./pixel";

export function useAudioSettings(): AudioSettings {
  return useSyncExternalStore(subscribeSettings, getSettings, () => SERVER_SETTINGS);
}

/** Header sound button: opens a small panel with separate effects and music switches + volume. */
export function SoundPanel() {
  const s = useAudioSettings();
  const [open, setOpen] = useState(false);
  const on = s.sfx || s.music;
  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="grid h-10 w-10 shrink-0 place-items-center"
        aria-label="Sound settings"
        aria-expanded={open}
      >
        <PixelIcon name={on ? "sound" : "mute"} size={24} />
      </button>
      {open && (
        <Portal>
          <div className="fixed inset-0 z-[80]" onClick={() => setOpen(false)} aria-hidden />
          <div role="dialog" aria-label="Sound settings" className="px-panel anim-pop-in fixed right-3 top-[72px] z-[81] w-[min(320px,calc(100vw-24px))] p-4">
            <p className="font-arcade text-xs text-gold">Sound</p>
            <Row
              label="Effects"
              hint="Taps, coins, chests, fanfares"
              on={s.sfx}
              vol={s.sfxVol}
              onToggle={() => {
                updateSettings({ sfx: !s.sfx });
                if (!s.sfx) play("coin");
              }}
              onVol={(v) => updateSettings({ sfxVol: v })}
              onVolDone={() => play("tap")}
            />
            <Row
              label="Music"
              hint="Chiptune: map theme, ranked chase, victory jingle"
              on={s.music}
              vol={s.musicVol}
              onToggle={() => updateSettings({ music: !s.music })}
              onVol={(v) => updateSettings({ musicVol: v })}
            />
            <p className="mt-3 text-xs text-muted">Saved on this device. On iPhone, the silent switch mutes everything.</p>
          </div>
        </Portal>
      )}
    </>
  );
}

function Row({ label, hint, on, vol, onToggle, onVol, onVolDone }: { label: string; hint: string; on: boolean; vol: number; onToggle: () => void; onVol: (v: number) => void; onVolDone?: () => void }) {
  return (
    <div className="mt-3">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-pixel text-base">{label}</p>
          <p className="text-xs text-muted">{hint}</p>
        </div>
        <button
          role="switch"
          aria-checked={on}
          aria-label={`${label} ${on ? "on" : "off"}`}
          onClick={onToggle}
          className={cx("px-btn px-btn--sm !min-h-[36px] w-[72px] !px-0 !text-[0.75rem]", on ? "px-btn--green" : "px-btn--ghost")}
        >
          {on ? "On" : "Off"}
        </button>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={vol}
        disabled={!on}
        onChange={(e) => onVol(Number(e.target.value))}
        onPointerUp={onVolDone}
        aria-label={`${label} volume`}
        className="mt-2 w-full accent-[var(--gold-dk)] disabled:opacity-40"
      />
    </div>
  );
}
