import { Suspense } from "react";
import { db } from "@/lib/server/db";
import { requireAdminPage } from "@/lib/server/admin";
import { Panel, PixelLoader } from "@/components/pixel";

export const metadata = { title: "Analytics" };

export default function AnalyticsPage() {
  return (
    <>
      <h1 className="font-pixel mb-1 text-3xl">Event analytics</h1>
      <p className="mb-4 text-sm text-muted">Anonymous gameplay events only. No emails, wallets or personal data are collected.</p>
      <Suspense fallback={<PixelLoader />}>
        <Stats />
      </Suspense>
    </>
  );
}

type Row = { k: string | null; n: bigint };
const num = (rows: Row[]) => rows.map((r) => ({ k: r.k ?? "—", n: Number(r.n) }));

async function Stats() {
  await requireAdminPage();
  const [players, sessions, events, starts, completes, difficulty, hints, scores, roles, interests, searches, clicks, xp, redeemed, timeline] = await Promise.all([
    db.player.count(),
    db.playerSession.count(),
    db.$queryRaw<Row[]>`SELECT name AS k, COUNT(*) AS n FROM "Event" GROUP BY 1 ORDER BY 2 DESC`,
    db.$queryRaw<Row[]>`SELECT props->>'mission' AS k, COUNT(*) AS n FROM "Event" WHERE name='mission_start' GROUP BY 1 ORDER BY 2 DESC`,
    db.$queryRaw<Row[]>`SELECT m.slug AS k, COUNT(*) AS n FROM "MissionAttempt" a JOIN "Mission" m ON m.id=a."missionId" WHERE a.status='COMPLETED' GROUP BY 1 ORDER BY 2 DESC`,
    db.$queryRaw<Row[]>`SELECT difficulty::text AS k, COUNT(*) AS n FROM "Player" GROUP BY 1 ORDER BY 2 DESC`,
    db.$queryRaw<Row[]>`SELECT 'hints' AS k, COALESCE(SUM("hintsUsed"),0)::bigint AS n FROM "MissionAttempt"`,
    db.$queryRaw<{ k: string; avg: number }[]>`SELECT m.slug AS k, ROUND(AVG(a.score::numeric / NULLIF(a."maxScore",0)) * 100, 1)::float AS avg FROM "MissionAttempt" a JOIN "Mission" m ON m.id=a."missionId" WHERE a.status='COMPLETED' GROUP BY 1`,
    db.$queryRaw<Row[]>`SELECT role AS k, COUNT(*) AS n FROM "PlayerPathway" GROUP BY 1 ORDER BY 2 DESC`,
    db.$queryRaw<Row[]>`SELECT interest AS k, COUNT(*) AS n FROM "PlayerPathway" GROUP BY 1 ORDER BY 2 DESC`,
    db.$queryRaw<Row[]>`SELECT number::text AS k, COUNT(*) AS n FROM "EIPLookup" GROUP BY 1 ORDER BY 2 DESC LIMIT 10`,
    db.$queryRaw<Row[]>`SELECT props->>'path' AS k, COUNT(*) AS n FROM "Event" WHERE name='product_click' GROUP BY 1 ORDER BY 2 DESC LIMIT 10`,
    db.xPTransaction.aggregate({ _sum: { amount: true } }),
    db.$queryRaw<Row[]>`SELECT r.name AS k, COUNT(*) AS n FROM "RewardClaim" c JOIN "Reward" r ON r.id=c."rewardId" WHERE c.status='REDEEMED' GROUP BY 1`,
    db.$queryRaw<{ k: string; avg: number }[]>`SELECT 'timeline' AS k, ROUND(AVG(a.score::numeric / NULLIF(a."maxScore",0)) * 100, 1)::float AS avg FROM "MissionAttempt" a JOIN "Mission" m ON m.id=a."missionId" WHERE a.status='COMPLETED' AND m.slug='timeline-rebuild'`,
  ]);
  const startMap = new Map(num(starts).map((r) => [r.k, r.n]));
  const completeMap = new Map(num(completes).map((r) => [r.k, r.n]));
  const scoreMap = new Map(scores.map((s) => [s.k, s.avg]));
  const missionSlugs = [...new Set([...startMap.keys(), ...completeMap.keys()])];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Unique players", players],
          ["Sessions", sessions],
          ["XP distributed", xp._sum.amount ?? 0],
          ["Hints used", Number(hints[0]?.n ?? 0)],
          ["Timeline accuracy", `${timeline[0]?.avg ?? 0}%`],
          ["EIP searches", num(searches).reduce((s, r) => s + r.n, 0)],
          ["Product clicks", num(clicks).reduce((s, r) => s + r.n, 0)],
          ["Rewards redeemed", num(redeemed).reduce((s, r) => s + r.n, 0)],
        ].map(([l, v]) => (
          <Panel key={String(l)} variant="raised" className="p-3">
            <p className="font-arcade text-xs text-muted">{String(l).toUpperCase()}</p>
            <p className="font-pixel text-2xl text-gold">{v}</p>
          </Panel>
        ))}
      </div>
      <Panel variant="sunken" className="overflow-x-auto p-4">
        <p className="font-pixel mb-2 text-xl">Games</p>
        <table className="w-full min-w-[480px] text-sm">
          <thead className="font-arcade text-left text-xs text-muted"><tr><th>Mission</th><th>Starts</th><th>Completions</th><th>Completion rate</th><th>Avg score</th></tr></thead>
          <tbody>
            {missionSlugs.map((s) => {
              const st = startMap.get(s) ?? 0;
              const c = completeMap.get(s) ?? 0;
              return (
                <tr key={s} className="border-t-2 border-line">
                  <td className="py-1">{s}</td><td>{st}</td><td>{c}</td><td>{st ? Math.round((c / st) * 100) : 0}%</td><td>{scoreMap.get(s) ?? "—"}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>
      <div className="grid gap-4 sm:grid-cols-2">
        <Breakdown title="Difficulty preference" rows={num(difficulty)} />
        <Breakdown title="Pathfinder roles" rows={num(roles)} />
        <Breakdown title="Popular interests" rows={num(interests)} />
        <Breakdown title="Top EIP searches" rows={num(searches).map((r) => ({ ...r, k: `EIP-${r.k}` }))} />
        <Breakdown title="Product clicks by page" rows={num(clicks)} />
        <Breakdown title="Redeemed by reward" rows={num(redeemed)} />
        <Breakdown title="All events" rows={num(events)} />
      </div>
    </div>
  );
}

function Breakdown({ title, rows }: { title: string; rows: { k: string; n: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <Panel variant="raised" className="p-4">
      <p className="font-pixel mb-2 text-lg">{title}</p>
      {rows.length === 0 && <p className="text-sm text-muted">No data yet.</p>}
      <ul className="space-y-1">
        {rows.map((r) => (
          <li key={r.k} className="text-sm">
            <div className="flex justify-between"><span className="truncate">{r.k}</span><span className="text-gold">{r.n}</span></div>
            <div className="h-2 bg-sunken"><div className="h-2 bg-purple" style={{ width: `${(r.n / max) * 100}%` }} /></div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
