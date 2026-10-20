import { ERROR_TYPES } from "@/content/error-types";
import { PERSON_LABELS, REFLEXIVE_PRONOUNS, type Person } from "@/content/persons";
import { TENSES, type TenseId } from "@/content/tenses";
import { regularForm } from "@/domain/conjugation/regular";
import { accentKey, compareKey, tidy } from "./normalize";
import type { AccentMode, GradeResult, GradedError } from "./types";

// Grades a single verb form ("estar · nosotros · imperfect" → estábamos) against the
// verb data. No model involved: the answer is right, or the grader works out exactly
// which other form of the verb it matches, so the feedback can say what went wrong.

export type KnownForm = { tenseId: TenseId; person: Person; form: string; alternates: string[] };

export type FormExercise = {
  skillId: string;
  infinitive: string;
  expected: KnownForm & { isIrregular: boolean };
  // Every form of the same verb, used to diagnose a wrong answer.
  verbForms: KnownForm[];
};

const TENSE = new Map<string, (typeof TENSES)[number]>(TENSES.map((t) => [t.id, t]));
const COUNTS = new Map(ERROR_TYPES.map((e) => [e.id, e.countsAsError]));
const tenseName = (id: string) => TENSE.get(id)?.nameEn.toLowerCase() ?? id;
const personName = (p: Person) => PERSON_LABELS[p];

export function gradeForm(exercise: FormExercise, rawAnswer: string, accentMode: AccentMode = "warn"): GradeResult {
  const answer = tidy(rawAnswer);
  const { expected, skillId } = exercise;
  const accepted = [expected.form, ...expected.alternates];
  const key = compareKey(answer);

  const result = (errors: Omit<GradedError, "skillId" | "counts">[]): GradeResult => {
    const graded = errors.map((e) => ({
      ...e,
      skillId,
      counts: e.type === "missing_accent" ? accentMode === "strict" : (COUNTS.get(e.type) ?? true),
    }));
    const failed = graded.some((e) => e.counts);
    return {
      verdict: failed ? "incorrect" : graded.length ? "acceptable" : "correct",
      answer,
      corrected: expected.form,
      errors: graded,
      skillResults: [{ skillId, passed: !failed }],
      grader: "engine",
    };
  };

  if (accepted.some((a) => compareKey(a) === key)) return result([]);

  if (accepted.some((a) => accentKey(a) === accentKey(answer))) {
    return result([{ type: "missing_accent", wrong: answer, right: expected.form, explanation: `Written with its accent: *${expected.form}*.` }]);
  }

  const wrong = (type: string, explanation: string) => result([{ type, wrong: answer, right: expected.form, explanation }]);
  const want = `*${expected.form}*`;

  // Reflexive pronoun left out: "levanto" for "me levanto".
  const pronoun = REFLEXIVE_PRONOUNS[expected.person];
  if (expected.form.startsWith(`${pronoun} `) && accentKey(expected.form.slice(pronoun.length + 1)) === accentKey(answer)) {
    return wrong("reflexive_error", `This verb is reflexive, so it needs its pronoun: ${want}.`);
  }

  // "voy estar" for "voy a estar".
  if (expected.form.includes(" a ") && accentKey(expected.form.replace(" a ", " ")) === accentKey(answer)) {
    return wrong("periphrasis_error", `Ir always takes *a* before the infinitive: ${want}.`);
  }

  // A real form of the same verb, just not the one asked for.
  const match = exercise.verbForms.find((f) => [f.form, ...f.alternates].some((x) => accentKey(x) === accentKey(answer)));
  if (match) {
    const yours = `*${answer}*`;
    if (match.tenseId === expected.tenseId) {
      return wrong("wrong_person", `${yours} is the ${personName(match.person)} form — for ${personName(expected.person)} it's ${want}.`);
    }
    const sameMood = TENSE.get(match.tenseId)?.mood === TENSE.get(expected.tenseId)?.mood;
    return wrong(
      sameMood ? "wrong_tense" : "wrong_mood",
      `${yours} is the ${tenseName(match.tenseId)} — this asks for the ${tenseName(expected.tenseId)}: ${want}.`,
    );
  }

  // Conjugated as if it were regular: "estaron" for estuvieron, "tení" for tuve.
  const regular = regularForm(exercise.infinitive, expected.tenseId, expected.person);
  if (expected.isIrregular && regular && accentKey(regular) === accentKey(answer)) {
    return wrong("irregular_form", `${exercise.infinitive} is irregular here — not *${regular}* but ${want}.`);
  }

  return wrong(
    expected.isIrregular ? "irregular_form" : "regular_ending",
    `The ${tenseName(expected.tenseId)} ${personName(expected.person)} form of ${exercise.infinitive} is ${want}.`,
  );
}
