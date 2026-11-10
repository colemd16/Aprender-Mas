"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { checkVerbAnswer, moreVerbCards, type VerbFeedback } from "@/app/verbs/actions";
import { fillFrame, TENSE_GUIDES } from "@/content/tense-guides";
import type { TenseId } from "@/content/tenses";
import type { ChallengeOptions, VerbCard } from "@/data/verbs";
import { Explanation } from "@/components/practice/explanation";
import { Morph } from "@/components/practice/morph";
import { cn } from "@/components/ui/cn";
import { Dot, Pill } from "@/components/ui/pill";
import { Sheet } from "@/components/ui/sheet";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Spinner } from "@/components/ui/spinner";
import { Wordmark } from "@/components/ui/wordmark";
import { levelFor, nextLevel } from "@/domain/verbs/mastery";
import { ChallengePicker, useChallengeChoice } from "./challenge-picker";
import { SentenceSheet } from "./sentence-sheet";
import { InfoIcon, TenseInfo } from "./tense-guide";

type Feedback = Extract<VerbFeedback, { ok: true }>;
type Phase = "answering" | "checking" | "right" | "wrong";

const AUTO_NEXT_MS = 650; // a right answer moves on by itself after this long
const REFILL_AT = 5; // fetch more cards when this few are left

const countKey = (c: Pick<VerbCard, "infinitive" | "tenseId">) => `${c.infinitive}|${c.tenseId}`;

// A cue that calls for the card's tense, chosen steadily per card: "Si tú ___, todo sería distinto".
function frameFor(card: VerbCard) {
  const frames = TENSE_GUIDES[card.tenseId]?.frames ?? [];
  if (!frames.length) return null;
  const hash = [...card.key].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
  return fillFrame(frames[hash % frames.length], card.person);
}

function Frame({ text }: { text: string }) {
  const [before, after] = text.split("___");
  return (
    <p lang="es" className="m-0 text-[17px] leading-snug text-fg-soft sm:text-xl">
      {before}
      <span aria-label="blank" className="mx-0.5 inline-block w-14 translate-y-[3px] border-b-2 border-accent/70" />
      {after}
    </p>
  );
}

