import { Suspense } from "react";
import { db } from "@/lib/server/db";
import { requireAdminPage } from "@/lib/server/admin";
import { getEventConfig, scoringOpen } from "@/lib/server/event";
import { topPlayers } from "@/lib/server/leaderboard";
import { declareChampion, saveEventConfig } from "@/app/actions/admin";
import { ActionButton, ActionForm, Field, inputCls } from "@/components/admin/forms";
import { Panel, PixelLoader, Sprite, Tag } from "@/components/pixel";
import { Countdown } from "@/components/countdown";

export const metadata = { title: "Hoodie champion" };

export default function ChampionPage() {
  return (
    <Suspense fallback={<PixelLoader />}>
      <Champion />
    </Suspense>
  );
}

async function Champion() {
  const me = await requireAdminPage("ADMIN");
  const [cfg, top] = await Promise.all([getEventConfig(), topPlayers(10)]);
  const champ = cfg.championPlayerId ? await db.player.findUnique({ where: { id: cfg.championPlayerId }, select: { nickname: true, avatar: true, xpTotal: true } }) : null;
  const tieAtTop = top.length > 1 && top[1].rank === 1;
  const open = scoringOpen(cfg);
  return (
    <div className="space-y-6">
      <h1 className="font-pixel text-3xl">Hoodie champion</h1>
      <Panel tone="gold" className="p-4">
        <p className="text-sm">
          {open ? <>Scoring closes in <Countdown to={cfg.leaderboardClosesAt} className="font-arcade text-gold" />. After that, XP stops counting.</> : <b>Scoring is closed. The board below is final.</b>}
        </p>
        <p className="mt-2 text-sm">
          Current champion: {champ ? <b>{champ.nickname} ({champ.xpTotal} XP)</b> : <i>not declared</i>}
        </p>
        {champ && <div className="mt-2"><ActionButton label="Clear champion" confirm="Clear the declared champion?" run={declareChampion.bind(null, "")} /></div>}
        {tieAtTop && <p className="mt-3 text-sm text-red"><b>Tie for #1.</b> Run the sudden-death question at the booth, then declare the winner below.</p>}
        <p className="mt-2 text-xs text-muted">Declaring lets that player claim the hoodie from their Rewards page; a volunteer then scans it as usual.</p>
      </Panel>
      <Panel variant="raised" className="p-4">
        <p className="font-pixel text-xl">Overall top 10</p>
        <ul className="mt-3 space-y-2">
          {top.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 text-sm">
              <span className="font-arcade w-8">#{p.rank}</span>
              <Sprite name={p.avatar} size={32} />
              <span className="min-w-0 flex-1 truncate">{p.nickname}</span>
              {p.tied && <Tag tone="red">tied</Tag>}
              <span className="font-arcade text-gold">{p.xp} XP</span>
              {p.id !== cfg.championPlayerId && (
                <ActionButton label="Declare champion" tone="gold" confirm={`Declare ${p.nickname} the hoodie champion?`} run={declareChampion.bind(null, p.id)} />
              )}
            </li>
          ))}
        </ul>
      </Panel>
      {me.role === "OWNER" && (
        <Panel variant="raised" className="p-4">
          <p className="font-pixel text-xl">Event rules</p>
          <p className="mb-3 text-sm text-muted">Times are ISO with offset, e.g. 2026-11-04T16:00:00+05:30. Applies within ~15s.</p>
          <ActionForm action={saveEventConfig}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="T-shirt XP threshold"><input name="tshirtXp" type="number" defaultValue={cfg.tshirtXp} className={inputCls} /></Field>
              <Field label="Ranked runs per game per day"><input name="rankedRunsPerDay" type="number" defaultValue={cfg.rankedRunsPerDay} className={inputCls} /></Field>
              <Field label="Scoring closes at"><input name="leaderboardClosesAt" defaultValue={cfg.leaderboardClosesAt} className={inputCls} /></Field>
              <Field label="Winner announced at"><input name="announceAt" defaultValue={cfg.announceAt} className={inputCls} /></Field>
              <Field label="Event days label"><input name="eventDays" defaultValue={cfg.eventDays} className={inputCls} /></Field>
            </div>
          </ActionForm>
        </Panel>
      )}
    </div>
  );
}
