// Procedural card emblems, shared by the on-screen cards and the share images (no React, no DOM).

export const CATEGORY_COLORS: Record<string, [string, string, string]> = {
  Core: ["#c0392b", "#7a2318", "#f08a6e"],
  ERC: ["#d9a020", "#8a5a00", "#ffe89a"],
  Networking: ["#3f7f8c", "#24504c", "#9cd4cc"],
  Interface: ["#6b4a8a", "#3d2a52", "#c9b2e6"],
};
export const DEFAULT_COLORS: [string, string, string] = ["#5c7a1e", "#2f4a1c", "#c3c63a"];

function rng(seed: number) {
  let a = seed * 2654435761 >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mirrored 9×9 emblem for a proposal number, coloured by category. Deterministic. */
export function emblemPixels(number: number, category: string | null) {
  const [main, dark, light] = CATEGORY_COLORS[category ?? ""] ?? DEFAULT_COLORS;
  const r = rng(number + 7);
  const N = 9, half = 5;
  const cells: { x: number; y: number; c: string }[] = [];
  for (let y = 1; y < N - 1; y++) {
    for (let x = 1; x < half; x++) {
      const v = r();
      if (v < 0.52) {
        const c = v < 0.12 ? light : v < 0.4 ? main : dark;
        cells.push({ x, y, c }, { x: N - 1 - x, y, c });
      }
    }
    // spine
    if (r() < 0.6) cells.push({ x: half - 1, y, c: r() < 0.5 ? main : light });
  }
  // The centre column is both mirrored onto itself and drawn as the spine: keep one pixel per position.
  const pixels = [...new Map(cells.map((c) => [`${c.x},${c.y}`, c])).values()];
  const on = new Set(pixels.map((c) => `${c.x},${c.y}`));
  const outline: { x: number; y: number }[] = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (on.has(`${x},${y}`)) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => on.has(`${x + dx},${y + dy}`))) outline.push({ x, y });
  }
  return { N, pixels, outline, colors: { main, dark, light } };
}

/** Same emblem as an SVG data URI, for share images. */
export function emblemDataUri(number: number, category: string | null) {
  const { N, pixels, outline } = emblemPixels(number, category);
  const rects = [...outline.map((p) => `<rect x="${p.x}" y="${p.y}" width="1" height="1" fill="#1f140b"/>`), ...pixels.map((p) => `<rect x="${p.x}" y="${p.y}" width="1" height="1" fill="${p.c}"/>`)].join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${N} ${N}" width="${N * 20}" height="${N * 20}" shape-rendering="crispEdges">${rects}</svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
