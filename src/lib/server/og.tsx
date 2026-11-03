import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ReactNode } from "react";
import { ImageResponse } from "next/og";
import { iconSvg, type IconName } from "@/lib/pixel/icons";

// Shared look for share images: dimmed treasure scene, brand strip, @EIPsInsight footer.

const cache = new Map<string, string>();
export async function publicDataUrl(rel: string) {
  const hit = cache.get(rel);
  if (hit) return hit;
  const buf = await readFile(path.join(process.cwd(), "public", rel));
  const url = `data:image/png;base64,${buf.toString("base64")}`;
  cache.set(rel, url);
  return url;
}
export const iconDataUrl = (name: IconName, size = 80) => `data:image/svg+xml;base64,${Buffer.from(iconSvg(name, size)).toString("base64")}`;

export async function shareImage(body: ReactNode, footer = "Play · Collect · Battle on ETHQuest by @EIPsInsight") {
  const [bg, mark] = await Promise.all([publicDataUrl("assets/worlds/title-landscape.png"), publicDataUrl("assets/brand/ethquest-mark-512.png")]);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#24302f", color: "#fff3d6" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={bg} width={1200} height={672} alt="" style={{ position: "absolute", inset: 0, opacity: 0.35, objectFit: "cover", imageRendering: "pixelated" }} />
        <div style={{ display: "flex", flexDirection: "column", width: "100%", padding: 48, position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", fontSize: 24, letterSpacing: 4, color: "#f5c542" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mark} width={56} height={56} alt="" style={{ marginRight: 16, imageRendering: "pixelated" }} />
            ETHQUEST BY EIPSINSIGHT
          </div>
          <div style={{ display: "flex", flex: 1, alignItems: "center" }}>{body}</div>
          <div style={{ display: "flex", fontSize: 24, color: "#d6e3da" }}>{footer}</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
