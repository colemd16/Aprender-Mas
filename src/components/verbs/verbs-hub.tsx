"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import type { VerbListItem, VerbSet } from "@/data/verbs";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Dock } from "@/components/ui/dock";
import { ProgressRing } from "@/components/ui/progress-ring";
import { levelTone, TENSE_GROUPS } from "./levels";

const SETS: { id: VerbSet; label: string }[] = [
  { id: "common", label: "Most common" },
  { id: "irregular", label: "Irregular" },
  { id: "started", label: "In progress" },
  { id: "all", label: "All" },
];
const DEFAULT_TENSES = ["ind_present", "ind_preterite", "ind_imperfect", "ind_future"];
const PAGE = 40;
const STORE = "verbs-challenge";

type Choice = { set?: VerbSet; tenses?: string[] };
const noSubscribe = () => () => {};
const readSaved = () => {
  try {
    return localStorage.getItem(STORE);
  } catch {
    return null;
  }
};

const inSet = (v: VerbListItem, set: VerbSet) => (set === "common" ? v.common : set === "irregular" ? v.irregular : set === "started" ? v.started : true);
// Search ignores accents and case: "oir" finds oír.
const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

// The verb challenge's hub: pick a set of verbs and the tenses to drill, then start —
// or browse the verbs and open one to work through all of its tenses.
export function VerbsHub({ verbs }: { verbs: VerbListItem[] }) {
  // The last choice is remembered on this device (read once the page is in the browser).
  const savedRaw = useSyncExternalStore(noSubscribe, readSaved, () => null);
  const saved = useMemo((): Choice => {
    try {
      return JSON.parse(savedRaw ?? "{}") as Choice;
    } catch {
      return {};
    }
  }, [savedRaw]);
  const [choice, setChoice] = useState<Choice>({});
  const set: VerbSet = choice.set ?? (SETS.some((s) => s.id === saved.set) ? saved.set! : "common");
  const tenses = choice.tenses ?? (saved.tenses?.length ? saved.tenses : DEFAULT_TENSES);
  const choose = (next: Choice) => {
    const merged = { set, tenses, ...next };
    setChoice(merged);
    try {
      localStorage.setItem(STORE, JSON.stringify(merged));
    } catch {}
  };
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE);

  const pool = useMemo(() => verbs.filter((v) => inSet(v, set)), [verbs, set]);
  const listed = useMemo(
    () => (query.trim() ? verbs.filter((v) => fold(v.infinitive).includes(fold(query.trim())) || fold(v.english).includes(fold(query.trim()))) : pool),
    [verbs, pool, query],
  );
  // At least one tense stays on.
  const toggle = (id: string) => choose({ tenses: tenses.includes(id) ? (tenses.length > 1 ? tenses.filter((x) => x !== id) : tenses) : [...tenses, id] });
  const href = `/verbs/practice?set=${set}&tenses=${tenses.join(",")}`;
  const chip = (on: boolean) =>
    cn(
      "cursor-pointer rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-[transform,background,border-color,color] duration-200 ease-spring active:scale-95",
      on ? "border-accent/45 bg-accent/15 text-accent-bright" : "border-white/10 bg-white/[0.03] text-fg-soft hover:border-white/20",
    );

  const start = pool.length ? (
    <ButtonLink href={href} size="lg" className="w-full sm:w-auto">
      Start challenge · {pool.length} verb{pool.length === 1 ? "" : "s"} <span aria-hidden="true">→</span>
    </ButtonLink>
  ) : (
    <span className="block rounded-2xl bg-night/80 px-4 py-3 text-center text-sm text-fg-muted sm:text-left">
      No verbs in progress yet — start with the most common.
    </span>
  );

  return (
    <>
      <section aria-label="Start a challenge" className="glass-subtle flex animate-rise flex-col gap-5 rounded-[22px] p-4 [animation-delay:80ms] sm:p-6">
        <div className="flex flex-col gap-2.5">
          <h2 className="m-0 text-sm font-semibold">Verbs</h2>
          <div className="flex flex-wrap gap-2">
            {SETS.map((s) => (
              <button key={s.id} type="button" aria-pressed={set === s.id} onClick={() => choose({ set: s.id })} className={chip(set === s.id)}>
                {s.label} <span className="font-mono text-xs opacity-70">{verbs.filter((v) => inSet(v, s.id)).length}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <h2 className="m-0 text-sm font-semibold">Tenses</h2>
          {TENSE_GROUPS.map((g) => (
            <div key={g.title} className="flex flex-col gap-2">
              <span className="text-xs text-fg-muted">{g.title}</span>
              <div className="flex flex-wrap gap-2">
                {g.tenses.map((t) => (
                  <button key={t.id} type="button" aria-pressed={tenses.includes(t.id)} onClick={() => toggle(t.id)} className={chip(tenses.includes(t.id))}>
                    {t.nameEn}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="hidden sm:block">{start}</div>
      </section>

      <section aria-label="Verb library" className="flex animate-rise flex-col gap-3 [animation-delay:160ms]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="m-0 text-sm font-semibold">
            {query.trim() ? `Matching “${query.trim()}”` : SETS.find((s) => s.id === set)!.label}{" "}
            <span className="font-mono text-xs font-normal text-fg-muted">{listed.length}</span>
          </h2>
          <label className="flex w-full items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 transition-colors duration-200 focus-within:border-white/25 sm:w-72">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
              className="text-fg-subtle"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <span className="sr-only">Find a verb</span>
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShown(PAGE);
              }}
              placeholder="Find a verb — tener, to have…"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="h-11 min-w-0 flex-1 bg-transparent text-base text-fg outline-none placeholder:text-fg-faint"
            />
          </label>
        </div>
        <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
          {listed.slice(0, shown).map((v) => (
            <li key={v.infinitive}>
              <Link
                href={`/verbs/${encodeURIComponent(v.infinitive)}`}
                className="glass-subtle flex items-center gap-3 rounded-[16px] px-4 py-3 text-fg no-underline transition-[transform,border-color] duration-200 ease-spring hover:-translate-y-0.5 hover:border-white/16 active:scale-[0.98]"
              >
                <ProgressRing value={v.share} size={30} stroke={4} color={v.level === "Mastered" ? "var(--color-ok)" : "var(--color-accent)"} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span lang="es" className="text-[17px] font-semibold tracking-[-0.01em]">
                    {v.infinitive}
                  </span>
                  <span className="truncate text-[13px] text-fg-muted">{v.english}</span>
                </span>
                <span className={cn("flex-none text-xs font-semibold", levelTone(v.level))}>{v.level ?? "New"}</span>
              </Link>
            </li>
          ))}
        </ul>
        {listed.length > shown && (
          <button
            type="button"
            onClick={() => setShown((n) => n + PAGE)}
            className="cursor-pointer self-center rounded-full border border-white/10 px-4 py-2 text-sm text-fg-soft transition-colors hover:text-fg"
          >
            Show more
          </button>
        )}
      </section>

      {/* On phones Start is pinned to the bottom; kept out of the animated, frosted card above. */}
      <Dock className="[animation-delay:200ms] sm:hidden">{start}</Dock>
    </>
  );
}
