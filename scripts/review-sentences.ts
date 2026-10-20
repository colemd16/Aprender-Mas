// Quality review for the sentence bank: grades each exercise's main Spanish answer
// against its own English prompt — with no reference answers to lean on — and retires
// any that don't come back cleanly correct.
//   npm run review:sentences            every exercise not reviewed yet
//   npm run review:sentences -- --dry-run
// Calls the Anthropic API (about $0.0002 per sentence).
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { gradeSentence } from "../src/domain/grading/sentence/grade";
import { anthropic, GRADING_MODEL } from "../src/lib/anthropic";

const dryRun = process.argv.includes("--dry-run");
const concurrency = 8;

async function main() {
  const { db, client } = await import("../src/db");
  const s = await import("../src/db/schema");
  const { getAccentLexicon } = await import("../src/data/lexicon");
  const lexicon = await getAccentLexicon();

  const pending = await db
    .select({ id: s.exercises.id, prompt: s.exercises.prompt, references: s.exercises.references, hints: s.exercises.hints })
    .from(s.exercises)
    .where(and(isNull(s.exercises.reviewedAt), isNull(s.exercises.retiredAt)));
  const links = pending.length
    ? await db
        .select({ exerciseId: s.exerciseSkills.exerciseId, id: s.skills.id, title: s.skills.title })
        .from(s.exerciseSkills)
        .innerJoin(s.skills, eq(s.skills.id, s.exerciseSkills.skillId))
        .where(inArray(s.exerciseSkills.exerciseId, pending.map((p) => p.id)))
    : [];
  console.log(`Reviewing ${pending.length} sentences${dryRun ? " (dry run)" : ""}…\n`);

  let passed = 0;
  let retired = 0;
  let cost = 0;
  const reasons = new Map<string, number>();
  const queue = [...pending];

  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      for (let e = queue.shift(); e; e = queue.shift()) {
        const exercise = { prompt: e.prompt, references: [], hints: e.hints, skills: links.filter((l) => l.exerciseId === e.id).map(({ id, title }) => ({ id, title })) };
        try {
          const result = await gradeSentence(exercise, e.references[0], { client: anthropic(), model: GRADING_MODEL, lexicon });
          const u = result.usage;
          if (u) cost += (u.inputTokens * 0.1 + u.cacheReadTokens * 0.01 + u.cacheWriteTokens * 0.125 + u.outputTokens * 0.5) / 1e6;

          if (result.verdict === "correct") {
            passed++;
            if (!dryRun) await db.update(s.exercises).set({ reviewedAt: sql`now()` }).where(eq(s.exercises.id, e.id));
          } else {
            retired++;
            const why = result.errors.map((x) => `${x.type}: ${x.wrong} → ${x.right}`).join("; ");
            for (const x of result.errors) reasons.set(x.type, (reasons.get(x.type) ?? 0) + 1);
            console.log(`✗ ${e.prompt}\n    ${e.references[0]}\n    ${why}${result.tip ? `\n    tip: ${result.tip}` : ""}`);
            if (!dryRun) await db.update(s.exercises).set({ retiredAt: sql`now()`, retiredReason: why.slice(0, 500) }).where(eq(s.exercises.id, e.id));
          }
        } catch (err) {
          console.log(`! ${e.prompt}: ${err instanceof Error ? err.message : err} (left for the next run)`);
        }
      }
    }),
  );

  console.log(`\n${passed} passed, ${retired} retired${dryRun ? " (dry run — nothing written)" : ""}`);
  if (reasons.size) console.log(`reasons: ${[...reasons].sort((a, b) => b[1] - a[1]).map(([r, n]) => `${r} ${n}`).join(", ")}`);
  console.log(`cost: $${cost.toFixed(4)}`);
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
