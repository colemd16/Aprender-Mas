import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import type { UpNext } from "@/data/practice";

// The way forward, front and centre once a step (or a checkpoint) is behind you. It opens
// the step's intro — its explanation and forms — where practice starts.
export function UpNextCard({ next, delay = 420 }: { next: UpNext; delay?: number }) {
  const checkpoint = next.kind === "checkpoint";
  return (
    <Link
      href={`/steps/${next.id}`}
      style={{ animationDelay: `${delay}ms` }}
      className="flex animate-rise flex-col gap-3 rounded-[22px] border border-accent/35 bg-accent/[0.07] p-5 text-fg no-underline shadow-[0_0_48px_rgb(252_209_22/0.08)] transition-[transform,border-color] duration-200 ease-spring hover:-translate-y-[3px] hover:border-accent/60 active:scale-[0.98] sm:gap-4 sm:p-6"
    >
      <span className="font-mono text-xs tracking-[0.06em] text-accent">
        UP NEXT · LEVEL {next.levelId} · {checkpoint ? "CHECKPOINT" : `STEP ${next.position}`}
      </span>
      <span lang="es" className="text-[28px] leading-[1.08] font-semibold tracking-[-0.03em] sm:text-[34px]">
        {next.title}
      </span>
      <span className={buttonClasses({ variant: "primary", size: "lg", className: "mt-1 w-full sm:w-auto sm:self-start" })}>
        {checkpoint ? "Take the checkpoint" : "Start this step"} <span aria-hidden="true">→</span>
      </span>
    </Link>
  );
}
