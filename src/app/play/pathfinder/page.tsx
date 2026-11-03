import Link from "next/link";
import { PlayerGate } from "@/components/game-page";
import { Pathfinder } from "@/components/games/pathfinder";
import { PixelIcon } from "@/components/pixel";

export const metadata = { title: "The Pathfinder" };

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl">
      <PlayerGate path="/play/pathfinder">{() => <Pathfinder />}</PlayerGate>
      <Link href="/play/personality" className="px-panel px-panel--blue mt-8 flex items-center gap-3 p-4">
        <PixelIcon name="helix" size={32} />
        <span className="flex-1">
          <span className="font-pixel block text-lg">Ethereum Builder DNA</span>
          <span className="block text-sm text-muted">A 5-question personality quiz. What kind of builder are you?</span>
        </span>
        <span className="font-arcade text-xs text-blue">›</span>
      </Link>
    </div>
  );
}
