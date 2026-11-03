import { EIPSINSIGHT, EIPSINSIGHT_SOCIALS } from "@/lib/config/game";
import { BrandMark } from "./logo";
import { cx, PixelIcon } from "./pixel";
import type { IconName } from "@/lib/pixel/icons";

/** "Brought to you by EIPsInsight": what it is, and every official handle. */
export function EipsInsightPromo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <section className={cx("px-panel px-panel--gold p-4 sm:p-5", className)} aria-label="About EIPsInsight">
      <div className="flex items-start gap-3">
        <BrandMark size={compact ? 44 : 56} className="anim-float shrink-0" />
        <div className="min-w-0">
          <p className="font-arcade text-xs text-gold">Brought to you by</p>
          <h2 className="font-pixel text-2xl leading-tight">EIPsInsight</h2>
          {!compact && (
            <p className="mt-1 text-sm text-muted">
              Every EIP, ERC and network upgrade in one place: proposal status, All Core Devs decisions, upgrade timelines and analytics. The answers to every quest here live on EIPsInsight.
            </p>
          )}
        </div>
      </div>
      <a
        href={EIPSINSIGHT}
        target="_blank"
        rel="noopener noreferrer"
        data-track="product"
        className="px-btn px-btn--gold px-btn--sm mt-4 w-full"
      >
        Explore eipsinsight.com ›
      </a>
      <ul className={cx("mt-4 grid gap-2", compact ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-3")}>
        {EIPSINSIGHT_SOCIALS.map((s) => (
          <li key={s.key}>
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              data-track="social"
              className="px-panel px-panel--raised flex items-center gap-2 px-2.5 py-2 transition-transform hover:-translate-y-0.5"
            >
              <PixelIcon name={s.icon as IconName} size={22} />
              <span className="min-w-0">
                <span className="font-arcade block text-[11px] leading-tight">{s.label}</span>
                {!compact && <span className="block truncate text-xs text-muted">{s.handle}</span>}
              </span>
            </a>
          </li>
        ))}
      </ul>
      {!compact && <p className="font-arcade mt-3 text-center text-xs text-gold">Follow @EIPsInsight on X for weekly protocol updates</p>}
    </section>
  );
}
