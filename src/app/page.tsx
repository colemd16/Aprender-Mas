import Link from "next/link";
import { Suspense } from "react";
import { buttonClasses } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SignOutButton } from "@/components/ui/sign-out-button";
import { TopBar } from "@/components/ui/top-bar";
import { Wordmark } from "@/components/ui/wordmark";
import { getJourney } from "@/data/journey";
import { getVerbOverview } from "@/data/verbs";
import { MASTERED } from "@/domain/verbs/mastery";
import { getCurrentUser } from "@/lib/auth";

// Conjugations that cycle on the Verbs card; each gets a 3-second slot in a 12s loop.
const TICKER = [
  { verb: "hablar", form: "hablamos" },
  { verb: "tener", form: "tuvieron" },
  { verb: "ir", form: "iremos" },
  { verb: "decir", form: "dijiste" },
];

// Home: the two ways to practice, picked every time the app opens — the journey (grammar
// fundamentals, step by step) or the verb challenge (conjugation by repetition).
export default function HomePage() {
  return (
    <div className="spotlight flex min-h-app flex-col">
      <TopBar>
        <Wordmark />
        <SignOutButton />
      </TopBar>
      <main className="mx-auto flex w-full max-w-[1000px] flex-1 flex-col gap-6 px-4 pt-6 pb-12 sm:justify-center sm:gap-9 sm:px-8 sm:pb-20">
        <div className="flex animate-rise flex-col gap-2">
          <span lang="es" className="font-mono text-xs tracking-[0.06em] text-fg-muted">
            ¿QUÉ PRACTICAMOS HOY?
          </span>
          <h1 className="m-0 text-[34px] leading-[1.05] font-semibold tracking-[-0.04em] sm:text-[52px]">Pick a path</h1>
        </div>
        <Suspense fallback={<PathsSkeleton />}>
          <Paths />
        </Suspense>
      </main>
    </div>
  );
}

async function Paths() {
  const user = await getCurrentUser();
  const [journey, verbs] = await Promise.all([getJourney(user.id), getVerbOverview(user.id)]);
  const { currentLevel, activeStep } = journey;
  const card =
    "flex animate-rise flex-col gap-4 rounded-[24px] border p-5 text-fg no-underline transition-[transform,border-color] duration-200 ease-spring hover:-translate-y-[3px] active:scale-[0.98] sm:p-7";

  return (
    <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
      <Link href="/journey" className={`${card} border-accent/35 bg-accent/[0.07] [animation-delay:80ms] hover:border-accent/60`}>
        <span className="font-mono text-xs tracking-[0.06em] text-accent">JOURNEY · FUNDAMENTALS</span>
        <div className="flex flex-col gap-1.5">
          <span className="text-[28px] leading-[1.08] font-semibold tracking-[-0.03em] sm:text-[32px]">
            Level {currentLevel.id} · {currentLevel.title}
          </span>
          <span className="text-[15px] text-fg-muted">
            {activeStep ? (
              <>
                {activeStep.kind === "checkpoint" ? "Checkpoint" : `Step ${activeStep.position}`}:{" "}
                <span lang="es" className="text-fg-soft">
                  {activeStep.title}
                </span>
              </>
            ) : (
              "Every step done"
            )}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <ProgressBar value={journey.totalSkills ? journey.solidSkills / journey.totalSkills : 0} label="Skills solid" className="flex-1" />
          <span className="font-mono text-xs text-fg-muted">
            {journey.solidSkills}/{journey.totalSkills} skills
          </span>
        </div>
        {journey.reviewsDue > 0 && (
          <Pill tone="note" className="self-start">
            {journey.reviewsDue} reviews due
          </Pill>
        )}
        <span className={buttonClasses({ variant: "primary", size: "lg", className: "mt-auto w-full sm:w-auto sm:self-start" })}>
          Continue <span aria-hidden="true">→</span>
        </span>
      </Link>

      <Link href="/verbs" className={`${card} border-note/30 bg-note/[0.07] [animation-delay:160ms] hover:border-note/55`}>
        <span className="font-mono text-xs tracking-[0.06em] text-note">VERBS · CONJUGATION CHALLENGE</span>
        <div className="flex flex-col gap-1.5">
          <span className="text-[28px] leading-[1.08] font-semibold tracking-[-0.03em] sm:text-[32px]">Every verb, every tense</span>
          <span className="text-[15px] text-fg-muted">
            {verbs.started
              ? `${verbs.started} verb${verbs.started === 1 ? "" : "s"} started · ${verbs.mastered} mastered`
              : `${verbs.verbs.length} verbs. Master one with ${MASTERED} right in every tense.`}
          </span>
        </div>
        <div aria-hidden="true" lang="es" className="grid h-9 overflow-hidden font-mono text-[17px]">
          {TICKER.map((t, i) => (
            <span key={t.verb} className="animate-phrase-cycle [grid-area:1/1] self-center opacity-0" style={{ animationDelay: `${i * 3}s` }}>
              <span className="text-fg-muted">{t.verb}</span> <span className="text-fg-subtle">→</span> <span className="text-note">{t.form}</span>
            </span>
          ))}
        </div>
        <span className={buttonClasses({ variant: "light", size: "lg", className: "mt-auto w-full sm:w-auto sm:self-start" })}>
          {verbs.started ? "Keep conjugating" : "Start a challenge"} <span aria-hidden="true">→</span>
        </span>
      </Link>
    </div>
  );
}

function PathsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="grid gap-3 sm:grid-cols-2 sm:gap-4">
      <div className="h-[260px] animate-pulse rounded-[24px] bg-white/[0.04]" />
      <div className="h-[260px] animate-pulse rounded-[24px] bg-white/[0.03]" />
    </div>
  );
}
