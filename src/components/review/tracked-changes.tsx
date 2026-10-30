import type { DiffOp } from "@/domain/grading/diff";
import { cn } from "@/components/ui/cn";

const style: Record<DiffOp["op"], string> = {
  same: "",
  delete: "text-bad line-through decoration-bad/70 decoration-2",
  insert: "text-accent-bright underline decoration-accent/60 decoration-2 underline-offset-4",
  accent: "text-note underline decoration-note/60 decoration-2 underline-offset-4",
};

// The correction as tracked changes, still: removed letters struck through in red,
// added ones underlined in yellow, accent fixes in blue. Screen readers get the
// corrected sentence.
export function TrackedChanges({ ops, corrected, className }: { ops: DiffOp[]; corrected: string; className?: string }) {
  // Consecutive letters with the same change are grouped so the lines read as words.
  const runs: { op: DiffOp["op"]; text: string }[] = [];
  for (const o of ops) {
    const last = runs[runs.length - 1];
    if (last?.op === o.op) last.text += o.char;
    else runs.push({ op: o.op, text: o.char });
  }
  return (
    <p lang="es" aria-label={corrected} className={cn("m-0", className)}>
      {runs.map((r, i) => (
        <span key={i} aria-hidden="true" className={style[r.op]}>
          {r.text}
        </span>
      ))}
    </p>
  );
}
