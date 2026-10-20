import type { FormTable } from "@/domain/curriculum/form-tables";
import { cn } from "@/components/ui/cn";
import { Dot } from "@/components/ui/pill";

// One tense's forms as a table. Cells fade in row by row; irregular forms glow.
export function FormsTable({ table, delay = 0 }: { table: FormTable; delay?: number }) {
  return (
    <section aria-label={`${table.title} forms`} className="glass flex flex-col gap-4 rounded-[22px] p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="m-0 text-sm font-semibold">{table.title}</h2>
        <span className="text-[13px] text-fg-muted">{table.example}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[320px] table-fixed border-collapse">
          <colgroup>
            <col className="w-[28%]" />
          </colgroup>
          <thead>
            <tr>
              <td />
              {table.columns.map((c) => (
                <th key={c} scope="col" lang="es" className="py-2 pr-2 text-left font-mono text-[13px] font-normal text-fg-muted">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, r) => (
              <tr key={row.label} className="border-t border-white/[0.06]">
                <th scope="row" lang="es" className="py-2.5 pr-2 text-left align-top text-sm font-normal text-fg-muted">
                  <div className="animate-cell-in" style={{ animationDelay: `${delay + 250 + r * 80}ms` }}>
                    {row.label}
                  </div>
                </th>
                {row.cells.map((cell, c) => (
                  <td key={c} lang="es" className="py-2.5 pr-2 align-top">
                    <div
                      className={cn("flex animate-cell-in flex-col gap-0.5 text-lg font-medium", cell?.irregular && "glow-text")}
                      style={{ animationDelay: `${delay + 300 + r * 80 + c * 50}ms` }}
                    >
                      {cell ? cell.form : <span className="text-fg-faint">—</span>}
                      {cell && cell.alternates.length > 0 && (
                        <span className="text-xs font-normal text-fg-subtle [text-shadow:none]">also {cell.alternates.join(", ")}</span>
                      )}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {table.hasIrregular && (
        <span className="inline-flex items-center gap-2 text-[13px] text-fg-muted">
          <Dot className="text-accent" />
          Irregular
        </span>
      )}
    </section>
  );
}
