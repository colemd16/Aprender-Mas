import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | undefined;

// One client per process. Reads ANTHROPIC_API_KEY from the environment.
export function anthropic() {
  client ??= new Anthropic();
  return client;
}

// Sonnet grades every sentence: more careful judgment on what natural speakers say than
// Haiku, at about 20× the price per token (still a fraction of a cent per answer).
export const GRADING_MODEL = "claude-sonnet-5-5";

// Sonnet also writes the sentence bank; every sentence is checked before it's saved.
export const GENERATION_MODEL = "claude-sonnet-5-5";

// And answers follow-up questions about feedback.
export const TUTOR_MODEL = "claude-sonnet-5-5";
