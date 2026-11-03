// Generates the AI-drawn part of the ETHQuest asset pack via the PixelLab v2 API.
// Every request shares one forced palette (see PALETTE) so sprites, scenes and props match.
// Existing files are skipped, so re-running only spends generations on missing assets.
//
//   node --env-file=.env scripts/pixellab-generate.mjs [filter]
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const KEY = process.env.PIXELLAB_API_KEY;
if (!KEY) throw new Error("PIXELLAB_API_KEY missing");
const OUT = path.resolve("public/assets");
const filter = process.argv[2] ?? "";
const FORCE = process.argv.includes("--force");

// ETHQuest palette: design tokens + skin/hair tones for characters.
// v2 "sunny arcade" palette: ink outline, candy primaries, skin/hair tones, sky + grass.
export const PALETTE = [
  "#1d2b53", "#4b5a80", "#8794b4", "#ffffff", "#fff1d6",
  "#ff4d5e", "#c81e3a", "#ff9f1c", "#ffd23f", "#e0a400",
  "#3ddc84", "#17a35a", "#48c6ff", "#4c8dff", "#2459d6",
  "#9b6bff", "#ff6fb5", "#22d3b6", "#8fdcff",
  "#ffd9b8", "#f1b48a", "#c68642", "#8d5524", "#5c3a21", "#2a2a3a",
];

const STYLE =
  "bright cheerful 16-bit handheld RPG pixel art, sunny daytime, vibrant saturated candy colors, clean dark navy outline, crisp pixels";
const CHAR =
  "cute chibi RPG hero sprite, full body, front view facing the viewer, standing pose, big friendly eyes, happy smile, clean readable silhouette, consistent proportions";

const characters = {
  explorer: "young adventurer with a red cap, yellow jacket, blue shorts, sneakers, small backpack, holding a golden compass",
  "protocol-engineer": "engineer in an orange jumpsuit and yellow hard hat with goggles, holding a big blue wrench",
  researcher: "researcher with round glasses, white lab coat over a green sweater, brown hair, holding an open red book",
  builder: "coder in a bright blue hoodie with orange headphones, holding a laptop with a sticker",
  "governance-wizard": "friendly wizard in a teal robe with yellow stars, pink pointed hat, white beard, holding a wooden staff topped with a yellow crystal",
  designer: "artist with a red beret, striped yellow shirt and green overalls, holding a big paintbrush and a color palette",
  student: "student with a sky-blue school uniform, red backpack and a yellow beanie, holding a notebook",
  "community-builder": "friendly host in a pink jacket and orange scarf, waving one hand and holding a megaphone",
  "dna-protocol-architect": "architect in a blue cloak holding a glowing blueprint scroll",
  "dna-gas-optimizer": "speedy mechanic with a gold fuel gauge on the chest and a racing helmet",
  "dna-consensus-enjoyer": "knight in purple armor holding a shield with a glowing diamond emblem",
  "dna-rabbit-hole-explorer": "explorer with bunny-ear hood holding a lantern and a scroll",
  "dna-client-diversity-defender": "guardian holding a round shield split into many colors, sturdy stance",
  "dna-scaling-enthusiast": "jetpack pilot with blue flight suit and goggles",
  "dna-devex-wizard": "wizard in a hoodie robe holding a glowing terminal window as a spellbook",
};

const scenes = {
  "world-arcade": "neon retro arcade hall interior at night, rows of glowing arcade cabinets, purple and blue lights, checkered floor",
  "world-upgrade-lab": "futuristic protocol laboratory, glowing machines, a large timeline screen with milestones, test tubes with blue liquid",
  "world-eip-explorer": "huge magical library of glowing scrolls and floating documents, tall shelves, blue light beams, purple carpet",
  "world-pathfinder": "crossroads in a glowing night landscape with four paths leading to distant lights, wooden signpost in the middle, starry sky",
  "world-protocol-hq": "grand governance headquarters hall, round council table, big screens showing charts, purple banners with diamond emblem",
  "title-landscape": "wide night landscape with a giant glowing octahedron diamond crystal floating above pixel mountains and a futuristic city, stars, aurora in purple and blue",
  "room-reward-shop": "cozy pixel shop counter with shelves of stickers, t-shirts, trophies and treasure chests, warm gold lights, night",
  "room-achievement-hall": "hall of fame room with trophy pedestals, glowing medals on walls, gold and purple lights",
};

