"use client";

import Link from "next/link";
import { useCallback, useRef, useState, useTransition } from "react";
import { finishSession, submitAnswer, type AnswerFeedback, type SessionSummary } from "@/app/practice/actions";
import type { PracticeItem } from "@/data/practice";
import { Button, ButtonLink } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Dot, Pill } from "@/components/ui/pill";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Spinner } from "@/components/ui/spinner";
import { Wordmark } from "@/components/ui/wordmark";
import { Morph, morphDuration } from "./morph";
import { SessionSummaryView } from "./session-summary";
import { useSpeech } from "./use-speech";

type Feedback = Extract<AnswerFeedback, { ok: true }>;
type Phase = { name: "answering"; error?: string } | { name: "grading" } | { name: "feedback"; feedback: Feedback } | { name: "finishing" } | { name: "done"; summary: SessionSummary };

const RETRY_AFTER = 3; // a missed item comes back this many questions later

export type SessionProps = {
  sessionId: string;
  kind: "learn" | "review" | "checkpoint";
  stepId: string | null;
  stepTitle: string;
  levelId: number | null;
  items: PracticeItem[];
  progress: { solid: number; total: number } | null;
};

export function PracticeSession({ sessionId, kind, stepId, stepTitle, levelId, items, progress: initialProgress }: SessionProps) {
  const [queue, setQueue] = useState(items);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>({ name: "answering" });
  const [answer, setAnswer] = useState("");
  const [spoken, setSpoken] = useState(false);
  const [progress, setProgress] = useState(initialProgress);
  const [solidNotes, setSolidNotes] = useState<string[]>([]);
  const [stepDone, setStepDone] = useState<Feedback["stepCompleted"]>(null);
  const [, startTransition] = useTransition();
  const shownAt = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const item = queue[index];
  const isLast = index >= queue.length - 1;

  const speech = useSpeech(
    useCallback((text: string) => {
      setAnswer(text);
      setSpoken(true);
    }, []),
  );

  function submit() {
    if (!item || !answer.trim() || phase.name !== "answering") return;
    speech.stop();
    setPhase({ name: "grading" });
    const responseMs = shownAt.current ? Date.now() - shownAt.current : 0;
    startTransition(async () => {
      const feedback = await submitAnswer({
        sessionId,
        item: item.kind === "form" ? { kind: "form", skillId: item.skillId } : { kind: "sentence", exerciseId: item.exerciseId },
        prompt: item.kind === "form" ? `${item.infinitive} · ${item.tense} · ${item.person}` : item.prompt,
        answer,
        inputMode: spoken ? "spoken" : "typed",
        responseMs,
      });
      if (!feedback.ok) {
        setPhase({ name: "answering", error: feedback.message });
        return;
      }
      setPhase({ name: "feedback", feedback });
      if (feedback.progress) setProgress(feedback.progress);
      if (feedback.newlySolid.length) setSolidNotes(feedback.newlySolid);
      if (feedback.stepCompleted) setStepDone(feedback.stepCompleted);
      // A miss comes back a few questions later (once), so it's practiced again in the same session.
      if (feedback.verdict === "incorrect" && kind !== "checkpoint" && !item.key.endsWith("·again")) {
        setQueue((q) => {
          const copy = [...q];
          copy.splice(Math.min(index + 1 + RETRY_AFTER, copy.length), 0, { ...item, key: `${item.key}·again` });
          return copy;
        });
      }
    });
  }

  function next() {
    setSolidNotes([]);
    if (isLast) return finish();
    setIndex((i) => i + 1);
    setAnswer("");
    setSpoken(false);
    setPhase({ name: "answering" });
    shownAt.current = Date.now();
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function finish() {
    setPhase({ name: "finishing" });
    startTransition(async () => setPhase({ name: "done", summary: await finishSession(sessionId) }));
  }

  if (phase.name === "done") {
    return <SessionSummaryView summary={phase.summary} kind={kind} stepId={stepId} stepTitle={stepTitle} levelId={levelId} progress={progress} />;
  }

  const answered = index + (phase.name === "feedback" ? 1 : 0);

  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(900px_420px_at_50%_36%,rgb(142_162_255/0.10),transparent_70%)]">
      <header className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8 sm:py-5">
        <Wordmark />
        <div className="flex items-center gap-2.5 rounded-full border border-white/[0.08] bg-white/[0.04] py-1.5 pr-3.5 pl-2 text-[13px] text-fg-soft">
          {progress ? (
            <ProgressRing value={progress.total ? progress.solid / progress.total : 0} label={`${progress.solid} of ${progress.total} skills solid`} />
          ) : (
            <Dot className="text-accent" />
          )}
          <span>
            {kind === "checkpoint" ? `Level ${levelId} checkpoint` : <span lang="es" className="text-fg">{stepTitle}</span>}
          </span>
          {progress && (
            <span className="text-fg-muted">
              {progress.solid}/{progress.total}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-fg-muted">
            {Math.min(answered, queue.length)} / {queue.length}
          </span>
          <div className="h-1 w-24 overflow-hidden rounded-full bg-white/[0.08]">
            <div className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out-expo" style={{ width: `${(answered / Math.max(1, queue.length)) * 100}%` }} />
          </div>
          <Button variant="ghost" className="h-9 px-3 text-[13px] font-medium" onClick={finish} disabled={phase.name === "grading" || phase.name === "finishing"}>
            End
          </Button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[840px] flex-1 flex-col justify-center gap-8 px-5 py-8 sm:px-8 sm:py-10">
        {!item ? (
          <EmptySession />
        ) : (
          <>
            <Prompt key={item.key} item={item} />

            <div className="glass rounded-[22px] p-4 sm:py-[22px] sm:pr-[22px] sm:pl-7">
              {phase.name === "feedback" ? (
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <Morph ops={phase.feedback.diff} corrected={phase.feedback.corrected} className="text-[30px] leading-tight font-medium tracking-[-0.02em] sm:text-[40px]" />
                  <VerdictPill feedback={phase.feedback} />
                </div>
              ) : (
                <form
                  className="flex flex-wrap items-center gap-3 sm:flex-nowrap"
                  onSubmit={(e) => {
                    e.preventDefault();
                    submit();
                  }}
                >
                  <label htmlFor="answer" className="sr-only">
                    Your answer in Spanish
                  </label>
                  <input
                    id="answer"
                    ref={inputRef}
                    lang="es"
                    autoFocus
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    value={answer}
                    onChange={(e) => {
                      setAnswer(e.target.value);
                      if (!shownAt.current) shownAt.current = Date.now();
                    }}
                    readOnly={phase.name === "grading"}
                    placeholder={speech.listening ? "Escuchando…" : "Escribe en español…"}
                    className="w-full min-w-0 flex-1 basis-full bg-transparent text-[28px] font-medium tracking-[-0.02em] text-fg outline-none placeholder:text-fg-faint sm:basis-auto sm:text-[36px]"
                  />
                  {speech.supported && (
                    <button
                      type="button"
                      onClick={speech.listening ? speech.stop : speech.start}
                      aria-label={speech.listening ? "Stop listening" : "Speak your answer"}
                      aria-pressed={speech.listening}
                      className={cn(
                        "flex size-[52px] flex-none cursor-pointer items-center justify-center rounded-2xl border transition-[transform,background] duration-200 ease-spring hover:-translate-y-px",
                        speech.listening ? "border-accent bg-accent/15 text-accent-bright animate-glow-pulse" : "border-white/10 bg-white/5 text-fg",
                      )}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                        <rect x="9" y="3" width="6" height="12" rx="3" />
                        <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
                      </svg>
                    </button>
                  )}
                  <Button type="submit" size="lg" disabled={!answer.trim() || phase.name === "grading"} className="flex-1 sm:flex-none">
                    {phase.name === "grading" ? (
                      <>
                        <Spinner /> Checking
                      </>
                    ) : (
                      <>
                        Check <kbd className="rounded-md bg-night/15 px-1.5 py-0.5 font-mono text-xs">↵</kbd>
                      </>
                    )}
                  </Button>
                </form>
              )}
            </div>

            {phase.name === "answering" && (phase.error || speech.error) && (
              <p role="alert" className="m-0 -mt-4 flex items-center gap-2.5 text-sm text-bad-soft">
                <Dot className="text-bad" />
                {phase.error ?? speech.error}
              </p>
            )}

            {phase.name === "feedback" && (
              <FeedbackDetails feedback={phase.feedback} solidNotes={solidNotes} isLast={isLast} onNext={next} />
            )}
          </>
        )}

        {stepDone && phase.name === "feedback" && <StepComplete done={stepDone} onDismiss={() => setStepDone(null)} />}
      </main>

      <footer className="hidden justify-center gap-6 px-8 pt-4 pb-6 font-mono text-xs text-fg-subtle sm:flex">
        <span>↵ check</span>
        <span>↵ next</span>
        {speech.supported && <span>mic to speak</span>}
      </footer>
    </div>
  );
}

function Prompt({ item }: { item: PracticeItem }) {
  if (item.kind === "form") {
    return (
      <div className="flex animate-rise flex-col items-start gap-4">
        <div className="flex flex-wrap gap-2">
          <Pill tone="accent">{item.tense}</Pill>
          <Pill>
            <span lang="es">{item.person}</span>
          </Pill>
        </div>
        <h1 className="m-0 flex flex-wrap items-baseline gap-x-4 text-[44px] leading-none font-semibold tracking-[-0.04em] sm:text-[64px]">
          <span lang="es">{item.infinitive}</span>
          <span className="text-xl font-normal tracking-normal text-fg-muted">{item.verbEnglish}</span>
        </h1>
      </div>
    );
  }
  const hints = Object.entries(item.hints);
  return (
    <div className="flex animate-rise flex-col items-start gap-4">
      <Pill>Say it in Spanish</Pill>
      <h1 className="m-0 text-[34px] leading-[1.1] font-semibold tracking-[-0.035em] sm:text-[52px]">{item.prompt}</h1>
      {hints.length > 0 && (
        <p className="m-0 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[13px] text-fg-muted">
          {hints.map(([en, es]) => (
            <span key={en}>
              {en} = <span lang="es">{es}</span>
            </span>
          ))}
        </p>
      )}
    </div>
  );
}

function VerdictPill({ feedback }: { feedback: Feedback }) {
  const fixes = feedback.errors.filter((e) => e.counts).length;
  const delay = { animationDelay: `${morphDuration(feedback.diff)}ms` };
  if (feedback.verdict === "incorrect") {
    return (
      <span className="animate-pop rounded-full bg-bad/12 px-3.5 py-2 text-sm font-semibold text-bad" style={delay}>
        {fixes === 1 ? "1 fix" : `${fixes} fixes`}
      </span>
    );
  }
  return (
    <span className="animate-pop rounded-full bg-ok/12 px-3.5 py-2 text-sm font-semibold text-ok" style={delay}>
      {feedback.verdict === "correct" ? "¡Exacto!" : "Correct · note"}
    </span>
  );
}

function FeedbackDetails({ feedback, solidNotes, isLast, onNext }: { feedback: Feedback; solidNotes: string[]; isLast: boolean; onNext: () => void }) {
  const base = morphDuration(feedback.diff) + 120;
  const changed = feedback.diff.some((d) => d.op !== "same");
  return (
    <div className="flex flex-col gap-4">
      {(feedback.errors.length > 0 || feedback.tip) && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3">
          {feedback.errors.map((e, i) => (
            <div key={i} className="glass-subtle flex animate-pop flex-col gap-2 rounded-[18px] px-5 py-[18px]" style={{ animationDelay: `${base + i * 90}ms` }}>
              <span className={cn("flex items-center gap-2 text-[13px] font-semibold", e.counts ? "text-bad" : "text-warn")}>
                <Dot className={e.counts ? "text-bad" : "text-warn"} />
                {e.label}
              </span>
              <Explanation text={e.explanation} />
            </div>
          ))}
          {feedback.tip && (
            <div className="glass-subtle flex animate-pop flex-col gap-2 rounded-[18px] px-5 py-[18px]" style={{ animationDelay: `${base + feedback.errors.length * 90}ms` }}>
              <span className="flex items-center gap-2 text-[13px] font-semibold text-accent">
                <Dot className="text-accent" />
                Tip
              </span>
              <Explanation text={feedback.tip} />
            </div>
          )}
        </div>
      )}

      {solidNotes.length > 0 && (
        <div className="flex animate-pop flex-wrap gap-2" style={{ animationDelay: `${base + 200}ms` }}>
          {solidNotes.map((title) => (
            <Pill key={title} tone="ok">
              ✓ <span lang="es">{title}</span> is solid
            </Pill>
          ))}
        </div>
      )}

      <div className="flex animate-pop flex-wrap items-center justify-between gap-3" style={{ animationDelay: `${base + 150}ms` }}>
        <span className="text-[13px] text-fg-muted">
          {changed && (
            <>
              You wrote <span lang="es" className="text-fg-soft">{feedback.answer}</span>
            </>
          )}
        </span>
        <Button variant="light" autoFocus onClick={onNext}>
          {isLast ? "See results" : "Next"} <span aria-hidden="true">→</span>
        </Button>
      </div>
    </div>
  );
}

