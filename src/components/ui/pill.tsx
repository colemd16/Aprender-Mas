import type { ReactNode } from "react";
import { cn } from "./cn";

type Tone = "neutral" | "accent" | "ok" | "note" | "bad";

const tones: Record<Tone, string> = {
  neutral: "bg-white/[0.04] border border-white/[0.08] text-fg-soft",
  accent: "bg-accent/12 text-accent-bright",
  ok: "bg-ok/12 text-ok",
  note: "bg-note/12 text-note",
  bad: "bg-bad/12 text-bad",
};

export function Pill({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-medium", tones[tone], className)}>
      {children}
    </span>
  );
}

// A small glowing status dot, colored by its text color: <Dot className="text-bad" />.
export function Dot({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("size-2 flex-none rounded-full bg-current glow-dot", className)} />;
}
