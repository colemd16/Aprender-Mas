import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TENSES } from "@/content/tenses";
import { VerbChallenge } from "@/components/verbs/verb-challenge";
import { planVerbChallenge, VERB_SETS, type ChallengeOptions, type VerbSet } from "@/data/verbs";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Verb challenge · Aprender Más" };

const SET_TITLES: Record<VerbSet, string> = { common: "Most common verbs", irregular: "Irregular verbs", started: "Verbs in progress", all: "All verbs" };

export default function VerbPracticePage({ searchParams }: PageProps<"/verbs/practice">) {
  return (
    <Suspense fallback={<ChallengeSkeleton />}>
      <Challenge searchParams={searchParams} />
    </Suspense>
  );
}

async function Challenge({ searchParams }: { searchParams: PageProps<"/verbs/practice">["searchParams"] }) {
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => (typeof v === "string" && v ? v : undefined);
  const set = one(params.set);
  const options: ChallengeOptions = {
    verb: one(params.verb),
    tense: one(params.tense),
    set: VERB_SETS.includes(set as VerbSet) ? (set as VerbSet) : undefined,
    tenses: one(params.tenses)?.split(",").filter(Boolean),
  };
  const user = await getCurrentUser();
  const cards = await planVerbChallenge(user.id, options);
  if (options.verb && !cards.length) notFound();

  const tenseName = TENSES.find((t) => t.id === options.tense)?.nameEn;
  const title = options.verb ? (tenseName ? `${options.verb} · ${tenseName}` : `${options.verb} · all tenses`) : SET_TITLES[options.set ?? "common"];
  const backHref = options.verb ? `/verbs/${encodeURIComponent(options.verb)}` : "/verbs";
  return <VerbChallenge options={options} cards={cards} title={title} backHref={backHref} />;
}

function ChallengeSkeleton() {
  return (
    <main
      aria-busy="true"
      aria-label="Shuffling verbs"
      className="mx-auto flex min-h-app w-full max-w-[760px] flex-col gap-6 px-4 pt-16 sm:justify-center sm:gap-8 sm:px-8 sm:pt-0"
    >
      <div className="h-7 w-48 animate-pulse rounded-full bg-white/[0.05]" />
      <div className="h-12 w-[min(420px,85%)] animate-pulse rounded-xl bg-white/[0.05]" />
      <div className="h-[68px] animate-pulse rounded-[22px] bg-white/[0.04]" />
    </main>
  );
}
