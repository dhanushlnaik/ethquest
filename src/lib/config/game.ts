// Pure, client-safe game configuration. Server code may override XP values from the Setting table.

export type DifficultyKey = "EXPLORER" | "BUILDER" | "NERD";

export const DIFFICULTIES: Record<DifficultyKey, { label: string; short: string; blurb: string; multiplier: number; color: string }> = {
  EXPLORER: { label: "Explorer", short: "EXP", blurb: "New to Ethereum? Start here. Hints, retries, plain language.", multiplier: 1, color: "var(--c-green-dk)" },
  BUILDER: { label: "Builder", short: "BLD", blurb: "You've shipped a contract or two. Upgrades, EIPs, real scenarios.", multiplier: 1.25, color: "var(--c-blue)" },
  NERD: { label: "Protocol Nerd", short: "NRD", blurb: "Specs, consensus, client trade-offs. Bring your ACD notes.", multiplier: 1.5, color: "var(--c-grape-dk)" },
};

/**
 * Leaderboard XP comes from two places, both bounded so nobody can win the hoodie just by playing the most:
 *  - Ranked games: each run scores base × accuracy + perfect/speed bonuses. Only your BEST run per game counts
 *    (improvements are credited as the difference), and ranked runs per game per day are capped.
 *  - Side quests: a small one-time reward per activity. Replays earn nothing.
 */
export const RANKED_GAMES = {
  "guess-that-eip": { title: "Guess That EIP", challenge: "5 Ethereum trivia questions", base: 50, perfect: 10, speed: 10, targetSeconds: 75, href: "/play/guess-that-eip", icon: "question", character: "builder" },
  "fork-detective": { title: "Fork Detective", challenge: "Match EIPs to upgrades", base: 50, perfect: 10, speed: 10, targetSeconds: 90, href: "/play/fork-detective", icon: "magnifier", character: "protocol-engineer" },
  "core-dev-insider": { title: "Core Dev Insider", challenge: "Find an actual protocol decision", base: 50, perfect: 10, speed: 10, targetSeconds: 90, href: "/play/core-dev-insider", icon: "gavel", character: "governance-wizard" },
  "eip-explorer": { title: "EIP Explorer", challenge: "Find and identify specific proposals", base: 30, perfect: 5, speed: 5, targetSeconds: 75, href: "/play/eip-explorer/quest", icon: "scroll", character: "researcher" },
} as const;
export type RankedSlug = keyof typeof RANKED_GAMES;
export const isRanked = (slug: string): slug is RankedSlug => slug in RANKED_GAMES;
export const RANKED_MAX = Object.values(RANKED_GAMES).reduce((s, g) => s + g.base + g.perfect + g.speed, 0);

/** Pure scoring for one ranked run. Hints cost points; speed only counts on a mostly-correct run. */
export function scoreRankedRun(slug: RankedSlug, r: { points: number; maxPoints: number; hints: number; seconds: number }) {
  const g = RANKED_GAMES[slug];
  const accuracy = r.maxPoints ? r.points / r.maxPoints : 0;
  const base = Math.max(0, Math.round(g.base * accuracy) - r.hints * 2);
  const perfect = accuracy === 1 && r.hints === 0 ? g.perfect : 0;
  // Full speed bonus at or under target time, fading linearly to zero at 3× target.
  const pace = Math.min(1, Math.max(0, (3 * g.targetSeconds - r.seconds) / (2 * g.targetSeconds)));
  const speed = accuracy >= 0.6 ? Math.round(g.speed * pace) : 0;
  return { base, perfect, speed, total: base + perfect + speed, max: g.base + g.perfect + g.speed };
}

export const DEFAULT_XP = {
  /** One-time side-quest rewards. */
  sideQuest: 5,
  hqTour: 10,
  pathfinder: 5,
  dna: 5,
  findEip: 5,
  findEipMaxRewarded: 1,
  hunt: 0,
};
export type XPConfig = typeof DEFAULT_XP;

/** Booth event rules. Stored in Setting "event"; booth admins can edit them. */
export const DEFAULT_EVENT = {
  tshirtXp: 100,
  rankedRunsPerDay: 3,
  /** Scoring stops at this moment; the overall leaderboard then decides the hoodie. ISO with offset. */
  leaderboardClosesAt: "2026-11-04T16:00:00+05:30",
  announceAt: "2026-11-04T16:30:00+05:30",
  eventDays: "November 3–4",
  /** Set by booth admins after any sudden-death tie-break. */
  championPlayerId: "" as string,
};
export type EventConfig = typeof DEFAULT_EVENT;
export const EVENT_TZ = "Asia/Kolkata";

