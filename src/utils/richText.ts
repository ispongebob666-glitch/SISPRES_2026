// Pemecah teks soal: mengenali pecahan sederhana (mis. 1/2, 3/4) agar bisa
// ditampilkan sebagai pecahan bertingkat. Murni string, tanpa React, jadi mudah diuji.

export type RichPart = string | { num: string; den: string };

const isDigit = (c: string | undefined) => c !== undefined && c >= '0' && c <= '9';

/**
 * Aturan:
 *  - "1/2" dan "12/5" menjadi pecahan.
 *  - Tanggal / rantai garis miring ("17/10/2026", "1/2/3") dibiarkan apa adanya.
 *  - Angka desimal ("0,5/2", "1/2.5") dibiarkan apa adanya.
 *  - Tulis "\1/2" (garis miring terbalik di depan) agar tetap tampil sebagai "1/2" biasa.
 *  - "km/jam", "dan/atau" tidak terpengaruh karena bukan angka/angka.
 */
export function splitFractions(text: string): RichPart[] {
  const parts: RichPart[] = [];
  const re = /(\d+)\/(\d+)/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(text)) !== null) {
    const start = m.index;
    const end = start + m[0].length;
    const before = start > 0 ? text[start - 1] : undefined;
    const after = end < text.length ? text[end] : undefined;

    // rantai garis miring (tanggal, dsb.)
    if (before === '/' || after === '/') continue;

    // desimal di salah satu sisi
    const decimalBefore = (before === '.' || before === ',') && isDigit(text[start - 2]);
    const decimalAfter = (after === '.' || after === ',') && isDigit(text[end + 1]);
    if (decimalBefore || decimalAfter) continue;

    // escape: \1/2 -> tampil "1/2" biasa
    if (before === '\\') {
      parts.push(text.slice(last, start - 1) + m[0]);
      last = end;
      continue;
    }

    if (start > last) parts.push(text.slice(last, start));
    parts.push({ num: m[1], den: m[2] });
    last = end;
  }

  if (last < text.length) parts.push(text.slice(last));

  // gabungkan potongan teks yang bersebelahan
  const merged: RichPart[] = [];
  for (const p of parts) {
    const prev = merged[merged.length - 1];
    if (typeof p === 'string' && typeof prev === 'string') merged[merged.length - 1] = prev + p;
    else merged.push(p);
  }
  return merged;
}
