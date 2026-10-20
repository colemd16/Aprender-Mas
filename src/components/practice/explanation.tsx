import { cn } from "@/components/ui/cn";

// Feedback text marks Spanish with *asterisks*; it's shown highlighted and tagged as Spanish.
export function Explanation({ text, className }: { text: string; className?: string }) {
  return (
    <p className={cn("m-0 text-[15px] leading-relaxed whitespace-pre-line text-fg-soft", className)}>
      {text.split(/(\*[^*\n]+\*)/).map((part, i) =>
        part.length > 2 && part.startsWith("*") && part.endsWith("*") ? (
          <em key={i} lang="es" className="text-fg not-italic">
            {part.slice(1, -1)}
          </em>
        ) : (
          part
        ),
      )}
    </p>
  );
}
