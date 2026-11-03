// Upgrades, hunts, pathways, achievements, rewards and missions.
// Upgrade dates/blocks/epochs mirror EIPsInsight's src/data/network-upgrades.ts and ethereum.org/en/ethereum-forks.

type D = "EXPLORER" | "BUILDER" | "NERD";
type Status = "LIVE" | "SCHEDULED" | "IN_DEVELOPMENT" | "PLANNED" | "SPECULATIVE";
const EI = "https://eipsinsight.com";
const FORKS = "https://ethereum.org/en/ethereum-forks/";

export type UpgradeSeed = {
  slug: string; name: string; aka?: string; status: Status; activatedAt?: string; blockNumber?: number; forkEpoch?: number;
  layer: string; oneLiner: string; majorChanges: string[]; eips: { n: number; headline?: boolean }[];
  eipsinsightPath: string; glyph: string; inHistoryGames: boolean; difficultyMin: D;
};

export const upgrades: UpgradeSeed[] = [
  { slug: "frontier", name: "Frontier", status: "LIVE", activatedAt: "2015-07-30", blockNumber: 0, layer: "execution", glyph: "flag",
    oneLiner: "Ethereum mainnet launches.", majorChanges: ["Genesis block", "Proof-of-work mining", "Smart contracts go live"],
    eips: [], eipsinsightPath: "/upgrade/frontier", inHistoryGames: true, difficultyMin: "EXPLORER" },
  { slug: "homestead", name: "Homestead", status: "LIVE", activatedAt: "2016-03-14", blockNumber: 1150000, layer: "execution", glyph: "house",
    oneLiner: "The first planned upgrade: Ethereum leaves beta.", majorChanges: ["Homestead protocol changes (EIP-2)", "DELEGATECALL opcode (EIP-7)"],
    eips: [{ n: 2, headline: true }, { n: 7 }, { n: 8 }], eipsinsightPath: "/upgrade/homestead", inHistoryGames: true, difficultyMin: "EXPLORER" },
  { slug: "dao-fork", name: "DAO Fork", status: "LIVE", activatedAt: "2016-07-20", blockNumber: 1920000, layer: "execution", glyph: "split",
    oneLiner: "An irregular state change returning funds drained from The DAO.", majorChanges: ["Moved DAO funds to a withdrawal contract", "Ethereum Classic continued the unforked chain"],
    eips: [], eipsinsightPath: "/upgrade/dao-fork", inHistoryGames: true, difficultyMin: "NERD" },
  { slug: "tangerine-whistle", name: "Tangerine Whistle", status: "LIVE", activatedAt: "2016-10-18", blockNumber: 2463000, layer: "execution", glyph: "shield",
    oneLiner: "Emergency gas repricing after DoS attacks.", majorChanges: ["Raised gas for IO-heavy opcodes (EIP-150)"],
    eips: [{ n: 150, headline: true }], eipsinsightPath: "/upgrade/tangerine-whistle", inHistoryGames: true, difficultyMin: "NERD" },
  { slug: "spurious-dragon", name: "Spurious Dragon", status: "LIVE", activatedAt: "2016-11-22", blockNumber: 2675000, layer: "execution", glyph: "dragon",
    oneLiner: "More DoS fixes plus replay protection.", majorChanges: ["Replay protection with chain ID (EIP-155)", "24 KB contract size limit (EIP-170)", "State clearing of empty accounts (EIP-161)"],
    eips: [{ n: 155, headline: true }, { n: 160 }, { n: 161 }, { n: 170 }], eipsinsightPath: "/upgrade/spurious-dragon", inHistoryGames: true, difficultyMin: "BUILDER" },
  { slug: "byzantium", name: "Byzantium", status: "LIVE", activatedAt: "2017-10-16", blockNumber: 4370000, layer: "execution", glyph: "column",
    oneLiner: "zk-SNARK precompiles, REVERT and STATICCALL.", majorChanges: ["REVERT opcode (EIP-140)", "alt_bn128 precompiles for zk-SNARKs (EIP-196/197)", "STATICCALL (EIP-214)", "Block reward 5 → 3 ETH (EIP-649)"],
    eips: [{ n: 100 }, { n: 140, headline: true }, { n: 196 }, { n: 197 }, { n: 198 }, { n: 211 }, { n: 214 }, { n: 649 }, { n: 658 }], eipsinsightPath: "/upgrade/byzantium", inHistoryGames: true, difficultyMin: "BUILDER" },
  { slug: "constantinople", name: "Constantinople", status: "LIVE", activatedAt: "2019-02-28", blockNumber: 7280000, layer: "execution", glyph: "dome",
    oneLiner: "CREATE2, bitwise shifts, cheaper contract interactions.", majorChanges: ["CREATE2 counterfactual deployment (EIP-1014)", "Bitwise shifting (EIP-145)", "EXTCODEHASH (EIP-1052)", "Block reward 3 → 2 ETH (EIP-1234)"],
    eips: [{ n: 145 }, { n: 1014, headline: true }, { n: 1052 }, { n: 1234 }], eipsinsightPath: "/upgrade/constantinople", inHistoryGames: true, difficultyMin: "BUILDER" },
  { slug: "istanbul", name: "Istanbul", status: "LIVE", activatedAt: "2019-12-07", blockNumber: 9069000, layer: "execution", glyph: "lamp",
    oneLiner: "Gas repricing, CHAINID and cheaper calldata.", majorChanges: ["CHAINID opcode (EIP-1344)", "Calldata 68 → 16 gas per byte (EIP-2028)", "BLAKE2 precompile (EIP-152)"],
    eips: [{ n: 152 }, { n: 1108 }, { n: 1344, headline: true }, { n: 1884 }, { n: 2028 }, { n: 2200 }], eipsinsightPath: "/upgrade/istanbul", inHistoryGames: true, difficultyMin: "BUILDER" },
  { slug: "muir-glacier", name: "Muir Glacier", status: "LIVE", activatedAt: "2020-01-02", blockNumber: 9200000, layer: "execution", glyph: "ice",
    oneLiner: "Delayed the difficulty bomb.", majorChanges: ["Difficulty bomb delay (EIP-2384)"],
    eips: [{ n: 2384, headline: true }], eipsinsightPath: "/upgrade/muir-glacier", inHistoryGames: true, difficultyMin: "NERD" },
  { slug: "beacon-chain", name: "Beacon Chain Genesis", status: "LIVE", activatedAt: "2020-12-01", forkEpoch: 0, layer: "consensus", glyph: "beacon",
    oneLiner: "The proof-of-stake Beacon Chain launches alongside mainnet.", majorChanges: ["Validators start staking 32 ETH", "Proof-of-stake consensus runs in parallel to PoW"],
    eips: [], eipsinsightPath: "/upgrade", inHistoryGames: true, difficultyMin: "BUILDER" },
  { slug: "berlin", name: "Berlin", status: "LIVE", activatedAt: "2021-04-15", blockNumber: 12244000, layer: "execution", glyph: "bear",
    oneLiner: "Typed transactions and state-access repricing.", majorChanges: ["Typed transaction envelope (EIP-2718)", "Cold/warm state access gas (EIP-2929)", "Optional access lists (EIP-2930)"],
    eips: [{ n: 2565 }, { n: 2718, headline: true }, { n: 2929 }, { n: 2930 }], eipsinsightPath: "/upgrade/berlin", inHistoryGames: true, difficultyMin: "BUILDER" },
  { slug: "london", name: "London", status: "LIVE", activatedAt: "2021-08-05", blockNumber: 12965000, layer: "execution", glyph: "flame",
    oneLiner: "EIP-1559 fee market: the base fee gets burned.", majorChanges: ["Base fee + priority tip, base fee burned (EIP-1559)", "BASEFEE opcode (EIP-3198)", "Reduced gas refunds (EIP-3529)"],
    eips: [{ n: 1559, headline: true }, { n: 3198 }, { n: 3529 }, { n: 3541 }, { n: 3554 }], eipsinsightPath: "/upgrade/london", inHistoryGames: true, difficultyMin: "EXPLORER" },
  { slug: "altair", name: "Altair", status: "LIVE", activatedAt: "2021-10-27", forkEpoch: 74240, layer: "consensus", glyph: "star",
    oneLiner: "First Beacon Chain upgrade: sync committees for light clients.", majorChanges: ["Sync committees", "Reworked incentives and inactivity penalties"],
    eips: [], eipsinsightPath: "/upgrade", inHistoryGames: true, difficultyMin: "NERD" },
  { slug: "arrow-glacier", name: "Arrow Glacier", status: "LIVE", activatedAt: "2021-12-09", blockNumber: 13773000, layer: "execution", glyph: "ice",
    oneLiner: "Delayed the difficulty bomb again.", majorChanges: ["Difficulty bomb delay (EIP-4345)"],
    eips: [{ n: 4345, headline: true }], eipsinsightPath: "/upgrade/arrow-glacier", inHistoryGames: true, difficultyMin: "NERD" },
  { slug: "gray-glacier", name: "Gray Glacier", status: "LIVE", activatedAt: "2022-06-30", blockNumber: 15050000, layer: "execution", glyph: "ice",
    oneLiner: "One last difficulty bomb delay before The Merge.", majorChanges: ["Difficulty bomb delay (EIP-5133)"],
    eips: [{ n: 5133, headline: true }], eipsinsightPath: "/upgrade/gray-glacier", inHistoryGames: true, difficultyMin: "NERD" },
  { slug: "bellatrix", name: "Bellatrix", status: "LIVE", activatedAt: "2022-09-06", forkEpoch: 144896, layer: "consensus", glyph: "star",
    oneLiner: "Consensus-layer preparation for The Merge.", majorChanges: ["Beacon Chain becomes merge-aware"],
    eips: [], eipsinsightPath: "/upgrade/bellatrix", inHistoryGames: true, difficultyMin: "NERD" },
  { slug: "the-merge", name: "The Merge", aka: "Paris", status: "LIVE", activatedAt: "2022-09-15", blockNumber: 15537394, layer: "both", glyph: "merge",
    oneLiner: "Ethereum switches from proof-of-work to proof-of-stake.", majorChanges: ["Proof-of-stake consensus (EIP-3675)", "PREVRANDAO replaces DIFFICULTY (EIP-4399)", "Energy use drops by ~99.95%"],
    eips: [{ n: 3675, headline: true }, { n: 4399 }], eipsinsightPath: "/upgrade/paris", inHistoryGames: true, difficultyMin: "EXPLORER" },
  { slug: "shapella", name: "Shapella", aka: "Shanghai + Capella", status: "LIVE", activatedAt: "2023-04-12", blockNumber: 17034870, forkEpoch: 194048, layer: "both", glyph: "unlock",
    oneLiner: "Staked ETH can finally be withdrawn.", majorChanges: ["Beacon chain withdrawals (EIP-4895)", "PUSH0 opcode (EIP-3855)", "Initcode size limit (EIP-3860)"],
    eips: [{ n: 3651 }, { n: 3855 }, { n: 3860 }, { n: 4895, headline: true }], eipsinsightPath: "/upgrade/shanghai", inHistoryGames: true, difficultyMin: "EXPLORER" },
  { slug: "dencun", name: "Dencun", aka: "Cancun + Deneb", status: "LIVE", activatedAt: "2024-03-13", blockNumber: 19426587, forkEpoch: 269568, layer: "both", glyph: "blob",
    oneLiner: "Blobs arrive: rollup fees drop dramatically.", majorChanges: ["Blob-carrying transactions (EIP-4844)", "Transient storage (EIP-1153)", "Beacon root in the EVM (EIP-4788)", "SELFDESTRUCT restricted (EIP-6780)"],
    eips: [{ n: 1153 }, { n: 4788 }, { n: 4844, headline: true }, { n: 5656 }, { n: 6780 }, { n: 7516 }, { n: 7044 }, { n: 7045 }, { n: 7514 }], eipsinsightPath: "/upgrade/cancun", inHistoryGames: true, difficultyMin: "EXPLORER" },
  { slug: "pectra", name: "Pectra", aka: "Prague + Electra", status: "LIVE", activatedAt: "2025-05-07", blockNumber: 22431084, forkEpoch: 364032, layer: "both", glyph: "wand",
    oneLiner: "Smarter wallets, bigger validators, more blobs.", majorChanges: ["EOA code delegation (EIP-7702)", "Max effective balance 2048 ETH (EIP-7251)", "Blob target 6 / max 9 (EIP-7691)", "On-chain deposits (EIP-6110)"],
    eips: [{ n: 2537 }, { n: 2935 }, { n: 6110 }, { n: 7002 }, { n: 7251 }, { n: 7549 }, { n: 7623 }, { n: 7685 }, { n: 7691 }, { n: 7702, headline: true }], eipsinsightPath: "/upgrade/pectra", inHistoryGames: true, difficultyMin: "EXPLORER" },
  { slug: "fusaka", name: "Fusaka", aka: "Fulu + Osaka", status: "LIVE", activatedAt: "2025-12-03", blockNumber: 23935694, forkEpoch: 411392, layer: "both", glyph: "grid",
    oneLiner: "PeerDAS: nodes sample blob data instead of downloading it all.", majorChanges: ["PeerDAS data availability sampling (EIP-7594)", "Blob Parameter Only forks (EIP-7892)", "secp256r1 precompile (EIP-7951)", "Transaction gas limit cap (EIP-7825)"],
    eips: [{ n: 7594, headline: true }, { n: 7642 }, { n: 7823 }, { n: 7825 }, { n: 7883 }, { n: 7892 }, { n: 7910 }, { n: 7917 }, { n: 7918 }, { n: 7934 }, { n: 7935 }, { n: 7939 }, { n: 7951 }], eipsinsightPath: "/upgrade/fusaka", inHistoryGames: true, difficultyMin: "EXPLORER" },
  { slug: "bpo1", name: "BPO1", status: "LIVE", activatedAt: "2025-12-09", layer: "both", glyph: "blob",
    oneLiner: "First Blob-Parameter-Only fork: more blob capacity.", majorChanges: ["Raised blob target and max (EIP-8134)"],
    eips: [{ n: 8134, headline: true }], eipsinsightPath: "/upgrade/bpo-1", inHistoryGames: true, difficultyMin: "NERD" },
  { slug: "bpo2", name: "BPO2", status: "LIVE", activatedAt: "2026-01-07", layer: "both", glyph: "blob",
    oneLiner: "Second Blob-Parameter-Only fork: blob capacity up again.", majorChanges: ["Raised blob target and max (EIP-8135)"],
    eips: [{ n: 8135, headline: true }], eipsinsightPath: "/upgrade/bpo-2", inHistoryGames: true, difficultyMin: "NERD" },
  // Not live: never presented with a date. Status mirrors EIPsInsight's upgrade registry and ACD decisions.
  { slug: "glamsterdam", name: "Glamsterdam", aka: "Gloas + Amsterdam", status: "IN_DEVELOPMENT", layer: "both", glyph: "gear",
    oneLiner: "Next upgrade, in development: enshrined PBS and block-level access lists.", majorChanges: ["Enshrined Proposer-Builder Separation (EIP-7732)", "Block-Level Access Lists (EIP-7928)"],
    eips: [{ n: 7732, headline: true }, { n: 7928, headline: true }], eipsinsightPath: "/upgrade/glamsterdam", inHistoryGames: false, difficultyMin: "EXPLORER" },
  { slug: "hegota", name: "Hegotá", aka: "Heze + Bogotá", status: "PLANNED", layer: "both", glyph: "crystal",
    oneLiner: "Planned after Glamsterdam, with FOCIL as the consensus headliner.", majorChanges: ["Fork-choice enforced Inclusion Lists (EIP-7805)", "Scope still being decided on ACD calls"],
    eips: [{ n: 7805, headline: true }], eipsinsightPath: "/upgrade/hegota", inHistoryGames: false, difficultyMin: "EXPLORER" },
];

