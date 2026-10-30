import Link from "next/link";
import { Suspense } from "react";
import { LevelTrack } from "@/components/journey/level-track";
import { StepCard } from "@/components/journey/step-card";
import { ButtonLink } from "@/components/ui/button";
import { Dock } from "@/components/ui/dock";
import { Pill } from "@/components/ui/pill";
import { SubmitButton } from "@/components/ui/submit-button";
import { TopBar } from "@/components/ui/top-bar";
import { Wordmark } from "@/components/ui/wordmark";
import { getJourney } from "@/data/journey";
import { getCurrentUser } from "@/lib/auth";
import { startPractice } from "./practice/actions";
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
  const stats = (
    <>
      <Pill>
        <span>
          <span className="font-semibold text-fg">{journey.solidSkills}</span> of {journey.totalSkills} skills solid
        </span>
      </Pill>
      {journey.reviewsDue > 0 && <Pill tone="note">{journey.reviewsDue} reviews due</Pill>}
    </>
  );
  // Picking up where you left off is one tap; a first visit to a step opens its intro.
  const resume = activeStep?.kind === "learn" && (journey.sessionsByStep[activeStep.id] ?? 0) > 0;

  return (
    <>
      <TopBar>
        <Wordmark />
        <div className="flex items-center gap-2.5">
          <div className="hidden items-center gap-2.5 sm:flex">{stats}</div>
          <form action={signOut}>
            <button
              type="submit"
              aria-label="Sign out"
              className="-mr-2 flex size-10 cursor-pointer items-center justify-center rounded-xl text-[13px] font-medium text-fg-soft transition-colors duration-200 hover:text-fg active:text-fg sm:mr-0 sm:h-9 sm:w-auto sm:px-3"
            >
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="sm:hidden"
              >
                <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4" />
              </svg>
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </form>
        </div>
      </TopBar>

      <main className="mx-auto flex w-full max-w-[1120px] flex-col gap-6 px-4 pt-4 pb-32 sm:gap-10 sm:px-8 sm:pt-6 sm:pb-12">
        <LevelTrack levels={journey.levels} viewedId={viewedLevel.id} />

        <div key={viewedLevel.id} className="flex animate-rise flex-col gap-2.5">
          <span className="font-mono text-xs tracking-[0.06em] text-fg-muted">
            LEVEL {viewedLevel.id}
            {pastLevel && " · COMPLETE"}
            {activeStep?.kind === "learn" && ` · STEP ${activeStep.position} OF ${learnSteps}`}
            {activeStep?.kind === "checkpoint" && " · CHECKPOINT"}
          </span>
          <h1 className="m-0 text-[34px] leading-[1.05] font-semibold tracking-[-0.04em] sm:text-[52px]">{viewedLevel.title}</h1>
          <p className="m-0 text-[15px] leading-relaxed text-fg-muted sm:text-base">
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
          <div className="flex flex-wrap gap-2 pt-1 sm:hidden">{stats}</div>
        </div>

        <ol key={`steps-${viewedLevel.id}`} className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-2.5 p-0 sm:gap-3">
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

      {activeStep && (
        <Dock className="sm:hidden">
          {resume ? (
            <form action={startPractice.bind(null, activeStep.id)}>
              <SubmitButton size="lg" pendingLabel="Starting" className="w-full">
                Continue ·{" "}
                <span lang="es" className="min-w-0 truncate">
                  {activeStep.title}
                </span>{" "}
                <span aria-hidden="true">→</span>
              </SubmitButton>
            </form>
          ) : (
            <ButtonLink href={`/steps/${activeStep.id}`} size="lg" className="w-full">
              {activeStep.kind === "checkpoint" ? "Take the checkpoint" : "Start"} ·{" "}
              <span lang="es" className="min-w-0 truncate">
                {activeStep.title}
              </span>{" "}
              <span aria-hidden="true">→</span>
            </ButtonLink>
          )}
        </Dock>
      )}
    </>
  );
}

// Shown for the moment it takes to read the session and load progress.
function JourneySkeleton() {
  return (
    <>
      <TopBar>
        <Wordmark />
      </TopBar>
      <main
        aria-busy="true"
        aria-label="Loading your journey"
        className="mx-auto flex w-full max-w-[1120px] flex-col gap-6 px-4 pt-4 sm:gap-10 sm:px-8 sm:pt-6"
      >
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
