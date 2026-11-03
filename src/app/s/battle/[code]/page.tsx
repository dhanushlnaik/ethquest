import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { battleView } from "@/lib/server/battles";
import { ShareLanding } from "@/components/share-landing";

type P = PageProps<"/s/battle/[code]">;

async function load({ params }: P) {
  const code = (await params).code.toUpperCase();
  const b = await battleView(code, null);
  if (!b || b.status !== "DONE") return null;
  const winner = b.winnerId === b.challenger.id ? b.challenger.nickname : b.winnerId ? b.opponent?.nickname : null;
  const title = winner ? `${winner} won an EIP card battle` : `${b.challenger.nickname} vs ${b.opponent?.nickname}: a draw`;
  return { title, image: `/api/og/battle/${code}` };
}

export async function generateMetadata(props: P): Promise<Metadata> {
  const d = await load(props);
  if (!d) return {};
  return { title: d.title, openGraph: { title: d.title, images: [d.image] }, twitter: { card: "summary_large_image", title: d.title, images: [d.image] } };
}

export default function SharedBattle(props: P) {
  return <Suspense><Body {...props} /></Suspense>;
}

async function Body(props: P) {
  const d = await load(props);
  if (!d) notFound();
  return <ShareLanding image={d.image} title={d.title} blurb="Best of 3 battles with Ethereum proposal cards. Build a hand, pick your stats, challenge a friend." />;
}
