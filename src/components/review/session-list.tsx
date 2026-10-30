"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import type { SessionListItem } from "@/data/history";
import { ProgressRing } from "@/components/ui/progress-ring";

const subscribe = () => () => {};

export type SessionRow = Omit<SessionListItem, "startedAt" | "lastAnswerAt"> & { startedAt: string; lastAnswerAt: string };

// Sessions as rows that open their review. Dates are shown in the viewer's own time
// zone — so this renders in the browser, after the page arrives.
export function SessionList({ sessions }: { sessions: SessionRow[] }) {
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  if (!ready) return <div aria-busy="true" className="h-[72px] animate-pulse rounded-[18px] bg-white/[0.03]" />;
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {sessions.map((s) => (
        <li key={s.id}>
          <SessionRowLink session={s} />
        </li>
      ))}
    </ul>
  );
}

function SessionRowLink({ session: s }: { session: SessionRow }) {
  const start = new Date(s.startedAt);
  const share = s.answered ? s.correct / s.answered : 0;
  const minutes = Math.max(1, Math.round((new Date(s.lastAnswerAt).getTime() - start.getTime()) / 60_000));
  const sameYear = start.getFullYear() === new Date().getFullYear();
  return (
    <Link
      href={`/sessions/${s.id}`}
      className="glass-subtle flex items-center gap-4 rounded-[18px] px-5 py-4 text-fg no-underline transition-[transform,border-color] duration-200 ease-spring hover:-translate-y-0.5 hover:border-white/16 active:scale-[0.98]"
    >
      <ProgressRing value={share} size={36} stroke={4} color={share >= 0.85 ? "var(--color-ok)" : "var(--color-accent)"} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[15px] font-semibold">
          {start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: sameYear ? undefined : "numeric" })}
          <span className="font-normal text-fg-muted"> · {start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</span>
        </span>
        <span className="text-[13px] text-fg-muted">
          {minutes} min · {s.correct} of {s.answered} right
        </span>
      </div>
      <span className="font-mono text-sm text-fg-soft">{Math.round(share * 100)}%</span>
      <span aria-hidden="true" className="text-fg-subtle">
        →
      </span>
    </Link>
  );
}
