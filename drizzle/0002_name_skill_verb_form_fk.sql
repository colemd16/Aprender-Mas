ALTER TABLE "skills" DROP CONSTRAINT "skills_infinitive_tense_id_person_verb_forms_infinitive_tense_id_person_fk";
--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_verb_form_fk" FOREIGN KEY ("infinitive","tense_id","person") REFERENCES "public"."verb_forms"("infinitive","tense_id","person") ON DELETE no action ON UPDATE no action;