export const upgradeUrl = (path: string) => `${EI}${path}`;
export const UPGRADE_SOURCE = FORKS;

// ---------------- EIP Hunts ----------------
export const hunts: { slug: string; clue: string; hint: string; answer: number; repo?: string; difficulty: D; explanation: string }[] = [
  { slug: "h-blobs", difficulty: "EXPLORER", answer: 4844, clue: "Find the proposal that introduced blobs.", hint: "It's a four-digit number starting with 48…", explanation: "EIP-4844, \"Shard Blob Transactions\", shipped in Dencun." },
  { slug: "h-burn", difficulty: "EXPLORER", answer: 1559, clue: "Find the proposal behind transaction fee burning.", hint: "15…", explanation: "EIP-1559 introduced the burned base fee in London." },
  { slug: "h-erc20", difficulty: "EXPLORER", answer: 20, repo: "erc", clue: "Find the original fungible token standard.", hint: "It's a two-digit number.", explanation: "ERC-20, the token standard nearly every wallet supports." },
  { slug: "h-eip1", difficulty: "EXPLORER", answer: 1, clue: "Find the proposal that explains how EIPs themselves work.", hint: "It had to come first.", explanation: "EIP-1, \"EIP Purpose and Guidelines\", is a Living document." },
  { slug: "h-aa", difficulty: "BUILDER", answer: 4337, repo: "erc", clue: "Find the proposal for account abstraction using an alternative mempool.", hint: "43…", explanation: "ERC-4337 brought smart accounts without a hard fork." },
  { slug: "h-7702", difficulty: "BUILDER", answer: 7702, clue: "Find the Pectra proposal that lets EOAs set code.", hint: "77…", explanation: "EIP-7702, \"Set Code for EOAs\"." },
  { slug: "h-withdrawals", difficulty: "BUILDER", answer: 4895, clue: "Find the proposal that enabled staking withdrawals.", hint: "Shapella, 48…", explanation: "EIP-4895, beacon chain push withdrawals." },
  { slug: "h-transient", difficulty: "BUILDER", answer: 1153, clue: "Find the proposal for transient storage opcodes.", hint: "11…", explanation: "EIP-1153 added TSTORE/TLOAD in Dencun." },
  { slug: "h-peerdas", difficulty: "NERD", answer: 7594, clue: "Find the proposal for PeerDAS.", hint: "Fusaka headliner, 75…", explanation: "EIP-7594, Peer Data Availability Sampling." },
  { slug: "h-epbs", difficulty: "NERD", answer: 7732, clue: "Find the proposal for enshrined proposer-builder separation.", hint: "Glamsterdam, 77…", explanation: "EIP-7732, ePBS." },
  { slug: "h-focil", difficulty: "NERD", answer: 7805, clue: "Find the proposal for fork-choice enforced inclusion lists.", hint: "78…", explanation: "EIP-7805, FOCIL." },
  { slug: "h-prevrandao", difficulty: "NERD", answer: 4399, clue: "Find the proposal that replaced the DIFFICULTY opcode.", hint: "Merge-era, 43…", explanation: "EIP-4399, PREVRANDAO." },
];

