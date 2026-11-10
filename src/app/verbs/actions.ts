"use server";

import { ERROR_TYPES } from "@/content/error-types";
import { PERSONS, type Person } from "@/content/persons";
import { getAccentMode } from "@/data/practice";
import { getSentenceTarget, gradeVerbAnswer, planVerbChallenge, VERB_SETS, type ChallengeOptions, type VerbCard } from "@/data/verbs";
import { diffAnswer, type DiffOp } from "@/domain/grading/diff";
import type { Verdict } from "@/domain/grading/types";
import { checkSentence, exampleSentence, findForm, SentenceCheckUnavailableError, type SentenceCheck } from "@/domain/verbs/sentence-check";
import { anthropic, GRADING_MODEL } from "@/lib/anthropic";
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

type CardRef = { infinitive: string; tenseId: string; person: Person };

export type SentenceFeedback =
  | ({ ok: true; sentence: string; diff: DiffOp[] } & SentenceCheck)
  | { ok: false; missing: true; form: string } // the form isn't in the sentence (checked without the model)
  | { ok: false; missing?: false; message: string };

// "Use it in a sentence": a friendly check of the learner's own sentence. Not scored or
// saved. Unless `anyway`, a sentence without the form is turned back before any model call.
export async function checkVerbSentence(card: CardRef, rawSentence: string, anyway = false): Promise<SentenceFeedback> {
  await getCurrentUser();
  const sentence = rawSentence.replace(/\s+/g, " ").trim().slice(0, 300);
  if (!PERSONS.includes(card.person) || !sentence) return { ok: false, message: "Write a sentence first." };
  const target = await getSentenceTarget(card);
  if (!target) return { ok: false, message: "That form isn't available any more." };
  if (!anyway && !findForm(sentence, target)) return { ok: false, missing: true, form: target.form };
  try {
    const check = await checkSentence(anthropic(), GRADING_MODEL, target, sentence);
    return { ok: true, sentence, diff: diffAnswer(sentence, check.corrected), ...check };
  } catch (err) {
    if (!(err instanceof SentenceCheckUnavailableError)) console.error("sentence check failed", err);
    return { ok: false, message: err instanceof SentenceCheckUnavailableError ? err.message : "Couldn't check that right now — try again." };
  }
}

export async function verbExample(
  card: CardRef,
  avoid: string[] = [],
): Promise<{ ok: true; spanish: string; english: string } | { ok: false; message: string }> {
  await getCurrentUser();
  if (!PERSONS.includes(card.person)) return { ok: false, message: "That form isn't available." };
  const target = await getSentenceTarget(card);
  if (!target) return { ok: false, message: "That form isn't available any more." };
  try {
    const previous = (Array.isArray(avoid) ? avoid : [])
      .filter((x) => typeof x === "string")
      .slice(-5)
      .map((x) => x.slice(0, 200));
    return { ok: true, ...(await exampleSentence(anthropic(), GRADING_MODEL, target, previous)) };
  } catch (err) {
    if (!(err instanceof SentenceCheckUnavailableError)) console.error("example failed", err);
    return { ok: false, message: err instanceof SentenceCheckUnavailableError ? err.message : "Couldn't get an example right now — try again." };
  }
}
