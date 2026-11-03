import { db } from "@/lib/server/db";
import { streakOf } from "@/lib/server/daily";
import { iconDataUrl, shareImage } from "@/lib/server/og";

/** Share image for a daily-challenge streak (computed server-side, never from the URL). */
export async function GET(_req: Request, ctx: RouteContext<"/api/og/streak/[playerId]">) {
  const id = (await ctx.params).playerId;
  const player = await db.player.findUnique({ where: { id }, select: { nickname: true } });
  if (!player) return new Response("Not found", { status: 404 });
  const { streak } = await streakOf(id);
  return shareImage(
    <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={iconDataUrl("flame", 260)} width={260} height={260} alt="" style={{ imageRendering: "pixelated" }} />
      <div style={{ display: "flex", flexDirection: "column", marginLeft: 48, flex: 1, maxWidth: 780 }}>
        <div style={{ fontSize: 30, color: "#f5c542" }}>DAILY EIP CHALLENGE</div>
        <div style={{ fontSize: 120, lineHeight: 1 }}>{`${streak}-day streak`}</div>
        <div style={{ display: "flex", fontSize: 32, marginTop: 12, color: "#d6e3da", lineHeight: 1.25 }}>{`${player.nickname} answers a new Ethereum standards question every day.`}</div>
      </div>
    </div>,
    "One question a day from live EIPsInsight data · ETHQuest",
  );
}
