"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import type { TenseId } from "@/content/tenses";
import type { VerbSet } from "@/data/verbs";
import { cn } from "@/components/ui/cn";
import { TENSE_GROUPS } from "./levels";
import { InfoIcon, TenseInfo } from "./tense-guide";

export const SETS: { id: VerbSet; label: string }[] = [
  { id: "common", label: "Most common" },
  { id: "irregular", label: "Irregular" },
  { id: "started", label: "In progress" },
  { id: "all", label: "All" },
];
const DEFAULT_TENSES = ["ind_present", "ind_preterite", "ind_imperfect", "ind_future"];
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

// Which verbs and tenses a mixed challenge uses. Remembered on this device — the Verbs
// screen and the challenge's Change sheet share it.
export function useChallengeChoice() {
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
  // At least one tense stays on.
  const toggleTense = (id: string) => choose({ tenses: tenses.includes(id) ? (tenses.length > 1 ? tenses.filter((x) => x !== id) : tenses) : [...tenses, id] });
  return { set, tenses, setSet: (s: VerbSet) => choose({ set: s }), toggleTense, href: `/verbs/practice?set=${set}&tenses=${tenses.join(",")}` };
}

const chip = (on: boolean, untaught = false) =>
  cn(
    "cursor-pointer rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-[transform,background,border-color,color] duration-200 ease-spring active:scale-95",
    untaught && "border-dashed",
    on ? "border-accent/45 bg-accent/15 text-accent-bright" : "border-white/12 bg-white/[0.03] text-fg-soft hover:border-white/25",
  );

// The verb set and tense chips. Tenses the journey hasn't taught yet have a dashed edge;
// each group's "i" opens what its tenses mean and when they're used.
export function ChallengePicker({
  set,
  tenses,
  onSet,
  onToggle,
  taught,
  setCounts,
}: {
  set: VerbSet;
  tenses: string[];
  onSet: (s: VerbSet) => void;
  onToggle: (id: string) => void;
  taught: TenseId[];
  setCounts?: Record<VerbSet, number>;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2.5">
        <h3 className="m-0 text-sm font-semibold">Verbs</h3>
        <div className="flex flex-wrap gap-2">
          {SETS.map((s) => (
            <button key={s.id} type="button" aria-pressed={set === s.id} onClick={() => onSet(s.id)} className={chip(set === s.id)}>
              {s.label}
              {setCounts && <span className="ml-1.5 font-mono text-xs opacity-70">{setCounts[s.id]}</span>}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 className="m-0 text-sm font-semibold">Tenses</h3>
          <span className="text-xs text-fg-muted">
            <span className="mr-1 inline-block h-3 w-5 rounded-full border border-dashed border-white/40 align-middle" /> not covered in the journey yet
          </span>
        </div>
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
                  onClick={() => onToggle(t.id)}
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
