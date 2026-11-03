// Palette-swaps the v1 (dark purple) PixelLab scenes into bright per-world palettes using a
// multi-stop gradient map on luminance, then a slight saturation lift. Keeps pixels crisp.
//   node scripts/recolor-scenes.mjs <srcDir> <outDir>
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";

const [src, out] = process.argv.slice(2);
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const RAMPS = {
  "world-arcade": ["#1d2b53", "#c81e3a", "#ff4d5e", "#ff9f1c", "#ffd23f", "#fff6c9"],
  "world-upgrade-lab": ["#1d2b53", "#2459d6", "#48c6ff", "#3ddc84", "#d6fff0", "#ffffff"],
  "world-eip-explorer": ["#1d2b53", "#17a35a", "#3ddc84", "#ffd23f", "#fff1d6", "#ffffff"],
  "world-pathfinder": ["#1d2b53", "#2459d6", "#4c8dff", "#3ddc84", "#ffd23f", "#e9fbff"],
  "world-protocol-hq": ["#1d2b53", "#d63d8a", "#ff6fb5", "#9b6bff", "#ffd23f", "#fff0f8"],
  "title-landscape": ["#1d2b53", "#2459d6", "#48c6ff", "#8fdcff", "#ffd23f", "#ffffff"],
  "room-reward-shop": ["#1d2b53", "#d26a00", "#ff9f1c", "#ffd23f", "#fff1d6", "#ffffff"],
  "room-achievement-hall": ["#1d2b53", "#e0a400", "#ffd23f", "#ff6fb5", "#fff6c9", "#ffffff"],
};

function mapLum(l, ramp) {
  const t = Math.min(1, Math.max(0, l)) * (ramp.length - 1);
  const i = Math.min(ramp.length - 2, Math.floor(t));
  const f = t - i;
  const a = hex(ramp[i]), b = hex(ramp[i + 1]);
  return a.map((v, k) => Math.round(v + (b[k] - v) * f));
}

await fs.mkdir(out, { recursive: true });
for (const [name, ramp] of Object.entries(RAMPS)) {
  const file = path.join(src, `${name}.png`);
  // Drop letterbox rows baked into some generations, then restore 320×180.
  const trimmed = await sharp(file).trim({ threshold: 18 }).toBuffer();
  const { data, info } = await sharp(trimmed).resize(320, 180, { fit: "cover", kernel: "nearest" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  // Normalize luminance range per image so dark scenes use the whole ramp.
  let lo = 1, hi = 0;
  const lum = new Float32Array(info.width * info.height);
  for (let p = 0; p < lum.length; p++) {
    const [r, g, b] = [data[p * 4], data[p * 4 + 1], data[p * 4 + 2]];
    lum[p] = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    lo = Math.min(lo, lum[p]); hi = Math.max(hi, lum[p]);
  }
  for (let p = 0; p < lum.length; p++) {
    const l = Math.pow((lum[p] - lo) / (hi - lo || 1), 0.7); // gamma lift = brighter mids
    const [r, g, b] = mapLum(l, ramp);
    data[p * 4] = r; data[p * 4 + 1] = g; data[p * 4 + 2] = b;
  }
  await sharp(data, { raw: info }).png().toFile(path.join(out, `${name}.png`));
  console.log("recolored", name);
}
