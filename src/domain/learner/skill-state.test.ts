import assert from "node:assert/strict";
import { test } from "node:test";
import { Rating, State } from "ts-fsrs";
import type { GradeResult } from "@/domain/grading/types";
import { answersToSolid, applyRating, isDue, isSolid, isStepComplete, ratingsFor, type SkillState } from "./skill-state";

const t0 = new Date("2026-10-20T12:00:00Z");
const minutes = (n: number) => new Date(t0.getTime() + n * 60_000);

const answer = (ratings: Rating[]): SkillState | undefined =>
  ratings.reduce<SkillState | undefined>((s, r, i) => applyRating(s, r as Exclude<Rating, Rating.Manual>, minutes(i * 5)), undefined);

test("three correct answers with the last two in a row make a skill solid", () => {
  assert.equal(isSolid(answer([Rating.Good, Rating.Good])), false);
  const solid = answer([Rating.Good, Rating.Good, Rating.Good])!;
  assert.equal(isSolid(solid), true);
  assert.deepEqual(solid.solidAt, minutes(10));
});

test("a miss resets the streak, so it takes two more in a row", () => {
  assert.equal(isSolid(answer([Rating.Good, Rating.Good, Rating.Again, Rating.Good])), false);
  assert.equal(isSolid(answer([Rating.Good, Rating.Good, Rating.Again, Rating.Good, Rating.Good])), true);
});

test("hard (right with a note) still counts as correct", () => {
  assert.equal(isSolid(answer([Rating.Hard, Rating.Hard, Rating.Good])), true);
});

test("solidAt records the first time and survives a later miss", () => {
  const s = answer([Rating.Good, Rating.Good, Rating.Good, Rating.Again])!;
  assert.equal(isSolid(s), false);
  assert.deepEqual(s.solidAt, minutes(10));
});

test("practice schedules a future review; a miss brings it back sooner", () => {
  const good = answer([Rating.Good, Rating.Good, Rating.Good])!;
  const missed = answer([Rating.Good, Rating.Good, Rating.Again])!;
  assert.notEqual(good.state, State.New);
  assert.ok(good.due > minutes(10));
  assert.ok(missed.due < good.due);
  assert.ok(missed.lapses >= 0 && missed.reps === 3);
});

test("only learned skills whose date has arrived are due", () => {
  const s = answer([Rating.Good])!;
  assert.equal(isDue(s, minutes(0)), false);
  assert.equal(isDue(s, new Date(s.due.getTime() + 1)), true);
  assert.equal(isDue({ state: State.New, due: t0 }, minutes(1)), false);
});

test("ratings come from each skill's result and its notes", () => {
  const result: GradeResult = {
    verdict: "incorrect",
    answer: "",
    corrected: "",
    grader: "model",
    errors: [{ type: "missing_accent", wrong: "", right: "", explanation: "", skillId: "b", counts: false }],
    skillResults: [
      { skillId: "a", passed: false },
      { skillId: "b", passed: true },
      { skillId: "c", passed: true },
    ],
  };
  assert.deepEqual([...ratingsFor(result)], [["a", Rating.Again], ["b", Rating.Hard], ["c", Rating.Good]]);
});

test("answers to solid counts what's still needed", () => {
  assert.equal(answersToSolid(undefined), 3);
  assert.equal(answersToSolid({ correctCount: 2, streak: 2 }), 1);
  assert.equal(answersToSolid({ correctCount: 5, streak: 0 }), 2); // missed last time: two in a row again
  assert.equal(answersToSolid({ correctCount: 4, streak: 3 }), 0);
});

test("a step is complete only when every one of its skills is solid", () => {
  const solid = answer([Rating.Good, Rating.Good, Rating.Good])!;
  const halfway = answer([Rating.Good])!;
  assert.equal(isStepComplete(["a", "b"], new Map([["a", solid], ["b", solid]])), true);
  assert.equal(isStepComplete(["a", "b"], new Map([["a", solid], ["b", halfway]])), false);
  assert.equal(isStepComplete(["a", "b"], new Map([["a", solid]])), false);
  assert.equal(isStepComplete([], new Map()), false);
});
