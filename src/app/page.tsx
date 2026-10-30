import Link from "next/link";
import { Suspense } from "react";
import { LevelTrack } from "@/components/journey/level-track";
import { StepCard } from "@/components/journey/step-card";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { Wordmark } from "@/components/ui/wordmark";
import { getJourney } from "@/data/journey";
import { getCurrentUser } from "@/lib/auth";
import { signOut } from "./login/actions";

export default function JourneyPage({ searchParams }: PageProps<"/">) {
  return (
    <div className="spotlight flex min-h-app flex-col">
      <Suspense fallback={<JourneySkeleton />}>
        <Journey searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Journey({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const { level } = await searchParams;
  const user = await getCurrentUser();
  const journey = await getJourney(user.id, Number(level) || undefined);
  const { currentLevel, viewedLevel, steps, activeStep } = journey;
  const learnSteps = steps.filter((s) => s.kind === "learn").length;
  const pastLevel = viewedLevel.id !== currentLevel.id;

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8 sm:py-5">
        <Wordmark />
        <div className="flex flex-wrap items-center gap-2.5">
          <Pill>
            <span>
              <span className="font-semibold text-fg">{journey.solidSkills}</span> of {journey.totalSkills} skills solid
            </span>
          </Pill>
          {journey.reviewsDue > 0 && <Pill tone="note">{journey.reviewsDue} reviews due</Pill>}
          <form action={signOut}>
            <Button type="submit" variant="ghost" className="h-9 px-3 text-[13px] font-medium">
              Sign out
            </Button>
          </form>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1120px] flex-col gap-7 px-5 pt-4 pb-12 sm:gap-10 sm:px-8 sm:pt-6">
        <LevelTrack levels={journey.levels} viewedId={viewedLevel.id} />

        <div key={viewedLevel.id} className="flex animate-rise flex-col gap-2.5">
          <span className="font-mono text-xs tracking-[0.06em] text-fg-muted">
            LEVEL {viewedLevel.id}
            {pastLevel && " · COMPLETE"}
            {activeStep?.kind === "learn" && ` · STEP ${activeStep.position} OF ${learnSteps}`}
            {activeStep?.kind === "checkpoint" && " · CHECKPOINT"}
          </span>
          <h1 className="m-0 text-[38px] leading-[1.05] font-semibold tracking-[-0.04em] sm:text-[52px]">{viewedLevel.title}</h1>
          <p className="m-0 text-base text-fg-muted">
            {viewedLevel.summary}
            {pastLevel && (
              <>
                {" "}
                <Link href="/" className="text-accent no-underline hover:text-accent-bright">
                  Back to Level {currentLevel.id} →
                </Link>
              </>
            )}
          </p>
        </div>

        <ol key={`steps-${viewedLevel.id}`} className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-3 p-0">
          {steps.map((step, i) => (
            <StepCard
              key={step.id}
              step={step}
              index={i}
              solid={step.state === "active" ? journey.activeStepSolid : 0}
              sessions={journey.sessionsByStep[step.id] ?? 0}
            />
          ))}
        </ol>
      </main>
    </>
  );
}

// Shown for the moment it takes to read the session and load progress.
function JourneySkeleton() {
  return (
    <>
      <header className="px-5 py-4 sm:px-8 sm:py-5">
        <Wordmark />
      </header>
      <main aria-busy="true" aria-label="Loading your journey" className="mx-auto flex w-full max-w-[1120px] flex-col gap-10 px-5 pt-6 sm:px-8">
        <div className="h-[66px] animate-pulse rounded-2xl bg-white/[0.03]" />
        <div className="flex flex-col gap-3">
          <div className="h-3 w-40 animate-pulse rounded bg-white/[0.05]" />
          <div className="h-12 w-[min(480px,80%)] animate-pulse rounded-xl bg-white/[0.05]" />
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-3">
          <div className="col-span-full h-[180px] animate-pulse rounded-[20px] bg-white/[0.04]" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[120px] animate-pulse rounded-[20px] bg-white/[0.03]" />
          ))}
        </div>
      </main>
    </>
  );
}
