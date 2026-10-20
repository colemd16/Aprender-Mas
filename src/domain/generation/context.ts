import { CONCEPTS } from "@/content/concepts";
import { LEVELS } from "@/content/curriculum";
import type { Person } from "@/content/persons";
import { TENSES, type TenseId } from "@/content/tenses";
import { buildCurriculum } from "@/domain/curriculum/skills";

// What a step's practice sentences may use: the grammar taught up to and including
// that step, never anything later.

export type FormTarget = { id: string; title: string; infinitive: string; tenseId: TenseId; person: Person };

export type StepContext = {
  stepId: string;
  level: { number: number; title: string };
  title: string;
  concept: { title: string; explanation: string } | null;
  targetUsage: { id: string; title: string }[];
  targetForms: FormTarget[];
  stepSkillIds: Set<string>; // what this step teaches
  availableSkillIds: Set<string>; // everything taught so far, this step included
  knownVerbs: string[];
  taughtTenses: { id: TenseId; name: string }[];
};

const TENSE_NAMES = new Map<string, string>(TENSES.map((t) => [t.id, t.nameEn]));

export function buildStepContexts(): StepContext[] {
  const { skills, stepSkills } = buildCurriculum();
  const skillById = new Map(skills.map((s) => [s.id, s]));
  const concepts = new Map(CONCEPTS.map((c) => [c.id, c]));

  const contexts: StepContext[] = [];
  const knownVerbs: string[] = [];
  const taughtTenses: TenseId[] = [];
  const available = new Set<string>();

  for (const level of LEVELS) {
    for (const step of level.steps) {
      for (const v of step.forms?.verbs ?? []) if (!knownVerbs.includes(v)) knownVerbs.push(v);
      for (const t of step.forms?.tenses ?? []) if (!taughtTenses.includes(t)) taughtTenses.push(t);

      const own = stepSkills.filter((s) => s.stepId === step.id).map((s) => skillById.get(s.skillId)!);
      for (const s of own) available.add(s.id);
      const concept = step.concept ? concepts.get(step.concept) : undefined;

      contexts.push({
        stepId: step.id,
        level: { number: level.number, title: level.title },
        title: step.title,
        concept: concept ? { title: concept.title, explanation: concept.explanation } : null,
        targetUsage: own.filter((s) => s.kind === "usage").map((s) => ({ id: s.id, title: s.title })),
        targetForms: own
          .filter((s) => s.kind === "form")
          .map((s) => ({ id: s.id, title: s.title, infinitive: s.infinitive!, tenseId: s.tenseId!, person: s.person! })),
        stepSkillIds: new Set(own.map((s) => s.id)),
        availableSkillIds: new Set(available),
        knownVerbs: [...knownVerbs],
        taughtTenses: taughtTenses.map((id) => ({ id, name: TENSE_NAMES.get(id) ?? id })),
      });
    }
  }
  return contexts;
}
