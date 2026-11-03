# ETHQuest asset pack

Original art for ETHQuest by EIPsInsight (Devcon 8) in a bright handheld-RPG arcade style: ink (`#1d2b53`) outlines, candy primaries, sky backgrounds. One shared palette lives in `scripts/pixellab-generate.mjs` (`PALETTE`) and `src/lib/pixel/icons.ts` (`PIXEL_COLORS`).

## Pipelines

| Pipeline | Command | Produces |
|---|---|---|
| PixelLab (AI pixel art, forced palette) | `node --env-file=.env scripts/pixellab-generate.mjs <filter> [--force]` | Heroes and role characters. Retries on the free-plan concurrency limit. |
| Palette swaps | `node scripts/palette-swap.mjs` | Builder DNA characters from the five heroes (outfit hue rotation, skin and outline preserved) |
| Scene recolor | `node scripts/recolor-scenes.mjs <v1-scenes-dir> public/assets/worlds` | Per-world gradient-mapped scenes (letterbox trimmed) |
| Logo | `pnpm tsx scripts/gen-logo.ts` | `brand/ethquest-mark*.svg/png`, `src/lib/pixel/mark.ts`, PWA icons |
| Icons & badges | `pnpm assets` | `icons/*.svg`, `badges/*.svg`, scene WebPs |

After changing anything under `/assets`, bump `VERSION` in `public/sw.js` so installed PWAs refresh their cache.

## Brand

`brand/ethquest-mark.svg` is the EIPsInsight rising-bars-and-arrow mark, redrawn as 24×24 pixel art with rainbow bars, a gold arrow and an ink outline. The full lockup (mark + rainbow outlined **ETHQuest** wordmark + "by EIPsInsight" ribbon) is the `<Logo>` / `<Wordmark>` / `<BrandMark>` components in `src/components/logo.tsx`.

## Inventory

