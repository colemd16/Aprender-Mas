"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { LEVELS } from "@/content/curriculum";
import { TENSE_GUIDES } from "@/content/tense-guides";
import { TENSES, type TenseId } from "@/content/tenses";
import { Dot } from "@/components/ui/pill";
import { Sheet } from "@/components/ui/sheet";

const TENSE = new Map<string, (typeof TENSES)[number]>(TENSES.map((t) => [t.id, t]));

// The journey step that first teaches a tense, if one does.
function stepTeaching(tenseId: string) {
  for (const level of LEVELS)
    for (const step of level.steps) if (step.forms?.tenses.some((t) => t === tenseId)) return { id: step.id, title: step.title, level: level.number };
  return null;
}

// When a tense is used, its signal words, how it's built and an example — plus, for a
// card, what this exact form means, and whether the journey has covered the tense yet.
export function TenseGuide({ tenseId, meaning, taught }: { tenseId: TenseId; meaning?: string; taught?: TenseId[] }) {
  const tense = TENSE.get(tenseId);
  const guide = TENSE_GUIDES[tenseId];
  if (!tense || !guide) return null;
  const step = stepTeaching(tenseId);
  const covered = taught?.includes(tenseId);

  return (
    <section aria-label={tense.nameEn} className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-1">
        <h3 className="m-0 text-[17px] font-semibold">
          {tense.nameEn}{" "}
          <span lang="es" className="font-normal text-fg-muted">
            · {tense.nameEs}
          </span>
        </h3>
        {meaning && <p className="m-0 text-[15px] text-accent-bright">“{meaning}”</p>}
      </div>

      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {guide.when.map((w) => (
          <li key={w} className="flex gap-2.5 text-[15px] leading-relaxed text-fg-soft">
            <Dot className="mt-2 text-accent" />
            <span>{w}</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-1.5">
        {guide.signals.map((s) => (
          <span key={s} lang="es" className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[13px] text-fg-soft">
            {s}
          </span>
        ))}
      </div>

      <div className="flex flex-col gap-1 rounded-[16px] bg-white/[0.03] p-4">
        <span className="text-xs font-semibold tracking-[0.04em] text-fg-muted uppercase">How it&apos;s built</span>
        <p className="m-0 text-[14px] leading-relaxed text-fg-soft">{guide.build}</p>
      </div>

      <div className="flex flex-col gap-0.5 border-l-2 border-accent/50 pl-3.5">
        <p lang="es" className="m-0 text-[16px] font-medium">
          {guide.example.es}
        </p>
        <p className="m-0 text-[14px] text-fg-muted">{guide.example.en}</p>
      </div>

      {taught && (
        <p className="m-0 text-[13px] text-fg-muted">
          {step ? (
            <>
              {covered ? "Covered in the journey: " : "Not covered in the journey yet — it's taught in "}
              <Link href={`/steps/${step.id}`} className="text-accent no-underline hover:text-accent-bright">
                Level {step.level} · {step.title}
              </Link>
            </>
          ) : (
            "Not part of the journey's steps — this challenge is the place to learn it."
          )}
        </p>
      )}
    </section>
  );
}

// A button that opens the guide for one tense, or for a group of them.
export function TenseInfo({
  tenseIds,
  title,
  meaning,
  taught,
  className,
  children,
  onOpenChange,
}: {
  tenseIds: TenseId[];
  title: ReactNode;
  meaning?: string;
  taught?: TenseId[];
  className?: string;
  children: ReactNode;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const set = (value: boolean) => {
    setOpen(value);
    onOpenChange?.(value);
  };
  return (
    <>
      <button type="button" onClick={() => set(true)} className={className}>
        {children}
      </button>
      <Sheet open={open} onClose={() => set(false)} title={title}>
        <div className="flex flex-col gap-7">
          {tenseIds.map((id) => (
            <TenseGuide key={id} tenseId={id} meaning={tenseIds.length === 1 ? meaning : undefined} taught={taught} />
          ))}
        </div>
      </Sheet>
    </>
  );
}

// The small "i" used next to tense names and group titles.
export function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </svg>
  );
}
