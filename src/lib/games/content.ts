// Client-safe content for Pathfinder and Builder DNA, plus the pure pathway engine.

export const ROLES = [
  { id: "developer", label: "Developer", blurb: "I write code", sprite: "builder" },
  { id: "researcher", label: "Researcher", blurb: "I dig into how things work", sprite: "researcher" },
  { id: "designer", label: "Designer", blurb: "I make things usable & beautiful", sprite: "designer" },
  { id: "student", label: "Student", blurb: "I'm learning everything", sprite: "student" },
  { id: "community", label: "Community Builder", blurb: "I bring people together", sprite: "community-builder" },
  { id: "newcomer", label: "Curious Newcomer", blurb: "I just want to understand", sprite: "explorer" },
] as const;

export const INTERESTS = [
  { id: "protocol", label: "Protocol Development", icon: "brain" },
  { id: "eips", label: "EIPs & Standards", icon: "scroll" },
  { id: "contracts", label: "Smart Contracts", icon: "diamond" },
  { id: "security", label: "Security", icon: "lock" },
  { id: "scaling", label: "Layer 2 & Scaling", icon: "bolt" },
  { id: "research", label: "Research", icon: "magnifier" },
  { id: "governance", label: "Governance", icon: "gavel" },
  { id: "public-goods", label: "Public Goods", icon: "gift" },
  { id: "enterprise", label: "Enterprise & Adoption", icon: "map" },
] as const;

export const GOALS = [
  { id: "understand", label: "I want to understand Ethereum" },
  { id: "build", label: "I want to build something" },
  { id: "contribute", label: "I want to contribute to an existing project" },
  { id: "proposals", label: "I want to write or review proposals" },
  { id: "governance", label: "I want to participate in governance" },
  { id: "people", label: "I want to find people working in my area" },
] as const;

export const STAGES = ["START", "EXPLORE", "PARTICIPATE", "CONTRIBUTE", "NEXT"] as const;
export const STAGE_LABEL: Record<(typeof STAGES)[number], string> = {
  START: "Start", EXPLORE: "Explore", PARTICIPATE: "Participate", CONTRIBUTE: "Contribute", NEXT: "Your next step",
};

const INTEREST_TO_PATHWAY: Record<string, string> = {
  protocol: "B", eips: "A", contracts: "C", security: "C", scaling: "B", research: "B", governance: "A", "public-goods": "A", enterprise: "D",
};

type StepRow = { stage: string; title: string; action: string; resources: unknown; roles: string[]; goals: string[]; sortOrder: number };
type PathwayRow = { id: string; code: string; title: string; tagline: string; summary: string; color: string; steps: StepRow[] };

export type BuiltPathway = {
  pathwayId: string;
  code: string;
  title: string;
  tagline: string;
  summary: string;
  color: string;
  role: string;
  interest: string;
  goal: string;
  steps: { stage: string; title: string; action: string; resources: { label: string; url: string }[] }[];
};

/** Picks the primary pathway and the most specific step for each stage (role + goal targeting). */
export function buildPathway(choice: { role: string; interest: string; goal: string }, pathways: PathwayRow[]): BuiltPathway | null {
  const role = ROLES.find((r) => r.id === choice.role);
  const interest = INTERESTS.find((i) => i.id === choice.interest);
  const goal = GOALS.find((g) => g.id === choice.goal);
  if (!role || !interest || !goal) return null;
  let code = INTEREST_TO_PATHWAY[interest.id] ?? "A";
  // Writing proposals is always an editorial journey, whatever the interest.
  if (goal.id === "proposals") code = interest.id === "contracts" || interest.id === "security" ? "C" : "A";
  const pathway = pathways.find((p) => p.code === code);
  if (!pathway) return null;

  const steps = STAGES.map((stage) => {
    const candidates = pathway.steps.filter(
      (s) => s.stage === stage && (s.roles.length === 0 || s.roles.includes(role.id)) && (s.goals.length === 0 || s.goals.includes(goal.id)),
    );
    const score = (s: StepRow) => (s.roles.includes(role.id) ? 2 : 0) + (s.goals.includes(goal.id) ? 2 : 0);
    const best = [...candidates].sort((a, b) => score(b) - score(a) || a.sortOrder - b.sortOrder)[0];
    return best ? { stage, title: best.title, action: best.action, resources: best.resources as { label: string; url: string }[] } : null;
  }).filter((s): s is NonNullable<typeof s> => !!s);

  return {
    pathwayId: pathway.id, code: pathway.code, title: pathway.title, tagline: pathway.tagline, summary: pathway.summary, color: pathway.color,
    role: role.label, interest: interest.label, goal: goal.label, steps,
  };
}

// ---------------- Builder DNA ----------------

export type DnaResultKey =
  | "protocol-architect" | "gas-optimizer" | "consensus-enjoyer" | "rabbit-hole-explorer" | "client-diversity-defender" | "scaling-enthusiast" | "devex-wizard";

