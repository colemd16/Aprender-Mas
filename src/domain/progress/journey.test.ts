import assert from "node:assert/strict";
import { test } from "node:test";
import { buildJourney, type CurriculumLevel, type CurriculumStep } from "./journey";

const levels: CurriculumLevel[] = [1, 2, 3].map((id) => ({ id, title: `L${id}`, summary: "" }));
const steps: CurriculumStep[] = [1, 2, 3].flatMap((level) =>
  [1, 2].map((position) => ({ id: `l${level}-s${position}`, levelId: level, position, title: "", kind: "learn" as const, formSkills: 1, usageSkills: 0 })),
);
const done = new Set(["l1-s1", "l1-s2"]); // level 1 finished, level 2 in progress

test("the current level is shown by default", () => {
  const j = buildJourney(levels, steps, done);
  assert.equal(j.viewedLevel.id, 2);
  assert.equal(j.activeStep?.id, "l2-s1");
});

test("a completed level can be revisited, with its steps marked done", () => {
  const j = buildJourney(levels, steps, done, 1);
  assert.equal(j.viewedLevel.id, 1);
  assert.equal(j.currentLevel.id, 2);
  assert.deepEqual(j.steps.map((s) => s.state), ["done", "done"]);
  assert.equal(j.activeStep, null);
});

test("a locked level can't be viewed; the current level is shown instead", () => {
  const j = buildJourney(levels, steps, done, 3);
  assert.equal(j.viewedLevel.id, 2);
});
