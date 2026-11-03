import Link from "next/link";
import { PlayerGate } from "@/components/game-page";
import { FindEip } from "@/components/games/find-eip";

export const metadata = { title: "Find Your EIP" };

export default function Page() {
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/play/eip-explorer" className="font-arcade text-xs text-muted">‹ EIP EXPLORER</Link>
      <header className="mb-4 mt-2">
        <p className="font-arcade text-xs text-green">WORLD 03 · THE EIP EXPLORER</p>
        <h1 className="font-pixel text-3xl">Type any number. Discover its story.</h1>
        <p className="text-sm text-muted">Every EIP has a number, an author and a story. Live data straight from EIPsInsight.</p>
      </header>
      <PlayerGate path="/play/find-your-eip">{() => <FindEip />}</PlayerGate>
    </div>
  );
}
