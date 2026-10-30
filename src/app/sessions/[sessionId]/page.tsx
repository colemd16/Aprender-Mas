import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { startPractice } from "@/app/practice/actions";
import { ReviewList } from "@/components/review/review-list";
import { SessionDate } from "@/components/review/session-date";
import { Button } from "@/components/ui/button";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Wordmark } from "@/components/ui/wordmark";
import { getSessionReview } from "@/data/history";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Session review · Aprender Más" };

export default function SessionReviewPage({ params }: PageProps<"/sessions/[sessionId]">) {
  return (
    <div className="spotlight flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8 sm:py-5">
        <Wordmark />
        <Link href="/" className="text-sm text-fg-soft no-underline hover:text-fg">
          Journey
        </Link>
      </header>
      <Suspense fallback={<ReviewSkeleton />}>
        <Review params={params} />
      </Suspense>
    </div>
  );
}

async function Review({ params }: { params: PageProps<"/sessions/[sessionId]">["params"] }) {
  const { sessionId } = await params;
  const user = await getCurrentUser();
  const review = await getSessionReview(user.id, sessionId);
  if (!review) notFound();

  const share = review.answered ? review.correct / review.answered : 0;
  const title = review.kind === "checkpoint" ? `Level ${review.levelId} checkpoint` : (review.stepTitle ?? "Practice");
  const asked = review.attempts.reduce((n, a) => n + a.followUps.length, 0);

  return (
    <main className="mx-auto flex w-full max-w-[760px] flex-col gap-8 px-5 pt-4 pb-14 sm:px-8 sm:pt-8">
      <div className="flex animate-rise flex-wrap items-center gap-6">
        <div className="relative size-[104px] flex-none">
          <ProgressRing value={share} size={104} stroke={9} color={share >= 0.85 ? "var(--color-ok)" : "var(--color-accent)"} />
          <span className="absolute inset-0 flex items-center justify-center text-[26px] font-semibold tracking-[-0.03em]">{Math.round(share * 100)}%</span>
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <span className="font-mono text-xs tracking-[0.06em] text-fg-muted uppercase">
            {review.stepId ? (
              <Link href={`/steps/${review.stepId}`} className="text-fg-muted no-underline hover:text-fg">
                ← Back to step
              </Link>
            ) : (
              <>Level {review.levelId}</>
            )}{" "}
            · <SessionDate iso={review.startedAt.toISOString()} />
          </span>
          <h1 lang="es" className="m-0 text-[34px] leading-[1.05] font-semibold tracking-[-0.04em] sm:text-[44px]">
            {title}
          </h1>
          <p className="m-0 text-fg-muted">
            {review.correct} of {review.answered} right · {review.minutes} min
            {asked > 0 && ` · ${asked} question${asked === 1 ? "" : "s"} asked`}
            {review.checkpoint && (review.checkpoint.passed ? " · passed" : " · not passed")}
          </p>
        </div>
      </div>

      {review.attempts.length ? <ReviewList attempts={review.attempts} /> : <p className="m-0 text-fg-muted">No answers in this session.</p>}

      {review.stepId && (
        <form action={startPractice.bind(null, review.stepId)} className="flex justify-center pt-2">
          <Button type="submit" variant="secondary" size="lg">
            Practice this step again
          </Button>
        </form>
      )}
    </main>
  );
}

function ReviewSkeleton() {
  return (
    <main aria-busy="true" aria-label="Loading session" className="mx-auto flex w-full max-w-[760px] flex-col gap-6 px-5 pt-8 sm:px-8">
      <div className="h-[104px] animate-pulse rounded-[22px] bg-white/[0.04]" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-[180px] animate-pulse rounded-[22px] bg-white/[0.03]" />
      ))}
    </main>
  );
}
