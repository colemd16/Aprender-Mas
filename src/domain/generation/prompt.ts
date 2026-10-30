import { z } from "zod";
import type { StepContext } from "./context";

export const USAGE_SENTENCES_PER_SKILL = 10;
export const FORM_SENTENCES_PER_SKILL = 2;
// Larger requests run out of room before the model finishes.
const MAX_SENTENCES_PER_REQUEST = 12;

// Splits a step's requests into model calls of at most ~12 sentences each. Each part
// keeps the full step's skill sets, so validation still sees the whole step.
export function splitRequests(ctx: StepContext): StepContext[] {
  const parts: StepContext[] = ctx.targetUsage.map((u) => ({ ...ctx, targetUsage: [u], targetForms: [] }));
  const formsPerPart = Math.max(1, Math.floor(MAX_SENTENCES_PER_REQUEST / FORM_SENTENCES_PER_SKILL));
  for (let i = 0; i < ctx.targetForms.length; i += formsPerPart) {
    parts.push({ ...ctx, targetUsage: [], targetForms: ctx.targetForms.slice(i, i + formsPerPart) });
  }
  return parts;
}

export const GenerationOutput = z.object({
  sentences: z.array(
    z.object({
      english: z.string(),
      spanish: z.array(z.string()),
      targets: z.array(z.string()),
      hints: z.array(z.object({ english: z.string(), spanish: z.string() })),
    }),
  ),
});

export const GENERATION_SYSTEM_PROMPT = `You write practice sentences for a Spanish grammar app. The learner is an English speaker becoming fluent in everyday Latin American Spanish. Each sentence is shown in English; the learner types or says it in Spanish and is graded on grammar, never on vocabulary.

Voice and setting
- Write like people from the Colombian interior — Girardot, Melgar, Fusagasugá, Ibagué and Bogotá. Everyday life there: tierra caliente weekends at the finca or the pool, the Magdalena river, people from Bogotá coming down on puente festivo, going up to Bogotá, the bus terminal, the plaza de mercado, work, family, neighbors, fútbol.
- Interior food and phrases fit naturally when they suit the sentence (not in every one): tinto, onces, almojábanas, achiras, lechona, tamal tolimense, avena; qué pena, a la orden, regáleme, ¿qué más?, bacano, de una, ahorita.
- Avoid Caribbean-coast settings and slang (Cartagena, the beach, ajá, eche, vaina) and Mexican or Spain usage.

Every sentence
- Is something a person would really say. Avoid textbook clichés.
- Is 4–14 words in Spanish: one clause, or two joined naturally when the grammar needs it.
- Uses only the tenses listed as taught. Any common verb may appear, but every conjugated verb must be in a taught tense. Prefer the known verbs.
- Makes the grammar clear from the English alone. Only when a choice depends on context, add a short cue in parentheses at the end: (she) or (they, all women) when gender changes the Spanish, (describing the scene) or (it happened once) for past-tense choices.

Saying "you"
- Mark every sentence that says "you" with the form expected, in parentheses at the end: (tú), (usted) or (ustedes).
- Use tú most of the time — with friends, family and partners. Use usted for formal situations: a doctor, a boss, an older neighbor, a stranger, someone serving you. Groups are ustedes. Never vosotros.

The fields
- "spanish": the most natural Latin American version first, then up to two other common correct versions that genuinely differ (another word order, another correct construction). Correct accents, ¿ and ¡.
- "hints": English → Spanish for nouns, adjectives or verbs the learner may not know (verbs as infinitives). Never hint the grammar being practiced.
- "targets": the ids of the requested skills the sentence practices. Every sentence practices at least one requested skill.

Across the set, vary the person (yo, tú, él/ella, nosotros, ellos/ustedes), mix statements, negatives and questions, and never repeat a sentence pattern.`;

export function buildGenerationRequest(ctx: StepContext, formText: (id: string) => string | undefined) {
  const requests: string[] = [];
  for (const u of ctx.targetUsage) requests.push(`- ${USAGE_SENTENCES_PER_SKILL} sentences practicing ${u.id}: ${u.title}`);
  if (ctx.targetForms.length) {
    requests.push(`- ${FORM_SENTENCES_PER_SKILL} sentences for each of these verb forms, each sentence using that exact form:`);
    for (const f of ctx.targetForms) requests.push(`  - ${f.id}: ${f.title} — "${formText(f.id) ?? "?"}"`);
  }
  return [
    `<step>Level ${ctx.level.number} (${ctx.level.title}) — ${ctx.title}</step>`,
    ctx.concept ? `<concept title="${ctx.concept.title}">\n${ctx.concept.explanation}\n</concept>` : "",
    `<taught_tenses>${ctx.taughtTenses.map((t) => t.name).join(", ")}</taught_tenses>`,
    `<known_verbs>${ctx.knownVerbs.join(", ")}</known_verbs>`,
    `<requests>\n${requests.join("\n")}\n</requests>`,
  ]
    .filter(Boolean)
    .join("\n");
}
