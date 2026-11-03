// Stopgap: brighten v1 (purple-era) sprites into the sunny palette when PixelLab can't regenerate them.
//   node scripts/brighten-v1.mjs <v1-characters-dir>
import sharp from "sharp";
import path from "node:path";

const [srcDir] = process.argv.slice(2);
const OUT = path.resolve("public/assets/characters");
const JOBS = { "governance-wizard": 190, designer: 130, student: 175, "community-builder": 75 };

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

for (const [name, shift] of Object.entries(JOBS)) {
  const { data, info } = await sharp(path.join(srcDir, `${name}.png`)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 10) continue;
    let [h, s, v] = rgb2hsv(data[i], data[i + 1], data[i + 2]);
    const purple = h >= 230 && h <= 300;
    if (v < 0.18) { [data[i], data[i + 1], data[i + 2]] = [29, 43, 83]; continue; } // outlines → ink
    if (purple && s > 0.15) h = (h + shift) % 360;
    [data[i], data[i + 1], data[i + 2]] = hsv2rgb(h, Math.min(1, s * 1.25), Math.min(1, v * 1.18 + 0.04));
  }
  await sharp(data, { raw: info }).png().toFile(path.join(OUT, `${name}.png`));
  console.log("brightened", name);
}