// Plain-English blurbs shown alongside live EIP data for well-known proposals.
export const plainEnglish: Record<number, { text: string; repo?: string; upgradeSlug?: string }> = {
  1: { text: "The rulebook for EIPs: what they are, how to write one, and the statuses they move through." },
  20: { text: "The common interface every fungible token uses, so any wallet can hold any token.", repo: "erc" },
  155: { text: "Signs the chain ID into transactions so they can't be replayed on another chain.", upgradeSlug: "spurious-dragon" },
  721: { text: "The NFT standard: every token has a unique ID.", repo: "erc" },
  1014: { text: "CREATE2 lets you know a contract's address before deploying it.", upgradeSlug: "constantinople" },
  1153: { text: "Storage that disappears after the transaction: cheap and perfect for locks.", upgradeSlug: "dencun" },
  1155: { text: "One contract, many token types (fungible and non-fungible).", repo: "erc" },
  1559: { text: "Transaction fees get a base fee that's burned, plus an optional tip. Makes fees more predictable.", upgradeSlug: "london" },
  2718: { text: "A wrapper that lets Ethereum add new transaction types cleanly.", upgradeSlug: "berlin" },
  2929: { text: "Made first-time state reads more expensive to protect against DoS attacks.", upgradeSlug: "berlin" },
  3675: { text: "The Merge: Ethereum's consensus switched from mining to staking.", upgradeSlug: "the-merge" },
  3855: { text: "A tiny opcode that pushes zero and saves gas everywhere.", upgradeSlug: "shapella" },
  4337: { text: "Smart-contract wallets without changing the protocol, using UserOperations and bundlers.", repo: "erc" },
  4399: { text: "Replaced the mining DIFFICULTY value with beacon chain randomness.", upgradeSlug: "the-merge" },
  4626: { text: "A standard interface for yield-bearing vaults.", repo: "erc" },
  4788: { text: "Lets smart contracts see the beacon chain's block roots.", upgradeSlug: "dencun" },
  4844: { text: "Blobs: cheap temporary data for rollups, the big step toward scaling Ethereum.", upgradeSlug: "dencun" },
  4895: { text: "Turned on withdrawals for staked ETH.", upgradeSlug: "shapella" },
  6780: { text: "SELFDESTRUCT can no longer wipe out existing contracts.", upgradeSlug: "dencun" },
  7002: { text: "Withdrawal addresses (like staking pools) can trigger validator exits.", upgradeSlug: "pectra" },
  7251: { text: "Validators can hold up to 2048 ETH, so big stakers need fewer validators.", upgradeSlug: "pectra" },
  7594: { text: "PeerDAS: nodes check blob data by sampling pieces instead of downloading everything.", upgradeSlug: "fusaka" },
  7691: { text: "More blobs per block: target 6, max 9.", upgradeSlug: "pectra" },
  7702: { text: "Your normal wallet can temporarily act like a smart-contract wallet.", upgradeSlug: "pectra" },
  7732: { text: "Moves proposer-builder separation into the protocol itself.", upgradeSlug: "glamsterdam" },
  7805: { text: "A committee of validators can force transactions into blocks, fighting censorship.", upgradeSlug: "hegota" },
  7928: { text: "Each block lists the state it touches, so clients can execute in parallel.", upgradeSlug: "glamsterdam" },
};

