// Builds the programmatic half of the asset pack and optimizes the PixelLab half.
//   pnpm assets
// - public/assets/icons/*.svg        10×10 pixel icons (from src/lib/pixel/icons.ts)
// - public/assets/badges/*.svg       achievement badges (frame + icon), unlocked & locked
// - public/assets/worlds/*.webp      world scenes converted from PixelLab PNGs
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { ICONS, iconRects, iconSvg, type IconName } from "../src/lib/pixel/icons";

const ROOT = path.resolve("public");
const A = path.join(ROOT, "assets");

async function write(file: string, data: string | Buffer) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, data);
}

// Notched pixel frame (16×16) with the icon centred at (3,3).
function badgeSvg(icon: IconName, tone: "gold" | "purple" | "blue" | "locked") {
  const t = {
    gold: ["#b8860b", "#f5c542", "#ffe89a", "#f7ecd2"],
    purple: ["#4a6b2a", "#9bbf3a", "#d8ec7a", "#eef3d6"],
    blue: ["#2e5f74", "#6fb0c9", "#c9e7ef", "#e8f2ef"],
    locked: ["#6b5a45", "#9c8a70", "#c9b896", "#ddd0b4"],
  }[tone];
  const frame = [
    `<rect x="3" y="0" width="10" height="16" fill="#1f140b"/>`,
    `<rect x="0" y="3" width="16" height="10" fill="#1f140b"/>`,
    `<rect x="1" y="1" width="14" height="14" fill="#1f140b"/>`,
    `<rect x="3" y="1" width="10" height="14" fill="${t[0]}"/>`,
    `<rect x="1" y="3" width="14" height="10" fill="${t[0]}"/>`,
    `<rect x="2" y="2" width="12" height="12" fill="${t[0]}"/>`,
    `<rect x="3" y="2" width="10" height="12" fill="${t[3]}"/>`,
    `<rect x="2" y="3" width="12" height="10" fill="${t[3]}"/>`,
    `<rect x="3" y="1" width="10" height="1" fill="${t[2]}"/>`,
    `<rect x="1" y="3" width="1" height="10" fill="${t[1]}"/>`,
  ].join("");
  const rects = iconRects(icon)
    .map((r) => `<rect x="${r.x + 3}" y="${r.y + 3}" width="1" height="1" fill="${tone === "locked" ? "#8c7457" : r.fill}"${tone === "locked" && r.fill === "#1f140b" ? ' fill-opacity="0"' : ""}/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="128" height="128" shape-rendering="crispEdges">${frame}${rects}</svg>`;
}

async function main() {
  for (const name of Object.keys(ICONS) as IconName[]) {
    await write(path.join(A, "icons", `${name}.svg`), iconSvg(name, 40));
  }

  const badgeTones: Record<string, "gold" | "purple" | "blue"> = {
    boots: "blue", scroll: "gold", magnifier: "blue", hourglass: "purple", mask: "purple", gavel: "gold",
    compass: "gold", helix: "blue", brain: "purple", star: "gold", ticket: "purple", crown: "gold", brick: "blue", camera: "blue",
  };
  for (const [icon, tone] of Object.entries(badgeTones)) {
    await write(path.join(A, "badges", `${icon}.svg`), badgeSvg(icon as IconName, tone));
    await write(path.join(A, "badges", `${icon}-locked.svg`), badgeSvg(icon as IconName, "locked"));
  }

  // World scenes → WebP (lossless keeps pixels crisp; files stay small).
  for (const f of await fs.readdir(path.join(A, "worlds"))) {
    if (!f.endsWith(".png")) continue;
    await sharp(path.join(A, "worlds", f)).webp({ lossless: true }).toFile(path.join(A, "worlds", f.replace(".png", ".webp")));
  }

  // PWA icons + brand mark are produced by scripts/gen-logo.ts.
  console.log("assets generated");
}

main();
