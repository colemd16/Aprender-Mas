import type { Metadata } from "next";
import { Suspense } from "react";
import { BackLink, TopBar } from "@/components/ui/top-bar";
import { Wordmark } from "@/components/ui/wordmark";
import { VerbsHub } from "@/components/verbs/verbs-hub";
import { getVerbOverview } from "@/data/verbs";
import { MASTERED, VERB_LEVELS } from "@/domain/verbs/mastery";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Verbs · Aprender Más" };

export default function VerbsPage() {
  return (
    <div className="spotlight flex min-h-app flex-col">
      <TopBar>
        <BackLink href="/">Home</BackLink>
        <Wordmark />
      </TopBar>
      <main className="mx-auto flex w-full max-w-[1000px] flex-col gap-6 px-4 pt-5 pb-32 sm:gap-8 sm:px-8 sm:pt-8 sm:pb-14">
        <div className="flex animate-rise flex-col gap-2.5">
          <span className="font-mono text-xs tracking-[0.06em] text-note">VERB CHALLENGE</span>
          <h1 className="m-0 text-[34px] leading-[1.05] font-semibold tracking-[-0.04em] sm:text-[52px]">Conjugate until it&apos;s automatic</h1>
          <p className="m-0 max-w-[620px] text-[15px] leading-relaxed text-fg-muted sm:text-base">
            Every right answer counts toward that verb in that tense: {VERB_LEVELS.map((l) => l.at).join(", ")}. {MASTERED} in every tense masters the verb —
            and a verb is only as strong as its weakest tense.
          </p>
        </div>
        <Suspense fallback={<HubSkeleton />}>
          <Hub />
        </Suspense>
      </main>
    </div>
  );
}

async function Hub() {
  const user = await getCurrentUser();
  const overview = await getVerbOverview(user.id);
  return (
    <>
      {overview.answered > 0 && (
        <div className="-mt-2 flex animate-rise flex-wrap gap-x-5 gap-y-1 font-mono text-xs text-fg-muted sm:-mt-4">
          <span>
            <span className="text-fg">{overview.started}</span> started
          </span>
          <span>
            <span className="text-ok">{overview.mastered}</span> mastered
          </span>
          <span>
            <span className="text-fg">{overview.correct}</span> right of {overview.answered}
          </span>
        </div>
      )}
      <VerbsHub verbs={overview.verbs} />
    </>
  );
}

function HubSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading verbs" className="flex flex-col gap-4">
      <div className="h-[300px] animate-pulse rounded-[22px] bg-white/[0.04]" />
      <div className="grid gap-2 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[62px] animate-pulse rounded-[16px] bg-white/[0.03]" />
        ))}
      </div>
    </div>
  );
}
