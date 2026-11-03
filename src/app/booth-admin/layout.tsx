import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { getAdmin } from "@/lib/server/admin";
import { adminLogout } from "@/app/actions/admin";
import { BrandMark } from "@/components/logo";

export const metadata: Metadata = { title: { default: "Booth Admin", template: "%s · Booth Admin" }, robots: { index: false, follow: false } };

const NAV = [
  { href: "/booth-admin", label: "Overview" },
  { href: "/booth-admin/scan", label: "Scan & Redeem" },
  { href: "/booth-admin/champion", label: "Hoodie champion" },
  { href: "/booth-admin/players", label: "Players" },
  { href: "/booth-admin/redemptions", label: "Redemptions" },
  { href: "/booth-admin/rewards", label: "Rewards" },
  { href: "/booth-admin/questions", label: "Questions" },
  { href: "/booth-admin/upgrades", label: "Upgrades" },
  { href: "/booth-admin/missions", label: "Missions" },
  { href: "/booth-admin/pathways", label: "Pathways" },
  { href: "/booth-admin/analytics", label: "Analytics" },
  { href: "/booth-admin/host", label: "Shorts host" },
  { href: "/booth-admin/settings", label: "Settings" },
];

export default function AdminLayout({ children }: LayoutProps<"/booth-admin">) {
  return (
    <div className="min-h-dvh bg-white/95">
      <header className="border-b-[3px] border-line bg-panel">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <BrandMark size={28} />
          <span className="font-arcade text-xs">ETHQUEST <span className="text-gold">BOOTH ADMIN</span></span>
          <Suspense>
            <Who />
          </Suspense>
        </div>
        <Suspense>
          <Nav />
        </Suspense>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
    </div>
  );
}

async function Who() {
  const admin = await getAdmin();
  if (!admin) return null;
  return (
    <form action={adminLogout} className="ml-auto flex items-center gap-3 text-sm">
      <span className="hidden text-muted sm:inline">
        {admin.name} · <span className="text-gold">{admin.role}</span>
      </span>
      <button className="font-arcade text-xs text-red underline">LOG OUT</button>
    </form>
  );
}

async function Nav() {
  const admin = await getAdmin();
  if (!admin) return null;
  return (
    <nav className="no-scrollbar mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2" aria-label="Admin">
      {NAV.map((n) => (
        <Link key={n.href} href={n.href} className="font-pixel shrink-0 bg-raised px-3 py-2 text-sm hover:bg-purple-lo">
          {n.label}
        </Link>
      ))}
    </nav>
  );
}
