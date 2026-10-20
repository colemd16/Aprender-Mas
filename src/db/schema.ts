import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgPolicy,
  pgTable,
  primaryKey,
  real,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { authenticatedRole, authUid, authUsers } from "drizzle-orm/supabase";

// Row Level Security: every table has it on. Shared content is read-only for signed-in
// users; personal tables only expose rows whose user_id matches the signed-in user.
// The app's own server code connects as the database owner and bypasses these rules,
// so it must always filter by user id itself (see src/lib/auth.ts).
const readableBySignedInUsers = () =>
  pgPolicy("signed-in users can read", { for: "select", to: authenticatedRole, using: sql`true` });

const ownRowsOnly = () =>
  pgPolicy("users manage their own rows", {
    for: "all",
    to: authenticatedRole,
    using: sql`user_id = ${authUid}`,
    withCheck: sql`user_id = ${authUid}`,
  });

export const moodEnum = pgEnum("mood", ["indicative", "subjunctive", "imperative"]);
export const tenseKindEnum = pgEnum("tense_kind", ["simple", "compound", "periphrastic"]);
export const personEnum = pgEnum("person", ["1s", "2s", "3s", "1p", "3p"]);
export const skillKindEnum = pgEnum("skill_kind", ["form", "usage"]);
export const stepKindEnum = pgEnum("step_kind", ["learn", "checkpoint"]);
export const stepStatusEnum = pgEnum("step_status", ["active", "completed"]);
export const accentModeEnum = pgEnum("accent_mode", ["warn", "strict"]);
export const exerciseSourceEnum = pgEnum("exercise_source", ["generated", "hand_written"]);
export const sessionKindEnum = pgEnum("session_kind", ["learn", "review", "checkpoint"]);
export const attemptKindEnum = pgEnum("attempt_kind", ["form", "sentence"]);
export const inputModeEnum = pgEnum("input_mode", ["typed", "spoken"]);
export const verdictEnum = pgEnum("verdict", ["correct", "acceptable", "incorrect"]);
export const graderEnum = pgEnum("grader", ["engine", "model"]);

// ─── Shared content ──────────────────────────────────────────────────────────
// Written in src/content/, loaded by scripts/seed.ts.

export const tenses = pgTable(
  "tenses",
  {
    id: text("id").primaryKey(),
    mood: moodEnum("mood").notNull(),
    kind: tenseKindEnum("kind").notNull(),
    nameEs: text("name_es").notNull(),
    nameEn: text("name_en").notNull(),
    englishExample: text("english_example").notNull(),
    position: integer("position").notNull(),
  },
  () => [readableBySignedInUsers()],
);

// Verb data from Fred Jehle's Spanish Verb Database (CC BY-NC-SA 3.0).
export const verbs = pgTable(
  "verbs",
  {
    infinitive: text("infinitive").primaryKey(),
    english: text("english").notNull(),
    gerund: text("gerund").notNull(),
    gerundEnglish: text("gerund_english").notNull(),
    pastParticiple: text("past_participle").notNull(),
    pastParticipleEnglish: text("past_participle_english").notNull(),
    isReflexive: boolean("is_reflexive").notNull(),
    frequencyRank: integer("frequency_rank"),
  },
  () => [readableBySignedInUsers()],
);

// One row per verb × tense × person. Missing forms (e.g. imperative yo) have no row.
export const verbForms = pgTable(
  "verb_forms",
  {
    infinitive: text("infinitive")
      .notNull()
      .references(() => verbs.infinitive),
    tenseId: text("tense_id")
      .notNull()
      .references(() => tenses.id),
    person: personEnum("person").notNull(),
    form: text("form").notNull(),
    // Other correct forms: -se imperfect subjunctive, attached reflexive pronouns.
    alternates: text("alternates").array().notNull().default(sql`'{}'::text[]`),
    isIrregular: boolean("is_irregular").notNull(),
  },
  (t) => [primaryKey({ columns: [t.infinitive, t.tenseId, t.person] }), readableBySignedInUsers()],
);

export const concepts = pgTable(
  "concepts",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    explanation: text("explanation").notNull(),
  },
  () => [readableBySignedInUsers()],
);

export const errorTypes = pgTable(
  "error_types",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    conceptId: text("concept_id").references(() => concepts.id),
    countsAsError: boolean("counts_as_error").notNull(),
  },
  () => [readableBySignedInUsers()],
);

