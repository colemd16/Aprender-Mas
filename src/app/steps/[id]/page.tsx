import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { FormsTable } from "@/components/steps/forms-table";
import { Dock } from "@/components/ui/dock";
import { Markdown } from "@/components/ui/markdown";
import { Dot } from "@/components/ui/pill";
import { SubmitButton } from "@/components/ui/submit-button";
import { BackLink, TopBar } from "@/components/ui/top-bar";
import { Wordmark } from "@/components/ui/wordmark";
import { listSessions } from "@/data/history";
import { getStepIntro } from "@/data/steps";
import { SessionList } from "@/components/review/session-list";
import { SkillProgress } from "@/components/steps/skill-progress";
import { getStepSkillProgress } from "@/data/practice";
import { CHECKPOINT_PASS, CHECKPOINT_SIZE } from "@/domain/progress/rules";
import { getCurrentUser } from "@/lib/auth";
import { startPractice } from "@/app/practice/actions";

export default function StepPage({ params }: PageProps<"/steps/[id]">) {
  return (
    <div className="flex min-h-app flex-col bg-[radial-gradient(900px_420px_at_70%_30%,rgb(252_209_22/0.06),transparent_70%),radial-gradient(900px_520px_at_10%_0%,rgb(0_56_147/0.4),transparent_70%)]">
      <TopBar>
        <BackLink href="/">
          <span className="sm:hidden">Journey</span>
          <span className="hidden sm:inline">Back to journey</span>
        </BackLink>
        <Wordmark />
      </TopBar>
      <Suspense fallback={<StepSkeleton />}>
        <StepIntro params={params} />
      </Suspense>
    </div>
  );
}

async function StepIntro({ params }: { params: PageProps<"/steps/[id]">["params"] }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const [step, pastSessions, skillProgress] = await Promise.all([
    getStepIntro(user.id, id),
    listSessions(user.id, { stepId: id }),
    getStepSkillProgress(user.id, id),
  ]);
  if (!step) notFound();
  if (step.state === "upcoming") redirect("/");

  const isCheckpoint = step.kind === "checkpoint";
  const eyebrow = isCheckpoint ? `LEVEL ${step.levelId} · CHECKPOINT` : `LEVEL ${step.levelId} · STEP ${step.position} OF ${step.learnStepCount}`;

  const practiced = [
    step.formSkillCount > 0 && `${step.formSkillCount} forms`,
    step.usageSkills.length > 0 && `${step.usageSkills.length} usage skill${step.usageSkills.length === 1 ? "" : "s"}`,
  ].filter(Boolean);

  return (
    <main className="mx-auto flex w-full max-w-[1120px] flex-1 flex-wrap items-start gap-x-16 gap-y-8 px-4 pt-5 pb-32 sm:gap-y-10 sm:px-8 sm:pt-8 sm:pb-14">
      <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-5 sm:gap-6">
        <span className="animate-rise font-mono text-xs tracking-[0.06em] text-fg-muted">{eyebrow}</span>
        <h1 lang="es" className="m-0 animate-rise text-[34px] leading-[1.04] font-semibold tracking-[-0.04em] [animation-delay:50ms] sm:text-[56px]">
          {step.title}
        </h1>

        <div className="flex animate-rise flex-col gap-5 [animation-delay:100ms]">
          {isCheckpoint ? (
            <p className="m-0 text-lg leading-relaxed text-fg-soft">
              {CHECKPOINT_SIZE} mixed sentences drawn from every step in {step.levelTitle}. Get {Math.round(CHECKPOINT_PASS * 100)}% right and{" "}
              {step.isFinalLevel ? "you've finished the course" : `Level ${step.levelId + 1} unlocks`}; miss and you&apos;ll see exactly which steps to revisit.
            </p>
          ) : (
            step.explanation && <Markdown>{step.explanation}</Markdown>
          )}
        </div>

        {/* Not animated itself: on phones the button inside is pinned to the screen. */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 sm:pt-2">
          <Dock className="[animation-delay:150ms]">
            <form action={startPractice.bind(null, step.id)}>
              <SubmitButton size="lg" pendingLabel="Starting" className="w-full sm:w-auto">
                {isCheckpoint ? "Start checkpoint" : step.state === "done" ? "Practice again" : "Start practicing"} <span aria-hidden="true">→</span>
              </SubmitButton>
            </form>
          </Dock>
          <span className="animate-rise text-sm text-fg-muted [animation-delay:150ms]">{!isCheckpoint && practiced.join(" · ")}</span>
        </div>
      </div>

      <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-3 sm:gap-4">
        {!isCheckpoint && pastSessions.length > 0 && <SkillProgress skills={skillProgress} className="animate-rise" />}

        {pastSessions.length > 0 && (
          <section aria-label="Your sessions" className="flex animate-rise flex-col gap-3 [animation-delay:80ms]">
            <h2 className="m-0 flex items-baseline justify-between text-sm font-semibold">
              Your sessions
              <span className="font-mono text-xs font-normal text-fg-muted">{pastSessions.length}</span>
            </h2>
            <SessionList sessions={pastSessions.map((s) => ({ ...s, startedAt: s.startedAt.toISOString(), lastAnswerAt: s.lastAnswerAt.toISOString() }))} />
          </section>
        )}

        {step.tables.map((table, i) => (
          <div key={table.tenseId} className="animate-rise" style={{ animationDelay: `${120 + i * 80}ms` }}>
            <FormsTable table={table} delay={i * 200} />
          </div>
        ))}

        {(step.usageSkills.length > 0 || isCheckpoint) && (
          <section
            aria-label="What you'll practice"
            className="glass-subtle flex animate-rise flex-col gap-3 rounded-[20px] p-5 [animation-delay:200ms] sm:p-[22px]"
          >
            <h2 className="m-0 text-sm font-semibold">{isCheckpoint ? "Covers" : "You'll practice using it"}</h2>
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
              {(isCheckpoint ? step.levelSteps : step.usageSkills).map((title) => (
                <li key={title} className="flex items-center gap-3 text-[15px] text-fg-soft">
                  <Dot className="text-accent" />
                  {title}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}

function StepSkeleton() {
  return (
    <main aria-busy="true" aria-label="Loading step" className="mx-auto flex w-full max-w-[1120px] flex-wrap gap-x-16 gap-y-8 px-4 pt-5 sm:px-8 sm:pt-8">
      <div className="flex flex-[1_1_380px] flex-col gap-5">
        <div className="h-3 w-40 animate-pulse rounded bg-white/[0.05]" />
        <div className="h-14 w-[min(420px,90%)] animate-pulse rounded-xl bg-white/[0.05]" />
        <div className="h-24 animate-pulse rounded-xl bg-white/[0.03]" />
      </div>
      <div className="h-[340px] flex-[1_1_440px] animate-pulse rounded-[22px] bg-white/[0.04]" />
    </main>
  );
}
