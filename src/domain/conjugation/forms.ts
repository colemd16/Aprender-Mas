import { PERSONS, REFLEXIVE_PRONOUNS, type Person } from "@/content/persons";
import { TENSES, type TenseId } from "@/content/tenses";
import { regularForm, regularGerund, regularParticiple, splitInfinitive } from "./regular";

export type VerbFormRow = {
  infinitive: string;
  tenseId: TenseId;
  person: Person;
  form: string;
  alternates: string[];
  isIrregular: boolean;
};

export type SourceVerb = {
  infinitive: string;
  gerund: string;
  pastParticiple: string;
  // Forms from the dataset, keyed by tense id then person. Missing forms are absent.
  forms: Partial<Record<TenseId, Partial<Record<Person, string>>>>;
};

const TENSE_KIND = new Map<string, string>(TENSES.map((t) => [t.id, t.kind]));

export function stripAccents(s: string) {
  return s.normalize("NFD").replace(/[́]/g, "").normalize("NFC");
}

// "me levanto" → "levanto"; "levántate" → "levanta" (affirmative commands attach the pronoun).
function withoutReflexive(form: string, tense: TenseId, person: Person) {
  const pronoun = REFLEXIVE_PRONOUNS[person];
  if (tense === "imp_affirmative") {
    const bare = stripAccents(form).slice(0, -pronoun.length);
    return person === "1p" ? bare + "s" : bare; // levantémonos → levantemos
  }
  if (tense === "imp_negative") return form.replace(` ${pronoun} `, " ");
  return form.startsWith(pronoun + " ") ? form.slice(pronoun.length + 1) : form;
}

function isIrregular(verb: SourceVerb, tense: TenseId, person: Person, form: string) {
  const kind = TENSE_KIND.get(tense);
  if (kind === "compound") return verb.pastParticiple !== regularParticiple(verb.infinitive);

  const expected = regularForm(verb.infinitive, tense, person);
  if (expected === null) return false;
  const { isReflexive } = splitInfinitive(verb.infinitive);
  const actual = isReflexive ? withoutReflexive(form, tense, person) : form;
  return isReflexive && tense === "imp_affirmative"
    ? stripAccents(actual) !== stripAccents(expected)
    : actual !== expected;
}

// -ra imperfect subjunctive → the equivalent -se form (fuera → fuese, fuéramos → fuésemos).
function seVariant(word: string) {
  return word.replace(/ra(s|mos|n)?$/, "se$1");
}

function alternatesFor(tense: TenseId, form: string): string[] {
  const words = form.split(" ");
  if (tense === "sub_imperfect") {
    words[words.length - 1] = seVariant(words[words.length - 1]);
    return [words.join(" ")];
  }
  if (tense === "sub_pluperfect") {
    return [words.map((w) => (w.startsWith("hubi") ? seVariant(w) : w)).join(" ")];
  }
  return [];
}

// Builds "voy a ser" / "estoy hablando" style forms from the auxiliary verb's forms.
// Reflexive verbs put the pronoun first (me voy a levantar) with the attached form as an
// alternate (voy a levantarme).
function periphrasticForms(
  verb: SourceVerb,
  aux: SourceVerb,
  auxTense: TenseId,
  tense: TenseId,
): VerbFormRow[] {
  const { base, isReflexive } = splitInfinitive(verb.infinitive);
  const isProgressive = tense.startsWith("per_progressive");
  const gerund = isReflexive ? stripAccents(verb.gerund.slice(0, -2)) : verb.gerund;
  const rows: VerbFormRow[] = [];

  for (const person of PERSONS) {
    const auxForm = aux.forms[auxTense]?.[person];
    if (!auxForm) continue;
    const pronoun = REFLEXIVE_PRONOUNS[person];
    const complement = isProgressive ? gerund : `a ${base}`;

    const form = isReflexive ? `${pronoun} ${auxForm} ${complement}` : `${auxForm} ${complement}`;
    const alternates = !isReflexive
      ? []
      : isProgressive
        ? [`${auxForm} ${verb.gerund.slice(0, -2)}${pronoun}`] // estoy levantándome
        : [`${auxForm} a ${base}${pronoun}`]; // voy a levantarme

    rows.push({
      infinitive: verb.infinitive,
      tenseId: tense,
      person,
      form,
      alternates,
      isIrregular: isProgressive && gerund !== regularGerund(verb.infinitive),
    });
  }
  return rows;
}

export function buildVerbForms(verb: SourceVerb, auxiliaries: { ir: SourceVerb; estar: SourceVerb }): VerbFormRow[] {
  const rows: VerbFormRow[] = [];

  for (const tense of TENSES) {
    if (tense.kind === "periphrastic") continue;
    for (const person of PERSONS) {
      const form = verb.forms[tense.id]?.[person];
      if (!form) continue;
      rows.push({
        infinitive: verb.infinitive,
        tenseId: tense.id,
        person,
        form,
        alternates: alternatesFor(tense.id, form),
        isIrregular: isIrregular(verb, tense.id, person, form),
      });
    }
  }

  rows.push(
    ...periphrasticForms(verb, auxiliaries.ir, "ind_present", "per_ir_a_present"),
    ...periphrasticForms(verb, auxiliaries.ir, "ind_imperfect", "per_ir_a_imperfect"),
  );
  // "estoy estando" and "estoy habiendo" aren't Spanish; every other verb gets progressive forms.
  if (verb.infinitive !== "estar" && verb.infinitive !== "haber") {
    rows.push(
      ...periphrasticForms(verb, auxiliaries.estar, "ind_present", "per_progressive_present"),
      ...periphrasticForms(verb, auxiliaries.estar, "ind_imperfect", "per_progressive_imperfect"),
    );
  }
  return rows;
}
