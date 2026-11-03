// v3 "treasure hunt" art pack: animated guide characters (PixelLab characters + template animations),
// scenes and treasure/reward props, all sharing one earthy adventure palette.
// Progress is kept in scripts/.pixellab-state.json so re-runs never pay twice for the same asset.
//
//   node --env-file=.env scripts/pixellab-treasure.mjs [filter]
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const KEY = process.env.PIXELLAB_API_KEY;
if (!KEY) throw new Error("PIXELLAB_API_KEY missing");
const API = "https://api.pixellab.ai/v2";
const OUT = path.resolve("public/assets");
const STATE_FILE = path.resolve("scripts/.pixellab-state.json");
const filter = process.argv[2] ?? "";

// Treasure-hunt palette: slate/teal sky, moss and leaf greens, parchment, wood, gold, accents, skin tones.
export const PALETTE = [
  "#14181c", "#24302f", "#2f4a48", "#3f6b6a", "#5f9a94", "#a8d0c8",
  "#2f4a1c", "#4a6b2a", "#7a9a2e", "#c3c63a",
  "#fff3d6", "#ead9b4", "#cdb48c", "#9c7f58",
  "#6b4325", "#3e2614", "#f5c542", "#b8860b",
  "#c0392b", "#e67e22", "#3b6ea5", "#6b4a8a", "#7d8a8c",
  "#f2c9a0", "#d49a6a", "#8d5524",
];

const STYLE = "16-bit fantasy adventure pixel art, treasure hunt, earthy mossy greens, warm parchment and gold accents, crisp pixels, dark outline";
const CHAR = "chibi adventure RPG character, full body, facing the viewer, friendly face";

// Guides get an idle loop; the hero also walks and celebrates.
const characters = {
  explorer: { d: "young treasure hunter with a brown leather explorer hat, green scarf, tan vest over a cream shirt, brown boots, rolled treasure map tucked in belt", anims: ["breathing-idle", "walking", "two-footed-jump"] },
  "protocol-engineer": { d: "stocky tinkerer engineer with brass goggles on the forehead, orange beard, leather apron with tools, holding a big brass wrench", anims: ["breathing-idle"] },
  researcher: { d: "scholar archivist with round glasses, long blue robe, carrying a glowing lantern and a scroll", anims: ["breathing-idle"] },
  builder: { d: "pirate coder with a red bandana, striped navy shirt, gold earring, holding a small glowing laptop", anims: ["breathing-idle"] },
  "governance-wizard": { d: "old sage wizard with long white beard, deep purple robe with gold trim, tall pointed hat, holding a wooden staff topped with a green crystal", anims: ["breathing-idle"] },
  designer: { d: "cartographer artist with a red beret, mustard tunic, holding a quill and a sketch map", anims: [] },
  student: { d: "young apprentice adventurer with a teal hood, small satchel, holding an open notebook", anims: [] },
  "community-builder": { d: "cheerful ship captain host in a long red coat and tricorn hat, waving one hand", anims: [] },
};

const scenes = {
  "title-landscape": "floating mossy cliff island over a calm teal lake, old wooden bridge, twisted trees, distant mountains, soft clouds, golden treasure glint",
  "world-arcade": "pirate harbor tavern with wooden game tables, barrels, lanterns, ships in the bay, warm evening light",
  "world-upgrade-lab": "ancient overgrown clockwork workshop ruin with giant brass gears, moss, glowing runes, waterfall",
  "world-eip-explorer": "ancient forest library ruin with stone shelves full of scrolls, vines, sunbeams through the canopy",
  "world-pathfinder": "forest crossroads with a wooden signpost pointing four ways, mossy path, lake and cliffs in the distance",
  "world-protocol-hq": "stone castle council hall on a cliff, round table with a treasure map, banners, view over the sea",
};

const props = {
  "chest-closed": "closed wooden treasure chest with gold bands and a gold lock",
  "chest-open": "open wooden treasure chest overflowing with gold coins and gems, glowing",
  map: "rolled-open old treasure map parchment with a red X and dotted path",
  coin: "single shiny gold coin with a diamond emblem, front view",
  key: "ornate golden key",
  "sticker-pack": "stack of colorful vinyl stickers with a bar chart logo",
  "jute-bag": "natural jute tote bag with a printed green logo",
  tshirt: "dark green t-shirt with a gold bar chart logo on the chest",
  hoodie: "premium black hoodie with a gold crown and bar chart logo, legendary item glow",
  crown: "golden champion crown with green gems",
};

async function readState() {
  try { return JSON.parse(await fs.readFile(STATE_FILE, "utf8")); } catch { return {}; }
}
let state = await readState();
// Merge on save so parallel runs (e.g. characters + scenes) never drop each other's ids.
const save = async () => {
  const disk = await readState();
  for (const [k, v] of Object.entries(state)) disk[k] = typeof v === "object" && v ? { ...(disk[k] ?? {}), ...v } : v;
  state = disk;
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2));
};

async function api(method, url, body) {
  for (let attempt = 1; attempt <= 240; attempt++) {
    const res = await fetch(`${API}${url}`, {
      method,
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(180_000),
    }).catch((e) => ({ ok: false, status: 0, text: async () => String(e) }));
    if (res.ok) return res.json();
    const text = (await res.text()).slice(0, 200);
    if (res.status === 429 || res.status === 0 || res.status >= 500) {
      console.error("retry", url, res.status, text);
      await new Promise((r) => setTimeout(r, 15_000));
      continue;
    }
    throw new Error(`${method} ${url} ${res.status} ${text}`);
  }
  throw new Error(`gave up on ${url}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function paletteImage() {
  const w = PALETTE.length;
  const buf = Buffer.alloc(w * 3);
  PALETTE.forEach((hex, i) => {
    const n = parseInt(hex.slice(1), 16);
    buf[i * 3] = n >> 16; buf[i * 3 + 1] = (n >> 8) & 255; buf[i * 3 + 2] = n & 255;
  });
  const png = await sharp(buf, { raw: { width: w, height: 1, channels: 3 } }).png().toBuffer();
  return { type: "base64", base64: png.toString("base64") };
}
const colorImage = await paletteImage();

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${url} ${res.status}`);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, Buffer.from(await res.arrayBuffer()));
}

