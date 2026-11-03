import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { iconRects, type IconName } from "@/lib/pixel/icons";
import { SPRITES, type SpriteAnim } from "@/lib/pixel/sprites";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function PixelIcon({ name, size = 24, className, title }: { name: IconName; size?: number; className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 10 10" width={size} height={size} shapeRendering="crispEdges" className={cx("shrink-0", className)} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      {iconRects(name).map((r) => (
        <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width="1" height="1" fill={r.fill} />
      ))}
    </svg>
  );
}

type Tone = "default" | "purple" | "blue" | "gold" | "green" | "red";

export function Panel({
  children, className, tone = "default", variant, as: As = "div", ...rest
}: { children: ReactNode; className?: string; tone?: Tone; variant?: "raised" | "sunken"; as?: "div" | "section" | "article" | "li" } & Omit<ComponentProps<"div">, "children">) {
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <As className={cx("px-panel", tone !== "default" && `px-panel--${tone}`, variant && `px-panel--${variant}`, className)} {...(rest as any)}>
      {children}
    </As>
  );
}

type BtnTone = "purple" | "blue" | "gold" | "green" | "ghost";
const btnClass = (tone: BtnTone, size?: "sm" | "lg", className?: string) =>
  cx("px-btn", tone !== "purple" && `px-btn--${tone}`, size && `px-btn--${size}`, className);

export function ButtonLink({ href, tone = "purple", size, className, children, external, ...rest }: { href: string; tone?: BtnTone; size?: "sm" | "lg"; className?: string; children: ReactNode; external?: boolean } & Omit<ComponentProps<"a">, "href">) {
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={btnClass(tone, size, className)} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={btnClass(tone, size, className)} {...rest}>
      {children}
    </Link>
  );
}

export function Button({ tone = "purple", size, className, children, ...rest }: { tone?: BtnTone; size?: "sm" | "lg" } & ComponentProps<"button">) {
  return (
    <button className={btnClass(tone, size, className)} {...rest}>
      {children}
    </button>
  );
}

/**
 * PixelLab character. Characters with packed animations play them as a stepped sprite sheet
 * (idle by default); anything else falls back to the still image.
 */
export function Sprite({ name, size = 128, className, alt = "", anim = "idle" }: { name: string; size?: number; className?: string; alt?: string; anim?: SpriteAnim | null }) {
  const a = anim ? SPRITES[name]?.anims[anim] : undefined;
  if (a) {
    return (
      <span
        role={alt ? "img" : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
        className={cx("sprite-sheet select-none", className)}
        style={{ width: size, height: size, backgroundImage: `url(/assets/characters/${name}-${anim}.png)`, ["--frames" as string]: a.frames, ["--fd" as string]: `${a.ms}ms` }}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- tiny pixel sprites; next/image smoothing would blur them
    <img src={`/assets/characters/${name}.png`} width={size} height={size} alt={alt} className={cx("pixelated select-none", className)} draggable={false} />
  );
}

/** Treasure-hunt props (chests, coins, map) from public/assets/treasure. */
export function Treasure({ name, size = 64, className, alt = "" }: { name: string; size?: number; className?: string; alt?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/assets/treasure/${name}.png`} width={size} height={size} alt={alt} className={cx("pixelated select-none", className)} draggable={false} />;
}

export function RewardArt({ name, size = 96, className, alt = "" }: { name: string; size?: number; className?: string; alt?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/assets/treasure/${name}.png`} width={size} height={size} alt={alt} className={cx("pixelated select-none", className)} draggable={false} />;
}

export function Badge({ icon, locked, size = 64, className, title }: { icon: string; locked?: boolean; size?: number; className?: string; title?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/assets/badges/${icon}${locked ? "-locked" : ""}.svg`} width={size} height={size} alt={title ?? ""} className={cx("pixelated select-none", className)} draggable={false} />
  );
}

export function Bar({ value, tone = "gold", className, label }: { value: number; tone?: "gold" | "purple" | "blue"; className?: string; label?: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className={cx("px-bar", tone !== "gold" && `px-bar--${tone}`, className)} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Tag({ children, tone = "default", className }: { children: ReactNode; tone?: Tone; className?: string }) {
  const colors: Record<Tone, string> = {
    default: "bg-raised text-muted",
    purple: "bg-purple-lo/60 text-purple-hi",
    blue: "bg-blue-lo/50 text-blue-hi",
    gold: "bg-gold-lo/40 text-gold-hi",
    green: "bg-green-lo/60 text-green",
    red: "bg-red-lo/50 text-red",
  };
  return <span className={cx("font-pixel inline-flex items-center gap-1 px-2 py-0.5 text-xs uppercase tracking-wider", colors[tone], className)}>{children}</span>;
}

export function PixelLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16" role="status" aria-live="polite">
      <div className="anim-float">
        <PixelIcon name="diamond" size={48} />
      </div>
      <p className="font-arcade text-xs text-muted">
        {label}
        <span className="anim-blink">_</span>
      </p>
    </div>
  );
}

export function SectionTitle({ kicker, title, children }: { kicker?: string; title: string; children?: ReactNode }) {
  return (
    <header className="mb-4">
      {kicker && <p className="font-arcade text-xs uppercase text-purple-hi">{kicker}</p>}
      <h1 className="font-pixel mt-1 text-3xl leading-tight text-text sm:text-4xl">{title}</h1>
      {children && <p className="mt-2 max-w-prose text-muted">{children}</p>}
    </header>
  );
}

export function ExternalLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" data-track="product" className={cx("text-blue underline decoration-blue-lo decoration-2 underline-offset-4 hover:text-blue-hi", className)}>
      {children}
    </a>
  );
}
