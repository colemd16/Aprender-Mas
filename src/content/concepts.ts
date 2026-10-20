// Grammar concepts: the explanations behind each step, and the usage skills they train.
// Usage skills are graded in context ("did you pick the right grammar?"), as opposed to
// form skills ("can you produce this exact form?"), which are generated from the curriculum.

export type UsageSkillDef = { id: string; title: string };

export type ConceptDef = {
  id: string;
  title: string;
  summary: string;
  explanation: string; // Markdown
  usageSkills?: UsageSkillDef[];
};

export const CONCEPTS: ConceptDef[] = [
  {
    id: "ser-uses",
    title: "Ser: what something is",
    summary: "Identity, origin, profession, characteristics, time and where events happen.",
    explanation: `**Ser** describes what something *is* — the facts that define it.

- Identity and profession: *Soy ingeniero.* *Ella es mi hermana.*
- Origin and material: *Somos de Colombia.* *La mesa es de madera.*
- Characteristics: *Él es alto y muy paciente.*
- Time and dates: *Son las tres.* *Hoy es martes.*
- Where an **event** takes place: *La fiesta es en mi casa.*`,
    usageSkills: [
      { id: "usage:ser-identity", title: "Ser for identity, origin and characteristics" },
      { id: "usage:ser-time-events", title: "Ser for time, dates and where events happen" },
    ],
  },
  {
    id: "estar-uses",
    title: "Estar: how and where something is",
    summary: "Location, conditions, emotions and states that can change.",
    explanation: `**Estar** describes how or where something *is right now*.

- Location of people and things: *Estoy en Medellín.* *Las llaves están en la mesa.*
- Conditions and emotions: *Estamos cansados.* *¿Estás bien?*
- Results of a change: *La puerta está abierta.*

A quick test: if it answers "where?" or "how is it at the moment?", use **estar**. Exception: where an *event* happens uses **ser**.`,
    usageSkills: [
      { id: "usage:estar-location", title: "Estar for location" },
      { id: "usage:estar-state", title: "Estar for conditions and emotions" },
    ],
  },
  {
    id: "haber-impersonal",
    title: "Hay: there is, there are",
    summary: "Hay, había, hubo — saying something exists.",
    explanation: `**Hay** means "there is" or "there are" — it never changes for plural: *Hay un problema.* *Hay muchas personas.*

**Hay vs estar:** *hay* introduces something new; *estar* locates something already known.
- *Hay un banco en la esquina.* — There's a bank on the corner.
- *El banco está en la esquina.* — The bank is on the corner.

In other tenses it uses the 3rd-person singular of **haber**, still never plural:
- *Había mucha gente.* — There were a lot of people (description).
- *Hubo un accidente.* — There was an accident (an event).
- *Va a haber una fiesta.* — There's going to be a party.`,
    usageSkills: [
      { id: "usage:hay-vs-estar", title: "Hay vs estar" },
      { id: "usage:habia-hubo", title: "Había vs hubo" },
    ],
  },
  {
    id: "ser-estar-meaning-change",
    title: "Adjectives that change meaning",
    summary: "Some adjectives mean different things with ser and estar.",
    explanation: `A handful of adjectives change meaning depending on the verb:

| | with ser | with estar |
|---|---|---|
| listo | clever | ready |
| aburrido | boring | bored |
| malo | bad (a bad person) | sick / gone bad |
| rico | rich | delicious |
| vivo | lively, sharp | alive |

*Es muy listo* — he's very clever. *¿Estás listo?* — are you ready?`,
    usageSkills: [{ id: "usage:ser-estar-meaning-change", title: "Adjectives that change meaning with ser/estar" }],
  },
  {
    id: "present-regular",
    title: "The present: regular verbs",
    summary: "Three patterns cover hundreds of verbs: -ar, -er and -ir.",
    explanation: `Drop the ending and add the pattern:

| | hablar | comer | vivir |
|---|---|---|---|
| yo | habl**o** | com**o** | viv**o** |
| tú | habl**as** | com**es** | viv**es** |
| él / ella / usted | habl**a** | com**e** | viv**e** |
| nosotros | habl**amos** | com**emos** | viv**imos** |
| ellos / ustedes | habl**an** | com**en** | viv**en** |`,
  },
  {
    id: "stem-changers",
    title: "Stem-changing verbs",
    summary: "The stem vowel changes in every form except nosotros.",
    explanation: `Some verbs change their stem vowel when it's stressed — every form except **nosotros**:

- e → ie: *pensar* → *pienso, piensas, piensa, pensamos, piensan*
- o → ue: *poder* → *puedo, puedes, puede, podemos, pueden*
- e → i: *pedir* → *pido, pides, pide, pedimos, piden*

Think of it as a "boot": the four forms outside nosotros change.`,
  },
  {
    id: "progressive",
    title: "Estar + gerund: what's happening now",
    summary: "Estoy hablando — for actions in progress right now.",
    explanation: `**Estar + gerund** describes an action in progress: *Estoy trabajando.* *¿Qué estás haciendo?*

- -ar → **-ando**: hablando
- -er / -ir → **-iendo**: comiendo, viviendo

Spanish uses it less than English. For habits or near-future plans, the simple present usually fits better: *Mañana trabajo* (I'm working tomorrow).`,
    usageSkills: [{ id: "usage:progressive-now", title: "Progressive for actions in progress" }],
  },
  {
    id: "ir-present",
    title: "Ir: going places",
    summary: "Voy, vas, va — one of the most irregular verbs, and one of the most used.",
    explanation: `**Ir** (to go) is irregular in the present: *voy, vas, va, vamos, van*.

It takes **a** before the destination, and *a + el* contracts to **al**:
- *Voy al trabajo.* — I'm going to work.
- *¿Adónde vas?* — Where are you going?
- *Vamos a la playa los domingos.* — We go to the beach on Sundays.`,
  },
  {
    id: "ir-a-future",
    title: "Ir a + infinitive: going to",
    summary: "Voy a ser — the everyday way to talk about plans.",
    explanation: `**ir + a + infinitive** is how most people talk about the future in conversation:

*Voy a estar en casa.* — I'm going to be home.
*Vamos a ser los primeros.* — We're going to be the first ones.

Don't forget the **a**: *voy **a** comer*, never *voy comer*.`,
    usageSkills: [{ id: "usage:ir-a-plans", title: "Ir a + infinitive for plans" }],
  },
  {
    id: "preterite",
    title: "The preterite: what happened",
    summary: "Completed actions with a clear beginning or end.",
    explanation: `The **preterite** reports something that happened and finished: *Ayer estuve en la oficina.* *Fue un día largo.*

Signals: *ayer, anoche, el año pasado, una vez, de repente*.

**Ser and ir share their preterite forms**: *fui* means both "I was" and "I went" — context tells them apart.`,
    usageSkills: [{ id: "usage:preterite-completed", title: "Preterite for completed actions" }],
  },
  {
    id: "preterite-irregular",
    title: "Irregular preterite stems",
    summary: "Tuve, hice, pude, dije — common verbs with their own stems.",
    explanation: `Many common verbs use a special stem with unaccented endings (*-e, -iste, -o, -imos, -ieron*):

- tener → **tuv**-: tuve, tuviste, tuvo
- estar → **estuv**-: estuve
- poder → **pud**-: pude
- hacer → **hic**-: hice, hizo
- querer → **quis**-: quise
- venir → **vin**-: vine
- poner → **pus**-: puse
- saber → **sup**-: supe
- decir → **dij**-: dije, dijeron (no *i* in the last one)`,
  },
  {
    id: "imperfect",
    title: "The imperfect: what was going on",
    summary: "Background, descriptions, and habits in the past.",
    explanation: `The **imperfect** paints the background: what *was happening*, what things *were like*, what you *used to do*.

- Descriptions: *La casa era grande.* *Estaba cansado.*
- Habits: *Cuando era niño, vivía en Cali.*
- Ongoing actions: *Hablábamos por teléfono.*

Only three verbs are irregular: **ser** (era), **ir** (iba), **ver** (veía).`,
    usageSkills: [
      { id: "usage:imperfect-background", title: "Imperfect for descriptions and ongoing actions" },
      { id: "usage:imperfect-habitual", title: "Imperfect for past habits (used to)" },
    ],
  },
  {
    id: "preterite-vs-imperfect",
    title: "Preterite or imperfect?",
    summary: "The event versus the background it happened in.",
    explanation: `In a story, the **imperfect** sets the scene and the **preterite** moves it forward.

*Estaba en casa cuando sonó el teléfono.* — I was home (background) when the phone rang (event).

With ser and estar the choice changes the meaning:
- *Fue difícil* — it was hard (the whole experience, now over).
- *Era difícil* — it was hard (a description of how things were).
- *Estuve enfermo una semana* — I was sick for a week (a bounded period).
- *Estaba enfermo* — I was sick (the state at that time).`,
    usageSkills: [
      { id: "usage:pret-imperf-interrupted", title: "Interrupted actions: imperfect + preterite" },
      { id: "usage:pret-imperf-ser-estar", title: "Fue/era and estuvo/estaba" },
    ],
  },
  {
    id: "past-plans",
    title: "Iba a: what you were going to do",
    summary: "Iba a ser — plans in the past, often ones that didn't happen.",
    explanation: `**ir (imperfect) + a + infinitive** describes past plans: *Iba a llamarte, pero se me olvidó.* — I was going to call you, but I forgot.

It's also how you report what someone said they would do: *Dijo que iba a estar aquí.*`,
    usageSkills: [{ id: "usage:iba-a-past-plans", title: "Iba a for past plans" }],
  },
  {
    id: "future",
    title: "The future: will",
    summary: "Seré, estaré — predictions, promises and guesses.",
    explanation: `The **simple future** adds endings to the whole infinitive: *seré, estaré, hablaré*.

In conversation it's used for predictions and promises — and for **guessing about the present**:

*¿Dónde está Ana? — Estará en el trabajo.* (She's probably at work.)

Irregular stems: tendr-, har-, podr-, dir-, querr-, sabr-, pondr-, vendr-, saldr-.`,
    usageSkills: [{ id: "usage:future-predictions", title: "Future for predictions and guesses" }],
  },
  {
    id: "conditional",
    title: "The conditional: would",
    summary: "Sería, estaría — what would happen, and polite requests.",
    explanation: `The **conditional** uses the same stems as the future with *-ía* endings: *sería, estaría, tendría*.

- Hypotheticals: *Sería increíble.* — That would be amazing.
- Politeness: *¿Podrías ayudarme?* *Me gustaría un café.*
- The future seen from the past: *Dijo que estaría aquí.*`,
    usageSkills: [
      { id: "usage:conditional-would", title: "Conditional for what would happen" },
      { id: "usage:conditional-polite", title: "Conditional for polite requests" },
    ],
  },
  {
    id: "perfect-tenses",
    title: "Perfect tenses: haber + participle",
    summary: "He sido, había estado, habré sido.",
    explanation: `Perfect tenses combine a form of **haber** with the past participle (*-ado / -ido*). The participle never changes.

- Present perfect: *He estado aquí antes.* — I have been here before.
- Pluperfect: *Ya había sido profesor.* — He had already been a teacher.
- Future perfect: *Para junio habré terminado.* — By June I will have finished.

Irregular participles to know: **hecho, dicho, visto, puesto, escrito, vuelto, abierto, muerto, roto**.`,
    usageSkills: [
      { id: "usage:present-perfect-use", title: "Present perfect for experiences and recent events" },
      { id: "usage:pluperfect-before-past", title: "Pluperfect for what had happened before" },
      { id: "usage:future-perfect-by-then", title: "Future perfect for what will have happened" },
    ],
  },
  {
    id: "conditional-perfect",
    title: "Would have: habría sido",
    summary: "What would have happened — usually under a condition.",
    explanation: `**haber (conditional) + participle** expresses what *would have* happened:

*Ella habría estado feliz.* — She would have been happy.
*Habríamos sido amigos.* — We would have been friends.

It often pairs with an *if* clause in the pluperfect subjunctive — you'll practice that in Hypotheticals.`,
    usageSkills: [{ id: "usage:would-have", title: "Conditional perfect for what would have been" }],
  },
  {
    id: "present-subjunctive",
    title: "The present subjunctive",
    summary: "Sea, esté — for wishes, emotions, doubt and the not-yet-real.",
    explanation: `The **subjunctive** appears after a trigger, usually with **que**, when the second verb isn't stated as fact.

Form: start from the yo form, drop the *-o*, and switch vowels (-ar → *e*, -er/-ir → *a*): *hablo → hable*, *tengo → tenga*.
Irregular: **sea, esté, vaya, sepa, dé, haya**.

- Wishes: *Quiero que estés aquí.*
- Emotions: *Me alegra que seas feliz.*
- Doubt: *No creo que sea verdad.*
- Future time after *cuando*: *Cuando llegues, llámame.*`,
    usageSkills: [
      { id: "usage:subj-wishes", title: "Subjunctive after wishes and requests" },
      { id: "usage:subj-emotion", title: "Subjunctive after emotions" },
      { id: "usage:subj-doubt", title: "Subjunctive after doubt and denial" },
      { id: "usage:subj-cuando-future", title: "Subjunctive after cuando for the future" },
    ],
  },
  {
    id: "imperfect-subjunctive",
    title: "The imperfect subjunctive",
    summary: "Fuera, estuviera — the subjunctive in the past.",
    explanation: `Form: take the ellos **preterite**, drop *-ron*, add *-ra*: *fueron → fuera*, *estuvieron → estuviera*, *tuvieron → tuviera*.

It's used when the trigger is in the past: *Quería que estuvieras aquí.* — I wanted you to be here.

You'll also hear the *-se* form (*fuese, estuviese*). It means the same thing.`,
    usageSkills: [{ id: "usage:subj-past-triggers", title: "Imperfect subjunctive after past triggers" }],
  },
  {
    id: "si-clauses",
    title: "If clauses: si fuera…, sería…",
    summary: "Hypotheticals about the present and the past.",
    explanation: `**Unlikely or imaginary now:** si + imperfect subjunctive, then conditional.
*Si fuera rico, estaría en la playa.* — If I were rich, I'd be at the beach.

**Didn't happen in the past:** si + pluperfect subjunctive, then conditional perfect.
*Si hubiera sabido, habría estado allí.* — If I had known, I would have been there.

Never put the conditional right after **si**: *si sería* is always wrong.`,
    usageSkills: [
      { id: "usage:si-hypothetical-present", title: "Si + imperfect subjunctive, conditional" },
      { id: "usage:si-hypothetical-past", title: "Si + pluperfect subjunctive, conditional perfect" },
    ],
  },
  {
    id: "commands",
    title: "Commands: tú and ustedes",
    summary: "Habla, no hables, hablen — telling people what to do.",
    explanation: `- **Tú, affirmative:** same as the él form of the present: *habla, come, escribe*.
- **Tú, negative:** the subjunctive: *no hables, no comas*.
- **Ustedes:** the subjunctive, affirmative or negative: *hablen, no hablen*.

Irregular tú commands: **ven, di, sal, haz, ten, ve, pon, sé**.`,
    usageSkills: [{ id: "usage:commands-tu-ustedes", title: "Tú and ustedes commands" }],
  },
  {
    id: "object-pronouns",
    title: "Object pronouns",
    summary: "Lo, la, le, se lo — and where they go.",
    explanation: `- **Direct** (what?): *lo, la, los, las* — *¿El libro? Lo tengo.*
- **Indirect** (to whom?): *le, les* — *Le dije la verdad.*
- Both together, **le/les become se**: *Se lo dije.*

Placement: before a conjugated verb (*lo veo*), or attached to an infinitive, gerund or affirmative command (*voy a verlo, estoy haciéndolo, dímelo*).`,
    usageSkills: [
      { id: "usage:direct-object-pronouns", title: "Direct object pronouns" },
      { id: "usage:indirect-object-pronouns", title: "Indirect object pronouns" },
      { id: "usage:pronoun-placement", title: "Pronoun placement" },
    ],
  },
  {
    id: "reflexives",
    title: "Reflexive verbs",
    summary: "Me levanto, te acuerdas — when the action comes back to the subject.",
    explanation: `Reflexive verbs carry a pronoun that matches the subject: *me levanto, te levantas, se levanta, nos levantamos, se levantan*.

Some change meaning when reflexive: *ir* (to go) vs **irse** (to leave), *dormir* (to sleep) vs **dormirse** (to fall asleep), *acordar* (to agree) vs **acordarse** (to remember).`,
    usageSkills: [{ id: "usage:reflexive-verbs", title: "Reflexive verbs" }],
  },
  {
    id: "por-para",
    title: "Por or para?",
    summary: "Cause and path versus purpose and destination.",
    explanation: `- **Para** points forward: purpose, destination, deadline, recipient. *Es para ti.* *Estudio para aprender.* *Para el lunes.*
- **Por** looks at cause and path: reason, exchange, duration, through. *Gracias por todo.* *Pasé por el parque.* *Lo compré por diez mil pesos.*`,
    usageSkills: [{ id: "usage:por-para", title: "Por vs para" }],
  },
];
