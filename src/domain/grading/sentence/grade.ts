import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { looksEnglish, type AccentLexicon } from "../accents";
import { matchesAny, matchesAnyIgnoringAccents, tidy } from "../normalize";
import type { AccentMode, GradeResult } from "../types";
import { applyAccentCheck, dropDubiousAccentClaims, interpretGrading, isInconsistent, markUnverified } from "./interpret";
import { buildUserMessage, SYSTEM_PROMPT, type SentenceExercise } from "./prompt";
import { GradingOutput } from "./schema";

export type GradingOptions = {
  client: Anthropic;
  model: string;
  effort?: "low" | "medium" | "high";
  accentMode?: AccentMode;
  // Known Spanish spellings, used to check the model's accent claims.
  lexicon?: AccentLexicon;
};

export class GradingUnavailableError extends Error {}

// Grades a free-form sentence. Answers that match a reference answer (with or without
// accents) are graded on the spot; anything else goes to the model.
export async function gradeSentence(exercise: SentenceExercise, rawAnswer: string, options: GradingOptions): Promise<GradeResult> {
  const answer = tidy(rawAnswer);
  const accentMode = options.accentMode ?? "warn";

  if (matchesAny(answer, exercise.references)) {
    return {
      verdict: "correct",
      answer,
      corrected: answer,
      errors: [],
      skillResults: exercise.skills.map((s) => ({ skillId: s.id, passed: true })),
      grader: "engine",
    };
  }

  const reference = matchesAnyIgnoringAccents(answer, exercise.references);
  if (reference) {
    const strict = accentMode === "strict";
    return {
      verdict: strict ? "incorrect" : "acceptable",
      answer,
      corrected: tidy(reference),
      errors: [{ type: "missing_accent", wrong: answer, right: tidy(reference), explanation: "Watch the accent marks.", skillId: null, counts: strict }],
      skillResults: exercise.skills.map((s) => ({ skillId: s.id, passed: !strict })),
      grader: "engine",
    };
  }

  // Written in English: no need to ask the model.
  if (looksEnglish(answer) && exercise.references.length) {
    const corrected = tidy(exercise.references[0]);
    return {
      verdict: "incorrect",
      answer,
      corrected,
      errors: [{ type: "meaning_mismatch", wrong: answer, right: corrected, explanation: "Answer in Spanish — here's one way to say it.", skillId: null, counts: true }],
      skillResults: exercise.skills.map((s) => ({ skillId: s.id, passed: false })),
      grader: "engine",
    };
  }

  // Medium: on the eval, low effort gave unstable verdicts from run to run.
  const effort = options.effort ?? "medium";
  const first = await askModel(exercise, answer, options, effort);
  if (!isInconsistent(first.graded)) return modelResult(first.graded, options.model, [first.usage]);

  // The grader contradicted itself: give it more room to think, once.
  const second = await askModel(exercise, answer, options, effort === "low" ? "medium" : "high");
  const graded = isInconsistent(second.graded) ? markUnverified(second.graded, exercise) : second.graded;
  return { ...modelResult(graded, options.model, [first.usage, second.usage]), regraded: true };
}

type Usage = NonNullable<GradeResult["usage"]>;

async function askModel(exercise: SentenceExercise, answer: string, options: GradingOptions, effort: "low" | "medium" | "high") {
  const accentMode = options.accentMode ?? "warn";
  const response = await options.client.messages.parse({
    model: options.model,
    max_tokens: 4000,
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: buildUserMessage(exercise, answer) }],
    output_config: { format: zodOutputFormat(GradingOutput), effort },
  });

  if (response.stop_reason === "refusal") throw new GradingUnavailableError("The grader declined to grade this answer.");
  if (response.stop_reason === "max_tokens") throw new GradingUnavailableError("The grader ran out of room before finishing.");
  if (!response.parsed_output) throw new GradingUnavailableError("The grader's response couldn't be read.");

  const graded = interpretGrading(exercise, answer, response.parsed_output, accentMode);
  const usage: Usage = {
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
    cacheWriteTokens: response.usage.cache_creation_input_tokens ?? 0,
  };
  const trusted = options.lexicon ? dropDubiousAccentClaims(graded, exercise, options.lexicon) : graded;
  return { graded: applyAccentCheck(trusted, exercise, accentMode), usage };
}

function modelResult(graded: ReturnType<typeof interpretGrading>, model: string, usages: Usage[]): GradeResult {
  const total = (k: keyof Usage) => usages.reduce((t, u) => t + u[k], 0);
  return {
    ...graded,
    grader: "model",
    model,
    usage: { inputTokens: total("inputTokens"), outputTokens: total("outputTokens"), cacheReadTokens: total("cacheReadTokens"), cacheWriteTokens: total("cacheWriteTokens") },
  };
}