// Form skills point at an exact verb form; usage skills point at a concept.
export const skills = pgTable(
  "skills",
  {
    id: text("id").primaryKey(),
    kind: skillKindEnum("kind").notNull(),
    title: text("title").notNull(),
    conceptId: text("concept_id").references(() => concepts.id),
    infinitive: text("infinitive"),
    tenseId: text("tense_id"),
    person: personEnum("person"),
  },
  (t) => [
    foreignKey({
      name: "skills_verb_form_fk",
      columns: [t.infinitive, t.tenseId, t.person],
      foreignColumns: [verbForms.infinitive, verbForms.tenseId, verbForms.person],
    }),
    check(
      "form_skills_have_a_form",
      sql`(${t.kind} = 'form') = (${t.infinitive} is not null and ${t.tenseId} is not null and ${t.person} is not null)`,
    ),
    readableBySignedInUsers(),
  ],
);

export const levels = pgTable(
  "levels",
  {
    id: integer("id").primaryKey(), // the level number
    title: text("title").notNull(),
    summary: text("summary").notNull(),
  },
  () => [readableBySignedInUsers()],
);

export const steps = pgTable(
  "steps",
  {
    id: text("id").primaryKey(),
    levelId: integer("level_id")
      .notNull()
      .references(() => levels.id),
    position: integer("position").notNull(),
    title: text("title").notNull(),
    kind: stepKindEnum("kind").notNull(),
    conceptId: text("concept_id").references(() => concepts.id),
  },
  (t) => [unique().on(t.levelId, t.position), readableBySignedInUsers()],
);

// The skills a learn step introduces. Checkpoints draw from their whole level instead.
export const stepSkills = pgTable(
  "step_skills",
  {
    stepId: text("step_id")
      .notNull()
      .references(() => steps.id, { onDelete: "cascade" }),
    skillId: text("skill_id")
      .notNull()
      .references(() => skills.id),
  },
  (t) => [primaryKey({ columns: [t.stepId, t.skillId] }), unique().on(t.skillId), readableBySignedInUsers()],
);

// Sentence exercises: what the learner is asked to say, and the skills each trains.
// Form drills ("estar · nosotros · imperfect") are built from skills directly and have
// no row here.
export const exercises = pgTable(
  "exercises",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    stepId: text("step_id").references(() => steps.id), // the step it was written for
    prompt: text("prompt").notNull(),
    references: text("references").array().notNull(),
    hints: jsonb("hints").$type<Record<string, string>>().notNull().default({}),
    source: exerciseSourceEnum("source").notNull(),
    model: text("model"), // which model generated it, if any
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }), // passed the quality review
    retiredAt: timestamp("retired_at", { withTimezone: true }), // retired exercises are never shown
    retiredReason: text("retired_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check("has_a_reference", sql`cardinality(${t.references}) > 0`), index("exercises_by_step").on(t.stepId), readableBySignedInUsers()],
);

export const exerciseSkills = pgTable(
  "exercise_skills",
  {
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    skillId: text("skill_id")
      .notNull()
      .references(() => skills.id),
  },
  (t) => [primaryKey({ columns: [t.exerciseId, t.skillId] }), index("exercise_skills_by_skill").on(t.skillId), readableBySignedInUsers()],
);

// ─── Per user ────────────────────────────────────────────────────────────────

// One row per Supabase Auth user, created automatically by a database trigger
// (drizzle/0001_create_profile_on_signup.sql). Deleting the auth user deletes everything.
export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id")
      .primaryKey()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    displayName: text("display_name"),
    accentMode: accentModeEnum("accent_mode").notNull().default("warn"),
    timezone: text("timezone"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  () => [
    pgPolicy("users read their own profile", { for: "select", to: authenticatedRole, using: sql`id = ${authUid}` }),
    pgPolicy("users update their own profile", {
      for: "update",
      to: authenticatedRole,
      using: sql`id = ${authUid}`,
      withCheck: sql`id = ${authUid}`,
    }),
  ],
);

export const stepProgress = pgTable(
  "step_progress",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    stepId: text("step_id")
      .notNull()
      .references(() => steps.id),
    status: stepStatusEnum("status").notNull().default("active"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.stepId] }),
    check("completed_steps_have_a_date", sql`(${t.status} = 'completed') = (${t.completedAt} is not null)`),
    ownRowsOnly(),
  ],
);

