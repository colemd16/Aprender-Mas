import Link from "next/link";
import { startPractice, type SessionSummary, type UpNext } from "@/app/practice/actions";
import { buttonClasses, ButtonLink } from "@/components/ui/button";
import { Dock } from "@/components/ui/dock";
import { ProgressRing } from "@/components/ui/progress-ring";
import { SubmitButton } from "@/components/ui/submit-button";
import { TopBar } from "@/components/ui/top-bar";
import { Wordmark } from "@/components/ui/wordmark";
import { SkillProgress } from "@/components/steps/skill-progress";
import { CHECKPOINT_PASS } from "@/domain/progress/rules";

type Props = {
  sessionId: string;
  summary: SessionSummary;
  kind: "learn" | "review" | "checkpoint";
  stepId: string | null;
  stepTitle: string;
  levelId: number | null;
};

export function SessionSummaryView({ sessionId, summary, kind, stepId, stepTitle, levelId }: Props) {
  const share = summary.answered ? summary.correct / summary.answered : 0;
  const toGo = summary.skills.reduce((n, s) => n + s.needed, 0);
  const { stepComplete, upNext } = summary;
  const cp = summary.checkpoint;
  const ringColor = cp ? (cp.passed ? "var(--color-ok)" : "var(--color-note)") : "var(--color-ok)";
  const value = cp ? cp.score : share;
  // When there's a next step, it's the headline; the score steps back a little.
  const ring = upNext ? 120 : 168;

  return (
    <div className="flex min-h-app flex-col bg-[radial-gradient(800px_420px_at_40%_40%,rgb(91_224_160/0.07),transparent_70%)]">
      <TopBar>
        <Wordmark />
      </TopBar>
      <main className="mx-auto flex w-full max-w-[720px] flex-1 flex-col gap-6 px-4 pt-6 pb-40 sm:justify-center sm:gap-8 sm:px-8 sm:py-10">
        <div className="flex flex-wrap items-center gap-x-7 gap-y-5">
          <div className="relative flex-none" style={{ width: ring, height: ring }}>
            <ProgressRing value={value} size={ring} stroke={upNext ? 10 : 12} color={ringColor} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={upNext ? "text-[32px] font-semibold tracking-[-0.04em]" : "text-[44px] font-semibold tracking-[-0.04em]"}>
                {Math.round(value * 100)}%
              </span>
              <span className="font-mono text-xs text-fg-muted">
                {summary.correct} / {summary.answered}
              </span>
            </div>
          </div>
          <div className="flex min-w-0 flex-[1_1_240px] animate-rise flex-col gap-2.5 [animation-delay:300ms]">
            {cp ? (
              <>
                <span className={`self-start rounded-full px-3 py-1.5 text-[13px] font-semibold ${cp.passed ? "bg-ok/12 text-ok" : "bg-note/12 text-note"}`}>
                  {cp.passed ? "Checkpoint passed" : "Not yet"}
                </span>
                <h1 className="m-0 text-[32px] leading-[1.05] font-semibold tracking-[-0.04em] sm:text-[40px]">
                  {cp.passed ? `Level ${levelId} complete` : `Level ${levelId} checkpoint`}
                </h1>
                <p className="m-0 text-fg-muted">
                  {cp.passed
                    ? `You needed ${Math.round(CHECKPOINT_PASS * 100)}%. Level ${(levelId ?? 0) + 1} is unlocked.`
                    : `You need ${Math.round(CHECKPOINT_PASS * 100)}% to pass. Your misses are now in your reviews — practice them and try again.`}
                </p>
              </>
            ) : (
              <>
                <span className="self-start rounded-full bg-ok/12 px-3 py-1.5 text-[13px] font-semibold text-ok">
                  {stepComplete ? "Step complete" : "Session done"}
                </span>
                <h1 lang="es" className="m-0 text-[32px] leading-[1.05] font-semibold tracking-[-0.04em] sm:text-[40px]">
                  {stepTitle}
                </h1>
                <p className="m-0 text-fg-muted">
                  {summary.answered === 0
                    ? "No answers this time."
                    : stepComplete
                      ? `Every skill in this step is solid. ${summary.correct} of ${summary.answered} right this session.`
                      : kind === "learn" && toGo > 0
                        ? `${summary.correct} of ${summary.answered} right. Your progress is saved — ${toGo} more correct answer${toGo === 1 ? "" : "s"} to finish the step.`
                        : `${summary.correct} of ${summary.answered} right. Everything you missed will come back in reviews.`}
                </p>
              </>
            )}
          </div>
        </div>

        {upNext && <UpNextCard next={upNext} />}

        {kind === "learn" && !stepComplete && summary.skills.length > 0 && (
          <SkillProgress skills={summary.skills} className="animate-rise [animation-delay:450ms]" />
        )}

        <Dock className="[animation-delay:550ms] sm:flex-wrap sm:gap-3">
          {!upNext && (
            <ButtonLink href="/" variant="primary" size="lg" className="w-full sm:w-auto">
              Back to journey <span aria-hidden="true">→</span>
            </ButtonLink>
          )}
          <div className="flex gap-2.5 sm:contents">
            {summary.answered > 0 && (
              <ButtonLink href={`/sessions/${sessionId}`} variant="secondary" size="lg" className="flex-1 sm:flex-none">
                Review<span className="hidden min-[400px]:inline">&nbsp;answers</span>
              </ButtonLink>
            )}
            {upNext ? (
              <ButtonLink href="/" variant="secondary" size="lg" className="flex-1 sm:flex-none">
                Journey
              </ButtonLink>
            ) : (
              stepId &&
              !cp?.passed && (
                <form action={startPractice.bind(null, stepId)} className="flex flex-1 sm:flex-none">
                  <SubmitButton variant="secondary" size="lg" pendingLabel="Starting" className="flex-1">
                    {kind === "checkpoint" ? "Try again" : toGo > 0 ? "Keep going" : "Practice again"}
                  </SubmitButton>
                </form>
              )
            )}
          </div>
        </Dock>
      </main>
    </div>
  );
}

// The way forward, front and centre once a step (or a checkpoint) is behind you. It opens
// the step's intro — its explanation and forms — where practice starts.
function UpNextCard({ next }: { next: UpNext }) {
  const checkpoint = next.kind === "checkpoint";
  return (
    <Link
      href={`/steps/${next.id}`}
      className="flex animate-rise flex-col gap-3 rounded-[22px] border border-accent/35 bg-accent/[0.07] p-5 text-fg no-underline shadow-[0_0_48px_rgb(252_209_22/0.08)] transition-[transform,border-color] duration-200 ease-spring [animation-delay:420ms] hover:-translate-y-[3px] hover:border-accent/60 active:scale-[0.98] sm:gap-4 sm:p-6"
    >
      <span className="font-mono text-xs tracking-[0.06em] text-accent">
        UP NEXT · LEVEL {next.levelId} · {checkpoint ? "CHECKPOINT" : `STEP ${next.position}`}
      </span>
      <span lang="es" className="text-[28px] leading-[1.08] font-semibold tracking-[-0.03em] sm:text-[34px]">
        {next.title}
      </span>
      <span className={buttonClasses({ variant: "primary", size: "lg", className: "mt-1 w-full sm:w-auto sm:self-start" })}>
        {checkpoint ? "Take the checkpoint" : "Start this step"} <span aria-hidden="true">→</span>
      </span>
    </Link>
  );
}
