// Builds the EIP trading-card catalog + collection sets from EIPsInsight data (the mirrored or live schema
// named by EIPSINSIGHT_SCHEMA) and the curated upgrade data in ethquest.Upgrade/UpgradeEIP. Safe to re-run:
// cards and sets are upserted; players' collections are untouched.
//   pnpm tsx --conditions=react-server scripts/build-cards.ts
import "dotenv/config";
import { db, EI, pool } from "../src/lib/server/db";
import type { CardRarity } from "../src/generated/prisma/client";

const THIS_YEAR = 2026;
/** Proposals everyone has heard of: always legendary. */
const ICONIC = [1, 20, 155, 721, 1155, 1559, 3675, 4337, 4844, 7702];
const STAGE: Record<string, number> = { Living: 95, Final: 90, "Last Call": 75, Review: 60, Draft: 40, Stagnant: 25, Withdrawn: 10 };
const CURATED_SETS = [
  { slug: "token-standards", name: "Token Standards", description: "The ERCs every wallet and dapp speaks.", icon: "coin", members: [20, 165, 721, 777, 1155, 2612, 4626, 6909] },
  { slug: "account-abstraction", name: "Smart Accounts", description: "From contract wallets to EOAs that set code.", icon: "user", members: [1271, 2771, 4337, 5792, 7702, 7579] },
  { slug: "founders", name: "Founding Era", description: "The proposals that shaped Ethereum's first years.", icon: "scroll", members: [1, 2, 7, 8, 155, 160, 161, 170] },
];

type Row = { eip_number: number; title: string; created: string | null; status: string; type: string | null; category: string | null; requires: number[] | null; repo: string; prs: number };

async function main() {
  const { rows } = await pool.query<Row>(
    `SELECT e.eip_number, e.title, e.created_at::text AS created, s.status, s.type, s.category, s.requires,
            CASE WHEN r.name ILIKE '%ERCs%' THEN 'erc' ELSE 'eip' END AS repo,
            (SELECT count(*)::int FROM ${EI}.pull_request_eips p WHERE p.eip_number = e.eip_number) AS prs
       FROM ${EI}.eips e
       JOIN ${EI}.eip_snapshots s ON s.eip_id = e.id
       JOIN ${EI}.repositories r ON r.id = s.repository_id`,
  );
  const upgradeEips = await db.upgradeEIP.findMany({ include: { upgrade: { select: { name: true, slug: true, status: true, activatedAt: true } } } });
  const inUpgrade = new Map<number, { name: string; headline: boolean }>();
  for (const u of upgradeEips) {
    const prev = inUpgrade.get(u.eipNumber);
    if (!prev || u.headline) inUpgrade.set(u.eipNumber, { name: u.upgrade.name, headline: u.headline || !!prev?.headline });
  }

  // Catalog: everything that reached a meaningful status, plus anything that's part of a network upgrade.
  const keep = rows.filter((r) => ["Final", "Last Call", "Review", "Living"].includes(r.status) || inUpgrade.has(r.eip_number) || ICONIC.includes(r.eip_number));
  const numbers = new Set(keep.map((r) => r.eip_number));
  const requiredBy = new Map<number, number>();
  for (const r of keep) for (const q of r.requires ?? []) requiredBy.set(q, (requiredBy.get(q) ?? 0) + 1);
  const prsSorted = keep.map((r) => r.prs).sort((a, b) => a - b);
  const pct = (v: number) => (prsSorted.length > 1 ? prsSorted.findLastIndex((x) => x <= v) / (prsSorted.length - 1) : 0.5);
  const clamp = (n: number) => Math.max(1, Math.min(99, Math.round(n)));

  const rarityOf = (r: Row): CardRarity => {
    const up = inUpgrade.get(r.eip_number);
    if (ICONIC.includes(r.eip_number) || up?.headline) return "LEGENDARY";
    if (up) return "EPIC";
    if (r.status === "Final" && (r.category === "Core" || r.category === "Networking")) return "RARE";
    if (r.status === "Final" || r.status === "Living") return "UNCOMMON";
    return "COMMON";
  };

  let n = 0;
  for (const r of keep) {
    const year = r.created ? Number(r.created.slice(0, 4)) : null;
    const links = (r.requires?.length ?? 0) + (requiredBy.get(r.eip_number) ?? 0);
    const data = {
      repo: r.repo,
      title: r.title,
      status: r.status,
      category: r.category || null,
      type: r.type,
      year,
      upgrade: inUpgrade.get(r.eip_number)?.name ?? null,
      rarity: rarityOf(r),
      lore: clamp(year ? 8 + (THIS_YEAR - year) * 8.5 : 30),
      buzz: clamp(5 + pct(r.prs) * 94),
      links: clamp(12 + links * 11),
      stage: STAGE[r.status] ?? 30,
    };
    await db.eipCard.upsert({ where: { number: r.eip_number }, create: { number: r.eip_number, ...data }, update: data });
    n++;
  }

  // Sets: one per network upgrade (3+ cards), plus curated themes.
  const upgrades = new Map<string, { name: string; status: string; date: Date | null; members: number[] }>();
  for (const u of upgradeEips) {
    if (!numbers.has(u.eipNumber)) continue;
    const s = upgrades.get(u.upgrade.slug) ?? { name: u.upgrade.name, status: u.upgrade.status, date: u.upgrade.activatedAt, members: [] };
    s.members.push(u.eipNumber);
    upgrades.set(u.upgrade.slug, s);
  }
  const sets = [
    ...[...upgrades.entries()]
      .filter(([, s]) => s.members.length >= 3)
      .sort((a, b) => (a[1].date?.getTime() ?? Infinity) - (b[1].date?.getTime() ?? Infinity))
      .map(([slug, s]) => ({
        slug: `upgrade-${slug}`,
        name: s.name,
        description: s.status === "LIVE" ? `Every EIP that shipped in ${s.name}.` : `EIPs headed for ${s.name}.`,
        icon: "bolt",
        members: [...new Set(s.members)],
      })),
    ...CURATED_SETS.map((c) => ({ ...c, members: c.members.filter((m) => numbers.has(m)) })).filter((c) => c.members.length >= 3),
  ];
  for (const [i, s] of sets.entries()) {
    await db.cardSet.upsert({ where: { slug: s.slug }, create: { slug: s.slug, name: s.name, description: s.description, icon: s.icon, sortOrder: i }, update: { name: s.name, description: s.description, icon: s.icon, sortOrder: i } });
    await db.cardSetMember.deleteMany({ where: { setSlug: s.slug } });
    await db.cardSetMember.createMany({ data: s.members.map((number) => ({ setSlug: s.slug, number })), skipDuplicates: true });
  }

  const byRarity = await db.eipCard.groupBy({ by: ["rarity"], _count: true });
  console.log(`cards: ${n}`, Object.fromEntries(byRarity.map((r) => [r.rarity, r._count])));
  console.log(`sets: ${sets.length}`, sets.map((s) => `${s.name} (${s.members.length})`).join(", "));
}

main().then(() => process.exit(0));
