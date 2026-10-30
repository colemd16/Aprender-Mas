import { SOLID_MIN_CORRECT } from "@/domain/progress/rules";

// Decides what a practice session asks, in what order. Pure: the caller supplies the
// learner's skill states and the available exercises.

export const SESSION_SIZE = 20;
// A session stretches up to this size when that lets it finish the step.
export const SESSION_STRETCH = 25;
// …and is topped up to at least this many with the step's other skills, so a session
// that only needs one more answer still feels like practice.
export const SESSION_MINIMUM = 8;
export const CHECKPOINT_SIZE_DEFAULT = 15;
const REVIEW_SHARE = 0.3;

export type PlanSkill = { id: string; kind: "form" | "usage"; correctCount: number; solid: boolean };

// What the planner needs to know about a sentence: which skills it trains, and whether
// the learner has seen it lately.
export type PlanExercise = { id: string; skillIds: string[]; recentlySeen: boolean };

export type PlannedItem = { kind: "form"; skillId: string } | { kind: "sentence"; exerciseId: string; skillId: string };

type Rng = () => number;

function shuffle<T>(items: T[], rng: Rng) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Fresh sentences first, then ones seen lately; never the same sentence twice in a session.
function sentencePicker(exercises: PlanExercise[], rng: Rng) {
  const used = new Set<string>();
  const bySkill = new Map<string, PlanExercise[]>();
  for (const e of shuffle(exercises, rng)) for (const s of e.skillIds) bySkill.set(s, [...(bySkill.get(s) ?? []), e]);
  for (const list of bySkill.values()) list.sort((a, b) => Number(a.recentlySeen) - Number(b.recentlySeen));
  return (skillId: string) => {
    const pick = bySkill.get(skillId)?.find((e) => !used.has(e.id));
    if (pick) used.add(pick.id);
    return pick;
  };
}

// Merges per-skill sequences, keeping each one's order, never repeating the last skill
// (when avoidable) and preferring a different kind of question than the last one.
// A skill holding more than half of what's left goes first, so it isn't stranded at the
// end where it would have to repeat; otherwise alternating kinds wins, then longer queues.
function weave(sequences: PlannedItem[][], rng: Rng) {
  const queues = shuffle(sequences, rng).map((s) => [...s]).filter((s) => s.length);
  const out: PlannedItem[] = [];
  while (queues.some((q) => q.length)) {
    const last = out[out.length - 1];
    const left = queues.filter((q) => q.length);
    const remaining = left.reduce((n, q) => n + q.length, 0);
    const open = left.filter((q) => q[0].skillId !== last?.skillId);
    const pool = open.length ? open : left;
    const critical = pool.filter((q) => q.length * 2 > remaining);
    const score = (q: PlannedItem[]) => (critical.includes(q) ? 100 : 0) + (q[0].kind !== last?.kind ? 10 : 0) + q.length;
    const best = Math.max(...pool.map(score));
    const top = pool.filter((q) => score(q) === best);
    out.push(top[Math.floor(rng() * top.length)].shift()!);
  }
  return out;
}

// Spreads items out so the same skill never comes up twice in a row (when avoidable).
function interleave(items: PlannedItem[]) {
  const out: PlannedItem[] = [];
  const pool = [...items];
  while (pool.length) {
    const i = pool.findIndex((it) => it.skillId !== out[out.length - 1]?.skillId);
    out.push(...pool.splice(i === -1 ? 0 : i, 1));
  }
  return out;
}

