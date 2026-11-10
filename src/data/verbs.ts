import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { LEVELS } from "@/content/curriculum";
import { IMPERATIVE_PERSON_LABELS, PERSON_LABELS, PERSONS, type Person } from "@/content/persons";
import { TENSES, type TenseId } from "@/content/tenses";
import { PAST_ENGLISH } from "@/content/verb-past-english";
import { db } from "@/db";
import { stepProgress, steps, verbForms, verbProgress, verbs } from "@/db/schema";
import { gradeForm, type FormExercise } from "@/domain/grading/form-grader";
import { findActiveStep } from "@/domain/progress/journey";
import { englishMeaning, verbEnglish, type VerbEnglish } from "@/domain/verbs/english";
import type { AccentMode, GradeResult } from "@/domain/grading/types";
import { levelFor, masteryShare, planVerbCards, verbLevel, type PlannedVerbCard, type VerbLevel } from "@/domain/verbs/mastery";

// Reads and writes for the verb challenge. `userId` must come from getCurrentUser(): this
// connection bypasses RLS, so these filters are the protection.

const TENSE = new Map<string, (typeof TENSES)[number]>(TENSES.map((t) => [t.id, t]));
const TENSE_ORDER = new Map<string, number>(TENSES.map((t, i) => [t.id, i]));

export type VerbSet = "common" | "irregular" | "started" | "all";
export const VERB_SETS: VerbSet[] = ["common", "irregular", "started", "all"];

type CatalogVerb = {
  infinitive: string;
  english: string;
  parts: VerbEnglish; // for saying what each form means
  rank: number | null;
  irregular: boolean;
  tenses: { tenseId: TenseId; persons: Person[]; irregular: boolean }[];
};

// Every verb with the tenses and persons it has. Content only changes when it's re-seeded,
// so it's read once per server process.
let catalog: Promise<Map<string, CatalogVerb>> | undefined;

function getCatalog() {
  catalog ??= (async () => {
    const [verbRows, tenseRows] = await Promise.all([
      db
        .select({
          infinitive: verbs.infinitive,
          english: verbs.english,
          gerund: verbs.gerundEnglish,
          participle: verbs.pastParticipleEnglish,
          rank: verbs.frequencyRank,
        })
        .from(verbs),
      db
        .select({
          infinitive: verbForms.infinitive,
          tenseId: verbForms.tenseId,
          persons: sql<Person[]>`array_agg(${verbForms.person}::text)`,
          irregular: sql<boolean>`bool_or(${verbForms.isIrregular})`,
        })
        .from(verbForms)
        .groupBy(verbForms.infinitive, verbForms.tenseId),
    ]);
    const map = new Map<string, CatalogVerb>();
    for (const v of verbRows) {
      const parts = verbEnglish({ english: v.english, gerund: v.gerund, participle: v.participle, past: PAST_ENGLISH[v.infinitive] });
      map.set(v.infinitive, { infinitive: v.infinitive, english: v.english, parts, rank: v.rank, irregular: false, tenses: [] });
    }
    for (const t of tenseRows) {
      const v = map.get(t.infinitive);
      if (!v || !TENSE.has(t.tenseId)) continue;
      v.tenses.push({ tenseId: t.tenseId as TenseId, persons: PERSONS.filter((p) => t.persons.includes(p)), irregular: t.irregular });
      v.irregular ||= t.irregular;
    }
    for (const v of map.values()) v.tenses.sort((a, b) => TENSE_ORDER.get(a.tenseId)! - TENSE_ORDER.get(b.tenseId)!);
    // Most common first, then alphabetical.
    return new Map(
      [...map.values()].sort((a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9) || a.infinitive.localeCompare(b.infinitive, "es")).map((v) => [v.infinitive, v]),
    );
  })().catch((err) => {
    catalog = undefined;
    throw err;
  });
  return catalog;
}

// Right answers per verb and tense: Map<infinitive, Map<tenseId, correct>>.
async function getProgress(userId: string, infinitive?: string) {
  const rows = await db
    .select({ infinitive: verbProgress.infinitive, tenseId: verbProgress.tenseId, correct: verbProgress.correct, attempts: verbProgress.attempts })
    .from(verbProgress)
    .where(infinitive ? and(eq(verbProgress.userId, userId), eq(verbProgress.infinitive, infinitive)) : eq(verbProgress.userId, userId));
  const map = new Map<string, Map<string, number>>();
  for (const r of rows) {
    if (!map.has(r.infinitive)) map.set(r.infinitive, new Map());
    map.get(r.infinitive)!.set(r.tenseId, r.correct);
  }
  return { map, attempts: rows.reduce((n, r) => n + r.attempts, 0), correct: rows.reduce((n, r) => n + r.correct, 0) };
}