const objects = {
  "arcade-machine": "retro arcade cabinet with glowing purple screen and blue joystick",
  trophy: "golden trophy cup with a glowing purple diamond gem",
  "loot-box": "treasure chest glowing with purple light, gold trim, slightly open",
  "sticker-pack": "stack of holographic stickers with diamond logo",
  tshirt: "black t-shirt with a glowing purple diamond logo on the chest",
  "nft-card": "holographic collectible card with a glowing diamond, rainbow sheen",
  medal: "gold medal with purple ribbon and diamond engraving",
  pin: "enamel pin badge shaped like a purple diamond with gold edge",
};

const jobs = [
  ...Object.entries(characters).map(([k, d]) => ({
    file: `characters/${k}.png`, w: 64, h: 64, nobg: true,
    description: `${CHAR}, ${d}, ${STYLE}`, view: "low top-down",
  })),
  ...Object.entries(scenes).map(([k, d]) => ({
    file: `worlds/${k}.png`, w: 320, h: 180, nobg: false,
    description: `${d}, ${STYLE}, detailed environment, game background`,
  })),
  ...Object.entries(objects).map(([k, d]) => ({
    file: `rewards/${k}.png`, w: 64, h: 64, nobg: true,
    description: `${d}, game item icon, ${STYLE}`,
  })),
].filter((j) => j.file.includes(filter));

async function paletteImage() {
  // 5x5 swatch image; PixelLab only reads its colours.
  const size = 5;
  const buf = Buffer.alloc(size * size * 3);
  PALETTE.forEach((hex, i) => {
    const n = parseInt(hex.slice(1), 16);
    buf[i * 3] = n >> 16; buf[i * 3 + 1] = (n >> 8) & 255; buf[i * 3 + 2] = n & 255;
  });
  const png = await sharp(buf, { raw: { width: size, height: size, channels: 3 } }).png().toBuffer();
  return { type: "base64", base64: png.toString("base64") };
}

async function run(job, colorImage) {
  const dest = path.join(OUT, job.file);
  if (!FORCE) {
    try { await fs.access(dest); console.log("skip", job.file); return; } catch {}
  }
  const body = {
    description: job.description,
    image_size: { width: job.w, height: job.h },
    no_background: job.nobg,
    outline: "single color black outline",
    shading: "medium shading",
    detail: "highly detailed",
    color_image: colorImage,
    ...(job.view ? { view: job.view, direction: "south" } : {}),
  };
  for (let attempt = 1; attempt <= 20; attempt++) {
    const res = await fetch("https://api.pixellab.ai/v2/create-image-pixflux", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error("fail", job.file, res.status, (await res.text()).slice(0, 160));
      // Free plan runs one job at a time: wait for the slot and retry.
      if (res.status === 429 || res.status >= 500) {
        await new Promise((r) => setTimeout(r, 20_000));
        continue;
      }
      return;
    }
    const json = await res.json();
    const b64 = json.image.base64.replace(/^data:image\/\w+;base64,/, "");
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, Buffer.from(b64, "base64"));
    console.log("ok", job.file, JSON.stringify(json.usage ?? {}));
    return;
  }
}

const colorImage = await paletteImage();
const queue = [...jobs];
await Promise.all(
  Array.from({ length: 1 }, async () => {
    while (queue.length) await run(queue.shift(), colorImage);
  }),
);
console.log("done");
