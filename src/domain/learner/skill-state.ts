import { createEmptyCard, fsrs, generatorParameters, Rating, State, type Card, type Grade } from "ts-fsrs";
import type { GradeResult } from "@/domain/grading/types";
import { SOLID_MIN_CORRECT, SOLID_RECENT_STREAK } from "@/domain/progress/rules";

// What the app knows about one skill for one learner: a spaced-repetition card (when
// to see it next, how well it's retained) plus the counters behind "solid".
export type SkillState = Card & { correctCount: number; streak: number; solidAt: Date | null };

const scheduler = fsrs(generatorParameters({ enable_fuzz: true }));

// How an answer grades each skill it touched:
//   Again — the skill was wrong
//   Hard  — right, but with a note against it (e.g. a missing accent)
//   Good  — right
export function ratingsFor(result: GradeResult): Map<string, Grade> {
  const ratings = new Map<string, Grade>();
  for (const { skillId, passed } of result.skillResults) {
    const noted = result.errors.some((e) => e.skillId === skillId && !e.counts);
    ratings.set(skillId, !passed ? Rating.Again : noted ? Rating.Hard : Rating.Good);
  }
  return ratings;
}

export function isSolid(state: Pick<SkillState, "correctCount" | "streak"> | undefined) {
  return !!state && state.correctCount >= SOLID_MIN_CORRECT && state.streak >= SOLID_RECENT_STREAK;
}

export function applyRating(previous: SkillState | undefined, rating: Grade, now: Date): SkillState {
  const card = scheduler.next(previous ?? createEmptyCard(now), now, rating).card;
  const passed = rating !== Rating.Again;
  const next: SkillState = {
    ...card,
    correctCount: (previous?.correctCount ?? 0) + (passed ? 1 : 0),
    streak: passed ? (previous?.streak ?? 0) + 1 : 0,
    solidAt: previous?.solidAt ?? null,
  };
  if (!next.solidAt && isSolid(next)) next.solidAt = now;
  return next;
}

// A skill is due for review once it has been learned and its review date has arrived.
export function isDue(state: Pick<SkillState, "state" | "due">, now: Date) {
  return state.state !== State.New && state.due.getTime() <= now.getTime();
}

// A learn step is complete when every skill it teaches is solid.
export function isStepComplete(stepSkillIds: string[], states: Map<string, SkillState>) {
  return stepSkillIds.length > 0 && stepSkillIds.every((id) => isSolid(states.get(id)));
}
