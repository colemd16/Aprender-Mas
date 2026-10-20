import { tidy } from "./normalize";

// A letter-by-letter diff from the learner's answer to the corrected one — the data
// behind the morphing correction. "accent" is a letter that only gained or lost an accent.
export type DiffOp = { op: "same" | "insert" | "delete" | "accent"; char: string };

const base = (c: string) => c.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export function diffAnswer(answer: string, corrected: string): DiffOp[] {
  const a = Array.from(tidy(answer));
  const b = Array.from(tidy(corrected));
  const n = a.length;
  const m = b.length;

  // lcs[i][j] = length of the longest common subsequence of a[i..] and b[j..]
  const lcs = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = same(a[i], b[j]) ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && same(a[i], b[j])) {
      ops.push({ op: "same", char: b[j] });
      i++;
      j++;
    } else if (i < n && j < m && base(a[i]) === base(b[j]) && lcs[i + 1][j + 1] >= Math.max(lcs[i + 1][j], lcs[i][j + 1])) {
      ops.push({ op: "accent", char: b[j] });
      i++;
      j++;
    } else if (i < n && (j >= m || lcs[i + 1][j] >= lcs[i][j + 1])) {
      ops.push({ op: "delete", char: a[i] });
      i++;
    } else {
      ops.push({ op: "insert", char: b[j] });
      j++;
    }
  }
  return ops;
}
