import assert from "node:assert/strict";
import { test } from "node:test";
import { buildFollowUpMessages, type AttemptContext } from "./follow-up";

const ctx: AttemptContext = {
  prompt: "We were tired when we got home.",
  answer: "Estuvimos cansados cuando llegamos a casa",
  corrected: "Estábamos cansados cuando llegamos a casa",
  verdict: "incorrect",
  errors: [{ name: "Preterite vs imperfect", wrong: "Estuvimos", right: "Estábamos", explanation: "Background state takes the imperfect.", counts: true }],
  tip: null,
  references: ["Estábamos cansados cuando llegamos a casa."],
};

test("the first question carries the exercise and its feedback", () => {
  const messages = buildFollowUpMessages(ctx, [], "Why not estuvimos?");
  assert.equal(messages.length, 1);
  assert.equal(messages[0].role, "user");
  const content = messages[0].content as string;
  assert.match(content, /We were tired when we got home/);
  assert.match(content, /Preterite vs imperfect: "Estuvimos" → "Estábamos"/);
  assert.match(content, /<question>Why not estuvimos\?<\/question>$/);
});

test("earlier follow-ups become the conversation, ending on the new question", () => {
  const messages = buildFollowUpMessages(ctx, [{ question: "Why not estuvimos?", answer: "Because it's background." }], "And with todo el día?");
  assert.deepEqual(messages.map((m) => m.role), ["user", "assistant", "user"]);
  assert.equal(messages[1].content, "Because it's background.");
  assert.equal(messages[2].content, "<question>And with todo el día?</question>");
});
