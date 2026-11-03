import "server-only";
import { randomInt } from "node:crypto";
import { db, pool } from "./db";
import { eipTitles, recentDecisions, seriesName, getEip } from "./eipsinsight";
import type { PublicOption, PublicRound, Reveal } from "@/lib/games/types";
import type { Difficulty } from "@/generated/prisma/client";
import { EIPSINSIGHT } from "@/lib/config/game";
import { UserError } from "./action";

// Private round = public round + everything needed to grade and reveal it. Stored in MissionAttempt.state.
export type PrivateRound =
  | { kind: "choice"; qid?: string; pub: Extract<PublicRound, { kind: "choice" }>; correctId: string; hint?: string; explanation: string; learnMoreUrl?: string; learnMoreLabel?: string; extra?: string }
  | { kind: "match"; qid?: string; pub: Extract<PublicRound, { kind: "match" }>; pairs: Record<string, string>; explanation: string; learnMoreUrl?: string }
  | { kind: "order"; pub: Extract<PublicRound, { kind: "order" }>; correctOrder: Extract<Reveal, { kind: "order" }>["correctOrder"] }
  | { kind: "predict"; pub: Extract<PublicRound, { kind: "predict" }>; statuses: { id: string; label: string; status: string; note: string }[]; explanation: string; learnMoreUrl?: string };

export type AttemptState = {
  rounds: PrivateRound[];
  answers: ({ correct: boolean; points: number; hint: boolean; payload: unknown } | null)[];
  hints: boolean[];
  startedAt: number;
  /** Leaderboard run (vs practice). */
  ranked?: boolean;
};

const LEVEL_ORDER: Difficulty[] = ["EXPLORER", "BUILDER", "NERD"];

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const pick = <T,>(arr: T[], n: number) => shuffle(arr).slice(0, n);
const rid = () => Math.random().toString(36).slice(2, 8);

type OptionRow = { id: string; label: string; correct?: boolean; text?: string; fake?: boolean; number?: number; left?: string; right?: string };

async function questions(kind: string, difficulty: Difficulty) {
  return db.quizQuestion.findMany({ where: { kind, difficulty, isActive: true } });
}

/** Prefer items the player hasn't seen yet, so answers can't simply be shared or memorised. */
function pickFresh<T extends { id: string }>(arr: T[], n: number, seen: Set<string>) {
  const fresh = pick(arr.filter((q) => !seen.has(q.id)), n);
  return fresh.length >= n ? fresh : [...fresh, ...pick(arr.filter((q) => seen.has(q.id)), n - fresh.length)];
}

/** Questions for the player's level: unseen ones first, then unseen from neighbouring levels, then repeats. */
async function questionsWithFallback(kind: string, difficulty: Difficulty, n: number, seen: Set<string> = new Set()) {
  const own = await questions(kind, difficulty);
  const ownFresh = own.filter((q) => !seen.has(q.id));
  if (ownFresh.length >= n) return pick(ownFresh, n);
  const others = await db.quizQuestion.findMany({ where: { kind, isActive: true, difficulty: { not: difficulty } } });
  const chosen = [...ownFresh, ...pick(others.filter((q) => !seen.has(q.id)), n - ownFresh.length)];
  if (chosen.length < n) chosen.push(...pick(own.filter((q) => seen.has(q.id)), n - chosen.length));
  if (chosen.length < n) chosen.push(...pick(others.filter((q) => seen.has(q.id)), n - chosen.length));
  return shuffle(chosen);
}

// ---------------- Guess That EIP ----------------
async function buildTrivia(difficulty: Difficulty, seen: Set<string>): Promise<PrivateRound[]> {
  const idx = LEVEL_ORDER.indexOf(difficulty);
  // Q1 is a warm-up from one level below (or same for Explorer); the rest match the player's level.
  const warm = idx > 0 ? pickFresh(await questions("trivia", LEVEL_ORDER[idx - 1]), 1, seen) : [];
  const main = await questionsWithFallback("trivia", difficulty, 5 - warm.length, new Set([...seen, ...warm.map((q) => q.id)]));
  return [...warm, ...main].map((q) => {
    const opts = q.options as OptionRow[];
    const correct = opts.find((o) => o.correct)!;
    return {
      kind: "choice",
      qid: q.id,
      pub: { kind: "choice", prompt: q.prompt, options: shuffle(opts).map((o) => ({ id: o.id, label: o.label })), hasHint: !!q.hint, layout: "list" },
      correctId: correct.id,
      hint: q.hint ?? undefined,
      explanation: q.explanation,
      learnMoreUrl: q.learnMoreUrl,
    };
  });
}

