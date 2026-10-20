import { getAttemptForFollowUp, saveFollowUp } from "@/data/follow-ups";
import { buildFollowUpMessages, MAX_FOLLOW_UPS, MAX_QUESTION_LENGTH, TUTOR_SYSTEM_PROMPT } from "@/domain/tutor/follow-up";
import { anthropic, TUTOR_MODEL } from "@/lib/anthropic";
import { getCurrentUser } from "@/lib/auth";

// Streams the tutor's answer to a follow-up question as plain text. A Route Handler
// rather than a Server Action, because Server Actions can't stream text as it's written.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  const body = (await request.json().catch(() => null)) as { attemptId?: unknown; question?: unknown } | null;
  const attemptId = typeof body?.attemptId === "string" ? body.attemptId : "";
  const question = typeof body?.question === "string" ? body.question.trim().slice(0, MAX_QUESTION_LENGTH) : "";
  if (!attemptId || !question) return Response.json({ error: "Ask a question first." }, { status: 400 });

  const found = await getAttemptForFollowUp(user.id, attemptId);
  if (!found) return Response.json({ error: "That answer isn't available." }, { status: 404 });
  if (found.history.length >= MAX_FOLLOW_UPS) return Response.json({ error: `That's all ${MAX_FOLLOW_UPS} questions for this one.` }, { status: 409 });

  const stream = anthropic().messages.stream({
    model: TUTOR_MODEL,
    max_tokens: 4000,
    system: [{ type: "text", text: TUTOR_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: buildFollowUpMessages(found.context, found.history, question),
    // Medium: noticeably more careful answers than low, for well under a tenth of a cent.
    // It can think for a few seconds first; the screen shows "Thinking…" meanwhile.
    output_config: { effort: "medium" },
  });

  const encoder = new TextEncoder();
  const body$ = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Once the reader has gone (page closed), writes would throw; drop them quietly.
      const send = (text: string) => {
        try {
          controller.enqueue(encoder.encode(text));
        } catch {}
      };
      stream.on("text", send);
      try {
        const message = await stream.finalMessage();
        const answer = message.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("").trim();
        if (message.stop_reason === "refusal" || !answer) {
          send("\n\nI can't answer that one — try asking about the Spanish in this exercise.");
        } else {
          // Saved only once complete, so an interrupted answer doesn't use up a question.
          await saveFollowUp(user.id, attemptId, found.history.length + 1, {
            question,
            answer,
            model: TUTOR_MODEL,
            inputTokens: message.usage.input_tokens + (message.usage.cache_read_input_tokens ?? 0) + (message.usage.cache_creation_input_tokens ?? 0),
            outputTokens: message.usage.output_tokens,
          });
        }
      } catch (err) {
        if (!stream.aborted) {
          console.error("follow-up failed", err);
          send("\n\nCouldn't finish that answer — try asking again.");
        }
      }
      try {
        controller.close();
      } catch {}
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(body$, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
  });
}
