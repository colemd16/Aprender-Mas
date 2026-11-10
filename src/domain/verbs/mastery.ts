import type { Person } from "@/content/persons";

// The verb challenge: correct answers for a verb in a tense earn levels. Repetition is the
// point — a verb is mastered once every one of its tenses has 50 right.
export const VERB_LEVELS = [
  { at: 5, name: "Started" },
  { at: 10, name: "Familiar" },
  { at: 15, name: "Comfortable" },
  { at: 25, name: "Strong" },
  { at: 50, name: "Mastered" },
] as const;
export const MASTERED = VERB_LEVELS[VERB_LEVELS.length - 1].at;

export type VerbLevel = (typeof VERB_LEVELS)[number];

// The level a count of correct answers has reached; null below the first.
export function levelFor(correct: number): VerbLevel | null {
  return [...VERB_LEVELS].reverse().find((l) => correct >= l.at) ?? null;
}

// The next level to reach; null once mastered.
export function nextLevel(correct: number): VerbLevel | null {
  return VERB_LEVELS.find((l) => correct < l.at) ?? null;
}

// A verb is only as far along as its weakest tense.
export function verbLevel(tenseCounts: number[]): VerbLevel | null {
  return tenseCounts.length ? levelFor(Math.min(...tenseCounts)) : null;
}

// How far toward mastering every tense, 0–1 (answers past 50 in one tense don't count).
export function masteryShare(tenseCounts: number[]) {
  if (!tenseCounts.length) return 0;
  return tenseCounts.reduce((n, c) => n + Math.min(c, MASTERED), 0) / (MASTERED * tenseCounts.length);
}

export type TenseOption = { tenseId: string; persons: Person[]; correct: number };
export type VerbOption = { infinitive: string; tenses: TenseOption[] };
export type PlannedVerbCard = { infinitive: string; tenseId: string; person: Person };

type Rng = () => number;

function pickWeighted<T>(items: T[], weight: (item: T) => number, rng: Rng): T {
  const total = items.reduce((n, i) => n + weight(i), 0);
  let r = rng() * total;
  for (const item of items) {
    r -= weight(item);
    if (r < 0) return item;
  }
  return items[items.length - 1];
}

// The next cards: a random verb from the pool, then a tense leaning hard toward the ones
// with the fewest right answers (so a verb's weakest tense catches up), then a random
// person. Counts are bumped as cards are planned, so one batch spreads across tenses
// rather than hammering the single lowest; the same card never comes twice in a row.
export function planVerbCards(pool: VerbOption[], count: number, rng: Rng = Math.random, previous?: PlannedVerbCard): PlannedVerbCard[] {
  const verbs = pool
    .map((v) => ({ infinitive: v.infinitive, tenses: v.tenses.filter((t) => t.persons.length).map((t) => ({ ...t })) }))
    .filter((v) => v.tenses.length);
  const cards: PlannedVerbCard[] = [];
  if (!verbs.length) return cards;
  let last = previous;
  for (let i = 0; i < count; i++) {
    let card: PlannedVerbCard | undefined;
    for (let tries = 0; tries < 8; tries++) {
      const verb = verbs[Math.floor(rng() * verbs.length)];
      // Still to do in a tense, squared: a tense at 0 comes up far more than one at 40.
      const tense = pickWeighted(verb.tenses, (t) => (Math.max(0, MASTERED - t.correct) + 1) ** 2, rng);
      const person = tense.persons[Math.floor(rng() * tense.persons.length)];
      card = { infinitive: verb.infinitive, tenseId: tense.tenseId, person };
      const repeat = last && last.infinitive === card.infinitive && last.tenseId === card.tenseId && last.person === card.person;
      if (!repeat) {
        tense.correct++;
        break;
      }
    }
    cards.push(card!);
    last = card;
  }
  return cards;
}
