import Link from "next/link";
import { BrandMark } from "./logo";

/** Landing page behind a shared link: the share image plus a way into the game. */
export function ShareLanding({ image, title, blurb }: { image: string; title: string; blurb: string }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-center gap-5 p-4 text-center">
      <BrandMark size={64} className="anim-float" />
      <h1 className="title-outline font-pixel text-3xl sm:text-4xl">{title}</h1>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt={title} width={1200} height={630} className="px-panel h-auto w-full" />
      <p className="max-w-xl text-lg">{blurb}</p>
      <Link href="/play" className="px-btn px-btn--gold px-btn--lg shine">Play ETHQuest ▶</Link>
      <a href="https://x.com/EIPsInsight" target="_blank" rel="noopener noreferrer" className="text-sm text-gold underline underline-offset-4">Follow @EIPsInsight</a>
    </main>
  );
}
