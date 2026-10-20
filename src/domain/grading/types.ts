// The result every grader returns, whether the answer was checked against the verb
// data or graded by the model. The practice screen and the learner model only see this.

export type Verdict = "correct" | "acceptable" | "incorrect";

export type GradedError = {
  type: string; // an id from src/content/error-types.ts
  wrong: string; // the learner's text ("" when something is missing)
  right: string; // what replaces it in the corrected answer
  explanation: string;
  skillId: string | null; // the target skill this mistake belongs to, if any
  counts: boolean; // false for notes that don't fail the answer (accents, typos…)
};

export type GradeResult = {
  verdict: Verdict;
  answer: string;
  corrected: string;
  errors: GradedError[];
  skillResults: { skillId: string; passed: boolean }[];
  tip?: string; // a remark that isn't a mistake
  grader: "engine" | "model";
  model?: string;
  usage?: { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number };
  regraded?: boolean; // the first grading contradicted itself and was redone
};

export type AccentMode = "warn" | "strict";
