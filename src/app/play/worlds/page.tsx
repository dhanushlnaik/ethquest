import { Suspense } from "react";
import Link from "next/link";
import { getPlayer } from "@/lib/server/session";
import { completedMissions, missionsByWorld } from "@/lib/server/progress";
import { WORLDS, type WorldKey } from "@/lib/config/game";
import { Bar, PixelIcon, PixelLoader, SectionTitle, Sprite, Tag } from "@/components/pixel";
import { NeedPlayer } from "@/components/need-player";
import { MISSION_ROUTE } from "@/components/world-hub";

export const metadata = { title: "World Map" };

export default function WorldsPage() {
  return (
    <>
      <SectionTitle kicker="Quest map" title="Choose your island">
        Four ranked quests count for the hoodie. Side quests give a one-time XP bonus. Every game takes 1–3 minutes.
      </SectionTitle>
      <Suspense fallback={<PixelLoader label="Loading worlds" />}>
        <WorldMap />
      </Suspense>
    </>
  );
}

async function WorldMap() {
  const player = await getPlayer();
  if (!player) return <NeedPlayer next="/play/worlds" />;
  const [done, byWorld] = await Promise.all([completedMissions(player.id), missionsByWorld()]);
  const next = [...byWorld.values()].flat().find((m) => !done.has(m.slug));

  return (
    <>
      {next && (
        <Link href={MISSION_ROUTE[next.slug] ?? "/play/worlds"} className="px-panel px-panel--gold mb-5 flex items-center gap-3 p-3">
          <PixelIcon name="question" size={32} className="anim-bob" />
          <span className="min-w-0 flex-1">
            <span className="font-arcade block text-xs text-gold">NEXT QUEST</span>
            <span className="font-pixel block truncate text-lg">{next.title}</span>
          </span>
          <span className="font-arcade text-xs text-gold">GO ›</span>
        </Link>
      )}
      <ul className="grid gap-4 sm:grid-cols-2">
        {(Object.keys(WORLDS) as WorldKey[]).map((key, i) => {
          const w = WORLDS[key];
          const missions = byWorld.get(key) ?? [];
          const complete = missions.filter((m) => done.has(m.slug)).length;
          return (
            <li key={key} className={`anim-pop-in ${i === 0 ? "sm:col-span-2" : ""}`} style={{ animationDelay: `${i * 90}ms` }}>
              <Link href={w.href} className="group block">
                <article className="px-panel relative overflow-hidden transition-transform group-active:translate-y-0.5" style={{ ["--pc" as string]: complete === missions.length && missions.length ? "var(--c-yellow-dk)" : undefined }}>
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={w.scene} alt="" className={`pixelated w-full object-cover ${i === 0 ? "aspect-[16/7]" : "aspect-video"} transition-transform duration-500 group-hover:scale-105`} />
                    <div className="absolute inset-0 bg-gradient-to-t from-page via-page/10 to-transparent" />
                    <span className="wood-plate font-arcade absolute left-3 top-3 px-3 py-1 text-xs text-[var(--gold)]">
                      World {w.n}
                    </span>
                    {complete === missions.length && missions.length > 0 && (
                      <span className="absolute right-3 top-3"><Tag tone="gold">Cleared</Tag></span>
                    )}
                  </div>
                  <div className="relative flex items-end gap-3 px-4 pb-4">
                    <Sprite name={w.character} size={80} className="-mt-14 shrink-0 drop-shadow-[0_4px_0_rgba(20,14,8,0.45)] group-hover:anim-bob" />
                    <div className="min-w-0 flex-1">
                      <h2 className="font-pixel text-2xl leading-tight">{w.name}</h2>
                      <p className="text-sm text-muted">{w.tagline}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <Bar value={missions.length ? complete / missions.length : 0} tone="purple" className="flex-1" label={`${w.name} progress`} />
                        <span className="font-arcade text-xs text-muted">{complete}/{missions.length}</span>
                      </div>
                    </div>
                  </div>
                </article>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
