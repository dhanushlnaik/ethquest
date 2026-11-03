// pnpm db:seed — idempotent. Upserts by slug and never overwrites rows an admin has edited.
import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "../../src/generated/prisma/client";
import { scryptSync, randomBytes } from "node:crypto";
import { trivia, spotFake, matchSets } from "./questions";
import { upgrades, hunts, plainEnglish, pathways, achievements, rewards, retiredRewards, retiredAchievements, missions, upgradeUrl, UPGRADE_SOURCE } from "./world";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
// Where EIPsInsight's tables live (see src/lib/server/db.ts).
const EI = process.env.EIPSINSIGHT_SCHEMA ?? "public";
const db = new PrismaClient({ adapter: new PrismaPg(pool, { schema: process.env.ETHQUEST_SCHEMA ?? "ethquest" }) });

const json = (v: unknown) => v as Prisma.InputJsonValue;

async function eipTitles(numbers: number[]) {
  const { rows } = await pool.query(`SELECT eip_number, title FROM ${EI}.eips WHERE eip_number = ANY($1)`, [numbers]);
  return new Map<number, string>(rows.map((r) => [r.eip_number, r.title]));
}

async function guardFakes() {
  const fakes = spotFake.flatMap((s) => s.cards.filter((c) => c.fake).map((c) => c.number));
  const { rows } = await pool.query(
    `SELECT eip_number FROM ${EI}.eips WHERE eip_number = ANY($1)
     UNION SELECT eip_number FROM ${EI}.pull_request_eips WHERE eip_number = ANY($1)`,
    [fakes],
  );
  if (rows.length) throw new Error(`Spot-the-Fake numbers collide with real EIPs/PRs: ${rows.map((r) => r.eip_number).join(", ")}`);
  const reals = spotFake.flatMap((s) => s.cards.filter((c) => !c.fake).map((c) => c.number));
  const titles = await eipTitles(reals);
  const missing = reals.filter((n) => !titles.has(n));
  if (missing.length) throw new Error(`Spot-the-Fake "real" cards not found in EIPsInsight: ${missing.join(", ")}`);
}

async function upsertQuestion(slug: string, data: Omit<Prisma.QuizQuestionCreateInput, "slug">) {
  const existing = await db.quizQuestion.findUnique({ where: { slug } });
  if (existing?.editedByAdmin) return;
  await db.quizQuestion.upsert({ where: { slug }, create: { slug, ...data }, update: data });
}

