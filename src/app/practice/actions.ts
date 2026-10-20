"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ERROR_TYPES } from "@/content/error-types";
import { db } from "@/db";
import { attempts, checkpointAttempts, stepProgress, steps } from "@/db/schema";
import { endSession, recordAttempt, startSession } from "@/data/attempts";
import { getAccentLexicon } from "@/data/lexicon";
import {
  canOpenStep,
  getAccentMode,
  getOwnedSession,
  getSkillTitles,
  getStepSolidCount,
  getStepTitle,
  loadFormExercise,
  loadSentenceExercise,
} from "@/data/practice";
import { diffAnswer, type DiffOp } from "@/domain/grading/diff";
import { gradeForm } from "@/domain/grading/form-grader";
import { gradeSentence, GradingUnavailableError } from "@/domain/grading/sentence/grade";
import type { Verdict } from "@/domain/grading/types";
import { findActiveStep } from "@/domain/progress/journey";
import { CHECKPOINT_PASS } from "@/domain/progress/rules";
import { getCurrentUser } from "@/lib/auth";
import { anthropic, GRADING_MODEL } from "@/lib/anthropic";

const ERROR_NAMES = new Map(ERROR_TYPES.map((e) => [e.id, e.name]));

export async function startPractice(stepId: string) {
  const user = await getCurrentUser();
  const step = await canOpenStep(user.id, stepId);
  if (!step) redirect("/");
  const sessionId = await startSession(user.id, step.kind === "checkpoint" ? "checkpoint" : "learn", stepId);
  redirect(`/practice/${sessionId}`);
}

export type AnswerInput = {
  sessionId: string;
  item: { kind: "form"; skillId: string } | { kind: "sentence"; exerciseId: string };
  prompt: string;
  answer: string;
  inputMode: "typed" | "spoken";
  responseMs: number;
};

export type AnswerFeedback =
  | {
      ok: true;
      verdict: Verdict;
      answer: string;
      corrected: string;
      diff: DiffOp[];
      errors: { label: string; explanation: string; counts: boolean }[];
      tip: string | null;
      newlySolid: string[];
      progress: { solid: number; total: number } | null;
      stepCompleted: { title: string; next: string | null } | null;
    }
  | { ok: false; message: string };

export async function submitAnswer(input: AnswerInput): Promise<AnswerFeedback> {
  const user = await getCurrentUser();
  const session = await getOwnedSession(user.id, input.sessionId);
  if (!session || session.endedAt) return { ok: false, message: "This session has ended." };
  const answer = input.answer.slice(0, 500);
  if (!answer.trim()) return { ok: false, message: "Type an answer first." };

  const accentMode = await getAccentMode(user.id);
  let result;
  try {
    if (input.item.kind === "form") {
      const exercise = await loadFormExercise(input.item.skillId);
      if (!exercise) return { ok: false, message: "That question isn't available any more." };
      result = gradeForm(exercise, answer, accentMode);
    } else {
      const exercise = await loadSentenceExercise(input.item.exerciseId);
      if (!exercise) return { ok: false, message: "That sentence isn't available any more." };
      result = await gradeSentence(exercise, answer, { client: anthropic(), model: GRADING_MODEL, accentMode, lexicon: await getAccentLexicon() });
    }
  } catch (err) {
    if (err instanceof GradingUnavailableError) return { ok: false, message: "Couldn't grade that one — try again." };
    console.error("grading failed", err);
    return { ok: false, message: "Grading is unavailable right now. Check your connection and try again." };
  }

  const outcome = await recordAttempt(user.id, {
    sessionId: session.id,
    kind: input.item.kind,
    exerciseId: input.item.kind === "sentence" ? input.item.exerciseId : undefined,
    prompt: input.prompt.slice(0, 500),
    inputMode: input.inputMode,
    responseMs: Math.max(0, Math.min(input.responseMs, 30 * 60_000)),
    result,
  });

  const titles = await getSkillTitles(outcome.newlySolid);
  let stepCompleted: { title: string; next: string | null } | null = null;
  if (outcome.completedStepId) {
    const allSteps = await db.select({ id: steps.id, levelId: steps.levelId, position: steps.position, title: steps.title }).from(steps);
    const done = await db.select({ stepId: stepProgress.stepId }).from(stepProgress).where(and(eq(stepProgress.userId, user.id), eq(stepProgress.status, "completed")));
    const next = findActiveStep(allSteps, new Set(done.map((d) => d.stepId)));
    stepCompleted = { title: (await getStepTitle(outcome.completedStepId)) ?? "Step", next: next?.title ?? null };
    revalidatePath("/");
  }

  return {
    ok: true,
    verdict: result.verdict,
    answer: result.answer,
    corrected: result.corrected,
    diff: diffAnswer(result.answer, result.corrected),
    errors: result.errors.map((e) => ({ label: ERROR_NAMES.get(e.type) ?? e.type, explanation: e.explanation, counts: e.counts })),
    tip: result.tip ?? null,
    newlySolid: outcome.newlySolid.map((id) => titles.get(id) ?? id),
    progress: session.kind === "learn" && session.stepId ? await getStepSolidCount(user.id, session.stepId) : null,
    stepCompleted,
  };
}

export type SessionSummary = {
  answered: number;
  correct: number; // correct or acceptable
  checkpoint: { score: number; passed: boolean; nextLevelUnlocked: boolean } | null;
};

export async function finishSession(sessionId: string): Promise<SessionSummary> {
  const user = await getCurrentUser();
  const session = await getOwnedSession(user.id, sessionId);
  if (!session) redirect("/");

  const rows = await db.select({ verdict: attempts.verdict }).from(attempts).where(and(eq(attempts.sessionId, session.id), eq(attempts.userId, user.id)));
  const correct = rows.filter((r) => r.verdict !== "incorrect").length;

  let checkpoint: SessionSummary["checkpoint"] = null;
  if (session.kind === "checkpoint" && session.stepId && !session.endedAt && rows.length) {
    const score = correct / rows.length;
    const passed = score >= CHECKPOINT_PASS;
    await db.transaction(async (tx) => {
      await tx.insert(checkpointAttempts).values({ userId: user.id, stepId: session.stepId!, score, passed });
      if (passed) {
        await tx
          .insert(stepProgress)
          .values({ userId: user.id, stepId: session.stepId!, status: "completed", completedAt: new Date() })
          .onConflictDoUpdate({ target: [stepProgress.userId, stepProgress.stepId], set: { status: "completed", completedAt: new Date() } });
      }
    });
    checkpoint = { score, passed, nextLevelUnlocked: passed };
  }

  if (!session.endedAt) await endSession(user.id, session.id);
  revalidatePath("/");
  return { answered: rows.length, correct, checkpoint };
}
