"use client";

import { useState } from "react";
import type { ReviewedAttempt } from "@/data/history";
import { cn } from "@/components/ui/cn";
import { AttemptCard } from "./attempt-card";

const FILTERS = [
  { id: "all", label: "All", test: () => true },
  { id: "missed", label: "Missed", test: (a: ReviewedAttempt) => a.verdict === "incorrect" },
  { id: "right", label: "Right", test: (a: ReviewedAttempt) => a.verdict !== "incorrect" },
  { id: "asked", label: "Questions", test: (a: ReviewedAttempt) => a.followUps.length > 0 },
] as const;

export function ReviewList({ attempts }: { attempts: ReviewedAttempt[] }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const active = FILTERS.find((f) => f.id === filter)!;
  // Numbers stay those of the session, so "07" is always the seventh question.
  const shown = attempts.map((a, i) => ({ a, n: i + 1 })).filter(({ a }) => active.test(a));

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Show" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const count = attempts.filter(f.test).length;
          if (f.id === "asked" && count === 0) return null;
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border px-4 text-[13px] font-medium transition-colors duration-200",
                filter === f.id ? "border-accent/40 bg-accent/12 text-accent-bright" : "border-white/[0.08] bg-white/[0.03] text-fg-soft hover:text-fg",
              )}
            >
              {f.label}
              <span className="font-mono text-xs opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {shown.length ? (
        shown.map(({ a, n }, i) => (
          <div key={a.id} className="animate-rise" style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}>
            <AttemptCard attempt={a} number={n} />
          </div>
        ))
      ) : (
        <p className="m-0 rounded-[22px] bg-white/[0.03] p-6 text-fg-muted">{filter === "missed" ? "Nothing missed in this session." : "Nothing to show here."}</p>
      )}
    </div>
  );
}
