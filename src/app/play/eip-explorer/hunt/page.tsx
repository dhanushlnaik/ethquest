import Link from "next/link";
import { PlayerGate } from "@/components/game-page";
import { EipHunt } from "@/components/games/hunt";

export const metadata = { title: "EIP Hunt" };

export default function Page() {
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/play/eip-explorer" className="font-arcade text-xs text-muted">‹ EIP EXPLORER</Link>
      <header className="mb-4 mt-2">
        <p className="font-arcade text-xs text-green">WORLD 03 · THE EIP EXPLORER</p>
        <h1 className="font-pixel text-3xl">EIP Hunt</h1>
        <p className="text-sm text-muted">Follow the clue. Find the proposal. Every find is worth XP.</p>
      </header>
      <PlayerGate path="/play/eip-explorer/hunt">{() => <EipHunt />}</PlayerGate>
    </div>
  );
}
