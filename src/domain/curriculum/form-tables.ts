import { IMPERATIVE_PERSON_LABELS, PERSONS, PERSON_LABELS, type Person } from "@/content/persons";

export type FormRow = {
  infinitive: string;
  tenseId: string;
  tenseName: string;
  tenseExample: string;
  mood: "indicative" | "subjunctive" | "imperative";
  tensePosition: number;
  person: Person;
  form: string;
  alternates: string[];
  isIrregular: boolean;
};

export type FormCell = { form: string; alternates: string[]; irregular: boolean } | null;

export type FormTable = {
  tenseId: string;
  title: string;
  example: string;
  columns: string[];
  rows: { label: string; cells: FormCell[] }[];
  hasIrregular: boolean;
};

// Groups a step's forms into one table per tense: verbs across, persons down.
// When a step teaches more verbs than persons (e.g. 8 irregular tú commands), the
// table flips so it stays narrow enough to read.
export function buildFormTables(rows: FormRow[], verbOrder: string[]): FormTable[] {
  const byTense = new Map<string, FormRow[]>();
  for (const r of rows) byTense.set(r.tenseId, [...(byTense.get(r.tenseId) ?? []), r]);

  return [...byTense.values()]
    .sort((a, b) => a[0].tensePosition - b[0].tensePosition)
    .map((tenseRows) => {
      const first = tenseRows[0];
      const labels = first.mood === "imperative" ? IMPERATIVE_PERSON_LABELS : PERSON_LABELS;
      const verbs = verbOrder.filter((v) => tenseRows.some((r) => r.infinitive === v));
      const persons = PERSONS.filter((p) => tenseRows.some((r) => r.person === p));
      const cell = (verb: string, person: Person): FormCell => {
        const r = tenseRows.find((x) => x.infinitive === verb && x.person === person);
        return r ? { form: r.form, alternates: r.alternates, irregular: r.isIrregular } : null;
      };

      const flip = verbs.length > persons.length;
      return {
        tenseId: first.tenseId,
        title: first.tenseName,
        example: first.tenseExample,
        columns: flip ? persons.map((p) => labels[p]) : verbs,
        rows: flip
          ? verbs.map((v) => ({ label: v, cells: persons.map((p) => cell(v, p)) }))
          : persons.map((p) => ({ label: labels[p], cells: verbs.map((v) => cell(v, p)) })),
        hasIrregular: tenseRows.some((r) => r.isIrregular),
      };
    });
}
