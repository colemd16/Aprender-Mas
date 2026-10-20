// The fixed catalog the grader must label mistakes with. A closed list is what makes
// mistakes countable over time ("you confuse ser/estar for locations").
// countsAsError: false means the issue is pointed out but the answer still passes.

export type ErrorTypeDef = {
  id: string;
  name: string;
  description: string;
  conceptId?: string;
  countsAsError: boolean;
};

export const ERROR_TYPES: ErrorTypeDef[] = [
  // Verb forms
  { id: "wrong_tense", name: "Wrong tense", description: "Right verb and person, but the wrong tense.", countsAsError: true },
  { id: "wrong_mood", name: "Wrong mood", description: "Indicative where the subjunctive is needed, or vice versa.", conceptId: "present-subjunctive", countsAsError: true },
  { id: "wrong_person", name: "Wrong person", description: "The verb doesn't match its subject.", countsAsError: true },
  { id: "regular_ending", name: "Wrong ending", description: "Incorrect ending on a regular verb.", conceptId: "present-regular", countsAsError: true },
  { id: "irregular_form", name: "Irregular form", description: "An irregular verb conjugated as if it were regular, or the wrong irregular stem.", countsAsError: true },
  { id: "stem_change", name: "Stem change", description: "A stem change was missed or applied where it doesn't belong.", conceptId: "stem-changers", countsAsError: true },
  { id: "spelling_change", name: "Spelling change", description: "A required spelling change was missed (busqué, llegué, leyó).", countsAsError: true },
  { id: "auxiliary_error", name: "Auxiliary verb", description: "Wrong form of haber, or ser/estar used where haber is needed.", conceptId: "perfect-tenses", countsAsError: true },
  { id: "participle_error", name: "Participle", description: "Incorrect past participle (e.g. *hacido* for hecho).", conceptId: "perfect-tenses", countsAsError: true },
  { id: "gerund_error", name: "Gerund", description: "Incorrect gerund (e.g. *leiendo* for leyendo).", conceptId: "progressive", countsAsError: true },

  // Choosing the right grammar
  { id: "ser_estar_swap", name: "Ser vs estar", description: "Ser used where estar is needed, or vice versa.", conceptId: "estar-uses", countsAsError: true },
  { id: "hay_estar", name: "Hay vs estar", description: "Estar used to say something exists (Hay un banco), or hay used to locate something known.", conceptId: "haber-impersonal", countsAsError: true },
  { id: "pret_imperf_confusion", name: "Preterite vs imperfect", description: "Preterite used for background or habit, or imperfect for a completed event.", conceptId: "preterite-vs-imperfect", countsAsError: true },
  { id: "subjunctive_missed", name: "Missed subjunctive", description: "A trigger required the subjunctive but the indicative was used.", conceptId: "present-subjunctive", countsAsError: true },
  { id: "subjunctive_overused", name: "Unneeded subjunctive", description: "Subjunctive used where the indicative is correct.", conceptId: "present-subjunctive", countsAsError: true },
  { id: "si_clause_structure", name: "If-clause structure", description: "Wrong tense combination in a si clause (e.g. *si sería*).", conceptId: "si-clauses", countsAsError: true },
  { id: "periphrasis_error", name: "Construction", description: "A broken ir a / estar + gerund construction (e.g. *voy comer*).", conceptId: "ir-a-future", countsAsError: true },

  // Agreement
  { id: "gender_agreement", name: "Gender agreement", description: "Adjective or article doesn't match the noun's gender.", countsAsError: true },
  { id: "number_agreement", name: "Number agreement", description: "Singular/plural mismatch.", countsAsError: true },

  // Pronouns and small words
  { id: "pronoun_choice", name: "Pronoun choice", description: "Wrong object pronoun (lo vs le, missing se lo).", conceptId: "object-pronouns", countsAsError: true },
  { id: "pronoun_placement", name: "Pronoun placement", description: "Object or reflexive pronoun in the wrong position.", conceptId: "object-pronouns", countsAsError: true },
  { id: "reflexive_error", name: "Reflexive", description: "Missing or unnecessary reflexive pronoun.", conceptId: "reflexives", countsAsError: true },
  { id: "por_para", name: "Por vs para", description: "Por used where para is needed, or vice versa.", conceptId: "por-para", countsAsError: true },
  { id: "preposition", name: "Preposition", description: "Wrong or missing preposition (other than por/para).", countsAsError: true },
  { id: "personal_a", name: "Personal a", description: "Missing a before a person as direct object (Veo a María).", countsAsError: true },
  { id: "word_order", name: "Word order", description: "Words in an order Spanish doesn't allow.", countsAsError: true },
  { id: "missing_word", name: "Missing word", description: "A required word (article, que, a) is missing.", countsAsError: true },
  { id: "meaning_mismatch", name: "Doesn't answer the prompt", description: "The answer isn't Spanish, or doesn't say what the prompt asks.", countsAsError: true },

  // Noted, but the answer still passes
  { id: "missing_accent", name: "Accent mark", description: "Missing or misplaced accent mark.", countsAsError: false },
  { id: "typo", name: "Typo", description: "A slip of the keyboard that isn't a grammar mistake.", countsAsError: false },
  { id: "word_choice", name: "Word choice", description: "Grammatical, but a native speaker would choose a different word.", countsAsError: false },
  { id: "vosotros_used", name: "Vosotros", description: "Vosotros form used; Latin American Spanish uses ustedes.", countsAsError: false },
];
