import { CHECKPOINT_PASS, CHECKPOINT_SIZE } from "./rules";

export type CurriculumLevel = { id: number; title: string; summary: string };
export type CurriculumStep = {
  id: string;
  levelId: number;
  position: number;
  title: string;
  kind: "learn" | "checkpoint";
  formSkills: number;
  usageSkills: number;
};

export type LevelState = "done" | "current" | "locked";
export type StepState = "done" | "active" | "upcoming";

export type JourneyStep = CurriculumStep & { state: StepState; meta: string; skillCount: number };
export type JourneyLevel = CurriculumLevel & { state: LevelState };

export type Journey = {
  levels: JourneyLevel[];
  currentLevel: JourneyLevel;
  steps: JourneyStep[]; // the current level's steps
  activeStep: JourneyStep | null; // null once every step in the curriculum is done
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function stepMeta(step: Pick<CurriculumStep, "kind" | "formSkills" | "usageSkills">) {
  if (step.kind === "checkpoint") {
    return `${CHECKPOINT_SIZE} mixed sentences · ${Math.round(CHECKPOINT_PASS * 100)}% to pass`;
  }
  const parts: string[] = [];
  if (step.formSkills) parts.push(plural(step.formSkills, "form"));
  if (step.usageSkills) parts.push(plural(step.usageSkills, "usage skill"));
  return parts.join(" · ");
}

type OrderedStep = Pick<CurriculumStep, "id" | "levelId" | "position">;

// The active step is the first step, in curriculum order, that isn't completed.
export function findActiveStep<T extends OrderedStep>(steps: T[], completed: Set<string>): T | null {
  const ordered = [...steps].sort((a, b) => a.levelId - b.levelId || a.position - b.position);
  return ordered.find((s) => !completed.has(s.id)) ?? null;
}

// Only completed steps and the active one can be opened; everything after is locked.
export function stepState(steps: OrderedStep[], completed: Set<string>, stepId: string): StepState {
  if (completed.has(stepId)) return "done";
  return findActiveStep(steps, completed)?.id === stepId ? "active" : "upcoming";
}

// The active step's level is the current one; levels before it are done, levels after are locked.
export function buildJourney(levels: CurriculumLevel[], steps: CurriculumStep[], completed: Set<string>): Journey {
  const ordered = [...steps].sort((a, b) => a.levelId - b.levelId || a.position - b.position);
  const active = findActiveStep(ordered, completed);
  const currentLevelId = active?.levelId ?? Math.max(...levels.map((l) => l.id));

  const journeyLevels = [...levels]
    .sort((a, b) => a.id - b.id)
    .map((level): JourneyLevel => ({
      ...level,
      state: level.id < currentLevelId || (!active && level.id === currentLevelId) ? "done" : level.id === currentLevelId ? "current" : "locked",
    }));

  const levelSteps = ordered
    .filter((s) => s.levelId === currentLevelId)
    .map((s): JourneyStep => ({
      ...s,
      state: completed.has(s.id) ? "done" : s.id === active?.id ? "active" : "upcoming",
      meta: stepMeta(s),
      skillCount: s.formSkills + s.usageSkills,
    }));

  return {
    levels: journeyLevels,
    currentLevel: journeyLevels.find((l) => l.id === currentLevelId)!,
    steps: levelSteps,
    activeStep: levelSteps.find((s) => s.state === "active") ?? null,
  };
}
