// Dev helper: drives a live-quiz room from the terminal (host + fake players) so the phone and big-screen
// UIs can be tested without a projector or ten phones. Writes only to the ethquest Live* tables.
//   pnpm tsx --conditions=react-server scripts/live-sim.ts create
//   pnpm tsx --conditions=react-server scripts/live-sim.ts bots CODE 9
//   pnpm tsx --conditions=react-server scripts/live-sim.ts step CODE start|reveal|next|end
//   pnpm tsx --conditions=react-server scripts/live-sim.ts answer CODE   (bots answer the open question)
//   pnpm tsx --conditions=react-server scripts/live-sim.ts state CODE
import "dotenv/config";
import { randomInt } from "node:crypto";
import { db } from "../src/lib/server/db";
import { advance, createSession, findSession, liveState, quizOf, shownQuestion } from "../src/lib/server/live";
import { livePoints } from "../src/lib/server/live-quizzes";
import { sha256, randomToken } from "../src/lib/server/crypto";

const [cmd, code, arg] = process.argv.slice(2);
const NAMES = ["BlobEnjoyer", "GasGuzzler", "ProtocolWizard", "SlotSeeker", "MempoolMoth", "ForkFan", "ValidatorVee", "RollupRay", "VerkleVic"];

async function main() {
  if (cmd === "create") {
    const admin = await db.adminUser.findFirst();
    const s = await createSession("eip-signal", admin?.id ?? "sim");
    console.log("CODE", s.code);
  } else if (cmd === "bots") {
    const s = (await findSession(code))!;
    for (const name of NAMES.slice(0, Number(arg ?? 9))) {
      await db.liveParticipant.create({ data: { sessionId: s.id, name, tokenHash: sha256(randomToken()) } }).catch(() => null);
    }
    console.log("bots in", await db.liveParticipant.count({ where: { sessionId: s.id } }));
  } else if (cmd === "step") {
    await advance(code, arg as "start");
    const s = (await findSession(code))!;
    console.log(s.status, s.currentIndex);
  } else if (cmd === "answer") {
    const s = (await findSession(code))!;
    const q = quizOf(s).questions[s.currentIndex];
    const shown = shownQuestion(s, q, s.currentIndex);
    const bots = await db.liveParticipant.findMany({ where: { sessionId: s.id, name: { in: NAMES } } });
    for (const b of bots) {
      // ~70% pick the right answer, at a random speed
      const choice = shown.correct != null && randomInt(10) < 7 ? shown.correct : randomInt(shown.options.length);
      const correct = shown.correct != null && choice === shown.correct;
      const points = q.kind === "poll" ? 0 : livePoints(correct, randomInt(2000, shown.seconds * 1000), shown.seconds);
      const ins = await db.liveAnswer.createMany({ data: [{ sessionId: s.id, participantId: b.id, questionIndex: s.currentIndex, choice, correct, points }], skipDuplicates: true });
      if (ins.count && points) await db.liveParticipant.update({ where: { id: b.id }, data: { score: { increment: points } } });
    }
    console.log("bots answered", bots.length, "correct slot", shown.correct);
  } else if (cmd === "state") {
    const s = (await findSession(code))!;
    console.log(JSON.stringify(await liveState(s, { host: true }), null, 1));
  }
}
main().then(() => process.exit(0));
