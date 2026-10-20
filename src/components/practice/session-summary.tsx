import { startPractice, type SessionSummary } from "@/app/practice/actions";
import { Button, ButtonLink } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Wordmark } from "@/components/ui/wordmark";
import { CHECKPOINT_PASS } from "@/domain/progress/rules";

type Props = {
  summary: SessionSummary;
  kind: "learn" | "review" | "checkpoint";
  stepId: string | null;
  stepTitle: string;
  levelId: number | null;
  progress: { solid: number; total: number } | null;
};

export function SessionSummaryView({ summary, kind, stepId, stepTitle, levelId, progress }: Props) {
  const share = summary.answered ? summary.correct / summary.answered : 0;
  const cp = summary.checkpoint;
  const ringColor = cp ? (cp.passed ? "var(--color-ok)" : "var(--color-warn)") : "var(--color-ok)";
  const value = cp ? cp.score : share;

  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(800px_420px_at_40%_40%,rgb(91_224_160/0.07),transparent_70%)]">
      <header className="px-5 py-4 sm:px-8 sm:py-5">
        <Wordmark />
      </header>
      <main className="mx-auto flex w-full max-w-[720px] flex-1 flex-col justify-center gap-8 px-5 py-10 sm:px-8">
        <div className="flex flex-wrap items-center gap-7">
          <div className="relative size-[168px] flex-none">
            <ProgressRing value={value} size={168} stroke={12} color={ringColor} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[44px] font-semibold tracking-[-0.04em]">{Math.round(value * 100)}%</span>
              <span className="font-mono text-xs text-fg-muted">
                {summary.correct} / {summary.answered}
              </span>
            </div>
          </div>
          <div className="flex min-w-0 animate-rise flex-col gap-2.5 [animation-delay:300ms]">
            {cp ? (
              <>
                <span className={`self-start rounded-full px-3 py-1.5 text-[13px] font-semibold ${cp.passed ? "bg-ok/12 text-ok" : "bg-warn/12 text-warn"}`}>
                  {cp.passed ? "Checkpoint passed" : "Not yet"}
                </span>
                <h1 className="m-0 text-[40px] leading-[1.05] font-semibold tracking-[-0.04em]">{cp.passed ? `Level ${levelId} complete` : `Level ${levelId} checkpoint`}</h1>
                <p className="m-0 text-fg-muted">
                  {cp.passed
                    ? `You needed ${Math.round(CHECKPOINT_PASS * 100)}%. Level ${(levelId ?? 0) + 1} is unlocked.`
                    : `You need ${Math.round(CHECKPOINT_PASS * 100)}% to pass. Your misses are now in your reviews — practice them and try again.`}
                </p>
              </>
            ) : (
              <>
                <span className="self-start rounded-full bg-ok/12 px-3 py-1.5 text-[13px] font-semibold text-ok">Session done</span>
                <h1 lang="es" className="m-0 text-[40px] leading-[1.05] font-semibold tracking-[-0.04em]">
                  {stepTitle}
                </h1>
                <p className="m-0 text-fg-muted">
                  {summary.answered === 0 ? "No answers this time." : `${summary.correct} of ${summary.answered} right. Everything you missed will come back in reviews.`}
                </p>
              </>
            )}
          </div>
        </div>

        {progress && kind === "learn" && (
          <div className="glass-subtle flex animate-rise flex-col gap-3 rounded-[20px] p-[22px] [animation-delay:450ms]">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">Skills solid in this step</span>
              <span className="font-mono text-fg-soft">
                {progress.solid}/{progress.total}
              </span>
            </div>
            <ProgressBar value={progress.total ? progress.solid / progress.total : 0} label="Skills solid in this step" />
          </div>
        )}

        <div className="flex animate-rise flex-wrap gap-3 [animation-delay:550ms]">
          <ButtonLink href="/" variant="primary" size="lg">
            Back to journey <span aria-hidden="true">→</span>
          </ButtonLink>
          {stepId && !(cp?.passed) && (
            <form action={startPractice.bind(null, stepId)}>
              <Button type="submit" variant="secondary" size="lg">
                {kind === "checkpoint" ? "Try the checkpoint again" : "Practice again"}
              </Button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
