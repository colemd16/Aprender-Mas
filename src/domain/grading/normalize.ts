// Comparing answers: case, spacing and punctuation never matter; accent marks matter
// but are their own kind of mistake. ñ and ü are letters, not accents, so they stay.

const PUNCTUATION = /[.,;:!?¡¿"'«»“”‘’…()\-–—]/g;
const ACUTE = /́/g;

// Trims and collapses whitespace, and drops sentence punctuation at the edges.
export function tidy(s: string) {
  return s.normalize("NFC").replace(/\s+/g, " ").trim().replace(/^[¡¿]+/, "").replace(/[.!?…]+$/, "").trim();
}

// The form two answers must share to count as the same.
export function compareKey(s: string) {
  return s.normalize("NFC").toLowerCase().replace(PUNCTUATION, " ").replace(/\s+/g, " ").trim();
}

export function stripAcute(s: string) {
  return s.normalize("NFD").replace(ACUTE, "").normalize("NFC");
}

// Same answer once accent marks are ignored.
export function accentKey(s: string) {
  return stripAcute(compareKey(s));
}

export function matchesAny(answer: string, accepted: string[]) {
  const key = compareKey(answer);
  return accepted.some((a) => compareKey(a) === key);
}

export function matchesAnyIgnoringAccents(answer: string, accepted: string[]) {
  const key = accentKey(answer);
  return accepted.find((a) => accentKey(a) === key) ?? null;
}