// ---------------- Spot the Fake ----------------
async function buildSpotFake(difficulty: Difficulty): Promise<PrivateRound[]> {
  const qs = await questionsWithFallback("spot-fake", difficulty, 3);
  return qs.map((q) => {
    const opts = q.options as OptionRow[];
    return {
      kind: "choice",
      pub: { kind: "choice", prompt: q.prompt, options: shuffle(opts).map((o) => ({ id: o.id, label: o.label, text: o.text })), hasHint: !!q.hint, layout: "cards" },
      correctId: opts.find((o) => o.fake)!.id,
      hint: q.hint ?? undefined,
      explanation: q.explanation,
      learnMoreUrl: q.learnMoreUrl,
      learnMoreLabel: "Read a real one on EIPsInsight",
    };
  });
}

// ---------------- Fork Detective ----------------
function matchRound(prompt: string, pairs: { left: string; right: string }[], explanation: string, learnMoreUrl?: string, qid?: string): PrivateRound {
  const left = pairs.map((p) => ({ id: `l${rid()}`, label: p.left }));
  const right = pairs.map((p) => ({ id: `r${rid()}`, label: p.right }));
  const mapping: Record<string, string> = {};
  left.forEach((l, i) => (mapping[l.id] = right[i].id));
  return { kind: "match", qid, pub: { kind: "match", prompt, left: shuffle(left), right: shuffle(right) }, pairs: mapping, explanation, learnMoreUrl };
}

async function buildForkDetective(difficulty: Difficulty, seen: Set<string>): Promise<PrivateRound[]> {
  const sets = await questionsWithFallback("match", difficulty, 2, seen);
  return sets.map((s) => matchRound(s.prompt, s.options as { left: string; right: string }[], s.explanation, s.learnMoreUrl, s.id));
}

// ---------------- Upgrade Lab ----------------
async function liveUpgrades(difficulty: Difficulty) {
  const allowed = LEVEL_ORDER.slice(0, LEVEL_ORDER.indexOf(difficulty) + 1);
  return db.upgrade.findMany({
    where: { status: "LIVE", inHistoryGames: true, difficultyMin: { in: allowed }, activatedAt: { not: null } },
    include: { eips: { orderBy: [{ headline: "desc" }, { eipNumber: "asc" }] } },
    orderBy: { activatedAt: "asc" },
  });
}
type LiveUpgrade = Awaited<ReturnType<typeof liveUpgrades>>[number];
const fmtDate = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

function revealItem(u: LiveUpgrade, id: string) {
  return {
    id,
    label: u.name,
    date: fmtDate(u.activatedAt!),
    oneLiner: u.oneLiner,
    changes: u.majorChanges,
    url: u.eipsinsightUrl,
    eips: u.eips.filter((e) => e.headline).concat(u.eips.filter((e) => !e.headline)).slice(0, 3).map((e) => ({ n: e.eipNumber, title: e.title })),
  };
}

async function buildTimeline(difficulty: Difficulty, size: number): Promise<PrivateRound[]> {
  const pool = await liveUpgrades(difficulty);
  // Explorer always gets the five landmark upgrades from the brief; harder modes sample wider.
  let chosen: LiveUpgrade[];
  if (difficulty === "EXPLORER") {
    const core = ["london", "the-merge", "shapella", "dencun", "pectra"];
    chosen = pool.filter((u) => core.includes(u.slug));
  } else {
    chosen = pick(pool, size);
  }
  chosen.sort((a, b) => a.activatedAt!.getTime() - b.activatedAt!.getTime());
  const items = chosen.map((u) => ({ u, id: `u${rid()}` }));
  return [
    {
      kind: "order",
      pub: { kind: "order", prompt: "Drag the upgrades into chronological order. Oldest at the top.", items: shuffle(items).map(({ u, id }) => ({ id, label: u.name, sub: u.aka ?? undefined })) },
      correctOrder: items.map(({ u, id }) => revealItem(u, id)),
    },
  ];
}

