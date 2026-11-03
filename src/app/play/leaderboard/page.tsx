import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { getPlayer } from "@/lib/server/session";
import { dailyTop, rankOf, topPlayers, type BoardRow } from "@/lib/server/leaderboard";
import { getEventConfig, scoringOpen } from "@/lib/server/event";
import { EVENT_TZ, LEVELS } from "@/lib/config/game";
import { cx, Panel, PixelIcon, PixelLoader, Sprite, Treasure } from "@/components/pixel";
import { Countdown } from "@/components/countdown";

export const metadata = { title: "Protocol Champions" };

const fmt = (iso: string) => new Date(iso).toLocaleString("en-IN", { timeZone: EVENT_TZ, weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

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
  const [rows, me, cfg] = await Promise.all([today ? dailyTop(50) : topPlayers(50), getPlayer(), getEventConfig()]);
  const myRank = me && !today ? await rankOf(me.id, me.xpTotal) : null;
  const open = scoringOpen(cfg);
  const topTie = !today && rows.length > 1 && rows[0].tied && rows[1].rank === 1;

  return (
    <div className="space-y-5">
      {/* Grand prize banner */}
      <section className="px-panel px-panel--gold relative overflow-hidden p-5 text-center">
        <p className="font-arcade text-xs text-gold">Protocol Champions · Grand prize</p>
        <Treasure name="hoodie" size={96} className="anim-float anim-glow mx-auto mt-2" />
        <h1 className="font-pixel mt-2 text-3xl leading-tight sm:text-4xl">ONE HOODIE. ONE CHAMPION.</h1>
        <p className="font-arcade mt-1 text-xs text-muted">{cfg.eventDays} · EIPsInsight Impact Booth</p>
        <p className="mt-3 text-sm">
          {open ? (
            <>Scoring closes in <Countdown to={cfg.leaderboardClosesAt} className="font-arcade text-gold" /> · winner announced {fmt(cfg.announceAt)}</>
          ) : (
            <>Scoring closed. Winner announced at the booth, {fmt(cfg.announceAt)}.</>
          )}
        </p>
      </section>

      <nav className="flex gap-2" aria-label="Leaderboard view">
        <Link href="/play/leaderboard" className={cx("px-btn px-btn--sm flex-1", today ? "px-btn--ghost" : "px-btn--gold")} aria-current={!today ? "page" : undefined}>Overall · hoodie</Link>
        <Link href="/play/leaderboard?view=today" className={cx("px-btn px-btn--sm flex-1", today ? "px-btn--gold" : "px-btn--ghost")} aria-current={today ? "page" : undefined}>Today</Link>
      </nav>

      {topTie && (
        <Panel tone="red" className="flex items-center gap-3 p-3">
          <PixelIcon name="bolt" size={28} />
          <p className="text-sm"><b>Tie at the top!</b> If it holds at closing time, it&apos;s settled by a sudden-death question at the booth.</p>
        </Panel>
      )}

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
        <h2 className="font-pixel text-xl">How the hoodie is decided</h2>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted marker:text-gold">
          <li>One persistent player profile across both days. Nothing resets between days.</li>
          <li>All valid XP counts toward the overall board, which decides the hoodie. &ldquo;Today&rdquo; is just for bragging rights.</li>
          <li>Every score is validated on the server.</li>
          <li>Only your best run of each ranked quest counts, with a cap on ranked runs per day, so replaying an easy game can&apos;t farm XP.</li>
          <li>Questions rotate, so sharing answers doesn&apos;t help.</li>
          <li>Ties for first are resolved by a final sudden-death question at the booth.</li>
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
