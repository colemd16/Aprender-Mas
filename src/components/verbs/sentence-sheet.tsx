"use client";

import { useLayoutEffect, useRef, useState, useTransition } from "react";
import { checkVerbSentence, verbExample, type SentenceFeedback } from "@/app/verbs/actions";
import type { VerbCard } from "@/data/verbs";
import { Explanation } from "@/components/practice/explanation";
import { Morph } from "@/components/practice/morph";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Dot } from "@/components/ui/pill";
import { Sheet } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";

const VERDICTS = {
  natural: { label: "Makes sense ✓", className: "bg-ok/12 text-ok" },
  almost: { label: "Almost", className: "bg-note/12 text-note" },
  off: { label: "Doesn't quite work", className: "bg-bad/12 text-bad" },
} as const;

type Checked = Extract<SentenceFeedback, { ok: true }>;

// "Use it in a sentence": write any sentence with the form just conjugated and get a
// friendly check — or ask for an example. Nothing here is scored or saved.
export function SentenceSheet({ card, form, open, onClose }: { card: VerbCard; form: string; open: boolean; onClose: () => void }) {
  const [text, setText] = useState("");
  const [checked, setChecked] = useState<Checked | null>(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [examples, setExamples] = useState<{ spanish: string; english: string }[]>([]);
  const [checking, startChecking] = useTransition();
  const [fetchingExample, startExample] = useTransition();
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const ref = { infinitive: card.infinitive, tenseId: card.tenseId, person: card.person };

  // The box grows with the sentence. It can't be measured while the sheet is still closed
  // (hidden, so it reads as 0 tall), so it's sized again once the sheet is showing.
  useLayoutEffect(() => {
    const fit = () => {
      const el = fieldRef.current;
      if (!el || !el.offsetParent) return;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    };
    fit();
    if (!open) return;
    const frame = requestAnimationFrame(fit);
    return () => cancelAnimationFrame(frame);
  }, [text, open]);

  function check(anyway = false) {
    if (!text.trim() || checking) return;
    setError(null);
    setMissing(false);
    startChecking(async () => {
      const res = await checkVerbSentence(ref, text, anyway).catch(() => null);
      if (!res) return setError("Couldn't check that right now — try again.");
      if (res.ok) return setChecked(res);
      if (res.missing) return setMissing(true);
      setError(res.message);
    });
  }

  function example() {
    if (fetchingExample) return;
    setError(null);
    startExample(async () => {
      const res = await verbExample(
        ref,
        examples.map((e) => e.spanish),
      ).catch(() => null);
      if (res?.ok) setExamples((list) => [...list, { spanish: res.spanish, english: res.english }]);
      else setError(res?.message ?? "Couldn't get an example right now — try again.");
    });
  }

  const latest = examples[examples.length - 1];
  const changed = checked && checked.diff.some((d) => d.op !== "same");

  return (
    <Sheet open={open} onClose={onClose} title="Use it in a sentence">
      <div className="flex flex-col gap-1 rounded-[18px] border border-accent/30 bg-accent/[0.06] px-4 py-3">
        <span lang="es" className="text-[26px] leading-tight font-semibold tracking-[-0.02em] text-accent-bright">
          {form}
        </span>
        <span className="text-[13px] text-fg-muted">
          <span lang="es">{card.infinitive}</span> · {card.tenseName} · <span lang="es">{card.personLabel}</span> · “{card.meaning}”
        </span>
      </div>

      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          check();
        }}
      >
        <label htmlFor="sentence" className="sr-only">
          Your sentence with {form}
        </label>
        <textarea
          id="sentence"
          ref={fieldRef}
          rows={3}
          lang="es"
          autoFocus
          value={text}
          maxLength={300}
          onChange={(e) => {
            setText(e.target.value.replace(/\s*\n\s*/g, " "));
            setMissing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              check();
            }
          }}
          enterKeyHint="send"
          autoCapitalize="sentences"
          placeholder={`Escribe una oración con “${form}”…`}
          className="block min-h-[104px] w-full resize-none overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[17px] leading-normal text-fg outline-none transition-colors duration-200 placeholder:text-fg-faint focus:border-white/25"
        />
        <div className="flex flex-wrap gap-2.5">
          <Button type="submit" size="lg" disabled={!text.trim() || checking} className="flex-1 sm:flex-none">
            {checking ? (
              <>
                <Spinner /> Checking
              </>
            ) : (
              "Check my sentence"
            )}
          </Button>
          <Button variant="secondary" size="lg" onClick={example} disabled={fetchingExample} className="flex-1 sm:flex-none">
            {fetchingExample ? (
              <>
                <Spinner /> Thinking
              </>
            ) : examples.length ? (
              "Another example"
            ) : (
              "Show me an example"
            )}
          </Button>
        </div>
      </form>

      {missing && (
        <div className="flex animate-pop flex-col gap-2 rounded-[18px] bg-white/[0.03] p-4">
          <p className="m-0 text-[15px] text-fg-soft">
            I don&apos;t see{" "}
            <em lang="es" className="text-fg not-italic">
              {form}
            </em>{" "}
            in your sentence.
          </p>
          <button type="button" onClick={() => check(true)} className="cursor-pointer self-start text-sm text-accent hover:text-accent-bright">
            Check it anyway →
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="m-0 flex items-center gap-2.5 text-sm text-bad-soft">
          <Dot className="text-bad" />
          {error}
        </p>
      )}

      {checked && !checking && (
        <div key={checked.sentence} aria-live="polite" className="flex animate-pop flex-col gap-3">
          <span className={cn("self-start rounded-full px-3.5 py-1.5 text-sm font-semibold", VERDICTS[checked.verdict].className)}>
            {VERDICTS[checked.verdict].label}
          </span>
          {changed && <Morph ops={checked.diff} corrected={checked.corrected} className="text-[20px] leading-snug font-medium" />}
          <Explanation text={checked.formNote} />
          {checked.notes.length > 0 && (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {checked.notes.map((n) => (
                <li key={n} className="flex gap-2.5">
                  <Dot className="mt-2 text-note" />
                  <Explanation text={n} />
                </li>
              ))}
            </ul>
          )}
          <p className="m-0 text-[14px] text-fg-muted">“{checked.translation}”</p>
        </div>
      )}

      {latest && (
        <div key={latest.spanish} className="flex animate-pop flex-col gap-1 border-l-2 border-accent/50 pl-3.5">
          <span className="text-xs font-semibold tracking-[0.04em] text-fg-muted uppercase">Example</span>
          <p lang="es" className="m-0 text-[17px] font-medium">
            {latest.spanish}
          </p>
          <p className="m-0 text-[14px] text-fg-muted">{latest.english}</p>
        </div>
      )}
    </Sheet>
  );
}
