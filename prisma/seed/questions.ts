// ETHQuest question bank. Every fact here is checked against the EIP text (eips.ethereum.org)
// and EIPsInsight's own records; `sourceUrl` points at the canonical source for reviewers.
// Admins can edit or deactivate any row from /booth-admin/questions; re-seeding never overwrites admin edits.

type D = "EXPLORER" | "BUILDER" | "NERD";
const EI = "https://eipsinsight.com";
const eip = (n: number) => `${EI}/eips/${n}`;
const erc = (n: number) => `${EI}/ercs/${n}`;
const spec = (n: number) => `https://eips.ethereum.org/EIPS/eip-${n}`;
const up = (slug: string) => `${EI}/upgrade/${slug}`;

export type TriviaSeed = {
  slug: string;
  difficulty: D;
  topic: string;
  prompt: string;
  options: [string, string, string, string]; // first option is the correct one; shuffled at play time
  hint: string;
  explanation: string;
  eipNumbers?: number[];
  upgradeSlug?: string;
  learnMoreUrl: string;
  sourceUrl: string;
};

export const trivia: TriviaSeed[] = [
  // ---------- EXPLORER ----------
  {
    slug: "exp-blobs-for-rollups", difficulty: "EXPLORER", topic: "scaling",
    prompt: "Ethereum needed a cheaper way for rollups to publish their data. What did it add?",
    options: ["Blobs", "NFTs", "Wallets", "Validators"],
    hint: "Think of a temporary data attachment that rides along with a block.",
    explanation: "EIP-4844 (\"proto-danksharding\") added blob-carrying transactions in the Dencun upgrade on March 13, 2024. Blobs are cheap, temporary data space that rollups use instead of expensive calldata.",
    eipNumbers: [4844], upgradeSlug: "dencun", learnMoreUrl: eip(4844), sourceUrl: spec(4844),
  },
  {
    slug: "exp-eip-meaning", difficulty: "EXPLORER", topic: "governance",
    prompt: "What does \"EIP\" stand for?",
    options: ["Ethereum Improvement Proposal", "Ethereum Internet Protocol", "Encrypted Identity Passport", "Ether Investment Plan"],
    hint: "It's how people suggest changes to Ethereum.",
    explanation: "An EIP is an Ethereum Improvement Proposal: a design document describing a new feature or process. EIP-1 explains how the whole process works.",
    eipNumbers: [1], learnMoreUrl: eip(1), sourceUrl: spec(1),
  },
  {
    slug: "exp-the-merge", difficulty: "EXPLORER", topic: "upgrades",
    prompt: "In September 2022 Ethereum stopped mining and switched to staking. What was that upgrade called?",
    options: ["The Merge", "The Split", "The Burn", "The Halving"],
    hint: "Two chains became one.",
    explanation: "The Merge (September 15, 2022) joined Ethereum's execution layer with the proof-of-stake Beacon Chain, cutting Ethereum's energy use by over 99%. The rules are in EIP-3675.",
    eipNumbers: [3675], upgradeSlug: "the-merge", learnMoreUrl: up("paris"), sourceUrl: spec(3675),
  },
  {
    slug: "exp-fee-burn", difficulty: "EXPLORER", topic: "fees",
    prompt: "Since the London upgrade, what happens to the base fee part of your transaction fee?",
    options: ["It is burned (destroyed forever)", "It goes to miners", "It goes to the Ethereum Foundation", "It's refunded the next day"],
    hint: "Fire is involved.",
    explanation: "EIP-1559, shipped in London (August 5, 2021), introduced a base fee that is burned. Validators only keep the optional priority tip.",
    eipNumbers: [1559], upgradeSlug: "london", learnMoreUrl: eip(1559), sourceUrl: spec(1559),
  },
  {
    slug: "exp-erc20", difficulty: "EXPLORER", topic: "standards",
    prompt: "Most tokens you see in wallets follow the same standard. Which one?",
    options: ["ERC-20", "ERC-721", "EIP-1559", "EIP-4844"],
    hint: "Its number is a nice round twenty.",
    explanation: "ERC-20 is the token standard for fungible tokens. Every token behaves the same way (transfer, balanceOf, approve), so wallets and apps can support all of them at once.",
    eipNumbers: [20], learnMoreUrl: erc(20), sourceUrl: spec(20),
  },
  {
    slug: "exp-erc721", difficulty: "EXPLORER", topic: "standards",
    prompt: "ERC-721 is the standard behind…",
    options: ["NFTs (unique tokens)", "Gas fees", "Staking rewards", "Blob transactions"],
    hint: "Each token is one of a kind.",
    explanation: "ERC-721 defines non-fungible tokens: every token has its own ID, so each one is unique, like a collectible card.",
    eipNumbers: [721], learnMoreUrl: erc(721), sourceUrl: spec(721),
  },
  {
    slug: "exp-who-writes-eips", difficulty: "EXPLORER", topic: "governance",
    prompt: "Who is allowed to write an EIP?",
    options: ["Anyone", "Only the Ethereum Foundation", "Only Vitalik", "Only validators"],
    hint: "Ethereum is built in public.",
    explanation: "Anyone can author an EIP. EIP editors check that proposals are well-formed and follow the process, and the community discusses whether they're a good idea. You could write one too.",
    eipNumbers: [1], learnMoreUrl: eip(1), sourceUrl: spec(1),
  },
  {
    slug: "exp-what-is-hard-fork", difficulty: "EXPLORER", topic: "upgrades",
    prompt: "What is a network upgrade (hard fork) for?",
    options: ["Changing Ethereum's rules for everyone at the same moment", "Splitting the price of ETH in half", "Deleting old accounts", "Resetting everyone's balance"],
    hint: "Every node switches to new rules at an agreed block or time.",
    explanation: "A network upgrade activates new protocol rules at a pre-agreed point. Every client updates its software, so the whole network switches together.",
    learnMoreUrl: `${EI}/upgrade`, sourceUrl: "https://ethereum.org/en/ethereum-forks/",
  },
  {
    slug: "exp-validator", difficulty: "EXPLORER", topic: "consensus",
    prompt: "What does a validator do in proof-of-stake Ethereum?",
    options: ["Stakes ETH to propose and vote on blocks", "Designs wallet apps", "Prints new gas tokens", "Audits smart contracts"],
    hint: "They put ETH at stake to keep the chain honest.",
    explanation: "Validators lock up ETH as a stake, then propose blocks and attest (vote) to other blocks. Misbehaving can cost them part of that stake.",
    learnMoreUrl: up("paris"), sourceUrl: "https://ethereum.org/en/developers/docs/consensus-mechanisms/pos/",
  },
  {
    slug: "exp-pectra-name", difficulty: "EXPLORER", topic: "upgrades",
    prompt: "The 2025 upgrade \"Pectra\" got its name by combining…",
    options: ["Prague + Electra", "Petra + Spectra", "Pectin + Extra", "Paris + Electricity"],
    hint: "One half is a city, the other is a star.",
    explanation: "Execution-layer upgrades are named after Devcon/Devconnect cities and consensus-layer upgrades after stars. Pectra = Prague (execution) + Electra (consensus), live May 7, 2025.",
    upgradeSlug: "pectra", learnMoreUrl: up("pectra"), sourceUrl: spec(7600),
  },
  {
    slug: "exp-dencun-name", difficulty: "EXPLORER", topic: "upgrades",
    prompt: "\"Dencun\" is a mash-up of which two names?",
    options: ["Deneb + Cancun", "Denver + Cancun", "Dune + Cannes", "Delta + Cancel"],
    hint: "A star and a Devcon city.",
    explanation: "Dencun = Deneb (a star, consensus layer) + Cancun (Devcon 3's host city, execution layer). It went live March 13, 2024 and brought blobs.",
    upgradeSlug: "dencun", learnMoreUrl: up("cancun"), sourceUrl: spec(7569),
  },
  {
    slug: "exp-gas", difficulty: "EXPLORER", topic: "fees",
    prompt: "What does \"gas\" measure on Ethereum?",
    options: ["How much computation a transaction needs", "The electricity your phone uses", "The price of ETH", "How many validators are online"],
    hint: "More complex work = more of it.",
    explanation: "Gas measures computational work. Every operation costs some gas, and you pay gas × the current price, which keeps the network from being spammed with endless computation.",
    learnMoreUrl: eip(1559), sourceUrl: "https://ethereum.org/en/developers/docs/gas/",
  },
  {
    slug: "exp-withdrawals", difficulty: "EXPLORER", topic: "upgrades",
    prompt: "Which 2023 upgrade finally let stakers withdraw their ETH?",
    options: ["Shapella", "London", "Frontier", "Homestead"],
    hint: "Shanghai + Capella.",
    explanation: "Shapella (April 12, 2023) enabled staking withdrawals through EIP-4895, about two and a half years after the first deposits.",
    eipNumbers: [4895], upgradeSlug: "shapella", learnMoreUrl: up("shanghai"), sourceUrl: spec(4895),
  },
  {
    slug: "exp-where-track", difficulty: "EXPLORER", topic: "eipsinsight",
    prompt: "Where can you follow EIPs, upgrades and core dev decisions in one place?",
    options: ["EIPsInsight", "A weather app", "Your fridge", "A pizza menu"],
    hint: "You might be standing at its booth right now.",
    explanation: "EIPsInsight tracks EIPs, ERCs and RIPs, network upgrades, devnets, All Core Devs calls and decisions, all open source.",
    learnMoreUrl: EI, sourceUrl: EI,
  },

  // ---------- BUILDER ----------
  {
    slug: "bld-4337", difficulty: "BUILDER", topic: "account-abstraction",
    prompt: "ERC-4337 brought account abstraction to Ethereum. How did it avoid a consensus change?",
    options: ["UserOperations in a separate mempool, executed via an EntryPoint contract", "A new transaction type added in a hard fork", "Moving accounts to a rollup", "Replacing ECDSA with BLS signatures"],
    hint: "The title says \"…Using Alt Mempool\".",
    explanation: "ERC-4337 defines UserOperation objects that bundlers collect from an alternative mempool and submit to a singleton EntryPoint contract. It's smart-account UX with no protocol change.",
    eipNumbers: [4337], learnMoreUrl: erc(4337), sourceUrl: spec(4337),
  },
  {
    slug: "bld-7702", difficulty: "BUILDER", topic: "account-abstraction",
    prompt: "What does EIP-7702 (Pectra) let a regular EOA do?",
    options: ["Set a code delegation so it can run smart-contract logic", "Change its private key", "Skip paying gas", "Hold more than 32 ETH"],
    hint: "Its title is \"Set Code for EOAs\".",
    explanation: "EIP-7702 adds a transaction type where an EOA signs an authorization to delegate to contract code. Batching, sponsorship and other smart-wallet features become possible without migrating the account.",
    eipNumbers: [7702], upgradeSlug: "pectra", learnMoreUrl: eip(7702), sourceUrl: spec(7702),
  },
  {
    slug: "bld-1153", difficulty: "BUILDER", topic: "evm",
    prompt: "EIP-1153 added TSTORE/TLOAD. What is special about transient storage?",
    options: ["It's cleared at the end of every transaction", "It's stored forever for free", "Only validators can read it", "It lives inside blobs"],
    hint: "Perfect for reentrancy locks.",
    explanation: "Transient storage behaves like storage but is discarded after the transaction, so it's much cheaper. It shipped in Dencun (March 2024).",
    eipNumbers: [1153], upgradeSlug: "dencun", learnMoreUrl: eip(1153), sourceUrl: spec(1153),
  },
  {
    slug: "bld-push0", difficulty: "BUILDER", topic: "evm",
    prompt: "Which upgrade introduced the PUSH0 opcode (EIP-3855)?",
    options: ["Shanghai", "London", "Dencun", "Byzantium"],
    hint: "Same upgrade that enabled staking withdrawals.",
    explanation: "PUSH0 pushes the constant 0 onto the stack, saving gas and bytecode size. It shipped in Shanghai (April 12, 2023), so contracts compiled for Shanghai may not deploy on chains without it.",
    eipNumbers: [3855], upgradeSlug: "shapella", learnMoreUrl: eip(3855), sourceUrl: spec(3855),
  },
  {
    slug: "bld-6780", difficulty: "BUILDER", topic: "evm",
    prompt: "After Dencun (EIP-6780), when does SELFDESTRUCT still delete a contract?",
    options: ["Only if called in the same transaction that created the contract", "Always, like before", "Never, it reverts", "Only on Sundays"],
    hint: "The EIP title literally says it.",
    explanation: "EIP-6780 \"SELFDESTRUCT only in same transaction\": otherwise it just sends the ETH and leaves code and storage intact. This paves the way for future state-tree changes.",
    eipNumbers: [6780], upgradeSlug: "dencun", learnMoreUrl: eip(6780), sourceUrl: spec(6780),
  },
  {
    slug: "bld-typed-tx", difficulty: "BUILDER", topic: "transactions",
    prompt: "Which EIP introduced the typed transaction envelope that later made EIP-1559 and blob transactions possible?",
    options: ["EIP-2718", "EIP-20", "EIP-155", "EIP-4337"],
    hint: "Shipped in Berlin, 2021.",
    explanation: "EIP-2718 (Berlin, April 15, 2021) wraps transactions as TransactionType || Payload, so new types (access lists, 1559 fees, blobs, 7702) can be added cleanly.",
    eipNumbers: [2718], upgradeSlug: "berlin", learnMoreUrl: eip(2718), sourceUrl: spec(2718),
  },
  {
    slug: "bld-7251", difficulty: "BUILDER", topic: "staking",
    prompt: "EIP-7251 (Pectra) raised the max effective balance per validator from 32 ETH to…",
    options: ["2048 ETH", "64 ETH", "100 ETH", "1 million ETH"],
    hint: "A power of two.",
    explanation: "EIP-7251 lets a single validator have an effective balance up to 2048 ETH, so large stakers can consolidate validators and rewards can auto-compound.",
    eipNumbers: [7251], upgradeSlug: "pectra", learnMoreUrl: eip(7251), sourceUrl: spec(7251),
  },
  {
    slug: "bld-4788", difficulty: "BUILDER", topic: "evm",
    prompt: "What did EIP-4788 make available inside the EVM?",
    options: ["The parent beacon block root", "The validator's private key", "The ETH price", "The full blob contents"],
    hint: "Great for trust-minimized staking pools.",
    explanation: "EIP-4788 (Dencun) stores beacon block roots in a system contract so smart contracts can verify consensus-layer data like validator balances.",
    eipNumbers: [4788], upgradeSlug: "dencun", learnMoreUrl: eip(4788), sourceUrl: spec(4788),
  },
  {
    slug: "bld-blob-tx-type", difficulty: "BUILDER", topic: "scaling",
    prompt: "Blob-carrying transactions use which transaction type number?",
    options: ["Type 3", "Type 0", "Type 2", "Type 7"],
    hint: "Legacy = 0, access-list = 1, EIP-1559 = 2…",
    explanation: "EIP-4844 defines BLOB_TX_TYPE = 0x03. Type 0 is legacy, 1 is EIP-2930 access lists, 2 is EIP-1559, and EIP-7702 later added type 4.",
    eipNumbers: [4844], upgradeSlug: "dencun", learnMoreUrl: eip(4844), sourceUrl: spec(4844),
  },
  {
    slug: "bld-7691", difficulty: "BUILDER", topic: "scaling",
    prompt: "EIP-7691 in Pectra changed the blob target/max per block from 3/6 to…",
    options: ["6/9", "4/8", "16/32", "1/2"],
    hint: "The target doubled.",
    explanation: "EIP-7691 \"Blob throughput increase\" raised the target to 6 and the max to 9 blobs per block, cutting data costs for rollups.",
    eipNumbers: [7691], upgradeSlug: "pectra", learnMoreUrl: eip(7691), sourceUrl: spec(7691),
  },
  {
    slug: "bld-4626", difficulty: "BUILDER", topic: "standards",
    prompt: "A DeFi team wants a standard interface for yield-bearing vaults. Which ERC should they implement?",
    options: ["ERC-4626", "ERC-721", "ERC-1155", "ERC-4337"],
    hint: "\"Tokenized Vaults\".",
    explanation: "ERC-4626 standardizes vaults that hold an underlying ERC-20 and issue shares (deposit, withdraw, convertToShares…), so integrators support every vault the same way.",
    eipNumbers: [4626], learnMoreUrl: erc(4626), sourceUrl: spec(4626),
  },
  {
    slug: "bld-155", difficulty: "BUILDER", topic: "transactions",
    prompt: "EIP-155 prevents a transaction signed for one chain from being replayed on another. What does it add to the signature?",
    options: ["The chain ID", "The block number", "The gas price", "The sender's ENS name"],
    hint: "Mainnet's is 1.",
    explanation: "EIP-155 (Spurious Dragon, 2016) mixes the chain ID into the signed data, so a mainnet transaction is invalid on other chains.",
    eipNumbers: [155], upgradeSlug: "spurious-dragon", learnMoreUrl: eip(155), sourceUrl: spec(155),
  },
  {
    slug: "bld-7623", difficulty: "BUILDER", topic: "fees",
    prompt: "Why did EIP-7623 (Pectra) increase calldata cost for data-heavy transactions?",
    options: ["To shrink the worst-case block size and push data to blobs", "To raise more ETH for the Foundation", "To stop NFTs", "To make transfers more expensive"],
    hint: "Blobs are where rollup data should go now.",
    explanation: "EIP-7623 adds a floor price for calldata-heavy transactions. Normal transactions are barely affected, but the maximum block size drops, making room for more blobs.",
    eipNumbers: [7623], upgradeSlug: "pectra", learnMoreUrl: eip(7623), sourceUrl: spec(7623),
  },
  {
    slug: "bld-layers", difficulty: "BUILDER", topic: "architecture",
    prompt: "Since The Merge, an Ethereum node runs two pieces of software. Which pair is right?",
    options: ["Execution client + consensus client", "Wallet + miner", "Mempool + explorer", "Rollup + bridge"],
    hint: "Geth/Nethermind/Besu… + Lighthouse/Prysm/Teku…",
    explanation: "The execution client runs the EVM and transactions, and the consensus client runs proof-of-stake. They talk over the Engine API.",
    learnMoreUrl: up("paris"), sourceUrl: "https://ethereum.org/en/developers/docs/nodes-and-clients/",
  },

  // ---------- NERD ----------
  {
    slug: "nrd-peerdas", difficulty: "NERD", topic: "scaling",
    prompt: "With PeerDAS (EIP-7594, Fusaka), how does a node check blob data availability?",
    options: ["It custodies and samples a subset of erasure-coded data columns", "It downloads every blob in full", "It trusts the block builder", "It asks a centralized DA committee"],
    hint: "Data Availability Sampling.",
    explanation: "PeerDAS erasure-codes blob data into columns. Nodes custody and sample only some columns, which is enough to be confident the full data is available. Fusaka went live on December 3, 2025.",
    eipNumbers: [7594], upgradeSlug: "fusaka", learnMoreUrl: eip(7594), sourceUrl: spec(7594),
  },
  {
    slug: "nrd-blob-retention", difficulty: "NERD", topic: "scaling",
    prompt: "Roughly how long do consensus nodes keep blob sidecars available for download?",
    options: ["~18 days (4096 epochs)", "Forever", "1 hour", "1 year"],
    hint: "MIN_EPOCHS_FOR_BLOB_SIDECARS_REQUESTS.",
    explanation: "The Deneb spec sets MIN_EPOCHS_FOR_BLOB_SIDECARS_REQUESTS = 4096 epochs, about 18 days. Blobs are temporary, and only their KZG commitments live on-chain forever.",
    eipNumbers: [4844], upgradeSlug: "dencun", learnMoreUrl: eip(4844), sourceUrl: spec(4844),
  },
  {
    slug: "nrd-blob-size", difficulty: "NERD", topic: "scaling",
    prompt: "A single blob holds 4096 field elements of 32 bytes. How big is it?",
    options: ["128 KiB", "32 KiB", "1 MiB", "4 KiB"],
    hint: "4096 × 32.",
    explanation: "FIELD_ELEMENTS_PER_BLOB = 4096 × 32 bytes = 131,072 bytes = 128 KiB per blob.",
    eipNumbers: [4844], upgradeSlug: "dencun", learnMoreUrl: eip(4844), sourceUrl: spec(4844),
  },
  {
    slug: "nrd-prevrandao", difficulty: "NERD", topic: "evm",
    prompt: "After The Merge, opcode 0x44 (formerly DIFFICULTY) returns what?",
    options: ["PREVRANDAO, the beacon chain's RANDAO mix", "Always zero", "The block's total difficulty", "The base fee"],
    hint: "EIP-4399.",
    explanation: "EIP-4399 renamed 0x44 to PREVRANDAO. It returns the previous block's RANDAO mix from the beacon chain. It's useful randomness, but proposers can bias it slightly.",
    eipNumbers: [4399], upgradeSlug: "the-merge", learnMoreUrl: eip(4399), sourceUrl: spec(4399),
  },
  {
    slug: "nrd-merge-trigger", difficulty: "NERD", topic: "consensus",
    prompt: "What triggered The Merge transition on mainnet?",
    options: ["Reaching a Terminal Total Difficulty", "A fixed block number", "A Unix timestamp", "A multisig vote"],
    hint: "Proof-of-work's cumulative score.",
    explanation: "EIP-3675 switched consensus once the chain hit TERMINAL_TOTAL_DIFFICULTY, a value of cumulative work. Later execution-layer forks activate by timestamp instead of block number.",
    eipNumbers: [3675], upgradeSlug: "the-merge", learnMoreUrl: eip(3675), sourceUrl: spec(3675),
  },
  {
    slug: "nrd-2929", difficulty: "NERD", topic: "evm",
    prompt: "EIP-2929 (Berlin) made the first (\"cold\") SLOAD of a slot in a transaction cost…",
    options: ["2100 gas", "800 gas", "100 gas", "20000 gas"],
    hint: "Warm reads cost 100.",
    explanation: "EIP-2929 set COLD_SLOAD_COST = 2100 and WARM_STORAGE_READ_COST = 100. This mitigated DoS attacks based on state access.",
    eipNumbers: [2929], upgradeSlug: "berlin", learnMoreUrl: eip(2929), sourceUrl: spec(2929),
  },
  {
    slug: "nrd-bpo", difficulty: "NERD", topic: "upgrades",
    prompt: "What is special about a \"Blob Parameter Only\" (BPO) fork (EIP-7892)?",
    options: ["It changes only blob target/max parameters, nothing else", "It removes blobs", "It's a fork run only on testnets", "It lets each validator pick its blob count"],
    hint: "BPO1 and BPO2 followed Fusaka.",
    explanation: "EIP-7892 lets clients pre-schedule light forks that only adjust blob parameters. BPO1 (Dec 9, 2025) and BPO2 (Jan 7, 2026) raised blob capacity after Fusaka.",
    eipNumbers: [7892], upgradeSlug: "bpo2", learnMoreUrl: eip(7892), sourceUrl: spec(7892),
  },
  {
    slug: "nrd-1559-change", difficulty: "NERD", topic: "fees",
    prompt: "Under EIP-1559, what's the maximum the base fee can change from one block to the next?",
    options: ["12.5%", "50%", "1%", "100%"],
    hint: "BASE_FEE_MAX_CHANGE_DENOMINATOR = 8.",
    explanation: "The base fee moves by at most 1/8 (12.5%) per block, depending on how far the parent block's gas use was from the target (half the gas limit).",
    eipNumbers: [1559], upgradeSlug: "london", learnMoreUrl: eip(1559), sourceUrl: spec(1559),
  },
  {
    slug: "nrd-6110", difficulty: "NERD", topic: "staking",
    prompt: "What did EIP-6110 (Pectra) replace?",
    options: ["Eth1Data voting for validator deposits", "The deposit contract", "BLS signatures", "Sync committees"],
    hint: "\"Supply validator deposits on chain\".",
    explanation: "EIP-6110 has the execution layer pass deposits directly to the consensus layer. This removes the slow, vote-based Eth1Data bridge, so deposits get processed in minutes instead of ~12 hours.",
    eipNumbers: [6110], upgradeSlug: "pectra", learnMoreUrl: eip(6110), sourceUrl: spec(6110),
  },
  {
    slug: "nrd-7002", difficulty: "NERD", topic: "staking",
    prompt: "EIP-7002 lets which key trigger a validator exit?",
    options: ["The execution-layer withdrawal credential", "The BLS signing key only", "Any EOA", "The block proposer"],
    hint: "\"Execution layer triggerable withdrawals\".",
    explanation: "Before EIP-7002, only the validator's signing key could exit it. Now the withdrawal address (for example a staking-pool contract) can trigger exits and partial withdrawals from the EL.",
    eipNumbers: [7002], upgradeSlug: "pectra", learnMoreUrl: eip(7002), sourceUrl: spec(7002),
  },
  {
    slug: "nrd-epbs", difficulty: "NERD", topic: "research",
    prompt: "What does EIP-7732 (ePBS) enshrine into the protocol?",
    options: ["Separation of the block proposer and block builder roles", "A protocol-run MEV auction house with fixed fees", "Permanent blob storage", "Single-slot finality"],
    hint: "Today this is done off-protocol via MEV-Boost relays.",
    explanation: "Enshrined Proposer-Builder Separation splits a block into a consensus block and a builder's execution payload, removing reliance on trusted relays. It's a Glamsterdam headliner.",
    eipNumbers: [7732], upgradeSlug: "glamsterdam", learnMoreUrl: eip(7732), sourceUrl: spec(7732),
  },
  {
    slug: "nrd-bal", difficulty: "NERD", topic: "research",
    prompt: "Block-Level Access Lists (EIP-7928) mainly help clients by…",
    options: ["Listing state touched by the block so execution and validation can be parallelized", "Banning certain addresses", "Compressing blobs", "Replacing the mempool"],
    hint: "Know what's touched before you execute.",
    explanation: "A BAL records every account and storage slot a block accesses, plus post-execution values. Clients can then prefetch state and validate transactions in parallel. It's the Glamsterdam execution-layer headliner.",
    eipNumbers: [7928], upgradeSlug: "glamsterdam", learnMoreUrl: eip(7928), sourceUrl: spec(7928),
  },
  {
    slug: "nrd-cl-names", difficulty: "NERD", topic: "upgrades",
    prompt: "Consensus-layer forks go alphabetically through star names: …Deneb, Electra, Fulu. What's next?",
    options: ["Gloas", "Gemini", "Gamma", "Glamsterdam"],
    hint: "Glamsterdam = ??? + Amsterdam.",
    explanation: "Glamsterdam combines Gloas (consensus) and Amsterdam (execution). After that comes Heze, paired with Bogotá for Hegotá.",
    upgradeSlug: "glamsterdam", learnMoreUrl: up("glamsterdam"), sourceUrl: spec(7773),
  },
  {
    slug: "nrd-focil", difficulty: "NERD", topic: "research",
    prompt: "FOCIL (EIP-7805) strengthens censorship resistance by…",
    options: ["Letting a committee of validators force transactions into blocks via inclusion lists", "Encrypting the whole mempool", "Banning MEV", "Making blocks private"],
    hint: "Fork-choice enforced Inclusion Lists.",
    explanation: "With FOCIL, a committee publishes inclusion lists each slot, and attesters only vote for blocks that respect them. Builders can't quietly exclude valid transactions.",
    eipNumbers: [7805], upgradeSlug: "hegota", learnMoreUrl: eip(7805), sourceUrl: spec(7805),
  },
];

