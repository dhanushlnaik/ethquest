import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { startPlaying } from "@/app/actions/player";
import { db } from "@/lib/server/db";
import { getPlayer } from "@/lib/server/session";
import { rankedBests } from "@/lib/server/event";
import { rankOf } from "@/lib/server/leaderboard";
import { collection, dayKey, getCatalog, toView, unopenedPacks } from "@/lib/server/cards";
import { RANKED_GAMES, type RankedSlug } from "@/lib/config/game";
import { Bar, Button, cx, PixelIcon, PixelLoader, Sprite, Treasure } from "@/components/pixel";
import { Logo } from "@/components/logo";
import { EipsInsightPromo } from "@/components/promo";
import { DailyPackButton } from "@/components/cards/card-client";
import { PixelCard } from "@/components/cards/pixel-card";
import { SaveProfileCard } from "@/components/passkey";
import { ChangeStrip } from "@/components/cards/card-news";
import { cardNews } from "@/lib/server/living-cards";
import { streakOf } from "@/lib/server/daily";
import { Flame, nextMilestone } from "@/components/streak";

export default function Home() {
  return (
    <div className="-mt-2">
      <section className="relative mx-auto flex max-w-3xl flex-col items-center pb-6 pt-4 text-center">
        <p className="font-arcade text-xs tracking-widest text-gold">EIPsInsight presents</p>
        <Logo className="mt-4" />
        <p className="font-pixel mt-5 max-w-2xl text-balance text-base leading-relaxed [text-shadow:0_2px_0_rgba(20,14,8,0.7)] sm:text-xl">
          <span className="inline-block">Learn Ethereum standards.</span> <span className="inline-block">Collect every EIP.</span>{" "}
          <span className="inline-block text-gold">Battle your friends.</span>
        </p>
        <div className="mt-5 flex items-end justify-center gap-1 sm:gap-3">
          {["builder", "protocol-engineer", "explorer", "governance-wizard", "researcher"].map((c, i) => (
            <span key={c} className="anim-pop-in inline-block" style={{ animationDelay: `${150 + i * 110}ms` }}>
              <Sprite name={c} size={i === 2 ? 112 : 84} anim={i === 2 ? "walk" : "idle"} className="drop-shadow-[0_5px_0_rgba(20,14,8,0.45)]" />
            </span>
          ))}
        </div>
      </section>
      <Suspense fallback={<PixelLoader label="Loading your adventure" />}>
        <Dashboard />
      </Suspense>
    </div>
  );
}

