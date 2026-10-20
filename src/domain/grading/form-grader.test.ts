import assert from "node:assert/strict";
import { test } from "node:test";
import type { Person } from "@/content/persons";
import type { TenseId } from "@/content/tenses";
import { gradeForm, type KnownForm } from "./form-grader";

const row = (tenseId: TenseId, forms: string[], alternates: string[][] = []): KnownForm[] =>
  (["1s", "2s", "3s", "1p", "3p"] as Person[]).map((person, i) => ({ tenseId, person, form: forms[i], alternates: alternates[i] ?? [] }));

const ESTAR = [
  ...row("ind_present", ["estoy", "estás", "está", "estamos", "están"]),
  ...row("ind_preterite", ["estuve", "estuviste", "estuvo", "estuvimos", "estuvieron"]),
  ...row("ind_imperfect", ["estaba", "estabas", "estaba", "estábamos", "estaban"]),
  ...row("sub_present", ["esté", "estés", "esté", "estemos", "estén"]),
  ...row("sub_imperfect", ["estuviera", "estuvieras", "estuviera", "estuviéramos", "estuvieran"], [["estuviese"], ["estuvieses"], ["estuviese"], ["estuviésemos"], ["estuviesen"]]),
  ...row("per_ir_a_present", ["voy a estar", "vas a estar", "va a estar", "vamos a estar", "van a estar"]),
];

const exercise = (tenseId: TenseId, person: Person, isIrregular = true) => {
  const expected = ESTAR.find((f) => f.tenseId === tenseId && f.person === person)!;
  return { skillId: `form:estar:${tenseId}:${person}`, infinitive: "estar", expected: { ...expected, isIrregular }, verbForms: ESTAR };
};

test("exact answer is correct, ignoring case and punctuation", () => {
  const r = gradeForm(exercise("ind_imperfect", "1p"), "  Estábamos. ");
  assert.equal(r.verdict, "correct");
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.skillResults, [{ skillId: "form:estar:ind_imperfect:1p", passed: true }]);
});

test("missing accent is a warning by default and a miss in strict mode", () => {
  const warn = gradeForm(exercise("ind_imperfect", "1p"), "estabamos");
  assert.equal(warn.verdict, "acceptable");
  assert.equal(warn.errors[0].type, "missing_accent");
  assert.equal(warn.skillResults[0].passed, true);

  const strict = gradeForm(exercise("ind_imperfect", "1p"), "estabamos", "strict");
  assert.equal(strict.verdict, "incorrect");
  assert.equal(strict.skillResults[0].passed, false);
});

test("alternate forms are accepted", () => {
  assert.equal(gradeForm(exercise("sub_imperfect", "1s"), "estuviese").verdict, "correct");
});

test("a form from another tense is diagnosed as the wrong tense", () => {
  const r = gradeForm(exercise("ind_imperfect", "1p"), "estuvimos");
  assert.equal(r.verdict, "incorrect");
  assert.equal(r.errors[0].type, "wrong_tense");
  assert.match(r.errors[0].explanation, /preterite/);
  assert.equal(r.corrected, "estábamos");
});

test("a form from another mood is diagnosed as the wrong mood", () => {
  const r = gradeForm(exercise("sub_present", "2s"), "estás");
  assert.equal(r.errors[0].type, "wrong_mood");
});

test("the right tense for another person is the wrong person", () => {
  const r = gradeForm(exercise("ind_present", "3p"), "estamos");
  assert.equal(r.errors[0].type, "wrong_person");
  assert.match(r.errors[0].explanation, /nosotros/);
});

test("a dropped 'a' in ir a + infinitive is a construction error", () => {
  const r = gradeForm(exercise("per_ir_a_present", "1s"), "voy estar");
  assert.equal(r.errors[0].type, "periphrasis_error");
});

test("an irregular verb conjugated as regular is an irregular-form error", () => {
  const r = gradeForm(exercise("ind_preterite", "1s"), "esté"); // matches sub_present 1s, so wrong mood wins
  assert.equal(r.errors[0].type, "wrong_mood");
  const regularized = gradeForm(exercise("ind_preterite", "3p"), "estaron");
  assert.equal(regularized.errors[0].type, "irregular_form");
  assert.match(regularized.errors[0].explanation, /estaron/);
});

test("reflexive verbs need their pronoun", () => {
  const forms = row("ind_present", ["me levanto", "te levantas", "se levanta", "nos levantamos", "se levantan"]);
  const r = gradeForm(
    { skillId: "form:levantarse:ind_present:1s", infinitive: "levantarse", expected: { ...forms[0], isIrregular: false }, verbForms: forms },
    "levanto",
  );
  assert.equal(r.errors[0].type, "reflexive_error");
});

test("anything else gets a plain correction", () => {
  const r = gradeForm(exercise("ind_present", "1s", true), "estoi");
  assert.equal(r.verdict, "incorrect");
  assert.equal(r.errors[0].type, "irregular_form");
  assert.equal(r.corrected, "estoy");
});
