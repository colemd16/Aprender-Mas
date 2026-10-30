import type { DiffOp } from "@/domain/grading/diff";
import { cn } from "@/components/ui/cn";

const STEP_MS = 100;
const START_MS = 250;
const NBSP = " ";

const opClass: Record<DiffOp["op"], string> = {
  same: "",
  delete: "animate-morph-delete overflow-hidden",
  insert: "animate-morph-insert overflow-hidden text-accent",
  accent: "animate-morph-accent text-note",
};

// How long the morph takes, so what follows can wait for it.
export function morphDuration(ops: DiffOp[]) {
  return START_MS + ops.filter((o) => o.op !== "same").length * STEP_MS;
}

type Letter = { op: DiffOp; delay: number };

// Groups letters into words so long sentences wrap between words, never mid-word.
// A space that's simply kept becomes a normal break point; a changed one animates.
function toWords(ops: DiffOp[]) {
  const parts: ({ kind: "word"; letters: Letter[] } | { kind: "space" })[] = [];
  let changed = 0;
  for (const op of ops) {
    const delay = op.op === "same" ? 0 : START_MS + changed++ * STEP_MS;
    if (op.char === " " && op.op === "same") {
      parts.push({ kind: "space" });
      continue;
    }
    const last = parts[parts.length - 1];
    if (last?.kind === "word") last.letters.push({ op, delay });
    else parts.push({ kind: "word", letters: [{ op, delay }] });
  }
  return parts;
}

// The learner's answer turning into the corrected one, letter by letter. Screen
// readers get the corrected sentence instead of the animation.
export function Morph({ ops, corrected, className }: { ops: DiffOp[]; corrected: string; className?: string }) {
  return (
    <p lang="es" aria-label={corrected} className={cn("m-0 min-w-0", className)}>
      {toWords(ops).map((part, i) =>
        part.kind === "space" ? (
          <span key={i} aria-hidden="true">
            {" "}
          </span>
        ) : (
          <span key={i} aria-hidden="true" className="inline-block whitespace-nowrap">
            {part.letters.map(({ op, delay }, j) => (
              <span
                key={j}
                className={cn("inline-block align-bottom whitespace-pre", opClass[op.op])}
                style={delay ? { animationDelay: `${delay}ms` } : undefined}
              >
                {op.char === " " ? NBSP : op.char}
              </span>
            ))}
          </span>
        ),
      )}
    </p>
  );
}
