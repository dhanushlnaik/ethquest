"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "../pixel";

/** Admin tabs as parchment chips; the current section is gold. */
export function AdminNavLinks({ items }: { items: { href: string; label: string }[] }) {
  const path = usePathname();
  return (
    <>
      {items.map((n) => {
        const active = path === n.href || (n.href !== "/booth-admin" && path.startsWith(n.href));
        return (
          <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined} className={cx("px-btn px-btn--sm shrink-0 !min-h-[38px] !text-[0.8rem]", active ? "px-btn--gold" : "px-btn--ghost")}>
            {n.label}
          </Link>
        );
      })}
    </>
  );
}
