import { Suspense } from "react";
import { connection } from "next/server";
import { timingSafeEqual } from "node:crypto";
import QRCode from "qrcode";
import { dailyTop, eventStats, topPlayers } from "@/lib/server/leaderboard";
import { getEventConfig, scoringOpen } from "@/lib/server/event";
import { Countdown } from "@/components/countdown";
import { LEVELS } from "@/lib/config/game";
import { Panel, PixelIcon, Sprite, Treasure } from "@/components/pixel";
import { Logo } from "@/components/logo";
import { AutoRefresh } from "@/components/auto-refresh";
import { SITE_URL } from "@/lib/site";

export const metadata = { title: "Live Leaderboard", robots: { index: false } };

function tokenOk(token: unknown) {
  const expected = process.env.KIOSK_TOKEN ?? "";
  if (typeof token !== "string" || !expected || token.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

export default function Kiosk({ searchParams }: PageProps<"/kiosk/leaderboard">) {
  return (
    <Suspense fallback={null}>
      <Board searchParams={searchParams} />
    </Suspense>
  );
}

async function Board({ searchParams }: { searchParams: PageProps<"/kiosk/leaderboard">["searchParams"] }) {
  const { token } = await searchParams;
  if (!tokenOk(token)) return <p className="font-pixel p-10 text-center text-xl">Kiosk link invalid.</p>;
  await connection();
  const [players, today, stats, cfg, qr] = await Promise.all([
    topPlayers(8),
    dailyTop(5),
    eventStats(),
    getEventConfig(),
    QRCode.toString(`${SITE_URL}/play`, { type: "svg", margin: 1, color: { dark: "#2a1d12", light: "#fff8e8" } }),
  ]);
  const open = scoringOpen(cfg);
  return (
    <main className="grid min-h-dvh grid-cols-1 gap-8 p-8 lg:grid-cols-[1fr_400px]">
      <AutoRefresh seconds={10} />
      <section>
        <div className="flex items-center gap-5">
          <Treasure name="hoodie" size={96} className="anim-float anim-glow" />
          <div>
            <p className="font-arcade text-sm text-gold">Protocol Champions · {cfg.eventDays} · EIPsInsight Impact Booth</p>
            <h1 className="title-outline font-pixel text-6xl">ONE HOODIE. ONE CHAMPION.</h1>
            <p className="font-pixel mt-1 text-xl">
              {open ? <>Scoring closes in <Countdown to={cfg.leaderboardClosesAt} className="text-gold" /></> : "Scoring closed · winner announced at the booth"}
            </p>
          </div>
        </div>
        <ol className="mt-8 space-y-3">
          {players.map((p) => (
            <li key={p.id}>
              <Panel tone={p.rank === 1 ? "gold" : "default"} variant={p.rank <= 3 ? undefined : "raised"} className="flex items-center gap-5 px-5 py-3">
                <span className="font-arcade w-16 text-3xl text-gold">{String(p.rank).padStart(2, "0")}</span>
                <Sprite name={p.avatar} size={p.rank <= 3 ? 72 : 56} className={p.rank === 1 ? "anim-bob" : ""} />
                <span className="min-w-0 flex-1">
                  <span className="font-pixel block truncate text-3xl">{p.nickname}</span>
                  <span className="font-arcade text-xs text-muted">LV{p.level} {LEVELS[p.level - 1]?.name}{p.tied ? " · TIED" : ""}</span>
                </span>
                {p.rank === 1 && <PixelIcon name="crown" size={40} />}
                <span className="font-arcade text-3xl text-gold">{p.xp} XP</span>
              </Panel>
            </li>
          ))}
          {players.length === 0 && <p className="font-pixel text-2xl text-muted">Be the first on the board!</p>}
        </ol>
      </section>
      <aside className="flex flex-col items-center gap-5 text-center">
        <Logo compact />
        <Panel tone="gold" className="w-full p-5">
          <p className="font-arcade text-xs text-gold">Scan for free swag</p>
          <div className="mx-auto mt-3 aspect-square w-56 bg-[#fff8e8] p-2 [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: qr }} />
          <p className="font-pixel mt-3 text-lg leading-snug">Scan. Get your swag. Play if you want. Climb the leaderboard. Take home the hoodie.</p>
        </Panel>
        <Panel variant="raised" className="w-full p-4 text-left">
          <p className="font-arcade text-xs text-gold">Today&apos;s top hunters</p>
          <ol className="mt-2 space-y-1">
            {today.map((p) => (
              <li key={p.id} className="flex items-center gap-2">
                <span className="font-arcade w-8 text-xs text-muted">#{p.rank}</span>
                <span className="font-pixel flex-1 truncate">{p.nickname}</span>
                <span className="font-arcade text-xs text-gold">{p.xp}</span>
              </li>
            ))}
            {today.length === 0 && <li className="text-sm text-muted">No XP yet today.</li>}
          </ol>
        </Panel>
        <div className="grid w-full grid-cols-3 gap-2">
          {[["PLAYERS", stats.players], ["XP EARNED", stats.xp], ["SWAG GIVEN", stats.redeemed]].map(([l, v]) => (
            <Panel key={String(l)} variant="raised" className="p-3">
              <p className="font-arcade text-[11px] text-muted">{l}</p>
              <p className="font-pixel text-2xl text-gold">{v}</p>
            </Panel>
          ))}
        </div>
        <p className="font-arcade text-sm text-gold">Follow @EIPsInsight on X · eipsinsight.com</p>
      </aside>
    </main>
  );
}