async function buildMissing(difficulty: Difficulty): Promise<PrivateRound[]> {
  const pool = await liveUpgrades(difficulty);
  const rounds: PrivateRound[] = [];
  const usedHidden = new Set<string>();
  for (let tries = 0; rounds.length < 3 && pool.length >= 6 && tries < 40; tries++) {
    const start = randomInt(pool.length - 3);
    const window = pool.slice(start, start + 4);
    const hideIdx = 1 + randomInt(2); // hide a middle card so both neighbours give clues
    const hidden = window[hideIdx];
    if (usedHidden.has(hidden.slug)) continue;
    usedHidden.add(hidden.slug);
    const distractors = pick(pool.filter((u) => !window.includes(u)), 3);
    const options = shuffle([hidden, ...distractors]).map((u) => ({ id: u.slug, label: u.name, sub: u.aka ?? undefined }));
    rounds.push({
      kind: "choice",
      pub: {
        kind: "choice",
        prompt: "One upgrade is missing from this stretch of history. Which one fills the gap?",
        options,
        hasHint: true,
        layout: "list",
        sequence: window.map((u, i) => (i === hideIdx ? { label: "???", missing: true } : { label: u.name, sub: String(u.activatedAt!.getUTCFullYear()) })),
      },
      correctId: hidden.slug,
      hint: `It went live in ${hidden.activatedAt!.getUTCFullYear()}.`,
      explanation: `${hidden.name} went live on ${fmtDate(hidden.activatedAt!)}. ${hidden.oneLiner}`,
      learnMoreUrl: hidden.eipsinsightUrl,
      learnMoreLabel: `${hidden.name} on EIPsInsight`,
    });
  }
  return rounds;
}

async function buildUpgradeMatch(difficulty: Difficulty): Promise<PrivateRound[]> {
  const pool = await liveUpgrades(difficulty);
  const withChanges = pool.filter((u) => u.majorChanges.length > 0 && u.eips.some((e) => e.headline));
  const chosen = pick(withChanges, 4);
  return [
    matchRound(
      "Match each upgrade with one thing it changed",
      chosen.map((u) => ({ left: u.name, right: u.majorChanges[0] })),
      chosen.map((u) => `${u.name} (${u.activatedAt!.getUTCFullYear()}): ${u.oneLiner}`).join(" "),
      `${EIPSINSIGHT}/upgrade`,
    ),
  ];
}

async function buildPredict(): Promise<PrivateRound[]> {
  const future = await db.upgrade.findMany({ where: { status: { not: "LIVE" } }, include: { eips: true }, orderBy: { name: "asc" } });
  const statusLabel: Record<string, string> = {
    SCHEDULED: "Scheduled", IN_DEVELOPMENT: "In development — no mainnet date", PLANNED: "Planned — scope still being decided", SPECULATIVE: "Speculative",
  };
  const decisions = await recentDecisions(80).catch(() => []);
  const glam = decisions.find((d) => /glamsterdam/i.test(d.text) && /mainnet/i.test(d.text));
  const nextOpts = future.map((u) => ({ id: u.slug, label: u.name, sub: u.aka ?? undefined }));
  const headliners = future.flatMap((u) => u.eips.filter((e) => e.headline).map((e) => ({ id: `eip-${e.eipNumber}`, label: e.title, sub: `EIP-${e.eipNumber} · ${u.name}` })));
  return [
    {
      kind: "predict",
      pub: { kind: "predict", prompt: "Which upgrade do you think reaches mainnet next?", options: nextOpts, note: "This is a prediction. Nothing here is a confirmed roadmap." },
      statuses: future.map((u) => ({ id: u.slug, label: u.name, status: statusLabel[u.status], note: u.oneLiner })),
      explanation: "Upgrades go live only after client teams agree on scope, devnets and testnets pass, and a mainnet date is set on All Core Devs calls.",
      learnMoreUrl: `${EIPSINSIGHT}/upgrade`,
    },
    {
      kind: "predict",
      pub: { kind: "predict", prompt: "Which headline feature are you most excited about?", options: headliners, note: "No wrong answers. See how other players voted." },
      statuses: headliners.map((h) => ({ id: h.id, label: h.label, status: h.sub ?? "", note: "" })),
      explanation: "Headliners are the big features an upgrade is organized around. Follow their progress on EIPsInsight's upgrade pages.",
      learnMoreUrl: `${EIPSINSIGHT}/upgrade/glamsterdam`,
    },
    {
      kind: "predict",
      pub: {
        kind: "predict",
        prompt: "When do you think Glamsterdam activates on mainnet?",
        options: [
          { id: "q1-2027", label: "Early 2027" },
          { id: "mid-2027", label: "Mid 2027" },
          { id: "late-2027", label: "Late 2027" },
          { id: "2028", label: "2028 or later" },
        ],
        note: "Pure prediction. No official date exists.",
      },
      statuses: [],
      explanation: glam
        ? `No mainnet date is set. Latest from ${glam.meeting}: "${glam.text}"`
        : "No mainnet date is set yet. Dates are only fixed on All Core Devs calls once testnets have forked successfully.",
      learnMoreUrl: glam ? `${EIPSINSIGHT}/calls/${glam.series}/${glam.callNumber}` : `${EIPSINSIGHT}/upgrade/glamsterdam`,
    },
  ];
}

