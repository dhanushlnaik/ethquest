import { MARK_SIZE, MARK_SVG_BODY } from "@/lib/pixel/mark";
import { cx } from "./pixel";

/** ETHQuest pixel mark: the EIPsInsight rising-bars mark as gold coin stacks on a compass medallion. */
export function BrandMark({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${MARK_SIZE} ${MARK_SIZE}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className={cx("shrink-0", className)}
      aria-hidden
      dangerouslySetInnerHTML={{ __html: MARK_SVG_BODY }}
    />
  );
}

/** Gold pixel "ETHQuest" wordmark with a dark outline; the large size bobs letter by letter. */
export function Wordmark({ className, size = "lg" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const text = "ETHQuest";
  const fs = size === "lg" ? "text-[3.2rem] sm:text-[5rem]" : size === "md" ? "text-4xl" : "text-2xl";
  const stroke = size === "sm" ? 4 : 8;
  return (
    <span className={cx("font-pixel inline-flex select-none font-bold leading-none", fs, className)} aria-label="ETHQuest">
      {text.split("").map((ch, i) => (
        <span
          key={i}
          aria-hidden
          className="inline-block"
          style={{
            color: i < 3 ? "#ffe89a" : "#f5c542",
            WebkitTextStroke: `${stroke}px var(--wood-dk)`,
            paintOrder: "stroke fill",
            textShadow: `0 ${size === "sm" ? 3 : 6}px 0 var(--wood-dk)`,
            animation: size === "lg" ? `bob 2.4s ease-in-out ${i * 0.12}s infinite` : undefined,
          }}
        >
          {ch}
        </span>
      ))}
    </span>
  );
}

/** Full title lockup used on the title screen and kiosk. */
export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <h1 className={cx("flex select-none flex-col items-center", className)} aria-label="ETHQuest by EIPsInsight: The Protocol Playground">
      <span className="flex items-center gap-2 sm:gap-4">
        <BrandMark size={compact ? 56 : 92} className="anim-float drop-shadow-[0_5px_0_rgba(20,14,8,0.5)]" />
        <Wordmark size={compact ? "md" : "lg"} />
      </span>
      <span className="px-panel font-arcade -mt-1 rotate-[-2deg] px-4 py-1 text-xs sm:text-sm">
        by <span className="text-gold">EIPs</span>Insight
      </span>
      {!compact && (
        <span className="wood-plate font-arcade mt-3 px-4 py-1.5 text-sm text-gold sm:text-base">The Protocol Playground</span>
      )}
    </h1>
  );
}
