// Runs the sentence grader over the eval cases and reports how often it gets them right.
//   npm run eval:grading                    all cases, effort "medium"
//   npm run eval:grading -- --effort=low
//   npm run eval:grading -- --only=tired    cases whose id contains "tired"
// Each run calls the Anthropic API (Haiku). Results are saved to evals/results/.
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import { mkdirSync, writeFileSync } from "node:fs";
import { CASES, EXERCISES, type Expectation, type SentenceCase } from "../evals/grading/sentence-cases";
import { buildCurriculum } from "../src/domain/curriculum/skills";
import { matchesAnyIgnoringAccents } from "../src/domain/grading/normalize";
import { gradeSentence } from "../src/domain/grading/sentence/grade";
import type { SentenceExercise } from "../src/domain/grading/sentence/prompt";
import type { GradeResult } from "../src/domain/grading/types";
import { anthropic, GRADING_MODEL } from "../src/lib/anthropic";
import type { AccentLexicon } from "../src/domain/grading/accents";

// Haiku 5.5 prices per million tokens (prompts under 100K tokens).
const PRICE = { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 };

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const effort = (arg("effort") ?? "medium") as "low" | "medium" | "high";
const only = arg("only");
const concurrency = Number(arg("concurrency") ?? 6);

const skillTitles = new Map(buildCurriculum().skills.map((s) => [s.id, s.title]));
function exerciseFor(key: keyof typeof EXERCISES): SentenceExercise {
  const e = EXERCISES[key];
  return {
    prompt: e.prompt,
    references: [...e.references],
    hints: { ...e.hints },
    skills: e.skills.map((id) => {
      const title = skillTitles.get(id);
      if (!title) throw new Error(`Exercise ${key}: unknown skill ${id}`);
      return { id, title };
    }),
  };
}

function check(expect: Expectation, result: GradeResult) {
  const types = new Set(result.errors.map((e) => e.type));
  const verdicts = Array.isArray(expect.verdict) ? expect.verdict : [expect.verdict];
  const problems: string[] = [];
  if (!verdicts.includes(result.verdict)) problems.push(`verdict ${result.verdict}, expected ${verdicts.join(" or ")}`);
  for (const t of expect.all ?? []) if (!types.has(t)) problems.push(`missing ${t}`);
  if (expect.any && !expect.any.some((t) => types.has(t))) problems.push(`expected one of ${expect.any.join(", ")}`);
  for (const t of expect.none ?? []) if (types.has(t)) problems.push(`unexpected ${t}`);
  return problems;
}

type Row = { case: SentenceCase; result?: GradeResult; error?: string; ms: number; problems: string[] };

let lexicon: AccentLexicon;

async function run(c: SentenceCase): Promise<Row> {
  const start = Date.now();
  try {
    const result = await gradeSentence(exerciseFor(c.exercise), c.answer, { client: anthropic(), model: GRADING_MODEL, effort, lexicon });
    return { case: c, result, ms: Date.now() - start, problems: check(c.expect, result) };
  } catch (err) {
    return { case: c, error: err instanceof Error ? err.message : String(err), ms: Date.now() - start, problems: ["grader failed"] };
  }
}

async function main() {
  const cases = CASES.filter((c) => !only || c.id.includes(only));
  const { getAccentLexicon } = await import("../src/data/lexicon");
  lexicon = await getAccentLexicon();
  console.log(`Grading ${cases.length} cases with ${GRADING_MODEL} (effort ${effort})…\n`);

  // The first model call writes the prompt cache; the rest then read from it.
  const rows: Row[] = [];
  const queue = [...cases];
  const firstModelCase = queue.findIndex((c) => !matchesAnyIgnoringAccents(c.answer, [...EXERCISES[c.exercise].references]));
  if (firstModelCase >= 0) rows.push(await run(queue.splice(firstModelCase, 1)[0]));
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      for (let c = queue.shift(); c; c = queue.shift()) rows.push(await run(c));
    }),
  );
  rows.sort((a, b) => cases.indexOf(a.case) - cases.indexOf(b.case));

  for (const r of rows) {
    const ok = r.problems.length === 0;
    const types = r.result?.errors.map((e) => e.type).join(", ") || "—";
    console.log(`${ok ? "✓" : "✗"} ${r.case.id.padEnd(26)} ${(r.result?.verdict ?? "error").padEnd(10)} ${types}`);
    if (!ok) {
      console.log(`    answer:    ${r.case.answer}`);
      if (r.result) {
        console.log(`    corrected: ${r.result.corrected}`);
        for (const e of r.result.errors) console.log(`    · ${e.type}: "${e.wrong}" → "${e.right}" — ${e.explanation}`);
        if (r.result.tip) console.log(`    tip:       ${r.result.tip}`);
      }
      console.log(`    problem:   ${r.error ?? r.problems.join("; ")}`);
    }
  }

  const model = rows.filter((r) => r.result?.grader === "model");
  const sum = (f: (u: NonNullable<GradeResult["usage"]>) => number) => model.reduce((t, r) => t + f(r.result!.usage!), 0);
  const tokens = { input: sum((u) => u.inputTokens), output: sum((u) => u.outputTokens), cacheRead: sum((u) => u.cacheReadTokens), cacheWrite: sum((u) => u.cacheWriteTokens) };
  const cost = (tokens.input * PRICE.input + tokens.output * PRICE.output + tokens.cacheRead * PRICE.cacheRead + tokens.cacheWrite * PRICE.cacheWrite) / 1e6;
  const latencies = model.map((r) => r.ms).sort((a, b) => a - b);
  const pct = (p: number) => latencies[Math.min(latencies.length - 1, Math.floor(p * latencies.length))] ?? 0;
  const passed = rows.filter((r) => r.problems.length === 0).length;

  console.log(`\n${passed}/${rows.length} passed (${Math.round((passed / rows.length) * 100)}%)`);
  const held = rows.filter((r) => r.case.id.startsWith("holdout-"));
  if (held.length) {
    const heldPassed = held.filter((r) => r.problems.length === 0).length;
    console.log(`  held-out: ${heldPassed}/${held.length} · tuned: ${passed - heldPassed}/${rows.length - held.length}`);
  }
  console.log(`${model.length} graded by the model, ${rows.length - model.length} matched a reference answer, ${rows.filter((r) => r.result?.regraded).length} regraded`);
  console.log(`tokens: ${tokens.input} in, ${tokens.cacheRead} cached, ${tokens.cacheWrite} cache-written, ${tokens.output} out`);
  console.log(`cost: $${cost.toFixed(4)} this run, ~$${(cost / Math.max(1, model.length)).toFixed(5)} per model-graded answer`);
  console.log(`latency: median ${(pct(0.5) / 1000).toFixed(1)}s, p90 ${(pct(0.9) / 1000).toFixed(1)}s`);

  mkdirSync("evals/results", { recursive: true });
  const file = `evals/results/grading-${effort}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  writeFileSync(file, JSON.stringify({ model: GRADING_MODEL, effort, passed, total: rows.length, tokens, cost, rows }, null, 2));
  console.log(`saved ${file}`);
  const { client } = await import("../src/db");
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
