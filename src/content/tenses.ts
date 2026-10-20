export type Mood = "indicative" | "subjunctive" | "imperative";
export type TenseKind = "simple" | "compound" | "periphrastic";

export type TenseDef = {
  id: string;
  mood: Mood;
  kind: TenseKind;
  nameEs: string;
  nameEn: string;
  // How the tense reads in English, shown with "to be" because it's the reference verb.
  englishExample: string;
  // [mood, tense] in Fred Jehle's CSV. Periphrastic tenses aren't in the dataset; the
  // seed builds them from their parts (ir + a + infinitive, estar + gerund).
  jehle?: [string, string];
};

// Order is the order tenses are introduced in the curriculum.
// Dropped from the dataset: pretérito anterior and the future subjunctive (both archaic).
export const TENSES = [
  { id: "ind_present", mood: "indicative", kind: "simple", nameEs: "Presente", nameEn: "Present", englishExample: "I am", jehle: ["Indicativo", "Presente"] },
  { id: "per_progressive_present", mood: "indicative", kind: "periphrastic", nameEs: "Presente progresivo", nameEn: "Present progressive", englishExample: "I am being" },
  { id: "per_ir_a_present", mood: "indicative", kind: "periphrastic", nameEs: "Ir a + infinitivo", nameEn: "Going to", englishExample: "I am going to be" },
  { id: "ind_preterite", mood: "indicative", kind: "simple", nameEs: "Pretérito", nameEn: "Preterite", englishExample: "I was (and it's over)", jehle: ["Indicativo", "Pretérito"] },
  { id: "ind_imperfect", mood: "indicative", kind: "simple", nameEs: "Imperfecto", nameEn: "Imperfect", englishExample: "I was / I used to be", jehle: ["Indicativo", "Imperfecto"] },
  { id: "per_progressive_imperfect", mood: "indicative", kind: "periphrastic", nameEs: "Imperfecto progresivo", nameEn: "Past progressive", englishExample: "I was being" },
  { id: "per_ir_a_imperfect", mood: "indicative", kind: "periphrastic", nameEs: "Iba a + infinitivo", nameEn: "Was going to", englishExample: "I was going to be" },
  { id: "ind_future", mood: "indicative", kind: "simple", nameEs: "Futuro", nameEn: "Future", englishExample: "I will be", jehle: ["Indicativo", "Futuro"] },
  { id: "ind_conditional", mood: "indicative", kind: "simple", nameEs: "Condicional", nameEn: "Conditional", englishExample: "I would be", jehle: ["Indicativo", "Condicional"] },
  { id: "ind_present_perfect", mood: "indicative", kind: "compound", nameEs: "Pretérito perfecto", nameEn: "Present perfect", englishExample: "I have been", jehle: ["Indicativo", "Pretérito perfecto"] },
  { id: "ind_pluperfect", mood: "indicative", kind: "compound", nameEs: "Pluscuamperfecto", nameEn: "Pluperfect", englishExample: "I had been", jehle: ["Indicativo", "Pluscuamperfecto"] },
  { id: "ind_future_perfect", mood: "indicative", kind: "compound", nameEs: "Futuro perfecto", nameEn: "Future perfect", englishExample: "I will have been", jehle: ["Indicativo", "Futuro perfecto"] },
  { id: "ind_conditional_perfect", mood: "indicative", kind: "compound", nameEs: "Condicional perfecto", nameEn: "Conditional perfect", englishExample: "I would have been", jehle: ["Indicativo", "Condicional perfecto"] },
  { id: "sub_present", mood: "subjunctive", kind: "simple", nameEs: "Presente de subjuntivo", nameEn: "Present subjunctive", englishExample: "(that) I be", jehle: ["Subjuntivo", "Presente"] },
  { id: "sub_present_perfect", mood: "subjunctive", kind: "compound", nameEs: "Pretérito perfecto de subjuntivo", nameEn: "Present perfect subjunctive", englishExample: "(that) I have been", jehle: ["Subjuntivo", "Pretérito perfecto"] },
  { id: "sub_imperfect", mood: "subjunctive", kind: "simple", nameEs: "Imperfecto de subjuntivo", nameEn: "Imperfect subjunctive", englishExample: "(if) I were", jehle: ["Subjuntivo", "Imperfecto"] },
  { id: "sub_pluperfect", mood: "subjunctive", kind: "compound", nameEs: "Pluscuamperfecto de subjuntivo", nameEn: "Pluperfect subjunctive", englishExample: "(if) I had been", jehle: ["Subjuntivo", "Pluscuamperfecto"] },
  { id: "imp_affirmative", mood: "imperative", kind: "simple", nameEs: "Imperativo afirmativo", nameEn: "Command", englishExample: "Be!", jehle: ["Imperativo Afirmativo", "Presente"] },
  { id: "imp_negative", mood: "imperative", kind: "simple", nameEs: "Imperativo negativo", nameEn: "Negative command", englishExample: "Don't be!", jehle: ["Imperativo Negativo", "Presente"] },
] as const satisfies readonly TenseDef[];

export type TenseId = (typeof TENSES)[number]["id"];
