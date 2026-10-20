import { ERROR_TYPES } from "@/content/error-types";
import { buildAccentLexicon, findAccentFixes, removesValidAccent, type AccentLexicon } from "../accents";
import { accentKey } from "../normalize";
import type { AccentMode, GradedError, GradeResult, Verdict } from "../types";
import type { SentenceExercise } from "./prompt";
import type { GradingOutput } from "./schema";

const COUNTS = new Map(ERROR_TYPES.map((e) => [e.id, e.countsAsError]));
type Graded = Omit<GradeResult, "grader" | "model" | "usage">;

const counts = (type: string, accentMode: AccentMode) => (type === "missing_accent" ? accentMode === "strict" : (COUNTS.get(type) ?? true));

// The verdict is decided here, from the error types, rather than by the model — so
// "correct" means the same thing every time.
function finish(exercise: SentenceExercise, answer: string, corrected: string, errors: GradedError[], tip?: string): Graded {
  const failedSkills = new Set(errors.filter((e) => e.counts && e.skillId).map((e) => e.skillId));
  const verdict: Verdict = errors.some((e) => e.counts) ? "incorrect" : errors.length ? "acceptable" : "correct";
  return {
    verdict,
    answer,
    corrected,
    errors,
    skillResults: exercise.skills.map((s) => ({ skillId: s.id, passed: !failedSkills.has(s.id) })),
    ...(tip ? { tip } : {}),
  };
}

export function interpretGrading(exercise: SentenceExercise, answer: string, output: GradingOutput, accentMode: AccentMode): Graded {
  const skillIds = new Set(exercise.skills.map((s) => s.id));
  const errors: GradedError[] = output.errors.map((e) => ({
    type: e.type,
    wrong: e.wrong,
    right: e.right,
    explanation: e.explanation,
    skillId: e.skill_id && skillIds.has(e.skill_id) ? e.skill_id : null,
    counts: counts(e.type, accentMode),
  }));
  return finish(exercise, answer, output.corrected, errors, output.tip ?? undefined);
}

// A result contradicts itself when it lists no errors at all, yet the correction says
// something different from the answer. It can never be trusted as "correct".
export function isInconsistent(graded: Graded) {
  return graded.errors.length === 0 && accentKey(graded.corrected) !== accentKey(graded.answer);
}

// Used when the grader contradicts itself twice: never pass an answer we can't vouch for.
export function markUnverified(graded: Graded, exercise: SentenceExercise): Graded {
  const error: GradedError = {
    type: "meaning_mismatch",
    wrong: graded.answer,
    right: graded.corrected,
    explanation: "This doesn't match what the prompt asks — compare it with the corrected sentence.",
    skillId: null,
    counts: true,
  };
  return finish(exercise, graded.answer, graded.corrected, [...graded.errors, error], graded.tip);
}

// Drops "missing accent" claims that would strip a correct accent from a real verb
// form (esté → este), and puts the learner's spelling back in the correction.
export function dropDubiousAccentClaims(graded: Graded, exercise: SentenceExercise, lexicon: AccentLexicon): Graded {
  const dubious = graded.errors.filter((e) => e.type === "missing_accent" && removesValidAccent(e.wrong, e.right, lexicon));
  if (!dubious.length) return graded;
  let corrected = graded.corrected;
  for (const e of dubious) corrected = corrected.replace(e.right, e.wrong);
  return finish(exercise, graded.answer, corrected, graded.errors.filter((e) => !dubious.includes(e)), graded.tip);
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Accent marks the model missed are restored by spelling — but only for words the
// exercise's own answers spell with an accent. A general word list would "fix" real
// words that happen to match an accented verb (seria → sería, media → medía).
export function applyAccentCheck(graded: Graded, exercise: SentenceExercise, accentMode: AccentMode): Graded {
  const words = buildAccentLexicon([...exercise.references, ...Object.values(exercise.hints ?? {})]);
  const fixes = findAccentFixes(graded.corrected, words);
  if (!fixes.length) return graded;

  const answerWords = new Set((graded.answer.toLowerCase().match(/[a-záéíóúüñ]+/g) ?? []));
  let corrected = graded.corrected;
  const errors = [...graded.errors];
  for (const { word, fixed } of fixes) {
    corrected = corrected.replace(new RegExp(`(?<!\\p{L})${escape(word)}(?!\\p{L})`, "u"), fixed);
    const alreadyNoted = errors.some((e) => e.type === "missing_accent" && e.right.toLowerCase().includes(fixed.toLowerCase()));
    if (answerWords.has(word.toLowerCase()) && !alreadyNoted) {
      errors.push({ type: "missing_accent", wrong: word, right: fixed, explanation: `Written with its accent: *${fixed}*.`, skillId: null, counts: counts("missing_accent", accentMode) });
    }
  }
  return finish(exercise, graded.answer, corrected, errors, graded.tip);
}
