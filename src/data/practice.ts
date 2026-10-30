import "server-only";
import { and, asc, eq, gte, inArray, isNull, lte, ne, notInArray, sql } from "drizzle-orm";
import { PERSON_LABELS, IMPERATIVE_PERSON_LABELS, type Person } from "@/content/persons";
import type { TenseId } from "@/content/tenses";
import { db } from "@/db";
import {
  attempts,
  exerciseFlags,
  exercises,
  exerciseSkills,
  profiles,
  sessions,
  skills,
  skillStates,
  stepProgress,
  steps,
  stepSkills,
  tenses,
  verbForms,
  verbs,
} from "@/db/schema";
import type { FormExercise } from "@/domain/grading/form-grader";
import type { SentenceExercise } from "@/domain/grading/sentence/prompt";
import { planCheckpoint, planLearnSession, type PlanExercise, type PlannedItem, type PlanSkill } from "@/domain/practice/planner";
import { findActiveStep, stepState } from "@/domain/progress/journey";
import { answersToSolid } from "@/domain/learner/skill-state";
import { SOLID_MIN_CORRECT, SOLID_RECENT_STREAK } from "@/domain/progress/rules";

// Reads for practice. `userId` must come from getCurrentUser(): this connection
// bypasses RLS, so these filters are the protection.

export type PracticeItem =
  | { key: string; kind: "form"; skillId: string; infinitive: string; verbEnglish: string; tense: string; tenseExample: string; person: string }
  | { key: string; kind: "sentence"; skillId: string; exerciseId: string; prompt: string; hints: Record<string, string> };

const RECENT_DAYS = 7;
const isSolidSql = and(gte(skillStates.correctCount, SOLID_MIN_CORRECT), gte(skillStates.streak, SOLID_RECENT_STREAK));

export async function getOwnedSession(userId: string, sessionId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return null;
  const [row] = await db
    .select({ id: sessions.id, kind: sessions.kind, stepId: sessions.stepId, endedAt: sessions.endedAt, stepTitle: steps.title, levelId: steps.levelId })
    .from(sessions)
    .leftJoin(steps, eq(steps.id, sessions.stepId))
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)));
  return row ?? null;
}

export async function canOpenStep(userId: string, stepId: string) {
  const [allSteps, completed, [target]] = await Promise.all([
    db.select({ id: steps.id, levelId: steps.levelId, position: steps.position }).from(steps),
    db.select({ stepId: stepProgress.stepId }).from(stepProgress).where(and(eq(stepProgress.userId, userId), eq(stepProgress.status, "completed"))),
    db.select({ kind: steps.kind }).from(steps).where(eq(steps.id, stepId)),
  ]);
  if (!target) return null;
  const state = stepState(allSteps, new Set(completed.map((c) => c.stepId)), stepId);
  return state === "upcoming" ? null : { kind: target.kind };
}

async function exercisesFor(userId: string, where: ReturnType<typeof and>) {
  const flagged = db.select({ id: exerciseFlags.exerciseId }).from(exerciseFlags).where(eq(exerciseFlags.userId, userId));
  const rows = await db
    .select({ id: exercises.id, stepId: exercises.stepId, skillId: exerciseSkills.skillId })
    .from(exercises)
    .innerJoin(exerciseSkills, eq(exerciseSkills.exerciseId, exercises.id))
    .where(and(isNull(exercises.retiredAt), notInArray(exercises.id, flagged), where));
  const recent = await db
    .selectDistinct({ id: attempts.exerciseId })
    .from(attempts)
    .where(and(eq(attempts.userId, userId), gte(attempts.createdAt, sql`now() - make_interval(days => ${RECENT_DAYS})`)));
  const seen = new Set(recent.map((r) => r.id));

  const byId = new Map<string, PlanExercise & { stepId: string | null }>();
  for (const r of rows) {
    const e = byId.get(r.id) ?? { id: r.id, stepId: r.stepId, skillIds: [], recentlySeen: seen.has(r.id) };
    e.skillIds.push(r.skillId);
    byId.set(r.id, e);
  }
  return [...byId.values()];
}

