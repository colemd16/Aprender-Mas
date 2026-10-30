import Link from "next/link";
import type { JourneyStep } from "@/domain/progress/journey";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { ProgressBar } from "@/components/ui/progress-bar";

const statusText = { done: "Complete", active: "In progress", upcoming: "Up next" } as const;
const statusColor = { done: "text-ok", active: "text-accent", upcoming: "text-fg-subtle" } as const;

// A step on the journey. Completed and in-progress steps open the step page — its
// explanation, its forms and every session you've had in it. Upcoming steps are locked.
export function StepCard({ step, index, solid, sessions }: { step: JourneyStep; index: number; solid: number; sessions: number }) {
  const active = step.state === "active";
  const open = step.state !== "upcoming";

  const body = (
    <>
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-xs text-fg-muted">{step.kind === "checkpoint" ? "CHECKPOINT" : `STEP ${step.position}`}</span>
        <span className={cn("text-xs font-semibold", statusColor[step.state])}>{statusText[step.state]}</span>
      </div>
      <span lang="es" className={cn("font-semibold leading-tight tracking-[-0.02em]", active ? "text-[30px] text-fg" : "text-[19px] text-fg-soft")}>
        {step.title}
      </span>
      <span className="text-[13px] text-fg-muted">
        {step.state === "done" && sessions > 0 ? `${sessions} session${sessions === 1 ? "" : "s"} · review` : step.meta}
      </span>

      {active && (
        <div className="flex flex-wrap items-center justify-between gap-4 pt-1.5">
          {step.kind === "learn" && (
            <div className="flex min-w-[220px] flex-1 items-center gap-3.5">
              <ProgressBar value={step.skillCount ? solid / step.skillCount : 0} label="Skills solid in this step" className="flex-1" />
              <span className="font-mono text-[13px] text-fg-soft">
                {solid}/{step.skillCount} solid
              </span>
            </div>
          )}
          {/* The whole card is the link; this just looks like its button. */}
          <span className={buttonClasses({ variant: "primary" })}>
            {sessions === 0 ? "Start" : "Continue"} <span aria-hidden="true">→</span>
          </span>
        </div>
      )}
    </>
  );

  const cardClasses = cn(
    "flex h-full flex-col gap-3.5 rounded-[20px] border px-[22px] py-5 text-fg no-underline transition-[transform,border-color] duration-200 ease-spring",
    active ? "border-accent/35 bg-accent/[0.07]" : "border-white/[0.07] bg-white/[0.025]",
    open && "hover:-translate-y-[3px] hover:border-white/16",
    !open && "cursor-default",
  );

  return (
    <li className={cn("animate-rise", active && "col-span-full")} style={{ animationDelay: `${80 + index * 60}ms` }}>
      {open ? (
        <Link href={`/steps/${step.id}`} className={cardClasses}>
          {body}
        </Link>
      ) : (
        <div className={cardClasses} aria-disabled="true">
          {body}
        </div>
      )}
    </li>
  );
}