async function main() {
  await guardFakes();

  for (const q of trivia) {
    await upsertQuestion(q.slug, {
      kind: "trivia", difficulty: q.difficulty, topic: q.topic, prompt: q.prompt,
      options: json(q.options.map((label, i) => ({ id: String.fromCharCode(97 + i), label, correct: i === 0 }))),
      hint: q.hint, explanation: q.explanation, eipNumbers: q.eipNumbers ?? [], upgradeSlug: q.upgradeSlug,
      learnMoreUrl: q.learnMoreUrl, sourceUrl: q.sourceUrl,
    });
  }
  for (const s of spotFake) {
    await upsertQuestion(s.slug, {
      kind: "spot-fake", difficulty: s.difficulty, topic: "spot-fake", prompt: "Two of these are real. One is fake. Which is the fake?",
      options: json(s.cards.map((c, i) => ({ id: String.fromCharCode(97 + i), label: c.label, text: c.text, number: c.number, fake: !!c.fake }))),
      hint: s.hint, explanation: s.explanation,
      eipNumbers: s.cards.filter((c) => !c.fake).map((c) => c.number),
      learnMoreUrl: `https://eipsinsight.com/eips/${s.cards.find((c) => !c.fake)!.number}`, sourceUrl: "https://eips.ethereum.org",
    });
  }
  for (const m of matchSets) {
    await upsertQuestion(m.slug, {
      kind: "match", difficulty: m.difficulty, topic: "match", prompt: m.prompt,
      options: json(m.pairs.map(([left, right], i) => ({ id: `p${i}`, left, right }))),
      explanation: m.explanation, eipNumbers: [], learnMoreUrl: m.learnMoreUrl, sourceUrl: m.sourceUrl,
    });
  }

  const titles = await eipTitles(upgrades.flatMap((u) => u.eips.map((e) => e.n)));
  for (const u of upgrades) {
    const existing = await db.upgrade.findUnique({ where: { slug: u.slug } });
    if (existing?.editedByAdmin) continue;
    const data = {
      name: u.name, aka: u.aka, status: u.status, activatedAt: u.activatedAt ? new Date(`${u.activatedAt}T00:00:00Z`) : null,
      blockNumber: u.blockNumber, forkEpoch: u.forkEpoch, layer: u.layer, oneLiner: u.oneLiner, majorChanges: u.majorChanges,
      eipsinsightUrl: upgradeUrl(u.eipsinsightPath), glyph: u.glyph, inHistoryGames: u.inHistoryGames, difficultyMin: u.difficultyMin,
      sourceUrl: UPGRADE_SOURCE,
    };
    const row = await db.upgrade.upsert({ where: { slug: u.slug }, create: { slug: u.slug, ...data }, update: data });
    await db.upgradeEIP.deleteMany({ where: { upgradeId: row.id } });
    await db.upgradeEIP.createMany({
      data: u.eips.map((e) => ({ upgradeId: row.id, eipNumber: e.n, title: titles.get(e.n) ?? `EIP-${e.n}`, headline: !!e.headline })),
    });
  }

  for (const h of hunts) {
    const { slug, ...rest } = h;
    await db.eIPHunt.upsert({ where: { slug }, create: { slug, ...rest, repo: rest.repo ?? "eip" }, update: { ...rest, repo: rest.repo ?? "eip" } });
  }

  const peTitles = await eipTitles(Object.keys(plainEnglish).map(Number));
  for (const [num, info] of Object.entries(plainEnglish)) {
    const number = Number(num);
    const repo = info.repo ?? "eip";
    await db.eIPRecord.upsert({
      where: { repo_number: { repo, number } },
      create: { repo, number, title: peTitles.get(number) ?? "", status: "", plainEnglish: info.text, upgradeSlug: info.upgradeSlug, curated: true },
      update: { plainEnglish: info.text, upgradeSlug: info.upgradeSlug, title: peTitles.get(number) ?? "" },
    });
  }

  for (const p of pathways) {
    const row = await db.pathway.upsert({
      where: { code: p.code },
      create: { code: p.code, title: p.title, tagline: p.tagline, summary: p.summary, color: p.color },
      update: { title: p.title, tagline: p.tagline, summary: p.summary, color: p.color },
    });
    await db.pathwayStep.deleteMany({ where: { pathwayId: row.id } });
    await db.pathwayStep.createMany({
      data: p.steps.map((s, i) => ({
        pathwayId: row.id, stage: s.stage, title: s.title, action: s.action, resources: json(s.resources),
        roles: s.roles ?? [], goals: s.goals ?? [], sortOrder: i,
      })),
    });
  }

  for (const [i, a] of achievements.entries()) {
    const data = { name: a.name, description: a.description, icon: a.icon, xpBonus: a.xpBonus, manual: !!a.manual, sortOrder: i };
    await db.achievement.upsert({ where: { slug: a.slug }, create: { slug: a.slug, ...data }, update: data });
  }

  for (const [i, r] of rewards.entries()) {
    // Never reset live inventory on re-seed.
    await db.reward.upsert({
      where: { slug: r.slug },
      create: { slug: r.slug, name: r.name, description: r.description, icon: r.icon, xpRequired: r.xpRequired, stock: r.stock, initialStock: r.stock, sortOrder: i },
      update: { name: r.name, description: r.description, icon: r.icon, isActive: true, sortOrder: i },
    });
  }
  await db.reward.updateMany({ where: { slug: { in: retiredRewards } }, data: { isActive: false } });
  await db.achievement.deleteMany({ where: { slug: { in: retiredAchievements } } });

  for (const m of missions) {
    const data = { world: m.world, kind: m.kind, title: m.title, blurb: m.blurb, xpComplete: m.xpComplete, xpPerCorrect: m.xpPerCorrect, sortOrder: m.sortOrder, config: json(m.config) };
    // Keep admin-edited config/activation, but scoring and copy follow the event rules.
    await db.mission.upsert({ where: { slug: m.slug }, create: { slug: m.slug, ...data }, update: { title: m.title, blurb: m.blurb, xpComplete: m.xpComplete, sortOrder: m.sortOrder } });
  }

  // First admin from env (password only lives in .env, never in git).
  const email = process.env.ADMIN_SEED_EMAIL;
  const password = process.env.ADMIN_SEED_PASSWORD;
  if (email && password && !(await db.adminUser.findUnique({ where: { email } }))) {
    const salt = randomBytes(16);
    const hash = `scrypt$${salt.toString("hex")}$${scryptSync(password, salt, 64).toString("hex")}`;
    await db.adminUser.create({ data: { email, name: "Booth Owner", role: "OWNER", passwordHash: hash } });
    console.log(`admin created: ${email}`);
  }

  const counts = {
    questions: await db.quizQuestion.count(), upgrades: await db.upgrade.count(), hunts: await db.eIPHunt.count(),
    pathwaySteps: await db.pathwayStep.count(), achievements: await db.achievement.count(), rewards: await db.reward.count(), missions: await db.mission.count(),
  };
  console.log("seeded", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
    await pool.end();
  });
