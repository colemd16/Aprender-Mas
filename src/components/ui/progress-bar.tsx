import { cn } from "./cn";

// A thin glowing bar. `value` is a fraction from 0 to 1.
export function ProgressBar({ value, label, className }: { value: number; label: string; className?: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-1.5 overflow-hidden rounded-full bg-white/[0.08]", className)}
    >
      <div
        className="h-full rounded-full bg-linear-to-r from-[#e0a800] to-accent shadow-[0_0_12px_rgb(252_209_22/0.5)] transition-[width] duration-700 ease-out-expo"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
