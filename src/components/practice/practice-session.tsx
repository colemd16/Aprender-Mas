"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { finishSession, submitAnswer, type AnswerFeedback, type SessionSummary } from "@/app/practice/actions";
import type { PracticeItem } from "@/data/practice";
import { Button, ButtonLink } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Dock } from "@/components/ui/dock";
import { Dot, Pill } from "@/components/ui/pill";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Spinner } from "@/components/ui/spinner";
import { Wordmark } from "@/components/ui/wordmark";
import { Explanation } from "./explanation";
import { FollowUps } from "./follow-ups";
import { Morph, morphDuration } from "./morph";
import { SessionSummaryView } from "./session-summary";
import { useSpeech } from "./use-speech";

type Feedback = Extract<AnswerFeedback, { ok: true }>;
type Phase =
  | { name: "answering"; error?: string }
  | { name: "grading" }
  | { name: "feedback"; feedback: Feedback }
  | { name: "finishing" }
  | { name: "done"; summary: SessionSummary };

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
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // The answer box grows with what's typed (or spoken), and shrinks back for the next question.
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [answer, phase.name]);

  // iPhones can nudge the page up as the keyboard opens even when the answer box is already
  // in view. The question and answer live at the top, so if they fit above the keyboard,
  // put the page back.
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const settle = () => {
      const el = inputRef.current;
      if (!el || document.activeElement !== el || (window.scrollY === 0 && viewport.offsetTop === 0)) return;
      if (el.getBoundingClientRect().bottom + window.scrollY < viewport.height - 8) window.scrollTo({ top: 0 });
    };
    viewport.addEventListener("resize", settle);
    return () => viewport.removeEventListener("resize", settle);
  }, []);

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
    // Drop the phone keyboard so the correction has the whole screen.
    inputRef.current?.blur();
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
    // Phones only open the keyboard for focus that happens during the tap itself. The answer
    // box stays on the page (hidden) through the feedback, right where it reappears, so it can
    // be focused now — and with nothing to scroll to, the keyboard comes up without the page jumping.
    window.scrollTo({ top: 0 });
    inputRef.current?.focus({ preventScroll: true });
    setIndex((i) => i + 1);
    setAnswer("");
    setSpoken(false);
    setPhase({ name: "answering" });
    shownAt.current = Date.now();
  }

  function finish() {
    setPhase({ name: "finishing" });
    startTransition(async () => setPhase({ name: "done", summary: await finishSession(sessionId) }));
  }

  if (phase.name === "done") {
    return <SessionSummaryView sessionId={sessionId} summary={phase.summary} kind={kind} stepId={stepId} stepTitle={stepTitle} levelId={levelId} />;
  }

  const answered = index + (phase.name === "feedback" ? 1 : 0);
  const busy = phase.name === "grading" || phase.name === "finishing";
  const where =
    kind === "checkpoint" ? (
      `Level ${levelId} checkpoint`
    ) : (
      <span lang="es" className="text-fg">
        {stepTitle}
      </span>
    );

  return (
    <div className="flex min-h-app flex-col bg-[radial-gradient(900px_420px_at_50%_36%,rgb(252_209_22/0.07),transparent_70%),radial-gradient(1000px_520px_at_85%_-10%,rgb(0_56_147/0.45),transparent_70%)]">
      {/* Phones: one slim bar — end, how far through, how many. */}
      <header className="sticky top-[calc(env(safe-area-inset-top)+3px)] z-40 flex items-center gap-2 bg-night/70 py-2 pr-4 pl-2 backdrop-blur-xl sm:hidden">
        <button
          type="button"
          onClick={finish}
          disabled={busy}
          aria-label="End session"
          className="flex size-10 flex-none cursor-pointer items-center justify-center rounded-full text-fg-soft transition-[transform,color] duration-200 ease-spring active:scale-90 active:text-fg disabled:opacity-40"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <ProgressBar value={answered / Math.max(1, queue.length)} label="Questions answered" className="flex-1" />
        <span className="min-w-11 flex-none text-right font-mono text-xs text-fg-muted">
          {Math.min(answered, queue.length)}/{queue.length}
        </span>
      </header>

      <header className="hidden flex-wrap items-center justify-between gap-4 px-8 py-5 sm:flex">
        <Wordmark />
        <div className="flex items-center gap-2.5 rounded-full border border-white/[0.08] bg-white/[0.04] py-1.5 pr-3.5 pl-2 text-[13px] text-fg-soft">
          {progress ? (
            <ProgressRing value={progress.total ? progress.solid / progress.total : 0} label={`${progress.solid} of ${progress.total} skills solid`} />
          ) : (
            <Dot className="text-accent" />
          )}
          <span>{where}</span>
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
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out-expo"
              style={{ width: `${(answered / Math.max(1, queue.length)) * 100}%` }}
            />
          </div>
          <Button variant="ghost" className="h-9 px-3 text-[13px] font-medium" onClick={finish} disabled={busy}>
            End
          </Button>
        </div>
      </header>

      {/* On phones the question sits at the top with the answer right under it, so both
          stay in view above the keyboard. */}
      <main className="mx-auto flex w-full max-w-[840px] flex-1 flex-col gap-6 px-4 pt-3 pb-32 sm:justify-center sm:gap-8 sm:px-8 sm:py-10">
        {!item ? (
          <EmptySession />
        ) : (
          <>
            <div className="flex min-w-0 items-center gap-2 text-[13px] text-fg-muted sm:hidden">
              {progress ? (
                <ProgressRing
                  value={progress.total ? progress.solid / progress.total : 0}
                  size={16}
                  stroke={3}
                  label={`${progress.solid} of ${progress.total} skills solid`}
                />
              ) : (
                <Dot className="text-accent" />
              )}
              <span className="min-w-0 truncate">{where}</span>
              {progress && (
                <span className="flex-none">
                  · {progress.solid}/{progress.total} solid
                </span>
              )}
            </div>

            <Prompt key={item.key} item={item} />

            <div className={cn("glass relative rounded-[22px] sm:py-[22px] sm:pr-[22px] sm:pl-7", phase.name === "feedback" ? "p-4" : "py-2 pr-2 pl-4")}>
              {phase.name === "feedback" && (
                <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
                  <Morph
                    ops={phase.feedback.diff}
                    corrected={phase.feedback.corrected}
                    className="text-[24px] leading-tight font-medium tracking-[-0.02em] sm:text-[40px]"
                  />
                  <VerdictPill feedback={phase.feedback} />
                </div>
              )}
              {/* Always mounted, so the answer box is never recreated: during feedback it's
                  invisible but still focusable (see next()). */}
              <form
                aria-hidden={phase.name === "feedback" || undefined}
                className={
                  phase.name === "feedback" ? "pointer-events-none absolute top-4 left-4 size-px overflow-hidden opacity-0" : "flex items-end gap-2 sm:gap-3"
                }
                onSubmit={(e) => {
                  e.preventDefault();
                  submit();
                }}
              >
                <label htmlFor="answer" className="sr-only">
                  Your answer in Spanish
                </label>
                <textarea
                  id="answer"
                  ref={inputRef}
                  rows={1}
                  lang="es"
                  autoFocus
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="go"
                  value={answer}
                  onChange={(e) => {
                    // One line of thought: pasted line breaks become spaces.
                    setAnswer(e.target.value.replace(/\s*\n\s*/g, " "));
                    if (!shownAt.current) shownAt.current = Date.now();
                  }}
                  onKeyDown={(e) => {
                    // Enter checks the answer; it never adds a new line.
                    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      submit();
                    }
                  }}
                  readOnly={phase.name === "grading"}
                  tabIndex={phase.name === "feedback" ? -1 : undefined}
                  placeholder={speech.listening ? "Escuchando…" : "Escribe en español…"}
                  className="block min-w-0 flex-1 resize-none overflow-hidden bg-transparent py-2 text-[22px] leading-[1.25] font-medium tracking-[-0.02em] text-fg outline-none placeholder:text-fg-faint sm:py-1.5 sm:text-[36px] sm:leading-[1.2]"
                />
                {phase.name !== "feedback" && speech.supported && (
                  <button
                    type="button"
                    onClick={speech.listening ? speech.stop : speech.start}
                    aria-label={speech.listening ? "Stop listening" : "Speak your answer"}
                    aria-pressed={speech.listening}
                    className={cn(
                      "flex size-11 flex-none cursor-pointer items-center justify-center rounded-[14px] border transition-[transform,background] duration-200 ease-spring hover:-translate-y-px active:scale-[0.94] sm:size-[52px] sm:rounded-2xl",
                      speech.listening ? "border-accent bg-accent/15 text-accent-bright animate-glow-pulse" : "border-white/10 bg-white/5 text-fg",
                    )}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      aria-hidden="true"
                    >
                      <rect x="9" y="3" width="6" height="12" rx="3" />
                      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
                    </svg>
                  </button>
                )}
                {/* A round send button on phones (like a message composer); "Check ↵" on larger screens. */}
                {phase.name !== "feedback" && (
                  <button
                    type="submit"
                    aria-label="Check answer"
                    disabled={!answer.trim() || phase.name === "grading"}
                    className="glow-accent inline-flex size-11 flex-none cursor-pointer items-center justify-center gap-2.5 rounded-[14px] bg-accent text-base font-semibold text-night transition-[transform,filter,opacity] duration-200 ease-spring hover:-translate-y-px hover:brightness-110 active:scale-[0.94] disabled:cursor-default disabled:opacity-40 disabled:shadow-none disabled:hover:translate-y-0 sm:h-[52px] sm:w-auto sm:rounded-2xl sm:px-6 sm:disabled:opacity-60"
                  >
                    {phase.name === "grading" ? (
                      <>
                        <Spinner /> <span className="hidden sm:inline">Checking</span>
                      </>
                    ) : (
                      <>
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                          className="sm:hidden"
                        >
                          <path d="M12 19V5M5 12l7-7 7 7" />
                        </svg>
                        <span className="hidden sm:inline">Check</span>
                        <kbd className="hidden rounded-md bg-night/15 px-1.5 py-0.5 font-mono text-xs sm:inline">↵</kbd>
                      </>
                    )}
                  </button>
                )}
              </form>
            </div>

            {stepDone && phase.name === "feedback" && <StepComplete done={stepDone} onDismiss={() => setStepDone(null)} />}

            {phase.name === "answering" && (phase.error || speech.error) && (
              <p role="alert" className="m-0 -mt-3 flex items-center gap-2.5 text-sm text-bad-soft sm:-mt-4">
                <Dot className="text-bad" />
                {phase.error ?? speech.error}
              </p>
            )}

            {phase.name === "feedback" && <FeedbackDetails feedback={phase.feedback} solidNotes={solidNotes} isLast={isLast} onNext={next} />}
          </>
        )}
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
      <div className="flex animate-rise flex-col items-start gap-3 sm:gap-4">
        <div className="flex flex-wrap gap-2">
          <Pill tone="accent">{item.tense}</Pill>
          <Pill>
            <span lang="es">{item.person}</span>
          </Pill>
        </div>
        <h1 className="m-0 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[40px] leading-none font-semibold tracking-[-0.04em] sm:gap-x-4 sm:text-[64px]">
          <span lang="es">{item.infinitive}</span>
          <span className="text-base font-normal tracking-normal text-fg-muted sm:text-xl">{item.verbEnglish}</span>
        </h1>
      </div>
    );
  }
  const hints = Object.entries(item.hints);
  return (
    <div className="flex animate-rise flex-col items-start gap-3 sm:gap-4">
      <Pill>Say it in Spanish</Pill>
      <h1 className="m-0 text-[26px] leading-[1.15] font-semibold tracking-[-0.03em] sm:text-[52px] sm:leading-[1.1] sm:tracking-[-0.035em]">{item.prompt}</h1>
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
            <div
              key={i}
              className="glass-subtle flex animate-pop flex-col gap-2 rounded-[18px] p-4 sm:px-5 sm:py-[18px]"
              style={{ animationDelay: `${base + i * 90}ms` }}
            >
              <span className={cn("flex items-center gap-2 text-[13px] font-semibold", e.counts ? "text-bad" : "text-note")}>
                <Dot className={e.counts ? "text-bad" : "text-note"} />
                {e.label}
              </span>
              <Explanation text={e.explanation} />
            </div>
          ))}
          {feedback.tip && (
            <div
              className="glass-subtle flex animate-pop flex-col gap-2 rounded-[18px] p-4 sm:px-5 sm:py-[18px]"
              style={{ animationDelay: `${base + feedback.errors.length * 90}ms` }}
            >
              <span className="flex items-center gap-2 text-[13px] font-semibold text-accent">
                <Dot className="text-accent" />
                Tip
              </span>
              <Explanation text={feedback.tip} />
            </div>
          )}
        </div>
      )}

      <div className="animate-pop" style={{ animationDelay: `${base + 250}ms` }}>
        <FollowUps key={feedback.attemptId} attemptId={feedback.attemptId} />
      </div>

      {solidNotes.length > 0 && (
        <div className="flex animate-pop flex-wrap gap-2" style={{ animationDelay: `${base + 200}ms` }}>
          {solidNotes.map((title) => (
            <Pill key={title} tone="ok">
              ✓ <span lang="es">{title}</span> is solid
            </Pill>
          ))}
        </div>
      )}

      {/* Not animated itself: on phones Next is pinned to the bottom of the screen. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="animate-pop text-[13px] text-fg-muted" style={{ animationDelay: `${base + 150}ms` }}>
          {changed && (
            <>
              You wrote{" "}
              <span lang="es" className="text-fg-soft">
                {feedback.answer}
              </span>
            </>
          )}
        </span>
        <Dock style={{ animationDelay: `${base + 150}ms` }}>
          <Button variant="light" size="lg" autoFocus onClick={onNext} className="w-full sm:w-auto">
            {isLast ? "See results" : "Next"} <span aria-hidden="true">→</span>
          </Button>
        </Dock>
      </div>
    </div>
  );
}

function StepComplete({ done, onDismiss }: { done: NonNullable<Feedback["stepCompleted"]>; onDismiss: () => void }) {
  return (
    <section
      aria-live="polite"
      className="flex animate-pop flex-wrap items-center justify-between gap-4 rounded-[20px] border border-ok/30 bg-ok/[0.07] p-5 sm:px-[22px]"
    >
      <div className="flex flex-col gap-1">
        <span className="font-mono text-xs tracking-[0.06em] text-ok">STEP COMPLETE</span>
        <span lang="es" className="text-[22px] font-semibold tracking-[-0.02em]">
          {done.title}
        </span>
        {done.next && (
          <span className="text-sm text-fg-muted">
            Up next:{" "}
            <span lang="es" className="text-fg-soft">
              {done.next}
            </span>
          </span>
        )}
      </div>
      <div className="flex w-full gap-2.5 sm:w-auto">
        <Button variant="secondary" onClick={onDismiss} className="flex-1 sm:flex-none">
          Keep practicing
        </Button>
        <ButtonLink href="/" variant="primary" className="flex-1 sm:flex-none">
          Journey <span aria-hidden="true">→</span>
        </ButtonLink>
      </div>
    </section>
  );
}

function EmptySession() {
  return (
    <div className="glass-subtle flex flex-col items-start gap-4 rounded-[22px] p-6 sm:p-8">
      <h1 className="m-0 text-2xl font-semibold tracking-[-0.03em]">Nothing to practice here right now</h1>
      <p className="m-0 text-fg-muted">There aren&apos;t any questions ready for this step yet.</p>
      <Link href="/" className="text-accent">
        Back to journey
      </Link>
    </div>
  );
}
