import { Suspense } from "react";
import Link from "next/link";
import { db } from "@/lib/server/db";
import { requireAdminPage } from "@/lib/server/admin";
import { eventStats } from "@/lib/server/leaderboard";
import { Panel, PixelIcon, PixelLoader, RewardArt, Tag } from "@/components/pixel";

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
  const [stats, rewards, lastHour, recent] = await Promise.all([
    eventStats(),
    db.reward.findMany({ orderBy: { sortOrder: "asc" } }),
    db.player.count({ where: { createdAt: { gte: since } } }),
    db.rewardClaim.findMany({ where: { status: "REDEEMED" }, orderBy: { redeemedAt: "desc" }, take: 6, include: { reward: true, player: { select: { nickname: true } } } }),
  ]);
  const kiosk = `/kiosk/leaderboard?token=${process.env.KIOSK_TOKEN ?? ""}`;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-pixel text-3xl">Hi {admin.name.split(" ")[0]}!</h1>
        <Link href="/booth-admin/scan" className="px-btn px-btn--gold px-btn--sm ml-auto"><PixelIcon name="qr" size={16} /> Scan &amp; redeem</Link>
        {admin.role !== "VOLUNTEER" && <a href={kiosk} target="_blank" className="px-btn px-btn--blue px-btn--sm"><PixelIcon name="trophy" size={16} /> Kiosk leaderboard</a>}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Players with XP", stats.players],
          ["New in last hour", lastHour],
          ["XP distributed", stats.xp],
          ["Rewards redeemed", stats.redeemed],
        ].map(([label, value]) => (
          <Panel key={label} variant="raised" className="p-4">
            <p className="font-arcade text-xs text-muted">{String(label).toUpperCase()}</p>
            <p className="font-pixel mt-1 text-3xl text-gold">{value}</p>
          </Panel>
        ))}
      </div>
      <section>
        <h2 className="font-pixel mb-2 text-xl">Inventory</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {rewards.map((r) => (
            <Panel key={r.id} variant="raised" tone={r.stock < 20 ? "red" : "default"} className="flex items-center gap-3 p-3">
              <RewardArt name={r.icon} size={48} />
              <div>
                <p className="font-pixel leading-tight">{r.name}</p>
                <p className="text-sm"><span className={r.stock < 20 ? "text-red" : "text-green"}>{r.stock}</span> / {r.initialStock} left · {r.xpRequired} XP</p>
                {!r.isActive && <Tag tone="red">inactive</Tag>}
              </div>
            </Panel>
          ))}
        </div>
      </section>
      <section>
        <h2 className="font-pixel mb-2 text-xl">Latest redemptions</h2>
        <Panel variant="sunken" className="divide-y-2 divide-line">
          {recent.length === 0 && <p className="p-4 text-muted">None yet.</p>}
          {recent.map((c) => (
            <p key={c.id} className="flex justify-between px-4 py-2 text-sm">
              <span>{c.player.nickname} · {c.reward.name}</span>
              <span className="text-muted">{c.redeemedAt?.toLocaleTimeString()}</span>
            </p>
          ))}
        </Panel>
      </section>
    </div>
  );
}
