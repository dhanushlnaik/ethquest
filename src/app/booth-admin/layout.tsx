import { Suspense } from "react";
import type { Metadata } from "next";
import { getAdmin } from "@/lib/server/admin";
import { adminLogout } from "@/app/actions/admin";
import { AdminNavLinks } from "@/components/admin/nav-links";
import { BrandMark } from "@/components/logo";

export const metadata: Metadata = { title: { default: "Booth Admin", template: "%s · Booth Admin" }, robots: { index: false, follow: false } };

const NAV = [
  { href: "/booth-admin", label: "Overview" },
  { href: "/booth-admin/scan", label: "Scan & Redeem" },
  { href: "/booth-admin/champion", label: "Hoodie champion" },
  { href: "/live/host", label: "Live quiz" },
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
    // A calm, solid parchment desk: volunteers read this all day, so no scenery behind it.
    <div className="on-parchment relative z-10 min-h-dvh bg-[#efe2c2]">
      <header className="wood-plate sticky top-0 z-30">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <BrandMark size={32} />
          <span className="font-arcade text-sm text-[#fff3d6]">ETHQuest <span className="text-[var(--gold)]">Booth admin</span></span>
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
      <span className="hidden text-[#d6c3a0] sm:inline">
        {admin.name} · <span className="text-[var(--gold)]">{admin.role}</span>
      </span>
      <button className="px-btn px-btn--red px-btn--sm !min-h-[36px] !text-[0.75rem]">Log out</button>
    </form>
  );
}

async function Nav() {
  const admin = await getAdmin();
  if (!admin) return null;
  return (
    <nav className="no-scrollbar mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-3 pt-1" aria-label="Admin">
      <AdminNavLinks items={NAV} />
    </nav>
  );
}
