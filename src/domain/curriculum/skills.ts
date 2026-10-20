import { CONCEPTS } from "@/content/concepts";
import { LEVELS } from "@/content/curriculum";
import { PERSONS, PERSON_LABELS, type Person } from "@/content/persons";
import { TENSES, type TenseId } from "@/content/tenses";

export type SkillRow = {
  id: string;
  kind: "form" | "usage";
  title: string;
  conceptId: string | null;
  infinitive: string | null;
  tenseId: TenseId | null;
  person: Person | null;
};

export type StepRow = {
  id: string;
  levelId: number;
  position: number;
  title: string;
  kind: "learn" | "checkpoint";
  conceptId: string | null;
};

const TENSE_NAMES = new Map<string, string>(TENSES.map((t) => [t.id, t.nameEn]));

export function formSkillId(infinitive: string, tense: TenseId, person: Person) {
  return `form:${infinitive}:${tense}:${person}`;
}

export const checkpointStepId = (level: number) => `l${level}-checkpoint`;

// Expands the curriculum into rows for steps, skills and step_skills.
export function buildCurriculum() {
  const usageSkills = new Map<string, SkillRow>();
  for (const concept of CONCEPTS) {
    for (const skill of concept.usageSkills ?? []) {
      usageSkills.set(skill.id, {
        id: skill.id,
        kind: "usage",
        title: skill.title,
        conceptId: concept.id,
        infinitive: null,
        tenseId: null,
        person: null,
      });
    }
  }

  const steps: StepRow[] = [];
  const formSkills = new Map<string, SkillRow>();
  const stepSkills: { stepId: string; skillId: string }[] = [];

  for (const level of LEVELS) {
    level.steps.forEach((step, i) => {
      steps.push({
        id: step.id,
        levelId: level.number,
        position: i + 1,
        title: step.title,
        kind: "learn",
        conceptId: step.concept ?? null,
      });

      for (const verb of step.forms?.verbs ?? []) {
        for (const tense of step.forms!.tenses) {
          for (const person of step.forms!.persons ?? PERSONS) {
            const id = formSkillId(verb, tense, person);
            formSkills.set(id, {
              id,
              kind: "form",
              title: `${verb} · ${TENSE_NAMES.get(tense)} · ${PERSON_LABELS[person]}`,
              conceptId: step.concept ?? null,
              infinitive: verb,
              tenseId: tense,
              person,
            });
            stepSkills.push({ stepId: step.id, skillId: id });
          }
        }
      }

      for (const skillId of step.usage ?? []) {
        if (!usageSkills.has(skillId)) throw new Error(`Step ${step.id}: unknown usage skill ${skillId}`);
        stepSkills.push({ stepId: step.id, skillId });
      }
    });

    steps.push({
      id: checkpointStepId(level.number),
      levelId: level.number,
      position: level.steps.length + 1,
      title: `Level ${level.number} checkpoint`,
      kind: "checkpoint",
      conceptId: null,
    });
  }

  const conceptIds = new Set(CONCEPTS.map((c) => c.id));
  for (const step of steps) {
    if (step.conceptId && !conceptIds.has(step.conceptId)) {
      throw new Error(`Step ${step.id}: unknown concept ${step.conceptId}`);
    }
  }
  const seen = new Set<string>();
  for (const { stepId, skillId } of stepSkills) {
    if (seen.has(skillId)) throw new Error(`Skill ${skillId} is introduced by more than one step (again in ${stepId})`);
    seen.add(skillId);
  }
  for (const skillId of usageSkills.keys()) {
    if (!seen.has(skillId)) throw new Error(`Usage skill ${skillId} isn't taught by any step`);
  }

  return { steps, skills: [...usageSkills.values(), ...formSkills.values()], stepSkills };
}
