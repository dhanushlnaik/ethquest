import { Suspense } from "react";
import Link from "next/link";
import { startPlaying } from "@/app/actions/player";
import { getPlayer } from "@/lib/server/session";
import { getJourney } from "@/lib/server/journey";
import { REWARD_TIERS } from "@/lib/config/game";
import { Bar, Button, ButtonLink, cx, PixelIcon, PixelLoader, Sprite, Tag, Treasure } from "@/components/pixel";
import { Logo } from "@/components/logo";
import { EipsInsightPromo } from "@/components/promo";
import { Countdown } from "@/components/countdown";

export default function Home() {
  return (
    <div className="-mt-2">
      <section className="relative mx-auto flex max-w-3xl flex-col items-center pb-6 pt-4 text-center">
        <p className="font-arcade text-xs tracking-widest text-gold">EIPsInsight Impact Booth · Devcon 8 Mumbai</p>
        <Logo className="mt-4" />
        <p className="font-pixel mt-5 max-w-xl text-lg leading-snug [text-shadow:0_2px_0_rgba(20,14,8,0.7)] sm:text-2xl">
          Scan. Get your swag. Play if you want.
          <br />
          Climb the leaderboard. Take home the hoodie.
        </p>
        <div className="mt-5 flex items-end justify-center gap-1 sm:gap-3">
          {["builder", "protocol-engineer", "explorer", "governance-wizard", "researcher"].map((c, i) => (
            <span key={c} className="anim-pop-in inline-block" style={{ animationDelay: `${150 + i * 110}ms` }}>
              <Sprite name={c} size={i === 2 ? 112 : 84} anim={i === 2 ? "walk" : "idle"} className="drop-shadow-[0_5px_0_rgba(20,14,8,0.45)]" />
            </span>
          ))}
        </div>
      </section>
      <Suspense fallback={<PixelLoader label="Unrolling the map" />}>
        <Journey />
      </Suspense>
    </div>
  );
}

