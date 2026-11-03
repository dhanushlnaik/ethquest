import { Suspense } from "react";
import { getPlayer } from "@/lib/server/session";
import { getJourney, type RewardState } from "@/lib/server/journey";
import { REWARD_TIERS } from "@/lib/config/game";
import { Bar, ButtonLink, cx, PixelIcon, PixelLoader, SectionTitle, Tag, Treasure } from "@/components/pixel";
import { NeedPlayer } from "@/components/need-player";
import { ClaimButton } from "@/components/claim-button";
import { Countdown } from "@/components/countdown";
import { EipsInsightPromo } from "@/components/promo";

export const metadata = { title: "Rewards" };

export default function RewardsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <SectionTitle kicker="The treasure vault" title="Three tiers of loot">
        Unlock a reward, then show your claim QR to a volunteer at the EIPsInsight booth. Opening a claim never marks it collected: only the volunteer&apos;s scan does.
      </SectionTitle>
      <Suspense fallback={<PixelLoader label="Counting the gold" />}>
        <Vault />
      </Suspense>
      <p className="mt-6 text-xs text-faint">
        All rewards are subject to stock. Playing is never conditional on recording or posting anything; booth video challenges are separate and optional.
      </p>
    </div>
  );
}

function StateTag({ state }: { state: RewardState }) {
  if (state === "collected") return <Tag tone="green">Collected ✓</Tag>;
  if (state === "ready") return <Tag tone="gold">Unlocked</Tag>;
  if (state === "soldout") return <Tag tone="red">Out of stock</Tag>;
  return <Tag>Locked</Tag>;
}

async function Vault() {
  const player = await getPlayer();
  if (!player) return <NeedPlayer next="/play/rewards" />;
  const j = await getJourney(player);
  const tiers = [
    {
      key: "welcome", art: "jute-bag", t: REWARD_TIERS.welcome, title: "Stickers + Jute bag", state: j.welcome.state,
      body: "Scan the booth QR, land here, unlock your welcome reward. No quiz. No registration. No hoops.",
      action: j.welcome.state === "ready" ? <ButtonLink href="/play/welcome" size="sm" className="shine"><PixelIcon name="gift" size={16} /> Open your chest</ButtonLink> : null,
    },
    {
      key: "tshirt", art: "tshirt", t: REWARD_TIERS.tshirt, title: "EIPsInsight T-shirt", state: j.tshirt.state,
      body: `Play the quests and earn ${j.tshirt.need} XP to become eligible, while stocks last.`,
      action:
        j.tshirt.state === "ready" ? (
          <ClaimButton slug="tshirt" label="Claim T-shirt" />
        ) : j.tshirt.state === "locked" ? (
          <div>
            <Bar value={player.xpTotal / j.tshirt.need} />
            <p className="font-arcade mt-1 text-xs text-muted">{j.tshirt.need - player.xpTotal} XP to go</p>
          </div>
        ) : null,
    },
    {
      key: "hoodie", art: "hoodie", t: REWARD_TIERS.hoodie, title: "ONE exclusive EIPsInsight hoodie", state: j.hoodie.state,
      body: "Highest eligible score on the two-day overall leaderboard wins. Ties are settled with a sudden-death question at the booth.",
      action:
        j.hoodie.state === "ready" ? (
          <ClaimButton slug="hoodie" label="Claim the hoodie" />
        ) : j.hoodie.state === "locked" ? (
          <div className="space-y-2">
            <p className="text-sm">
              Your rank: <b className="font-pixel text-lg">{j.rank ? `#${j.rank}` : "unranked"}</b>
              {j.open && <> · scoring closes in <Countdown to={j.cfg.leaderboardClosesAt} className="font-arcade text-gold" /></>}
            </p>
            <ButtonLink href="/play/leaderboard" tone="gold" size="sm"><PixelIcon name="trophy" size={16} /> See the leaderboard</ButtonLink>
          </div>
        ) : null,
    },
  ];
  return (
    <>
      <ol className="space-y-4">
        {tiers.map((tier, i) => (
          <li key={tier.key} className="anim-pop-in" style={{ animationDelay: `${i * 110}ms` }}>
            <section className={cx("px-panel flex gap-4 p-4", tier.key === "hoodie" && "px-panel--gold", tier.state === "collected" && "px-panel--green")}>
              <div className="relative shrink-0">
                <Treasure name={tier.art} size={88} className={cx(tier.state === "locked" ? "opacity-50 grayscale" : "anim-float", tier.key === "hoodie" && tier.state !== "locked" && "anim-glow")} />
                {tier.state === "locked" && <PixelIcon name="lock" size={28} className="absolute bottom-0 right-0" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-arcade text-[11px] text-gold">{tier.t.kicker}</span>
                  <StateTag state={tier.state} />
                </div>
                <h2 className="font-pixel text-xl leading-tight">Level {tier.t.tier}: {tier.t.name}</h2>
                <p className="font-pixel text-base text-gold">{tier.title}</p>
                <p className="mt-1 text-sm text-muted">{tier.body}</p>
                {tier.action && <div className="mt-3">{tier.action}</div>}
              </div>
            </section>
          </li>
        ))}
      </ol>
      <EipsInsightPromo compact className="mt-6" />
    </>
  );
}
