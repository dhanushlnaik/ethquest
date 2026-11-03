import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/server/db";
import { PathwayCard } from "@/components/pathway-card";
import { ShareButtons } from "@/components/share-buttons";
import { ButtonLink, PixelLoader } from "@/components/pixel";
import { SITE_URL } from "@/lib/site";
import type { BuiltPathway } from "@/lib/games/content";

export const metadata = { title: "Your Path into Ethereum" };

export default function Page({ params }: PageProps<"/play/pathfinder/result/[shareId]">) {
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/play/pathfinder" className="font-arcade text-xs text-muted">‹ PATHFINDER</Link>
      <p className="font-arcade mt-3 text-xs text-gold">ACHIEVEMENT: PATHFINDER, FOUND YOUR WAY INTO ETHEREUM</p>
      <h1 className="font-pixel mt-1 text-3xl">Your path into Ethereum</h1>
      <Suspense fallback={<PixelLoader label="Drawing your map" />}>
        <Result params={params} />
      </Suspense>
    </div>
  );
}

async function Result({ params }: { params: PageProps<"/play/pathfinder/result/[shareId]">["params"] }) {
  const { shareId } = await params;
  const row = await db.playerPathway.findUnique({ where: { shareId } });
  if (!row) notFound();
  const shareUrl = `${SITE_URL}/p/${shareId}`;
  return (
    <div className="mt-4 space-y-4">
      <PathwayCard snapshot={row.snapshot as unknown as BuiltPathway & { nickname?: string }} shareUrl={shareUrl} />
      <ShareButtons url={shareUrl} title="I found my path into Ethereum at the EIPsInsight booth, Devcon 8" imageUrl={`/api/og/path/${shareId}`} />
      <div className="grid gap-3 sm:grid-cols-2">
        <ButtonLink href="/play/pathfinder" tone="ghost">Try another path</ButtonLink>
        <ButtonLink href="/play/worlds" tone="blue">Back to the worlds</ButtonLink>
      </div>
    </div>
  );
}
