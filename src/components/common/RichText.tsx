import React from 'react';
import { splitFractions } from '../../utils/richText.ts';

interface RichTextProps {
  text?: string | null;
  className?: string;
  /** true (bawaan): baris baru pada teks dipertahankan. false: untuk tampilan satu baris/terpotong. */
  multiline?: boolean;
}

/**
 * Menampilkan teks soal/opsi dengan:
 *  - baris baru yang dipertahankan (sebelumnya tergabung jadi satu paragraf)
 *  - pecahan seperti 1/2 tampil bertingkat (angka atas, garis, angka bawah)
 */
export const RichText: React.FC<RichTextProps> = ({ text, className = '', multiline = true }) => {
  const parts = splitFractions(text || '');
  return (
    <span className={`${multiline ? 'whitespace-pre-line' : ''} ${className}`.trim()}>
      {parts.map((p, i) =>
        typeof p === 'string' ? (
          <React.Fragment key={i}>{p}</React.Fragment>
        ) : (
          <span
            key={i}
            role="math"
            aria-label={`${p.num} per ${p.den}`}
            className="inline-flex flex-col items-center align-middle mx-0.5 text-[0.85em] leading-[1.15] font-bold tabular-nums"
          >
            <span className="px-0.5 border-b border-current">{p.num}</span>
            <span className="px-0.5">{p.den}</span>
          </span>
        )
      )}
    </span>
  );
};
