"use client";

import { useEffect } from "react";
import { music, updateSettings } from "@/lib/audio";
import { useAudioSettings } from "./sound-panel";
import { PixelIcon } from "./pixel";

/** Booth TV: a slow, quiet loop that sits under conversation. Browsers need one click to allow audio. */
export function KioskMusic() {
  const s = useAudioSettings();
  useEffect(() => {
    music.want("kiosk");
  }, []);
  return (
    <button
      onClick={() => updateSettings({ music: !s.music, musicVol: s.music ? s.musicVol : Math.min(s.musicVol, 0.35) })}
      className="px-btn px-btn--ghost px-btn--sm"
      aria-pressed={s.music}
    >
      <PixelIcon name={s.music ? "sound" : "mute"} size={18} /> {s.music ? "Music on" : "Play booth music"}
    </button>
  );
}
