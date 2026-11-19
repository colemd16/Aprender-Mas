"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { TENSES, type TenseId } from "@/content/tenses";
import type { VerbSet } from "@/data/verbs";
import { cn } from "@/components/ui/cn";
import { VERB_LEVELS } from "@/domain/verbs/mastery";
import { levelTone, TENSE_GROUPS } from "./levels";
import { InfoIcon, TenseInfo } from "./tense-guide";

export const SETS: { id: VerbSet; label: string }[] = [
  { id: "common", label: "Most common" },
  { id: "irregular", label: "Irregular" },
  { id: "started", label: "In progress" },
  { id: "all", label: "All" },
];
const DEFAULT_TENSES = ["ind_present", "ind_preterite", "ind_imperfect", "ind_future"];
const DEFAULT_GOAL = 15; // Comfortable
const STORE = "verbs-challenge";

// A mix from a set of verbs, or one verb practiced until it reaches a goal level.
export type Choice = { mode?: "set" | "verb"; set?: VerbSet; verb?: string | null; goal?: number; tenses?: string[] };
const noSubscribe = () => () => {};
const readSaved = () => {
  try {
    return localStorage.getItem(STORE);
  } catch {
    return null;
  }
};

export type ChallengeChoice = ReturnType<typeof useChallengeChoice>;

// What a challenge practices. Remembered on this device — the Verbs screen and the
// challenge's Change sheet share it. `initial` overrides what's remembered: a verb handed
// over from its page, or the challenge being changed.
export function useChallengeChoice(initial?: Choice) {
  const savedRaw = useSyncExternalStore(noSubscribe, readSaved, () => null);
  const saved = useMemo((): Choice => {
    try {
      return JSON.parse(savedRaw ?? "{}") as Choice;
    } catch {
      return {};
    }
  }, [savedRaw]);
  const [choice, setChoice] = useState<Choice>(initial ?? {});
  const mode = choice.mode ?? saved.mode ?? "set";
  const set: VerbSet = choice.set ?? (SETS.some((s) => s.id === saved.set) ? saved.set! : "common");
  const verb = choice.verb !== undefined ? choice.verb : (saved.verb ?? null);
  const goal = choice.goal ?? (VERB_LEVELS.some((l) => l.at === saved.goal) ? saved.goal! : DEFAULT_GOAL);
  const tenses = choice.tenses ?? (saved.tenses?.length ? saved.tenses : DEFAULT_TENSES);

  const choose = (next: Choice) => {
    const merged = { mode, set, verb, goal, tenses, ...next };
    setChoice(merged);
    try {
      localStorage.setItem(STORE, JSON.stringify(merged));
    } catch {}
  };
  const query = `tenses=${tenses.join(",")}`;
  return {
    mode,
    set,
    verb,
    goal,
    tenses,
    setSet: (s: VerbSet) => choose({ mode: "set", set: s }),
    pickVerbMode: () => choose({ mode: "verb" }),
    setVerb: (v: string | null) => choose({ mode: "verb", verb: v }),
    setGoal: (g: number) => choose({ goal: g }),
    setTenses: (list: string[]) => list.length && choose({ tenses: list }),
    // At least one tense stays on.
    toggleTense: (id: string) => choose({ tenses: tenses.includes(id) ? (tenses.length > 1 ? tenses.filter((x) => x !== id) : tenses) : [...tenses, id] }),
    // Null in one-verb mode until a verb is picked.
    href: mode === "verb" ? (verb ? `/verbs/practice?verb=${encodeURIComponent(verb)}&${query}&goal=${goal}` : null) : `/verbs/practice?set=${set}&${query}`,
  };
}

const chip = (on: boolean, untaught = false) =>
  cn(
    "cursor-pointer rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-[transform,background,border-color,color] duration-200 ease-spring active:scale-95",
    untaught && "border-dashed",
    on ? "border-accent/45 bg-accent/15 text-accent-bright" : "border-white/12 bg-white/[0.03] text-fg-soft hover:border-white/25",
  );
const textButton = "cursor-pointer text-xs font-medium text-accent transition-colors hover:text-accent-bright";

export type PickableVerb = { infinitive: string; english: string; level: string | null };

// Search ignores accents and case: "oir" finds oír.
const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