// ---------------- Core Dev Insider ----------------
const STAGES: Record<string, string> = {
  Scheduled: "Scheduled for inclusion (SFI)",
  Considered: "Considered for inclusion (CFI)",
  Declined: "Declined for inclusion (DFI)",
  Included: "Included",
  Withdrawn: "Withdrawn",
};

async function buildInsider(difficulty: Difficulty, seen: Set<string>): Promise<PrivateRound[]> {
  const decisions = (await recentDecisions(120)).filter((d) => d.stageTo && STAGES[d.stageTo] && d.eips.length > 0);
  const byCall = new Map<string, typeof decisions>();
  for (const d of decisions) {
    const k = `${d.series}-${d.callNumber}`;
    byCall.set(k, [...(byCall.get(k) ?? []), d]);
  }
  const keyOf = (d: (typeof decisions)[number]) => `${d.series}-${d.callNumber}-${d.eips[0]}`;
  const chosen = pickFresh([...byCall.values()].map((ds) => pick(ds, 1)[0]).map((d) => ({ ...d, id: keyOf(d) })), 3, seen);
  const titles = await eipTitles(chosen.flatMap((d) => d.eips));
  return chosen.map((d) => {
    const n = d.eips[0];
    const title = titles.get(n);
    const distractors = pick(Object.keys(STAGES).filter((s) => s !== d.stageTo), 3);
    const options = shuffle([d.stageTo!, ...distractors]).map((s) => ({ id: s, label: STAGES[s] }));
    const callUrl = `${EIPSINSIGHT}/calls/${d.series}/${d.callNumber}`;
    return {
      kind: "choice",
      qid: d.id,
      pub: {
        kind: "choice",
        prompt: `On ${d.meeting} (${seriesName(d.series)}), core devs made a call on EIP-${n}${title ? ` "${title}"` : ""}. What did they decide?`,
        options,
        hasHint: !!d.context,
        layout: "list",
        badge: d.occurredOn,
        link: { label: "Open the call on EIPsInsight", url: callUrl },
      },
      correctId: d.stageTo!,
      hint: d.context ?? undefined,
      explanation: `Recorded decision: "${d.text}"${d.context ? ` (${d.context})` : ""}`,
      extra:
        difficulty === "EXPLORER"
          ? "SFI = Scheduled For Inclusion (it's going in), CFI = Considered For Inclusion (still being evaluated), DFI = Declined For Inclusion (not this time)."
          : undefined,
      learnMoreUrl: callUrl,
      learnMoreLabel: `${d.series.toUpperCase()} #${d.callNumber} on EIPsInsight`,
    };
  });
}

