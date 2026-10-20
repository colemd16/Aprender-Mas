ALTER TABLE "exercises" ADD COLUMN "step_id" text;--> statement-breakpoint
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_step_id_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."steps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "exercises_by_step" ON "exercises" USING btree ("step_id");