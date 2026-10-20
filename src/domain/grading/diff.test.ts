import assert from "node:assert/strict";
import { test } from "node:test";
import { diffAnswer } from "./diff";

const render = (answer: string, corrected: string) =>
  diffAnswer(answer, corrected)
    .map(({ op, char }) => (op === "same" ? char : op === "insert" ? `+${char}` : op === "delete" ? `-${char}` : `~${char}`))
    .join("");

test("accent-only changes are marked as accents, not insert + delete", () => {
  assert.equal(render("Estabamos cansado", "Estábamos cansados"), "Est~ábamos cansado+s");
});

test("the diff always rebuilds both the answer and the correction", () => {
  const pairs: [string, string][] = [
    ["estuvimos", "estábamos"],
    ["Si había sabido, habría estado allí", "Si hubiera sabido, habría estado allí"],
    ["", "Hay un banco"],
    ["Lo dije la verdad", ""],
  ];
  for (const [answer, corrected] of pairs) {
    const ops = diffAnswer(answer, corrected);
    const before = ops.filter((d) => d.op !== "insert").map((d) => d.char).join("");
    const after = ops.filter((d) => d.op !== "delete").map((d) => d.char).join("");
    assert.equal(before.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(), answer.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase());
    assert.equal(after, corrected);
  }
});

test("trailing punctuation is ignored", () => {
  assert.ok(diffAnswer("Estoy aquí.", "Estoy aquí").every((d) => d.op === "same"));
});
