import "server-only";
import { createHash, randomInt } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";
import { randomToken, sha256 } from "./crypto";
import { UserError } from "./action";
import { cleanNickname } from "./nickname";
import { DEFAULT_SECONDS, LIVE_QUIZZES, livePoints, type LiveQuestion } from "./live-quizzes";
import type { LiveState } from "@/lib/live/types";
import type { LiveSession } from "@/generated/prisma/client";

// Live quiz: one host (big screen) drives a room of phones. Everything is server-authoritative;
// clients poll /api/live/[code] about once a second. Independent of ETHQuest players and XP.

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I/O: easy to read off a projector
const GRACE_MS = 1500; // network slack after the timer hits zero
export const liveCookie = (code: string) => `lq_${code}`;

export function quizOf(session: Pick<LiveSession, "quizSlug">) {
  const quiz = LIVE_QUIZZES[session.quizSlug];
  if (!quiz) throw new UserError("Unknown quiz.");
  return quiz;
}

/** Deterministic per-session option order, so "A" isn't always right and every screen agrees. */
function order(sessionId: string, index: number, n: number) {
  const perm = Array.from({ length: n }, (_, i) => i);
  const h = createHash("sha256").update(`${sessionId}:${index}`).digest();
  for (let i = n - 1; i > 0; i--) {
    const j = h[i] % (i + 1);
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  return perm; // display slot -> original option index
}

export function shownQuestion(session: Pick<LiveSession, "id">, q: LiveQuestion, index: number) {
  // Polls keep their written order (often a scale); quiz options are shuffled per session.
  const perm = q.kind === "poll" ? q.options.map((_, i) => i) : order(session.id, index, q.options.length);
  return {
    options: perm.map((i) => q.options[i]),
    correct: q.correct == null ? null : perm.indexOf(q.correct),
    seconds: q.seconds ?? DEFAULT_SECONDS,
  };
}

export async function createSession(quizSlug: string, adminId: string) {
  const quiz = LIVE_QUIZZES[quizSlug];
  if (!quiz) throw new UserError("Unknown quiz.");
  for (let i = 0; i < 8; i++) {
    const code = Array.from({ length: 4 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
    const created = await db.liveSession.create({ data: { code, quizSlug, title: quiz.title, createdBy: adminId } }).catch(() => null);
    if (created) return created;
  }
  throw new UserError("Couldn't create a room code. Try again.");
}

export const findSession = (code: string) => db.liveSession.findUnique({ where: { code: code.trim().toUpperCase() } });

export async function currentParticipant(session: Pick<LiveSession, "id" | "code">) {
  const token = (await cookies()).get(liveCookie(session.code))?.value;
  if (!token) return null;
  const p = await db.liveParticipant.findUnique({ where: { tokenHash: sha256(token) } });
  return p && p.sessionId === session.id ? p : null;
}

export async function joinSession(code: string, rawName: string) {
  const session = await findSession(code);
  if (!session) throw new UserError("No room with that code. Check the big screen.");
  if (session.status === "ENDED") throw new UserError("This quiz has ended.");
  const existing = await currentParticipant(session);
  if (existing) return { session, participant: existing };
  const name = cleanNickname(rawName);
  if (!name) throw new UserError("Pick a name with 3–20 letters or numbers.");
  const token = randomToken(24);
  const participant = await db.liveParticipant
    .create({ data: { sessionId: session.id, name, tokenHash: sha256(token) } })
    .catch(() => {
      throw new UserError("That name is taken in this room. Try another!");
    });
  (await cookies()).set(liveCookie(session.code), token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 6 * 3600 });
  return { session, participant };
}

/** Host controls. Each transition is conditional on the state it expects, so double clicks can't skip ahead. */
export async function advance(code: string, action: "start" | "reveal" | "next" | "end") {
  const session = await findSession(code);
  if (!session) throw new UserError("Room not found.");
  const total = quizOf(session).questions.length;
  const where = { id: session.id, status: session.status, currentIndex: session.currentIndex };
  if (action === "end") {
    await db.liveSession.update({ where: { id: session.id }, data: { status: "ENDED", endedAt: new Date() } });
  } else if (action === "reveal" && session.status === "QUESTION") {
    await db.liveSession.updateMany({ where, data: { status: "REVEAL" } });
  } else if ((action === "start" && session.status === "LOBBY") || (action === "next" && session.status === "REVEAL")) {
    const nextIndex = session.currentIndex + 1;
    if (nextIndex >= total) await db.liveSession.updateMany({ where, data: { status: "ENDED", endedAt: new Date() } });
    else await db.liveSession.updateMany({ where, data: { status: "QUESTION", currentIndex: nextIndex, questionStartedAt: new Date() } });
  }
}

export async function submitAnswer(code: string, choice: number) {
  const session = await findSession(code);
  if (!session || session.status !== "QUESTION" || !session.questionStartedAt) throw new UserError("Too late for this one!");
  const participant = await currentParticipant(session);
  if (!participant) throw new UserError("Join the room first.");
  const q = quizOf(session).questions[session.currentIndex];
  const shown = shownQuestion(session, q, session.currentIndex);
  if (!Number.isInteger(choice) || choice < 0 || choice >= shown.options.length) throw new UserError("Invalid answer.");
  const elapsed = Date.now() - session.questionStartedAt.getTime();
  if (elapsed > shown.seconds * 1000 + GRACE_MS) throw new UserError("Time's up!");
  const correct = shown.correct == null ? false : choice === shown.correct;
  const points = q.kind === "poll" ? 0 : livePoints(correct, elapsed, shown.seconds);
  await db.$transaction(async (tx) => {
    const inserted = await tx.liveAnswer.createMany({
      data: [{ sessionId: session.id, participantId: participant.id, questionIndex: session.currentIndex, choice, correct, points }],
      skipDuplicates: true,
    });
    if (inserted.count === 1 && points > 0) await tx.liveParticipant.update({ where: { id: participant.id }, data: { score: { increment: points } } });
  });
}

/** The polled snapshot. Hosts see live vote counts; players see their own answer; nobody sees the key before reveal. */
export async function liveState(session: LiveSession, viewer: { host: boolean; participantId?: string | null }): Promise<LiveState> {
  const quiz = quizOf(session);
  const idx = session.currentIndex;
  const q = idx >= 0 && idx < quiz.questions.length ? quiz.questions[idx] : null;
  const shown = q ? shownQuestion(session, q, idx) : null;
  const [players, answers, top, me, roster] = await Promise.all([
    db.liveParticipant.count({ where: { sessionId: session.id } }),
    q ? db.liveAnswer.findMany({ where: { sessionId: session.id, questionIndex: idx }, select: { choice: true, participantId: true, correct: true, points: true } }) : [],
    db.liveParticipant.findMany({ where: { sessionId: session.id }, orderBy: [{ score: "desc" }, { createdAt: "asc" }], take: 5, select: { name: true, score: true } }),
    viewer.participantId ? db.liveParticipant.findUnique({ where: { id: viewer.participantId } }) : null,
    viewer.host ? db.liveParticipant.findMany({ where: { sessionId: session.id }, orderBy: { createdAt: "asc" }, take: 80, select: { name: true } }) : [],
  ]);
  const counts = shown ? shown.options.map((_, i) => answers.filter((a) => a.choice === i).length) : [];
  const revealed = session.status === "REVEAL" || session.status === "ENDED";
  const mine = me ? answers.find((a) => a.participantId === me.id) : undefined;
  const rank = me ? (await db.liveParticipant.count({ where: { sessionId: session.id, score: { gt: me.score } } })) + 1 : 0;
  return {
    code: session.code,
    title: session.title,
    status: session.status,
    serverNow: Date.now(),
    startedAt: session.questionStartedAt?.getTime() ?? null,
    question: q && shown ? { index: idx, total: quiz.questions.length, kind: q.kind, prompt: q.prompt, options: shown.options, seconds: shown.seconds, level: q.level } : null,
    reveal: q && shown && revealed ? { correct: shown.correct, explanation: q.explanation, counts } : null,
    players,
    answered: answers.length,
    leaderboard: top,
    ...(viewer.host ? { liveCounts: counts, roster: roster.map((r) => r.name) } : {}),
    me: me
      ? { name: me.name, score: me.score, rank, answer: mine ? { choice: mine.choice, correct: revealed && q?.kind === "quiz" ? mine.correct : null, points: revealed ? mine.points : 0 } : null }
      : null,
  };
}
