import assert from "node:assert/strict";
import { test } from "node:test";
import { englishMeaning, firstSense, verbEnglish } from "./english";

const speak = verbEnglish({ english: "to speak, talk", gerund: "speaking", participle: "spoken", past: "spoke" });
const be = verbEnglish({ english: "to be", gerund: "being", participle: "been", past: "was" });
const canDo = verbEnglish({ english: "to be able, can", gerund: "being able", participle: "been able", past: "was able" });
const wake = verbEnglish({ english: "to wake up, lie down", gerund: "waking up", participle: "waken up", past: "woke up" });
const watch = verbEnglish({ english: "to watch", gerund: "watching", participle: "watched", past: "watched" });

test("glosses come down to their first sense", () => {
  assert.equal(firstSense("to have (auxiliary); there to be (impersonal)"), "have");
  assert.equal(firstSense("to wake up, lie down"), "wake up");
  assert.equal(verbEnglish({ english: "to have (auxiliary)", gerund: "having", participle: "had" }).past, "had");
});

test("indicative tenses agree with their subject", () => {
  assert.equal(englishMeaning(speak, "ind_present", "3s"), "he/she speaks");
  assert.equal(englishMeaning(watch, "ind_present", "3s"), "he/she watches");
  assert.equal(englishMeaning(wake, "ind_present", "3s"), "he/she wakes up");
  assert.equal(englishMeaning(be, "ind_present", "1s"), "I am");
  assert.equal(englishMeaning(canDo, "ind_present", "1p"), "we are able");
  assert.equal(englishMeaning(canDo, "ind_preterite", "3p"), "they were able");
  assert.equal(englishMeaning(speak, "ind_present_perfect", "3s"), "he/she has spoken");
  assert.equal(englishMeaning(speak, "per_ir_a_imperfect", "2s"), "you were going to speak");
  assert.equal(englishMeaning(speak, "ind_imperfect", "1s"), "I used to speak, was speaking");
});

test("subjunctives read like English's own", () => {
  assert.equal(englishMeaning(speak, "sub_present", "3s"), "(that) he/she speak");
  assert.equal(englishMeaning(speak, "sub_imperfect", "2s"), "(if) you spoke");
  assert.equal(englishMeaning(be, "sub_imperfect", "1s"), "(if) I were");
  assert.equal(englishMeaning(speak, "sub_pluperfect", "1p"), "(if) we had spoken");
  assert.equal(englishMeaning(wake, "sub_present_perfect", "3s"), "(that) he/she have woken up");
});

test("commands", () => {
  assert.equal(englishMeaning(wake, "imp_affirmative", "2s"), "Wake up!");
  assert.equal(englishMeaning(speak, "imp_affirmative", "1p"), "Let's speak!");
  assert.equal(englishMeaning(speak, "imp_negative", "3p"), "Don't speak!");
});