// A learn session: the step's skills that aren't solid yet, each as often as it still
// needs correct answers, with skills due for review mixed in.
export function planLearnSession(
  stepSkills: PlanSkill[],
  reviewSkills: PlanSkill[], // due for review, most overdue first
  exercises: PlanExercise[],
  rng: Rng = Math.random,
  size = SESSION_SIZE,
): PlannedItem[] {
  const pickSentence = sentencePicker(exercises, rng);
  const itemFor = (skill: PlanSkill, nth: number): PlannedItem | null => {
    // Form skills alternate a drill with a sentence using that form; usage skills
    // can only be practiced in sentences.
    if (skill.kind === "form" && nth % 2 === 0) return { kind: "form", skillId: skill.id };
    const sentence = pickSentence(skill.id);
    if (sentence) return { kind: "sentence", exerciseId: sentence.id, skillId: skill.id };
    return skill.kind === "form" ? { kind: "form", skillId: skill.id } : null;
  };

  const targets = stepSkills.some((s) => !s.solid) ? stepSkills.filter((s) => !s.solid) : stepSkills;
  const reviewSlots = Math.min(reviewSkills.length, Math.round(size * REVIEW_SHARE));

  // Each target gets as many turns as it still needs, in order (a drill before the form
  // shows up in a sentence)…
  const sequences = targets.map((skill) =>
    Array.from({ length: Math.max(1, SOLID_MIN_CORRECT - skill.correctCount) }, (_, nth) => itemFor(skill, nth)).filter((i): i is PlannedItem => i !== null),
  );
  // If everything still needed fits in a slightly longer session, the session stretches
  // so the step can be finished in one go…
  const needed = sequences.reduce((n, s) => n + s.length, 0);
  const learnSlots = needed + reviewSlots <= Math.max(size, SESSION_STRETCH) ? Math.max(needed, size - reviewSlots) : size - reviewSlots;
  // …and when that's more than a session holds, fewer skills are practiced fully rather
  // than every skill once — so skills actually become solid. The rest come next time…
  const kept: PlannedItem[][] = [];
  let count = 0;
  for (const seq of shuffle(sequences, rng)) {
    if (count >= learnSlots) break;
    const take = seq.slice(0, learnSlots - count);
    kept.push(take);
    count += take.length;
  }
  // A short session gets extra turns from the step's other skills (sentences first)…
  const total = () => kept.reduce((n, s) => n + s.length, 0) + reviewSlots;
  const extras = shuffle(stepSkills.filter((s) => !targets.includes(s)), rng);
  for (let round = 0; total() < SESSION_MINIMUM && extras.length && round < SOLID_MIN_CORRECT; round++) {
    for (const skill of extras) {
      if (total() >= SESSION_MINIMUM) break;
      const item = itemFor(skill, round + 1);
      if (item) kept.push([item]);
    }
  }
  // …then everything is woven together so skills and kinds of question alternate.
  const learn = weave(kept, rng);

  const reviews = reviewSkills
    .slice(0, reviewSlots)
    .map((s) => itemFor(s, 1)) // reviews prefer sentences: seeing the form in context
    .filter((i): i is PlannedItem => i !== null);

  // Reviews spread evenly through the session rather than bunched at the end.
  const mixed: PlannedItem[] = [];
  const every = reviews.length ? Math.max(2, Math.floor((learn.length + reviews.length) / reviews.length)) : Infinity;
  let r = 0;
  for (const item of learn) {
    mixed.push(item);
    if (mixed.length % every === every - 1 && r < reviews.length) mixed.push(reviews[r++]);
  }
  mixed.push(...reviews.slice(r));
  return interleave(mixed);
}

// A checkpoint: mixed sentences drawn evenly from every step in the level.
export function planCheckpoint(exercisesByStep: Map<string, PlanExercise[]>, rng: Rng = Math.random, size = CHECKPOINT_SIZE_DEFAULT): PlannedItem[] {
  const queues = [...exercisesByStep.values()].map((list) =>
    shuffle(list, rng).sort((a, b) => Number(a.recentlySeen) - Number(b.recentlySeen)),
  );
  const picked: PlannedItem[] = [];
  for (let round = 0; picked.length < size && queues.some((q) => q.length > round); round++) {
    for (const q of shuffle(queues, rng)) {
      if (picked.length >= size) break;
      const e = q[round];
      if (e) picked.push({ kind: "sentence", exerciseId: e.id, skillId: e.skillIds[0] });
    }
  }
  return shuffle(picked, rng);
}