// ---------------- Pathfinder ----------------
export const ROLES = ["developer", "researcher", "designer", "student", "community", "newcomer"] as const;
export const INTERESTS = ["protocol", "eips", "contracts", "security", "scaling", "research", "governance", "public-goods", "enterprise"] as const;
export const GOALS = ["understand", "build", "contribute", "proposals", "governance", "people"] as const;

type Step = { stage: "START" | "EXPLORE" | "PARTICIPATE" | "CONTRIBUTE" | "NEXT"; title: string; action: string; resources: { label: string; url: string }[]; roles?: string[]; goals?: string[] };

const R = {
  eip1: { label: "EIP-1: how EIPs work", url: "https://eips.ethereum.org/EIPS/eip-1" },
  eipHub: { label: "EIPsInsight: EIP Hub", url: `${EI}/explore` },
  standards: { label: "EIPsInsight: Standards", url: `${EI}/standards` },
  eipsRepo: { label: "github.com/ethereum/EIPs", url: "https://github.com/ethereum/EIPs" },
  ercsRepo: { label: "github.com/ethereum/ERCs", url: "https://github.com/ethereum/ERCs" },
  magicians: { label: "Ethereum Magicians forum", url: "https://ethereum-magicians.org" },
  ethresearch: { label: "ethresear.ch", url: "https://ethresear.ch" },
  calls: { label: "EIPsInsight: All Core Devs calls", url: `${EI}/calls` },
  decisions: { label: "EIPsInsight: Decision ledger", url: `${EI}/decisions` },
  eipip: { label: "EIPsInsight: EIPIP meetings", url: `${EI}/eipip` },
  pm: { label: "ethereum/pm (call agendas)", url: "https://github.com/ethereum/pm" },
  upgrades: { label: "EIPsInsight: Network upgrades", url: `${EI}/upgrade` },
  devnets: { label: "EIPsInsight: Devnets", url: `${EI}/upgrade/devnets` },
  glamsterdam: { label: "EIPsInsight: Glamsterdam", url: `${EI}/upgrade/glamsterdam` },
  roadmap: { label: "ethereum.org: Roadmap", url: "https://ethereum.org/en/roadmap/" },
  nodes: { label: "ethereum.org: Nodes & clients", url: "https://ethereum.org/en/developers/docs/nodes-and-clients/" },
  epf: { label: "Ethereum Protocol Fellowship wiki", url: "https://epf.wiki" },
  clientdiv: { label: "clientdiversity.org", url: "https://clientdiversity.org" },
  specsCL: { label: "ethereum/consensus-specs", url: "https://github.com/ethereum/consensus-specs" },
  specsEL: { label: "ethereum/execution-specs", url: "https://github.com/ethereum/execution-specs" },
  devDocs: { label: "ethereum.org: Developer docs", url: "https://ethereum.org/en/developers/docs/" },
  solidity: { label: "Solidity docs", url: "https://docs.soliditylang.org" },
  aa: { label: "EIPsInsight: Account abstraction", url: `${EI}/aa` },
  blobs: { label: "EIPsInsight: Blob analytics", url: `${EI}/blobs` },
  l2beat: { label: "L2BEAT", url: "https://l2beat.com" },
  learn: { label: "ethereum.org: Learn hub", url: "https://ethereum.org/en/learn/" },
  security: { label: "ethereum.org: Smart contract security", url: "https://ethereum.org/en/developers/docs/smart-contracts/security/" },
  enterprise: { label: "ethereum.org: Enterprise", url: "https://ethereum.org/en/enterprise/" },
  eea: { label: "Enterprise Ethereum Alliance", url: "https://entethalliance.org" },
  contributing: { label: "ethereum.org: Contributing", url: "https://ethereum.org/en/contributing/" },
  community: { label: "ethereum.org: Community hub", url: "https://ethereum.org/en/community/" },
  grants: { label: "ethereum.org: Grants", url: "https://ethereum.org/en/community/grants/" },
  guild: { label: "Protocol Guild", url: "https://protocol-guild.readthedocs.io" },
  analytics: { label: "EIPsInsight: Analytics", url: `${EI}/analytics` },
  eipsinsightGh: { label: "EIPsInsight on GitHub", url: "https://github.com/AvarchLLC" },
};

