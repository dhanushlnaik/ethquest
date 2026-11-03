"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { music, play } from "@/lib/audio";
import { RANKED_GAMES } from "@/lib/config/game";

const RANKED_PATHS: string[] = Object.values(RANKED_GAMES).map((g) => g.href);

/** Picks the music for the current screen and plays a soft page-turn between screens. */
export function MusicDirector() {
  const path = usePathname();
  const first = useRef(true);
  useEffect(() => {
    music.want(RANKED_PATHS.includes(path) ? "ranked" : "map");
    if (first.current) first.current = false;
    else play("page");
  }, [path]);
  return null;
}
