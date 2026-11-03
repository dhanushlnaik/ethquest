import Link from "next/link";
import { PlayerGate } from "@/components/game-page";
import { BuilderDna } from "@/components/games/dna";

export const metadata = { title: "Ethereum Builder DNA" };

export default function Page() {
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/play/pathfinder" className="font-arcade text-xs text-muted">‹ PATHFINDER</Link>
      <header className="mb-4 mt-2">
        <p className="font-arcade text-xs text-gold">WORLD 04 · THE PATHFINDER</p>
        <h1 className="font-pixel text-3xl">Ethereum Builder DNA</h1>
        <p className="text-sm text-muted">Five questions. Seven builder types. Which one are you?</p>
      </header>
      <PlayerGate path="/play/personality">{() => <BuilderDna />}</PlayerGate>
    </div>
  );
}
