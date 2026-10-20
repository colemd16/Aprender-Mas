CREATE TYPE "public"."accent_mode" AS ENUM('warn', 'strict');--> statement-breakpoint
CREATE TYPE "public"."mood" AS ENUM('indicative', 'subjunctive', 'imperative');--> statement-breakpoint
CREATE TYPE "public"."person" AS ENUM('1s', '2s', '3s', '1p', '3p');--> statement-breakpoint
CREATE TYPE "public"."skill_kind" AS ENUM('form', 'usage');--> statement-breakpoint
CREATE TYPE "public"."step_kind" AS ENUM('learn', 'checkpoint');--> statement-breakpoint
CREATE TYPE "public"."step_status" AS ENUM('active', 'completed');--> statement-breakpoint
CREATE TYPE "public"."tense_kind" AS ENUM('simple', 'compound', 'periphrastic');--> statement-breakpoint
CREATE TABLE "checkpoint_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"step_id" text NOT NULL,
	"score" real NOT NULL,
	"passed" boolean NOT NULL,
	"taken_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "score_is_a_fraction" CHECK ("checkpoint_attempts"."score" between 0 and 1)
);
--> statement-breakpoint
ALTER TABLE "checkpoint_attempts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "concepts" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"explanation" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "concepts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "error_types" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"concept_id" text,
	"counts_as_error" boolean NOT NULL
);
--> statement-breakpoint
ALTER TABLE "error_types" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "levels" (
	"id" integer PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "levels" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" text,
	"accent_mode" "accent_mode" DEFAULT 'warn' NOT NULL,
	"timezone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "skills" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" "skill_kind" NOT NULL,
	"title" text NOT NULL,
	"concept_id" text,
	"infinitive" text,
	"tense_id" text,
	"person" "person",
	CONSTRAINT "form_skills_have_a_form" CHECK (("skills"."kind" = 'form') = ("skills"."infinitive" is not null and "skills"."tense_id" is not null and "skills"."person" is not null))
);
--> statement-breakpoint
ALTER TABLE "skills" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "step_progress" (
	"user_id" uuid NOT NULL,
	"step_id" text NOT NULL,
	"status" "step_status" DEFAULT 'active' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "step_progress_user_id_step_id_pk" PRIMARY KEY("user_id","step_id"),
	CONSTRAINT "completed_steps_have_a_date" CHECK (("step_progress"."status" = 'completed') = ("step_progress"."completed_at" is not null))
);
--> statement-breakpoint
ALTER TABLE "step_progress" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "step_skills" (
	"step_id" text NOT NULL,
	"skill_id" text NOT NULL,
	CONSTRAINT "step_skills_step_id_skill_id_pk" PRIMARY KEY("step_id","skill_id"),
	CONSTRAINT "step_skills_skill_id_unique" UNIQUE("skill_id")
);
--> statement-breakpoint
ALTER TABLE "step_skills" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "steps" (
	"id" text PRIMARY KEY NOT NULL,
	"level_id" integer NOT NULL,
	"position" integer NOT NULL,
	"title" text NOT NULL,
	"kind" "step_kind" NOT NULL,
	"concept_id" text,
	CONSTRAINT "steps_level_id_position_unique" UNIQUE("level_id","position")
);
--> statement-breakpoint
ALTER TABLE "steps" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "tenses" (
	"id" text PRIMARY KEY NOT NULL,
	"mood" "mood" NOT NULL,
	"kind" "tense_kind" NOT NULL,
	"name_es" text NOT NULL,
	"name_en" text NOT NULL,
	"english_example" text NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tenses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "verb_forms" (
	"infinitive" text NOT NULL,
	"tense_id" text NOT NULL,
	"person" "person" NOT NULL,
	"form" text NOT NULL,
	"alternates" text[] DEFAULT '{}'::text[] NOT NULL,
	"is_irregular" boolean NOT NULL,
	CONSTRAINT "verb_forms_infinitive_tense_id_person_pk" PRIMARY KEY("infinitive","tense_id","person")
);
--> statement-breakpoint
ALTER TABLE "verb_forms" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "verbs" (
	"infinitive" text PRIMARY KEY NOT NULL,
	"english" text NOT NULL,
	"gerund" text NOT NULL,
	"gerund_english" text NOT NULL,
	"past_participle" text NOT NULL,
	"past_participle_english" text NOT NULL,
	"is_reflexive" boolean NOT NULL,
	"frequency_rank" integer
);
--> statement-breakpoint
ALTER TABLE "verbs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "checkpoint_attempts" ADD CONSTRAINT "checkpoint_attempts_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkpoint_attempts" ADD CONSTRAINT "checkpoint_attempts_step_id_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."steps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_types" ADD CONSTRAINT "error_types_concept_id_concepts_id_fk" FOREIGN KEY ("concept_id") REFERENCES "public"."concepts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_concept_id_concepts_id_fk" FOREIGN KEY ("concept_id") REFERENCES "public"."concepts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_infinitive_tense_id_person_verb_forms_infinitive_tense_id_person_fk" FOREIGN KEY ("infinitive","tense_id","person") REFERENCES "public"."verb_forms"("infinitive","tense_id","person") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "step_progress" ADD CONSTRAINT "step_progress_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "step_progress" ADD CONSTRAINT "step_progress_step_id_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."steps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "step_skills" ADD CONSTRAINT "step_skills_step_id_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "step_skills" ADD CONSTRAINT "step_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "steps" ADD CONSTRAINT "steps_level_id_levels_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."levels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "steps" ADD CONSTRAINT "steps_concept_id_concepts_id_fk" FOREIGN KEY ("concept_id") REFERENCES "public"."concepts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verb_forms" ADD CONSTRAINT "verb_forms_infinitive_verbs_infinitive_fk" FOREIGN KEY ("infinitive") REFERENCES "public"."verbs"("infinitive") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verb_forms" ADD CONSTRAINT "verb_forms_tense_id_tenses_id_fk" FOREIGN KEY ("tense_id") REFERENCES "public"."tenses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "users manage their own rows" ON "checkpoint_attempts" AS PERMISSIVE FOR ALL TO "authenticated" USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "signed-in users can read" ON "concepts" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "signed-in users can read" ON "error_types" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "signed-in users can read" ON "levels" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "users read their own profile" ON "profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING (id = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "users update their own profile" ON "profiles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (id = (select auth.uid())) WITH CHECK (id = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "signed-in users can read" ON "skills" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "users manage their own rows" ON "step_progress" AS PERMISSIVE FOR ALL TO "authenticated" USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "signed-in users can read" ON "step_skills" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "signed-in users can read" ON "steps" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "signed-in users can read" ON "tenses" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "signed-in users can read" ON "verb_forms" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "signed-in users can read" ON "verbs" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);