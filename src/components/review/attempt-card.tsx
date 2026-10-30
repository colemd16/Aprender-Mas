import type { ReviewedAttempt } from "@/data/history";
import { cn } from "@/components/ui/cn";
import { Dot, Pill } from "@/components/ui/pill";
import { Explanation } from "@/components/practice/explanation";
import { TrackedChanges } from "./tracked-changes";

const verdictStyle = {
  correct: { label: "¡Exacto!", className: "bg-ok/12 text-ok" },
  acceptable: { label: "Correct · note", className: "bg-ok/12 text-ok" },
  incorrect: { label: "Missed", className: "bg-bad/12 text-bad" },
} as const;

// One question from a past session: what was asked, what you wrote, the correction,
// why, and anything you asked about it afterwards.
export function AttemptCard({ attempt, number }: { attempt: ReviewedAttempt; number: number }) {
  const verdict = verdictStyle[attempt.verdict];
  const changed = attempt.diff.some((d) => d.op !== "same");

  return (
    <article className="glass-subtle flex flex-col gap-4 rounded-[22px] p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-xs text-fg-subtle">{String(number).padStart(2, "0")}</span>
          <Pill className="py-1 text-xs">{attempt.kind === "form" ? "Drill" : "Sentence"}</Pill>
          {attempt.inputMode === "spoken" && <Pill className="py-1 text-xs">Spoken</Pill>}
        </div>
        <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", verdict.className)}>{verdict.label}</span>
      </header>

      <h3 lang={attempt.kind === "form" ? "es" : "en"} className="m-0 text-lg leading-snug font-semibold tracking-[-0.01em]">
        {attempt.prompt}
      </h3>

      <div className="flex flex-col gap-1.5">
        <TrackedChanges ops={attempt.diff} corrected={attempt.corrected} className="text-xl leading-relaxed font-medium sm:text-2xl" />
        {changed && (
          <p className="m-0 text-[13px] text-fg-muted">
            You wrote{" "}
            <span lang="es" className="text-fg-soft">
              {attempt.answer}
            </span>
          </p>
        )}
      </div>

      {(attempt.errors.length > 0 || attempt.tip) && (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {attempt.errors.map((e, i) => (
            <li key={i} className="flex flex-col gap-1">
              <span className={cn("flex items-center gap-2 text-[13px] font-semibold", e.counts ? "text-bad" : "text-note")}>
                <Dot className={e.counts ? "text-bad" : "text-note"} />
                {e.label}
              </span>
              <Explanation text={e.explanation} />
            </li>
          ))}
          {attempt.tip && (
            <li className="flex flex-col gap-1">
              <span className="flex items-center gap-2 text-[13px] font-semibold text-accent">
                <Dot className="text-accent" />
                Tip
              </span>
              <Explanation text={attempt.tip} />
            </li>
          )}
        </ul>
      )}

      {attempt.followUps.length > 0 && (
        <section aria-label="Your questions" className="flex flex-col gap-3 border-t border-white/[0.06] pt-4">
          {attempt.followUps.map((f, i) => (
            <div key={i} className="flex flex-col gap-2.5">
              <p className="m-0 self-end rounded-2xl rounded-br-md bg-accent/12 px-4 py-2.5 text-[15px] text-accent-bright">{f.question}</p>
              <div className="rounded-[18px] bg-white/[0.03] p-4 sm:px-5">
                <Explanation text={f.answer} />
              </div>
            </div>
          ))}
        </section>
      )}
    </article>
  );
}