// ---------------- Spot the Fake ----------------
// Fake numbers are checked at seed time to not exist in EIPsInsight's EIP table.
export type SpotFakeSeed = {
  slug: string;
  difficulty: D;
  cards: { label: string; text: string; fake?: boolean; number: number }[];
  explanation: string;
  hint: string;
};

export const spotFake: SpotFakeSeed[] = [
  {
    slug: "sf-exp-teleport", difficulty: "EXPLORER", hint: "One of these would break the laws of physics.",
    cards: [
      { label: "EIP-1559", number: 1559, text: "Introduced a base fee that gets burned with every transaction." },
      { label: "EIP-4844", number: 4844, text: "Introduced blob-carrying transactions to make rollups cheaper." },
      { label: "EIP-9987", number: 9987, fake: true, text: "Introduced Ethereum Teleportation: ETH moves between wallets via quantum tunnels." },
    ],
    explanation: "EIP-9987 \"Ethereum Teleportation\" does not exist. We made it up. EIP-1559 (London, 2021) and EIP-4844 (Dencun, 2024) are real.",
  },
  {
    slug: "sf-exp-pizza", difficulty: "EXPLORER", hint: "Tasty, but not a token standard.",
    cards: [
      { label: "ERC-20", number: 20, text: "A standard interface for fungible tokens." },
      { label: "ERC-721", number: 721, text: "A standard for non-fungible tokens (NFTs)." },
      { label: "ERC-9420", number: 9420, fake: true, text: "The Pizza Standard: every token transfer must include a topping." },
    ],
    explanation: "ERC-9420 \"Pizza Standard\" is fictional. ERC-20 and ERC-721 are two of the most widely used real standards.",
  },
  {
    slug: "sf-exp-moon", difficulty: "EXPLORER", hint: "Gas isn't affected by astronomy.",
    cards: [
      { label: "EIP-3675", number: 3675, text: "Upgraded Ethereum's consensus to proof-of-stake (The Merge)." },
      { label: "EIP-155", number: 155, text: "Added replay protection so transactions only work on one chain." },
      { label: "EIP-9001", number: 9001, fake: true, text: "Moon Mode: gas is free on full-moon nights." },
    ],
    explanation: "EIP-9001 \"Moon Mode\" is made up. Gas doesn't care about the moon. The Merge (EIP-3675) and replay protection (EIP-155) are real.",
  },
  {
    slug: "sf-exp-undo", difficulty: "EXPLORER", hint: "Blockchains are famous for being hard to undo…",
    cards: [
      { label: "EIP-4895", number: 4895, text: "Enabled withdrawals of staked ETH from the beacon chain." },
      { label: "EIP-7702", number: 7702, text: "Lets regular wallets temporarily use smart-contract features." },
      { label: "EIP-9876", number: 9876, fake: true, text: "The Undo Button: reverse any transaction within 24 hours by asking nicely." },
    ],
    explanation: "EIP-9876 \"Undo Button\" is fictional. Confirmed transactions can't be reversed. EIP-4895 (Shapella) and EIP-7702 (Pectra) are real.",
  },
  {
    slug: "sf-exp-cats", difficulty: "EXPLORER", hint: "Cute, but tokens don't nap.",
    cards: [
      { label: "ERC-4337", number: 4337, text: "Account abstraction using a separate mempool and EntryPoint contract." },
      { label: "ERC-1155", number: 1155, text: "A multi-token standard: many token types in one contract." },
      { label: "ERC-9898", number: 9898, fake: true, text: "Cat Tokens: tokens sleep 16 hours a day and refuse transfers while napping." },
    ],
    explanation: "ERC-9898 \"Cat Tokens\" is fictional. ERC-4337 and ERC-1155 are real, Final standards.",
  },
  {
    slug: "sf-bld-sstore", difficulty: "BUILDER", hint: "Ethereum has been making state access MORE expensive, not free.",
    cards: [
      { label: "EIP-2929", number: 2929, text: "Raised gas costs for first-time (\"cold\") state access in a transaction." },
      { label: "EIP-1153", number: 1153, text: "Added transient storage opcodes TSTORE and TLOAD." },
      { label: "EIP-9142", number: 9142, fake: true, text: "Makes SSTORE free for contracts deployed before 2020." },
    ],
    explanation: "EIP-9142 is fictional. Free storage writes would be a spam disaster. EIP-2929 (Berlin) and EIP-1153 (Dencun) are real.",
  },
  {
    slug: "sf-bld-cancel", difficulty: "BUILDER", hint: "The EVM can't see the mempool.",
    cards: [
      { label: "EIP-6780", number: 6780, text: "SELFDESTRUCT only deletes a contract within the transaction that created it." },
      { label: "EIP-3860", number: 3860, text: "Limits and meters initcode size for contract creation." },
      { label: "EIP-9233", number: 9233, fake: true, text: "Adds a CANCEL opcode that removes pending transactions from the mempool." },
    ],
    explanation: "EIP-9233 is fictional. The mempool isn't part of consensus, so an opcode can't touch it. To cancel a transaction you replace it with the same nonce. EIP-6780 and EIP-3860 are real.",
  },
  {
    slug: "sf-bld-slot", difficulty: "BUILDER", hint: "Every validator has to agree on the same clock.",
    cards: [
      { label: "EIP-4788", number: 4788, text: "Exposes the parent beacon block root inside the EVM." },
      { label: "EIP-7251", number: 7251, text: "Raises the max effective balance per validator to 2048 ETH." },
      { label: "EIP-9310", number: 9310, fake: true, text: "Lets each validator choose its own slot time between 6 and 24 seconds." },
    ],
    explanation: "EIP-9310 is fictional. Slot timing is a global protocol constant, so per-validator clocks would break consensus. EIP-4788 and EIP-7251 are real.",
  },
  {
    slug: "sf-bld-forever-blobs", difficulty: "BUILDER", hint: "Blobs are designed to be temporary.",
    cards: [
      { label: "EIP-7691", number: 7691, text: "Increases blob throughput (target 6, max 9 per block)." },
      { label: "EIP-2935", number: 2935, text: "Serves historical block hashes from state via a system contract." },
      { label: "EIP-9477", number: 9477, fake: true, text: "Requires every node to store all blobs permanently so rollups never need archivers." },
    ],
    explanation: "EIP-9477 is fictional. Blobs are pruned after ~18 days so nodes stay light. EIP-7691 and EIP-2935 (both Pectra) are real.",
  },
  {
    slug: "sf-nrd-merkle-blobs", difficulty: "NERD", hint: "Which commitment scheme makes DAS work?",
    cards: [
      { label: "EIP-7594", number: 7594, text: "PeerDAS: nodes sample erasure-coded columns of blob data." },
      { label: "EIP-7002", number: 7002, text: "Execution-layer withdrawal credentials can trigger validator exits." },
      { label: "EIP-9512", number: 9512, fake: true, text: "Replaces blob KZG commitments with plain Merkle roots to drop the trusted setup." },
    ],
    explanation: "EIP-9512 is fictional. Blobs keep KZG commitments, whose polynomial properties are what make data availability sampling efficient. EIP-7594 and EIP-7002 are real.",
  },
  {
    slug: "sf-nrd-retention", difficulty: "NERD", hint: "Rollup fraud proofs need a window measured in days.",
    cards: [
      { label: "EIP-4399", number: 4399, text: "Replaces the DIFFICULTY opcode with PREVRANDAO." },
      { label: "EIP-6110", number: 6110, text: "Supplies validator deposits on chain, replacing Eth1Data voting." },
      { label: "EIP-9608", number: 9608, fake: true, text: "Shortens blob retention from ~18 days to 1 hour to save disk." },
    ],
    explanation: "EIP-9608 is fictional. One hour would be far too short for anyone to fetch or challenge rollup data. EIP-4399 and EIP-6110 are real.",
  },
  {
    slug: "sf-nrd-basefee", difficulty: "NERD", hint: "Remember the base fee's max change per block.",
    cards: [
      { label: "EIP-7623", number: 7623, text: "Increases calldata cost for data-heavy transactions with a floor price." },
      { label: "EIP-7892", number: 7892, text: "Blob Parameter Only hardforks that adjust only blob parameters." },
      { label: "EIP-9741", number: 9741, fake: true, text: "Raises the EIP-1559 base fee max change from 12.5% to 50% per block." },
    ],
    explanation: "EIP-9741 is fictional. The base fee still moves at most 12.5% per block. EIP-7623 (Pectra) and EIP-7892 (BPO forks) are real.",
  },
  {
    slug: "sf-nrd-execchain", difficulty: "NERD", hint: "ePBS separates roles, not chains.",
    cards: [
      { label: "EIP-7732", number: 7732, text: "Enshrined Proposer-Builder Separation." },
      { label: "EIP-7928", number: 7928, text: "Block-Level Access Lists recording state touched by a block." },
      { label: "EIP-9833", number: 9833, fake: true, text: "Moves execution payloads to a separate \"execution chain\" with its own validator set." },
    ],
    explanation: "EIP-9833 is fictional. Ethereum has one validator set, and ePBS just splits who builds the payload. EIP-7732 and EIP-7928 are real Glamsterdam headliners.",
  },
];