// ---------------- EIPsInsight tour ----------------
async function buildHqTour(): Promise<PrivateRound[]> {
  const rounds: PrivateRound[] = [];
  const e7732 = await getEip(7732);
  if (e7732) {
    const statuses = ["Draft", "Review", "Last Call", "Final", "Stagnant"];
    const opts = shuffle([e7732.status, ...pick(statuses.filter((s) => s !== e7732.status), 3)]).map((s) => ({ id: s, label: s }));
    rounds.push({
      kind: "choice",
      pub: { kind: "choice", prompt: "Mission 1: Open EIP-7732 (ePBS) on EIPsInsight. What is its current status?", options: opts, hasHint: true, link: { label: "Open EIP-7732", url: `${EIPSINSIGHT}/eips/7732` } },
      correctId: e7732.status,
      hint: "The status badge is right at the top of the proposal page.",
      explanation: `EIP-7732 is currently "${e7732.status}" according to EIPsInsight. Every proposal page shows its full status history.`,
      learnMoreUrl: `${EIPSINSIGHT}/eips/7732`,
    });
  }
  const decisions = await recentDecisions(40, ["acde"]).catch(() => []);
  if (decisions[0]) {
    const latest = Number(decisions[0].callNumber);
    const opts = shuffle([latest, latest - 3, latest - 7, latest + 4]).map((n) => ({ id: String(n), label: `ACDE #${n}` }));
    rounds.push({
      kind: "choice",
      pub: { kind: "choice", prompt: "Mission 2: Visit All Core Devs calls. What's the most recent Execution-layer call (ACDE) with recorded decisions?", options: opts, hasHint: true, link: { label: "Open ACD calls", url: `${EIPSINSIGHT}/calls` } },
      correctId: String(latest),
      hint: `It happened on ${decisions[0].occurredOn}.`,
      explanation: `${decisions[0].meeting} is the latest ACDE call with decisions in EIPsInsight's records. One of them: "${decisions[0].text}"`,
      learnMoreUrl: `${EIPSINSIGHT}/calls/acde/${latest}`,
    });
  }
  const fus = await db.upgrade.findUnique({ where: { slug: "fusaka" } });
  rounds.push({
    kind: "choice",
    pub: { kind: "choice", prompt: "Mission 3: Explore the upgrade timeline. Which upgrade shipped PeerDAS (EIP-7594)?", options: shuffle(["Fusaka", "Pectra", "Dencun", "Glamsterdam"]).map((s) => ({ id: s, label: s })), hasHint: true, link: { label: "Open network upgrades", url: `${EIPSINSIGHT}/upgrade` } },
    correctId: "Fusaka",
    hint: "Fulu + Osaka.",
    explanation: `PeerDAS shipped in Fusaka${fus?.activatedAt ? ` on ${fmtDate(fus.activatedAt)}` : ""}.`,
    learnMoreUrl: `${EIPSINSIGHT}/upgrade/fusaka`,
  });
  rounds.push({
    kind: "choice",
    pub: { kind: "choice", prompt: "Mission 4: Which EIPsInsight section shows how many blobs rollups are posting?", options: shuffle(["Blob analytics", "Pricing", "Newsletter", "Settings"]).map((s) => ({ id: s, label: s })), hasHint: false, link: { label: "Open blob analytics", url: `${EIPSINSIGHT}/blobs` } },
    correctId: "Blob analytics",
    explanation: "EIPsInsight's blob analytics track blob demand and usage since Dencun.",
    learnMoreUrl: `${EIPSINSIGHT}/blobs`,
  });
  rounds.push({
    kind: "choice",
    pub: { kind: "choice", prompt: "Mission 5: Where would you look to see which devnets are running for the next upgrade?", options: shuffle(["Upgrade → Devnets", "Blog", "Donate", "Privacy policy"]).map((s) => ({ id: s, label: s })), hasHint: false, link: { label: "Open devnets", url: `${EIPSINSIGHT}/upgrade/devnets` } },
    correctId: "Upgrade → Devnets",
    explanation: "The Devnets page tracks devnet specs and progress, a great way to watch an upgrade being tested.",
    learnMoreUrl: `${EIPSINSIGHT}/upgrade/devnets`,
  });
  return rounds;
}

// ---------------- EIP Explorer (ranked) ----------------
type EipRow = { eip_number: number; title: string; category: string | null; repo: string };
const eipLabel = (r: { eip_number: number; repo: string }) => `${r.repo === "ethereum/ERCs" ? "ERC" : "EIP"}-${r.eip_number}`;

