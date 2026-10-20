CREATE TABLE "attempt_follow_ups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"position" smallint NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"model" text NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attempt_follow_ups_position" UNIQUE("attempt_id","position"),
	CONSTRAINT "at_most_three_follow_ups" CHECK ("attempt_follow_ups"."position" between 1 and 3)
);
--> statement-breakpoint
ALTER TABLE "attempt_follow_ups" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "attempt_follow_ups" ADD CONSTRAINT "attempt_follow_ups_attempt_fk" FOREIGN KEY ("attempt_id","user_id") REFERENCES "public"."attempts"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "users manage their own rows" ON "attempt_follow_ups" AS PERMISSIVE FOR ALL TO "authenticated" USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));