# Aprender Más

A personal web app for becoming fluent in Spanish — grammar only, never vocabulary, and every answer typed or spoken (no multiple choice, no fill-in-the-blank). Latin American Spanish, tú-first, no vosotros.

- **Journey** — 9 levels, 58 steps, from *ser y estar* to *si hubiera sabido, habría estado allí*.
- **Practice** — single-form drills checked against the verb data, and full sentences graded by Claude Haiku. Corrections morph from your answer into the right one.
- **Learner model** — every attempt is stored with tagged errors; each skill has a spaced-repetition card (FSRS). A step completes when all its skills are solid; each level ends in a checkpoint.

## Stack

Next.js 16 (App Router, Cache Components) · Tailwind CSS 4 · Supabase (Postgres + Auth, RLS on every table) · Drizzle ORM · Anthropic API (`claude-haiku-5-5`) · ts-fsrs

## Setup

1. `npm install`
2. Create `.env.local`:
   ```
   DATABASE_URL=                          # Supabase → Connect → Session pooler
   NEXT_PUBLIC_SUPABASE_URL=              # Supabase → Project Settings → API Keys
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
   ANTHROPIC_API_KEY=
   ```
3. `npm run db:migrate` — creates the tables, RLS policies and the profile trigger.
4. `npm run db:seed` — loads tenses, 638 verbs (59k forms), concepts, error types and the curriculum.
5. `npm run generate:sentences` then `npm run review:sentences` — builds and quality-checks the sentence bank (a few dollars' worth of API calls at most).
6. Create your account in Supabase (Authentication → Users → Add user), then turn off sign-ups.
7. `npm run dev`

## Scripts

| Command | What it does |
|---|---|
| `npm test` | Unit tests (grading, accents, learner model, planner, generation) |
| `npm run eval:grading` | Runs the sentence grader against the eval set in `evals/grading/` (calls the API, ~1¢) |
| `npm run db:generate` | Creates a migration after editing `src/db/schema.ts` |
| `npm run db:seed` | Re-loads content after editing `src/content/` |

## Layout

```
src/content/   curriculum, concepts, error types, tenses — the course as code
src/domain/    pure logic: conjugation, grading, learner model, planner, generation
src/data/      database reads and writes (always filtered by the signed-in user)
src/app/       pages and server actions
scripts/       seed, sentence generation and review, grading eval
evals/         grading eval cases
```

Verb data: [Fred Jehle's Spanish Verb Database](https://github.com/ghidinelli/fred-jehle-spanish-verbs), CC BY-NC-SA 3.0.
