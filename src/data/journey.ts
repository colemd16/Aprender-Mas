import "server-only";
import { and, asc, count, eq, gte, lte, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { attempts, levels, sessions, skills, skillStates, stepProgress, stepSkills, steps } from "@/db/schema";
import { buildJourney, type CurriculumStep } from "@/domain/progress/journey";
import { SOLID_MIN_CORRECT, SOLID_RECENT_STREAK } from "@/domain/progress/rules";

// Everything the journey screen needs for one user. `userId` must come from
// getCurrentUser(): this connection bypasses RLS, so the filter here is the protection.
export async function getJourney(userId: string, viewLevelId?: number) {
  const [levelRows, stepRows, skillCounts, completedRows, [{ total }]] = await Promise.all([
    db.select({ id: levels.id, title: levels.title, summary: levels.summary }).from(levels).orderBy(asc(levels.id)),
    db
      .select({ id: steps.id, levelId: steps.levelId, position: steps.position, title: steps.title, kind: steps.kind })
      .from(steps)
      .orderBy(asc(steps.levelId), asc(steps.position)),
    db
      .select({ stepId: stepSkills.stepId, kind: skills.kind, n: count() })
      .from(stepSkills)
      .innerJoin(skills, eq(skills.id, stepSkills.skillId))
      .groupBy(stepSkills.stepId, skills.kind),
    db
      .select({ stepId: stepProgress.stepId })
      .from(stepProgress)
      .where(and(eq(stepProgress.userId, userId), eq(stepProgress.status, "completed"))),
    db.select({ total: count() }).from(skills),
  ]);

  const countsByStep = new Map<string, { form: number; usage: number }>();
  for (const { stepId, kind, n } of skillCounts) {
    const entry = countsByStep.get(stepId) ?? { form: 0, usage: 0 };
    entry[kind] = n;
    countsByStep.set(stepId, entry);
  }

  const curriculumSteps: CurriculumStep[] = stepRows.map((s) => ({
    ...s,
    formSkills: countsByStep.get(s.id)?.form ?? 0,
    usageSkills: countsByStep.get(s.id)?.usage ?? 0,
  }));

  const journey = buildJourney(levelRows, curriculumSteps, new Set(completedRows.map((r) => r.stepId)), viewLevelId);
  const solid = and(eq(skillStates.userId, userId), gte(skillStates.correctCount, SOLID_MIN_CORRECT), gte(skillStates.streak, SOLID_RECENT_STREAK));

  const [[{ solidSkills }], [{ reviewsDue }], [{ activeStepSolid }], sessionCounts] = await Promise.all([
    db.select({ solidSkills: count() }).from(skillStates).where(solid),
    db
      .select({ reviewsDue: count() })
      .from(skillStates)
      .where(and(eq(skillStates.userId, userId), ne(skillStates.state, 0), lte(skillStates.due, sql`now()`))),
    db
      .select({ activeStepSolid: count() })
      .from(skillStates)
      .innerJoin(stepSkills, eq(stepSkills.skillId, skillStates.skillId))
      .where(and(solid, eq(stepSkills.stepId, journey.activeStep?.id ?? ""))),
    // Sessions with at least one answer, per step — the cards link to them.
    db
      .select({ stepId: sessions.stepId, n: sql<number>`count(distinct ${sessions.id})::int` })
      .from(sessions)
      .innerJoin(attempts, and(eq(attempts.sessionId, sessions.id), eq(attempts.userId, userId)))
      .where(eq(sessions.userId, userId))
      .groupBy(sessions.stepId),
  ]);

  const sessionsByStep = Object.fromEntries(sessionCounts.map((r) => [r.stepId, r.n]));
  return { ...journey, totalSkills: total, solidSkills, reviewsDue, activeStepSolid, sessionsByStep };
}
