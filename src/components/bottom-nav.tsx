"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PixelIcon } from "./pixel";
import type { IconName } from "@/lib/pixel/icons";

const ITEMS: { href: string; label: string; icon: IconName }[] = [
  { href: "/play", label: "Home", icon: "house" },
  { href: "/play/worlds", label: "Quests", icon: "map" },
  { href: "/play/leaderboard", label: "Ranks", icon: "trophy" },
  { href: "/play/rewards", label: "Rewards", icon: "gift" },
  { href: "/play/profile", label: "Me", icon: "user" },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="wood-plate fixed inset-x-0 bottom-0 z-30 pb-[env(safe-area-inset-bottom)]" aria-label="Main">
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {ITEMS.map((item) => {
          const active =
            item.href === "/play"
              ? path === "/play" || path === "/play/welcome"
              : path === item.href || (item.href === "/play/worlds" && path !== "/play" && path !== "/play/welcome" && !ITEMS.some((i) => i.href !== "/play" && i.href !== "/play/worlds" && path.startsWith(i.href)));
          return (
            <li key={item.href}>
              <Link href={item.href} className="flex h-16 flex-col items-center justify-center gap-1" aria-current={active ? "page" : undefined}>
                <PixelIcon name={item.icon} size={24} className={active ? "" : "opacity-50 grayscale"} />
                <span className={`font-arcade text-[11px] ${active ? "text-[var(--gold)]" : "text-[#d6c3a0]"}`}>{item.label.toUpperCase()}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
