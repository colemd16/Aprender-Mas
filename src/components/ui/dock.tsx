import type { CSSProperties, ReactNode } from "react";
import { cn } from "./cn";

// A screen's main action. On phones it's pinned above the home indicator, always in
// reach of a thumb; on larger screens it sits in the page where it's placed.
// Keep it out of animated or frosted (glass) containers: their transforms and filters
// would pin it to them instead of the screen. Screens that use it leave room at the
// bottom (pb-32 on phones) so nothing ends up hidden behind it.
export function Dock({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div
      data-dock
      style={style}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 flex animate-rise flex-col gap-2.5 bg-linear-to-t from-night from-55% to-transparent px-4 pt-10 pb-[calc(env(safe-area-inset-bottom)+14px)]",
        "sm:static sm:z-auto sm:flex-row sm:bg-none sm:p-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
