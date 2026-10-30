// Fills the sentence bank: for each learn step, asks the model for practice sentences,
// checks every one, and saves the ones that pass as exercises.
//   npm run generate:sentences                     every step that doesn't have sentences yet
//   npm run generate:sentences -- --step=l1-ser-present
//   npm run generate:sentences -- --level=1 --dry-run   print, don't save
// Calls the Anthropic API.
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { count, inArray, isNull } from "drizzle-orm";
import { TENSES, type TenseId } from "../src/content/tenses";
import { buildStepContexts, type StepContext } from "../src/domain/generation/context";
import { buildFormIndex } from "../src/domain/generation/form-index";
import { buildGenerationRequest, FORM_SENTENCES_PER_SKILL, GENERATION_SYSTEM_PROMPT, GenerationOutput, splitRequests, USAGE_SENTENCES_PER_SKILL } from "../src/domain/generation/prompt";
import { validateCandidate, type ValidExercise } from "../src/domain/generation/validate";
import { buildAccentLexicon } from "../src/domain/grading/accents";
import { compareKey } from "../src/domain/grading/normalize";
import { anthropic, GENERATION_MODEL } from "../src/lib/anthropic";

const PRICE = { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 }; // Haiku 5.5, per MTok

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const dryRun = process.argv.includes("--dry-run");
const onlyStep = arg("step");
const onlyLevel = arg("level") ? Number(arg("level")) : undefined;
const concurrency = Number(arg("concurrency") ?? 4);

const tenseNames = new Map<string, string>(TENSES.map((t) => [t.id, t.nameEn]));

async function main() {
  const { db, client } = await import("../src/db");
  const s = await import("../src/db/schema");

  const contexts = buildStepContexts().filter(
    (c) => (!onlyStep || c.stepId === onlyStep) && (!onlyLevel || c.level.number === onlyLevel) && (c.targetUsage.length || c.targetForms.length),
  );
  const curriculumVerbs = [...new Set(contexts.flatMap((c) => c.knownVerbs).concat(buildStepContexts().flatMap((c) => c.knownVerbs)))];

  const [formRows, existing, perStep] = await Promise.all([
    db.select().from(s.verbForms).where(inArray(s.verbForms.infinitive, curriculumVerbs)),
    db.select({ prompt: s.exercises.prompt }).from(s.exercises).where(isNull(s.exercises.retiredAt)),
    db.select({ stepId: s.exercises.stepId, n: count() }).from(s.exercises).where(isNull(s.exercises.retiredAt)).groupBy(s.exercises.stepId),
  ]);
  const forms = buildFormIndex(formRows.map((f) => ({ ...f, tenseId: f.tenseId as TenseId })));
  const lexicon = buildAccentLexicon(formRows.flatMap((f) => [f.form, ...f.alternates]));
  const formText = new Map(formRows.map((f) => [`form:${f.infinitive}:${f.tenseId}:${f.person}`, f.form]));
  const seen = new Set(existing.map((e) => compareKey(e.prompt)));
  const have = new Map(perStep.map((r) => [r.stepId, r.n]));

  const wanted = (c: StepContext) => c.targetUsage.length * USAGE_SENTENCES_PER_SKILL + c.targetForms.length * FORM_SENTENCES_PER_SKILL;
  const todo = contexts.filter((c) => onlyStep || (have.get(c.stepId) ?? 0) < wanted(c) * 0.6);
  console.log(`${todo.length} step(s) to fill with ${GENERATION_MODEL}${dryRun ? " (dry run)" : ""}\n`);

  const totals = { saved: 0, rejected: 0, failed: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
  const reasons = new Map<string, number>();

  async function fill(ctx: StepContext) {
    const response = await anthropic().messages.parse({
      model: GENERATION_MODEL,
      max_tokens: 16000,
      system: [{ type: "text", text: GENERATION_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: buildGenerationRequest(ctx, (id) => formText.get(id)) }],
      output_config: { format: zodOutputFormat(GenerationOutput), effort: "medium" },
    });
    totals.input += response.usage.input_tokens;
    totals.output += response.usage.output_tokens;
    totals.cacheRead += response.usage.cache_read_input_tokens ?? 0;
    totals.cacheWrite += response.usage.cache_creation_input_tokens ?? 0;
    if (response.stop_reason !== "end_turn" || !response.parsed_output) {
      console.log(`✗ ${ctx.stepId}: generation stopped (${response.stop_reason})`);
      totals.failed++;
      return;
    }

    const accepted: ValidExercise[] = [];
    const rejected: string[] = [];
    for (const candidate of response.parsed_output.sentences) {
      const v = validateCandidate(candidate, ctx, { forms, lexicon, tenseName: (id) => tenseNames.get(id) ?? id });
      const key = compareKey(candidate.english);
      if (!v.ok || seen.has(key)) {
        const reason = v.ok ? "duplicate" : v.reason.split(":")[0];
        reasons.set(reason, (reasons.get(reason) ?? 0) + 1);
        rejected.push(`${candidate.english} → ${candidate.spanish[0]}  [${v.ok ? "duplicate" : v.reason}]`);
        continue;
      }
      seen.add(key);
      accepted.push(v.exercise);
    }

    if (!dryRun && accepted.length) {
      await db.transaction(async (tx) => {
        for (const e of accepted) {
          const [row] = await tx
            .insert(s.exercises)
            .values({ stepId: ctx.stepId, prompt: e.prompt, references: e.references, hints: e.hints, source: "generated", model: GENERATION_MODEL })
            .returning({ id: s.exercises.id });
          await tx.insert(s.exerciseSkills).values(e.skillIds.map((skillId) => ({ exerciseId: row.id, skillId })));
        }
      });
    }
    totals.saved += accepted.length;
    totals.rejected += rejected.length;

    const part = ctx.targetUsage[0]?.id ?? `${ctx.targetForms.length} forms`;
    console.log(`✓ ${ctx.stepId.padEnd(28)} ${String(accepted.length).padStart(2)} saved, ${rejected.length} rejected (wanted ${wanted(ctx)}) · ${part}`);
    const show = dryRun ? accepted : accepted.slice(0, 3);
    for (const e of show) console.log(`    ${e.prompt}  →  ${e.references.join("  |  ")}   [${e.skillIds.map((id) => id.replace(/^(form|usage):/, "")).join(", ")}]`);
    for (const r of dryRun ? rejected : rejected.slice(0, 2)) console.log(`    ✗ ${r}`);
  }

  // Each step goes out as several smaller requests.
  const queue = todo.flatMap(splitRequests);
  if (queue.length) await fill(queue.shift()!); // writes the prompt cache for the rest
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      for (let c = queue.shift(); c; c = queue.shift()) {
        try {
          await fill(c);
        } catch (err) {
          console.log(`✗ ${c.stepId}: ${err instanceof Error ? err.message.slice(0, 120) : err}`);
          totals.failed++;
        }
      }
    }),
  );

  const cost = (totals.input * PRICE.input + totals.output * PRICE.output + totals.cacheRead * PRICE.cacheRead + totals.cacheWrite * PRICE.cacheWrite) / 1e6;
  console.log(`\n${totals.saved} saved, ${totals.rejected} rejected, ${totals.failed} request(s) failed${dryRun ? " (dry run — nothing written)" : ""}`);
  if (reasons.size) console.log(`rejections: ${[...reasons].map(([r, n]) => `${r} ${n}`).join(", ")}`);
  console.log(`cost: $${cost.toFixed(4)} (${totals.input + totals.cacheRead + totals.cacheWrite} in, ${totals.output} out)`);
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
