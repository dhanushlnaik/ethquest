import { Suspense } from "react";
import Link from "next/link";
import { FxProvider } from "@/components/fx";
import { Hud } from "@/components/hud";
import { BottomNav } from "@/components/bottom-nav";
import { NetworkBanner } from "@/components/network-banner";
import { ClickTracker } from "@/components/click-tracker";
import { MusicDirector } from "@/components/music-director";
import { BrandMark, Wordmark } from "@/components/logo";

export default function PlayLayout({ children }: LayoutProps<"/play">) {
  return (
    <FxProvider>
      <header className="wood-plate sticky top-0 z-30">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4">
          <Link href="/play" className="flex items-center gap-2" aria-label="ETHQuest home">
            <BrandMark size={34} />
            <span className="hidden sm:block"><Wordmark size="sm" /></span>
          </Link>
          <Suspense fallback={<div className="ml-auto h-8 w-40 animate-pulse bg-raised" />}>
            <Hud />
          </Suspense>
        </div>
      </header>
      <NetworkBanner />
      <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-5">{children}</main>
      <Suspense>
        <BottomNav />
      </Suspense>
      <ClickTracker />
      <Suspense>
        <MusicDirector />
      </Suspense>
    </FxProvider>
  );
}
