import type { Person } from "./persons";
import type { TenseId } from "./tenses";

// Verbs missing from Fred Jehle's dataset, written by hand. The seed merges these in
// alongside the CSV. Haber only appears there inside compound tenses, never on its own.
// Impersonal "there is" uses its own 3rd-person forms (hay, había, hubo) — taught as usage.

type Forms = Partial<Record<TenseId, Partial<Record<Person, string>>>>;

export type SupplementalVerb = {
  infinitive: string;
  english: string;
  gerund: string;
  gerundEnglish: string;
  pastParticiple: string;
  pastParticipleEnglish: string;
  forms: Forms;
};

const p = (s1: string, s2: string, s3: string, p1: string, p3: string) => ({
  "1s": s1,
  "2s": s2,
  "3s": s3,
  "1p": p1,
  "3p": p3,
});

const compound = (aux: Record<Person, string>, participle: string) =>
  Object.fromEntries(Object.entries(aux).map(([person, form]) => [person, `${form} ${participle}`]));

const haberPresent = p("he", "has", "ha", "hemos", "han");
const haberImperfect = p("había", "habías", "había", "habíamos", "habían");
const haberFuture = p("habré", "habrás", "habrá", "habremos", "habrán");
const haberConditional = p("habría", "habrías", "habría", "habríamos", "habrían");
const haberSubPresent = p("haya", "hayas", "haya", "hayamos", "hayan");
const haberSubImperfect = p("hubiera", "hubieras", "hubiera", "hubiéramos", "hubieran");

export const SUPPLEMENTAL_VERBS: SupplementalVerb[] = [
  {
    infinitive: "haber",
    english: "to have (auxiliary); there to be (impersonal)",
    gerund: "habiendo",
    gerundEnglish: "having",
    pastParticiple: "habido",
    pastParticipleEnglish: "had",
    forms: {
      ind_present: haberPresent,
      ind_preterite: p("hube", "hubiste", "hubo", "hubimos", "hubieron"),
      ind_imperfect: haberImperfect,
      ind_future: haberFuture,
      ind_conditional: haberConditional,
      ind_present_perfect: compound(haberPresent, "habido"),
      ind_pluperfect: compound(haberImperfect, "habido"),
      ind_future_perfect: compound(haberFuture, "habido"),
      ind_conditional_perfect: compound(haberConditional, "habido"),
      sub_present: haberSubPresent,
      sub_present_perfect: compound(haberSubPresent, "habido"),
      sub_imperfect: haberSubImperfect,
      sub_pluperfect: compound(haberSubImperfect, "habido"),
      // No commands: haber has no imperative in modern Spanish.
    },
  },
];