async function buildEipExplorer(difficulty: Difficulty, seen: Set<string>): Promise<PrivateRound[]> {
  const rounds: PrivateRound[] = [];
  // 1) A curated clue from the hunt list.
  const hunts = await db.eIPHunt.findMany({ where: { isActive: true } });
  const ladder = LEVEL_ORDER.slice(0, LEVEL_ORDER.indexOf(difficulty) + 1);
  const hunt = pickFresh(hunts.filter((h) => ladder.includes(h.difficulty)).map((h) => ({ ...h, id: `hunt:${h.slug}` })), 1, seen)[0];
  if (hunt) {
    const label = (n: number, repo?: string | null) => `${repo === "erc" ? "ERC" : "EIP"}-${n}`;
    const decoys = pick(hunts.filter((h) => h.answer !== hunt.answer), 3);
    rounds.push({
      kind: "choice",
      qid: hunt.id,
      pub: {
        kind: "choice", prompt: hunt.clue, hasHint: true, layout: "list",
        options: shuffle([hunt, ...decoys]).map((h) => ({ id: String(h.answer), label: label(h.answer, h.repo) })),
        link: { label: "Search EIPsInsight", url: `${EIPSINSIGHT}/search` },
      },
      correctId: String(hunt.answer),
      hint: hunt.hint,
      explanation: hunt.explanation,
      learnMoreUrl: `${EIPSINSIGHT}/${hunt.repo === "erc" ? "ercs" : "eips"}/${hunt.answer}`,
      learnMoreLabel: `Open ${label(hunt.answer, hunt.repo)} on EIPsInsight`,
    });
  }
  // 2) + 3) Live proposals from EIPsInsight's database: thousands of combinations, so no answer key to share.
  const { rows } = await pool.query<EipRow>(
    `SELECT e.eip_number, e.title, s.category, r.name AS repo
       FROM public.eips e
       JOIN public.eip_snapshots s ON s.eip_id = e.id
       JOIN public.repositories r ON r.id = s.repository_id
      WHERE s.status IN ('Final', 'Last Call') AND s.category IN ('Core', 'ERC', 'Networking', 'Interface')
        AND e.title IS NOT NULL AND length(e.title) BETWEEN 8 AND 70
      ORDER BY random() LIMIT 40`,
  ).catch(() => ({ rows: [] as EipRow[] }));
  const fresh = rows.filter((r) => !seen.has(`eip:${r.eip_number}`));
  const pool2 = fresh.length >= 8 ? fresh : rows;
  const sameCat = (r: EipRow) => pool2.filter((x) => x.eip_number !== r.eip_number && x.category === r.category && x.title !== r.title);
  const [a, b] = pool2;
  if (a && sameCat(a).length >= 3) {
    const decoys = pick(sameCat(a), 3);
    rounds.push({
      kind: "choice",
      qid: `eip:${a.eip_number}`,
      pub: {
        kind: "choice", prompt: `Look up ${eipLabel(a)} on EIPsInsight. What is it called?`, hasHint: false, layout: "list",
        options: shuffle([a, ...decoys]).map((r) => ({ id: String(r.eip_number), label: r.title })),
        link: { label: `Open ${eipLabel(a)}`, url: `${EIPSINSIGHT}/${a.repo === "ethereum/ERCs" ? "ercs" : "eips"}/${a.eip_number}` },
      },
      correctId: String(a.eip_number),
      explanation: `${eipLabel(a)} is "${a.title}" (${a.category}). Every proposal on EIPsInsight shows its full status history and discussion.`,
      learnMoreUrl: `${EIPSINSIGHT}/${a.repo === "ethereum/ERCs" ? "ercs" : "eips"}/${a.eip_number}`,
      learnMoreLabel: `${eipLabel(a)} on EIPsInsight`,
    });
  }
  if (b && b.eip_number !== a?.eip_number && sameCat(b).length >= 3) {
    const decoys = pick(sameCat(b), 3);
    rounds.push({
      kind: "choice",
      qid: `eip:${b.eip_number}`,
      pub: {
        kind: "choice", prompt: `Which proposal is titled "${b.title}"?`, hasHint: true, layout: "list",
        options: shuffle([b, ...decoys]).map((r) => ({ id: String(r.eip_number), label: eipLabel(r) })),
        link: { label: "Search EIPsInsight", url: `${EIPSINSIGHT}/search?q=${encodeURIComponent(b.title)}` },
      },
      correctId: String(b.eip_number),
      hint: `It's a ${b.category} proposal. Paste the title into EIPsInsight search.`,
      explanation: `"${b.title}" is ${eipLabel(b)}.`,
      learnMoreUrl: `${EIPSINSIGHT}/${b.repo === "ethereum/ERCs" ? "ercs" : "eips"}/${b.eip_number}`,
      learnMoreLabel: `${eipLabel(b)} on EIPsInsight`,
    });
  }
  return rounds;
}

