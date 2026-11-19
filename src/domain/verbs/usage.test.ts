import assert from "node:assert/strict";
import { test } from "node:test";
import { SUPPLEMENTAL_VERBS } from "@/content/supplemental-verbs";
import { VERB_USAGE } from "@/content/verb-usage";
import { buildVerbForms, type SourceVerb } from "@/domain/conjugation/forms";
import type { KnownForm } from "@/domain/grading/form-grader";
import { planVerbCards } from "./mastery";
import { auxiliaryMeaning, gradeImpersonal, specialCue, tenseMeaning } from "./usage";

const haber = SUPPLEMENTAL_VERBS.find((v) => v.infinitive === "haber")!;
const ir: SourceVerb = {
  infinitive: "ir",
  gerund: "yendo",
  pastParticiple: "ido",
  forms: {
    ind_present: { "1s": "voy", "2s": "vas", "3s": "va", "1p": "vamos", "3p": "van" },
    ind_imperfect: { "1s": "iba", "2s": "ibas", "3s": "iba", "1p": "íbamos", "3p": "iban" },
  },
};
const estar: SourceVerb = { infinitive: "estar", gerund: "estando", pastParticiple: "estado", forms: {} };
const forms = buildVerbForms(haber, { ir, estar });
const known: KnownForm[] = forms.map((f) => ({ tenseId: f.tenseId, person: f.person, form: f.form, alternates: f.alternates }));
const formOf = (tenseId: string, person = "3s") => forms.find((f) => f.tenseId === tenseId && f.person === person)?.form;
const grade = (tenseId: Parameters<typeof gradeImpersonal>[1], answer: string) => gradeImpersonal("haber", tenseId, answer, known)!;

test("haber keeps only forms people say", () => {
  assert.ok(!forms.some((f) => f.form === "voy a haber"));
  assert.deepEqual(forms.filter((f) => f.tenseId === "per_ir_a_present").map((f) => f.form), ["va a haber"]);
  assert.deepEqual(forms.filter((f) => f.tenseId === "ind_preterite").map((f) => f.form), ["hubo"]);
  assert.deepEqual(forms.filter((f) => f.tenseId === "ind_present_perfect").map((f) => f.form), ["ha habido"]);
  // As a helper verb it still has every person.
  assert.deepEqual(forms.filter((f) => f.tenseId === "ind_present").map((f) => f.form), ["he", "has", "ha", "hemos", "han"]);
});

test("every no-subject-only tense has a card, and its form is the one in the data", () => {
  for (const [infinitive, usage] of Object.entries(VERB_USAGE)) {
    for (const tenseId of usage.impersonalOnly ?? []) {
      const impersonal = usage.impersonal?.[tenseId];
      assert.ok(impersonal, `${infinitive} · ${tenseId} needs an impersonal card`);
      if (infinitive === "haber") assert.equal(impersonal.form, formOf(tenseId), `${infinitive} · ${tenseId}`);
    }
    for (const frames of Object.values(usage.auxiliary ?? {})) for (const f of frames!) assert.ok(f.text.includes("___"));
    for (const f of Object.values(usage.impersonal ?? {})) for (const frame of f!.frames) assert.ok(frame.includes("___"));
  }
});

test("helper-verb cues name the participle", () => {
  assert.equal(auxiliaryMeaning("ind_present", "2s", "eaten"), "you have (eaten)");
  assert.equal(auxiliaryMeaning("ind_present", "3s", "eaten", "she"), "she has (eaten)");
  assert.equal(auxiliaryMeaning("sub_imperfect", "1p", "arrived"), "(if) we had (arrived)");
  assert.equal(auxiliaryMeaning("ind_future", "1s", "finished"), "I will have (finished)");
  assert.equal(auxiliaryMeaning("ind_preterite", "1s", "eaten"), null);

  const cue = specialCue("haber", "ind_present", "2s", false, { en: "you", es: "tú" }, () => 0)!;
  assert.deepEqual(cue, { meaning: "you have (eaten)", frame: "Tú ya ___ comido" });
  assert.equal(specialCue("hablar", "ind_present", "2s", false, { en: "you", es: "tú" }), null);
});

test("no-subject cards have no person in their cue", () => {
  const cue = specialCue("haber", "per_ir_a_present", "3s", true, { en: "he", es: "él" }, () => 0)!;
  assert.equal(cue.meaning, "there's going to be");
  assert.ok(!cue.frame.includes("él"));
  assert.equal(tenseMeaning("haber", { base: "have", past: "had", gerund: "having", participle: "had" }, "ind_present", "1s"), "I have (done) / there is / there are");
  assert.equal(tenseMeaning("haber", { base: "have", past: "had", gerund: "having", participle: "had" }, "ind_preterite", "1s"), "there was (at one moment)");
});

test("no-subject answers are graded with explanations of their own", () => {
  assert.equal(grade("ind_present", "hay").verdict, "correct");
  assert.equal(grade("ind_imperfect", "habia").verdict, "acceptable");
  assert.equal(grade("ind_preterite", "hubieron").errors[0].type, "number_agreement");
  assert.equal(grade("ind_imperfect", "habían").errors[0].type, "number_agreement");
  assert.equal(grade("ind_present", "ha").errors[0].type, "auxiliary_error");
  assert.equal(grade("ind_present", "había").errors[0].type, "wrong_tense");
  assert.equal(grade("per_ir_a_present", "va haber").errors[0].type, "periphrasis_error");
  assert.equal(grade("ind_present", "hai").errors[0].type, "irregular_form");
  assert.equal(gradeImpersonal("haber", "sub_present", "haya", known), null);
});

test("no-subject cards are dealt alongside the persons, or alone", () => {
  const rng = (seed = 3) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const only = planVerbCards([{ infinitive: "haber", tenses: [{ tenseId: "ind_preterite", persons: [], correct: 0, impersonal: true }] }], 10, rng());
  assert.equal(only.length, 10);
  assert.ok(only.every((c) => c.impersonal && c.person === "3s"));

  const mixed = planVerbCards(
    [{ infinitive: "haber", tenses: [{ tenseId: "ind_present", persons: ["1s", "2s", "3s", "1p", "3p"], correct: 0, impersonal: true }] }],
    60,
    rng(),
  );
  assert.ok(mixed.some((c) => c.impersonal));
  assert.ok(mixed.some((c) => !c.impersonal && c.person === "3s"));
});
