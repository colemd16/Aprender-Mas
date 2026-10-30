import "server-only";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { ERROR_TYPES } from "@/content/error-types";
import { db } from "@/db";
import { attemptErrors, attemptFollowUps, attempts, sessions, steps } from "@/db/schema";
import { diffAnswer, type DiffOp } from "@/domain/grading/diff";
import { CHECKPOINT_PASS } from "@/domain/progress/rules";

// Past sessions and everything that happened in them. `userId` must come from
// getCurrentUser(): this connection bypasses RLS, so these filters are the protection.

const ERROR_NAMES = new Map(ERROR_TYPES.map((e) => [e.id, e.name]));

export type SessionListItem = {
  id: string;
  kind: "learn" | "review" | "checkpoint";
  stepTitle: string | null;
  levelId: number | null;
  startedAt: Date;
  lastAnswerAt: Date;
  answered: number;
  correct: number;
};

// Sessions with at least one answer, newest first — optionally just one step's.
export async function listSessions(userId: string, options: { stepId?: string; limit?: number } = {}): Promise<SessionListItem[]> {
  const rows = await db
    .select({
      id: sessions.id,
      kind: sessions.kind,
      stepTitle: steps.title,
      levelId: steps.levelId,
      startedAt: sessions.startedAt,
      lastAnswerAt: sql<Date>`max(${attempts.createdAt})`.mapWith((v) => new Date(v)),
      answered: sql<number>`count(${attempts.id})::int`,
      correct: sql<number>`count(${attempts.id}) filter (where ${attempts.verdict} <> 'incorrect')::int`,
    })
    .from(sessions)
    .innerJoin(attempts, and(eq(attempts.sessionId, sessions.id), eq(attempts.userId, userId)))
    .leftJoin(steps, eq(steps.id, sessions.stepId))
    .where(and(eq(sessions.userId, userId), options.stepId ? eq(sessions.stepId, options.stepId) : undefined))
    .groupBy(sessions.id, steps.title, steps.levelId)
    .orderBy(desc(sessions.startedAt))
    .limit(options.limit ?? 100);
  return rows;
}

export type ReviewedAttempt = {
  id: string;
  kind: "form" | "sentence";
  prompt: string;
  answer: string;
  corrected: string;
  verdict: "correct" | "acceptable" | "incorrect";
  inputMode: "typed" | "spoken";
  tip: string | null;
  diff: DiffOp[];
  errors: { label: string; explanation: string; counts: boolean }[];
  followUps: { question: string; answer: string }[];
};

export type SessionReview = {
  id: string;
  kind: "learn" | "review" | "checkpoint";
  stepId: string | null;
  stepTitle: string | null;
  levelId: number | null;
  startedAt: Date;
  minutes: number;
  answered: number;
  correct: number;
  checkpoint: { passed: boolean } | null;
  attempts: ReviewedAttempt[];
};

export async function getSessionReview(userId: string, sessionId: string): Promise<SessionReview | null> {
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return null;
  const [session] = await db
    .select({ id: sessions.id, kind: sessions.kind, stepId: sessions.stepId, startedAt: sessions.startedAt, stepTitle: steps.title, levelId: steps.levelId })
    .from(sessions)
    .leftJoin(steps, eq(steps.id, sessions.stepId))
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)));
  if (!session) return null;

  const rows = await db
    .select()
    .from(attempts)
    .where(and(eq(attempts.sessionId, sessionId), eq(attempts.userId, userId)))
    .orderBy(asc(attempts.createdAt));
  const ids = rows.map((r) => r.id);
  const [errors, followUps] = ids.length
    ? await Promise.all([
        db.select().from(attemptErrors).where(and(inArray(attemptErrors.attemptId, ids), eq(attemptErrors.userId, userId))),
        db
          .select()
          .from(attemptFollowUps)
          .where(and(inArray(attemptFollowUps.attemptId, ids), eq(attemptFollowUps.userId, userId)))
          .orderBy(asc(attemptFollowUps.position)),
      ])
    : [[], []];

  const correct = rows.filter((r) => r.verdict !== "incorrect").length;
  const first = rows[0]?.createdAt ?? session.startedAt;
  const last = rows[rows.length - 1]?.createdAt ?? session.startedAt;

  return {
    ...session,
    minutes: Math.max(1, Math.round((last.getTime() - Math.min(first.getTime(), session.startedAt.getTime())) / 60_000)),
    answered: rows.length,
    correct,
    checkpoint: session.kind === "checkpoint" && rows.length ? { passed: correct / rows.length >= CHECKPOINT_PASS } : null,
    attempts: rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      prompt: r.prompt,
      answer: r.answer,
      corrected: r.corrected,
      verdict: r.verdict,
      inputMode: r.inputMode,
      tip: r.tip,
      diff: diffAnswer(r.answer, r.corrected),
      errors: errors
        .filter((e) => e.attemptId === r.id)
        .map((e) => ({ label: ERROR_NAMES.get(e.errorTypeId) ?? e.errorTypeId, explanation: e.explanation, counts: e.counts })),
      followUps: followUps.filter((f) => f.attemptId === r.id).map((f) => ({ question: f.question, answer: f.answer })),
    })),
  };
}
