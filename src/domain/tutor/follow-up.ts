import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import { USAGE_NOTES } from "@/domain/usage-notes";

// Follow-up questions about an answer's feedback ("why estaba and not estuve?").

export const MAX_FOLLOW_UPS = 3;
export const MAX_QUESTION_LENGTH = 500;

export type AttemptContext = {
  prompt: string;
  answer: string;
  corrected: string;
  verdict: "correct" | "acceptable" | "incorrect";
  errors: { name: string; wrong: string; right: string; explanation: string; counts: boolean }[];
  tip: string | null;
  references: string[];
};

export type FollowUp = { question: string; answer: string };

// Static, so it's cached across every follow-up.
export const TUTOR_SYSTEM_PROMPT = `You are the tutor in a Spanish grammar app. The learner — an English speaker becoming fluent in everyday Latin American Spanish — just answered an exercise and saw the app's feedback. Now they're asking about it.

How to answer
- Answer the question directly in 2–5 short sentences of plain English. Put Spanish words and phrases in *asterisks*; use no other formatting — no headings, lists or bold.
- Ground the answer in this exercise: name the rule, say why it applies here, and add one or two short example sentences when they help.
- Prefer everyday Latin American usage, as in the usage notes below — the app's grading follows them, so your answers must too. Mention Spain or textbook differences only when they matter.
- If the app's feedback was wrong or too strict, say so plainly: an honest answer matters more than defending the grade.
- If the question isn't about Spanish, reply with one friendly sentence saying you can only help with the Spanish in this exercise — nothing more.
- Talk to the learner as "you". Never refer to "the learner" or describe their question back to them.
- Your first sentence is already about the Spanish (for example: "*Estuvimos* would mean…"). No greetings, no sign-offs, and no comment on the question itself — not "good question", "good instinct" or anything like it.

${USAGE_NOTES}`;

function describe(ctx: AttemptContext) {
  const errors = ctx.errors.length
    ? ctx.errors.map((e) => `- ${e.name}${e.counts ? "" : " (a note, didn't count against them)"}: "${e.wrong}" → "${e.right}". ${e.explanation}`).join("\n")
    : "- none";
  return [
    "<exercise>",
    `<prompt>${ctx.prompt}</prompt>`,
    ctx.references.length ? `<example_answers>${ctx.references.join(" | ")}</example_answers>` : "",
    "</exercise>",
    `<learner_answer>${ctx.answer}</learner_answer>`,
    "<feedback>",
    `<verdict>${ctx.verdict}</verdict>`,
    `<corrected>${ctx.corrected}</corrected>`,
    `<errors>\n${errors}\n</errors>`,
    ctx.tip ? `<tip>${ctx.tip}</tip>` : "",
    "</feedback>",
  ]
    .filter(Boolean)
    .join("\n");
}

// The exercise and feedback go in the first turn; earlier follow-ups become the
// conversation so far, and the new question comes last.
export function buildFollowUpMessages(ctx: AttemptContext, history: FollowUp[], question: string): MessageParam[] {
  const turns = [...history, { question, answer: "" }];
  const messages: MessageParam[] = [];
  turns.forEach((t, i) => {
    const q = `<question>${t.question}</question>`;
    messages.push({ role: "user", content: i === 0 ? `${describe(ctx)}\n\n${q}` : q });
    if (i < turns.length - 1) messages.push({ role: "assistant", content: t.answer });
  });
  return messages;
}
