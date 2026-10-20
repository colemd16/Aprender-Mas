import type { JourneyLevel } from "@/domain/progress/journey";
import { cn } from "@/components/ui/cn";

const nodeStyles = {
  done: "bg-accent text-night",
  current: "border-2 border-accent bg-night text-accent-bright animate-glow-pulse",
  locked: "border border-white/10 bg-white/[0.04] text-fg-subtle",
} as const;

const stateLabel = { done: "complete", current: "in progress", locked: "locked" } as const;

// The lit track of levels across the top of the journey.
export function LevelTrack({ levels }: { levels: JourneyLevel[] }) {
  return (
    <div className="overflow-x-auto px-1 pt-2 pb-1">
      <ol aria-label="Levels" className="m-0 grid list-none p-0 sm:min-w-[760px]" style={{ gridTemplateColumns: `repeat(${levels.length}, minmax(0, 1fr))` }}>
        {levels.map((level, i) => {
          const isLast = i === levels.length - 1;
          return (
            <li key={level.id} className="relative flex flex-col items-center gap-3 text-center">
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={cn("absolute top-[15px] left-1/2 h-0.5 w-full", level.state === "done" ? "bg-accent" : "bg-white/[0.08]")}
                />
              )}
              <span
                aria-label={`Level ${level.id}, ${stateLabel[level.state]}`}
                className={cn("relative flex size-8 items-center justify-center rounded-full font-mono text-[13px] font-medium", nodeStyles[level.state])}
              >
                {level.id}
              </span>
              <span className={cn("hidden max-w-[100px] text-xs leading-tight sm:block", level.state === "locked" ? "text-fg-subtle" : "text-fg-soft")}>
                {level.title}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
