/** Levenshtein distance and OCR quality metrics with whitespace-normalised text. */
function distance(a: string[], b: string[]): number {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = row[0]; row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const saved = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = saved;
    }
  }
  return row[b.length];
}

const normalise = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim();
export function wordErrorRate(reference: string, hypothesis: string): number {
  const expected = normalise(reference).split(' ').filter(Boolean); const actual = normalise(hypothesis).split(' ').filter(Boolean);
  return expected.length ? distance(expected, actual) / expected.length : actual.length ? 1 : 0;
}
export function characterErrorRate(reference: string, hypothesis: string): number {
  const expected = [...normalise(reference)]; const actual = [...normalise(hypothesis)];
  return expected.length ? distance(expected, actual) / expected.length : actual.length ? 1 : 0;
}
