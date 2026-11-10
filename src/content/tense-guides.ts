import type { TenseId } from "./tenses";

// When each tense is used, the words that call for it, and how it's built — shown in the
// verb challenge so a right answer comes with knowing when you'd say it.
// Latin American usage (no vosotros), tú-first, in an everyday Colombian voice.
//
// `frames` are cues that call for the tense: "___" is the answer, {p} the subject pronoun
// for the card's person (yo, tú, ella, nosotros, ellos) and {P} the same, capitalized.
// They must read naturally with any verb, so they only set the scene.

export type TenseGuide = {
  when: string[];
  signals: string[];
  build: string;
  example: { es: string; en: string };
  frames: string[];
};

export const TENSE_GUIDES: Record<TenseId, TenseGuide> = {
  ind_present: {
    when: [
      "Habits, routines and facts: what you usually do or what's generally true.",
      "What's going on these days, in a general sense.",
      "Plans for the near future in conversation: Mañana te llamo.",
    ],
    signals: ["todos los días", "siempre", "casi nunca", "los lunes", "normalmente"],
    build:
      "Drop -ar / -er / -ir and add the endings: -ar → o, as, a, amos, an · -er → o, es, e, emos, en · -ir → o, es, e, imos, en. Watch for stem changes (pienso, duermo, pido) and irregular yo forms (tengo, hago, salgo).",
    example: { es: "Todos los días tomo un tinto antes de trabajar.", en: "Every day I have a coffee before work." },
    frames: ["Todos los días {p} ___", "Casi siempre {p} ___"],
  },
  per_progressive_present: {
    when: ["Something in progress right now, at this very moment.", "Not for routines — for those, use the plain present."],
    signals: ["ahora", "ahorita", "en este momento"],
    build: "estar in the present (estoy, estás, está, estamos, están) + the gerund: -ar → -ando, -er / -ir → -iendo. Estoy hablando, está comiendo.",
    example: { es: "Ahorita estoy trabajando, te llamo más tarde.", en: "I'm working right now, I'll call you later." },
    frames: ["En este momento {p} ___", "Ahorita {p} ___"],
  },
  per_ir_a_present: {
    when: ["Plans and what's about to happen.", "The everyday way to talk about the future in Colombia — more common in speech than the future tense."],
    signals: ["esta noche", "mañana", "el fin de semana", "la próxima semana"],
    build: "ir in the present (voy, vas, va, vamos, van) + a + the infinitive: voy a hablar, vamos a comer.",
    example: { es: "Este fin de semana vamos a ir a la finca.", en: "This weekend we're going to go to the farm." },
    frames: ["Esta noche {p} ___", "El fin de semana {p} ___"],
  },
  ind_preterite: {
    when: [
      "Finished actions at a specific time: ayer, el año pasado.",
      "Events with a clear beginning or end, and one thing after another: llegó, comió y se fue.",
      "In Latin America, also for things that happened today: Hoy hablé con ella.",
    ],
    signals: ["ayer", "anoche", "el año pasado", "una vez", "de repente", "hace dos días"],
    build:
      "-ar → é, aste, ó, amos, aron · -er / -ir → í, iste, ió, imos, ieron. Many common verbs have irregular stems (tuv-, estuv-, hic-, dij-, pud-), and ser and ir share the same forms (fui, fuiste, fue…).",
    example: { es: "Anoche hablé con mi mamá por una hora.", en: "Last night I talked to my mom for an hour." },
    frames: ["Ayer {p} ___", "El año pasado {p} ___"],
  },
  ind_imperfect: {
    when: [
      "What used to happen: habits in the past.",
      "Background and description: how things were, what was going on, the time, someone's age.",
      "An action in progress when something else happened.",
    ],
    signals: ["antes", "siempre", "cuando era niño", "todos los veranos", "mientras"],
    build: "-ar → aba, abas, aba, ábamos, aban · -er / -ir → ía, ías, ía, íamos, ían. Only three irregulars: ser (era), ir (iba), ver (veía).",
    example: { es: "Cuando era niño, iba a Girardot todos los diciembres.", en: "When I was a kid, I used to go to Girardot every December." },
    frames: ["Antes, {p} siempre ___", "Mientras {p} ___, sonó el teléfono"],
  },
  per_progressive_imperfect: {
    when: ["An action that was in progress at a past moment — often when something else interrupted it."],
    signals: ["cuando", "en ese momento", "mientras"],
    build: "estar in the imperfect (estaba, estabas, estaba, estábamos, estaban) + the gerund: estaba hablando.",
    example: { es: "Estaba durmiendo cuando me llamaste.", en: "I was sleeping when you called me." },
    frames: ["Cuando me llamaste, {p} ___", "En ese momento {p} ___"],
  },
  per_ir_a_imperfect: {
    when: ["Plans in the past — usually ones that didn't happen.", "The future as seen from the past: Dijo que iba a llegar tarde."],
    signals: ["pero", "iba a… pero", "dijo que"],
    build: "ir in the imperfect (iba, ibas, iba, íbamos, iban) + a + the infinitive: iba a hablar.",
    example: { es: "Iba a llamarte, pero se me descargó el celular.", en: "I was going to call you, but my phone died." },
    frames: ["{P} ___, pero cambiaron los planes", "Dijeron que {p} ___"],
  },
  ind_future: {
    when: [
      "Predictions and promises: what will happen.",
      "Guessing about the present: ¿Dónde estará? — I wonder where she is.",
      "In everyday speech, plans usually use ir a + infinitive instead.",
    ],
    signals: ["mañana", "el próximo año", "algún día", "pronto"],
    build: "The whole infinitive + é, ás, á, emos, án: hablaré, comerás. Some verbs change the stem: tendr-, har-, dir-, podr-, saldr-, vendr-, sabr-, querr-.",
    example: { es: "Algún día viviré en Bogotá.", en: "Someday I'll live in Bogotá." },
    frames: ["El próximo año {p} ___", "Algún día {p} ___"],
  },
  ind_conditional: {
    when: [
      "What would happen, or what you would do: Con más plata, viajaría.",
      "Polite requests: ¿Podría ayudarme?",
      "Guessing about the past: Serían las diez — It was probably ten.",
    ],
    signals: ["con más…", "yo en tu lugar", "si tuviera…", "¿podría…?"],
    build: "The whole infinitive + ía, ías, ía, íamos, ían: hablaría, comerías. Same stem changes as the future: tendr-, har-, dir-, podr-…",
    example: { es: "Yo en tu lugar, hablaría con el jefe.", en: "If I were you, I'd talk to the boss." },
    frames: ["Con más plata, {p} ___", "Con más tiempo, {p} ___"],
  },
  ind_present_perfect: {
    when: [
      "Experience up to now: ¿Has ido a Medellín? — Have you ever been?",
      "With ya / todavía no / nunca: what has or hasn't happened yet.",
      "Colombians use it less than Spain does: for things finished at a set time (ayer, hoy, esta mañana) they use the preterite.",
    ],
    signals: ["ya", "todavía no", "nunca", "alguna vez", "últimamente"],
    build:
      "haber in the present (he, has, ha, hemos, han) + the past participle: -ar → -ado, -er / -ir → -ido. Irregular participles: hecho, dicho, visto, puesto, escrito, vuelto, abierto, roto, muerto.",
    example: { es: "¿Alguna vez has comido lechona?", en: "Have you ever eaten lechona?" },
    frames: ["Esta semana {p} ya ___", "¿Alguna vez {p} ___?"],
  },
  ind_pluperfect: {
    when: ["Something that had already happened before another past event."],
    signals: ["ya", "cuando llegué", "antes de que", "nunca antes"],
    build: "haber in the imperfect (había, habías, había, habíamos, habían) + the past participle: había hablado.",
    example: { es: "Cuando llegué, la fiesta ya había terminado.", en: "When I arrived, the party had already ended." },
    frames: ["Cuando llegaste, {p} ya ___", "Antes de esa noche, {p} nunca ___"],
  },
  ind_future_perfect: {
    when: [
      "What will have happened by a point in the future: Para el viernes ya habré terminado.",
      "Guessing about something that has probably happened: Ya habrá llegado — She's probably arrived.",
    ],
    signals: ["para el viernes", "para entonces", "ya"],
    build: "haber in the future (habré, habrás, habrá, habremos, habrán) + the past participle: habré hablado.",
    example: { es: "Para diciembre ya habré ahorrado lo del viaje.", en: "By December I'll have saved up for the trip." },
    frames: ["Para el viernes, {p} ya ___", "Para entonces, {p} ya ___"],
  },
  ind_conditional_perfect: {
    when: ["What would have happened, but didn't — often with si + hubiera: Si hubiera sabido, te habría llamado."],
    signals: ["si hubiera…", "con más tiempo", "en tu lugar"],
    build: "haber in the conditional (habría, habrías, habría, habríamos, habrían) + the past participle: habría hablado.",
    example: { es: "Con más tiempo, habríamos ido al Tolima.", en: "With more time, we would have gone to Tolima." },
    frames: ["Con más tiempo, {p} ___", "Sin esa ayuda, {p} no ___"],
  },
  sub_present: {
    when: [
      "After wanting, asking or recommending that someone else does something: Quiero que vengas.",
      "After wishes, doubt and feelings: Ojalá que…, No creo que…, Me alegra que…",
      "After cuando, para que, antes de que… when talking about the future: Cuando llegues, avísame.",
    ],
    signals: ["ojalá que", "quiero que", "es importante que", "no creo que", "cuando (future)", "para que"],
    build:
      "Start from the yo present, drop the -o and swap the vowel: -ar → e (hable, hables…), -er / -ir → a (coma, viva). Irregulars: sea, vaya, esté, dé, sepa, haya.",
    example: { es: "Ojalá que no llueva el sábado.", en: "I hope it doesn't rain on Saturday." },
    frames: ["Ojalá que {p} ___", "Es importante que {p} ___"],
  },
  sub_present_perfect: {
    when: ["The same triggers as the present subjunctive, about something that may already have happened: Espero que hayas comido."],
    signals: ["espero que", "ojalá que", "no creo que", "me alegra que"],
    build: "haber in the present subjunctive (haya, hayas, haya, hayamos, hayan) + the past participle: haya hablado.",
    example: { es: "Espero que ya hayas almorzado.", en: "I hope you've already had lunch." },
    frames: ["Ojalá que {p} ya ___", "No creo que {p} ___"],
  },
  sub_imperfect: {
    when: [
      "Imagined “if” situations: Si tuviera plata, viajaría.",
      "The present subjunctive's triggers, in the past: Quería que vinieras.",
      "como si (as if), and polite requests: Quisiera un tinto, por favor.",
    ],
    signals: ["si…", "quería que", "como si", "ojalá", "me pidió que"],
    build:
      "Take the ellos preterite, drop -ron and add -ra, -ras, -ra, -ramos, -ran: hablaron → hablara, tuvieron → tuviera. Nosotros takes an accent: habláramos. (The -se forms — hablase — mean the same.)",
    example: { es: "Si tuviera más tiempo, aprendería a bailar salsa.", en: "If I had more time, I'd learn to dance salsa." },
    frames: ["Si {p} ___, todo sería distinto", "Mi mamá quería que {p} ___"],
  },
  sub_pluperfect: {
    when: ["Past situations that didn't happen: Si hubiera sabido, te habría llamado.", "Regrets: Ojalá hubiera estudiado más."],
    signals: ["si…", "ojalá", "como si"],
    build: "haber in the imperfect subjunctive (hubiera, hubieras, hubiera, hubiéramos, hubieran) + the past participle: hubiera hablado.",
    example: { es: "Si hubiera sabido, te habría avisado.", en: "If I'd known, I would have told you." },
    frames: ["Si {p} ___, todo habría sido distinto", "Ojalá que {p} ___"],
  },
  imp_affirmative: {
    when: [
      "Telling someone to do something: tú with friends and family, usted when it's formal, ustedes for a group.",
      "Nosotros means “let's”: ¡Vamos! ¡Comamos!",
    ],
    signals: ["por favor", "ya", "ahora mismo"],
    build:
      "tú = the él/ella present (habla, come); irregular tú commands: di, haz, ve, pon, sal, sé, ten, ven. usted, ustedes and nosotros use the present subjunctive (hable, hablen, hablemos). Pronouns attach to the end: levántate, dímelo.",
    example: { es: "Pásame la sal, por favor.", en: "Pass me the salt, please." },
    frames: ["___, por favor", "Ya mismo: ___"],
  },
  imp_negative: {
    when: ["Telling someone not to do something — for every person, it's no + the present subjunctive."],
    signals: ["no", "nunca", "tampoco"],
    build: "no + the present subjunctive for everyone: no hables, no hable, no hablemos, no hablen. Pronouns go before the verb: no te levantes, no me digas.",
    example: { es: "No te preocupes, todo va a salir bien.", en: "Don't worry, everything's going to be fine." },
    frames: ["___, por favor", "Te lo pido: ___"],
  },
};

const PRONOUNS = { "1s": "yo", "2s": "tú", "3s": "ella", "1p": "nosotros", "3p": "ellos" } as const;

// A frame for a card, with the subject filled in: "Si tú ___, todo sería distinto".
export function fillFrame(frame: string, person: keyof typeof PRONOUNS) {
  const p = PRONOUNS[person];
  return frame.replaceAll("{p}", p).replaceAll("{P}", p.charAt(0).toUpperCase() + p.slice(1));
}
