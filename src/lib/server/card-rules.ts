import type { CardRarity } from "@/generated/prisma/client";

// Card rules shared by the catalog builder (scripts/build-cards.ts) and the daily Living-cards refresh.

export const THIS_YEAR = 2026;
/** Proposals everyone has heard of: always legendary. */
export const ICONIC = [1, 20, 155, 721, 1155, 1559, 3675, 4337, 4844, 7702];
export const STAGE: Record<string, number> = { Living: 95, Final: 90, "Last Call": 75, Review: 60, Draft: 40, Stagnant: 25, Withdrawn: 10 };
export const CATALOG_STATUSES = ["Final", "Last Call", "Review", "Living"];
export const RARITY_RANK: CardRarity[] = ["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"];

export function rarityFor(p: { number: number; status: string; category: string | null }, upgrade?: { headline: boolean }): CardRarity {
  if (ICONIC.includes(p.number) || upgrade?.headline) return "LEGENDARY";
  if (upgrade) return "EPIC";
  if (p.status === "Final" && (p.category === "Core" || p.category === "Networking")) return "RARE";
  if (p.status === "Final" || p.status === "Living") return "UNCOMMON";
  return "COMMON";
}

/** Rarity only ever goes up: a card never loses value because data moved. */
export const maxRarity = (a: CardRarity, b: CardRarity) => (RARITY_RANK.indexOf(a) >= RARITY_RANK.indexOf(b) ? a : b);

export const clampStat = (n: number) => Math.max(1, Math.min(99, Math.round(n)));
export const loreFor = (year: number | null) => clampStat(year ? 8 + (THIS_YEAR - year) * 8.5 : 30);
export const stageFor = (status: string) => STAGE[status] ?? 30;
