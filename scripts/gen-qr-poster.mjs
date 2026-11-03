// Booth QR poster: the PixelLab treasure scene scaled 5× (2000×1120), a parchment frame on the calm
// right side for the QR, the ETHQuest mark, and pixel-font lettering drawn here (5×7 bitmap font).
//   node scripts/gen-qr-poster.mjs                      → poster with an empty QR slot (drop your QR in)
//   node scripts/gen-qr-poster.mjs https://your.site/play → poster with that QR baked in
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import QRCode from "qrcode";

const S = 5; // one art pixel = 5 output pixels
const BG = path.resolve("public/assets/booth/poster-bg-a.png");
const OUT = path.resolve("public/assets/booth");
const url = process.argv[2];

// ---------- 5×7 pixel font ----------
const FONT = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  0: ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  1: ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  2: ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  3: ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  4: ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  5: ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  6: ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  7: ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  8: ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  9: ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  "·": ["00000", "00000", "00000", "01100", "01100", "00000", "00000"],
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  "–": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  "@": ["01110", "10001", "10111", "10101", "10111", "10000", "01111"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  " ": ["000", "000", "000", "000", "000", "000", "000"],
};

/** Renders a line of pixel text with a 1px dark outline + drop shadow. `px` = output pixels per font pixel. */
function textSvg(str, px, fill, outline = "#1f140b") {
  const glyphs = [...str.toUpperCase()].map((c) => FONT[c] ?? FONT[" "]);
  const widths = glyphs.map((g) => g[0].length);
  const cols = widths.reduce((a, w) => a + w + 1, 0) - 1;
  const W = (cols + 2) * px, H = (7 + 3) * px;
  const on = new Set();
  let x0 = 0;
  glyphs.forEach((g, gi) => {
    g.forEach((row, y) => [...row].forEach((b, x) => b === "1" && on.add(`${x0 + x},${y}`)));
    x0 += widths[gi] + 1;
  });
  const rects = [];
  const r = (x, y, c) => rects.push(`<rect x="${(x + 1) * px}" y="${(y + 1) * px}" width="${px}" height="${px}" fill="${c}"/>`);
  // shadow, then outline, then fill
  for (const k of on) { const [x, y] = k.split(",").map(Number); r(x, y + 1, outline); }
  for (const k of on) {
    const [x, y] = k.split(",").map(Number);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!on.has(`${x + dx},${y + dy}`)) r(x + dx, y + dy, outline);
  }
  for (const k of on) { const [x, y] = k.split(",").map(Number); r(x, y, fill); }
  return { svg: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" shape-rendering="crispEdges">${rects.join("")}</svg>`), width: W, height: H };
}

/** Parchment frame from the app's 9-slice (18×18 source, 6px slices), scaled S×, stretched to w×h. */
async function parchment(w, h) {
  const src = await sharp(path.resolve("public/assets/ui/panel-parchment.png")).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const sw = src.info.width, sl = 6;
  const cw = Math.round(w / S), ch = Math.round(h / S); // build at art scale, then upscale
  const out = Buffer.alloc(cw * ch * 4);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const sx = x < sl ? x : x >= cw - sl ? sw - (cw - x) : sl + ((x - sl) % (sw - 2 * sl));
    const sy = y < sl ? y : y >= ch - sl ? sw - (ch - y) : sl + ((y - sl) % (sw - 2 * sl));
    src.data.copy(out, (y * cw + x) * 4, (sy * sw + sx) * 4, (sy * sw + sx) * 4 + 4);
  }
  return sharp(out, { raw: { width: cw, height: ch, channels: 4 } }).resize(cw * S, ch * S, { kernel: "nearest" }).png().toBuffer();
}