const countsFor = (verb: CatalogVerb, progress?: Map<string, number>) => verb.tenses.map((t) => progress?.get(t.tenseId) ?? 0);

export type VerbListItem = { infinitive: string; english: string; common: boolean; irregular: boolean; started: boolean; level: string | null; share: number };

// The verb library, with how far along each verb is.
export async function getVerbOverview(userId: string) {
  const [all, progress] = await Promise.all([getCatalog(), getProgress(userId)]);
  const items: VerbListItem[] = [...all.values()].map((v) => {
    const counts = countsFor(v, progress.map.get(v.infinitive));
    return {
      infinitive: v.infinitive,
      english: v.english,
      common: v.rank !== null,
      irregular: v.irregular,
      started: progress.map.has(v.infinitive),
      level: verbLevel(counts)?.name ?? null,
      share: masteryShare(counts),
    };
  });
  return {
    verbs: items,
    started: items.filter((v) => v.started).length,
    mastered: items.filter((v) => v.level === "Mastered").length,
    answered: progress.attempts,
    correct: progress.correct,
  };
}

// One verb, tense by tense.
export async function getVerbDetail(userId: string, infinitive: string) {
  const verb = (await getCatalog()).get(infinitive);
  if (!verb) return null;
  const progress = (await getProgress(userId, infinitive)).map.get(infinitive);
  const tenses = verb.tenses.map((t) => {
    const correct = progress?.get(t.tenseId) ?? 0;
    const def = TENSE.get(t.tenseId)!;
    return {
      tenseId: t.tenseId,
      // What the tense means with this verb, said for yo (tú for commands, which have no yo).
      meaning: englishMeaning(verb.parts, t.tenseId, t.persons.includes("1s") ? "1s" : "2s"),
      nameEn: def.nameEn,
      nameEs: def.nameEs,
      mood: def.mood,
      irregular: t.irregular,
      correct,
      level: levelFor(correct)?.name ?? null,
    };
  });
  const counts = tenses.map((t) => t.correct);
  return {
    infinitive: verb.infinitive,
    english: verb.english,
    irregular: verb.irregular,
    tenses,
    level: verbLevel(counts)?.name ?? null,
    share: masteryShare(counts),
  };
}

export type ChallengeOptions = { verb?: string; tense?: string; set?: VerbSet; tenses?: string[] };

export type VerbCard = {
  key: string;
  infinitive: string;
  english: string;
  tenseId: TenseId;
  tenseName: string;
  tenseNameEs: string;
  person: Person;
  personLabel: string;
  meaning: string; // what the form means: "(if) you spoke"
  correct: number; // right answers so far for this verb in this tense
};

// The next cards of a challenge: one verb (one tense, or all its tenses, weakest first),
// or a mix from a set of verbs in the chosen tenses. No answers are sent.
export async function planVerbChallenge(userId: string, options: ChallengeOptions, previous?: PlannedVerbCard, count = 20): Promise<VerbCard[]> {
  const [all, progress] = await Promise.all([getCatalog(), getProgress(userId, options.verb)]);
  const tenseFilter = options.verb ? (options.tense ? [options.tense] : null) : options.tenses?.length ? options.tenses : ["ind_present"];
  let pool: CatalogVerb[];
  if (options.verb) pool = all.get(options.verb) ? [all.get(options.verb)!] : [];
  else {
    const set = options.set ?? "common";
    pool = [...all.values()].filter((v) =>
      set === "common" ? v.rank !== null : set === "irregular" ? v.irregular : set === "started" ? progress.map.has(v.infinitive) : true,
    );
  }

  const plan = planVerbCards(
    pool.map((v) => ({
      infinitive: v.infinitive,
      tenses: v.tenses
        .filter((t) => !tenseFilter || tenseFilter.includes(t.tenseId))
        .map((t) => ({ tenseId: t.tenseId, persons: t.persons, correct: progress.map.get(v.infinitive)?.get(t.tenseId) ?? 0 })),
    })),
    count,
    Math.random,
    previous,
  );
  return plan.map((c, i) => {
    const def = TENSE.get(c.tenseId)!;
    const labels = def.mood === "imperative" ? IMPERATIVE_PERSON_LABELS : PERSON_LABELS;
    return {
      key: `${Date.now().toString(36)}-${i}`,
      infinitive: c.infinitive,
      english: all.get(c.infinitive)!.english,
      tenseId: c.tenseId as TenseId,
      tenseName: def.nameEn,
      tenseNameEs: def.nameEs,
      person: c.person,
      personLabel: labels[c.person],
      meaning: englishMeaning(all.get(c.infinitive)!.parts, c.tenseId, c.person),
      correct: progress.map.get(c.infinitive)?.get(c.tenseId) ?? 0,
    };
  });
}

