import { stripAcute } from "./normalize";

// Finds missing accent marks by spelling alone — more reliable than asking the model.
// A word is only flagged when its spelling isn't a known word, exactly one known word
// matches it once accents are ignored, and that word has an accent this one lacks:
// "estaria" → "estaría". It never removes an accent (an extra accent is left to the
// grader, which sees the context), and words valid both ways (hablo / habló,
// esta / está) are never flagged.

type Spellings = { known: Set<string>; byBase: Map<string, Set<string>> };
export type AccentLexicon = Spellings & { overlay?: Spellings };

// Short words that exist both with and without an accent, plus common words that
// would otherwise be unknown. All count as correctly spelled.
const FUNCTION_WORDS = `a al de del el él en y e o u ni la las lo los le les un una unos unas con sin por para
  me mi mí te ti tu tú se sé si sí nos su sus que qué como cómo donde dónde cuando cuándo quien quién quienes
  cual cuál cuanto cuánto mas más solo sólo aun aún este esta esto estos estas ese esa eso esos esas
  aquel aquella aquello muy ya no también pero porque hoy ayer mañana aquí allí ahí acá allá ahora ahorita
  bien mal todo toda todos nada algo alguien nadie mucho mucha muchos muchas poco menos casa`;

const WORD = /[a-záéíóúüñ]+/gi;
const acuteCount = (s: string) => (s.normalize("NFD").match(/\u0301/g) ?? []).length;

function collect(phrases: Iterable<string>): Spellings {
  const known = new Set<string>();
  const byBase = new Map<string, Set<string>>();
  for (const phrase of phrases) {
    for (const raw of phrase.match(WORD) ?? []) {
      const w = raw.toLowerCase();
      known.add(w);
      const base = stripAcute(w);
      byBase.set(base, (byBase.get(base) ?? new Set()).add(w));
    }
  }
  return { known, byBase };
}

export function buildAccentLexicon(words: Iterable<string>): AccentLexicon {
  return collect([...words, FUNCTION_WORDS]);
}

// Adds an exercise's own words (its reference answers, hints) without copying the base.
export function withWords(lexicon: AccentLexicon, words: Iterable<string>): AccentLexicon {
  return { known: lexicon.known, byBase: lexicon.byBase, overlay: collect(words) };
}

// Common English words that aren't also Spanish words (so no "a", "no", "me", "he").
const ENGLISH = new Set(
  `the is are was were am be been being i you we they she it his her its our their my your this that these those
  to of and in on at for with from by not do does did have has had will would can could should what when where why
  how who which there here very just about want go going get got home tired happy party house friend friends
  as an or but if then than so all any some out up now more only also them him us mark answer correct ignore`.split(/\s+/),
);

// True for answers written in English rather than Spanish, so they can be marked
// without asking the model. Recognizing English is reliable; recognizing every Spanish
// word isn't (the word list is mostly verbs), so a Spanish answer full of new nouns
// still counts as Spanish.
export function looksEnglish(text: string) {
  const words = (text.match(/[a-z']+/gi) ?? []).map((w) => w.toLowerCase());
  if (!words.length) return false;
  return words.filter((w) => ENGLISH.has(w)).length / words.length >= 0.4;
}

// True when the model's "fix" removes an accent from a real verb form (esté → este):
// the model sometimes claims correct accents are wrong, so such claims aren't trusted.
export function removesValidAccent(wrong: string, right: string, lexicon: AccentLexicon) {
  const acutes = (s: string) => (s.normalize("NFD").match(/\u0301/g) ?? []).length;
  if (stripAcute(wrong.toLowerCase()) !== stripAcute(right.toLowerCase()) || acutes(wrong) <= acutes(right)) return false;
  return (wrong.match(WORD) ?? []).some((w) => acutes(w) > 0 && lexicon.known.has(w.toLowerCase()));
}

export type AccentFix = { word: string; fixed: string };

export function findAccentFixes(text: string, lexicon: AccentLexicon): AccentFix[] {
  const fixes: AccentFix[] = [];
  for (const word of text.match(WORD) ?? []) {
    const w = word.toLowerCase();
    if (lexicon.known.has(w) || lexicon.overlay?.known.has(w)) continue;
    const base = stripAcute(w);
    const spellings = new Set([...(lexicon.byBase.get(base) ?? []), ...(lexicon.overlay?.byBase.get(base) ?? [])]);
    if (spellings.size !== 1) continue;
    const [fixed] = spellings;
    if (acuteCount(fixed) <= acuteCount(w)) continue;
    const capitalised = word[0] !== word[0].toLowerCase();
    fixes.push({ word, fixed: capitalised ? fixed[0].toUpperCase() + fixed.slice(1) : fixed });
  }
  return fixes;
}
