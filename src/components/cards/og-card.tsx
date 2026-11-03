import { emblemDataUri } from "@/lib/cards/emblem";
import { cardLabel, RARITY_STYLE, STATS, type CardView } from "@/lib/cards/types";
import { CATEGORY_COLORS, DEFAULT_COLORS } from "@/lib/cards/emblem";

/** The trading card, drawn with inline styles for next/og (Satori). */
export function OgCard({ card, width = 330 }: { card: CardView; width?: number }) {
  const rs = RARITY_STYLE[card.rarity];
  const [main, dark] = CATEGORY_COLORS[card.category ?? ""] ?? DEFAULT_COLORS;
  const s = width / 330;
  return (
    <div style={{ display: "flex", flexDirection: "column", width, background: "#f4e8cc", border: `${Math.round(8 * s)}px solid ${rs.frame}`, boxShadow: `0 0 ${Math.round(40 * s)}px ${rs.glow}`, padding: Math.round(12 * s), color: "#2a1d12" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: Math.round(20 * s), color: rs.text }}>
        <span>{cardLabel(card)}</span>
        <span>{rs.label.toUpperCase()}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", marginTop: Math.round(8 * s), padding: Math.round(14 * s), border: `${Math.round(5 * s)}px solid ${dark}`, background: "#fff8e8" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={emblemDataUri(card.number, card.category)} width={Math.round(170 * s)} height={Math.round(170 * s)} alt="" />
      </div>
      <div style={{ display: "flex", marginTop: Math.round(10 * s), fontSize: Math.round(24 * s), lineHeight: 1.15, height: Math.round(58 * s), overflow: "hidden" }}>{card.title}</div>
      <div style={{ display: "flex", flexDirection: "column", marginTop: Math.round(8 * s) }}>
        {STATS.map((st) => (
          <div key={st.key} style={{ display: "flex", alignItems: "center", marginTop: Math.round(4 * s), fontSize: Math.round(16 * s) }}>
            <span style={{ width: Math.round(70 * s), color: "#5b4632" }}>{st.label}</span>
            <div style={{ display: "flex", flex: 1, height: Math.round(12 * s), background: "#e2cfa6" }}>
              <div style={{ width: `${card[st.key]}%`, height: "100%", background: main }} />
            </div>
            <span style={{ width: Math.round(36 * s), textAlign: "right" }}>{card[st.key]}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", marginTop: Math.round(8 * s), fontSize: Math.round(16 * s), color: "#5b4632" }}>{[card.status, card.upgrade ?? card.category, card.year].filter(Boolean).join(" · ")}</div>
    </div>
  );
}
