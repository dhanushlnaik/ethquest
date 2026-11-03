import { Suspense } from "react";
import { db } from "@/lib/server/db";
import { requireAdminPage } from "@/lib/server/admin";
import { grantBoothAchievement, setBanned } from "@/app/actions/admin";
import { ActionButton, inputCls } from "@/components/admin/forms";
import { BonusXP, Rename } from "@/components/admin/player-tools";
import { Panel, PixelLoader, Sprite, Tag } from "@/components/pixel";

export const metadata = { title: "Players" };

export default function PlayersPage({ searchParams }: PageProps<"/booth-admin/players">) {
  return (
    <>
      <h1 className="font-pixel mb-1 text-3xl">Players</h1>
      <p className="mb-4 text-sm text-muted">Find a player by nickname to grant booth activities (EIP Wall, video challenge), bonus XP or moderate names.</p>
      <Suspense fallback={<PixelLoader />}>
        <List searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function List({ searchParams }: { searchParams: PageProps<"/booth-admin/players">["searchParams"] }) {
  const admin = await requireAdminPage();
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim().slice(0, 40) : "";
  const [players, manual] = await Promise.all([
    db.player.findMany({
      where: query ? { nickname: { contains: query, mode: "insensitive" } } : {},
      orderBy: query ? { nickname: "asc" } : { createdAt: "desc" },
      take: 25,
      include: { achievements: { include: { achievement: true } } },
    }),
    db.achievement.findMany({ where: { manual: true } }),
  ]);
  return (
    <>
      <form className="mb-4 flex gap-2">
        <input name="q" defaultValue={query} placeholder="Search nickname…" className={inputCls} />
        <button className="px-btn px-btn--sm">Search</button>
      </form>
      <ul className="space-y-3">
        {players.map((p) => {
          const has = new Set(p.achievements.map((a) => a.achievement.slug));
          return (
            <li key={p.id}>
              <Panel variant="raised" tone={p.isBanned ? "red" : "default"} className="space-y-3 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Sprite name={p.avatar} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="font-pixel text-lg">{p.nickname} {p.isBanned && <Tag tone="red">banned</Tag>}</p>
                    <p className="font-arcade text-xs text-muted">LV{p.level} · {p.xpTotal} XP · {p.difficulty} · joined {p.createdAt.toLocaleString()}</p>
                  </div>
                  <Rename playerId={p.id} current={p.nickname} />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {manual.map((a) => (
                    has.has(a.slug)
                      ? <Tag key={a.slug} tone="green">✓ {a.name}</Tag>
                      : <ActionButton key={a.slug} label={`Grant: ${a.name}`} tone="blue" run={grantBoothAchievement.bind(null, p.id, a.slug)} />
                  ))}
                </div>
                {admin.role !== "VOLUNTEER" && (
                  <div className="flex flex-wrap items-center gap-3">
                    <BonusXP playerId={p.id} />
                    <ActionButton label={p.isBanned ? "Unban" : "Ban"} confirm={p.isBanned ? undefined : `Ban ${p.nickname}? They'll be removed from the leaderboard.`} run={setBanned.bind(null, p.id, !p.isBanned)} />
                  </div>
                )}
              </Panel>
            </li>
          );
        })}
        {players.length === 0 && <p className="text-muted">No players found.</p>}
      </ul>
    </>
  );
}