export const pathways: { code: string; title: string; tagline: string; summary: string; color: string; steps: Step[] }[] = [
  {
    code: "A", title: "Governance & Editorial", tagline: "How Ethereum decides", color: "purple",
    summary: "Learn how ideas become EIPs, who reviews them, and where decisions actually get made, then add your voice.",
    steps: [
      { stage: "START", title: "Understand what an EIP is", action: "Read EIP-1 and the EIP lifecycle on EIPsInsight. Learn the difference between Draft, Review, Last Call and Final.", resources: [R.eip1, R.eipHub] },
      { stage: "START", title: "Learn the language first", action: "Skim ethereum.org's Learn hub, then come back to EIP-1. It'll make much more sense.", resources: [R.learn, R.eip1], roles: ["newcomer", "student"] },
      { stage: "EXPLORE", title: "Read three real proposals", action: "Pick one Final EIP, one in Last Call and one Draft on EIPsInsight. Notice how the discussion and status history differ.", resources: [R.eipHub, R.standards] },
      { stage: "PARTICIPATE", title: "Follow the conversation", action: "Read a proposal's Ethereum Magicians thread and the latest decisions in the EIPsInsight decision ledger.", resources: [R.magicians, R.decisions] },
      { stage: "PARTICIPATE", title: "Sit in on EIP process meetings", action: "EIPIP meetings discuss the EIP process itself. Read recent notes on EIPsInsight before joining one.", resources: [R.eipip, R.pm], goals: ["proposals", "governance"] },
      { stage: "CONTRIBUTE", title: "Make a first editorial contribution", action: "Review a Draft for clarity, broken links or formatting, and leave constructive comments on its PR or forum thread.", resources: [R.eipsRepo, R.ercsRepo] },
      { stage: "CONTRIBUTE", title: "Draft your own idea, the right way", action: "Post your idea on Ethereum Magicians first to gather feedback, then follow EIP-1's template before opening a PR.", resources: [R.magicians, R.eip1], goals: ["proposals"] },
      { stage: "NEXT", title: "Track it all on EIPsInsight", action: "Use the EIP Hub and decision ledger weekly. Watching status changes is the fastest way to learn who's working on what.", resources: [R.eipHub, R.decisions] },
      { stage: "NEXT", title: "Find your people", action: "Look at who authors and reviews the proposals you care about on EIPsInsight, then join the same Magicians threads.", resources: [R.eipHub, R.magicians], goals: ["people"] },
    ],
  },
  {
    code: "B", title: "Core Protocol & Upgrades", tagline: "How Ethereum evolves", color: "blue",
    summary: "Execution vs consensus, how upgrades are scoped and tested on devnets, and how client teams ship them.",
    steps: [
      { stage: "START", title: "Learn the two layers", action: "Understand execution and consensus clients and how they talk. Then skim the Ethereum roadmap.", resources: [R.nodes, R.roadmap] },
      { stage: "EXPLORE", title: "Walk through the upgrade timeline", action: "Explore past upgrades on EIPsInsight, then open Glamsterdam to see what's being built right now.", resources: [R.upgrades, R.glamsterdam] },
      { stage: "EXPLORE", title: "Study the protocol deeply", action: "Work through the Ethereum Protocol Fellowship wiki's study material on consensus, execution and networking.", resources: [R.epf, R.specsCL], roles: ["developer", "researcher", "student"] },
      { stage: "PARTICIPATE", title: "Follow All Core Devs", action: "Read one ACDE/ACDC call summary per week on EIPsInsight and check the decisions it produced.", resources: [R.calls, R.decisions] },
      { stage: "PARTICIPATE", title: "Watch a devnet in action", action: "Check devnet progress and client readiness on EIPsInsight for the upcoming fork.", resources: [R.devnets, R.glamsterdam], goals: ["build", "contribute"] },
      { stage: "CONTRIBUTE", title: "Pick a client or spec to dig into", action: "Run a node on a testnet, read a spec PR end-to-end, and browse open issues in a client or the specs repos.", resources: [R.specsEL, R.specsCL, R.clientdiv] },
      { stage: "CONTRIBUTE", title: "Explain the protocol to others", action: "Write a plain-language thread or post about one upgrade EIP. Good explainers are a real contribution.", resources: [R.upgrades, R.eipHub], roles: ["designer", "community", "newcomer"] },
      { stage: "NEXT", title: "Make protocol news a habit", action: "Bookmark EIPsInsight's upgrade and calls pages, and check what changed after each ACD call.", resources: [R.upgrades, R.calls] },
      { stage: "NEXT", title: "Meet the builders", action: "Note the client teams and researchers who appear in call notes, then follow their work and forum posts.", resources: [R.calls, R.ethresearch], goals: ["people"] },
    ],
  },
  {
    code: "C", title: "Application Layer & Standards", tagline: "Build on Ethereum", color: "green",
    summary: "ERCs, smart-contract standards, account abstraction and the tooling builders use every day.",
    steps: [
      { stage: "START", title: "Learn what an ERC is", action: "ERCs are application-level standards. Start with ERC-20 and ERC-721 on EIPsInsight's Standards page.", resources: [R.standards, R.devDocs] },
      { stage: "EXPLORE", title: "Explore modern standards", action: "Look at ERC-4626 (vaults), ERC-4337 and EIP-7702 (smart accounts), and how they change UX.", resources: [R.aa, R.standards] },
      { stage: "EXPLORE", title: "Build safely", action: "Read the smart contract security guide before deploying anything with real value.", resources: [R.security, R.solidity], goals: ["build"] },
      { stage: "PARTICIPATE", title: "Join an ERC discussion", action: "Pick an ERC in Review and read its Magicians thread. Implementers' feedback shapes the final standard.", resources: [R.magicians, R.ercsRepo] },
      { stage: "CONTRIBUTE", title: "Implement or test a standard", action: "Build a small reference implementation or test suite for a draft ERC and share it in the discussion thread.", resources: [R.ercsRepo, R.solidity] },
      { stage: "CONTRIBUTE", title: "Design better smart-account UX", action: "Account abstraction needs great UX. Prototype a signing or recovery flow and share it with wallet builders.", resources: [R.aa, R.magicians], roles: ["designer"] },
      { stage: "NEXT", title: "Ship something", action: "Deploy to a testnet using a standard you learned today, then follow its EIPsInsight page for changes.", resources: [R.devDocs, R.standards] },
    ],
  },
  {
    code: "D", title: "Enterprise & Adoption", tagline: "Bring Ethereum to the world", color: "gold",
    summary: "Real use cases, infrastructure, scaling and how organizations adopt Ethereum, plus where to help.",
    steps: [
      { stage: "START", title: "Understand why Ethereum", action: "Read ethereum.org's enterprise overview and learn the basics of L1 vs L2.", resources: [R.enterprise, R.learn] },
      { stage: "EXPLORE", title: "Map the scaling landscape", action: "Compare rollups on L2BEAT and see real blob usage on EIPsInsight.", resources: [R.l2beat, R.blobs] },
      { stage: "PARTICIPATE", title: "Connect with adopters", action: "Explore the Enterprise Ethereum Alliance and follow how standards are adopted in production.", resources: [R.eea, R.standards] },
      { stage: "PARTICIPATE", title: "Track protocol changes that affect you", action: "Upgrades change fees, blobs and accounts. Follow upcoming upgrades on EIPsInsight.", resources: [R.upgrades, R.analytics], goals: ["understand", "build"] },
      { stage: "CONTRIBUTE", title: "Share real-world requirements", action: "Post concrete use-case feedback on relevant ERC or EIP discussions. Adopters' input is valuable and rare.", resources: [R.magicians, R.standards] },
      { stage: "NEXT", title: "Support public goods", action: "Learn how protocol work is funded through grants and Protocol Guild, and how organizations can contribute.", resources: [R.grants, R.guild] },
    ],
  },
];