// Steps the learner has reached: everything up to the active step (or the session's own
// step, if that's further). Practice never uses grammar from beyond them — a sentence
// written for a later step can share a skill (it uses *está*) but still teach ahead.
async function reachedStepIds(userId: string, sessionStepId: string | null) {
  const [allSteps, completed] = await Promise.all([
    db.select({ id: steps.id, levelId: steps.levelId, position: steps.position }).from(steps),
    db.select({ stepId: stepProgress.stepId }).from(stepProgress).where(and(eq(stepProgress.userId, userId), eq(stepProgress.status, "completed"))),
  ]);
  const ordered = allSteps.sort((a, b) => a.levelId - b.levelId || a.position - b.position);
  const active = findActiveStep(ordered, new Set(completed.map((c) => c.stepId)));
  const frontier = Math.max(
    active ? ordered.findIndex((s) => s.id === active.id) : ordered.length - 1,
    ordered.findIndex((s) => s.id === sessionStepId),
  );
  return ordered.slice(0, frontier + 1).map((s) => s.id);
}

async function planFor(userId: string, session: NonNullable<Awaited<ReturnType<typeof getOwnedSession>>>): Promise<PlannedItem[]> {
  if (session.kind === "checkpoint" && session.levelId) {
    const levelSteps = await db.select({ id: steps.id }).from(steps).where(and(eq(steps.levelId, session.levelId), eq(steps.kind, "learn")));
    const pool = await exercisesFor(userId, inArray(exercises.stepId, levelSteps.map((s) => s.id)));
    const byStep = new Map<string, PlanExercise[]>();
    for (const e of pool) byStep.set(e.stepId!, [...(byStep.get(e.stepId!) ?? []), e]);
    return planCheckpoint(byStep);
  }

  const stepSkillRows = await db
    .select({ id: skills.id, kind: skills.kind, correctCount: skillStates.correctCount, solid: sql<boolean>`coalesce(${isSolidSql}, false)` })
    .from(stepSkills)
    .innerJoin(skills, eq(skills.id, stepSkills.skillId))
    .leftJoin(skillStates, and(eq(skillStates.skillId, skills.id), eq(skillStates.userId, userId)))
    .where(eq(stepSkills.stepId, session.stepId ?? ""))
    .orderBy(asc(skills.id));
  const stepSkillIds = stepSkillRows.map((s) => s.id);
  const reached = await reachedStepIds(userId, session.stepId);

  const reviewRows = await db
    .select({ id: skills.id, kind: skills.kind, correctCount: skillStates.correctCount, solid: sql<boolean>`${isSolidSql}` })
    .from(skillStates)
    .innerJoin(skills, eq(skills.id, skillStates.skillId))
    .innerJoin(stepSkills, eq(stepSkills.skillId, skills.id))
    .where(
      and(
        eq(skillStates.userId, userId),
        ne(skillStates.state, 0),
        lte(skillStates.due, sql`now()`),
        inArray(stepSkills.stepId, reached),
        stepSkillIds.length ? notInArray(skills.id, stepSkillIds) : undefined,
      ),
    )
    .orderBy(asc(skillStates.due))
    .limit(20);

  const toPlanSkill = (r: (typeof stepSkillRows)[number]): PlanSkill => ({ id: r.id, kind: r.kind, correctCount: r.correctCount ?? 0, solid: r.solid });
  const skillIds = [...stepSkillIds, ...reviewRows.map((r) => r.id)];
  const pool = skillIds.length ? await exercisesFor(userId, and(inArray(exerciseSkills.skillId, skillIds), inArray(exercises.stepId, reached))) : [];
  return planLearnSession(stepSkillRows.map(toPlanSkill), reviewRows.map(toPlanSkill), pool);
}

// The session's questions, with everything the screen shows — and nothing it
// shouldn't (no answers).
export async function getSessionPlan(userId: string, session: NonNullable<Awaited<ReturnType<typeof getOwnedSession>>>): Promise<PracticeItem[]> {
  const plan = await planFor(userId, session);

  const formSkillIds = plan.filter((p) => p.kind === "form").map((p) => p.skillId);
  const exerciseIds = plan.flatMap((p) => (p.kind === "sentence" ? [p.exerciseId] : []));
  const [formRows, exerciseRows] = await Promise.all([
    formSkillIds.length
      ? db
          .select({ id: skills.id, infinitive: skills.infinitive, person: skills.person, tense: tenses.nameEn, mood: tenses.mood, example: tenses.englishExample, verbEnglish: verbs.english })
          .from(skills)
          .innerJoin(tenses, eq(tenses.id, skills.tenseId))
          .innerJoin(verbs, eq(verbs.infinitive, skills.infinitive))
          .where(inArray(skills.id, formSkillIds))
      : [],
    exerciseIds.length ? db.select({ id: exercises.id, prompt: exercises.prompt, hints: exercises.hints }).from(exercises).where(inArray(exercises.id, exerciseIds)) : [],
  ]);
  const forms = new Map(formRows.map((f) => [f.id, f]));
  const sentences = new Map(exerciseRows.map((e) => [e.id, e]));

  return plan.flatMap((p, i): PracticeItem[] => {
    if (p.kind === "form") {
      const f = forms.get(p.skillId);
      if (!f) return [];
      const labels = f.mood === "imperative" ? IMPERATIVE_PERSON_LABELS : PERSON_LABELS;
      return [{ key: `${i}`, kind: "form", skillId: p.skillId, infinitive: f.infinitive!, verbEnglish: f.verbEnglish.split(/[;,]/)[0], tense: f.tense, tenseExample: f.example, person: labels[f.person as Person] }];
    }
    const e = sentences.get(p.exerciseId);
    return e ? [{ key: `${i}`, kind: "sentence", skillId: p.skillId, exerciseId: e.id, prompt: e.prompt, hints: e.hints }] : [];
  });
}

