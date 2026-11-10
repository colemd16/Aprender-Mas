import assert from "node:assert/strict";
import { test } from "node:test";
import { findForm } from "./sentence-check";

test("finds the form as whole words, whatever the case and punctuation", () => {
  assert.equal(findForm("Si hablaras más despacio, te entendería.", { form: "hablaras", alternates: [] }), "exact");
  assert.equal(findForm("¡No te levantes tan tarde!", { form: "no te levantes", alternates: [] }), "exact");
  assert.equal(findForm("Si hablases así…", { form: "hablaras", alternates: ["hablases"] }), "exact");
});

test("a missing accent mark is told apart from a missing form", () => {
  assert.equal(findForm("Ayer hable con mi mamá", { form: "hablé", alternates: [] }), "accent");
  assert.equal(findForm("Ayer hablo con mi mamá", { form: "hablé", alternates: [] }), null);
});

test("part of a longer word doesn't count", () => {
  assert.equal(findForm("Hablaremos mañana", { form: "hablar", alternates: [] }), null);
});
