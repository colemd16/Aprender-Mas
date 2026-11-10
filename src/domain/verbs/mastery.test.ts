import assert from "node:assert/strict";
import { test } from "node:test";
import { levelFor, masteryShare, nextLevel, planVerbCards, verbLevel, type VerbOption } from "./mastery";

const seeded =
  (seed = 1) =>
  () =>
    ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const ALL = ["1s", "2s", "3s", "1p", "3p"] as const;

test("levels at 5, 10, 15, 25 and 50 right answers", () => {
  assert.equal(levelFor(4), null);
  assert.equal(levelFor(5)?.name, "Started");
  assert.equal(levelFor(14)?.name, "Familiar");
  assert.equal(levelFor(25)?.name, "Strong");
  assert.equal(levelFor(50)?.name, "Mastered");
  assert.equal(levelFor(120)?.name, "Mastered");
  assert.equal(nextLevel(12)?.at, 15);
  assert.equal(nextLevel(50), null);
});

test("a verb is only as far along as its weakest tense", () => {
  assert.equal(verbLevel([50, 50, 9])?.name, "Started");
  assert.equal(verbLevel([50, 50, 50])?.name, "Mastered");
  assert.equal(verbLevel([]), null);
  assert.equal(masteryShare([50, 100, 0]), 2 / 3);
});

test("cards lean toward the tenses with the fewest right answers", () => {
  const pool: VerbOption[] = [
    {
      infinitive: "hablar",
      tenses: [
        { tenseId: "new", persons: [...ALL], correct: 0 },
        { tenseId: "nearly", persons: [...ALL], correct: 45 },
      ],
    },
  ];
  const cards = planVerbCards(pool, 40, seeded(3));
  const fresh = cards.filter((c) => c.tenseId === "new").length;
  assert.ok(fresh > 30, `only ${fresh} of 40 from the untouched tense`);
});

test("the same card never comes twice in a row, and only persons the tense has", () => {
  const pool: VerbOption[] = [{ infinitive: "hablar", tenses: [{ tenseId: "imp_affirmative", persons: ["2s", "3s"], correct: 0 }] }];
  const cards = planVerbCards(pool, 30, seeded(5), { infinitive: "hablar", tenseId: "imp_affirmative", person: "2s" });
  assert.notDeepEqual(cards[0], { infinitive: "hablar", tenseId: "imp_affirmative", person: "2s" });
  for (let i = 1; i < cards.length; i++) assert.notDeepEqual(cards[i], cards[i - 1]);
  assert.ok(cards.every((c) => c.person === "2s" || c.person === "3s"));
});

test("an empty pool plans nothing", () => {
  assert.deepEqual(planVerbCards([], 10), []);
});
