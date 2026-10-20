import assert from "node:assert/strict";
import { test } from "node:test";
import { planCheckpoint, planLearnSession, type PlanExercise, type PlanSkill } from "./planner";

// Deterministic "random" so plans are repeatable.
const seeded = (seed = 1) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

const skill = (id: string, kind: "form" | "usage", correctCount = 0, solid = false): PlanSkill => ({ id, kind, correctCount, solid });
const sentences = (skillId: string, n: number, recent = 0): PlanExercise[] =>
  Array.from({ length: n }, (_, i) => ({ id: `${skillId}#${i}`, skillIds: [skillId], recentlySeen: i < recent }));

const step = [skill("form:a", "form"), skill("form:b", "form"), skill("usage:c", "usage")];
const bank = [...sentences("form:a", 3), ...sentences("form:b", 3), ...sentences("usage:c", 5)];

test("each unsolid skill gets as many turns as it still needs", () => {
  const plan = planLearnSession(step, [], bank, seeded());
  const counts = (id: string) => plan.filter((p) => p.skillId === id).length;
  assert.equal(counts("form:a"), 3);
  assert.equal(counts("usage:c"), 3);
  assert.equal(plan.length, 9);
});

test("form skills alternate between drills and sentences", () => {
  const plan = planLearnSession([skill("form:a", "form")], [], sentences("form:a", 3), seeded());
  assert.deepEqual(plan.map((p) => p.kind), ["form", "sentence", "form"]);
});

test("solid skills are skipped while others still need work", () => {
  const plan = planLearnSession([skill("form:a", "form", 3, true), skill("usage:c", "usage", 1)], [], bank, seeded());
  assert.ok(plan.every((p) => p.skillId === "usage:c"));
  assert.equal(plan.length, 2);
});

test("the same skill never comes up twice in a row when it can be avoided", () => {
  const plan = planLearnSession(step, [], bank, seeded(7));
  for (let i = 1; i < plan.length; i++) assert.notEqual(plan[i].skillId, plan[i - 1].skillId);
});

test("drills and sentences are mixed rather than bunched", () => {
  const forms = Array.from({ length: 5 }, (_, i) => skill(`form:f${i}`, "form"));
  const plan = planLearnSession([...forms, skill("usage:c", "usage")], [], [...forms.flatMap((f) => sentences(f.id, 2)), ...sentences("usage:c", 3)], seeded(3));
  let run = 1;
  let longest = 1;
  for (let i = 1; i < plan.length; i++) {
    run = plan[i].kind === plan[i - 1].kind ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  assert.ok(longest <= 3, `longest run of one kind was ${longest}`);
});

test("no sentence repeats within a session, and fresh ones come before recent ones", () => {
  const plan = planLearnSession([skill("usage:c", "usage")], [], sentences("usage:c", 6, 3), seeded());
  const ids = plan.flatMap((p) => (p.kind === "sentence" ? [p.exerciseId] : []));
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every((id) => !["usage:c#0", "usage:c#1", "usage:c#2"].includes(id)));
});

test("reviews are mixed in, capped at about a third of the session", () => {
  const reviews = Array.from({ length: 12 }, (_, i) => skill(`usage:r${i}`, "usage", 3, true));
  const reviewBank = reviews.flatMap((r) => sentences(r.id, 1));
  const many = Array.from({ length: 10 }, (_, i) => skill(`usage:t${i}`, "usage"));
  const plan = planLearnSession(many, reviews, [...reviewBank, ...many.flatMap((s) => sentences(s.id, 3))], seeded(), 20);
  assert.equal(plan.length, 20);
  assert.equal(plan.filter((p) => p.skillId.startsWith("usage:r")).length, 6);
  assert.ok(!plan.slice(-6).every((p) => p.skillId.startsWith("usage:r")), "reviews shouldn't all be bunched at the end");
});

test("a usage skill with no sentences is left out rather than breaking the plan", () => {
  const plan = planLearnSession([skill("usage:none", "usage"), skill("form:a", "form")], [], [], seeded());
  assert.ok(plan.every((p) => p.kind === "form"));
});

test("a checkpoint draws evenly from every step", () => {
  const byStep = new Map([
    ["s1", sentences("usage:x", 10)],
    ["s2", sentences("usage:y", 10)],
    ["s3", sentences("usage:z", 10)],
  ]);
  const plan = planCheckpoint(byStep, seeded(), 15);
  assert.equal(plan.length, 15);
  for (const s of ["usage:x", "usage:y", "usage:z"]) assert.equal(plan.filter((p) => p.skillId === s).length, 5);
});