// interest → pathway; goals can override toward Governance & Editorial.
export const interestToPathway: Record<string, string> = {
  protocol: "B", eips: "A", contracts: "C", security: "C", scaling: "B", research: "B", governance: "A", "public-goods": "A", enterprise: "D",
};

// ---------------- Achievements ----------------
export const achievements = [
  { slug: "first-steps", name: "First Steps", description: "Earned your first XP in the Protocol Playground.", icon: "boots", xpBonus: 0 },
  { slug: "eip-explorer", name: "EIP Explorer", description: "Discovered 3 different EIPs.", icon: "scroll", xpBonus: 0 },
  { slug: "fork-detective", name: "Fork Detective", description: "Completed a Fork Detective case.", icon: "magnifier", xpBonus: 0 },
  { slug: "timeline-master", name: "Timeline Master", description: "Rebuilt Ethereum's history in perfect order.", icon: "hourglass", xpBonus: 0 },
  { slug: "fake-buster", name: "Fake Buster", description: "Caught every fake EIP in a round.", icon: "mask", xpBonus: 0 },
  { slug: "governance-insider", name: "Governance Insider", description: "Decoded a real core dev decision.", icon: "gavel", xpBonus: 0 },
  { slug: "pathfinder", name: "Pathfinder", description: "Found your way into Ethereum.", icon: "compass", xpBonus: 0 },
  { slug: "builder-dna", name: "Builder DNA", description: "Discovered your Ethereum builder type.", icon: "helix", xpBonus: 0 },
  { slug: "protocol-nerd", name: "Protocol Nerd", description: "Completed a game on Protocol Nerd difficulty.", icon: "brain", xpBonus: 0 },
  { slug: "perfect-round", name: "Perfect Round", description: "5/5 in Guess That EIP.", icon: "star", xpBonus: 0 },
  { slug: "devcon-og", name: "Devcon OG", description: "Collected swag at the EIPsInsight booth, Devcon 8 Mumbai.", icon: "ticket", xpBonus: 0 },
  { slug: "champion", name: "Protocol Legend", description: "Reached Level 7, the top level. (The hoodie champion is decided on the leaderboard.)", icon: "crown", xpBonus: 0 },
  { slug: "eip-wall", name: "EIP Wall Artist", description: "Left your mark on the physical EIP Wall.", icon: "brick", xpBonus: 0, manual: true },
  { slug: "shorts-star", name: "Shorts Star", description: "Played a booth video challenge with the EIPsInsight team.", icon: "camera", xpBonus: 0, manual: true },
];

