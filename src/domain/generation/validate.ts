import { formSkillId } from "@/domain/curriculum/skills";
import { findAccentFixes, type AccentLexicon } from "@/domain/grading/accents";
import { tidy } from "@/domain/grading/normalize";
import type { StepContext } from "./context";
import { findForms, type FormIndex } from "./form-index";

// Checks a generated sentence before it can become an exercise. Anything doubtful is
// dropped: a missing sentence costs nothing, a wrong reference answer teaches a mistake.

export type Candidate = {
  english: string;
  spanish: string[];
  targets: string[];
  hints: { english: string; spanish: string }[];
};

export type ValidExercise = { prompt: string; references: string[]; hints: Record<string, string>; skillIds: string[] };

export type Validation = { ok: true; exercise: ValidExercise } | { ok: false; reason: string };

const PRONOUNS = new Set(["yo", "tú", "él", "ella", "nosotros", "nosotras", "ellos", "ellas", "usted", "ustedes"]);
const wordsOf = (s: string) => s.toLowerCase().match(/[a-záéíóúüñ]+/g) ?? [];

// Cues like "(to a friend)" belong to the English prompt; drop any echoed into Spanish.
const withoutCues = (s: string) => s.replace(/\s*\([^)]*\)/g, "").replace(/\s+/g, " ").trim();

// `lexicon` should hold the curriculum's verb forms: a word that matches one of them
// only once its accent is fixed (estabamos → estábamos) is a misspelling.
export function validateCandidate(c: Candidate, ctx: StepContext, deps: { forms: FormIndex; lexicon: AccentLexicon; tenseName: (id: string) => string }): Validation {
  const prompt = c.english.trim();
  const [main, ...others] = [...new Set(c.spanish.map(withoutCues).filter(Boolean))];
  if (!prompt || !main) return { ok: false, reason: "empty" };

  // An answer that matches a reference is marked correct without the grader, so
  // alternates must be safe: only rearrangements of the main answer's words (or with a
  // subject pronoun added or dropped). The grader accepts other correct versions anyway.
  const mainWords = new Set(wordsOf(main));
  const references = [main, ...others.filter((alt) => wordsOf(alt).every((w) => mainWords.has(w) || PRONOUNS.has(w)))].slice(0, 3);

  const words = tidy(references[0]).split(" ").length;
  if (words < 2 || words > 20) return { ok: false, reason: "length" };

  for (const ref of references) {
    const fixes = findAccentFixes(ref, deps.lexicon);
    if (fixes.length) return { ok: false, reason: `accent: ${fixes.map((f) => `${f.word}→${f.fixed}`).join(", ")}` };
  }

  // Every curriculum verb form in every reference must be readable as a taught tense.
  const taught = new Set<string>(ctx.taughtTenses.map((t) => t.id));
  const matchesByRef = references.map((ref) => findForms(ref, deps.forms));
  for (const matches of matchesByRef) {
    for (const m of matches) {
      if (!m.senses.some((s) => taught.has(s.tenseId))) {
        return { ok: false, reason: `untaught tense: "${m.text}" (${deps.tenseName(m.senses[0].tenseId)})` };
      }
    }
  }

  // Skills: the model's targets where the sentence backs them up, plus any taught form
  // found in the main answer that can only be read one way.
  const formSkillsIn = (senses: { infinitive: string; tenseId: string; person: string }[]) =>
    senses.map((s) => formSkillId(s.infinitive, s.tenseId as never, s.person as never)).filter((id) => ctx.availableSkillIds.has(id));
  const mainForms = matchesByRef[0].map((m) => formSkillsIn(m.senses));
  const present = new Set(mainForms.flat());

  const skillIds = new Set<string>();
  for (const t of c.targets) {
    if (!ctx.availableSkillIds.has(t)) continue;
    if (t.startsWith("form:") && !present.has(t)) continue;
    skillIds.add(t);
  }
  for (const ids of mainForms) if (ids.length === 1) skillIds.add(ids[0]);

  if (![...skillIds].some((id) => ctx.stepSkillIds.has(id))) return { ok: false, reason: "practices nothing from this step" };

  const hints: Record<string, string> = {};
  for (const h of c.hints) if (h.english.trim() && h.spanish.trim()) hints[h.english.trim()] = h.spanish.trim();

  return { ok: true, exercise: { prompt, references, hints, skillIds: [...skillIds] } };
}
