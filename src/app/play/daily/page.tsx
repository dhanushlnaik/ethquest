import { Suspense } from "react";
import { connection } from "next/server";
import { db } from "@/lib/server/db";
import { getPlayer } from "@/lib/server/session";
import { dayKey } from "@/lib/server/cards";
import { getDaily, publicDaily, streakOf } from "@/lib/server/daily";
import { PixelLoader, SectionTitle } from "@/components/pixel";
import { NeedPlayer } from "@/components/need-player";
import { DailyQuiz } from "@/components/daily-quiz";
import { SITE_URL } from "@/lib/site";

export const metadata = { title: "Daily challenge" };

export default function DailyPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <SectionTitle kicker="One question a day" title="Daily EIP challenge">
        A fresh question from live EIPsInsight data every day. Keep your streak going for booster packs.
      </SectionTitle>
      <Suspense fallback={<PixelLoader label="Fetching today's question" />}>
        <Daily />
      </Suspense>
    </div>
  );
}

async function Daily() {
  const player = await getPlayer();
  if (!player) return <NeedPlayer next="/play/daily" title="Ready for today's challenge?" />;
  await connection();
  const day = dayKey();
  const [q, mine, { streak }] = await Promise.all([
    getDaily(day),
    db.dailyAnswer.findUnique({ where: { playerId_day: { playerId: player.id, day } } }),
    streakOf(player.id),
  ]);
  const answered = mine ? { choice: mine.choice, correct: mine.correct, correctId: q.correctId, explanation: q.explanation, streak } : null;
  return <DailyQuiz q={publicDaily(q)} answered={answered} streak={streak} shareUrl={`${SITE_URL}/s/streak/${player.id}`} />;
}
