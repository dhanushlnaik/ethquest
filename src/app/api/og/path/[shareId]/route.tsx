import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/server/db";
import { ROLES, STAGE_LABEL, type BuiltPathway } from "@/lib/games/content";

// Treasure-hunt palette: title accents read on the dark teal scene.
const COLORS: Record<string, string> = { purple: "#d6c2f0", blue: "#b9e2f0", green: "#cde27a", gold: "#f5c542" };

async function dataUrl(rel: string) {
  const buf = await readFile(path.join(process.cwd(), "public", rel));
  return `data:image/png;base64,${buf.toString("base64")}`;
}

/** Shareable pathway card as a 1200×630 PNG. */
export async function GET(_req: Request, ctx: RouteContext<"/api/og/path/[shareId]">) {
  const { shareId } = await ctx.params;
  const row = await db.playerPathway.findUnique({ where: { shareId } });
  if (!row) return new Response("Not found", { status: 404 });
  const p = row.snapshot as unknown as BuiltPathway & { nickname?: string };
  const sprite = ROLES.find((r) => r.label === p.role)?.sprite ?? "explorer";
  const [spriteUrl, bgUrl, markUrl] = await Promise.all([
    dataUrl(`assets/characters/${sprite}.png`),
    dataUrl("assets/worlds/world-pathfinder.png"),
    dataUrl("assets/brand/ethquest-mark-512.png"),
  ]);
  const accent = COLORS[p.color] ?? "#f5c542";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#24302f", color: "#fff3d6", position: "relative" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={bgUrl} width={1200} height={675} style={{ position: "absolute", inset: 0, opacity: 0.4, imageRendering: "pixelated" }} alt="" />
        <div style={{ display: "flex", flexDirection: "column", padding: 56, width: "100%", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", fontSize: 22, color: "#f5c542", letterSpacing: 4 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={markUrl} width={56} height={56} style={{ imageRendering: "pixelated", marginRight: 16 }} alt="" />
            ETHQUEST BY EIPSINSIGHT · DEVCON 8
          </div>
          <div style={{ display: "flex", alignItems: "center", marginTop: 24 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={spriteUrl} width={192} height={192} style={{ imageRendering: "pixelated" }} alt="" />
            <div style={{ display: "flex", flexDirection: "column", marginLeft: 28 }}>
              <div style={{ fontSize: 26, color: "#f5c542" }}>{`PATHWAY ${p.code} · ${p.role.toUpperCase()}`}</div>
              <div style={{ fontSize: 64, fontWeight: 700, color: accent, lineHeight: 1.05 }}>{p.title}</div>
              <div style={{ fontSize: 28, color: "#d6e3da", marginTop: 6 }}>{`${p.interest} · ${p.goal}`}</div>
            </div>
          </div>
          <div style={{ display: "flex", marginTop: 36, gap: 14 }}>
            {p.steps.map((s, i) => (
              <div key={s.stage} style={{ display: "flex", flexDirection: "column", flex: 1, background: "#ead9b4", color: "#2a1d12", border: "4px solid #5c4127", boxShadow: "0 6px 0 rgba(20,14,8,0.6)", padding: 16 }}>
                <div style={{ fontSize: 18, color: "#9a5a00" }}>{`${i + 1}. ${STAGE_LABEL[s.stage as keyof typeof STAGE_LABEL] ?? s.stage}`}</div>
                <div style={{ fontSize: 22, marginTop: 6, lineHeight: 1.2 }}>{s.title}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", marginTop: "auto", fontSize: 24, color: "#d6e3da" }}>
            {`Find your own path → eipsinsight.com · ${p.nickname ?? ""}`}
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: { "Cache-Control": "public, max-age=86400, immutable" } },
  );
}
