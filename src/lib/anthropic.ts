import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | undefined;

// One client per process. Reads ANTHROPIC_API_KEY from the environment.
export function anthropic() {
  client ??= new Anthropic();
  return client;
}

// Haiku grades every sentence: fast, cheap, and good enough for this job.
export const GRADING_MODEL = "claude-haiku-5-5";

// Haiku also writes the sentence bank; every sentence is checked before it's saved.
export const GENERATION_MODEL = "claude-haiku-5-5";

// And answers follow-up questions about feedback.
export const TUTOR_MODEL = "claude-haiku-5-5";
