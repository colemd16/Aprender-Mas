import type { Person } from "./persons";
import type { TenseId } from "./tenses";

// Levels and steps. A learn step teaches form skills (every verb × tense × person listed)
// and/or usage skills (from concepts.ts). A step is complete once all its skills are solid.
// Each level ends with a checkpoint that draws from every skill in the level.

export type LearnStepDef = {
  id: string;
  title: string;
  concept?: string;
  forms?: { verbs: string[]; tenses: TenseId[]; persons?: Person[] };
  usage?: string[];
};

export type LevelDef = {
  number: number;
  title: string;
  summary: string;
  steps: LearnStepDef[];
};

export const LEVELS: LevelDef[] = [
  {
    number: 1,
    title: "Ser y estar",
    summary: "The two verbs for “to be” — and when to use each.",
    steps: [
      { id: "l1-ser-present", title: "Ser in the present", concept: "ser-uses", forms: { verbs: ["ser"], tenses: ["ind_present"] }, usage: ["usage:ser-identity"] },
      { id: "l1-estar-present", title: "Estar in the present", concept: "estar-uses", forms: { verbs: ["estar"], tenses: ["ind_present"] }, usage: ["usage:estar-location", "usage:estar-state"] },
      { id: "l1-ser-or-estar", title: "Ser or estar?", concept: "ser-uses", usage: ["usage:ser-time-events"] },
      { id: "l1-hay", title: "Hay or está?", concept: "haber-impersonal", usage: ["usage:hay-vs-estar"] },
      { id: "l1-meaning-change", title: "Adjectives that change meaning", concept: "ser-estar-meaning-change", usage: ["usage:ser-estar-meaning-change"] },
    ],
  },
  {
    number: 2,
    title: "Verbs & plans",
    summary: "Regular patterns, stem changes, and talking about what you're going to do.",
    steps: [
      { id: "l2-present-ar", title: "Regular -ar verbs", concept: "present-regular", forms: { verbs: ["hablar"], tenses: ["ind_present"] } },
      { id: "l2-present-er-ir", title: "Regular -er and -ir verbs", concept: "present-regular", forms: { verbs: ["comer", "vivir"], tenses: ["ind_present"] } },
      { id: "l2-stem-changers", title: "Stem-changing verbs", concept: "stem-changers", forms: { verbs: ["pensar", "poder", "pedir"], tenses: ["ind_present"] } },
      { id: "l2-progressive", title: "What's happening now", concept: "progressive", forms: { verbs: ["hablar", "comer", "vivir"], tenses: ["per_progressive_present"] }, usage: ["usage:progressive-now"] },
      { id: "l2-ir-present", title: "Ir in the present", concept: "ir-present", forms: { verbs: ["ir"], tenses: ["ind_present"] } },
      { id: "l2-ir-a", title: "Going to", concept: "ir-a-future", forms: { verbs: ["ser", "estar", "hablar"], tenses: ["per_ir_a_present"] }, usage: ["usage:ir-a-plans"] },
    ],
  },
  {
    number: 3,
    title: "What happened",
    summary: "The preterite — completed events, regular and irregular.",
    steps: [
      { id: "l3-pret-ser-estar-ir", title: "Fui, estuve", concept: "preterite", forms: { verbs: ["ser", "estar", "ir"], tenses: ["ind_preterite"] }, usage: ["usage:preterite-completed"] },
      { id: "l3-pret-regular", title: "Regular preterite", concept: "preterite", forms: { verbs: ["hablar", "comer", "vivir"], tenses: ["ind_preterite"] } },
      { id: "l3-pret-irregular-1", title: "Tuve, hice, pude", concept: "preterite-irregular", forms: { verbs: ["tener", "hacer", "poder"], tenses: ["ind_preterite"] } },
      { id: "l3-pret-irregular-2", title: "Dije, vine, quise", concept: "preterite-irregular", forms: { verbs: ["decir", "venir", "querer"], tenses: ["ind_preterite"] } },
      { id: "l3-pret-irregular-3", title: "Puse, supe, di", concept: "preterite-irregular", forms: { verbs: ["poner", "saber", "dar"], tenses: ["ind_preterite"] } },
    ],
  },
  {
    number: 4,
    title: "What was going on",
    summary: "The imperfect, and telling stories with both past tenses.",
    steps: [
      { id: "l4-imperf-ser-estar-ir", title: "Era, estaba, iba", concept: "imperfect", forms: { verbs: ["ser", "estar", "ir"], tenses: ["ind_imperfect"] }, usage: ["usage:imperfect-background"] },
      { id: "l4-imperf-regular", title: "Regular imperfect", concept: "imperfect", forms: { verbs: ["hablar", "comer", "vivir"], tenses: ["ind_imperfect"] }, usage: ["usage:imperfect-habitual"] },
      { id: "l4-pret-vs-imperf", title: "Preterite or imperfect?", concept: "preterite-vs-imperfect", usage: ["usage:pret-imperf-interrupted", "usage:pret-imperf-ser-estar"] },
      { id: "l4-habia-hubo", title: "Había or hubo?", concept: "haber-impersonal", usage: ["usage:habia-hubo"] },
      { id: "l4-past-progressive", title: "Estaba hablando", concept: "progressive", forms: { verbs: ["hablar", "comer", "hacer"], tenses: ["per_progressive_imperfect"] } },
      { id: "l4-iba-a", title: "Was going to", concept: "past-plans", forms: { verbs: ["ser", "estar", "hacer"], tenses: ["per_ir_a_imperfect"] }, usage: ["usage:iba-a-past-plans"] },
    ],
  },
  {
    number: 5,
    title: "Will & would",
    summary: "The future and the conditional.",
    steps: [
      { id: "l5-future", title: "Seré, estaré", concept: "future", forms: { verbs: ["ser", "estar", "hablar"], tenses: ["ind_future"] }, usage: ["usage:future-predictions"] },
      { id: "l5-future-irregular", title: "Tendré, haré, diré", concept: "future", forms: { verbs: ["tener", "hacer", "decir"], tenses: ["ind_future"] } },
      { id: "l5-conditional", title: "Sería, estaría", concept: "conditional", forms: { verbs: ["ser", "estar", "hablar"], tenses: ["ind_conditional"] }, usage: ["usage:conditional-would"] },
      { id: "l5-conditional-irregular", title: "Tendría, podría, querría", concept: "conditional", forms: { verbs: ["tener", "poder", "querer"], tenses: ["ind_conditional"] }, usage: ["usage:conditional-polite"] },
    ],
  },
  {
    number: 6,
    title: "Have been, had been",
    summary: "The perfect tenses — all the way to “would have been.”",
    steps: [
      { id: "l6-haber", title: "He, has, ha", concept: "perfect-tenses", forms: { verbs: ["haber"], tenses: ["ind_present"] } },
      { id: "l6-present-perfect", title: "He sido, he estado", concept: "perfect-tenses", forms: { verbs: ["ser", "estar", "hablar"], tenses: ["ind_present_perfect"] }, usage: ["usage:present-perfect-use"] },
      { id: "l6-irregular-participles", title: "Hecho, dicho, visto", concept: "perfect-tenses", forms: { verbs: ["hacer", "decir", "ver"], tenses: ["ind_present_perfect"] } },
      { id: "l6-pluperfect", title: "Había sido", concept: "perfect-tenses", forms: { verbs: ["ser", "estar", "hacer"], tenses: ["ind_pluperfect"] }, usage: ["usage:pluperfect-before-past"] },
      { id: "l6-future-perfect", title: "Habré sido", concept: "perfect-tenses", forms: { verbs: ["ser", "estar"], tenses: ["ind_future_perfect"] }, usage: ["usage:future-perfect-by-then"] },
      { id: "l6-conditional-perfect", title: "Habría sido", concept: "conditional-perfect", forms: { verbs: ["ser", "estar", "hacer"], tenses: ["ind_conditional_perfect"] }, usage: ["usage:would-have"] },
    ],
  },
  {
    number: 7,
    title: "The subjunctive",
    summary: "Wishes, emotions, doubt, and the not-yet-real.",
    steps: [
      { id: "l7-subj-ser-estar-ir", title: "Sea, esté, vaya", concept: "present-subjunctive", forms: { verbs: ["ser", "estar", "ir"], tenses: ["sub_present"] } },
      { id: "l7-subj-regular", title: "Regular subjunctive", concept: "present-subjunctive", forms: { verbs: ["hablar", "comer", "vivir"], tenses: ["sub_present"] } },
      { id: "l7-subj-irregular", title: "Tenga, haga, pueda", concept: "present-subjunctive", forms: { verbs: ["tener", "hacer", "poder"], tenses: ["sub_present"] } },
      { id: "l7-subj-wishes", title: "Quiero que…", concept: "present-subjunctive", usage: ["usage:subj-wishes"] },
      { id: "l7-subj-emotion-doubt", title: "Me alegra que… No creo que…", concept: "present-subjunctive", usage: ["usage:subj-emotion", "usage:subj-doubt"] },
      { id: "l7-subj-cuando", title: "Cuando llegues…", concept: "present-subjunctive", usage: ["usage:subj-cuando-future"] },
    ],
  },
  {
    number: 8,
    title: "What if",
    summary: "The imperfect subjunctive and hypotheticals.",
    steps: [
      { id: "l8-imperf-subj", title: "Fuera, estuviera", concept: "imperfect-subjunctive", forms: { verbs: ["ser", "estar", "tener"], tenses: ["sub_imperfect"] }, usage: ["usage:subj-past-triggers"] },
      { id: "l8-imperf-subj-more", title: "Hiciera, pudiera, hablara", concept: "imperfect-subjunctive", forms: { verbs: ["hacer", "poder", "hablar"], tenses: ["sub_imperfect"] } },
      { id: "l8-si-present", title: "Si fuera…, sería…", concept: "si-clauses", usage: ["usage:si-hypothetical-present"] },
      { id: "l8-pluperf-subj", title: "Hubiera sido", concept: "si-clauses", forms: { verbs: ["ser", "estar", "saber"], tenses: ["sub_pluperfect"] } },
      { id: "l8-si-past", title: "Si hubiera…, habría…", concept: "si-clauses", usage: ["usage:si-hypothetical-past"] },
    ],
  },
  {
    number: 9,
    title: "Speaking naturally",
    summary: "Commands, pronouns, and the small words that make Spanish flow.",
    steps: [
      { id: "l9-commands", title: "Habla, no hables, hablen", concept: "commands", forms: { verbs: ["hablar", "comer"], tenses: ["imp_affirmative", "imp_negative"], persons: ["2s", "3s", "3p"] }, usage: ["usage:commands-tu-ustedes"] },
      { id: "l9-irregular-commands", title: "Ven, haz, di, sé", concept: "commands", forms: { verbs: ["venir", "hacer", "decir", "tener", "poner", "salir", "ser", "ir"], tenses: ["imp_affirmative"], persons: ["2s", "3s"] } },
      { id: "l9-object-pronouns", title: "Lo, la, le", concept: "object-pronouns", usage: ["usage:direct-object-pronouns", "usage:indirect-object-pronouns"] },
      { id: "l9-pronoun-placement", title: "Se lo dije", concept: "object-pronouns", usage: ["usage:pronoun-placement"] },
      { id: "l9-reflexives", title: "Me levanto", concept: "reflexives", usage: ["usage:reflexive-verbs"] },
      { id: "l9-por-para", title: "Por o para", concept: "por-para", usage: ["usage:por-para"] },
    ],
  },
];
