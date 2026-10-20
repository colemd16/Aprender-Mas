import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { LEVELS } from "@/content/curriculum";
import { db } from "@/db";
import { concepts, levels, skills, stepProgress, stepSkills, steps, tenses, verbForms } from "@/db/schema";
import { buildFormTables } from "@/domain/curriculum/form-tables";
import { stepState } from "@/domain/progress/journey";

// Everything the step intro needs. Returns null for an unknown step; callers send
// locked steps back to the journey. `userId` must come from getCurrentUser().
export async function getStepIntro(userId: string, stepId: string) {
  const [step] = await db
    .select({
      id: steps.id,
      title: steps.title,
      kind: steps.kind,
      position: steps.position,
      levelId: steps.levelId,
      levelTitle: levels.title,
      conceptTitle: concepts.title,
      conceptSummary: concepts.summary,
      explanation: concepts.explanation,
    })
    .from(steps)
    .innerJoin(levels, eq(levels.id, steps.levelId))
    .leftJoin(concepts, eq(concepts.id, steps.conceptId))
    .where(eq(steps.id, stepId));
  if (!step) return null;

  const [allSteps, completedRows, skillRows, formRows] = await Promise.all([
    db.select({ id: steps.id, levelId: steps.levelId, position: steps.position, title: steps.title, kind: steps.kind }).from(steps).orderBy(asc(steps.levelId), asc(steps.position)),
    db.select({ stepId: stepProgress.stepId }).from(stepProgress).where(and(eq(stepProgress.userId, userId), eq(stepProgress.status, "completed"))),
    db
      .select({ id: skills.id, kind: skills.kind, title: skills.title })
      .from(stepSkills)
      .innerJoin(skills, eq(skills.id, stepSkills.skillId))
      .where(eq(stepSkills.stepId, stepId)),
    db
      .select({
        infinitive: verbForms.infinitive,
        tenseId: verbForms.tenseId,
        tenseName: tenses.nameEn,
        tenseExample: tenses.englishExample,
        mood: tenses.mood,
        tensePosition: tenses.position,
        person: verbForms.person,
        form: verbForms.form,
        alternates: verbForms.alternates,
        isIrregular: verbForms.isIrregular,
      })
      .from(stepSkills)
      .innerJoin(skills, eq(skills.id, stepSkills.skillId))
      .innerJoin(
        verbForms,
        and(eq(verbForms.infinitive, skills.infinitive), eq(verbForms.tenseId, skills.tenseId), eq(verbForms.person, skills.person)),
      )
      .innerJoin(tenses, eq(tenses.id, verbForms.tenseId))
      .where(and(eq(stepSkills.stepId, stepId), eq(skills.kind, "form"))),
  ]);

  const completed = new Set(completedRows.map((r) => r.stepId));
  const levelSteps = allSteps.filter((s) => s.levelId === step.levelId);
  const verbOrder = LEVELS.flatMap((l) => l.steps).find((s) => s.id === stepId)?.forms?.verbs ?? [];

  return {
    ...step,
    state: stepState(allSteps, completed, stepId),
    isFinalLevel: step.levelId === Math.max(...allSteps.map((s) => s.levelId)),
    learnStepCount: levelSteps.filter((s) => s.kind === "learn").length,
    levelSteps: levelSteps.filter((s) => s.kind === "learn").map((s) => s.title),
    formSkillCount: skillRows.filter((s) => s.kind === "form").length,
    usageSkills: skillRows.filter((s) => s.kind === "usage").map((s) => s.title),
    tables: buildFormTables(formRows, verbOrder),
  };
}
