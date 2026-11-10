import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Dock } from "@/components/ui/dock";
import { Dot } from "@/components/ui/pill";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ProgressRing } from "@/components/ui/progress-ring";
import { BackLink, TopBar } from "@/components/ui/top-bar";
import { Wordmark } from "@/components/ui/wordmark";
import { levelTone, TENSE_GROUPS } from "@/components/verbs/levels";
import { InfoIcon, TenseInfo } from "@/components/verbs/tense-guide";
import { getTaughtTenses, getVerbDetail } from "@/data/verbs";
import { MASTERED, nextLevel } from "@/domain/verbs/mastery";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Verb · Aprender Más" };

export default function VerbPage({ params }: PageProps<"/verbs/[verb]">) {
  return (
    <div className="spotlight flex min-h-app flex-col">
      <TopBar>
        <BackLink href="/verbs">Verbs</BackLink>
        <Wordmark />
      </TopBar>
      <Suspense fallback={<VerbSkeleton />}>
        <Verb params={params} />
      </Suspense>
    </div>
  );
}

const decode = (s: string) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

async function Verb({ params }: { params: PageProps<"/verbs/[verb]">["params"] }) {
  const infinitive = decode((await params).verb);
  const user = await getCurrentUser();
  const [verb, taught] = await Promise.all([getVerbDetail(user.id, infinitive), getTaughtTenses(user.id)]);
  if (!verb) notFound();
  const byId = new Map(verb.tenses.map((t) => [t.tenseId, t]));
  const weakest = verb.tenses.reduce((a, b) => (b.correct < a.correct ? b : a));
  const practice = (tense?: string) => `/verbs/practice?verb=${encodeURIComponent(verb.infinitive)}${tense ? `&tense=${tense}` : ""}`;

  return (
    <main className="mx-auto flex w-full max-w-[880px] flex-col gap-6 px-4 pt-5 pb-32 sm:gap-8 sm:px-8 sm:pt-8 sm:pb-14">
      <div className="flex animate-rise flex-wrap items-center gap-5 sm:gap-7">
        <div className="relative size-[104px] flex-none">
          <ProgressRing value={verb.share} size={104} stroke={9} color={verb.level === "Mastered" ? "var(--color-ok)" : "var(--color-accent)"} />
          <span className="absolute inset-0 flex items-center justify-center text-[24px] font-semibold tracking-[-0.03em]">
            {Math.round(verb.share * 100)}%
          </span>
        </div>
        <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-1.5">
          <span className={cn("font-mono text-xs tracking-[0.06em] uppercase", levelTone(verb.level))}>
            {verb.level ?? "Not started"}
            {verb.irregular && <span className="text-fg-muted"> · irregular</span>}
          </span>
          <h1 lang="es" className="m-0 text-[40px] leading-none font-semibold tracking-[-0.04em] sm:text-[56px]">
            {verb.infinitive}
          </h1>
          <p className="m-0 text-[15px] text-fg-muted">{verb.english}</p>
        </div>
      </div>

      <p className="m-0 -mt-2 animate-rise text-[15px] text-fg-soft [animation-delay:60ms]">
        {verb.level === "Mastered" ? (
          "Mastered — 50 right in every tense. Keep it sharp whenever you like."
        ) : (
          <>
            Weakest tense: <span className="text-fg">{weakest.nameEn}</span> · {weakest.correct}/{nextLevel(weakest.correct)?.at ?? MASTERED}. Practicing the
            whole verb works on the weakest tenses first.
          </>
        )}
      </p>

      {TENSE_GROUPS.map((g, gi) => {
        const rows = g.tenses.flatMap((t) => (byId.has(t.id) ? [byId.get(t.id)!] : []));
        if (!rows.length) return null;
        return (
          <section key={g.title} aria-label={g.title} className="flex animate-rise flex-col gap-2" style={{ animationDelay: `${100 + gi * 60}ms` }}>
            <h2 className="m-0 text-sm font-semibold">
              <TenseInfo
                tenseIds={rows.map((t) => t.tenseId)}
                title={g.title}
                taught={taught}
                className="flex cursor-pointer items-center gap-1.5 transition-colors hover:text-accent-bright"
              >
                {g.title} <span className="text-fg-muted">{<InfoIcon />}</span>
              </TenseInfo>
            </h2>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {rows.map((t) => {
                const next = nextLevel(t.correct);
                return (
                  <li key={t.tenseId}>
                    <Link
                      href={practice(t.tenseId)}
                      className="glass-subtle flex flex-col gap-2.5 rounded-[16px] px-4 py-3.5 text-fg no-underline transition-[transform,border-color] duration-200 ease-spring hover:-translate-y-0.5 hover:border-white/16 active:scale-[0.98]"
                    >
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="flex min-w-0 items-center gap-2">
                          {t.irregular && <Dot className="text-accent" />}
                          <span className="truncate text-[15px] font-semibold">{t.nameEn}</span>
                          <span lang="es" className="hidden truncate text-[13px] text-fg-muted min-[420px]:inline">
                            {t.nameEs}
                          </span>
                        </span>
                        <span className="flex-none font-mono text-xs text-fg-muted">
                          <span className={levelTone(t.level)}>{t.level ?? "New"}</span> · {t.correct}
                          {next ? `/${next.at}` : ""}
                        </span>
                      </span>
                      <span className="-mt-1.5 truncate text-[13px] text-fg-muted">“{t.meaning}”</span>
                      <ProgressBar value={t.correct / MASTERED} label={`${t.nameEn}: ${t.correct} of ${MASTERED} right`} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {verb.irregular && (
        <span className="inline-flex items-center gap-2 text-[13px] text-fg-muted">
          <Dot className="text-accent" />
          Irregular in this tense
        </span>
      )}

      <Dock className="[animation-delay:200ms]">
        <ButtonLink href={practice()} size="lg" className="w-full sm:w-auto">
          Practice{" "}
          <span lang="es" className="min-w-0 truncate">
            {verb.infinitive}
          </span>{" "}
          · all tenses <span aria-hidden="true">→</span>
        </ButtonLink>
      </Dock>
    </main>
  );
}

function VerbSkeleton() {
  return (
    <main aria-busy="true" aria-label="Loading verb" className="mx-auto flex w-full max-w-[880px] flex-col gap-4 px-4 pt-5 sm:px-8 sm:pt-8">
      <div className="h-[104px] animate-pulse rounded-[22px] bg-white/[0.04]" />
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="h-[66px] animate-pulse rounded-[16px] bg-white/[0.03]" />
      ))}
    </main>
  );
}