| File | Size | Format | Source | Used for |
|---|---|---|---|---|
| `characters/builder.png` | 64x64 | PNG | PixelLab v2 | Avatar · Arcade host · Developer role |
| `characters/community-builder.png` | 64x64 | PNG | PixelLab v2 | Pathfinder role: Community Builder |
| `characters/designer.png` | 64x64 | PNG | PixelLab v2 | Pathfinder role: Designer |
| `characters/dna-client-diversity-defender.png` | 64x64 | PNG | Palette swap of `builder` (`scripts/palette-swap.mjs`) | Builder DNA result: Client Diversity Defender |
| `characters/dna-consensus-enjoyer.png` | 64x64 | PNG | Palette swap of `governance-wizard` (`scripts/palette-swap.mjs`) | Builder DNA result: Consensus Enjoyer |
| `characters/dna-devex-wizard.png` | 64x64 | PNG | Palette swap of `governance-wizard` (`scripts/palette-swap.mjs`) | Builder DNA result: Devex Wizard |
| `characters/dna-gas-optimizer.png` | 64x64 | PNG | Palette swap of `protocol-engineer` (`scripts/palette-swap.mjs`) | Builder DNA result: Gas Optimizer |
| `characters/dna-protocol-architect.png` | 64x64 | PNG | Palette swap of `researcher` (`scripts/palette-swap.mjs`) | Builder DNA result: Protocol Architect |
| `characters/dna-rabbit-hole-explorer.png` | 64x64 | PNG | Palette swap of `explorer` (`scripts/palette-swap.mjs`) | Builder DNA result: Rabbit Hole Explorer |
| `characters/dna-scaling-enthusiast.png` | 64x64 | PNG | Palette swap of `explorer` (`scripts/palette-swap.mjs`) | Builder DNA result: Scaling Enthusiast |
| `characters/explorer.png` | 64x64 | PNG | PixelLab v2 | Avatar · Pathfinder host · "Curious Newcomer" role |
| `characters/governance-wizard.png` | 64x64 | PNG | PixelLab v2 | Avatar · Protocol HQ host |
| `characters/protocol-engineer.png` | 64x64 | PNG | PixelLab v2 | Avatar · Upgrade Lab host |
| `characters/researcher.png` | 64x64 | PNG | PixelLab v2 | Avatar · EIP Explorer host · Researcher role |
| `characters/student.png` | 64x64 | PNG | PixelLab v2 | Pathfinder role: Student |
| `worlds/room-achievement-hall.png + .webp` | 320x180 | PNG source, lossless WebP served | PixelLab v1 scene, gradient-mapped (`scripts/recolor-scenes.mjs`) | Achievement room (reserved) |
| `worlds/room-reward-shop.png + .webp` | 320x180 | PNG source, lossless WebP served | PixelLab v1 scene, gradient-mapped (`scripts/recolor-scenes.mjs`) | Reward shop header |
| `worlds/title-landscape.png + .webp` | 320x180 | PNG source, lossless WebP served | PixelLab v1 scene, gradient-mapped (`scripts/recolor-scenes.mjs`) | Title screen |
| `worlds/world-arcade.png + .webp` | 320x180 | PNG source, lossless WebP served | PixelLab v1 scene, gradient-mapped (`scripts/recolor-scenes.mjs`) | World 01 (red/gold) |
| `worlds/world-eip-explorer.png + .webp` | 320x180 | PNG source, lossless WebP served | PixelLab v1 scene, gradient-mapped (`scripts/recolor-scenes.mjs`) | World 03 (green/gold) |
| `worlds/world-pathfinder.png + .webp` | 320x180 | PNG source, lossless WebP served | PixelLab v1 scene, gradient-mapped (`scripts/recolor-scenes.mjs`) | World 04 + Pathfinder crossroads + share card |
| `worlds/world-protocol-hq.png + .webp` | 320x180 | PNG source, lossless WebP served | PixelLab v1 scene, gradient-mapped (`scripts/recolor-scenes.mjs`) | World 05 (pink/grape) |
| `worlds/world-upgrade-lab.png + .webp` | 320x180 | PNG source, lossless WebP served | PixelLab v1 scene, gradient-mapped (`scripts/recolor-scenes.mjs`) | World 02 (blue/mint) |
| `rewards/arcade-machine.png` | 64x64 | PNG | PixelLab v1, hue/saturation lifted | Reward art: arcade machine |
| `rewards/loot-box.png` | 64x64 | PNG | PixelLab v1, hue/saturation lifted | Reward art: loot box |
| `rewards/medal.png` | 64x64 | PNG | PixelLab v1, hue/saturation lifted | Reward art: medal |
| `rewards/nft-card.png` | 64x64 | PNG | PixelLab v1, hue/saturation lifted | Reward art: nft card |
| `rewards/pin.png` | 64x64 | PNG | PixelLab v1, hue/saturation lifted | Reward art: pin |
| `rewards/sticker-pack.png` | 64x64 | PNG | PixelLab v1, hue/saturation lifted | Reward art: sticker pack |
| `rewards/trophy.png` | 64x64 | PNG | PixelLab v1, hue/saturation lifted | Reward art: trophy |
| `rewards/tshirt.png` | 64x64 | PNG | PixelLab v1, hue/saturation lifted | Reward art: tshirt |

### Icons: `icons/*.svg` (10×10, hand-authored)

`bolt`, `boots`, `brain`, `brick`, `camera`, `check`, `coin`, `compass`, `cross`, `crown`, `diamond`, `flame`, `gavel`, `gift`, `helix`, `hourglass`, `house`, `lock`, `magnifier`, `map`, `mask`, `mute`, `qr`, `question`, `scroll`, `sound`, `star`, `sticker`, `ticket`, `trophy`, `unlock`, `user`

### Badges: `badges/<icon>.svg` + `-locked.svg` (16×16)

`boots`, `brain`, `brick`, `camera`, `compass`, `crown`, `gavel`, `helix`, `hourglass`, `magnifier`, `mask`, `scroll`, `star`, `ticket`

### CSS-only

Dialog panels (`.px-panel*`), candy buttons (`.px-btn*`), HP-style bars (`.px-bar`), sky + drifting clouds (`.world-bg`, `.stars`), motion (`anim-bob/float/hop/pop-in/shake/wiggle/coin`, `.shine`) in `src/app/globals.css`. Particle bursts in `src/components/burst.tsx`, level-up/achievement/confetti in `src/components/fx.tsx`.

Type: **Fredoka** (display) + **Nunito** (body). No assets are copied from existing games. Emoji are never used as artwork.
