import type { TenseId } from "./tenses";

// Verbs that don't fit the one-form-per-person drill. Most verbs can stand alone in a
// sentence, in every person and tense; these can't, so their cards are built differently.
//
// - impersonalOnly: tenses where the verb only has its no-subject use. Only the 3rd-person
//   singular is kept (hubo, va a haber); "voy a haber" or "yo he habido" aren't Spanish.
// - impersonal: no-subject cards, cued in English with no person: "there is" → hay. Each
//   impersonalOnly tense needs one, and its form must be the 3rd-person singular.
//   `plural` is the classic slip (hubieron for hubo), caught with its own explanation.
// - auxiliary: tenses where the verb is a helper before a participle (has comido). Cards
//   say the participle in both the English cue and the Spanish frame.
//
// Frames work like the tense guides': "___" is the answer, {p} / {P} the card's subject.

export type ImpersonalForm = { form: string; plural: string; english: string; frames: string[] };
export type AuxiliaryFrame = { text: string; participle: string }; // participle in English: "eaten"

export type VerbUsage = {
  impersonalOnly?: TenseId[];
  impersonal?: Partial<Record<TenseId, ImpersonalForm>>;
  auxiliary?: Partial<Record<TenseId, AuxiliaryFrame[]>>;
};

export const VERB_USAGE: Record<string, VerbUsage> = {
  haber: {
    // Personal preterite (hube, hubiste) is the archaic pretérito anterior, and haber can't
    // be its own helper (yo he habido), so these only exist as "there was / has been".
    impersonalOnly: [
      "ind_preterite",
      "per_ir_a_present",
      "per_ir_a_imperfect",
      "ind_present_perfect",
      "ind_pluperfect",
      "ind_future_perfect",
      "ind_conditional_perfect",
      "sub_present_perfect",
      "sub_pluperfect",
    ],
    impersonal: {
      ind_present: {
        form: "hay",
        plural: "han",
        english: "there is / there are",
        frames: ["En mi barrio ___ una panadería nueva", "¿___ algo de comer en la casa?"],
      },
      ind_preterite: {
        form: "hubo",
        plural: "hubieron",
        english: "there was (at one moment)",
        frames: ["Anoche ___ un accidente en la autopista", "Ayer ___ una reunión en la oficina"],
      },
      ind_imperfect: {
        form: "había",
        plural: "habían",
        english: "there was / there used to be",
        frames: ["Antes ___ más árboles en el parque", "Cuando era niño, ___ una tienda en la esquina"],
      },
      per_ir_a_present: {
        form: "va a haber",
        plural: "van a haber",
        english: "there's going to be",
        frames: ["Esta noche ___ una fiesta en la finca", "Mañana ___ mucho tráfico"],
      },
      per_ir_a_imperfect: {
        form: "iba a haber",
        plural: "iban a haber",
        english: "there was going to be",
        frames: ["___ una fiesta, pero la cancelaron", "Dijeron que ___ tormenta"],
      },
      ind_future: {
        form: "habrá",
        plural: "habrán",
        english: "there will be",
        frames: ["El próximo año ___ elecciones", "Algún día ___ metro en Bogotá"],
      },
      ind_conditional: {
        form: "habría",
        plural: "habrían",
        english: "there would be",
        frames: ["Con más plata, ___ más colegios", "Sin la lluvia, ___ más gente"],
      },
      ind_present_perfect: {
        form: "ha habido",
        plural: "han habido",
        english: "there has been / there have been",
        frames: ["Este año ___ muchos cambios", "Hoy ___ mucho tráfico"],
      },
      ind_pluperfect: {
        form: "había habido",
        plural: "habían habido",
        english: "there had been",
        frames: ["Antes de esa noche, nunca ___ tanta gente aquí", "Cuando llegamos, ya ___ un problema"],
      },
      ind_future_perfect: {
        form: "habrá habido",
        plural: "habrán habido",
        english: "there will have been",
        frames: ["Para el viernes, ya ___ tres reuniones", "Para entonces, ya ___ elecciones"],
      },
      ind_conditional_perfect: {
        form: "habría habido",
        plural: "habrían habido",
        english: "there would have been",
        frames: ["Sin la lluvia, ___ más gente", "Con más tiempo, ___ una solución"],
      },
      sub_present_perfect: {
        form: "haya habido",
        plural: "hayan habido",
        english: "(that) there has been",
        frames: ["Ojalá que no ___ problemas", "No creo que ___ un error"],
      },
      sub_pluperfect: {
        form: "hubiera habido",
        plural: "hubieran habido",
        english: "(if) there had been",
        frames: ["Si ___ más tiempo, todo habría sido distinto", "Ojalá que ___ más gente"],
      },
    },
    auxiliary: {
      ind_present: [
        { text: "{P} ya ___ comido", participle: "eaten" },
        { text: "¿Alguna vez {p} ___ estado en Cartagena?", participle: "been" },
      ],
      ind_imperfect: [
        { text: "Cuando sonó el teléfono, {p} ya ___ salido", participle: "left" },
        { text: "Antes de esa noche, {p} nunca ___ bailado salsa", participle: "danced" },
      ],
      ind_future: [
        { text: "Para el viernes, {p} ya ___ terminado", participle: "finished" },
        { text: "Para entonces, {p} ya ___ llegado", participle: "arrived" },
      ],
      ind_conditional: [
        { text: "Con más tiempo, {p} ___ terminado", participle: "finished" },
        { text: "Sin esa ayuda, {p} no ___ llegado", participle: "arrived" },
      ],
      sub_present: [
        { text: "Ojalá que {p} ya ___ comido", participle: "eaten" },
        { text: "No creo que {p} ___ terminado", participle: "finished" },
      ],
      sub_imperfect: [
        { text: "Si {p} ___ llegado antes, todo habría sido distinto", participle: "arrived" },
        { text: "Ojalá que {p} ___ venido", participle: "come" },
      ],
    },
  },
};
