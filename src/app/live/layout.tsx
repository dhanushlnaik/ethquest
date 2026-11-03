import type { Metadata } from "next";

export const metadata: Metadata = { title: { default: "Live quiz", template: "%s · Live quiz" }, robots: { index: false } };

export default function LiveLayout({ children }: LayoutProps<"/live">) {
  return <div className="anim-screen-in">{children}</div>;
}
