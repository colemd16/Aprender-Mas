import assert from "node:assert/strict";
import { test } from "node:test";
import { buildAccentLexicon } from "@/domain/grading/accents";
import type { StepContext } from "./context";
import { buildFormIndex, findForms } from "./form-index";
import { validateCandidate, type Candidate } from "./validate";

const forms = buildFormIndex([
  { infinitive: "ser", tenseId: "ind_present", person: "1p", form: "somos", alternates: [] },
  { infinitive: "ser", tenseId: "ind_present", person: "3s", form: "es", alternates: [] },
  { infinitive: "ser", tenseId: "ind_imperfect", person: "1s", form: "era", alternates: [] },
  { infinitive: "ser", tenseId: "ind_imperfect", person: "3s", form: "era", alternates: [] },
  { infinitive: "ser", tenseId: "ind_preterite", person: "3s", form: "fue", alternates: [] },
  { infinitive: "ir", tenseId: "ind_preterite", person: "3s", form: "fue", alternates: [] },
  { infinitive: "estar", tenseId: "per_ir_a_present", person: "1s", form: "voy a estar", alternates: [] },
  { infinitive: "ir", tenseId: "ind_present", person: "1s", form: "voy", alternates: [] },
]);
const lexicon = buildAccentLexicon(["somos", "estás", "está", "estábamos"]);

const ctx = (over: Partial<StepContext>): StepContext => ({
  stepId: "s",
  level: { number: 1, title: "L" },
  title: "S",
  concept: null,
  targetUsage: [],
  targetForms: [],
  stepSkillIds: new Set(["form:ser:ind_present:1p", "usage:ser-identity"]),
  availableSkillIds: new Set(["form:ser:ind_present:1p", "form:ser:ind_present:3s", "usage:ser-identity"]),
  knownVerbs: ["ser"],
  taughtTenses: [{ id: "ind_present", name: "Present" }],
  ...over,
});
const deps = { forms, lexicon, tenseName: (id: string) => id };
const candidate = (spanish: string, targets: string[] = ["form:ser:ind_present:1p"]): Candidate => ({ english: "x", spanish: [spanish], targets, hints: [] });

test("multi-word forms are matched as one", () => {
  assert.deepEqual(findForms("Mañana voy a estar en casa", forms).map((m) => m.text), ["voy a estar"]);
});

test("a good sentence becomes an exercise linked to its skills", () => {
  const r = validateCandidate(candidate("Somos de Medellín y él es ingeniero."), ctx({}), deps);
  assert.ok(r.ok);
  if (r.ok) assert.deepEqual(r.exercise.skillIds.sort(), ["form:ser:ind_present:1p", "form:ser:ind_present:3s"]);
});

test("a form from an untaught tense rejects the sentence", () => {
  const r = validateCandidate(candidate("Era un día largo y somos amigos."), ctx({}), deps);
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.reason, /untaught tense: "era"/);
});

test("a claimed form target the sentence doesn't contain is dropped", () => {
  const r = validateCandidate(candidate("Él es ingeniero.", ["form:ser:ind_present:1p"]), ctx({}), deps);
  assert.equal(r.ok, false); // only es (3s) is present, and that skill isn't this step's
});

test("ambiguous forms aren't auto-linked; the model's matching target settles it", () => {
  const past = ctx({
    taughtTenses: [{ id: "ind_preterite", name: "Preterite" }],
    stepSkillIds: new Set(["form:ser:ind_preterite:3s"]),
    availableSkillIds: new Set(["form:ser:ind_preterite:3s", "form:ir:ind_preterite:3s"]),
  });
  const r = validateCandidate(candidate("La fiesta fue increíble.", ["form:ser:ind_preterite:3s"]), past, deps);
  assert.ok(r.ok);
  if (r.ok) assert.deepEqual(r.exercise.skillIds, ["form:ser:ind_preterite:3s"]);
});

test("a misspelled accent rejects the sentence", () => {
  const r = validateCandidate(candidate("Estabamos aquí y somos felices."), ctx({}), deps);
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.reason, /accent/);
});

test("a sentence practicing nothing from this step is rejected", () => {
  const r = validateCandidate(candidate("Hola, buenos días.", []), ctx({}), deps);
  assert.equal(r.ok, false);
});
