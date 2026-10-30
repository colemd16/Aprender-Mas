import { Dot } from "@/components/ui/pill";
import { ProgressBar } from "@/components/ui/progress-bar";

export type SkillProgressItem = { id: string; title: string; needed: number; solid: boolean };

// How far a step is from complete — and exactly which skills still need answers.
export function SkillProgress({ skills, className }: { skills: SkillProgressItem[]; className?: string }) {
  const solid = skills.filter((s) => s.solid).length;
  const left = skills.filter((s) => !s.solid);

  return (
    <section aria-label="Progress in this step" className={`glass-subtle flex flex-col gap-3.5 rounded-[20px] p-5 sm:p-[22px] ${className ?? ""}`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="m-0 text-sm font-semibold">{left.length ? `${left.length} skill${left.length === 1 ? "" : "s"} left` : "Every skill is solid"}</h2>
        <span className="font-mono text-xs text-fg-muted">
          {solid}/{skills.length} solid
        </span>
      </div>
      <ProgressBar value={skills.length ? solid / skills.length : 0} label="Skills solid in this step" />
      {left.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {left.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 text-[15px]">
              <span className="flex min-w-0 items-center gap-2.5 text-fg-soft">
                <Dot className="text-accent" />
                <span lang="es" className="truncate">
                  {s.title}
                </span>
              </span>
              <span className="flex-none text-[13px] text-fg-muted">
                {s.needed} more<span className="hidden min-[400px]:inline"> correct</span>
                {s.needed > 1 ? " in a row" : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="m-0 text-[13px] text-fg-subtle">A skill is solid after 3 correct answers, the last 2 in a row.</p>
    </section>
  );
}
