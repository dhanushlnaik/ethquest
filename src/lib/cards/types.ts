// Client-safe card shapes.
export type Rarity = "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY";
export type StatKey = "lore" | "buzz" | "links" | "stage";

export type CardView = {
  number: number;
  repo: "eip" | "erc";
  title: string;
  status: string;
  category: string | null;
  type: string | null;
  year: number | null;
  upgrade: string | null;
  rarity: Rarity;
  lore: number;
  buzz: number;
  links: number;
  stage: number;
  count: number;
  isNew: boolean;
  /** The real proposal changed status in the last 7 days (Living cards). */
  leveledUp: boolean;
};

export const STATS: { key: StatKey; label: string; hint: string }[] = [
  { key: "lore", label: "Lore", hint: "How long it has been around" },
  { key: "buzz", label: "Buzz", hint: "Pull-request activity on GitHub" },
  { key: "links", label: "Links", hint: "Dependencies in and out" },
  { key: "stage", label: "Stage", hint: "How far it got: Final is strongest" },
];

export const RARITY_STYLE: Record<Rarity, { label: string; frame: string; glow: string; text: string }> = {
  COMMON: { label: "Common", frame: "#9c7f58", glow: "transparent", text: "#5b4632" },
  UNCOMMON: { label: "Uncommon", frame: "#4a6b2a", glow: "rgba(155,191,58,0.35)", text: "#3d6116" },
  RARE: { label: "Rare", frame: "#2e5f74", glow: "rgba(111,176,201,0.45)", text: "#24587a" },
  EPIC: { label: "Epic", frame: "#6b4a8a", glow: "rgba(161,132,196,0.55)", text: "#5a3a7e" },
  LEGENDARY: { label: "Legendary", frame: "#b8860b", glow: "rgba(245,197,66,0.7)", text: "#7a4300" },
};

export const cardLabel = (c: Pick<CardView, "repo" | "number">) => `${c.repo === "erc" ? "ERC" : "EIP"}-${c.number}`;