export const DNA_RESULTS: Record<DnaResultKey, { name: string; sprite: string; description: string; link: { label: string; url: string } }> = {
  "protocol-architect": { name: "Protocol Architect", sprite: "dna-protocol-architect", description: "You see the whole system. Specs, trade-offs and long roadmaps don't scare you. They're the fun part.", link: { label: "Network upgrades on EIPsInsight", url: "https://eipsinsight.com/upgrade" } },
  "gas-optimizer": { name: "Gas Optimizer", sprite: "dna-gas-optimizer", description: "Every opcode counts. You'd rewrite a loop three times to save 200 gas, and you'd enjoy it.", link: { label: "EVM proposals on EIPsInsight", url: "https://eipsinsight.com/explore" } },
  "consensus-enjoyer": { name: "Consensus Enjoyer", sprite: "dna-consensus-enjoyer", description: "Fork choice, finality, attestations… you believe agreement is the most beautiful problem in computing.", link: { label: "Consensus calls (ACDC)", url: "https://eipsinsight.com/calls" } },
  "rabbit-hole-explorer": { name: "EIP Rabbit-Hole Explorer", sprite: "dna-rabbit-hole-explorer", description: "You open one EIP and surface three hours later with twelve tabs and a new favourite proposal.", link: { label: "EIP Hub", url: "https://eipsinsight.com/explore" } },
  "client-diversity-defender": { name: "Client Diversity Defender", sprite: "dna-client-diversity-defender", description: "No single client should rule them all. You care about resilience, and you run a minority client to prove it.", link: { label: "Upgrade client readiness", url: "https://eipsinsight.com/upgrade" } },
  "scaling-enthusiast": { name: "Scaling Enthusiast", sprite: "dna-scaling-enthusiast", description: "Blobs, rollups, PeerDAS: you want Ethereum serving billions, and you track blob usage for fun.", link: { label: "Blob analytics", url: "https://eipsinsight.com/blobs" } },
  "devex-wizard": { name: "DevEx Wizard", sprite: "dna-devex-wizard", description: "You make other builders faster. Great docs, clean standards and tools that just work are your magic.", link: { label: "Standards (ERCs)", url: "https://eipsinsight.com/standards" } },
};

export const DNA_QUESTIONS: { q: string; options: { id: string; label: string; weights: Partial<Record<DnaResultKey, number>> }[] }[] = [
  {
    q: "It's a free Saturday. What are you building?",
    options: [
      { id: "a", label: "A diagram of how a whole system fits together", weights: { "protocol-architect": 2 } },
      { id: "b", label: "A contract that's 30% cheaper than yesterday", weights: { "gas-optimizer": 2 } },
      { id: "c", label: "A CLI tool my friends will love", weights: { "devex-wizard": 2 } },
      { id: "d", label: "A rollup experiment", weights: { "scaling-enthusiast": 2 } },
    ],
  },
  {
    q: "Which headline makes you click instantly?",
    options: [
      { id: "a", label: "\"New fork-choice rule proposed\"", weights: { "consensus-enjoyer": 2 } },
      { id: "b", label: "\"Blob fees hit record low\"", weights: { "scaling-enthusiast": 2 } },
      { id: "c", label: "\"Minority client hits 20% share\"", weights: { "client-diversity-defender": 2 } },
      { id: "d", label: "\"Obscure 2017 EIP finally revived\"", weights: { "rabbit-hole-explorer": 2 } },
    ],
  },
  {
    q: "Your favourite part of a technical doc is…",
    options: [
      { id: "a", label: "The Rationale section", weights: { "protocol-architect": 1, "rabbit-hole-explorer": 1 } },
      { id: "b", label: "The gas cost table", weights: { "gas-optimizer": 2 } },
      { id: "c", label: "The copy-pasteable examples", weights: { "devex-wizard": 2 } },
      { id: "d", label: "Security Considerations", weights: { "client-diversity-defender": 1, "consensus-enjoyer": 1 } },
    ],
  },
  {
    q: "What would you most like to improve about Ethereum?",
    options: [
      { id: "a", label: "Make it scale to billions", weights: { "scaling-enthusiast": 2 } },
      { id: "b", label: "Make it impossible to take down", weights: { "client-diversity-defender": 2, "consensus-enjoyer": 1 } },
      { id: "c", label: "Make it easier to build on", weights: { "devex-wizard": 2 } },
      { id: "d", label: "Make the long-term design cleaner", weights: { "protocol-architect": 2 } },
    ],
  },
  {
    q: "How would you contribute this year?",
    options: [
      { id: "a", label: "Review and comment on EIPs", weights: { "rabbit-hole-explorer": 2 } },
      { id: "b", label: "Run a node with a less-used client", weights: { "client-diversity-defender": 2 } },
      { id: "c", label: "Benchmark and optimize hot paths", weights: { "gas-optimizer": 2 } },
      { id: "d", label: "Follow every All Core Devs call", weights: { "consensus-enjoyer": 1, "protocol-architect": 1 } },
    ],
  },
];

export function scoreDna(answers: string[]): DnaResultKey {
  const totals = new Map<DnaResultKey, number>();
  answers.forEach((a, i) => {
    const opt = DNA_QUESTIONS[i]?.options.find((o) => o.id === a);
    for (const [k, w] of Object.entries(opt?.weights ?? {})) totals.set(k as DnaResultKey, (totals.get(k as DnaResultKey) ?? 0) + (w ?? 0));
  });
  const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  return ranked[0]?.[0] ?? "rabbit-hole-explorer";
}
