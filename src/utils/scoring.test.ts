import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateAnswer, calculateExamScore, rankParticipants } from './scoring.ts';
import type { Question, LiveScoreItem } from '../types/index.ts';

test('evaluateAnswer: single choice / pilihan ganda', () => {
  const q: Question = {
    id: 'q1',
    no_urut: 1,
    tipe: 'pilihan_ganda',
    soal: 'Apa ibukota Indonesia?',
    bobot: 5,
    kunci: 'B',
    status: 'aktif',
    options: [
      { id: '1', label: 'A', teks: 'Surabaya' },
      { id: '2', label: 'B', teks: 'Nusantara' },
    ],
  };

  assert.deepEqual(evaluateAnswer(q, 'B'), { isCorrect: true, pointsEarned: 5 });
  assert.deepEqual(evaluateAnswer(q, 'b'), { isCorrect: true, pointsEarned: 5 }); // case insensitive
  assert.deepEqual(evaluateAnswer(q, 'A'), { isCorrect: false, pointsEarned: 0 });
  assert.deepEqual(evaluateAnswer(q, ''), { isCorrect: false, pointsEarned: 0 });
});

test('evaluateAnswer: complex multiple choice / pilihan ganda kompleks', () => {
  const q: Question = {
    id: 'q2',
    no_urut: 2,
    tipe: 'pilihan_ganda_kompleks',
    soal: 'Pilih bilangan prima:',
    bobot: 10,
    kunci: ['A', 'C'],
    status: 'aktif',
    options: [
      { id: '1', label: 'A', teks: '2' },
      { id: '2', label: 'B', teks: '4' },
      { id: '3', label: 'C', teks: '7' },
      { id: '4', label: 'D', teks: '9' },
    ],
  };

  assert.deepEqual(evaluateAnswer(q, ['A', 'C']), { isCorrect: true, pointsEarned: 10 });
  assert.deepEqual(evaluateAnswer(q, ['C', 'A']), { isCorrect: true, pointsEarned: 10 });
  assert.deepEqual(evaluateAnswer(q, ['A']), { isCorrect: false, pointsEarned: 0 });
  assert.deepEqual(evaluateAnswer(q, ['A', 'B']), { isCorrect: false, pointsEarned: 0 });
});

test('calculateExamScore: calculates full and partial exam results', () => {
  const questions: Question[] = [
    {
      id: 'q1',
      no_urut: 1,
      tipe: 'pilihan_ganda',
      soal: 'Soal 1',
      bobot: 10,
      kunci: 'A',
      status: 'aktif',
      options: [],
    },
    {
      id: 'q2',
      no_urut: 2,
      tipe: 'pilihan_ganda',
      soal: 'Soal 2',
      bobot: 10,
      kunci: 'C',
      status: 'aktif',
      options: [],
    },
  ];

  const result1 = calculateExamScore(questions, { q1: 'A', q2: 'C' });
  assert.equal(result1.score, 20);
  assert.equal(result1.correctCount, 2);
  assert.equal(result1.percentage, 100);

  const result2 = calculateExamScore(questions, { q1: 'A', q2: 'B' });
  assert.equal(result2.score, 10);
  assert.equal(result2.correctCount, 1);
  assert.equal(result2.incorrectCount, 1);
  assert.equal(result2.percentage, 50);
});

test('rankParticipants: orders by highest score then fastest duration', () => {
  const participants: LiveScoreItem[] = [
    {
      rank: 0,
      participant_id: 'p1',
      nama_sekolah: 'SD Bintang 1',
      gender: 'putra' as const,
      status: 'Selesai' as const,
      nilai_sementara: 80,
      nilai_final: 80,
      durasi_detik: 1200,
      waktu_mulai: '2026-10-16T10:00:00Z',
      checkpoint_terakhir: '2026-10-16T10:20:00Z',
      waktu_selesai: '2026-10-16T10:20:00Z',
      jumlah_terjawab: 20,
      total_soal: 20,
    },
    {
      rank: 0,
      participant_id: 'p2',
      nama_sekolah: 'SD Harapan Bangsa',
      gender: 'putra' as const,
      status: 'Selesai' as const,
      nilai_sementara: 90,
      nilai_final: 90,
      durasi_detik: 1500,
      waktu_mulai: '2026-10-16T10:00:00Z',
      checkpoint_terakhir: '2026-10-16T10:25:00Z',
      waktu_selesai: '2026-10-16T10:25:00Z',
      jumlah_terjawab: 20,
      total_soal: 20,
    },
    {
      rank: 0,
      participant_id: 'p3',
      nama_sekolah: 'SD Negeri Cendikia',
      gender: 'putra' as const,
      status: 'Selesai' as const,
      nilai_sementara: 90,
      nilai_final: 90,
      durasi_detik: 1100, // Tied with p2 at 90, but faster duration!
      waktu_mulai: '2026-10-16T10:00:00Z',
      checkpoint_terakhir: '2026-10-16T10:18:20Z',
      waktu_selesai: '2026-10-16T10:18:20Z',
      jumlah_terjawab: 20,
      total_soal: 20,
    },
  ];

  const ranked = rankParticipants(participants, 'durasi_tercepat');

  // p3 should be Rank 1 (90 pts in 1100s)
  assert.equal(ranked[0].participant_id, 'p3');
  assert.equal(ranked[0].rank, 1);

  // p2 should be Rank 2 (90 pts in 1500s)
  assert.equal(ranked[1].participant_id, 'p2');
  assert.equal(ranked[1].rank, 2);

  // p1 should be Rank 3 (80 pts)
  assert.equal(ranked[2].participant_id, 'p1');
  assert.equal(ranked[2].rank, 3);
});
