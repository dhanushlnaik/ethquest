import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { getPlayer } from "@/lib/server/session";
import { PixelLoader } from "./pixel";
import { NeedPlayer } from "./need-player";
import { GameRunner } from "./games/runner";
import { rankedPreview } from "@/lib/server/event";
import { isRanked } from "@/lib/config/game";

type Props = { slug: string; title: string; kicker: string; blurb?: string; back: { href: string; label: string }; path: string; character?: string; intro?: string };

export function GamePage(props: Props) {
  return (
    <div className="mx-auto max-w-2xl">
      <Link href={props.back.href} className="font-arcade text-xs text-muted">‹ {props.back.label.toUpperCase()}</Link>
      <header className="mb-4 mt-2">
        <p className="font-arcade text-xs text-purple-hi">{props.kicker}</p>
        <h1 className="font-pixel text-3xl">{props.title}</h1>
        {props.blurb && <p className="text-sm text-muted">{props.blurb}</p>}
      </header>
      <Suspense fallback={<PixelLoader label="Loading game" />}>
        <Gate {...props} />
      </Suspense>
    </div>
  );
}

async function Gate({ slug, path, back, character, intro }: Props) {
  const player = await getPlayer();
  if (!player) return <NeedPlayer next={path} />;
  // Ranked games wait on a start screen, so browsing to a game never spends one of the day's runs.
  const gate = isRanked(slug) ? await rankedPreview(player.id, slug) : undefined;
  return <GameRunner slug={slug} backHref={back.href} backLabel={back.label} character={character} intro={intro} gate={gate} />;
}

export function PlayerGate({ path, children }: { path: string; children: (player: NonNullable<Awaited<ReturnType<typeof getPlayer>>>) => ReactNode }) {
  return (
    <Suspense fallback={<PixelLoader />}>
      <PlayerGateInner path={path}>{children}</PlayerGateInner>
    </Suspense>
  );
}

async function PlayerGateInner({ path, children }: { path: string; children: (player: NonNullable<Awaited<ReturnType<typeof getPlayer>>>) => ReactNode }) {
  const player = await getPlayer();
  if (!player) return <NeedPlayer next={path} />;
  return <>{children(player)}</>;
}
