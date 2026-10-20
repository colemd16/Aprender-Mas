import type { DiffOp } from "@/domain/grading/diff";
import { cn } from "@/components/ui/cn";

const STEP_MS = 100;
const START_MS = 250;

const opClass: Record<DiffOp["op"], string> = {
  same: "",
  delete: "animate-morph-delete overflow-hidden",
  insert: "animate-morph-insert overflow-hidden text-accent",
  accent: "animate-morph-accent text-warn",
};

// How long the morph takes, so what follows can wait for it.
export function morphDuration(ops: DiffOp[]) {
  return START_MS + ops.filter((o) => o.op !== "same").length * STEP_MS;
}

// The learner's answer turning into the corrected one, letter by letter. Screen
// readers get the corrected sentence instead of the animation.
export function Morph({ ops, corrected, className }: { ops: DiffOp[]; corrected: string; className?: string }) {
  let changed = 0;
  return (
    <p lang="es" aria-label={corrected} className={cn("m-0", className)}>
      {ops.map((o, i) => {
        const delay = o.op === "same" ? 0 : START_MS + changed++ * STEP_MS;
        return (
          <span
            key={i}
            aria-hidden="true"
            className={cn("inline-block align-bottom whitespace-pre", opClass[o.op])}
            style={delay ? { animationDelay: `${delay}ms` } : undefined}
          >
            {o.char === " " ? " " : o.char}
          </span>
        );
      })}
    </p>
  );
}
