import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { attemptErrors, attempts, attemptSkillResults, sessions, skillStates, stepProgress, stepSkills, steps } from "@/db/schema";
import type { GradeResult } from "@/domain/grading/types";
import { applyRating, isSolid, isStepComplete, ratingsFor, type SkillState } from "@/domain/learner/skill-state";
import { findActiveStep } from "@/domain/progress/journey";

// Writes for practice. Every function takes the user id from getCurrentUser(): this
// connection bypasses RLS, so these filters are the protection. `tx` lets a caller (or
// a test) run them inside its own transaction.
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | Tx;

export async function startSession(userId: string, kind: "learn" | "review" | "checkpoint", stepId: string | null, tx: Executor = db) {
  return tx.transaction(async (t) => {
    const [session] = await t.insert(sessions).values({ userId, kind, stepId }).returning({ id: sessions.id });
    if (stepId) await t.insert(stepProgress).values({ userId, stepId }).onConflictDoNothing();
    return session.id;
  });
}

export type AttemptInput = {
  sessionId: string;
  kind: "form" | "sentence";
  exerciseId?: string;
  prompt: string;
  inputMode: "typed" | "spoken";
  responseMs?: number;
  result: GradeResult;
};

export type AttemptOutcome = {
  attemptId: string;
  newlySolid: string[]; // skills that became solid with this answer
  completedStepId: string | null; // the step this answer completed, if any
};

const toRow = (userId: string, skillId: string, s: SkillState) => ({
  userId,
  skillId,
  due: s.due,
  stability: s.stability,
  difficulty: s.difficulty,
  elapsedDays: s.elapsed_days,
  scheduledDays: s.scheduled_days,
  learningSteps: s.learning_steps,
  reps: s.reps,
  lapses: s.lapses,
  state: s.state,
  lastReview: s.last_review ?? null,
  correctCount: s.correctCount,
  streak: s.streak,
  solidAt: s.solidAt,
  updatedAt: new Date(),
});

const fromRow = (r: typeof skillStates.$inferSelect): SkillState => ({
  due: r.due,
  stability: r.stability,
  difficulty: r.difficulty,
  elapsed_days: r.elapsedDays,
  scheduled_days: r.scheduledDays,
  learning_steps: r.learningSteps,
  reps: r.reps,
  lapses: r.lapses,
  state: r.state,
  last_review: r.lastReview ?? undefined,
  correctCount: r.correctCount,
  streak: r.streak,
  solidAt: r.solidAt,
});

async function loadStates(t: Executor, userId: string, skillIds: string[]) {
  if (!skillIds.length) return new Map<string, SkillState>();
  const rows = await t.select().from(skillStates).where(and(eq(skillStates.userId, userId), inArray(skillStates.skillId, skillIds)));
  return new Map(rows.map((r) => [r.skillId, fromRow(r)]));
}

export async function recordAttempt(userId: string, input: AttemptInput, tx: Executor = db, now = new Date()): Promise<AttemptOutcome> {
  const { result } = input;
  return tx.transaction(async (t) => {
    const [attempt] = await t
      .insert(attempts)
      .values({
        userId,
        sessionId: input.sessionId,
        kind: input.kind,
        exerciseId: input.exerciseId ?? null,
        prompt: input.prompt,
        answer: result.answer,
        inputMode: input.inputMode,
        verdict: result.verdict,
        corrected: result.corrected,
        tip: result.tip ?? null,
        grader: result.grader,
        model: result.model ?? null,
        inputTokens: result.usage ? result.usage.inputTokens + result.usage.cacheReadTokens + result.usage.cacheWriteTokens : null,
        outputTokens: result.usage?.outputTokens ?? null,
        responseMs: input.responseMs ?? null,
        createdAt: now,
      })
      .returning({ id: attempts.id });

    const ratings = ratingsFor(result);
    if (ratings.size) {
      await t.insert(attemptSkillResults).values(
        result.skillResults.map((r) => ({ attemptId: attempt.id, userId, skillId: r.skillId, passed: r.passed, rating: ratings.get(r.skillId)! })),
      );
    }
    if (result.errors.length) {
      await t.insert(attemptErrors).values(
        result.errors.map((e) => ({
          attemptId: attempt.id,
          userId,
          errorTypeId: e.type,
          skillId: e.skillId,
          wrong: e.wrong,
          right: e.right,
          explanation: e.explanation,
          counts: e.counts,
        })),
      );
    }

    // Update each skill's card and solid counters.
    const before = await loadStates(t, userId, [...ratings.keys()]);
    const newlySolid: string[] = [];
    for (const [skillId, rating] of ratings) {
      const next = applyRating(before.get(skillId), rating, now);
      if (isSolid(next) && !isSolid(before.get(skillId))) newlySolid.push(skillId);
      await t
        .insert(skillStates)
        .values(toRow(userId, skillId, next))
        .onConflictDoUpdate({ target: [skillStates.userId, skillStates.skillId], set: toRow(userId, skillId, next) });
    }

    const completedStepId = await completeActiveStepIfSolid(t, userId, now);
    return { attemptId: attempt.id, newlySolid, completedStepId };
  });
}

// Completes the learner's active step once every skill it teaches is solid.
// Checkpoints aren't completed this way — passing the checkpoint completes them.
async function completeActiveStepIfSolid(t: Executor, userId: string, now: Date) {
  const [allSteps, completedRows] = await Promise.all([
    t.select({ id: steps.id, levelId: steps.levelId, position: steps.position, kind: steps.kind }).from(steps),
    t.select({ stepId: stepProgress.stepId }).from(stepProgress).where(and(eq(stepProgress.userId, userId), eq(stepProgress.status, "completed"))),
  ]);
  const active = findActiveStep(allSteps, new Set(completedRows.map((r) => r.stepId)));
  if (!active || active.kind !== "learn") return null;

  const skillIds = (await t.select({ skillId: stepSkills.skillId }).from(stepSkills).where(eq(stepSkills.stepId, active.id))).map((r) => r.skillId);
  if (!isStepComplete(skillIds, await loadStates(t, userId, skillIds))) return null;

  await t
    .insert(stepProgress)
    .values({ userId, stepId: active.id, status: "completed", startedAt: now, completedAt: now })
    .onConflictDoUpdate({ target: [stepProgress.userId, stepProgress.stepId], set: { status: "completed", completedAt: now } });
  return active.id;
}

export async function endSession(userId: string, sessionId: string, tx: Executor = db) {
  await tx
    .update(sessions)
    .set({ endedAt: sql`now()` })
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)));
}
