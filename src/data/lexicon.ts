import { db } from "@/db";
import { verbForms } from "@/db/schema";
import { buildAccentLexicon, type AccentLexicon } from "@/domain/grading/accents";

// Every spelling from the verb data, for the accent check. Shared content, loaded
// once per process (~59k forms, a few MB).
let lexicon: Promise<AccentLexicon> | undefined;

export function getAccentLexicon() {
  lexicon ??= db
    .select({ form: verbForms.form, alternates: verbForms.alternates })
    .from(verbForms)
    .then((rows) => buildAccentLexicon(rows.flatMap((r) => [r.form, ...r.alternates])));
  return lexicon;
}
