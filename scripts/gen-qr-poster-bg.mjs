// Generates landscape backdrops for the booth QR poster (PixelLab pixflux, treasure-hunt palette).
// The open area on the right is left calm on purpose; the QR frame itself is drawn by gen-qr-poster.mjs.
//   node --env-file=.env scripts/gen-qr-poster-bg.mjs
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
// Same treasure-hunt palette as scripts/pixellab-treasure.mjs.
const PALETTE = [
  "#14181c", "#24302f", "#2f4a48", "#3f6b6a", "#5f9a94", "#a8d0c8", "#2f4a1c", "#4a6b2a", "#7a9a2e", "#c3c63a",
  "#fff3d6", "#ead9b4", "#cdb48c", "#9c7f58", "#6b4325", "#3e2614", "#f5c542", "#b8860b", "#c0392b", "#e67e22",
  "#3b6ea5", "#6b4a8a", "#7d8a8c", "#f2c9a0", "#d49a6a", "#8d5524",
];

const KEY = process.env.PIXELLAB_API_KEY;
const OUT = path.resolve("public/assets/booth");
const STYLE = "16-bit fantasy adventure pixel art, treasure hunt, earthy mossy greens, warm parchment and gold accents, crisp pixels";
const VARIANTS = {
  "poster-bg-a": "wide treasure island landscape at golden hour, an open treasure chest glowing with gold on a mossy cliff on the left, calm teal sea and soft clear sky filling the right half, distant mountains, side-scrolling game background",
  "poster-bg-b": "wide forest clearing at dusk with an old wooden pier and a treasure map pinned to a tree on the left, open calm lake and plain sky with soft clouds on the right half, fireflies, side-scrolling game background",
};

const buf = Buffer.alloc(PALETTE.length * 3);
PALETTE.forEach((h, i) => { const n = parseInt(h.slice(1), 16); buf[i * 3] = n >> 16; buf[i * 3 + 1] = (n >> 8) & 255; buf[i * 3 + 2] = n & 255; });
const colorImage = { type: "base64", base64: (await sharp(buf, { raw: { width: PALETTE.length, height: 1, channels: 3 } }).png().toBuffer()).toString("base64") };

for (const [name, d] of Object.entries(VARIANTS)) {
  const file = path.join(OUT, `${name}.png`);
  try { await fs.access(file); console.log("skip", name); continue; } catch {}
  const res = await fetch("https://api.pixellab.ai/v2/create-image-pixflux", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ description: `${d}, ${STYLE}`, image_size: { width: 400, height: 224 }, no_background: false, outline: "single color black outline", shading: "medium shading", detail: "highly detailed", color_image: colorImage }),
  });
  if (!res.ok) { console.error("fail", name, res.status, (await res.text()).slice(0, 200)); continue; }
  const json = await res.json();
  await fs.writeFile(file, Buffer.from(json.image.base64.replace(/^data:image\/\w+;base64,/, ""), "base64"));
  console.log("ok", name);
}