// ---------------- Rewards (stock is a placeholder — set real inventory in /booth-admin/rewards) ----------------
export const rewards = [
  { slug: "welcome-pack", name: "Stickers + Jute bag", description: "Level 1 · The Drop. Free for everyone who scans the booth QR, subject to stock.", icon: "jute-bag", xpRequired: 0, stock: 600 },
  { slug: "tshirt", name: "EIPsInsight T-shirt", description: "Level 2 · The Playground. Unlocks at the XP milestone, while stocks last.", icon: "tshirt", xpRequired: 100, stock: 120 },
  { slug: "hoodie", name: "Exclusive EIPsInsight Hoodie", description: "Level 3 · The Protocol Champion. ONE hoodie for the #1 player on the two-day leaderboard.", icon: "hoodie", xpRequired: 0, stock: 1 },
];
/** Rewards from the earlier tiering, switched off on re-seed. */
export const retiredRewards = ["sticker", "sticker-pack", "collectible", "premium"];

// ---------------- Missions ----------------
export const missions = [
  { slug: "guess-that-eip", world: "arcade", kind: "QUIZ", title: "Guess That EIP", blurb: "5 Ethereum trivia questions. Ranked: up to 70 XP.", xpComplete: 0, xpPerCorrect: 5, sortOrder: 1, config: { questions: 5, timerSeconds: 30 } },
  { slug: "spot-the-fake", world: "arcade", kind: "SPOT_FAKE", title: "Spot the Fake", blurb: "Two real proposals, one fabricated. Can you tell?", xpComplete: 5, xpPerCorrect: 5, sortOrder: 2, config: { rounds: 3 } },
  { slug: "fork-detective", world: "upgrade-lab", kind: "MATCH", title: "Fork Detective", blurb: "Match EIPs to upgrades. Ranked: up to 70 XP.", xpComplete: 0, xpPerCorrect: 2, sortOrder: 3, config: {} },
  { slug: "timeline-rebuild", world: "upgrade-lab", kind: "TIMELINE", title: "Rebuild the Timeline", blurb: "Put Ethereum's upgrades back in order.", xpComplete: 5, xpPerCorrect: 2, sortOrder: 4, config: { cards: { EXPLORER: 5, BUILDER: 6, NERD: 8 } } },
  { slug: "timeline-missing", world: "upgrade-lab", kind: "MISSING", title: "Missing Piece", blurb: "A timeline has a gap. Which upgrade belongs there?", xpComplete: 5, xpPerCorrect: 5, sortOrder: 5, config: { rounds: 3 } },
  { slug: "timeline-match", world: "upgrade-lab", kind: "UPGRADE_MATCH", title: "Upgrade Match", blurb: "Match each upgrade with what it changed.", xpComplete: 5, xpPerCorrect: 2, sortOrder: 6, config: {} },
  { slug: "timeline-next", world: "upgrade-lab", kind: "PREDICT", title: "What Comes Next?", blurb: "Predict the future of Ethereum (no wrong answers).", xpComplete: 5, xpPerCorrect: 0, sortOrder: 7, config: {} },
  { slug: "eip-explorer", world: "eip-explorer", kind: "EIP_QUEST", title: "EIP Explorer", blurb: "Find and identify real proposals on EIPsInsight. Ranked.", xpComplete: 0, xpPerCorrect: 0, sortOrder: 8, config: {} },
  { slug: "find-your-eip", world: "eip-explorer", kind: "EIP_LOOKUP", title: "Find Your EIP", blurb: "Type any number. Discover its story.", xpComplete: 5, xpPerCorrect: 0, sortOrder: 8, config: {} },
  { slug: "eip-hunt", world: "eip-explorer", kind: "EIP_HUNT", title: "EIP Hunt", blurb: "Follow the clue. Find the proposal.", xpComplete: 0, xpPerCorrect: 0, sortOrder: 9, config: {} },
  { slug: "pathfinder", world: "pathfinder", kind: "PATHFINDER", title: "Find Your Path", blurb: "Your personal route into the Ethereum ecosystem.", xpComplete: 5, xpPerCorrect: 0, sortOrder: 10, config: {} },
  { slug: "builder-dna", world: "pathfinder", kind: "DNA", title: "Ethereum Builder DNA", blurb: "A personality quiz. No wrong answers.", xpComplete: 5, xpPerCorrect: 0, sortOrder: 11, config: {} },
  { slug: "core-dev-insider", world: "protocol-hq", kind: "INSIDER", title: "Core Dev Insider", blurb: "Find an actual protocol decision. Ranked: up to 70 XP.", xpComplete: 0, xpPerCorrect: 5, sortOrder: 12, config: { rounds: 3 } },
  { slug: "hq-tour", world: "protocol-hq", kind: "HQ_TOUR", title: "EIPsInsight Tour", blurb: "Five quick missions across the real EIPsInsight.", xpComplete: 10, xpPerCorrect: 0, sortOrder: 13, config: {} },
];