// The verb challenge: rapid-fire cards, one form each, as long as you like. The answer box
// never leaves the page (or loses focus), so on a phone the keyboard stays up throughout.
export function VerbChallenge({
  options,
  cards,
  title,
  backHref,
  taught,
}: {
  options: ChallengeOptions;
  cards: VerbCard[];
  title: string;
  backHref: string;
  taught: TenseId[];
}) {
  const router = useRouter();
  const choice = useChallengeChoice();
  const [changing, setChanging] = useState(false);
  const mixed = !options.verb;
  const [queue, setQueue] = useState(cards);
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<Phase>("answering");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState(() => new Map(cards.map((c) => [countKey(c), c.correct])));
  const [tally, setTally] = useState({ right: 0, answered: 0, run: 0 });
  const [toast, setToast] = useState<{ text: string; big: boolean; id: number } | null>(null);
  // The form answered most recently, for "Use it in a sentence" (it outlasts a right
  // answer's quick move to the next card).
  const [lastAnswered, setLastAnswered] = useState<{ card: VerbCard; form: string } | null>(null);
  const [writing, setWriting] = useState(false);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const fetching = useRef(false);
  const waiting = useRef(false); // Next was pressed before more cards arrived
  const autoNext = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Where the queue stands now, for code that runs later (the auto-next timer).
  const position = useRef({ index: 0, length: cards.length });
  useEffect(() => {
    position.current = { index, length: queue.length };
  });

  const card = queue[index];
  const count = card ? (counts.get(countKey(card)) ?? card.correct) : 0;
  const next = nextLevel(count);
  const level = levelFor(count);

  // Top the queue up in the background, well before it runs out.
  useEffect(() => {
    if (fetching.current || queue.length - index > REFILL_AT) return;
    fetching.current = true;
    const last = queue[queue.length - 1];
    moreVerbCards(options, last && { infinitive: last.infinitive, tenseId: last.tenseId, person: last.person })
      .then((more) => {
        setCounts((m) => {
          const copy = new Map(m);
          for (const c of more) if (!copy.has(countKey(c))) copy.set(countKey(c), c.correct);
          return copy;
        });
        setQueue((q) => [...q, ...more]);
      })
      .catch(() => {})
      .finally(() => {
        fetching.current = false;
      });
  }, [index, queue, options]);

  // Pressed Next while the next card was still on its way: show it as soon as it's here.
  useEffect(() => {
    if (waiting.current && index < queue.length - 1) {
      waiting.current = false;
      advance();
    }
  });

  useEffect(() => () => clearTimeout(autoNext.current), []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.big ? 3200 : 2400);
    return () => clearTimeout(t);
  }, [toast]);

  function submit() {
    if (!card || phase !== "answering" || !input.trim()) return;
    setPhase("checking");
    setError(null);
    startTransition(async () => {
      const res = await checkVerbAnswer({ infinitive: card.infinitive, tenseId: card.tenseId, person: card.person }, input).catch(() => null);
      if (!res || !res.ok) {
        setError(res?.message ?? "Couldn't check that — try again.");
        setPhase("answering");
        return;
      }
      const right = res.verdict !== "incorrect";
      setFeedback(res);
      setLastAnswered({ card, form: res.corrected });
      setCounts((m) => new Map(m).set(countKey(card), res.correct));
      setTally((t) => ({ right: t.right + (right ? 1 : 0), answered: t.answered + 1, run: right ? t.run + 1 : 0 }));
      if (res.verbLevelUp) setToast({ text: `${card.infinitive} is now ${res.verbLevelUp} in every tense`, big: true, id: Date.now() });
      else if (res.tenseLevelUp) setToast({ text: `${card.infinitive} · ${card.tenseName}: ${res.tenseLevelUp}`, big: false, id: Date.now() });
      setPhase(right ? "right" : "wrong");
      if (!right) setInput("");
      // Right answers (without even a note to read) move on by themselves.
      if (right && !res.note) autoNext.current = setTimeout(advance, AUTO_NEXT_MS);
    });
  }

  function advance() {
    clearTimeout(autoNext.current);
    if (position.current.index >= position.current.length - 1) {
      waiting.current = true;
      return;
    }
    setIndex((i) => i + 1);
    setInput("");
    setFeedback(null);
    setPhase("answering");
    inputRef.current?.focus({ preventScroll: true });
  }

  // Buttons keep the answer box focused, so tapping them doesn't drop the phone keyboard.
  const keepFocus = (e: React.PointerEvent) => e.preventDefault();
  // Back to the answer box once a sheet closes.
  const refocus = (open: boolean) => !open && requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));

  return (
    <div className="flex min-h-app flex-col bg-[radial-gradient(900px_420px_at_50%_30%,rgb(122_162_255/0.08),transparent_70%),radial-gradient(1000px_520px_at_85%_-10%,rgb(0_56_147/0.45),transparent_70%)]">
      <header className="sticky top-[calc(env(safe-area-inset-top)+3px)] z-40 flex items-center gap-2 bg-night/70 py-2 pr-4 pl-2 backdrop-blur-xl sm:static sm:gap-4 sm:bg-transparent sm:px-8 sm:py-5 sm:backdrop-blur-none">
        <Link
          href={backHref}
          aria-label="End challenge"
          className="flex size-10 flex-none items-center justify-center rounded-full text-fg-soft transition-[transform,color] duration-200 ease-spring active:scale-90 active:text-fg sm:hidden"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </Link>
        <span className="hidden sm:flex">
          <Wordmark />
        </span>
        <span
          lang="es"
          className="min-w-0 flex-1 truncate text-[15px] font-semibold sm:flex-none sm:rounded-full sm:border sm:border-white/[0.08] sm:bg-white/[0.04] sm:px-3.5 sm:py-1.5 sm:text-[13px] sm:font-medium sm:text-fg-soft"
        >
          {title}
        </span>
        <span className="flex flex-none items-center gap-3 font-mono text-xs text-fg-muted sm:ml-auto">
          {tally.run >= 3 && <span className="animate-pop text-accent">run {tally.run}</span>}
          <span>
            <span className="text-ok">{tally.right}</span>/{tally.answered}
          </span>
        </span>
        {mixed && (
          <button
            type="button"
            onClick={() => setChanging(true)}
            aria-label="Change verbs and tenses"
            className="-mr-2 flex size-10 flex-none cursor-pointer items-center justify-center rounded-full text-fg-soft transition-[transform,color] duration-200 ease-spring hover:text-fg active:scale-90 sm:mr-0 sm:h-9 sm:w-auto sm:rounded-xl sm:px-3 sm:text-sm"
          >
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              aria-hidden="true"
              className="sm:hidden"
            >
              <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
              <circle cx="16" cy="7" r="2" />
              <circle cx="10" cy="17" r="2" />
            </svg>
            <span className="hidden sm:inline">Change</span>
          </button>
        )}
        <Link href={backHref} className="hidden text-sm text-fg-soft no-underline hover:text-fg sm:inline">
          Done
        </Link>
      </header>

      {mixed && (
        <Sheet
          open={changing}
          onClose={() => {
            setChanging(false);
            refocus(false);
          }}
          title="Verbs and tenses"
        >
          <ChallengePicker set={choice.set} tenses={choice.tenses} onSet={choice.setSet} onToggle={choice.toggleTense} taught={taught} />
          <button
            type="button"
            onClick={() => {
              setChanging(false);
              router.replace(choice.href);
            }}
            className="glow-accent inline-flex h-[52px] w-full cursor-pointer items-center justify-center gap-2.5 rounded-2xl bg-accent text-base font-semibold text-night transition-[transform,filter] duration-200 ease-spring hover:brightness-110 active:scale-[0.97]"
          >
            Shuffle with these <span aria-hidden="true">→</span>
          </button>
        </Sheet>
      )}

      {toast && (
        <div
          key={toast.id}
          role="status"
          className={cn(
            "pointer-events-none fixed inset-x-4 top-[calc(env(safe-area-inset-top)+68px)] z-50 mx-auto flex max-w-[460px] animate-pop items-center justify-center gap-2.5 rounded-2xl px-4 py-3 text-center text-sm font-semibold",
            toast.big ? "bg-ok text-night shadow-[0_0_40px_rgb(91_224_160/0.45)]" : "border border-accent/40 bg-night/90 text-accent-bright backdrop-blur-xl",
          )}
        >
          <span aria-hidden="true">★</span>
          <span lang="es">{toast.text}</span>
        </div>
      )}

      <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-5 px-4 pt-4 pb-16 sm:justify-center sm:gap-7 sm:px-8 sm:pb-20">
        {!card ? (
          <div className="glass-subtle flex flex-col items-start gap-4 rounded-[22px] p-6">
            <h1 className="m-0 text-2xl font-semibold tracking-[-0.03em]">No cards for this challenge</h1>
            <Link href="/verbs" className="text-accent">
              Back to verbs
            </Link>
          </div>
        ) : (
          <>
            <div key={card.key} className="flex animate-rise flex-col items-start gap-3 sm:gap-4">
              <div className="flex flex-wrap gap-2">
                <TenseInfo
                  tenseIds={[card.tenseId]}
                  title="When it's used"
                  meaning={card.meaning}
                  taught={taught}
                  onOpenChange={refocus}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-accent/12 px-3.5 py-1.5 text-[13px] font-medium text-accent-bright transition-[transform,background] duration-200 ease-spring hover:bg-accent/20 active:scale-95"
                >
                  {card.tenseName} <InfoIcon />
                </TenseInfo>
                <Pill>
                  <span lang="es">{card.personLabel}</span>
                </Pill>
              </div>
              <h1 className="m-0 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[40px] leading-none font-semibold tracking-[-0.04em] sm:gap-x-4 sm:text-[64px]">
                <span lang="es">{card.infinitive}</span>
                <span className="text-base font-normal tracking-normal text-fg-muted sm:text-xl">{card.english}</span>
              </h1>
              {/* A cue that calls for the tense, and what this exact form means. */}
              <div className="flex flex-col gap-1">
                {frameFor(card) && <Frame text={frameFor(card)!} />}
                <p className="m-0 text-[14px] text-fg-muted sm:text-[15px]">“{card.meaning}”</p>
              </div>
            </div>

            <div className="relative">
              <form
                className="glass flex items-center gap-2 rounded-[22px] py-2 pr-2 pl-4 sm:py-3 sm:pr-3 sm:pl-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (phase === "answering") submit();
                  else if (phase !== "checking") advance();
                }}
              >
                <label htmlFor="verb-answer" className="sr-only">
                  {card.infinitive}, {card.tenseName}, {card.personLabel}
                </label>
                <input
                  id="verb-answer"
                  ref={inputRef}
                  value={input}
                  // After a miss the box is free to retype the right form (not graded).
                  onChange={(e) => (phase === "answering" || phase === "wrong") && setInput(e.target.value)}
                  autoFocus
                  lang="es"
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint={phase === "answering" ? "go" : "next"}
                  placeholder="Conjuga…"
                  className="h-12 min-w-0 flex-1 bg-transparent text-[24px] font-medium tracking-[-0.02em] text-fg outline-none placeholder:text-fg-faint sm:h-14 sm:text-[34px]"
                />
                <button
                  type="submit"
                  onPointerDown={keepFocus}
                  aria-label={phase === "answering" || phase === "checking" ? "Check" : "Next"}
                  disabled={phase === "checking" || (phase === "answering" && !input.trim())}
                  className={cn(
                    "inline-flex size-11 flex-none cursor-pointer items-center justify-center rounded-[14px] font-semibold transition-[transform,filter,opacity,background] duration-200 ease-spring active:scale-[0.94] disabled:cursor-default disabled:opacity-40 sm:size-[52px] sm:rounded-2xl",
                    phase === "wrong" || phase === "right" ? "bg-fg text-night" : "glow-accent bg-accent text-night",
                  )}
                >
                  {phase === "checking" ? (
                    <Spinner />
                  ) : (
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
                    >
                      {phase === "answering" ? <path d="M12 19V5M5 12l7-7 7 7" /> : <path d="M5 12h14M13 6l6 6-6 6" />}
                    </svg>
                  )}
                </button>
              </form>
              {/* A ring that flashes green on a right answer, red on a miss. */}
              {(phase === "right" || phase === "wrong") && (
                <div
                  key={`${card.key}-${phase}`}
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none absolute inset-0 animate-pop rounded-[22px] ring-2",
                    phase === "right" ? "shadow-[0_0_36px_rgb(91_224_160/0.3)] ring-ok/70" : "ring-bad/60",
                  )}
                />
              )}
            </div>

            {lastAnswered && (
              <button
                type="button"
                onClick={() => setWriting(true)}
                className="-mt-2 inline-flex cursor-pointer items-center gap-2 self-start rounded-full border border-white/12 bg-white/[0.03] px-3.5 py-2 text-[13px] text-fg-soft transition-[transform,color,border-color] duration-200 ease-spring hover:border-white/25 hover:text-fg active:scale-95 sm:-mt-3"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
                <span>
                  Use{" "}
                  <em lang="es" className="text-fg not-italic">
                    {lastAnswered.form}
                  </em>{" "}
                  in a sentence
                </span>
              </button>
            )}

            {error && (
              <p role="alert" className="m-0 -mt-2 flex items-center gap-2.5 text-sm text-bad-soft">
                <Dot className="text-bad" />
                {error}
              </p>
            )}

            {feedback && (phase === "right" || phase === "wrong") && (
              <div key={`${card.key}-feedback`} aria-live="polite" className="flex animate-pop flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {phase === "wrong" ? (
                    <Morph
                      ops={feedback.diff}
                      corrected={feedback.corrected}
                      className="text-[26px] leading-tight font-medium tracking-[-0.02em] sm:text-[34px]"
                    />
                  ) : (
                    <span lang="es" className="text-[26px] leading-tight font-medium tracking-[-0.02em] text-ok sm:text-[34px]">
                      {feedback.corrected}
                    </span>
                  )}
                  <span className={cn("rounded-full px-3.5 py-2 text-sm font-semibold", phase === "right" ? "bg-ok/12 text-ok" : "bg-bad/12 text-bad")}>
                    {phase === "right" ? (feedback.verdict === "correct" ? "¡Exacto!" : "Right · note") : "Not quite"}
                  </span>
                </div>
                {feedback.note && (
                  <div className="glass-subtle flex flex-col gap-1.5 rounded-[18px] p-4">
                    <span className={cn("flex items-center gap-2 text-[13px] font-semibold", phase === "wrong" ? "text-bad" : "text-note")}>
                      <Dot className={phase === "wrong" ? "text-bad" : "text-note"} />
                      {feedback.note.label}
                    </span>
                    <Explanation text={feedback.note.explanation} />
                  </div>
                )}
                {phase === "wrong" && <p className="m-0 text-[13px] text-fg-muted">Type it once to lock it in, or press return to move on.</p>}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className="text-fg-muted">
                  <span lang="es" className="text-fg-soft">
                    {card.infinitive}
                  </span>{" "}
                  · {card.tenseName}
                </span>
                <span className="font-mono text-xs text-fg-muted">
                  {level ? <span className="text-accent">{level.name}</span> : "New"} · {count}
                  {next ? `/${next.at}` : ""}
                </span>
              </div>
              <ProgressBar value={next ? count / next.at : 1} label={`${card.infinitive}, ${card.tenseName}: ${count} right`} />
            </div>
          </>
        )}
      </main>

      {lastAnswered && (
        <SentenceSheet
          key={lastAnswered.card.key}
          card={lastAnswered.card}
          form={lastAnswered.form}
          open={writing}
          onClose={() => {
            setWriting(false);
            refocus(false);
          }}
        />
      )}
    </div>
  );
}