async function Dashboard() {
  const player = await getPlayer();
  if (!player) return <Newcomer />;
  await connection();
  const [bests, rank, packs, col, cat, recent, daily, passkeys, news, dq] = await Promise.all([
    rankedBests(player.id),
    rankOf(player.id, player.xpTotal),
    unopenedPacks(player.id),
    collection(player.id),
    getCatalog(),
    db.playerCard.findMany({ where: { playerId: player.id }, orderBy: { firstAt: "desc" }, take: 4 }),
    db.cardPack.findUnique({ where: { playerId_key: { playerId: player.id, key: `daily:${dayKey()}` } }, select: { id: true } }),
    db.passkey.count({ where: { playerId: player.id } }),
    cardNews(player),
    streakOf(player.id),
  ]);
  const games = (Object.keys(RANKED_GAMES) as RankedSlug[]).map((slug) => {
    const g = RANKED_GAMES[slug];
    return { slug, ...g, max: g.base + g.perfect + g.speed, best: bests[slug] ?? 0 };
  });

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {packs.length > 0 && (
        <Link href="/play/cards" className="px-panel px-panel--gold anim-pop-in flex items-center gap-4 p-4 transition-transform hover:-translate-y-0.5">
          <Treasure name="chest-closed" size={64} className="anim-rattle" />
          <span className="min-w-0 flex-1">
            <span className="font-arcade block text-xs text-gold">Booster packs</span>
            <span className="font-pixel block text-2xl">{packs.length} pack{packs.length === 1 ? "" : "s"} waiting!</span>
          </span>
          <span className="px-btn px-btn--sm shine">Open ▶</span>
        </Link>
      )}

      <Link href="/play/daily" className={cx("px-panel flex flex-wrap items-center gap-x-4 gap-y-2 p-4 transition-transform hover:-translate-y-0.5", !dq.answeredToday && "px-panel--gold")}>
        <Flame streak={dq.streak} size="lg" />
        {!dq.answeredToday && <span className="px-btn px-btn--sm shine ml-auto sm:order-last">Play ▶</span>}
        <span className="min-w-0 basis-full sm:basis-0 sm:flex-1">
          <span className="font-arcade block text-xs text-gold">Daily EIP challenge</span>
          <span className="font-pixel block text-xl">{dq.answeredToday ? "Done for today ✓" : "Today's question is ready"}</span>
          <span className="block text-sm text-muted">{dq.answeredToday ? "Come back tomorrow to keep your streak." : `Day ${nextMilestone(dq.streak).at} of your streak unlocks ${nextMilestone(dq.streak).reward}.`}</span>
        </span>
      </Link>

      <ChangeStrip changes={news} title="Your cards leveled up!" subtitle="The real proposals behind these cards just changed status on EIPsInsight." dismissible />

      {passkeys === 0 && <SaveProfileCard />}

      {/* PLAY */}
      <section className="px-panel p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-pixel text-2xl">Play</h2>
          <Link href="/play/leaderboard" className="font-arcade text-xs text-gold">{rank ? `Hall of Fame #${rank} ›` : "Hall of Fame ›"}</Link>
        </div>
        <p className="text-sm text-muted">Four ranked quests. Your best run counts, and each one earns a booster pack per day.</p>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {games.map((g, i) => (
            <li key={g.slug} className="anim-pop-in" style={{ animationDelay: `${i * 70}ms` }}>
              <Link href={g.href} className="group px-panel px-panel--raised flex items-center gap-3 p-3 transition-transform hover:-translate-y-0.5">
                <Sprite name={g.character} size={52} className="shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="font-pixel block text-lg leading-tight">{g.title}</span>
                  <span className="block text-xs text-muted">{g.challenge}</span>
                  <span className="mt-1.5 flex items-center gap-2">
                    <Bar value={g.best / g.max} tone="purple" className="h-3 flex-1" label={`${g.title} best`} />
                    <span className="font-arcade text-[11px] text-gold">{g.best}/{g.max}</span>
                  </span>
                </span>
                <span className="font-arcade text-xs text-gold transition-transform group-hover:translate-x-1">▶</span>
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/play/worlds" className="px-panel px-panel--green mt-3 flex items-center gap-3 p-3">
          <Treasure name="map" size={36} />
          <span className="min-w-0 flex-1">
            <span className="font-pixel block">Side quests</span>
            <span className="block text-xs text-muted">Timeline, Spot the Fake, Pathfinder, Find Your EIP… each clear earns a pack.</span>
          </span>
          <span className="font-arcade text-xs text-gold">▶</span>
        </Link>
      </section>

      {/* COLLECT */}
      <section className="px-panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-pixel text-2xl">Collect</h2>
          <DailyPackButton claimed={!!daily} />
        </div>
        <div className="mt-2 flex items-center gap-3">
          <Bar value={col.owned / col.total} className="flex-1" label="Collection progress" />
          <span className="font-arcade text-xs text-gold">{col.owned}/{col.total}</span>
        </div>
        <p className="mt-1 text-sm text-muted">{col.sets.filter((s) => s.complete).length} of {col.sets.length} sets complete · {col.duplicates} duplicates to gift or battle with</p>
        {recent.length > 0 ? (
          <ul className="no-scrollbar mt-3 flex gap-3 overflow-x-auto pb-1">
            {recent.map((r) => {
              const c = cat.byNumber.get(r.number);
              return c ? <li key={r.number} className="shrink-0"><Link href={`/play/cards/${r.number}`}><PixelCard card={toView(c, { count: r.count })} size="sm" /></Link></li> : null;
            })}
          </ul>
        ) : (
          <p className="mt-3">Open your packs to start your collection.</p>
        )}
        <Link href="/play/cards" className="px-btn px-btn--gold px-btn--sm mt-3">Open collection</Link>
      </section>

      {/* BATTLE */}
      <Link href="/play/battle" className="px-panel px-panel--purple flex items-center gap-4 p-4 transition-transform hover:-translate-y-0.5">
        <span className="hidden -space-x-6 sm:flex">
          {recent.slice(0, 3).map((r) => { const c = cat.byNumber.get(r.number); return c ? <span key={r.number} className="origin-bottom-left scale-[0.5]" style={{ width: 66, height: 105 }}><PixelCard card={toView(c)} size="sm" /></span> : null; })}
        </span>
        <span className="min-w-0 flex-1">
          <span className="font-arcade block text-xs text-gold">Battle</span>
          <span className="font-pixel block text-2xl">Card Battles</span>
          <span className="block text-sm text-muted">Best of 3 on hidden stats. Challenge a friend by QR or practice vs the House.</span>
        </span>
        <span className="font-arcade text-xs text-gold">▶</span>
      </Link>

      <EipsInsightPromo />
      <p className="text-center text-sm">
        <Link href="/play/recover" className="text-gold underline underline-offset-4">Use a recovery code</Link>
      </p>
    </div>
  );
}

function Newcomer() {
  return (
    <div className="mx-auto max-w-3xl">
      <form action={startPlaying} className="mx-auto max-w-sm">
        <input type="hidden" name="next" value="/play/cards" />
        <Button size="lg" className="shine w-full" type="submit">
          <PixelIcon name="gift" size={22} /> Start: get 2 free packs
        </Button>
        <p className="mt-2 text-center text-xs text-muted">No sign-up needed. Save your profile with a passkey any time.</p>
      </form>
      <p className="mt-3 text-center text-sm">
        Played before? <Link href="/play/login" className="text-gold underline underline-offset-4">Log in with your passkey</Link>
      </p>
      <ul className="mt-8 grid gap-3 sm:grid-cols-3">
        {[
          { art: "map", k: "Play", t: "Quick quests", body: "Trivia, upgrade history, real All Core Devs decisions and EIP hunts." },
          { art: "chest-open", k: "Collect", t: "EIP trading cards", body: "392 proposals as pixel cards. Open packs, complete sets, gift duplicates." },
          { art: "crown", k: "Battle", t: "Card duels", body: "Best of 3 on Lore, Buzz, Links and Stage. Challenge friends by QR." },
        ].map((s, i) => (
          <li key={s.k} className={cx("px-panel anim-pop-in p-4 text-center", i === 1 && "px-panel--gold")} style={{ animationDelay: `${300 + i * 120}ms` }}>
            <Treasure name={s.art} size={64} className="anim-float mx-auto" />
            <p className="font-arcade mt-2 text-[11px] text-gold">{s.k}</p>
            <p className="font-pixel text-xl">{s.t}</p>
            <p className="mt-1 text-sm text-muted">{s.body}</p>
          </li>
        ))}
      </ul>
      <EipsInsightPromo className="mt-8" />
    </div>
  );
}