async function Journey() {
  const player = await getPlayer();
  if (!player) return <Newcomer />;
  const j = await getJourney(player);
  const tshirtProgress = Math.min(1, player.xpTotal / j.tshirt.need);

  return (
    <div className="mx-auto max-w-3xl">
      <ol className="relative space-y-5 before:absolute before:bottom-8 before:left-[34px] before:top-8 before:w-0 before:border-l-[4px] before:border-dashed before:border-gold/70 sm:before:left-[42px]">
        {/* LEVEL 1 · THE DROP */}
        <Stop n={1} kicker={REWARD_TIERS.welcome.kicker} title={`Level 1: ${REWARD_TIERS.welcome.name}`} art="chest-open" done={j.welcome.state === "collected"}>
          <p className="text-sm text-muted">Your welcome reward: <b className="text-text">Stickers + Jute bag</b>, subject to stock. No quiz, no registration.</p>
          <div className="mt-3">
            {j.welcome.state === "collected" ? (
              <Tag tone="green">Collected ✓</Tag>
            ) : j.welcome.state === "soldout" ? (
              <Tag tone="red">Out of stock right now</Tag>
            ) : (
              <ButtonLink href="/play/welcome" size="sm" className="shine">
                <PixelIcon name="gift" size={18} /> Open your chest
              </ButtonLink>
            )}
          </div>
        </Stop>

        {/* LEVEL 2 · THE PLAYGROUND */}
        <Stop n={2} kicker={REWARD_TIERS.tshirt.kicker} title={`Level 2: ${REWARD_TIERS.tshirt.name}`} art="tshirt" done={j.tshirt.state === "collected"}>
          <p className="text-sm text-muted">Play the four quests and earn XP. Reach <b className="text-text">{j.tshirt.need} XP</b> to unlock an EIPsInsight T-shirt, while stocks last.</p>
          <div className="mt-3 flex items-center gap-2">
            <Bar value={tshirtProgress} className="flex-1" label="T-shirt progress" />
            <span className="font-arcade text-xs text-gold">{player.xpTotal}/{j.tshirt.need}</span>
          </div>
          {j.tshirt.state === "ready" && (
            <ButtonLink href="/play/rewards" tone="gold" size="sm" className="shine mt-3"><PixelIcon name="qr" size={16} /> Claim your T-shirt</ButtonLink>
          )}
          {j.tshirt.state === "collected" && <Tag tone="green" className="mt-3">T-shirt collected ✓</Tag>}
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {j.games.map((g, i) => (
              <li key={g.slug} className="anim-pop-in" style={{ animationDelay: `${i * 80}ms` }}>
                <Link href={g.href} className="group px-panel px-panel--raised flex items-center gap-3 p-3 transition-transform hover:-translate-y-0.5">
                  <Sprite name={g.character} size={56} className="shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="font-pixel block text-lg leading-tight">{g.title}</span>
                    <span className="block text-xs text-muted">{g.challenge}</span>
                    <span className="mt-1.5 flex items-center gap-2">
                      <Bar value={g.best / g.max} tone="purple" className="h-3 flex-1" label={`${g.title} best score`} />
                      <span className="font-arcade text-[11px] text-gold">{g.best}/{g.max}</span>
                    </span>
                    <span className="font-arcade mt-1 block text-[11px] text-faint">
                      {j.open ? `${g.runsLeft} ranked run${g.runsLeft === 1 ? "" : "s"} left today` : "Scoring closed"}
                    </span>
                  </span>
                  <span className="font-arcade text-xs text-gold transition-transform group-hover:translate-x-1">▶</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/play/worlds" className="px-panel px-panel--green mt-3 flex items-center gap-3 p-3">
            <Treasure name="map" size={40} />
            <span className="min-w-0 flex-1">
              <span className="font-pixel block">Side quests</span>
              <span className="block text-xs text-muted">Timeline, Spot the Fake, Pathfinder and more. One-time bonus XP each.</span>
            </span>
            <span className="font-arcade text-xs text-gold">+{Math.max(0, j.sideXp)} XP</span>
          </Link>
        </Stop>

        {/* LEVEL 3 · THE PROTOCOL CHAMPION */}
        <Stop n={3} kicker={REWARD_TIERS.hoodie.kicker} title={`Level 3: ${REWARD_TIERS.hoodie.name}`} art="hoodie" done={j.hoodie.state === "collected"} glow>
          <p className="text-sm text-muted">
            Compete on the two-day leaderboard. <b className="text-text">ONE exclusive EIPsInsight hoodie</b> for the highest eligible score.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="px-panel px-panel--sunken px-3 py-1.5">
              <span className="font-arcade text-[11px] text-muted">Your rank </span>
              <span className="font-pixel text-xl">{j.rank ? `#${j.rank}` : "–"}</span>
            </span>
            {j.open ? (
              <span className="text-xs text-muted">
                Scoring closes in <Countdown to={j.cfg.leaderboardClosesAt} className="font-arcade text-gold" />
              </span>
            ) : (
              <span className="font-arcade text-xs text-gold">Scoring closed · winner announced at the booth</span>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <ButtonLink href="/play/leaderboard" tone="gold" size="sm"><PixelIcon name="trophy" size={16} /> Leaderboard</ButtonLink>
            {j.hoodie.state === "ready" && <ButtonLink href="/play/rewards" size="sm" className="shine">Claim the hoodie</ButtonLink>}
          </div>
        </Stop>
      </ol>
      <EipsInsightPromo className="mt-8" />
      <p className="mt-6 text-center text-sm">
        <Link href="/play/recover" className="text-gold underline underline-offset-4">Continue on another device</Link>
      </p>
    </div>
  );
}

function Stop({ n, kicker, title, art, done, glow, children }: { n: number; kicker: string; title: string; art: string; done?: boolean; glow?: boolean; children: React.ReactNode }) {
  return (
    <li className="anim-pop-in relative flex gap-3 sm:gap-4" style={{ animationDelay: `${n * 120}ms` }}>
      <div className="relative z-10 shrink-0">
        <div className={cx("px-panel grid h-[72px] w-[72px] place-items-center sm:h-[88px] sm:w-[88px]", done ? "px-panel--green" : glow ? "px-panel--gold" : "")}>
          <Treasure name={art} size={56} className={cx(glow && !done && "anim-glow", !done && "anim-float")} />
        </div>
        <span className="font-arcade absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-sm bg-[var(--wood-dk)] px-1.5 text-[11px] text-gold">{done ? "✓" : `LV${n}`}</span>
      </div>
      <section className={cx("px-panel min-w-0 flex-1 p-4", glow && "px-panel--gold")}>
        <p className="font-arcade text-[11px] text-gold">{kicker}</p>
        <h2 className="font-pixel text-2xl leading-tight">{title}</h2>
        <div className="mt-1">{children}</div>
      </section>
    </li>
  );
}

function Newcomer() {
  return (
    <div className="mx-auto max-w-3xl">
      <form action={startPlaying} className="mx-auto max-w-sm">
        <input type="hidden" name="next" value="/play/welcome" />
        <Button size="lg" className="shine w-full" type="submit">
          <PixelIcon name="gift" size={22} /> Open your welcome chest
        </Button>
        <p className="mt-2 text-center text-xs text-muted">Free stickers + jute bag. No sign-up, no wallet, no quiz.</p>
      </form>
      <ul className="mt-8 grid gap-3 sm:grid-cols-3">
        {[
          { art: "chest-open", t: REWARD_TIERS.welcome, body: "Scan, land here, unlock stickers + a jute bag." },
          { art: "tshirt", t: REWARD_TIERS.tshirt, body: "Play four quick quests, earn XP, unlock a T-shirt." },
          { art: "hoodie", t: REWARD_TIERS.hoodie, body: "Top the two-day leaderboard. ONE hoodie. ONE champion." },
        ].map((s, i) => (
          <li key={s.art} className={cx("px-panel anim-pop-in p-4 text-center", i === 2 && "px-panel--gold")} style={{ animationDelay: `${300 + i * 120}ms` }}>
            <Treasure name={s.art} size={64} className="anim-float mx-auto" />
            <p className="font-arcade mt-2 text-[11px] text-gold">{s.t.kicker}</p>
            <p className="font-pixel text-xl">Level {s.t.tier}: {s.t.name}</p>
            <p className="mt-1 text-sm text-muted">{s.body}</p>
          </li>
        ))}
      </ul>
      <EipsInsightPromo className="mt-8" />
    </div>
  );
}
