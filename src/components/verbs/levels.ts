import { TENSES } from "@/content/tenses";

// Text color for a verb challenge level (null: not started).
export function levelTone(level: string | null) {
  if (level === "Mastered") return "text-ok";
  if (level === "Strong" || level === "Comfortable") return "text-accent";
  if (level) return "text-fg-soft";
  return "text-fg-subtle";
}

// Tenses grouped the way they're usually learned.
export const TENSE_GROUPS: { title: string; tenses: (typeof TENSES)[number][] }[] = [
  { title: "Indicative", tenses: TENSES.filter((t) => t.mood === "indicative" && t.kind === "simple") },
  { title: "Progressive & going to", tenses: TENSES.filter((t) => t.kind === "periphrastic") },
  { title: "Perfect", tenses: TENSES.filter((t) => t.mood === "indicative" && t.kind === "compound") },
  { title: "Subjunctive", tenses: TENSES.filter((t) => t.mood === "subjunctive") },
  { title: "Commands", tenses: TENSES.filter((t) => t.mood === "imperative") },
];
