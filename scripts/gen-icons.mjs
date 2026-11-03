// Favicons + app icons from the ETHQuest pixel mark (public/assets/brand/ethquest-mark.svg, 32×32 art).
//   node scripts/gen-icons.mjs
// Writes: src/app/favicon.ico (16/32/48), public/icons/icon.svg, icon-32/192/512.png,
//         maskable-512.png (logo inside the 80% safe zone), apple-touch-icon.png (180).
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const MARK = path.resolve("public/assets/brand/ethquest-mark.svg");
const OUT = path.resolve("public/icons");
const svg = await fs.readFile(MARK);

/** The mark at an exact size. Multiples of 32 stay pixel-perfect; small sizes are smoothed so they stay legible. */
async function mark(size) {
  const scale = Math.max(1, Math.ceil(size / 32));
  const big = await sharp(svg, { density: 72 * scale }).resize(32 * scale, 32 * scale, { kernel: "nearest" }).png().toBuffer();
  return size % 32 === 0 ? big : sharp(big).resize(size, size, { kernel: "lanczos3" }).png().toBuffer();
}

/** Mark centred on the treasure-teal tile (full bleed: iOS and Android round the corners themselves). */
async function tile(size, markRatio) {
  const bg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><defs><radialGradient id="g" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="#3f6b6a"/><stop offset="1" stop-color="#1c2625"/></radialGradient></defs><rect width="${size}" height="${size}" fill="url(#g)"/></svg>`,
  );
  const m = Math.round((size * markRatio) / 32) * 32 || Math.round(size * markRatio);
  return sharp(bg).composite([{ input: await mark(m), gravity: "center" }]).png().toBuffer();
}

/** Minimal ICO container holding PNG images (supported by every modern browser). */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const entries = [];
  let offset = 6 + 16 * images.length;
  for (const { size, data } of images) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2);
    e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    entries.push(e);
  }
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

await fs.mkdir(OUT, { recursive: true });
// Favicons keep a transparent background: the medallion has its own dark ring.
const fav = await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await mark(size) })));
// Next.js serves src/app/favicon.ico at /favicon.ico (file convention).
await fs.writeFile(path.resolve("src/app/favicon.ico"), ico(fav));
await fs.writeFile(path.join(OUT, "icon-32.png"), fav[1].data);
await fs.copyFile(MARK, path.join(OUT, "icon.svg"));
await fs.writeFile(path.join(OUT, "apple-touch-icon.png"), await tile(180, 0.72));
await fs.writeFile(path.join(OUT, "icon-192.png"), await tile(192, 0.75));
await fs.writeFile(path.join(OUT, "icon-512.png"), await tile(512, 0.75));
// Maskable: Android may crop to a circle of 80% diameter, so keep the art within ~60%.
await fs.writeFile(path.join(OUT, "maskable-512.png"), await tile(512, 0.56));
console.log("icons written: favicon.ico, icon.svg, icon-32, apple-touch-icon, icon-192, icon-512, maskable-512");
