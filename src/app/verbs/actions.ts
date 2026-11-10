"use server";

import { ERROR_TYPES } from "@/content/error-types";
import { PERSONS, type Person } from "@/content/persons";
import { getAccentMode } from "@/data/practice";
import { gradeVerbAnswer, planVerbChallenge, VERB_SETS, type ChallengeOptions, type VerbCard } from "@/data/verbs";
import { diffAnswer, type DiffOp } from "@/domain/grading/diff";
import type { Verdict } from "@/domain/grading/types";
import { getCurrentUser } from "@/lib/auth";

const ERROR_NAMES = new Map(ERROR_TYPES.map((e) => [e.id, e.name]));

// Only the fields a challenge is defined by, whatever the client sends.
function cleanOptions(o: ChallengeOptions): ChallengeOptions {
  return {
    verb: typeof o.verb === "string" ? o.verb.slice(0, 60) : undefined,
    tense: typeof o.tense === "string" ? o.tense.slice(0, 60) : undefined,
    set: VERB_SETS.includes(o.set as never) ? o.set : undefined,
    tenses: Array.isArray(o.tenses) ? o.tenses.filter((t) => typeof t === "string").slice(0, 30) : undefined,
  };
}

export async function moreVerbCards(options: ChallengeOptions, previous?: { infinitive: string; tenseId: string; person: Person }): Promise<VerbCard[]> {
  const user = await getCurrentUser();
  return planVerbChallenge(user.id, cleanOptions(options), previous);
}

export type VerbFeedback =
  | {
      ok: true;
      verdict: Verdict;
      answer: string;
      corrected: string;
      diff: DiffOp[];
      note: { label: string; explanation: string } | null; // what was wrong (or the missing accent)
      correct: number; // right answers now, for this verb in this tense
      tenseLevelUp: string | null;
      verbLevelUp: string | null;
    }
  | { ok: false; message: string };

export async function checkVerbAnswer(card: { infinitive: string; tenseId: string; person: Person }, answer: string): Promise<VerbFeedback> {
  const user = await getCurrentUser();
  if (!PERSONS.includes(card.person) || !answer.trim()) return { ok: false, message: "Type the form first." };
  const graded = await gradeVerbAnswer(user.id, card, answer.slice(0, 100), await getAccentMode(user.id));
  if (!graded) return { ok: false, message: "That card isn't available any more." };
  const { result } = graded;
  const error = result.errors[0];
  return {
    ok: true,
    verdict: result.verdict,
    answer: result.answer,
    corrected: result.corrected,
    diff: diffAnswer(result.answer, result.corrected),
    note: error ? { label: ERROR_NAMES.get(error.type) ?? error.type, explanation: error.explanation } : null,
    correct: graded.correct,
    tenseLevelUp: graded.tenseLevelUp?.name ?? null,
    verbLevelUp: graded.verbLevelUp?.name ?? null,
  };
}
