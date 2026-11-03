import type { Metadata, Viewport } from "next";
import { Geist_Mono, Press_Start_2P, VT323 } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/sw-register";

// Body: VT323 (CRT terminal). Display/HUD: Press Start 2P (8-bit arcade). Sizes are normalised in globals.css.
const body = VT323({ variable: "--font-body", subsets: ["latin"], weight: "400" });
const mono = Geist_Mono({ variable: "--font-mono-face", subsets: ["latin"] });
const display = Press_Start_2P({ variable: "--font-display", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "ETHQuest — The Protocol Playground", template: "%s · ETHQuest" },
  description: "Play quick quests about Ethereum standards, collect pixel EIP trading cards and battle friends. A pixel treasure hunt through Ethereum by EIPsInsight.",
  applicationName: "ETHQuest",
  appleWebApp: { capable: true, title: "ETHQuest", statusBarStyle: "black-translucent" },
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  // Default share image comes from src/app/opengraph-image.tsx (file convention).
  openGraph: { type: "website", siteName: "ETHQuest by EIPsInsight", title: "ETHQuest by EIPsInsight", description: "Learn Ethereum standards. Collect every EIP as a pixel card. Battle your friends." },
  twitter: { card: "summary_large_image", site: "@EIPsInsight", creator: "@EIPsInsight" },
};

export const viewport: Viewport = {
  themeColor: "#24302f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Fixed positions (not random) so server and client render identically.
const GLINTS = [[8, 70, 0], [22, 40, 2.5], [37, 82, 4.1], [55, 55, 1.2], [68, 76, 5.3], [81, 35, 3.2], [92, 64, 0.7], [14, 22, 6]];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${body.variable} ${mono.variable} ${display.variable} h-full antialiased`}>
      <body className="world-bg stars min-h-full">
        <div className="glints" aria-hidden>
          {GLINTS.map(([l, t, d], i) => <i key={i} style={{ left: `${l}%`, top: `${t}%`, animationDelay: `${d}s` }} />)}
        </div>
        <div className="relative z-10 min-h-dvh">{children}</div>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
