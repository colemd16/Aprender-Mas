import { cn } from "./cn";

// Inherits its color from the surrounding text.
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("size-4 animate-spin rounded-full border-2 border-current/25 border-t-current", className)}
    />
  );
}
