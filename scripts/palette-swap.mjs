// Builder DNA characters as classic RPG palette swaps of the five main heroes.
// Rotates the hue of saturated "outfit" pixels only; skin, hair-dark, outline and whites are kept.
//   node scripts/palette-swap.mjs
import sharp from "sharp";
import path from "node:path";

const DIR = path.resolve("public/assets/characters");
const SWAPS = {
  "dna-protocol-architect": { base: "researcher", hue: 200 },
  "dna-gas-optimizer": { base: "protocol-engineer", hue: 330 },
  "dna-consensus-enjoyer": { base: "governance-wizard", hue: 60 },
  "dna-rabbit-hole-explorer": { base: "explorer", hue: 120 },
  "dna-client-diversity-defender": { base: "builder", hue: 140 },
  "dna-scaling-enthusiast": { base: "explorer", hue: 210 },
  "dna-devex-wizard": { base: "governance-wizard", hue: 150 },
};

function rgb2hsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, max ? d / max : 0, max];
}
function hsv2rgb(h, s, v) {
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [r + m, g + m, b + m].map((u) => Math.round(u * 255));
}
const isSkin = (h, s, v) => h >= 8 && h <= 42 && s >= 0.12 && s <= 0.62 && v >= 0.55;

for (const [name, { base, hue }] of Object.entries(SWAPS)) {
  const { data, info } = await sharp(path.join(DIR, `${base}.png`)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 10) continue;
    const [h, s, v] = rgb2hsv(data[i], data[i + 1], data[i + 2]);
    if (s < 0.28 || v < 0.22 || isSkin(h, s, v)) continue;
    const [r, g, b] = hsv2rgb((h + hue) % 360, Math.min(1, s * 1.05), v);
    data[i] = r; data[i + 1] = g; data[i + 2] = b;
  }
  await sharp(data, { raw: info }).png().toFile(path.join(DIR, `${name}.png`));
  console.log("swapped", name, "←", base);
}
