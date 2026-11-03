import { Suspense } from "react";
import Link from "next/link";
import { getPlayer } from "@/lib/server/session";
import { getJourney } from "@/lib/server/journey";
import { ButtonLink, PixelIcon, PixelLoader, Sprite } from "@/components/pixel";
import { NeedPlayer } from "@/components/need-player";
import { WelcomeChest } from "@/components/welcome-chest";
import { EipsInsightPromo } from "@/components/promo";

export const metadata = { title: "Your welcome reward" };

export default function WelcomePage() {
  return (
    <div className="mx-auto max-w-3xl pt-2">
      <p className="font-arcade text-center text-xs text-gold">Level 1 · The Drop · Free unlock</p>
      <Suspense fallback={<PixelLoader label="Finding your chest" />}>
        <Chest />
      </Suspense>
    </div>
  );
}

async function Chest() {
  const player = await getPlayer();
  if (!player) return <NeedPlayer next="/play/welcome" title="Your welcome chest awaits" />;
  const j = await getJourney(player);
  return (
    <>
      <div className="relative mt-3">
        <Sprite name="explorer" size={96} anim="jump" className="absolute -top-16 left-2 z-10 hidden drop-shadow-[0_5px_0_rgba(20,14,8,0.45)] sm:block" />
        <WelcomeChest collected={j.welcome.state === "collected"} soldOut={j.welcome.state === "soldout"} nickname={player.nickname} />
      </div>

      <section className="px-panel px-panel--green mx-auto mt-6 max-w-md p-5 text-center">
        <p className="font-arcade text-[11px] text-gold">Optional · Level 2 &amp; 3</p>
        <h2 className="font-pixel text-2xl">Want to play?</h2>
        <p className="mt-1 text-sm text-muted">Four quick quests. Earn XP to unlock a <b className="text-text">T-shirt</b>, then climb the two-day leaderboard for the <b className="text-text">one and only hoodie</b>.</p>
        <ButtonLink href="/play" tone="green" className="mt-4 w-full"><PixelIcon name="map" size={20} /> Start the treasure hunt</ButtonLink>
        <p className="mt-3 text-xs text-muted">
          Playing as <b className="text-text">{player.nickname}</b> · <Link href="/play/profile" className="underline underline-offset-2">change name</Link>
        </p>
      </section>
      <EipsInsightPromo className="mx-auto mt-6 max-w-md" />
    </>
  );
}
