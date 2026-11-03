import { Suspense } from "react";
import Link from "next/link";
import { db } from "@/lib/server/db";
import { requireAdminPage } from "@/lib/server/admin";
import { eventStats } from "@/lib/server/leaderboard";
import { Panel, PixelIcon, PixelLoader } from "@/components/pixel";

export const metadata = { title: "Overview" };

export default function AdminHome() {
  return (
    <Suspense fallback={<PixelLoader />}>
      <Overview />
    </Suspense>
  );
}

const hourAgo = () => new Date(Date.now() - 3_600_000);

async function Overview() {
  const admin = await requireAdminPage();
  const since = hourAgo();
  const [stats, lastHour, recent] = await Promise.all([
    eventStats(),
    db.player.count({ where: { createdAt: { gte: since } } }),
    db.missionAttempt.findMany({ where: { status: "COMPLETED" }, orderBy: { completedAt: "desc" }, take: 8, include: { mission: { select: { title: true } }, player: { select: { nickname: true } } } }),
  ]);
  const kiosk = `/kiosk/leaderboard?token=${process.env.KIOSK_TOKEN ?? ""}`;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-pixel text-3xl">Hi {admin.name.split(" ")[0]}!</h1>
        <Link href="/live/host" className="px-btn px-btn--gold px-btn--sm ml-auto"><PixelIcon name="star" size={16} /> Host a live quiz</Link>
        {admin.role !== "VOLUNTEER" && <a href={kiosk} target="_blank" className="px-btn px-btn--blue px-btn--sm"><PixelIcon name="trophy" size={16} /> Kiosk leaderboard</a>}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Players", stats.players],
          ["New in last hour", lastHour],
          ["XP earned", stats.xp],
          ["Games played", stats.games],
        ].map(([label, value]) => (
          <Panel key={label} variant="raised" className="p-4">
            <p className="font-arcade text-xs text-muted">{String(label).toUpperCase()}</p>
            <p className="font-pixel mt-1 text-3xl text-gold">{value}</p>
          </Panel>
        ))}
      </div>
      <section>
        <h2 className="font-pixel mb-2 text-xl">Latest games</h2>
        <Panel variant="sunken" className="divide-y-2 divide-line">
          {recent.length === 0 && <p className="p-4 text-muted">None yet.</p>}
          {recent.map((a) => (
            <p key={a.id} className="flex justify-between gap-3 px-4 py-2 text-sm">
              <span>{a.player.nickname} · {a.mission.title} · {a.score}/{a.maxScore}</span>
              <span className="text-muted">{a.completedAt?.toLocaleTimeString()}</span>
            </p>
          ))}
        </Panel>
      </section>
    </div>
  );
}
