import { battleView } from "@/lib/server/battles";
import { shareImage } from "@/lib/server/og";
import { emblemDataUri } from "@/lib/cards/emblem";
import type { CardView } from "@/lib/cards/types";

/** Share image for a finished battle. */
export async function GET(_req: Request, ctx: RouteContext<"/api/og/battle/[code]">) {
  const code = (await ctx.params).code.toUpperCase();
  const b = await battleView(code, null);
  if (!b || b.status !== "DONE" || !b.rounds || !b.challengerCards) return new Response("Not found", { status: 404 });
  const aw = b.rounds.filter((r) => r.winner === "a").length, bw = b.rounds.filter((r) => r.winner === "b").length;
  const side = (name: string, cards: CardView[], won: boolean) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 420 }}>
      <div style={{ fontSize: 40, color: won ? "#f5c542" : "#fff3d6" }}>{won ? `${name} · WINNER` : name}</div>
      <div style={{ display: "flex", marginTop: 20 }}>
        {cards.map((c) => (
          <div key={c.number} style={{ display: "flex", flexDirection: "column", alignItems: "center", margin: "0 10px", padding: 10, background: "#f4e8cc", border: "6px solid #5c4127" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={emblemDataUri(c.number, c.category)} width={96} height={96} alt="" />
            <div style={{ fontSize: 18, color: "#2a1d12", marginTop: 6 }}>{`${c.repo === "erc" ? "ERC" : "EIP"}-${c.number}`}</div>
          </div>
        ))}
      </div>
    </div>
  );
  return shareImage(
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
      {side(b.challenger.nickname, b.challengerCards, aw > bw)}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ fontSize: 28, color: "#d6e3da" }}>CARD BATTLE</div>
        <div style={{ fontSize: 96, color: "#f5c542" }}>{`${aw}–${bw}`}</div>
      </div>
      {side(b.opponent?.nickname ?? "?", b.opponentCards, bw > aw)}
    </div>,
    "Best of 3 EIP card battles on ETHQuest by @EIPsInsight",
  );
}
