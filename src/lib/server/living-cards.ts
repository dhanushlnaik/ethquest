import "server-only";
import { db } from "./db";
import { EIPSINSIGHT } from "@/lib/config/game";
import { CATALOG_STATUSES, clampStat, loreFor, maxRarity, rarityFor, stageFor } from "./card-rules";

// Living cards: cards follow the real proposals. A daily job pulls every proposal's live status from
// eipsinsight.com's public API, levels up cards whose status moved, and releases newly qualifying proposals.

type LiveRow = { repo: string; number: number; title: string; status: string; type: string | null; category: string | null; createdAt: string | null; linkedPRs: number | null };

export async function fetchLiveProposals(): Promise<LiveRow[]> {
  const res = await fetch(`${EIPSINSIGHT}/rpc/standards/getTable`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ json: { page: 1, pageSize: 5000 } }),
    signal: AbortSignal.timeout(30_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`EIPsInsight API ${res.status}`);
  const { json } = await res.json();
  if (!Array.isArray(json?.rows) || json.rows.length < 500) throw new Error("EIPsInsight API returned too few proposals");
  // EIPs and ERCs only: RIPs live in their own number space and would collide with EIP cards.
  return (json.rows as LiveRow[]).filter((r) => /ethereum\/(EIPs|ERCs)$/i.test(r.repo));
}

export async function refreshLivingCards() {
  const rows = await fetchLiveProposals();
  const [cards, upgradeEips] = await Promise.all([db.eipCard.findMany(), db.upgradeEIP.findMany({ select: { eipNumber: true, headline: true } })]);
  const byNumber = new Map(cards.map((c) => [c.number, c]));
  const upgrade = new Map<number, { headline: boolean }>();
  for (const u of upgradeEips) upgrade.set(u.eipNumber, { headline: u.headline || !!upgrade.get(u.eipNumber)?.headline });
  // Buzz percentile from linked PRs, measured across the live catalog.
  const prs = rows.map((r) => r.linkedPRs ?? 0).sort((a, b) => a - b);
  const buzzFor = (n: number) => clampStat(5 + (prs.findLastIndex((x) => x <= n) / Math.max(1, prs.length - 1)) * 94);

  const changes: { number: number; field: string; fromValue: string | null; toValue: string }[] = [];
  let leveled = 0, added = 0;
  for (const r of rows) {
    const card = byNumber.get(r.number);
    if (card) {
      const statusMoved = card.status !== r.status;
      const retitled = !!r.title && card.title !== r.title;
      if (!statusMoved && !retitled) continue;
      const rarity = maxRarity(card.rarity, rarityFor({ number: r.number, status: r.status, category: r.category ?? card.category }, upgrade.get(r.number)));
      await db.eipCard.update({
        where: { number: r.number },
        data: {
          status: r.status,
          title: r.title || card.title,
          stage: stageFor(r.status),
          rarity,
          ...(statusMoved ? { leveledAt: new Date() } : {}),
        },
      });
      if (statusMoved) { changes.push({ number: r.number, field: "status", fromValue: card.status, toValue: r.status }); leveled++; }
      if (retitled) changes.push({ number: r.number, field: "title", fromValue: card.title, toValue: r.title });
    } else if (CATALOG_STATUSES.includes(r.status)) {
      // A proposal reached Review or beyond: it becomes a collectible card.
      const year = r.createdAt ? Number(r.createdAt.slice(0, 4)) : null;
      await db.eipCard.create({
        data: {
          number: r.number,
          repo: r.repo.includes("ERCs") ? "erc" : "eip",
          title: r.title,
          status: r.status,
          category: r.category || null,
          type: r.type,
          year,
          rarity: rarityFor({ number: r.number, status: r.status, category: r.category }, upgrade.get(r.number)),
          lore: loreFor(year),
          buzz: buzzFor(r.linkedPRs ?? 0),
          links: 12,
          stage: stageFor(r.status),
        },
      });
      changes.push({ number: r.number, field: "added", fromValue: null, toValue: r.status });
      added++;
    }
  }
  if (changes.length) await db.eipCardChange.createMany({ data: changes });
  return { checked: rows.length, leveled, added, changes: changes.length };
}

/** Recent real-world changes, newest first: for "This week in governance" and card news. */
export async function recentChanges(opts: { since?: Date; numbers?: number[]; take?: number } = {}) {
  return db.eipCardChange.findMany({
    where: {
      field: { in: ["status", "added"] },
      createdAt: { gte: opts.since ?? new Date(Date.now() - 14 * 86_400_000) },
      ...(opts.numbers ? { number: { in: opts.numbers } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: opts.take ?? 20,
  });
}

/** Changes to cards this player owns since they last looked. */
export async function cardNews(player: { id: string; newsSeenAt: Date | null }) {
  const owned = await db.playerCard.findMany({ where: { playerId: player.id }, select: { number: true } });
  if (!owned.length) return [];
  const since = player.newsSeenAt && player.newsSeenAt > new Date(Date.now() - 14 * 86_400_000) ? player.newsSeenAt : undefined;
  return recentChanges({ since, numbers: owned.map((o) => o.number), take: 10 });
}
