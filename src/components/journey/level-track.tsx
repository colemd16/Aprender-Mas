import Link from "next/link";
import type { JourneyLevel } from "@/domain/progress/journey";
import { cn } from "@/components/ui/cn";

const nodeStyles = {
  done: "bg-accent text-night",
  current: "border-2 border-accent bg-night text-accent-bright animate-glow-pulse",
  locked: "border border-white/10 bg-white/[0.04] text-fg-subtle",
} as const;

const stateLabel = { done: "complete", current: "in progress", locked: "locked" } as const;

// The lit track of levels across the top of the journey. Unlocked levels can be
// opened to see (and review) their steps.
export function LevelTrack({ levels, viewedId }: { levels: JourneyLevel[]; viewedId: number }) {
  return (
    <div className="overflow-x-auto px-1 pt-2 pb-1">
      <ol aria-label="Levels" className="m-0 grid list-none p-0 sm:min-w-[760px]" style={{ gridTemplateColumns: `repeat(${levels.length}, minmax(0, 1fr))` }}>
        {levels.map((level, i) => {
          const isLast = i === levels.length - 1;
          const viewed = level.id === viewedId;
          const node = (
            <>
              <span
                className={cn(
                  "relative flex size-8 items-center justify-center rounded-full font-mono text-[13px] font-medium transition-transform duration-200 ease-spring",
                  nodeStyles[level.state],
                  viewed && level.state === "done" && "ring-2 ring-accent-bright ring-offset-4 ring-offset-night",
                  level.state !== "locked" && "group-hover:scale-110",
                )}
              >
                {level.id}
              </span>
              <span className={cn("hidden max-w-[100px] text-xs leading-tight sm:block", level.state === "locked" ? "text-fg-subtle" : viewed ? "text-fg" : "text-fg-soft")}>
                {level.title}
              </span>
            </>
          );
          return (
            <li key={level.id} className="relative flex flex-col items-center text-center">
              {!isLast && (
                <span aria-hidden="true" className={cn("absolute top-[15px] left-1/2 h-0.5 w-full", level.state === "done" ? "bg-accent" : "bg-white/[0.08]")} />
              )}
              {level.state === "locked" ? (
                <span aria-label={`Level ${level.id}, locked`} className="flex flex-col items-center gap-3">
                  {node}
                </span>
              ) : (
                <Link
                  href={level.state === "current" ? "/" : `/?level=${level.id}`}
                  aria-label={`Level ${level.id}, ${stateLabel[level.state]}`}
                  aria-current={viewed ? "page" : undefined}
                  className="group relative flex flex-col items-center gap-3 rounded-xl text-fg no-underline"
                >
                  {node}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
