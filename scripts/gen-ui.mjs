// Pixel-art 9-slice frames for the treasure-hunt UI: parchment panels (with corner brackets, like an old
// map), chunky pill buttons and a wooden HUD plate. Drawn at 1× and scaled 3× in CSS via border-image.
//   node scripts/gen-ui.mjs
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";

const OUT = path.resolve("public/assets/ui");
await fs.mkdir(OUT, { recursive: true });

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 255];

function canvas(w, h) {
  const px = Array.from({ length: h }, () => Array(w).fill(null));
  return {
    w, h, px,
    set(x, y, c) { if (x >= 0 && y >= 0 && x < w && y < h && c) px[y][x] = c; },
    async save(file) {
      const buf = Buffer.alloc(w * h * 4);
      px.forEach((row, y) => row.forEach((c, x) => { if (c) hex(c).forEach((v, i) => (buf[(y * w + x) * 4 + i] = v)); }));
      await sharp(buf, { raw: { width: w, height: h, channels: 4 } }).png().toFile(path.join(OUT, file));
    },
  };
}

/** True if (x, y) is inside a rectangle whose corners are cut by a `step`-pixel staircase. */
function inside(x, y, w, h, step) {
  const cx = Math.min(x, w - 1 - x);
  const cy = Math.min(y, h - 1 - y);
  return cx + cy >= step;
}

// ---------- Panels: 18×18 source, 6px slices ----------
const PANELS = {
  parchment: { edge: "#5c4127", fill: "#ead9b4", hi: "#f7ecd2", lo: "#d3bd92", line: "#c9ad7f", orn: "#a88a5e" },
  raised: { edge: "#5c4127", fill: "#f4e8cc", hi: "#fffaea", lo: "#e2cfa6", line: "#d8c095", orn: "#b0916a" },
  sunken: { edge: "#8a6d4a", fill: "#dcc79f", hi: "#d3bd92", lo: "#e6d4ae", line: "#cbb286", orn: "#cbb286" },
  gold: { edge: "#6e4600", fill: "#f6e3ab", hi: "#fff6d4", lo: "#e8c978", line: "#d9a93a", orn: "#b8860b" },
  moss: { edge: "#2f4a1c", fill: "#e4e8c4", hi: "#f4f7dd", lo: "#cdd49f", line: "#a9b86a", orn: "#6f8a2e" },
  teal: { edge: "#24403e", fill: "#dcebe3", hi: "#f0f8f3", lo: "#c2d9cd", line: "#9cc0b2", orn: "#4f8580" },
  red: { edge: "#6e1f16", fill: "#f4d9cc", hi: "#fdeee6", lo: "#e5bba8", line: "#d39a85", orn: "#a4402f" },
  violet: { edge: "#3d2a52", fill: "#e6dcef", hi: "#f5effa", lo: "#d2c3e0", line: "#b9a3d0", orn: "#6b4a8a" },
};

for (const [name, c] of Object.entries(PANELS)) {
  const W = 18, H = 18, S = 2;
  const k = canvas(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!inside(x, y, W, H, S)) continue;
    const edge = !inside(x - 1, y, W, H, S) || !inside(x + 1, y, W, H, S) || !inside(x, y - 1, W, H, S) || !inside(x, y + 1, W, H, S) || x === 0 || y === 0 || x === W - 1 || y === H - 1;
    k.set(x, y, edge ? c.edge : c.fill);
  }
  // bevel: light top/left, darker bottom/right (inside the outline)
  for (let i = 2; i < W - 2; i++) { k.set(i, 1, c.hi); k.set(i, H - 2, c.lo); }
  for (let i = 2; i < H - 2; i++) { k.set(1, i, c.hi); k.set(W - 2, i, c.lo); }
  k.set(1, 1, c.hi); k.set(W - 2, H - 2, c.lo);
  // engraved inner line
  for (let i = 4; i < W - 4; i++) { k.set(i, 3, c.line); k.set(i, H - 4, c.line); }
  for (let i = 4; i < H - 4; i++) { k.set(3, i, c.line); k.set(W - 4, i, c.line); }
  // corner brackets (old-map ornaments) + rivet dot
  for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const ox = sx > 0 ? 3 : W - 4, oy = sy > 0 ? 3 : H - 4;
    for (let i = 0; i < 3; i++) { k.set(ox + sx * i, oy, c.orn); k.set(ox, oy + sy * i, c.orn); }
    k.set(ox + sx * 2, oy + sy * 2, c.orn);
  }
  await k.save(`panel-${name}.png`);
}

// ---------- Buttons: 12×14 source, 5px slices (chunky pill with a pressed-edge lip) ----------
const BUTTONS = {
  peach: { edge: "#5a2c12", fill: "#f6b98a", hi: "#fde0c4", lo: "#d98a55", lip: "#a5582a" },
  gold: { edge: "#5a3a00", fill: "#f5c542", hi: "#ffe89a", lo: "#d9a020", lip: "#9a6a00" },
  moss: { edge: "#1f3310", fill: "#7a9a2e", hi: "#b2c95a", lo: "#5c7a1e", lip: "#3a5212" },
  teal: { edge: "#173130", fill: "#4f8c86", hi: "#8cc3bb", lo: "#3b6e69", lip: "#24504c" },
  red: { edge: "#4a120c", fill: "#c0392b", hi: "#e8796b", lo: "#9a2a1f", lip: "#6e1a12" },
  parchment: { edge: "#5c4127", fill: "#ead9b4", hi: "#fbf2dc", lo: "#d3bd92", lip: "#a88a5e" },
};
for (const [name, c] of Object.entries(BUTTONS)) {
  const W = 12, H = 14, S = 2;
  const k = canvas(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!inside(x, y, W, H, S)) continue;
    const edge = !inside(x - 1, y, W, H, S) || !inside(x + 1, y, W, H, S) || !inside(x, y - 1, W, H, S) || !inside(x, y + 1, W, H, S) || x === 0 || y === 0 || x === W - 1 || y === H - 1;
    k.set(x, y, edge ? c.edge : c.fill);
  }
  for (let i = 2; i < W - 2; i++) { k.set(i, 1, c.hi); k.set(i, 2, c.hi); }
  for (let i = 2; i < H - 3; i++) k.set(1, i, c.hi);
  for (let i = 2; i < W - 2; i++) { k.set(i, H - 3, c.lo); k.set(i, H - 2, c.lip); }
  for (let i = 3; i < H - 3; i++) k.set(W - 2, i, c.lo);
  await k.save(`btn-${name}.png`);
}

// ---------- Wooden plate (header bar / HUD): 12×12, 4px slices ----------
{
  const W = 12, H = 12;
  const k = canvas(W, H);
  const wood = ["#7a4b29", "#6b4325", "#83532f"];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!inside(x, y, W, H, 1)) continue;
    const edge = x === 0 || y === 0 || x === W - 1 || y === H - 1 || !inside(x - 1, y, W, H, 1) || !inside(x + 1, y, W, H, 1) || !inside(x, y - 1, W, H, 1) || !inside(x, y + 1, W, H, 1);
    k.set(x, y, edge ? "#2a170a" : wood[(y >> 1) % 3]);
  }
  for (let i = 1; i < W - 1; i++) { k.set(i, 1, "#a0683d"); k.set(i, H - 2, "#4a2c15"); }
  // brass rivets
  for (const [x, y] of [[2, 2], [W - 3, 2], [2, H - 3], [W - 3, H - 3]]) k.set(x, y, "#f5c542");
  await k.save("plate-wood.png");
}

console.log("ui frames written to", OUT);
