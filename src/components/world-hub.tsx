import { Suspense } from "react";
import Link from "next/link";
import { getPlayer } from "@/lib/server/session";
import { completedMissions, missionsByWorld } from "@/lib/server/progress";
import { isRanked, WORLDS, type WorldKey } from "@/lib/config/game";
import { cx, PixelIcon, PixelLoader, Sprite, Tag } from "./pixel";
import { NeedPlayer } from "./need-player";
import type { IconName } from "@/lib/pixel/icons";

export const MISSION_ROUTE: Record<string, string> = {
  "guess-that-eip": "/play/guess-that-eip",
  "spot-the-fake": "/play/spot-the-fake",
  "fork-detective": "/play/fork-detective",
  "timeline-rebuild": "/play/upgrade-lab/timeline",
  "timeline-missing": "/play/upgrade-lab/missing-piece",
  "timeline-match": "/play/upgrade-lab/match",
  "timeline-next": "/play/upgrade-lab/next",
  "eip-explorer": "/play/eip-explorer/quest",
  "find-your-eip": "/play/find-your-eip",
  "eip-hunt": "/play/eip-explorer/hunt",
  pathfinder: "/play/pathfinder",
  "builder-dna": "/play/personality",
  "core-dev-insider": "/play/core-dev-insider",
  "hq-tour": "/play/protocol-hq/tour",
};

const MISSION_ICON: Record<string, IconName> = {
  "guess-that-eip": "question", "spot-the-fake": "mask", "fork-detective": "magnifier", "timeline-rebuild": "hourglass",
  "timeline-missing": "question", "timeline-match": "check", "timeline-next": "star", "find-your-eip": "scroll", "eip-explorer": "magnifier", "eip-hunt": "map",
  pathfinder: "compass", "builder-dna": "helix", "core-dev-insider": "gavel", "hq-tour": "diamond",
};

export function WorldHub({ world, intro }: { world: WorldKey; intro?: React.ReactNode }) {
  const w = WORLDS[world];
  return (
    <div className="-mx-4 -mt-5">
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={w.scene} alt="" className="pixelated aspect-[16/9] max-h-[46vh] w-full object-cover sm:aspect-[16/6]" />
        <div className="absolute inset-0 bg-gradient-to-t from-page via-page/20 to-transparent" />
        <Link href="/play/worlds" className="wood-plate font-arcade absolute left-3 top-3 px-3 py-1 text-xs">‹ Map</Link>
        <div className="absolute inset-x-0 bottom-0 mx-auto flex max-w-5xl items-end gap-3 px-4 pb-3">
          <Sprite name={w.character} size={96} className="anim-bob shrink-0" />
          <div className="pb-2">
            <p className="wood-plate font-arcade inline-block px-3 py-1 text-xs text-[var(--gold)]">World {w.n}</p>
            <h1 className="font-pixel text-3xl leading-tight [text-shadow:0_3px_0_rgba(20,14,8,0.8)] sm:text-4xl">{w.name}</h1>
            <p className="text-sm text-muted">{w.tagline}</p>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-5xl px-4 pt-4">
        {intro}
        <Suspense fallback={<PixelLoader label="Loading missions" />}>
          <MissionList world={world} />
        </Suspense>
      </div>
    </div>
  );
}

async function MissionList({ world }: { world: WorldKey }) {
  const player = await getPlayer();
  if (!player) return <NeedPlayer next={WORLDS[world].href} />;
  const [done, byWorld] = await Promise.all([completedMissions(player.id), missionsByWorld()]);
  const missions = byWorld.get(world) ?? [];
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {missions.map((m, i) => (
        <li key={m.slug} className="anim-pop-in" style={{ animationDelay: `${i * 80}ms` }}>
          <Link href={MISSION_ROUTE[m.slug] ?? "/play/worlds"} className={cx("px-panel flex items-center gap-3 p-4 transition-transform active:translate-y-0.5", isRanked(m.slug) ? "px-panel--gold" : done.has(m.slug) ? "px-panel--green" : "px-panel--raised")}>
            <span className="px-panel px-panel--sunken grid h-14 w-14 shrink-0 place-items-center">
              <PixelIcon name={MISSION_ICON[m.slug] ?? "star"} size={36} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="font-pixel block text-xl leading-tight">{m.title}</span>
              <span className="block text-sm text-muted">{m.blurb}</span>
              <span className="mt-1 flex gap-2">
                {isRanked(m.slug) ? <Tag tone="gold">Ranked · hoodie</Tag> : m.xpComplete > 0 && <Tag tone="gold">Side quest +{m.xpComplete} XP</Tag>}
                {done.has(m.slug) && (
                  <Tag tone="green">
                    <PixelIcon name="check" size={10} /> Done
                  </Tag>
                )}
              </span>
            </span>
            <span className="font-arcade text-xs text-gold">▶</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
