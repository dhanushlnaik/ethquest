import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { db } from "@/lib/server/db";
import { streakOf } from "@/lib/server/daily";
import { ShareLanding } from "@/components/share-landing";

type P = PageProps<"/s/streak/[playerId]">;

async function load({ params }: P) {
  const id = (await params).playerId;
  const player = await db.player.findUnique({ where: { id }, select: { nickname: true } });
  if (!player) return null;
  const { streak } = await streakOf(id);
  return { title: `${player.nickname}: ${streak}-day streak on the daily EIP challenge`, image: `/api/og/streak/${id}` };
}

export async function generateMetadata(props: P): Promise<Metadata> {
  const d = await load(props);
  if (!d) return {};
  return { title: d.title, openGraph: { title: d.title, images: [d.image] }, twitter: { card: "summary_large_image", title: d.title, images: [d.image] } };
}

export default function SharedStreak(props: P) {
  return <Suspense><Body {...props} /></Suspense>;
}

async function Body(props: P) {
  const d = await load(props);
  if (!d) notFound();
  return <ShareLanding image={d.image} title={d.title} blurb="One Ethereum standards question a day, from live EIPsInsight data. How long can you keep your streak?" />;
}