export type VerbGrade = { result: GradeResult; correct: number; tenseLevelUp: VerbLevel | null; verbLevelUp: VerbLevel | null };

// Grades one answer and counts it. A right answer (or one only missing an accent, unless
// accents are strict) adds one to the verb's count in that tense.
export async function gradeVerbAnswer(
  userId: string,
  card: { infinitive: string; tenseId: string; person: Person },
  answer: string,
  accentMode: AccentMode,
): Promise<VerbGrade | null> {
  const verb = (await getCatalog()).get(card.infinitive);
  if (!verb?.tenses.some((t) => t.tenseId === card.tenseId && t.persons.includes(card.person))) return null;

  const forms = await db.select().from(verbForms).where(eq(verbForms.infinitive, card.infinitive));
  const expected = forms.find((f) => f.tenseId === card.tenseId && f.person === card.person);
  if (!expected) return null;
  const exercise: FormExercise = {
    skillId: `verb:${card.infinitive}:${card.tenseId}:${card.person}`,
    infinitive: card.infinitive,
    expected: {
      tenseId: expected.tenseId as TenseId,
      person: expected.person,
      form: expected.form,
      alternates: expected.alternates,
      isIrregular: expected.isIrregular,
    },
    verbForms: forms.map((f) => ({ tenseId: f.tenseId as TenseId, person: f.person, form: f.form, alternates: f.alternates })),
  };
  const result = gradeForm(exercise, answer, accentMode);
  const right = result.verdict !== "incorrect" ? 1 : 0;

  const before = (await getProgress(userId, card.infinitive)).map.get(card.infinitive);
  const [row] = await db
    .insert(verbProgress)
    .values({ userId, infinitive: card.infinitive, tenseId: card.tenseId, correct: right, attempts: 1 })
    .onConflictDoUpdate({
      target: [verbProgress.userId, verbProgress.infinitive, verbProgress.tenseId],
      set: { correct: sql`${verbProgress.correct} + ${right}`, attempts: sql`${verbProgress.attempts} + 1`, updatedAt: sql`now()` },
    })
    .returning({ correct: verbProgress.correct });

  const after = new Map(before);
  after.set(card.tenseId, row.correct);
  const was = levelFor(row.correct - right);
  const now = levelFor(row.correct);
  const verbWas = verbLevel(countsFor(verb, before));
  const verbNow = verbLevel(countsFor(verb, after));
  return {
    result,
    correct: row.correct,
    tenseLevelUp: now && now !== was ? now : null,
    verbLevelUp: verbNow && verbNow !== verbWas ? verbNow : null,
  };
}

// Tenses the journey has taught so far: those in completed steps and the step in progress.
export async function getTaughtTenses(userId: string): Promise<TenseId[]> {
  const [allSteps, done] = await Promise.all([
    db.select({ id: steps.id, levelId: steps.levelId, position: steps.position }).from(steps),
    db
      .select({ stepId: stepProgress.stepId })
      .from(stepProgress)
      .where(and(eq(stepProgress.userId, userId), eq(stepProgress.status, "completed"))),
  ]);
  const reached = new Set(done.map((d) => d.stepId));
  const active = findActiveStep(allSteps, reached);
  if (active) reached.add(active.id);
  const taught = new Set<TenseId>();
  for (const level of LEVELS) for (const step of level.steps) if (reached.has(step.id)) for (const t of step.forms?.tenses ?? []) taught.add(t);
  return TENSES.map((t) => t.id).filter((id) => taught.has(id));
}