export async function loadFormExercise(skillId: string): Promise<FormExercise | null> {
  const [skill] = await db
    .select({ infinitive: skills.infinitive, tenseId: skills.tenseId, person: skills.person })
    .from(skills)
    .where(and(eq(skills.id, skillId), eq(skills.kind, "form")));
  if (!skill?.infinitive) return null;
  const all = await db.select().from(verbForms).where(eq(verbForms.infinitive, skill.infinitive));
  const expected = all.find((f) => f.tenseId === skill.tenseId && f.person === skill.person);
  if (!expected) return null;
  const known = all.map((f) => ({ tenseId: f.tenseId as TenseId, person: f.person, form: f.form, alternates: f.alternates }));
  return {
    skillId,
    infinitive: skill.infinitive,
    expected: { tenseId: expected.tenseId as TenseId, person: expected.person, form: expected.form, alternates: expected.alternates, isIrregular: expected.isIrregular },
    verbForms: known,
  };
}

export async function loadSentenceExercise(exerciseId: string): Promise<SentenceExercise | null> {
  if (!/^[0-9a-f-]{36}$/i.test(exerciseId)) return null;
  const [e] = await db.select().from(exercises).where(and(eq(exercises.id, exerciseId), isNull(exercises.retiredAt)));
  if (!e) return null;
  const linked = await db
    .select({ id: skills.id, title: skills.title })
    .from(exerciseSkills)
    .innerJoin(skills, eq(skills.id, exerciseSkills.skillId))
    .where(eq(exerciseSkills.exerciseId, exerciseId));
  return { prompt: e.prompt, references: e.references, hints: e.hints, skills: linked };
}

export async function getAccentMode(userId: string) {
  const [p] = await db.select({ accentMode: profiles.accentMode }).from(profiles).where(eq(profiles.id, userId));
  return p?.accentMode ?? "warn";
}

export async function getStepSolidCount(userId: string, stepId: string) {
  const [[{ total }], [{ solid }]] = await Promise.all([
    db.select({ total: sql<number>`count(*)::int` }).from(stepSkills).where(eq(stepSkills.stepId, stepId)),
    db
      .select({ solid: sql<number>`count(*)::int` })
      .from(stepSkills)
      .innerJoin(skillStates, and(eq(skillStates.skillId, stepSkills.skillId), eq(skillStates.userId, userId)))
      .where(and(eq(stepSkills.stepId, stepId), isSolidSql)),
  ]);
  return { solid, total };
}

// Each skill in a step, and how many more correct answers it needs to be solid.
export async function getStepSkillProgress(userId: string, stepId: string) {
  const rows = await db
    .select({ id: skills.id, title: skills.title, correctCount: skillStates.correctCount, streak: skillStates.streak })
    .from(stepSkills)
    .innerJoin(skills, eq(skills.id, stepSkills.skillId))
    .leftJoin(skillStates, and(eq(skillStates.skillId, skills.id), eq(skillStates.userId, userId)))
    .where(eq(stepSkills.stepId, stepId))
    .orderBy(asc(skills.kind), asc(skills.id));
  return rows.map((r) => {
    const needed = answersToSolid({ correctCount: r.correctCount ?? 0, streak: r.streak ?? 0 });
    return { id: r.id, title: r.title, needed, solid: needed === 0 };
  });
}

export async function getSkillTitles(skillIds: string[]) {
  if (!skillIds.length) return new Map<string, string>();
  const rows = await db.select({ id: skills.id, title: skills.title }).from(skills).where(inArray(skills.id, skillIds));
  return new Map(rows.map((r) => [r.id, r.title]));
}

export async function getStepTitle(stepId: string) {
  const [s] = await db.select({ title: steps.title }).from(steps).where(eq(steps.id, stepId));
  return s?.title ?? null;
}
