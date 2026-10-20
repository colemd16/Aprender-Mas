CREATE TYPE "public"."attempt_kind" AS ENUM('form', 'sentence');--> statement-breakpoint
CREATE TYPE "public"."exercise_source" AS ENUM('generated', 'hand_written');--> statement-breakpoint
CREATE TYPE "public"."grader" AS ENUM('engine', 'model');--> statement-breakpoint
CREATE TYPE "public"."input_mode" AS ENUM('typed', 'spoken');--> statement-breakpoint
CREATE TYPE "public"."session_kind" AS ENUM('learn', 'review', 'checkpoint');--> statement-breakpoint
CREATE TYPE "public"."verdict" AS ENUM('correct', 'acceptable', 'incorrect');--> statement-breakpoint
CREATE TABLE "attempt_errors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"error_type_id" text NOT NULL,
	"skill_id" text,
	"wrong" text NOT NULL,
	"right" text NOT NULL,
	"explanation" text NOT NULL,
	"counts" boolean NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attempt_errors" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "attempt_skill_results" (
	"attempt_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"skill_id" text NOT NULL,
	"passed" boolean NOT NULL,
	"rating" smallint NOT NULL,
	CONSTRAINT "attempt_skill_results_attempt_id_skill_id_pk" PRIMARY KEY("attempt_id","skill_id")
);
--> statement-breakpoint
ALTER TABLE "attempt_skill_results" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"kind" "attempt_kind" NOT NULL,
	"exercise_id" uuid,
	"prompt" text NOT NULL,
	"answer" text NOT NULL,
	"input_mode" "input_mode" NOT NULL,
	"verdict" "verdict" NOT NULL,
	"corrected" text NOT NULL,
	"tip" text,
	"grader" "grader" NOT NULL,
	"model" text,
	"input_tokens" integer,
	"output_tokens" integer,
	"response_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attempts_id_user" UNIQUE("id","user_id")
);
--> statement-breakpoint
ALTER TABLE "attempts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "exercise_flags" (
	"user_id" uuid NOT NULL,
	"exercise_id" uuid NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exercise_flags_user_id_exercise_id_pk" PRIMARY KEY("user_id","exercise_id")
);
--> statement-breakpoint
ALTER TABLE "exercise_flags" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "exercise_skills" (
	"exercise_id" uuid NOT NULL,
	"skill_id" text NOT NULL,
	CONSTRAINT "exercise_skills_exercise_id_skill_id_pk" PRIMARY KEY("exercise_id","skill_id")
);
--> statement-breakpoint
ALTER TABLE "exercise_skills" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prompt" text NOT NULL,
	"references" text[] NOT NULL,
	"hints" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source" "exercise_source" NOT NULL,
	"model" text,
	"retired_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "has_a_reference" CHECK (cardinality("exercises"."references") > 0)
);
--> statement-breakpoint
ALTER TABLE "exercises" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "session_kind" NOT NULL,
	"step_id" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	CONSTRAINT "sessions_id_user" UNIQUE("id","user_id")
);
--> statement-breakpoint
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "skill_states" (
	"user_id" uuid NOT NULL,
	"skill_id" text NOT NULL,
	"due" timestamp with time zone NOT NULL,
	"stability" real NOT NULL,
	"difficulty" real NOT NULL,
	"elapsed_days" integer NOT NULL,
	"scheduled_days" integer NOT NULL,
	"learning_steps" integer NOT NULL,
	"reps" integer NOT NULL,
	"lapses" integer NOT NULL,
	"state" smallint NOT NULL,
	"last_review" timestamp with time zone,
	"correct_count" integer DEFAULT 0 NOT NULL,
	"streak" integer DEFAULT 0 NOT NULL,
	"solid_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "skill_states_user_id_skill_id_pk" PRIMARY KEY("user_id","skill_id")
);
--> statement-breakpoint
ALTER TABLE "skill_states" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "attempt_errors" ADD CONSTRAINT "attempt_errors_error_type_id_error_types_id_fk" FOREIGN KEY ("error_type_id") REFERENCES "public"."error_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempt_errors" ADD CONSTRAINT "attempt_errors_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempt_errors" ADD CONSTRAINT "attempt_errors_attempt_fk" FOREIGN KEY ("attempt_id","user_id") REFERENCES "public"."attempts"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempt_skill_results" ADD CONSTRAINT "attempt_skill_results_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempt_skill_results" ADD CONSTRAINT "attempt_skill_results_attempt_fk" FOREIGN KEY ("attempt_id","user_id") REFERENCES "public"."attempts"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_session_fk" FOREIGN KEY ("session_id","user_id") REFERENCES "public"."sessions"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_flags" ADD CONSTRAINT "exercise_flags_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_flags" ADD CONSTRAINT "exercise_flags_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_skills" ADD CONSTRAINT "exercise_skills_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_skills" ADD CONSTRAINT "exercise_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_step_id_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."steps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_states" ADD CONSTRAINT "skill_states_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_states" ADD CONSTRAINT "skill_states_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attempt_errors_by_user" ON "attempt_errors" USING btree ("user_id","error_type_id");--> statement-breakpoint
CREATE INDEX "attempts_by_user" ON "attempts" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "exercise_skills_by_skill" ON "exercise_skills" USING btree ("skill_id");--> statement-breakpoint
CREATE INDEX "sessions_by_user" ON "sessions" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE INDEX "skill_states_due" ON "skill_states" USING btree ("user_id","due");--> statement-breakpoint
CREATE POLICY "users manage their own rows" ON "attempt_errors" AS PERMISSIVE FOR ALL TO "authenticated" USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "users manage their own rows" ON "attempt_skill_results" AS PERMISSIVE FOR ALL TO "authenticated" USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "users manage their own rows" ON "attempts" AS PERMISSIVE FOR ALL TO "authenticated" USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "users manage their own rows" ON "exercise_flags" AS PERMISSIVE FOR ALL TO "authenticated" USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "signed-in users can read" ON "exercise_skills" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "signed-in users can read" ON "exercises" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "users manage their own rows" ON "sessions" AS PERMISSIVE FOR ALL TO "authenticated" USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "users manage their own rows" ON "skill_states" AS PERMISSIVE FOR ALL TO "authenticated" USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));