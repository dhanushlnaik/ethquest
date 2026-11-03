# Content sources & accuracy policy

Everything players read as fact comes from one of these, and every DB row stores its `sourceUrl`.

| Content | Source of truth | Where it lives |
|---|---|---|
| EIP number, title, status, type, category, authors, created, requires | EIPsInsight database (`public.eips` + `eip_snapshots`), fallback `eipsinsight.com/rpc/proposals/getProposal` | Live, `src/lib/server/eipsinsight.ts` |
| Upcoming-upgrade membership (Glamsterdam/Hegotá buckets) | EIPsInsight `upgrade_composition_current` | Live |
| Core Dev Insider decisions | EIPsInsight `protocol_calls.key_decisions` (ACDE/ACDC/ACDT), quoted verbatim with call link | Live, `buildInsider()` |
| Upgrade activation dates, blocks, epochs | EIPsInsight `src/data/network-upgrades.ts`, cross-checked with ethereum.org/en/ethereum-forks | `prisma/seed/world.ts` → `Upgrade` |
| Trivia, matching, plain-English blurbs | EIP texts on eips.ethereum.org (each question links its spec) | `prisma/seed/questions.ts` → `QuizQuestion` |
| Pathfinder resources | Real EIPsInsight pages and established public resources (ethereum.org, Ethereum Magicians, ethresear.ch, EPF wiki, ethereum/* repos, L2BEAT, EEA, Protocol Guild) | `prisma/seed/world.ts` → `PathwayStep` |

## Rules baked into the code

- **Only LIVE upgrades are facts.** DB constraint: `status = 'LIVE'` requires `activatedAt`. Non-live upgrades (Glamsterdam: *in development*; Hegotá: *planned*) never get a date and only appear in **What Comes Next?**, labelled "Prediction, not confirmed roadmap". As of seeding, ACDE #248 (Oct 22, 2026) deferred the Glamsterdam mainnet date. The game quotes the latest such decision live.
- **Fakes are fenced.** Spot-the-Fake numbers are checked at seed time against `public.eips` *and* `public.pull_request_eips`. Seeding aborts on any collision. Every reveal says the proposal is fictional. Fakes are never stored as EIP records, so search can't surface them.
- **No invented opportunities.** Pathways recommend actions ("browse open issues", "read a Last Call thread"), never specific openings, bounties or roles.
- **Admin edits win.** Rows edited in `/booth-admin` are flagged `editedByAdmin` and skipped by re-seeding.

## Items worth a human review before the doors open

- Question bank wording (66 items) in `/booth-admin/questions`. Each has an explanation + source link.
- BPO1/BPO2 one-liners intentionally avoid stating blob numbers.
- Reward stock numbers are placeholders (500/300/200/100). Set real inventory in `/booth-admin/rewards`.