export const REWARD_TIERS = {
  welcome: { tier: 1, name: "The Drop", kicker: "Free unlock" },
  tshirt: { tier: 2, name: "The Playground", kicker: "Optional participation" },
  hoodie: { tier: 3, name: "The Protocol Champion", kicker: "Grand prize" },
} as const;
export const WELCOME_REWARD = "welcome-pack";
export const TSHIRT_REWARD = "tshirt";
export const HOODIE_REWARD = "hoodie";

export const LEVELS = [
  { level: 1, name: "Deckhand", xp: 0 },
  { level: 2, name: "Map Reader", xp: 25 },
  { level: 3, name: "EIP Scout", xp: 60 },
  { level: 4, name: "Treasure Hunter", xp: 100 },
  { level: 5, name: "Upgrade Specialist", xp: 150 },
  { level: 6, name: "Protocol Wizard", xp: 200 },
  { level: 7, name: "Protocol Legend", xp: 250 },
] as const;

export function levelFor(xp: number) {
  let current: (typeof LEVELS)[number] = LEVELS[0];
  for (const l of LEVELS) if (xp >= l.xp) current = l;
  const next = LEVELS.find((l) => l.xp > xp) ?? null;
  const progress = next ? (xp - current.xp) / (next.xp - current.xp) : 1;
  return { ...current, next, progress };
}

export type WorldKey = "arcade" | "upgrade-lab" | "eip-explorer" | "pathfinder" | "protocol-hq";

export const WORLDS: Record<
  WorldKey,
  { n: string; name: string; tagline: string; scene: string; character: string; accent: string; href: string }
> = {
  arcade: { n: "01", name: "The Arcade", tagline: "Fast, silly, surprisingly educational.", scene: "/assets/worlds/world-arcade.png", character: "builder", accent: "var(--c-red)", href: "/play/arcade" },
  "upgrade-lab": { n: "02", name: "The Upgrade Lab", tagline: "Rebuild ten years of Ethereum history.", scene: "/assets/worlds/world-upgrade-lab.png", character: "protocol-engineer", accent: "var(--c-blue)", href: "/play/upgrade-lab" },
  "eip-explorer": { n: "03", name: "The EIP Explorer", tagline: "Type any number. Discover its story.", scene: "/assets/worlds/world-eip-explorer.png", character: "researcher", accent: "var(--c-green)", href: "/play/eip-explorer" },
  pathfinder: { n: "04", name: "The Pathfinder", tagline: "Find your path into Ethereum.", scene: "/assets/worlds/world-pathfinder.png", character: "explorer", accent: "var(--c-yellow)", href: "/play/pathfinder" },
  "protocol-hq": { n: "05", name: "Protocol HQ", tagline: "See what core devs decided this week.", scene: "/assets/worlds/world-protocol-hq.png", character: "governance-wizard", accent: "var(--c-pink)", href: "/play/protocol-hq" },
};

export const EIPSINSIGHT = "https://eipsinsight.com";

export const EIPSINSIGHT_SOCIALS = [
  { key: "x", label: "X / Twitter", handle: "@EIPsInsight", url: "https://x.com/EIPsInsight", icon: "x" },
  { key: "linkedin", label: "LinkedIn", handle: "EIPsInsight", url: "https://www.linkedin.com/company/eipsinsight/", icon: "linkedin" },
  { key: "youtube", label: "YouTube", handle: "@etherworldco", url: "https://www.youtube.com/@etherworldco", icon: "youtube" },
  { key: "github", label: "GitHub", handle: "AvarchLLC/eipsinsight-v4", url: "https://github.com/AvarchLLC/eipsinsight-v4", icon: "github" },
  { key: "discord", label: "Discord", handle: "Join the community", url: "https://discord.com/invite/tUXgfV822C", icon: "discord" },
  { key: "newsletter", label: "Newsletter", handle: "Weekly protocol digest", url: "https://eipsinsight.com/newsletter", icon: "mail" },
] as const;
export const eipUrl = (n: number, repo = "eip") => `${EIPSINSIGHT}/${repo === "erc" ? "ercs" : repo === "rip" ? "rips" : "eips"}/${n}`;
