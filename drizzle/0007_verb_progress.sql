CREATE TABLE "verb_progress" (
	"user_id" uuid NOT NULL,
	"infinitive" text NOT NULL,
	"tense_id" text NOT NULL,
	"correct" integer DEFAULT 0 NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "verb_progress_user_id_infinitive_tense_id_pk" PRIMARY KEY("user_id","infinitive","tense_id")
);
--> statement-breakpoint
ALTER TABLE "verb_progress" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "verb_progress" ADD CONSTRAINT "verb_progress_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verb_progress" ADD CONSTRAINT "verb_progress_infinitive_verbs_infinitive_fk" FOREIGN KEY ("infinitive") REFERENCES "public"."verbs"("infinitive") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verb_progress" ADD CONSTRAINT "verb_progress_tense_id_tenses_id_fk" FOREIGN KEY ("tense_id") REFERENCES "public"."tenses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "users manage their own rows" ON "verb_progress" AS PERMISSIVE FOR ALL TO "authenticated" USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));