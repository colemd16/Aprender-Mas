"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/components/ui/cn";
import { Dot } from "@/components/ui/pill";
import { MAX_FOLLOW_UPS, MAX_QUESTION_LENGTH } from "@/domain/tutor/follow-up";
import { Explanation } from "./explanation";

type Exchange = { question: string; answer: string; streaming: boolean };

// Up to three questions about this answer's feedback, each answered as it's written.
export function FollowUps({ attemptId }: { attemptId: string }) {
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [question, setQuestion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);

  const streaming = exchanges.some((e) => e.streaming);
  const left = MAX_FOLLOW_UPS - exchanges.length;

  useLayoutEffect(() => {
    const el = fieldRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [question]);

  async function ask() {
    const q = question.trim();
    if (!q || streaming || left <= 0) return;
    setError(null);
    setQuestion("");
    const index = exchanges.length;
    setExchanges((list) => [...list, { question: q, answer: "", streaming: true }]);
    const update = (fn: (e: Exchange) => Exchange) => setExchanges((list) => list.map((e, i) => (i === index ? fn(e) : e)));

    try {
      const res = await fetch("/api/follow-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId, question: q }),
      });
      if (!res.ok || !res.body) {
        const message = (await res.json().catch(() => null))?.error ?? "Couldn't ask that right now — try again.";
        setExchanges((list) => list.slice(0, index));
        setQuestion(q);
        setError(message);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
        const text = decoder.decode(chunk.value, { stream: true });
        update((e) => ({ ...e, answer: e.answer + text }));
      }
      update((e) => ({ ...e, streaming: false }));
    } catch {
      setExchanges((list) => list.slice(0, index));
      setQuestion(q);
      setError("Lost the connection — try asking again.");
    }
  }

  return (
    <section aria-label="Ask about this answer" className="flex flex-col gap-3">
      {exchanges.map((e, i) => (
        <div key={i} className="flex animate-pop flex-col gap-3">
          <p className="m-0 self-end rounded-2xl rounded-br-md bg-accent/12 px-4 py-2.5 text-[15px] text-accent-bright">{e.question}</p>
          <div className="glass-subtle rounded-[18px] p-4 sm:px-5" aria-live="polite" aria-busy={e.streaming}>
            {e.answer ? (
              <Explanation text={e.answer} />
            ) : (
              <span className="flex items-center gap-2 text-sm text-fg-muted">
                <Dot className="animate-pulse text-accent" /> Thinking…
              </span>
            )}
            {e.streaming && e.answer && <span aria-hidden="true" className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-accent align-middle" />}
          </div>
        </div>
      ))}

      {left > 0 && (
        <form
          className={cn(
            "flex items-end gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.025] py-2 pr-2 pl-4 transition-colors duration-200 focus-within:border-white/[0.16]",
            streaming && "opacity-60",
          )}
          onSubmit={(e) => {
            e.preventDefault();
            ask();
          }}
        >
          <label htmlFor={`follow-up-${attemptId}`} className="sr-only">
            Ask a question about this answer
          </label>
          <textarea
            id={`follow-up-${attemptId}`}
            ref={fieldRef}
            rows={1}
            value={question}
            maxLength={MAX_QUESTION_LENGTH}
            disabled={streaming}
            onChange={(e) => setQuestion(e.target.value.replace(/\s*\n\s*/g, " "))}
            enterKeyHint="send"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                e.preventDefault();
                ask();
              }
            }}
            placeholder={exchanges.length ? "Ask another question…" : "Ask why… e.g. “why not estuvimos?”"}
            className="block min-w-0 flex-1 resize-none overflow-hidden bg-transparent py-2 text-base leading-normal text-fg outline-none placeholder:text-fg-faint"
          />
          <span className="flex-none self-center font-mono text-xs text-fg-subtle">{left} left</span>
          <button
            type="submit"
            disabled={!question.trim() || streaming}
            aria-label="Ask"
            className="flex size-10 flex-none cursor-pointer items-center justify-center rounded-xl bg-accent/15 text-accent-bright transition-[transform,background] duration-200 ease-spring hover:-translate-y-px hover:bg-accent/25 disabled:cursor-default disabled:opacity-40 disabled:hover:translate-y-0"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </form>
      )}

      {error && (
        <p role="alert" className="m-0 flex items-center gap-2.5 text-sm text-bad-soft">
          <Dot className="text-bad" />
          {error}
        </p>
      )}
    </section>
  );
}
