import type { Person } from "@/content/persons";
import type { TenseId } from "@/content/tenses";
import { VERB_USAGE, type AuxiliaryFrame, type ImpersonalForm } from "@/content/verb-usage";
import { gradeForm, type KnownForm } from "@/domain/grading/form-grader";
import { accentKey } from "@/domain/grading/normalize";
import type { AccentMode, GradeResult } from "@/domain/grading/types";
import { englishMeaning, type VerbEnglish } from "./english";

// Cards for verbs that don't fit the one-form-per-person drill (see content/verb-usage).

export function isImpersonalOnly(infinitive: string, tenseId: string) {
  return VERB_USAGE[infinitive]?.impersonalOnly?.includes(tenseId as TenseId) ?? false;
}

export function impersonalFor(infinitive: string, tenseId: string): ImpersonalForm | undefined {
  return VERB_USAGE[infinitive]?.impersonal?.[tenseId as TenseId];
}

export function auxiliaryFramesFor(infinitive: string, tenseId: string): AuxiliaryFrame[] | undefined {
  return VERB_USAGE[infinitive]?.auxiliary?.[tenseId as TenseId];
}

// The compound tense a helper-verb form builds: has (present) → has comido (present perfect).
const COMPOUND_OF: Partial<Record<string, TenseId>> = {
  ind_present: "ind_present_perfect",
  ind_imperfect: "ind_pluperfect",
  ind_future: "ind_future_perfect",
  ind_conditional: "ind_conditional_perfect",
  sub_present: "sub_present_perfect",
  sub_imperfect: "sub_pluperfect",
};

// What a helper-verb form means, with the participle it needs in brackets:
// "you have (eaten)", "(if) she had (arrived)".
export function auxiliaryMeaning(tenseId: string, person: Person, participle: string, subject?: string) {
  const compound = COMPOUND_OF[tenseId];
  if (!compound) return null;
  const parts: VerbEnglish = { base: "have", past: "had", gerund: "having", participle: `(${participle})` };
  return englishMeaning(parts, compound, person, subject);
}

// What a verb's tense means, for the verb's page: "I have (done) / there is / there are".
export function tenseMeaning(infinitive: string, parts: VerbEnglish, tenseId: string, person: Person) {
  const impersonal = impersonalFor(infinitive, tenseId);
  if (isImpersonalOnly(infinitive, tenseId) && impersonal) return impersonal.english;
  const personal = auxiliaryFramesFor(infinitive, tenseId)
    ? auxiliaryMeaning(tenseId, person, "done")!
    : englishMeaning(parts, tenseId, person);
  return impersonal ? `${personal} / ${impersonal.english}` : personal;
}

const pick = <T>(items: T[], rng: () => number) => items[Math.floor(rng() * items.length)];

// The cue and frame for a card when its verb needs one of its own; null for ordinary cards.
export function specialCue(
  infinitive: string,
  tenseId: string,
  person: Person,
  impersonal: boolean,
  subject: { en: string; es: string },
  rng: () => number = Math.random,
): { meaning: string; frame: string } | null {
  if (impersonal) {
    const form = impersonalFor(infinitive, tenseId);
    return form ? { meaning: form.english, frame: pick(form.frames, rng) } : null;
  }
  const frames = auxiliaryFramesFor(infinitive, tenseId);
  if (!frames?.length) return null;
  const frame = pick(frames, rng);
  return {
    meaning: auxiliaryMeaning(tenseId, person, frame.participle, subject.en)!,
    frame: frame.text.replaceAll("{p}", subject.es).replaceAll("{P}", subject.es.charAt(0).toUpperCase() + subject.es.slice(1)),
  };
}

// Grades a no-subject card ("there is" → hay). Its other no-subject forms help name a
// wrong tense, and two slips get their own explanation: making it plural (hubieron), and
// the helper-verb forms (han, has), which only go before a participle.
export function gradeImpersonal(
  infinitive: string,
  tenseId: TenseId,
  answer: string,
  personalForms: KnownForm[],
  accentMode: AccentMode = "warn",
): GradeResult | null {
  const usage = VERB_USAGE[infinitive]?.impersonal;
  const expected = usage?.[tenseId];
  if (!usage || !expected) return null;
  const others: KnownForm[] = Object.entries(usage).map(([t, f]) => ({ tenseId: t as TenseId, person: "3s", form: f!.form, alternates: [] }));
  const result = gradeForm(
    {
      skillId: `verb:${infinitive}:${tenseId}:impersonal`,
      infinitive,
      expected: { tenseId, person: "3s", form: expected.form, alternates: [], isIrregular: true },
      verbForms: others,
    },
    answer,
    accentMode,
  );
  const error = result.errors[0];
  // Wrong tense, a broken "va a haber" and the like already have the right explanation.
  if (result.verdict !== "incorrect" || !error || (error.type !== "irregular_form" && error.type !== "regular_ending")) return result;

  const key = accentKey(result.answer);
  const want = `*${expected.form}*`;
  const explain = (type: string, explanation: string): GradeResult => ({ ...result, errors: [{ ...error, type, explanation }] });
  if (key === accentKey(expected.plural)) {
    return explain("number_agreement", `Meaning “there is / there are”, ${infinitive} stays singular, even for more than one thing: ${want}, never *${expected.plural}*.`);
  }
  if (personalForms.some((f) => [f.form, ...f.alternates].some((x) => accentKey(x) === key))) {
    return explain(
      "auxiliary_error",
      `*${result.answer}* is ${infinitive} as a helper verb, before a participle (*${result.answer} comido*). With no subject, meaning “${expected.english}”, it's ${want}.`,
    );
  }
  return explain("irregular_form", `“${expected.english[0].toUpperCase()}${expected.english.slice(1)}” is ${want}.`);
}
