import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getCatalog } from "@/lib/server/cards";
import { RARITY_STYLE } from "@/lib/cards/types";
import { ShareLanding } from "@/components/share-landing";

type P = PageProps<"/s/card/[number]">;

async function load({ params, searchParams }: P) {
  const n = Number((await params).number);
  const by = (await searchParams).by;
  const card = (await getCatalog()).byNumber.get(n);
  const name = typeof by === "string" ? by.slice(0, 20) : null;
  return { card, name, image: `/api/og/card/${n}${name ? `?by=${encodeURIComponent(name)}` : ""}` };
}

export async function generateMetadata(props: P): Promise<Metadata> {
  const { card, name, image } = await load(props);
  if (!card) return {};
  const title = `${name ? `${name} pulled` : "EIP card:"} ${card.repo === "erc" ? "ERC" : "EIP"}-${card.number} (${RARITY_STYLE[card.rarity].label})`;
  return { title, description: card.title, openGraph: { title, description: card.title, images: [image] }, twitter: { card: "summary_large_image", title, images: [image] } };
}

export default function SharedCard(props: P) {
  return <Suspense><Body {...props} /></Suspense>;
}

async function Body(props: P) {
  const { card, name, image } = await load(props);
  if (!card) notFound();
  return <ShareLanding image={image} title={name ? `${name} pulled a ${RARITY_STYLE[card.rarity].label} card!` : `${card.repo === "erc" ? "ERC" : "EIP"}-${card.number}`} blurb="Every Ethereum proposal is a pixel trading card. Play quests, open packs, complete sets and battle your friends." />;
}
