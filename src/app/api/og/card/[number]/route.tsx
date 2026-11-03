import { getCatalog, toView } from "@/lib/server/cards";
import { shareImage } from "@/lib/server/og";
import { OgCard } from "@/components/cards/og-card";
import { cardLabel, RARITY_STYLE } from "@/lib/cards/types";

/** Share image for a card: "Pulled by <name>". */
export async function GET(req: Request, ctx: RouteContext<"/api/og/card/[number]">) {
  const n = Number((await ctx.params).number);
  const card = (await getCatalog()).byNumber.get(n);
  if (!card) return new Response("Not found", { status: 404 });
  const by = new URL(req.url).searchParams.get("by")?.slice(0, 20);
  const view = toView(card);
  const rs = RARITY_STYLE[card.rarity];
  return shareImage(
    <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
      <OgCard card={view} width={250} />
      <div style={{ display: "flex", flexDirection: "column", marginLeft: 56, flex: 1 }}>
        <div style={{ fontSize: 28, color: "#f5c542" }}>{by ? `${by} pulled a ${rs.label.toUpperCase()} card` : `${rs.label.toUpperCase()} EIP CARD`}</div>
        <div style={{ fontSize: 64, lineHeight: 1.05, marginTop: 8 }}>{cardLabel(view)}</div>
        <div style={{ fontSize: 34, marginTop: 8, color: "#d6e3da" }}>{card.title}</div>
        <div style={{ fontSize: 26, marginTop: 24, color: "#d6e3da" }}>Collect every EIP card. Open packs, complete sets, battle friends.</div>
      </div>
    </div>,
  );
}