// ---------------- registry ----------------
export async function buildRounds(slug: string, difficulty: Difficulty, config: Record<string, unknown>, seen: Set<string> = new Set()): Promise<PrivateRound[]> {
  switch (slug) {
    case "guess-that-eip": return buildTrivia(difficulty, seen);
    case "spot-the-fake": return buildSpotFake(difficulty);
    case "fork-detective": return buildForkDetective(difficulty, seen);
    case "eip-explorer": return buildEipExplorer(difficulty, seen);
    case "timeline-rebuild": {
      const sizes = (config.cards as Record<string, number> | undefined) ?? {};
      return buildTimeline(difficulty, sizes[difficulty] ?? 6);
    }
    case "timeline-missing": return buildMissing(difficulty);
    case "timeline-match": return buildUpgradeMatch(difficulty);
    case "timeline-next": return buildPredict();
    case "core-dev-insider": return buildInsider(difficulty, seen);
    case "hq-tour": return buildHqTour();
    default: throw new UserError(`No engine for mission ${slug}`);
  }
}

export function grade(round: PrivateRound, payload: unknown): { correct: boolean; points: number; maxPoints: number; reveal: Reveal } {
  switch (round.kind) {
    case "choice": {
      const optionId = (payload as { optionId?: string | null })?.optionId ?? null;
      const correct = optionId === round.correctId;
      return {
        correct, points: correct ? 1 : 0, maxPoints: 1,
        reveal: { kind: "choice", correct, correctId: round.correctId, explanation: round.explanation, learnMoreUrl: round.learnMoreUrl, learnMoreLabel: round.learnMoreLabel, extra: round.extra },
      };
    }
    case "match": {
      const pairs = ((payload as { pairs?: Record<string, string> })?.pairs ?? {}) as Record<string, string>;
      const total = Object.keys(round.pairs).length;
      const correctCount = Object.entries(round.pairs).filter(([l, r]) => pairs[l] === r).length;
      return {
        correct: correctCount === total, points: correctCount, maxPoints: total,
        reveal: { kind: "match", correctPairs: round.pairs, correctCount, total, explanation: round.explanation, learnMoreUrl: round.learnMoreUrl },
      };
    }
    case "order": {
      const order = ((payload as { order?: string[] })?.order ?? []) as string[];
      const total = round.correctOrder.length;
      const correctCount = round.correctOrder.filter((item, i) => order[i] === item.id).length;
      return {
        correct: correctCount === total, points: correctCount, maxPoints: total,
        reveal: { kind: "order", correctOrder: round.correctOrder, correctCount, total, perfect: correctCount === total },
      };
    }
    case "predict": {
      return {
        correct: true, points: 1, maxPoints: 1,
        reveal: { kind: "predict", statuses: round.statuses.map((s) => ({ ...s, share: 0 })), explanation: round.explanation, learnMoreUrl: round.learnMoreUrl },
      };
    }
  }
}

export function maxScoreOf(rounds: PrivateRound[]) {
  return rounds.reduce((sum, r) => sum + (r.kind === "match" ? Object.keys(r.pairs).length : r.kind === "order" ? r.correctOrder.length : 1), 0);
}

export function publicOptionsOf(round: PrivateRound): PublicOption[] {
  return round.pub.kind === "choice" || round.pub.kind === "predict" ? round.pub.options : [];
}
