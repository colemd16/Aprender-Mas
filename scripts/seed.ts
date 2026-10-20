// Loads all shared content into the database: tenses, verbs and their forms (from Fred
// Jehle's CSV), concepts, error types, and the curriculum (levels, steps, skills).
// Safe to re-run after editing src/content/: rows are upserted.
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import { readFileSync } from "node:fs";
import { parse } from "csv-parse/sync";
import { getTableColumns, sql, type SQL } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { CONCEPTS } from "../src/content/concepts";
import { LEVELS } from "../src/content/curriculum";
import { ERROR_TYPES } from "../src/content/error-types";
import { JEHLE_PERSON_COLUMNS, PERSONS } from "../src/content/persons";
import { SUPPLEMENTAL_VERBS } from "../src/content/supplemental-verbs";
import { TENSES, type TenseId } from "../src/content/tenses";
import { VERB_FREQUENCY } from "../src/content/verb-frequency";
import { buildVerbForms, type SourceVerb } from "../src/domain/conjugation/forms";
import { buildCurriculum } from "../src/domain/curriculum/skills";

const CSV_PATH = "data/fred-jehle-spanish-verbs/jehle_verb_database.csv";
const BATCH_SIZE = 1000;

type CsvRow = Record<string, string>;

function readVerbs() {
  const rows: CsvRow[] = parse(readFileSync(CSV_PATH), { columns: true });
  const tenseByJehle = new Map<string, TenseId>();
  for (const t of TENSES) if ("jehle" in t) tenseByJehle.set(t.jehle.join("|"), t.id);

  const verbs = new Map<string, SourceVerb & { english: string; gerundEnglish: string; pastParticipleEnglish: string }>();
  for (const r of rows) {
    let verb = verbs.get(r.infinitive);
    if (!verb) {
      verb = {
        infinitive: r.infinitive,
        english: r.infinitive_english,
        gerund: r.gerund,
        gerundEnglish: r.gerund_english,
        pastParticiple: r.pastparticiple,
        pastParticipleEnglish: r.pastparticiple_english,
        forms: {},
      };
      verbs.set(r.infinitive, verb);
    }
    const tenseId = tenseByJehle.get(`${r.mood}|${r.tense}`);
    if (!tenseId) continue; // archaic tenses we don't teach
    const forms: Partial<Record<(typeof PERSONS)[number], string>> = {};
    for (const p of PERSONS) if (r[JEHLE_PERSON_COLUMNS[p]]) forms[p] = r[JEHLE_PERSON_COLUMNS[p]];
    verb.forms[tenseId] = forms;
  }
  for (const v of SUPPLEMENTAL_VERBS) {
    if (verbs.has(v.infinitive)) throw new Error(`Supplemental verb ${v.infinitive} is already in the dataset`);
    verbs.set(v.infinitive, v);
  }
  return verbs;
}

// "On conflict, overwrite every column except the key" — keeps content edits in sync.
function upsertSet(table: PgTable, keep: string[]) {
  const set: Record<string, SQL> = {};
  for (const [key, col] of Object.entries(getTableColumns(table))) {
    if (!keep.includes(key)) set[key] = sql.raw(`excluded."${col.name}"`);
  }
  return set;
}

async function main() {
  const { db, client } = await import("../src/db");
  const s = await import("../src/db/schema");

  async function upsert<T extends PgTable>(table: T, rows: T["$inferInsert"][], key: (keyof T["$inferInsert"] & string)[], label: string) {
    const target = key.map((k) => getTableColumns(table)[k]);
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      await db
        .insert(table)
        .values(rows.slice(i, i + BATCH_SIZE))
        .onConflictDoUpdate({ target, set: upsertSet(table, key) });
    }
    console.log(`${label.padEnd(14)} ${rows.length}`);
  }

  const sourceVerbs = readVerbs();
  const rank = new Map(VERB_FREQUENCY.map((v, i) => [v, i + 1]));
  for (const v of VERB_FREQUENCY) if (!sourceVerbs.has(v)) console.warn(`⚠ frequency list verb not in dataset: ${v}`);

  const curriculum = buildCurriculum();
  const auxiliaries = { ir: sourceVerbs.get("ir")!, estar: sourceVerbs.get("estar")! };
  const verbForms = [...sourceVerbs.values()].flatMap((v) => buildVerbForms(v, auxiliaries));

  // Every form skill must point at a form that exists.
  const formKeys = new Set(verbForms.map((f) => `${f.infinitive}:${f.tenseId}:${f.person}`));
  const missing = curriculum.skills.filter(
    (sk) => sk.kind === "form" && !formKeys.has(`${sk.infinitive}:${sk.tenseId}:${sk.person}`),
  );
  if (missing.length) throw new Error(`Curriculum uses forms missing from the dataset: ${missing.map((m) => m.id).join(", ")}`);

  await upsert(s.tenses, TENSES.map((t, i) => ({ id: t.id, mood: t.mood, kind: t.kind, nameEs: t.nameEs, nameEn: t.nameEn, englishExample: t.englishExample, position: i + 1 })), ["id"], "tenses");
  await upsert(
    s.verbs,
    [...sourceVerbs.values()].map((v) => ({
      infinitive: v.infinitive,
      english: v.english,
      gerund: v.gerund,
      gerundEnglish: v.gerundEnglish,
      pastParticiple: v.pastParticiple,
      pastParticipleEnglish: v.pastParticipleEnglish,
      isReflexive: v.infinitive.endsWith("se"),
      frequencyRank: rank.get(v.infinitive) ?? null,
    })),
    ["infinitive"],
    "verbs",
  );
  await upsert(s.verbForms, verbForms, ["infinitive", "tenseId", "person"], "verb forms");
  await upsert(s.concepts, CONCEPTS.map(({ id, title, summary, explanation }) => ({ id, title, summary, explanation })), ["id"], "concepts");
  await upsert(s.errorTypes, ERROR_TYPES.map((e) => ({ ...e, conceptId: e.conceptId ?? null })), ["id"], "error types");
  await upsert(s.levels, LEVELS.map((l) => ({ id: l.number, title: l.title, summary: l.summary })), ["id"], "levels");
  await upsert(s.skills, curriculum.skills, ["id"], "skills");

  // Steps and their skills are rebuilt so reordering or moving a skill can't hit a
  // unique-constraint clash mid-update. step_skills cascades from steps.
  await db.transaction(async (tx) => {
    await tx.delete(s.stepSkills);
    // Positions shift temporarily so (level, position) stays unique while reordering.
    await tx.update(s.steps).set({ position: sql`${s.steps.position} + 1000` });
    for (const step of curriculum.steps) {
      await tx.insert(s.steps).values(step).onConflictDoUpdate({ target: s.steps.id, set: upsertSet(s.steps, ["id"]) });
    }
    await tx.insert(s.stepSkills).values(curriculum.stepSkills);
  });
  console.log(`${"steps".padEnd(14)} ${curriculum.steps.length}`);
  console.log(`${"step skills".padEnd(14)} ${curriculum.stepSkills.length}`);

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
