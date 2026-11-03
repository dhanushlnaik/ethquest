import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { getPlayer } from "@/lib/server/session";
import { dailyTop, rankOf, topPlayers, type BoardRow } from "@/lib/server/leaderboard";
import { LEVELS } from "@/lib/config/game";
import { cx, Panel, PixelIcon, PixelLoader, Sprite, Treasure } from "@/components/pixel";

export const metadata = { title: "Hall of Fame" };

export default function LeaderboardPage({ searchParams }: PageProps<"/play/leaderboard">) {
  return (
    <div className="mx-auto max-w-3xl">
      <Suspense fallback={<PixelLoader label="Counting XP" />}>
        <Board searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Board({ searchParams }: { searchParams: PageProps<"/play/leaderboard">["searchParams"] }) {
  const { view } = await searchParams;
  await connection();
  const today = view === "today";
  const [rows, me] = await Promise.all([today ? dailyTop(50) : topPlayers(50), getPlayer()]);
  const myRank = me && !today ? await rankOf(me.id, me.xpTotal) : null;

  return (
    <div className="space-y-5">
      <section className="px-panel px-panel--gold relative overflow-hidden p-5 text-center">
        <p className="font-arcade text-xs text-gold">Hall of Fame</p>
        <Treasure name="crown" size={88} className="anim-float anim-glow mx-auto mt-2" />
        <h1 className="font-pixel mt-2 text-3xl leading-tight sm:text-4xl">Protocol Legends</h1>
        <p className="mt-2 text-sm text-muted">The sharpest minds in Ethereum standards. Climb by beating your best score in the four ranked quests.</p>
      </section>

      <nav className="flex gap-2" aria-label="Leaderboard view">
        <Link href="/play/leaderboard" className={cx("px-btn px-btn--sm flex-1", today ? "px-btn--ghost" : "px-btn--gold")} aria-current={!today ? "page" : undefined}>All time</Link>
        <Link href="/play/leaderboard?view=today" className={cx("px-btn px-btn--sm flex-1", today ? "px-btn--gold" : "px-btn--ghost")} aria-current={today ? "page" : undefined}>Today</Link>
      </nav>

      {me && myRank && (
        <Panel tone="blue" className="flex items-center gap-3 p-3">
          <span className="font-arcade w-12 text-center text-sm text-blue">#{myRank}</span>
          <Sprite name={me.avatar} size={40} />
          <span className="font-pixel flex-1 truncate">You · {me.nickname}</span>
          <span className="font-arcade text-xs text-gold">{me.xpTotal} XP</span>
        </Panel>
      )}

      {rows.length === 0 ? (
        <Panel className="p-8 text-center">
          <Treasure name="chest-closed" size={72} className="anim-rattle mx-auto" />
          <p className="font-pixel mt-3 text-xl">{today ? "No XP earned today yet." : "The board is empty. Be the first legend!"}</p>
        </Panel>
      ) : (
        <ol className="space-y-2">
          {rows.map((p, i) => <Row key={p.id} p={p} me={p.id === me?.id} delay={i} />)}
        </ol>
      )}

      <Panel variant="raised" className="p-4">
        <h2 className="font-pixel text-xl">How scoring works</h2>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted marker:text-gold">
          <li>Only your best run of each ranked quest counts, so replays raise your score but can&apos;t farm it.</li>
          <li>Accuracy, a perfect-run bonus and a speed bonus; hints cost 2 points.</li>
          <li>Questions rotate, so sharing answers doesn&apos;t help. Every score is checked on the server.</li>
          <li>Side quests add a small one-time bonus.</li>
        </ul>
      </Panel>
    </div>
  );
}

function Row({ p, me, delay }: { p: BoardRow; me: boolean; delay: number }) {
  const podium = p.rank <= 3;
  return (
    <li className="anim-pop-in" style={{ animationDelay: `${Math.min(delay, 12) * 40}ms` }}>
      <Panel tone={me ? "blue" : p.rank === 1 ? "gold" : "default"} variant={podium || me ? undefined : "raised"} className="flex items-center gap-3 p-2.5">
        <span className={cx("font-arcade w-12 text-center", podium ? "text-lg text-gold" : "text-xs text-muted")}>{String(p.rank).padStart(2, "0")}</span>
        <Sprite name={p.avatar} size={podium ? 52 : 38} className={p.rank === 1 ? "anim-bob" : ""} />
        <span className="min-w-0 flex-1">
          <span className="font-pixel block truncate text-lg leading-tight">{p.nickname}</span>
          <span className="font-arcade block text-[11px] text-faint">
            LV{p.level} {LEVELS[p.level - 1]?.name}
            {p.tied && <span className="ml-2 text-red">· tied</span>}
          </span>
        </span>
        {p.rank === 1 && <PixelIcon name="crown" size={24} />}
        <span className="font-arcade text-sm text-gold">{p.xp} XP</span>
      </Panel>
    </li>
  );
}
