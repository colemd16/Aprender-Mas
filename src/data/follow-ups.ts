import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { ERROR_TYPES } from "@/content/error-types";
import { db } from "@/db";
import { attemptErrors, attemptFollowUps, attempts, exercises } from "@/db/schema";
import type { AttemptContext, FollowUp } from "@/domain/tutor/follow-up";

// `userId` must come from getCurrentUser(): this connection bypasses RLS, so these
// filters are the protection.

const ERROR_NAMES = new Map(ERROR_TYPES.map((e) => [e.id, e.name]));

export async function getAttemptForFollowUp(userId: string, attemptId: string): Promise<{ context: AttemptContext; history: FollowUp[] } | null> {
  if (!/^[0-9a-f-]{36}$/i.test(attemptId)) return null;
  const [attempt] = await db
    .select({
      prompt: attempts.prompt,
      answer: attempts.answer,
      corrected: attempts.corrected,
      verdict: attempts.verdict,
      tip: attempts.tip,
      references: exercises.references,
    })
    .from(attempts)
    .leftJoin(exercises, eq(exercises.id, attempts.exerciseId))
    .where(and(eq(attempts.id, attemptId), eq(attempts.userId, userId)));
  if (!attempt) return null;

  const [errors, history] = await Promise.all([
    db.select().from(attemptErrors).where(and(eq(attemptErrors.attemptId, attemptId), eq(attemptErrors.userId, userId))),
    db
      .select({ question: attemptFollowUps.question, answer: attemptFollowUps.answer })
      .from(attemptFollowUps)
      .where(and(eq(attemptFollowUps.attemptId, attemptId), eq(attemptFollowUps.userId, userId)))
      .orderBy(asc(attemptFollowUps.position)),
  ]);

  return {
    context: {
      prompt: attempt.prompt,
      answer: attempt.answer,
      corrected: attempt.corrected,
      verdict: attempt.verdict,
      tip: attempt.tip,
      references: attempt.references ?? [],
      errors: errors.map((e) => ({ name: ERROR_NAMES.get(e.errorTypeId) ?? e.errorTypeId, wrong: e.wrong, right: e.right, explanation: e.explanation, counts: e.counts })),
    },
    history,
  };
}

export async function saveFollowUp(
  userId: string,
  attemptId: string,
  position: number,
  followUp: FollowUp & { model: string; inputTokens: number; outputTokens: number },
) {
  await db.insert(attemptFollowUps).values({ attemptId, userId, position, ...followUp });
}