// Explanations mark Spanish with *asterisks*.
function Explanation({ text }: { text: string }) {
  return (
    <p className="m-0 text-[15px] leading-relaxed text-fg-soft">
      {text.split(/(\*[^*]+\*)/).map((part, i) =>
        part.startsWith("*") && part.endsWith("*") ? (
          <em key={i} lang="es" className="text-fg not-italic">
            {part.slice(1, -1)}
          </em>
        ) : (
          part
        ),
      )}
    </p>
  );
}

function StepComplete({ done, onDismiss }: { done: NonNullable<Feedback["stepCompleted"]>; onDismiss: () => void }) {
  return (
    <section aria-live="polite" className="flex animate-pop flex-wrap items-center justify-between gap-4 rounded-[20px] border border-ok/30 bg-ok/[0.07] px-[22px] py-5">
      <div className="flex flex-col gap-1">
        <span className="font-mono text-xs tracking-[0.06em] text-ok">STEP COMPLETE</span>
        <span lang="es" className="text-[22px] font-semibold tracking-[-0.02em]">
          {done.title}
        </span>
        {done.next && (
          <span className="text-sm text-fg-muted">
            Up next: <span lang="es" className="text-fg-soft">{done.next}</span>
          </span>
        )}
      </div>
      <div className="flex gap-2.5">
        <Button variant="secondary" onClick={onDismiss}>
          Keep practicing
        </Button>
        <ButtonLink href="/" variant="primary">
          Journey <span aria-hidden="true">→</span>
        </ButtonLink>
      </div>
    </section>
  );
}

function EmptySession() {
  return (
    <div className="glass-subtle flex flex-col items-start gap-4 rounded-[22px] p-8">
      <h1 className="m-0 text-2xl font-semibold tracking-[-0.03em]">Nothing to practice here right now</h1>
      <p className="m-0 text-fg-muted">There aren&apos;t any questions ready for this step yet.</p>
      <Link href="/" className="text-accent">
        Back to journey
      </Link>
    </div>
  );
}
