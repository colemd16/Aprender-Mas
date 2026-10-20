import type { Person } from "@/content/persons";
import type { TenseId } from "@/content/tenses";

// Finds verb forms inside a sentence — including multi-word ones like "habría estado"
// or "voy a estar" — and every way each could be read (era = yo or él, fue = ser or ir).

export type FormSense = { infinitive: string; tenseId: TenseId; person: Person };
export type FormIndex = { byText: Map<string, FormSense[]>; longest: number };
export type FormMatch = { text: string; senses: FormSense[] };

const WORD = /[a-záéíóúüñ]+/gi;

export function buildFormIndex(rows: (FormSense & { form: string; alternates: string[] })[]): FormIndex {
  const byText = new Map<string, FormSense[]>();
  let longest = 1;
  for (const r of rows) {
    for (const spelling of [r.form, ...r.alternates]) {
      const key = (spelling.toLowerCase().match(WORD) ?? []).join(" ");
      if (!key) continue;
      longest = Math.max(longest, key.split(" ").length);
      byText.set(key, [...(byText.get(key) ?? []), { infinitive: r.infinitive, tenseId: r.tenseId, person: r.person }]);
    }
  }
  return { byText, longest };
}

// Longest match first, so "voy a estar" is one form rather than "voy" + "estar".
export function findForms(text: string, index: FormIndex): FormMatch[] {
  const words = (text.toLowerCase().match(WORD) ?? []);
  const matches: FormMatch[] = [];
  for (let i = 0; i < words.length; ) {
    let found = false;
    for (let n = Math.min(index.longest, words.length - i); n >= 1; n--) {
      const key = words.slice(i, i + n).join(" ");
      const senses = index.byText.get(key);
      if (senses) {
        matches.push({ text: key, senses });
        i += n;
        found = true;
        break;
      }
    }
    if (!found) i++;
  }
  return matches;
}
