import type { JourneyStep } from "@/domain/progress/journey";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { ProgressBar } from "@/components/ui/progress-bar";

const statusText = { done: "Complete", active: "In progress", upcoming: "Up next" } as const;
const statusColor = { done: "text-ok", active: "text-accent", upcoming: "text-fg-subtle" } as const;

export function StepCard({ step, index, solid }: { step: JourneyStep; index: number; solid: number }) {
  const active = step.state === "active";
  return (
    <li
      className={cn(
        "flex animate-rise flex-col gap-3.5 rounded-[20px] border px-[22px] py-5 transition-[transform,border-color] duration-200 ease-spring hover:-translate-y-[3px]",
        active ? "col-span-full border-accent/35 bg-accent/[0.07]" : "border-white/[0.07] bg-white/[0.025] hover:border-white/16",
      )}
      style={{ animationDelay: `${80 + index * 60}ms` }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-xs text-fg-muted">{step.kind === "checkpoint" ? "CHECKPOINT" : `STEP ${step.position}`}</span>
        <span className={cn("text-xs font-semibold", statusColor[step.state])}>{statusText[step.state]}</span>
      </div>
      <span lang="es" className={cn("font-semibold leading-tight tracking-[-0.02em]", active ? "text-[30px] text-fg" : "text-[19px] text-fg-soft")}>
        {step.title}
      </span>
      <span className="text-[13px] text-fg-muted">{step.meta}</span>

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
          <ButtonLink href={`/steps/${step.id}`} variant="primary">
            {solid === 0 ? "Start" : "Continue"} <span aria-hidden="true">→</span>
          </ButtonLink>
        </div>
      )}
    </li>
  );
}
