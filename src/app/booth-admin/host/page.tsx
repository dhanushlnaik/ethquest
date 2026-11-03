import { Suspense } from "react";
import { requireAdminPage } from "@/lib/server/admin";
import { Panel, PixelLoader } from "@/components/pixel";

export const metadata = { title: "Shorts host guide" };

const FORMATS = [
  { name: "Ethereum Hot Takes", how: "Ask for a spicy (friendly) opinion on an upgrade, EIP or roadmap item. 30 seconds max.", prompts: ["Most underrated EIP ever?", "Blobs: overhyped or underhyped?", "One thing you'd remove from Ethereum?"] },
  { name: "Explain It Like I'm Five", how: "Guest explains a concept to an imaginary five-year-old. Host plays the confused kid.", prompts: ["What's a blob?", "What's a validator?", "What is an EIP?"] },
  { name: "Would You Rather?", how: "Two options, guest picks and explains in one sentence.", prompts: ["Faster blocks or cheaper fees?", "Write an EIP or review ten?", "Run a node forever or never pay gas again?"] },
  { name: "Guess the Number", how: "Guest guesses an EIP number or stat. Reveal on EIPsInsight live.", prompts: ["What number is the fee-burn EIP?", "How many blobs per block after Pectra (target)?", "Which EIP number is PeerDAS?"] },
  { name: "One Message to Ethereum", how: "Guest looks into the camera and says one thing to the Ethereum community.", prompts: ["Thank a client team", "Advice to a first-time contributor", "Your hope for the next upgrade"] },
];

export default function HostPage() {
  return (
    <Suspense fallback={<PixelLoader />}>
      <Guide />
    </Suspense>
  );
}

async function Guide() {
  await requireAdminPage();
  return (
    <div className="space-y-4">
      <h1 className="font-pixel text-3xl">YouTube Shorts: host reference</h1>
      <Panel tone="red" className="p-4">
        <p className="font-pixel text-lg">Consent first, always</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          <li>Ask for <b>recording consent</b> and <b>publishing consent</b> separately, before filming.</li>
          <li>Swag eligibility never depends on filming. Players earn rewards through the game.</li>
          <li>If someone wants a clip removed later, honour it.</li>
          <li>After filming (with consent), you may grant the &ldquo;Shorts Star&rdquo; badge in Players.</li>
        </ul>
      </Panel>
      <div className="grid gap-4 sm:grid-cols-2">
        {FORMATS.map((f) => (
          <Panel key={f.name} variant="raised" className="p-4">
            <p className="font-pixel text-xl text-gold">{f.name}</p>
            <p className="mt-1 text-sm">{f.how}</p>
            <ul className="mt-2 space-y-1 text-sm text-muted">{f.prompts.map((p) => <li key={p}>▸ {p}</li>)}</ul>
          </Panel>
        ))}
      </div>
      <p className="text-sm text-muted">Verify any number before publishing. Use EIPsInsight pages as the on-screen source.</p>
    </div>
  );
}