// ---------------- Fork Detective (matching) ----------------
export type MatchSeed = { slug: string; difficulty: D; prompt: string; pairs: [string, string][]; explanation: string; sourceUrl: string; learnMoreUrl: string };

export const matchSets: MatchSeed[] = [
  {
    slug: "m-exp-eips", difficulty: "EXPLORER", prompt: "Match each proposal to what it does",
    pairs: [["EIP-1559", "Burns the base fee"], ["EIP-4844", "Blobs for rollups"], ["ERC-20", "Fungible tokens"], ["ERC-721", "NFTs"]],
    explanation: "Four of the most famous proposals: fee burning (London), blobs (Dencun), and the two big token standards.",
    sourceUrl: spec(1559), learnMoreUrl: `${EI}/explore`,
  },
  {
    slug: "m-exp-moments", difficulty: "EXPLORER", prompt: "Match each upgrade to its big moment",
    pairs: [["London", "Fee burn begins"], ["The Merge", "Switch to proof-of-stake"], ["Shapella", "Staking withdrawals"], ["Dencun", "Blobs arrive"]],
    explanation: "London (2021) → The Merge (2022) → Shapella (2023) → Dencun (2024).",
    sourceUrl: "https://ethereum.org/en/ethereum-forks/", learnMoreUrl: `${EI}/upgrade`,
  },
  {
    slug: "m-exp-status", difficulty: "EXPLORER", prompt: "Match each EIP status to its meaning",
    pairs: [["Draft", "Still being written"], ["Last Call", "Final review window"], ["Final", "Settled standard"], ["Stagnant", "Inactive for 6+ months"]],
    explanation: "EIP-1 defines the lifecycle: Draft → Review → Last Call → Final. Drafts with no activity for 6 months become Stagnant.",
    sourceUrl: spec(1), learnMoreUrl: eip(1),
  },
  {
    slug: "m-bld-upgrades", difficulty: "BUILDER", prompt: "Match each EIP to the upgrade that shipped it",
    pairs: [["EIP-1559", "London"], ["EIP-4895", "Shapella"], ["EIP-4844", "Dencun"], ["EIP-7702", "Pectra"]],
    explanation: "Fee market (2021), withdrawals (2023), blobs (2024), EOA code delegation (2025).",
    sourceUrl: "https://ethereum.org/en/ethereum-forks/", learnMoreUrl: `${EI}/upgrade`,
  },
  {
    slug: "m-bld-opcodes", difficulty: "BUILDER", prompt: "Match each opcode to the EIP that introduced it",
    pairs: [["TSTORE / TLOAD", "EIP-1153"], ["PUSH0", "EIP-3855"], ["PREVRANDAO", "EIP-4399"], ["BASEFEE", "EIP-3198"]],
    explanation: "Transient storage (Dencun), PUSH0 (Shanghai), PREVRANDAO (The Merge), BASEFEE (London).",
    sourceUrl: spec(1153), learnMoreUrl: `${EI}/explore`,
  },
  {
    slug: "m-bld-standards", difficulty: "BUILDER", prompt: "Match each ERC to its use",
    pairs: [["ERC-20", "Fungible tokens"], ["ERC-721", "Unique NFTs"], ["ERC-1155", "Many token types, one contract"], ["ERC-4626", "Tokenized yield vaults"]],
    explanation: "The core token & DeFi standards that most apps build on.",
    sourceUrl: spec(4626), learnMoreUrl: `${EI}/standards`,
  },
  {
    slug: "m-bld-status", difficulty: "BUILDER", prompt: "Match each EIP status to its meaning",
    pairs: [["Review", "Author asks editors for review"], ["Withdrawn", "Author abandoned it"], ["Living", "Continually updated (e.g. EIP-1)"], ["Last Call", "Final review window"]],
    explanation: "From EIP-1: Living EIPs are never Final, Withdrawn is permanent, and Last Call usually runs 14 days.",
    sourceUrl: spec(1), learnMoreUrl: eip(1),
  },
  {
    slug: "m-nrd-upgrades", difficulty: "NERD", prompt: "Match each EIP to its upgrade",
    pairs: [["EIP-2929", "Berlin"], ["EIP-6780", "Dencun"], ["EIP-7251", "Pectra"], ["EIP-7594", "Fusaka"]],
    explanation: "Cold access gas (2021), SELFDESTRUCT neutering (2024), MaxEB (2025), PeerDAS (Dec 2025).",
    sourceUrl: "https://ethereum.org/en/ethereum-forks/", learnMoreUrl: `${EI}/upgrade`,
  },
  {
    slug: "m-nrd-pairs", difficulty: "NERD", prompt: "Match each consensus fork to its execution twin",
    pairs: [["Capella", "Shanghai"], ["Deneb", "Cancun"], ["Electra", "Prague"], ["Fulu", "Osaka"]],
    explanation: "Shapella, Dencun, Pectra, Fusaka: each combined upgrade name blends the two halves.",
    sourceUrl: "https://ethereum.org/en/ethereum-forks/", learnMoreUrl: `${EI}/upgrade`,
  },
  {
    slug: "m-nrd-research", difficulty: "NERD", prompt: "Match each research EIP to its idea",
    pairs: [["EIP-7594", "Data availability sampling"], ["EIP-7732", "Proposer-builder separation"], ["EIP-7928", "Block-level access lists"], ["EIP-7805", "Inclusion lists for censorship resistance"]],
    explanation: "PeerDAS (Fusaka), ePBS and BALs (Glamsterdam), FOCIL (Hegotá headliner).",
    sourceUrl: spec(7805), learnMoreUrl: `${EI}/upgrade`,
  },
  {
    slug: "m-nrd-activation", difficulty: "NERD", prompt: "Match each fork era to how it activated",
    pairs: [["Pre-Merge EL forks", "Block number"], ["The Merge", "Terminal total difficulty"], ["Post-Merge EL forks", "Timestamp"], ["Consensus forks", "Epoch"]],
    explanation: "Activation moved from block numbers to TTD (for The Merge) to timestamps. CL forks always activate at an epoch.",
    sourceUrl: spec(3675), learnMoreUrl: `${EI}/upgrade`,
  },
];
