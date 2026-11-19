import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TENSES } from "@/content/tenses";
import { VerbChallenge } from "@/components/verbs/verb-challenge";
import { getTaughtTenses, getVerbDetail, planVerbChallenge, VERB_SETS, type ChallengeOptions, type VerbSet } from "@/data/verbs";
import { VERB_LEVELS } from "@/domain/verbs/mastery";
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
  const level = VERB_LEVELS.find((l) => l.at === Number(one(params.goal)));
  const options: ChallengeOptions = {
    verb: one(params.verb),
    tense: one(params.tense),
    set: VERB_SETS.includes(set as VerbSet) ? (set as VerbSet) : undefined,
    tenses: one(params.tenses)?.split(",").filter(Boolean),
    goal: level?.at,
  };
  const user = await getCurrentUser();
  const [cards, taught, verb] = await Promise.all([
    planVerbChallenge(user.id, options),
    getTaughtTenses(user.id),
    options.verb ? getVerbDetail(user.id, options.verb) : null,
  ]);
  if (options.verb && !verb) notFound();

  // Mastering one verb: every chosen tense, and how far each is from the goal.
  const chosen = options.tense ? [options.tense] : options.tenses;
  const goal =
    verb && level
      ? {
          at: level.at,
          name: level.name,
          tenses: verb.tenses
            .filter((t) => !chosen?.length || chosen.includes(t.tenseId))
            .map((t) => ({ tenseId: t.tenseId, nameEn: t.nameEn, correct: t.correct })),
        }
      : null;
  if (options.verb && !cards.length && !goal) notFound();

  const tenseName = TENSES.find((t) => t.id === options.tense)?.nameEn;
  const title = options.verb
    ? goal
      ? `${options.verb} → ${goal.name}`
      : tenseName
        ? `${options.verb} · ${tenseName}`
        : `${options.verb} · all tenses`
    : SET_TITLES[options.set ?? "common"];
  const backHref = options.verb ? `/verbs/${encodeURIComponent(options.verb)}` : "/verbs";
  // Keyed by its options, so changing them (the Change sheet) starts a fresh challenge.
  return <VerbChallenge key={JSON.stringify(options)} options={options} cards={cards} title={title} backHref={backHref} taught={taught} goal={goal} />;
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
