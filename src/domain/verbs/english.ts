import type { Person } from "@/content/persons";

// What a Spanish form means in English, built from the verb's English parts and the
// tense: hablar · sub_imperfect · tú → "(if) you spoke". The verb data's own English is
// first-person only, and repeats the indicative for the subjunctive, so it's built here.

export type VerbEnglish = { base: string; past: string; gerund: string; participle: string };

// "to have (auxiliary); there to be" → "have"; "to wake up, lie down" → "wake up".
export function firstSense(gloss: string) {
  return gloss
    .replace(/\([^)]*\)/g, "")
    .split(/[,;]/)[0]
    .replace(/^\s*to\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Changes only the first word of a phrase: ("wake up", w => w + "s") → "wakes up".
function onHead(phrase: string, f: (head: string) => string) {
  const [head, ...rest] = phrase.split(" ");
  return [f(head), ...rest].join(" ");
}

const IRREGULAR_PAST: Record<string, string> = { be: "was", have: "had", do: "did", go: "went" };
// Slips in the verb data's English participles.
const PARTICIPLE_FIXES: Record<string, string> = { waken: "woken" };

// The English parts of a verb, from its glosses (past from the preterite data when known).
export function verbEnglish(gloss: { english: string; gerund: string; participle: string; past?: string }): VerbEnglish {
  const base = firstSense(gloss.english) || "do";
  const [head, ...rest] = base.split(" ");
  const regularPast = IRREGULAR_PAST[head] ?? (head.endsWith("e") ? `${head}d` : /[^aeiou]y$/.test(head) ? `${head.slice(0, -1)}ied` : `${head}ed`);
  return {
    base,
    past: gloss.past ? firstSense(gloss.past) : [regularPast, ...rest].join(" "),
    gerund: firstSense(gloss.gerund) || `${head}ing`,
    participle: onHead(firstSense(gloss.participle) || [regularPast, ...rest].join(" "), (w) => PARTICIPLE_FIXES[w] ?? w),
  };
}

const SUBJECT: Record<Person, string> = { "1s": "I", "2s": "you", "3s": "he/she", "1p": "we", "3p": "they" };
const singular = (p: Person) => p === "1s" || p === "3s";

function thirdPerson(word: string) {
  if (word === "be") return "is";
  if (word === "have") return "has";
  if (/(s|sh|ch|x|z|o)$/.test(word)) return `${word}es`;
  if (/[^aeiou]y$/.test(word)) return `${word.slice(0, -1)}ies`;
  return `${word}s`;
}

const bePresent = (p: Person) => (p === "1s" ? "am" : p === "3s" ? "is" : "are");
const bePast = (p: Person) => (singular(p) ? "was" : "were");

function present(v: VerbEnglish, p: Person) {
  if (v.base.split(" ")[0] === "be") return onHead(v.base, () => bePresent(p));
  return p === "3s" ? onHead(v.base, thirdPerson) : v.base;
}

// "was" agrees with its subject ("we were able").
const past = (v: VerbEnglish, p: Person) => onHead(v.past, (w) => (w === "was" && !singular(p) ? "were" : w));

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function englishMeaning(v: VerbEnglish, tenseId: string, p: Person): string {
  const s = SUBJECT[p];
  switch (tenseId) {
    case "ind_present":
      return `${s} ${present(v, p)}`;
    case "per_progressive_present":
      return `${s} ${bePresent(p)} ${v.gerund}`;
    case "per_ir_a_present":
      return `${s} ${bePresent(p)} going to ${v.base}`;
    case "ind_preterite":
      return `${s} ${past(v, p)}`;
    case "ind_imperfect":
      return `${s} used to ${v.base}, ${bePast(p)} ${v.gerund}`;
    case "per_progressive_imperfect":
      return `${s} ${bePast(p)} ${v.gerund}`;
    case "per_ir_a_imperfect":
      return `${s} ${bePast(p)} going to ${v.base}`;
    case "ind_future":
      return `${s} will ${v.base}`;
    case "ind_conditional":
      return `${s} would ${v.base}`;
    case "ind_present_perfect":
      return `${s} ${p === "3s" ? "has" : "have"} ${v.participle}`;
    case "ind_pluperfect":
      return `${s} had ${v.participle}`;
    case "ind_future_perfect":
      return `${s} will have ${v.participle}`;
    case "ind_conditional_perfect":
      return `${s} would have ${v.participle}`;
    // English keeps a trace of the subjunctive: "(that) she speak", "(if) I were".
    case "sub_present":
      return `(that) ${s} ${v.base}`;
    case "sub_present_perfect":
      return `(that) ${s} have ${v.participle}`;
    case "sub_imperfect":
      return `(if) ${s} ${v.base.split(" ")[0] === "be" ? onHead(v.base, () => "were") : past(v, p)}`;
    case "sub_pluperfect":
      return `(if) ${s} had ${v.participle}`;
    case "imp_affirmative":
      return p === "1p" ? `Let's ${v.base}!` : `${capitalize(v.base)}!`;
    case "imp_negative":
      return p === "1p" ? `Let's not ${v.base}!` : `Don't ${v.base}!`;
    default:
      return `${s} ${v.base}`;
  }
}
