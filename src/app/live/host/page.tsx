import { Suspense } from "react";
import Link from "next/link";
import { db } from "@/lib/server/db";
import { requireAdminPage } from "@/lib/server/admin";
import { LIVE_QUIZZES } from "@/lib/server/live-quizzes";
import { hostCreateSession } from "@/app/actions/live";
import { PixelLoader, Tag } from "@/components/pixel";
import { BrandMark } from "@/components/logo";

export const metadata = { title: "Host" };

export default function LiveHostPage() {
  return (
    <main className="on-parchment relative z-10 min-h-dvh bg-[#efe2c2] p-6">
      <Suspense fallback={<PixelLoader />}>
        <Rooms />
      </Suspense>
    </main>
  );
}

async function Rooms() {
  await requireAdminPage("VOLUNTEER");
  const recent = await db.liveSession.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { _count: { select: { participants: true } } } });
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex items-center gap-3">
        <BrandMark size={48} />
        <div>
          <p className="font-arcade text-xs text-gold">Host a live quiz</p>
          <h1 className="font-pixel text-3xl">Live quiz rooms</h1>
        </div>
      </header>
      {Object.values(LIVE_QUIZZES).map((q) => (
        <section key={q.slug} className="px-panel px-panel--gold p-5">
          <h2 className="font-pixel text-2xl">{q.title}</h2>
          <p className="text-lg text-muted">{q.subtitle} · {q.questions.length} questions (incl. {q.questions.filter((x) => x.kind === "poll").length} polls)</p>
          <form action={hostCreateSession.bind(null, q.slug)} className="mt-4">
            <button className="px-btn px-btn--gold">Open a new room ▶</button>
          </form>
          <p className="mt-3 text-base text-muted">Put the room on the projector; players join on their phones at <b>/live</b>. Independent of ETHQuest XP and the Hall of Fame.</p>
        </section>
      ))}
      <section className="px-panel p-5">
        <h2 className="font-pixel text-xl">Recent rooms</h2>
        <ul className="mt-3 space-y-2">
          {recent.map((s) => (
            <li key={s.id} className="flex items-center gap-3">
              <Link href={`/live/host/${s.code}`} className="font-pixel text-xl underline underline-offset-4">{s.code}</Link>
              <span className="flex-1 text-base text-muted">{s.title} · {s._count.participants} players</span>
              <Tag tone={s.status === "ENDED" ? "default" : "green"}>{s.status}</Tag>
            </li>
          ))}
          {!recent.length && <li className="text-muted">No rooms yet.</li>}
        </ul>
      </section>
    </div>
  );
}