// PixelLab sometimes letterboxes scenes: trim near-black bands off the top and bottom first.
async function trimBands(file) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const dark = (y) => {
    let sum = 0;
    for (let x = 0; x < info.width; x++) { const i = (y * info.width + x) * 3; sum += data[i] + data[i + 1] + data[i + 2]; }
    return sum / (info.width * 3) < 40;
  };
  let top = 0, bottom = info.height - 1;
  while (top < info.height / 4 && dark(top)) top++;
  while (bottom > (info.height * 3) / 4 && dark(bottom)) bottom--;
  return sharp(file).extract({ left: 0, top, width: info.width, height: bottom - top + 1 }).png().toBuffer({ resolveWithObject: true });
}
const trimmed = await trimBands(BG);
const W = trimmed.info.width * S, H = trimmed.info.height * S;
const bg = await sharp(trimmed.data).resize(W, H, { kernel: "nearest" }).toBuffer();

// QR card on the calm right side.
const cardW = 640, cardH = Math.min(860, H - 120), cardX = W - cardW - 150, cardY = Math.round((H - cardH) / 2);
const qrSize = Math.min(470, cardH - 330), qrX = cardX + Math.round((cardW - qrSize) / 2), qrY = cardY + 165;
const layers = [{ input: await parchment(cardW, cardH), left: cardX, top: cardY }];

const head = textSvg("SCAN TO PLAY!", 6, "#9a2a1b", "#f7ecd2");
layers.push({ input: head.svg, left: cardX + Math.round((cardW - head.width) / 2), top: cardY + 70 });

// QR slot: cream square with a dashed pixel border; filled with a real QR when a URL is given.
const slot = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${qrSize}" height="${qrSize}" shape-rendering="crispEdges">
  <rect width="${qrSize}" height="${qrSize}" fill="#fff8e8"/>
  ${url ? "" : Array.from({ length: Math.floor(qrSize / 20) }, (_, i) => `<rect x="${i * 20}" y="0" width="10" height="5" fill="#a88a5e"/><rect x="${i * 20}" y="${qrSize - 5}" width="10" height="5" fill="#a88a5e"/><rect x="0" y="${i * 20}" width="5" height="10" fill="#a88a5e"/><rect x="${qrSize - 5}" y="${i * 20}" width="5" height="10" fill="#a88a5e"/>`).join("")}
</svg>`);
layers.push({ input: slot, left: qrX, top: qrY });
if (url) {
  const qr = await QRCode.toBuffer(url, { type: "png", margin: 1, width: qrSize - 30, errorCorrectionLevel: "M", color: { dark: "#2a1d12", light: "#fff8e8" } });
  layers.push({ input: qr, left: qrX + 15, top: qrY + 15 });
} else {
  const ph = textSvg("QR HERE", 6, "#cdb48c", "#fff8e8");
  layers.push({ input: ph.svg, left: qrX + Math.round((qrSize - ph.width) / 2), top: qrY + Math.round((qrSize - ph.height) / 2) });
}
for (const [i, line] of ["COLLECT EIP CARDS", "BATTLE YOUR FRIENDS"].entries()) {
  const t = textSvg(line, 4, i ? "#9a5a00" : "#2a1d12", "#f7ecd2");
  layers.push({ input: t.svg, left: cardX + Math.round((cardW - t.width) / 2), top: qrY + qrSize + 30 + i * 48 });
}

// Brand lockup top-left, over the sky.
const mark = await sharp(path.resolve("public/assets/brand/ethquest-mark.svg"), { density: 72 * 6 }).resize(32 * 6, 32 * 6, { kernel: "nearest" }).png().toBuffer();
layers.push({ input: mark, left: 70, top: 60 });
const title = textSvg("ETHQUEST", 10, "#f5c542");
layers.push({ input: title.svg, left: 70 + 32 * 6 + 30, top: 75 });
const by = textSvg("BY EIPSINSIGHT", 5, "#fff3d6");
layers.push({ input: by.svg, left: 70 + 32 * 6 + 40, top: 75 + title.height + 4 });
const foot = textSvg("PLAY · COLLECT · BATTLE · @EIPSINSIGHT", 4, "#fff3d6");
layers.push({ input: foot.svg, left: 70, top: H - foot.height - 50 });

const name = url ? "qr-poster.png" : "qr-poster-blank.png";
await sharp(bg).composite(layers).png().toFile(path.join(OUT, name));
console.log("wrote", path.join("public/assets/booth", name), `${W}×${H}`);
