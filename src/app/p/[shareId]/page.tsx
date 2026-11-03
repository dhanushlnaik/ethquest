import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/server/db";
import { PathwayCard } from "@/components/pathway-card";
import { ButtonLink, PixelIcon, PixelLoader } from "@/components/pixel";
import { SITE_URL } from "@/lib/site";
import type { BuiltPathway } from "@/lib/games/content";

export async function generateMetadata({ params }: PageProps<"/p/[shareId]">): Promise<Metadata> {
  const { shareId } = await params;
  return {
    title: "A path into Ethereum",
    description: "A personalized pathway into the Ethereum ecosystem, from ETHQuest by EIPsInsight.",
    openGraph: { images: [`/api/og/path/${shareId}`] },
    twitter: { card: "summary_large_image", images: [`/api/og/path/${shareId}`] },
  };
}

export default function SharedPath({ params }: PageProps<"/p/[shareId]">) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <p className="font-arcade flex items-center gap-2 text-xs text-blue-hi">
        <PixelIcon name="diamond" size={18} /> ETHQUEST BY EIPSINSIGHT
      </p>
      <h1 className="font-pixel mt-2 text-3xl">A path into Ethereum</h1>
      <Suspense fallback={<PixelLoader />}>
        <Card params={params} />
      </Suspense>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <ButtonLink href="/play/pathfinder" tone="gold">Find your own path</ButtonLink>
        <ButtonLink href="https://eipsinsight.com" tone="ghost" external>Visit EIPsInsight ↗</ButtonLink>
      </div>
    </main>
  );
}

async function Card({ params }: { params: PageProps<"/p/[shareId]">["params"] }) {
  const { shareId } = await params;
  const row = await db.playerPathway.findUnique({ where: { shareId } });
  if (!row) notFound();
  return (
    <div className="mt-4">
      <PathwayCard snapshot={row.snapshot as unknown as BuiltPathway & { nickname?: string }} shareUrl={`${SITE_URL}/p/${shareId}`} />
    </div>
  );
}
