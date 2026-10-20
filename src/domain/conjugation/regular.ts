import type { Person } from "@/content/persons";
import type { TenseId } from "@/content/tenses";

// What a verb's forms would be if it followed the regular -ar/-er/-ir patterns.
// Comparing real forms against these is how a form gets flagged as irregular.
// Spelling changes (busqué, leyó) also show up as irregular — that's intended:
// they're something extra to learn.

type Ending = "ar" | "er" | "ir";
type Row = Record<Person, string>;

const row = (s1: string, s2: string, s3: string, p1: string, p3: string): Row => ({
  "1s": s1,
  "2s": s2,
  "3s": s3,
  "1p": p1,
  "3p": p3,
});

const STEM_ENDINGS: Partial<Record<TenseId, Record<Ending, Row>>> = {
  ind_present: {
    ar: row("o", "as", "a", "amos", "an"),
    er: row("o", "es", "e", "emos", "en"),
    ir: row("o", "es", "e", "imos", "en"),
  },
  ind_preterite: {
    ar: row("é", "aste", "ó", "amos", "aron"),
    er: row("í", "iste", "ió", "imos", "ieron"),
    ir: row("í", "iste", "ió", "imos", "ieron"),
  },
  ind_imperfect: {
    ar: row("aba", "abas", "aba", "ábamos", "aban"),
    er: row("ía", "ías", "ía", "íamos", "ían"),
    ir: row("ía", "ías", "ía", "íamos", "ían"),
  },
  sub_present: {
    ar: row("e", "es", "e", "emos", "en"),
    er: row("a", "as", "a", "amos", "an"),
    ir: row("a", "as", "a", "amos", "an"),
  },
  sub_imperfect: {
    ar: row("ara", "aras", "ara", "áramos", "aran"),
    er: row("iera", "ieras", "iera", "iéramos", "ieran"),
    ir: row("iera", "ieras", "iera", "iéramos", "ieran"),
  },
};

// Future and conditional attach to the whole infinitive.
const INFINITIVE_ENDINGS: Partial<Record<TenseId, Row>> = {
  ind_future: row("é", "ás", "á", "emos", "án"),
  ind_conditional: row("ía", "ías", "ía", "íamos", "ían"),
};

export function splitInfinitive(infinitive: string) {
  const isReflexive = infinitive.endsWith("se");
  const base = isReflexive ? infinitive.slice(0, -2) : infinitive;
  const ending = base.slice(-2).replace("í", "i") as Ending;
  return { base, stem: base.slice(0, -2), ending, isReflexive };
}

export function regularParticiple(infinitive: string) {
  const { stem, ending } = splitInfinitive(infinitive);
  return stem + (ending === "ar" ? "ado" : "ido");
}

export function regularGerund(infinitive: string) {
  const { stem, ending } = splitInfinitive(infinitive);
  return stem + (ending === "ar" ? "ando" : "iendo");
}

// The regular form of a simple tense or command, without any reflexive pronoun.
export function regularForm(infinitive: string, tense: TenseId, person: Person): string | null {
  const { base, stem, ending } = splitInfinitive(infinitive);

  const stemEndings = STEM_ENDINGS[tense];
  if (stemEndings) return stem + stemEndings[ending][person];

  const infEndings = INFINITIVE_ENDINGS[tense];
  if (infEndings) return base + infEndings[person];

  if (tense === "imp_affirmative") {
    if (person === "1s") return null;
    return person === "2s"
      ? regularForm(infinitive, "ind_present", "3s")
      : regularForm(infinitive, "sub_present", person);
  }
  if (tense === "imp_negative") {
    if (person === "1s") return null;
    return "no " + regularForm(infinitive, "sub_present", person);
  }
  return null;
}
