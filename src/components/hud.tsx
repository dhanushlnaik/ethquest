import Link from "next/link";
import { getPlayer } from "@/lib/server/session";
import { levelFor } from "@/lib/config/game";
import { Bar, Sprite } from "./pixel";
import { DifficultySwitch } from "./difficulty-switch";
import { SoundToggle } from "./sound-toggle";

export async function Hud() {
  const player = await getPlayer();
  if (!player) {
    return (
      <div className="ml-auto flex items-center gap-2">
        <SoundToggle />
      </div>
    );
  }
  const lvl = levelFor(player.xpTotal);
  return (
    <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
      <Link href="/play/profile" className="flex min-w-0 items-center gap-2" aria-label="Your profile">
        <Sprite name={player.avatar} size={40} className="-my-1 shrink-0" />
        <div className="min-w-0">
          <p className="font-pixel truncate text-sm leading-none">
            <span className="font-arcade mr-1 text-xs text-gold">LV{lvl.level}</span>
            {player.nickname}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <Bar value={lvl.progress} className="w-20 sm:w-28" label="Level progress" />
            <span className="font-arcade text-xs text-gold">{player.xpTotal}</span>
          </div>
        </div>
      </Link>
      <DifficultySwitch value={player.difficulty} />
      <SoundToggle />
    </div>
  );
}
