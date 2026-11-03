import { Suspense } from "react";
import Link from "next/link";
import { db } from "@/lib/server/db";
import { getPlayer } from "@/lib/server/session";
import { rankOf } from "@/lib/server/leaderboard";
import { completedMissions } from "@/lib/server/progress";
import { levelFor, LEVELS, DIFFICULTIES } from "@/lib/config/game";
import { Badge, Bar, Panel, PixelIcon, PixelLoader, Sprite, Tag } from "@/components/pixel";
import { NeedPlayer } from "@/components/need-player";
import { ProfileEditor, RecoveryCode } from "@/components/profile-editor";

export const metadata = { title: "Your Profile" };

const REASONS: Record<string, string> = {
  "guess-that-eip": "Guess That EIP", "spot-the-fake": "Spot the Fake", "fork-detective": "Fork Detective", "timeline-rebuild": "Timeline",
  "timeline-missing": "Missing Piece", "timeline-match": "Upgrade Match", "timeline-next": "Predictions", "core-dev-insider": "Core Dev Insider",
  "hq-tour": "EIPsInsight Tour", "find-your-eip": "Found an EIP", "eip-hunt": "EIP Hunt", pathfinder: "Pathfinder", "builder-dna": "Builder DNA",
};

export default function ProfilePage() {
  return (
    <Suspense fallback={<PixelLoader label="Loading profile" />}>
      <Profile />
    </Suspense>
  );
}

async function Profile() {
  const player = await getPlayer();
  if (!player) return <NeedPlayer next="/play/profile" />;
  const [achievements, mine, ledger, rank, done, pathways] = await Promise.all([
    db.achievement.findMany({ orderBy: { sortOrder: "asc" } }),
    db.playerAchievement.findMany({ where: { playerId: player.id } }),
    db.xPTransaction.findMany({ where: { playerId: player.id }, orderBy: { createdAt: "desc" }, take: 12 }),
    rankOf(player.id, player.xpTotal),
    completedMissions(player.id),
    db.playerPathway.findMany({ where: { playerId: player.id }, orderBy: { createdAt: "desc" }, take: 3, include: { pathway: true } }),
  ]);
  const unlocked = new Map(mine.map((m) => [m.achievementId, m]));
  const lvl = levelFor(player.xpTotal);

  return (
    <div className="space-y-5">
      <Panel tone="purple" className="overflow-hidden">
        <div className="flex items-center gap-4 bg-gradient-to-r from-purple-lo/40 to-transparent p-5">
          <Sprite name={player.avatar} size={112} className="anim-bob shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-arcade text-xs text-gold">LV {lvl.level} · RANK #{rank}</p>
            <h1 className="font-pixel truncate text-3xl">{player.nickname}</h1>
            <p className="font-pixel text-purple-hi">{lvl.name}</p>
            <div className="mt-2 flex items-center gap-2">
              <Bar value={lvl.progress} className="flex-1" label="Level progress" />
              <span className="font-arcade text-xs text-gold">{player.xpTotal} XP</span>
            </div>
            <p className="mt-1 text-xs text-muted">{lvl.next ? `${lvl.next.xp - player.xpTotal} XP to ${lvl.next.name}` : "Max level reached. Legendary!"}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 border-t-[3px] border-line px-5 py-3">
          <Tag tone="blue">{DIFFICULTIES[player.difficulty].label} mode</Tag>
          <Tag tone="green">{done.size} missions cleared</Tag>
          <Tag tone="gold">{mine.length}/{achievements.length} badges</Tag>
        </div>
      </Panel>

      <ProfileEditor nickname={player.nickname} avatar={player.avatar} />

      <section>
        <h2 className="font-pixel mb-3 text-2xl">Achievements</h2>
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {achievements.map((a) => {
            const got = unlocked.get(a.id);
            return (
              <li key={a.id}>
                <Panel variant="raised" className="flex h-full flex-col items-center p-3 text-center" title={a.description}>
                  <Badge icon={a.icon} locked={!got} size={56} />
                  <p className={`font-pixel mt-2 text-sm leading-tight ${got ? "" : "text-faint"}`}>{a.name}</p>
                  <p className="mt-1 text-[11px] leading-snug text-muted">{a.description}</p>
                </Panel>
              </li>
            );
          })}
        </ul>
      </section>

      {pathways.length > 0 && (
        <section>
          <h2 className="font-pixel mb-3 text-2xl">Your paths</h2>
          <ul className="space-y-2">
            {pathways.map((p) => (
              <li key={p.id}>
                <Link href={`/play/pathfinder/result/${p.shareId}`} className="px-panel px-panel--raised flex items-center gap-3 p-3">
                  <PixelIcon name="compass" size={24} />
                  <span className="font-pixel flex-1">{p.pathway.title}</span>
                  <span className="font-arcade text-xs text-muted">VIEW ›</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="font-pixel mb-3 text-2xl">Recent activity</h2>
        {ledger.length === 0 ? (
          <Panel className="p-5 text-center text-muted">No XP yet. Jump into a world to start!</Panel>
        ) : (
          <Panel variant="sunken" className="divide-y-2 divide-line">
            {ledger.map((t) => {
              const key = t.reason.split(":")[0];
              const label = t.reason.startsWith("achievement:") ? "Achievement bonus" : t.reason.startsWith("admin") ? "Booth bonus" : REASONS[key] ?? key;
              return (
                <div key={t.id} className="flex items-center gap-3 px-4 py-2">
                  <PixelIcon name="bolt" size={16} />
                  <span className="flex-1 text-sm">{label}</span>
                  <span className="font-arcade text-xs text-gold">+{t.amount}</span>
                </div>
              );
            })}
          </Panel>
        )}
      </section>

      <section>
        <h2 className="font-pixel mb-3 text-2xl">Level road</h2>
        <ol className="no-scrollbar flex gap-2 overflow-x-auto pb-2">
          {LEVELS.map((l) => (
            <li key={l.level} className={`px-panel min-w-[120px] p-3 ${player.xpTotal >= l.xp ? "px-panel--gold" : "px-panel--sunken"}`}>
              <p className="font-arcade text-xs text-gold">LV{l.level} · {l.xp}XP</p>
              <p className="font-pixel text-sm leading-tight">{l.name}</p>
            </li>
          ))}
        </ol>
      </section>

      <RecoveryCode />
    </div>
  );
}