export const checkpointAttempts = pgTable(
  "checkpoint_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    stepId: text("step_id")
      .notNull()
      .references(() => steps.id),
    score: real("score").notNull(),
    passed: boolean("passed").notNull(),
    takenAt: timestamp("taken_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check("score_is_a_fraction", sql`${t.score} between 0 and 1`), ownRowsOnly()],
);

// "Don't show me this sentence again" — one person's flag, so it hides the exercise
// for them only. Retiring an exercise for everyone is exercises.retired_at.
export const exerciseFlags = pgTable(
  "exercise_flags",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.exerciseId] }), ownRowsOnly()],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    kind: sessionKindEnum("kind").notNull(),
    stepId: text("step_id").references(() => steps.id),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
  },
  (t) => [unique("sessions_id_user").on(t.id, t.userId), index("sessions_by_user").on(t.userId, t.startedAt), ownRowsOnly()],
);

// Every answer, as graded. Child rows (skill results, errors) repeat user_id, and a
// composite foreign key guarantees it matches the attempt's.
export const attempts = pgTable(
  "attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id").notNull(),
    kind: attemptKindEnum("kind").notNull(),
    exerciseId: uuid("exercise_id").references(() => exercises.id),
    prompt: text("prompt").notNull(), // what was asked, kept even if the exercise changes
    answer: text("answer").notNull(),
    inputMode: inputModeEnum("input_mode").notNull(),
    verdict: verdictEnum("verdict").notNull(),
    corrected: text("corrected").notNull(),
    tip: text("tip"),
    grader: graderEnum("grader").notNull(),
    model: text("model"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    responseMs: integer("response_ms"), // how long the learner took to answer
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("attempts_id_user").on(t.id, t.userId),
    foreignKey({ name: "attempts_session_fk", columns: [t.sessionId, t.userId], foreignColumns: [sessions.id, sessions.userId] }).onDelete("cascade"),
    index("attempts_by_user").on(t.userId, t.createdAt),
    ownRowsOnly(),
  ],
);

export const attemptSkillResults = pgTable(
  "attempt_skill_results",
  {
    attemptId: uuid("attempt_id").notNull(),
    userId: uuid("user_id").notNull(),
    skillId: text("skill_id")
      .notNull()
      .references(() => skills.id),
    passed: boolean("passed").notNull(),
    rating: smallint("rating").notNull(), // the spaced-repetition grade it fed: 1 again, 2 hard, 3 good
  },
  (t) => [
    primaryKey({ columns: [t.attemptId, t.skillId] }),
    foreignKey({ name: "attempt_skill_results_attempt_fk", columns: [t.attemptId, t.userId], foreignColumns: [attempts.id, attempts.userId] }).onDelete("cascade"),
    ownRowsOnly(),
  ],
);

export const attemptErrors = pgTable(
  "attempt_errors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    attemptId: uuid("attempt_id").notNull(),
    userId: uuid("user_id").notNull(),
    errorTypeId: text("error_type_id")
      .notNull()
      .references(() => errorTypes.id),
    skillId: text("skill_id").references(() => skills.id),
    wrong: text("wrong").notNull(),
    right: text("right").notNull(),
    explanation: text("explanation").notNull(),
    counts: boolean("counts").notNull(),
  },
  (t) => [
    foreignKey({ name: "attempt_errors_attempt_fk", columns: [t.attemptId, t.userId], foreignColumns: [attempts.id, attempts.userId] }).onDelete("cascade"),
    index("attempt_errors_by_user").on(t.userId, t.errorTypeId),
    ownRowsOnly(),
  ],
);

// How well each skill is known: the spaced-repetition card (FSRS, via ts-fsrs) plus
// the "solid" counters that complete steps. One row per skill the user has practiced.
export const skillStates = pgTable(
  "skill_states",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    skillId: text("skill_id")
      .notNull()
      .references(() => skills.id),
    due: timestamp("due", { withTimezone: true }).notNull(),
    stability: real("stability").notNull(),
    difficulty: real("difficulty").notNull(),
    elapsedDays: integer("elapsed_days").notNull(),
    scheduledDays: integer("scheduled_days").notNull(),
    learningSteps: integer("learning_steps").notNull(),
    reps: integer("reps").notNull(),
    lapses: integer("lapses").notNull(),
    state: smallint("state").notNull(), // 0 new, 1 learning, 2 review, 3 relearning
    lastReview: timestamp("last_review", { withTimezone: true }),
    correctCount: integer("correct_count").notNull().default(0),
    streak: integer("streak").notNull().default(0), // correct answers in a row
    solidAt: timestamp("solid_at", { withTimezone: true }), // first time it became solid
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.skillId] }), index("skill_states_due").on(t.userId, t.due), ownRowsOnly()],
);