async function pixflux(file, description, w, h, nobg) {
  const dest = path.join(OUT, file);
  if (state[file]) return console.log("skip", file);
  const json = await api("POST", "/create-image-pixflux", {
    description, image_size: { width: w, height: h }, no_background: nobg,
    outline: "single color black outline", shading: "medium shading", detail: "highly detailed",
    color_image: colorImage, ...(nobg ? { view: "side" } : {}),
  });
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, Buffer.from(json.image.base64.replace(/^data:image\/\w+;base64,/, ""), "base64"));
  state[file] = { done: true };
  await save();
  console.log("ok", file);
}

async function waitCharacter(id) {
  for (;;) {
    const c = await api("GET", `/characters/${id}`);
    if (c.rotation_urls?.south && c.status !== "processing") return c;
    if (c.status === "failed") throw new Error(`character ${id} failed`);
    await sleep(10_000);
  }
}

async function waitJob(jobId) {
  for (;;) {
    const j = await api("GET", `/background-jobs/${jobId}`);
    if (j.status === "completed") return j;
    if (j.status === "failed") throw new Error(`job ${jobId} failed: ${JSON.stringify(j.last_response).slice(0, 200)}`);
    await sleep(10_000);
  }
}

async function character(name, { d, anims }) {
  // STILL=1: one pixflux image instead of a rig (the trial caps full characters). Same prompt and palette,
  // trimmed tight like the packed sprite sheets so all characters share a scale.
  if (process.env.STILL) {
    const file = `characters/${name}.png`;
    if (state[`still:${name}`]) return console.log("skip", file);
    const json = await api("POST", "/create-image-pixflux", {
      description: `${CHAR}, ${d}, ${STYLE}`, image_size: { width: 64, height: 64 }, no_background: true,
      outline: "single color black outline", shading: "medium shading", detail: "highly detailed",
      color_image: colorImage, view: "low top-down", direction: "south",
    });
    const raw = Buffer.from(json.image.base64.replace(/^data:image\/\w+;base64,/, ""), "base64");
    const trimmed = await sharp(raw).trim({ threshold: 1 }).toBuffer({ resolveWithObject: true });
    const side = Math.max(trimmed.info.width, trimmed.info.height) + 2;
    await sharp(trimmed.data)
      .extend({ left: Math.floor((side - trimmed.info.width) / 2), right: Math.ceil((side - trimmed.info.width) / 2), top: side - trimmed.info.height - 1, bottom: 1, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png().toFile(path.join(OUT, file));
    state[`still:${name}`] = { done: true };
    await save();
    return console.log("ok still", name);
  }
  const s = (state[`char:${name}`] ??= {});
  if (!s.id) {
    const res = await api("POST", "/create-character-with-4-directions", {
      description: `${CHAR}, ${d}, ${STYLE}`,
      image_size: { width: 64, height: 64 },
      view: "low top-down", outline: "single color black outline", shading: "medium shading", detail: "high detail",
      color_image: colorImage, proportions: { type: "preset", name: "chibi" },
    });
    s.id = res.character_id;
    await save();
    console.log("queued character", name, s.id);
  }
  const c = await waitCharacter(s.id);
  await download(c.rotation_urls.south, path.join(OUT, `characters/${name}.png`));
  console.log("ok character", name);
  for (const anim of anims) {
    s.anims ??= {};
    if (s.anims[anim]?.saved) continue;
    if (!s.anims[anim]?.jobs) {
      const res = await api("POST", "/animate-character", {
        character_id: s.id, mode: "template", template_animation_id: anim, directions: ["south"], animation_name: anim,
      });
      s.anims[anim] = { jobs: res.background_job_ids };
      await save();
      console.log("queued anim", name, anim);
    }
    for (const j of s.anims[anim].jobs) await waitJob(j);
    s.anims[anim].saved = true;
    await save();
    console.log("ok anim", name, anim);
  }
}

const tasks = [
  ...Object.entries(characters).map(([k, v]) => ({ key: `characters/${k}`, run: () => character(k, v) })),
  ...Object.entries(scenes).map(([k, d]) => ({ key: `worlds/${k}`, run: () => pixflux(`worlds/${k}.png`, `${d}, ${STYLE}, side-scrolling game background, wide landscape`, 400, 224, false) })),
  ...Object.entries(props).map(([k, d]) => ({ key: `treasure/${k}`, run: () => pixflux(`treasure/${k}.png`, `${d}, game item icon, ${STYLE}`, 64, 64, true) })),
].filter((t) => t.key.includes(filter));

// Two lanes: PixelLab queues extra jobs server-side; the retry loop absorbs any 429s.
const queue = [...tasks];
await Promise.all(Array.from({ length: Number(process.env.LANES ?? 2) }, async () => {
  while (queue.length) {
    const t = queue.shift();
    try { await t.run(); } catch (e) { console.error("FAILED", t.key, e.message); }
  }
}));
console.log("done", JSON.stringify(await api("GET", "/balance")));
