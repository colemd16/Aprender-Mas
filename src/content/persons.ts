// Grammatical persons the app teaches. Vosotros (2nd-person plural) is deliberately
// absent: this app teaches Latin American Spanish, where ustedes covers "you all".
export const PERSONS = ["1s", "2s", "3s", "1p", "3p"] as const;
export type Person = (typeof PERSONS)[number];

export const PERSON_LABELS: Record<Person, string> = {
  "1s": "yo",
  "2s": "tú",
  "3s": "él / ella / usted",
  "1p": "nosotros",
  "3p": "ellos / ellas / ustedes",
};

// Commands address someone directly, so the 3rd persons are usted / ustedes.
export const IMPERATIVE_PERSON_LABELS: Record<Person, string> = {
  "1s": "yo",
  "2s": "tú",
  "3s": "usted",
  "1p": "nosotros",
  "3p": "ustedes",
};

// Reflexive pronoun for each person (me levanto, te levantas…).
export const REFLEXIVE_PRONOUNS: Record<Person, string> = {
  "1s": "me",
  "2s": "te",
  "3s": "se",
  "1p": "nos",
  "3p": "se",
};

// Column in Fred Jehle's CSV that holds each person's form.
export const JEHLE_PERSON_COLUMNS = {
  "1s": "form_1s",
  "2s": "form_2s",
  "3s": "form_3s",
  "1p": "form_1p",
  "3p": "form_3p",
} as const satisfies Record<Person, string>;
