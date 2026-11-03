import { cardLabel, RARITY_STYLE, STATS, type CardView } from "@/lib/cards/types";
import { cx } from "../pixel";
import { CATEGORY_COLORS, DEFAULT_COLORS, emblemPixels } from "@/lib/cards/emblem";

// A pixel trading card. Each EIP gets its own mirrored 9×9 emblem, generated from its number,
// coloured by category; rarity sets the frame, glow and (for Legendary) a holo sheen.

export function Emblem({ number, category, size = 72 }: { number: number; category: string | null; size?: number }) {
  const { N, pixels, outline } = emblemPixels(number, category);
  return (
    <svg viewBox={`0 0 ${N} ${N}`} width={size} height={size} shapeRendering="crispEdges" aria-hidden className="shrink-0">
      {outline.map((p) => <rect key={`o${p.x},${p.y}`} x={p.x} y={p.y} width="1" height="1" fill="#1f140b" />)}
      {pixels.map((p) => <rect key={`${p.x},${p.y}`} x={p.x} y={p.y} width="1" height="1" fill={p.c} />)}
    </svg>
  );
}

export function PixelCard({ card, size = "md", className, dim }: { card: CardView; size?: "sm" | "md" | "lg"; className?: string; dim?: boolean }) {
  const rs = RARITY_STYLE[card.rarity];
  const [main, dark] = CATEGORY_COLORS[card.category ?? ""] ?? DEFAULT_COLORS;
  const w = size === "sm" ? 132 : size === "md" ? 188 : 260;
  const emblem = size === "sm" ? 54 : size === "md" ? 84 : 120;
  return (
    <div
      className={cx("relative select-none", card.rarity === "LEGENDARY" && !dim && "shine", dim && "opacity-35 grayscale", className)}
      style={{ width: w, filter: !dim && rs.glow !== "transparent" ? `drop-shadow(0 0 10px ${rs.glow})` : undefined }}
    >
      <div className="overflow-hidden border-[3px] border-[#1f140b] shadow-[0_5px_0_rgba(20,14,8,0.45)]">
        <div className="border-[4px] p-1.5" style={{ borderColor: rs.frame, background: "#f4e8cc" }}>
          <div className="flex items-baseline justify-between gap-1">
            <span className="font-arcade text-[10px]" style={{ color: rs.text }}>{cardLabel(card)}</span>
            <span className="font-arcade text-[9px]" style={{ color: rs.text }}>{rs.label}</span>
          </div>
          <div className="relative mt-1 grid place-items-center border-[3px] py-2" style={{ borderColor: dark, background: `repeating-linear-gradient(45deg, ${main}22 0 6px, ${main}11 6px 12px), #fff8e8` }}>
            <Emblem number={card.number} category={card.category} size={emblem} />
            {card.count > 1 && size !== "lg" && <span className="font-arcade absolute right-1 top-1 bg-[var(--wood-dk)] px-1 text-[10px] text-[var(--gold)]">×{card.count}</span>}
            {card.isNew && <span className="font-arcade absolute left-1 top-1 bg-[#c0392b] px-1 text-[10px] text-[#fff3d6]">NEW</span>}
            {card.leveledUp && !card.isNew && <span className="font-arcade anim-blink absolute left-1 top-1 bg-[#4a6b2a] px-1 text-[10px] text-[#fff3d6]">LVL UP</span>}
          </div>
          <p className={cx("font-pixel mt-1.5 leading-tight text-ink", size === "sm" ? "line-clamp-2 min-h-[2.5em] text-[11px]" : size === "md" ? "line-clamp-2 min-h-[2.5em] text-sm" : "text-lg")}>{card.title}</p>
          {size !== "sm" && (
            <ul className="mt-1.5 space-y-0.5">
              {STATS.map((s) => (
                <li key={s.key} className="flex items-center gap-1.5">
                  <span className="font-arcade w-11 text-[9px] text-[#5b4632]">{s.label}</span>
                  <span className="h-2 flex-1 bg-[#e2cfa6]"><span className="block h-full" style={{ width: `${card[s.key]}%`, background: main }} /></span>
                  <span className="font-arcade w-5 text-right text-[9px] text-ink">{card[s.key]}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-1 truncate text-[11px] text-[#5b4632]">{[card.status, card.upgrade ?? card.category, card.year].filter(Boolean).join(" · ")}</p>
        </div>
      </div>
    </div>
  );
}

/** Face-down card (unopened slot, locked collection entry). */
export function CardBack({ size = "md", label }: { size?: "sm" | "md" | "lg"; label?: string }) {
  const w = size === "sm" ? 132 : size === "md" ? 188 : 260;
  return (
    <div className="px-panel grid place-items-center" style={{ width: w, aspectRatio: "5 / 7" }}>
      <div className="grid h-[86%] w-[84%] place-items-center border-[4px] border-[var(--wood)] bg-[repeating-linear-gradient(45deg,#6b4325_0_8px,#7a4b29_8px_16px)]">
        <span className="font-arcade bg-[var(--wood-dk)] px-2 py-1 text-[10px] text-[var(--gold)]">{label ?? "EIP"}</span>
      </div>
    </div>
  );
}
