import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { startPractice } from "@/app/practice/actions";
import { ReviewList } from "@/components/review/review-list";
import { SessionDate } from "@/components/review/session-date";
import { ProgressRing } from "@/components/ui/progress-ring";
import { SubmitButton } from "@/components/ui/submit-button";
import { BackLink, TopBar } from "@/components/ui/top-bar";
import { Wordmark } from "@/components/ui/wordmark";
import { getSessionReview } from "@/data/history";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Session review · Aprender Más" };

export default function SessionReviewPage({ params }: PageProps<"/sessions/[sessionId]">) {
  return (
    <div className="spotlight flex min-h-app flex-col">
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
    <>
      <ReviewBar back={review.stepId ? { href: `/steps/${review.stepId}`, label: "Step" } : undefined} />
      <main className="mx-auto flex w-full max-w-[760px] flex-col gap-6 px-4 pt-5 pb-14 sm:gap-8 sm:px-8 sm:pt-8">
        <div className="flex animate-rise flex-wrap items-center gap-5 sm:gap-6">
          <div className="relative size-[104px] flex-none">
            <ProgressRing value={share} size={104} stroke={9} color={share >= 0.85 ? "var(--color-ok)" : "var(--color-accent)"} />
            <span className="absolute inset-0 flex items-center justify-center text-[26px] font-semibold tracking-[-0.03em]">{Math.round(share * 100)}%</span>
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <span className="font-mono text-xs tracking-[0.06em] text-fg-muted uppercase">
              Level {review.levelId} · <SessionDate iso={review.startedAt.toISOString()} />
            </span>
            <h1 lang="es" className="m-0 text-[30px] leading-[1.05] font-semibold tracking-[-0.04em] sm:text-[44px]">
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
            <SubmitButton variant="secondary" size="lg" pendingLabel="Starting" className="w-full sm:w-auto">
              Practice this step again
            </SubmitButton>
          </form>
        )}
      </main>
    </>
  );
}

// Back goes to the step the session was in (or the journey, for a checkpoint).
function ReviewBar({ back = { href: "/", label: "Journey" } }: { back?: { href: string; label: string } }) {
  return (
    <TopBar>
      <BackLink href={back.href}>{back.label}</BackLink>
      <Wordmark />
    </TopBar>
  );
}

function ReviewSkeleton() {
  return (
    <>
      <ReviewBar />
      <main aria-busy="true" aria-label="Loading session" className="mx-auto flex w-full max-w-[760px] flex-col gap-6 px-4 pt-5 sm:px-8 sm:pt-8">
        <div className="h-[104px] animate-pulse rounded-[22px] bg-white/[0.04]" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[180px] animate-pulse rounded-[22px] bg-white/[0.03]" />
        ))}
      </main>
    </>
  );
}