// What to practice: a set of verbs or one verb (with a goal level), and which tenses.
// Tenses the journey hasn't taught yet have a dashed edge; each group's "i" opens what its
// tenses mean and when they're used. Without `verbs` there's no verb search (the verb stays as is).
export function ChallengePicker({
  choice,
  taught,
  setCounts,
  verbs,
}: {
  choice: ChallengeChoice;
  taught: TenseId[];
  setCounts?: Record<VerbSet, number>;
  verbs?: PickableVerb[];
}) {
  const { mode, set, verb, goal, tenses } = choice;
  const [search, setSearch] = useState("");
  const matches = useMemo(() => {
    const q = fold(search.trim());
    if (!q || !verbs) return [];
    // Verbs starting with the search come first.
    const hits = verbs.filter((v) => fold(v.infinitive).includes(q) || fold(v.english).includes(q));
    return hits.sort((a, b) => Number(!fold(a.infinitive).startsWith(q)) - Number(!fold(b.infinitive).startsWith(q))).slice(0, 6);
  }, [search, verbs]);
  const picked = verbs?.find((v) => v.infinitive === verb);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2.5">
        <h3 className="m-0 text-sm font-semibold">Verbs</h3>
        <div className="flex flex-wrap gap-2">
          {SETS.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={mode === "set" && set === s.id}
              onClick={() => choice.setSet(s.id)}
              className={chip(mode === "set" && set === s.id)}
            >
              {s.label}
              {setCounts && <span className="ml-1.5 font-mono text-xs opacity-70">{setCounts[s.id]}</span>}
            </button>
          ))}
          {(verbs || mode === "verb") && (
            <button type="button" aria-pressed={mode === "verb"} onClick={choice.pickVerbMode} className={chip(mode === "verb")}>
              One verb
            </button>
          )}
        </div>

        {mode === "verb" &&
          (verb ? (
            <div className="flex animate-pop items-center gap-3 rounded-[16px] border border-accent/30 bg-accent/[0.06] px-4 py-3">
              <span className="flex min-w-0 flex-1 flex-col">
                <span lang="es" className="text-[19px] font-semibold tracking-[-0.01em] text-accent-bright">
                  {verb}
                </span>
                {picked && <span className="truncate text-[13px] text-fg-muted">{picked.english}</span>}
              </span>
              {picked && <span className={cn("flex-none text-xs font-semibold", levelTone(picked.level))}>{picked.level ?? "New"}</span>}
              {verbs && (
                <button type="button" onClick={() => choice.setVerb(null)} className={textButton}>
                  Change
                </button>
              )}
            </div>
          ) : (
            verbs && (
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 transition-colors duration-200 focus-within:border-white/25">
                  <span className="sr-only">Find the verb to practice</span>
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    autoFocus
                    placeholder="Which verb? tener, to have…"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    className="h-11 min-w-0 flex-1 bg-transparent text-base text-fg outline-none placeholder:text-fg-faint"
                  />
                </label>
                {matches.length > 0 && (
                  <ul className="m-0 flex list-none flex-col gap-1 p-0">
                    {matches.map((v) => (
                      <li key={v.infinitive}>
                        <button
                          type="button"
                          onClick={() => {
                            choice.setVerb(v.infinitive);
                            setSearch("");
                          }}
                          className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.05] active:bg-white/[0.08]"
                        >
                          <span lang="es" className="text-[16px] font-semibold">
                            {v.infinitive}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-[13px] text-fg-muted">{v.english}</span>
                          <span className={cn("flex-none text-xs font-semibold", levelTone(v.level))}>{v.level ?? "New"}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {search.trim() && !matches.length && <p className="m-0 px-1 text-[13px] text-fg-muted">No verb matches “{search.trim()}”.</p>}
              </div>
            )
          ))}
      </div>

      {mode === "verb" && (
        <div className="flex flex-col gap-2.5">
          <h3 className="m-0 text-sm font-semibold">
            Goal <span className="font-normal text-fg-muted">— right answers in each tense</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            {VERB_LEVELS.map((l) => (
              <button key={l.at} type="button" aria-pressed={goal === l.at} onClick={() => choice.setGoal(l.at)} className={chip(goal === l.at)}>
                {l.name} <span className="ml-1 font-mono text-xs opacity-70">{l.at}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 className="m-0 text-sm font-semibold">Tenses</h3>
          <span className="flex flex-wrap gap-x-4 gap-y-1">
            <button type="button" onClick={() => choice.setTenses(TENSES.map((t) => t.id))} className={textButton}>
              All
            </button>
            {taught.length > 0 && (
              <button type="button" onClick={() => choice.setTenses(taught)} className={textButton}>
                Taught so far
              </button>
            )}
          </span>
        </div>
        <span className="text-xs text-fg-muted">
          <span className="mr-1 inline-block h-3 w-5 rounded-full border border-dashed border-white/40 align-middle" /> not covered in the journey yet
        </span>
        {TENSE_GROUPS.map((g) => (
          <div key={g.title} className="flex flex-col gap-2">
            <TenseInfo
              tenseIds={g.tenses.map((t) => t.id)}
              title={g.title}
              taught={taught}
              className="flex cursor-pointer items-center gap-1.5 self-start text-xs text-fg-muted transition-colors hover:text-fg"
            >
              {g.title} <InfoIcon />
            </TenseInfo>
            <div className="flex flex-wrap gap-2">
              {g.tenses.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={tenses.includes(t.id)}
                  onClick={() => choice.toggleTense(t.id)}
                  className={chip(tenses.includes(t.id), !taught.includes(t.id))}
                >
                  {t.nameEn}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
