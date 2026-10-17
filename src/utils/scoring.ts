import type { Question, LiveScoreItem, ExamStatus, Gender } from '../types/index.js';

/**
 * Calculates raw points for an answer based on question type
 */
export function evaluateAnswer(question: Question, answer: any): { isCorrect: boolean; pointsEarned: number } {
  if (answer === undefined || answer === null || answer === '') {
    return { isCorrect: false, pointsEarned: 0 };
  }

  const weight = question.bobot || 1;

  if (question.tipe === 'pilihan_ganda') {
    // Single choice string e.g. "A"
    const isCorrect = String(answer).trim().toUpperCase() === String(question.kunci).trim().toUpperCase();
    return { isCorrect, pointsEarned: isCorrect ? weight : 0 };
  }

  if (question.tipe === 'pilihan_ganda_kompleks') {
    // Array of chosen options e.g. ["A", "C"]
    const chosenArr: string[] = Array.isArray(answer) ? answer.map(x => String(x).trim().toUpperCase()) : [String(answer).trim().toUpperCase()];
    const keyArr: string[] = Array.isArray(question.kunci)
      ? question.kunci.map(x => String(x).trim().toUpperCase())
      : [String(question.kunci).trim().toUpperCase()];

    // Sort to compare
    chosenArr.sort();
    keyArr.sort();

    const isMatch = chosenArr.length === keyArr.length && chosenArr.every((val, idx) => val === keyArr[idx]);
    return { isCorrect: isMatch, pointsEarned: isMatch ? weight : 0 };
  }

  if (question.tipe === 'benar_salah') {
    // Record of statement answers, e.g. { "1": "benar", "2": "salah" }
    if (typeof answer !== 'object') {
      return { isCorrect: false, pointsEarned: 0 };
    }
    const keyObj = typeof question.kunci === 'object' && !Array.isArray(question.kunci) ? question.kunci : {};
    const keys = Object.keys(keyObj);
    if (keys.length === 0) return { isCorrect: false, pointsEarned: 0 };

    let allMatch = true;
    for (const k of keys) {
      if (String(answer[k]).toLowerCase() !== String(keyObj[k]).toLowerCase()) {
        allMatch = false;
        break;
      }
    }
    return { isCorrect: allMatch, pointsEarned: allMatch ? weight : 0 };
  }

  return { isCorrect: false, pointsEarned: 0 };
}

/**
 * Calculates total score given a set of questions and user answers
 */
export function calculateExamScore(questions: Question[], answers: Record<string, any>): {
  score: number;
  maxScore: number;
  percentage: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
} {
  let score = 0;
  let maxScore = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;

  const activeQuestions = questions.filter(q => q.status === 'aktif');

  for (const q of activeQuestions) {
    const weight = q.bobot || 1;
    maxScore += weight;

    const ans = answers[q.id];
    if (ans === undefined || ans === null || ans === '' || (Array.isArray(ans) && ans.length === 0)) {
      unansweredCount++;
    } else {
      const { isCorrect, pointsEarned } = evaluateAnswer(q, ans);
      if (isCorrect) {
        correctCount++;
        score += pointsEarned;
      } else {
        incorrectCount++;
      }
    }
  }

  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  return {
    score,
    maxScore,
    percentage,
    correctCount,
    incorrectCount,
    unansweredCount,
  };
}

/**
 * Sorts and assigns rankings to LiveScoreItems.
 * Ordering rules:
 * 1. Higher score (nilai_final if completed, otherwise nilai_sementara)
 * 2. Faster duration (durasi_detik ascending) as tie-breaker
 * 3. More answered questions
 */
export function rankParticipants(
  items: LiveScoreItem[],
  tieBreaker: 'durasi_tercepat' | 'soal_terbanyak' | 'imbang' = 'durasi_tercepat'
): LiveScoreItem[] {
  const sorted = [...items].sort((a, b) => {
    // Score comparison (using final score if completed, else temporary score)
    const scoreA = a.status === 'Selesai' && a.nilai_final !== null ? a.nilai_final : a.nilai_sementara;
    const scoreB = b.status === 'Selesai' && b.nilai_final !== null ? b.nilai_final : b.nilai_sementara;

    if (scoreB !== scoreA) {
      return scoreB - scoreA; // Descending score
    }

    // Tie-breaker
    if (tieBreaker === 'durasi_tercepat') {
      if (a.durasi_detik !== b.durasi_detik) {
        return a.durasi_detik - b.durasi_detik; // Ascending duration (faster is better)
      }
    } else if (tieBreaker === 'soal_terbanyak') {
      if (b.jumlah_terjawab !== a.jumlah_terjawab) {
        return b.jumlah_terjawab - a.jumlah_terjawab;
      }
    }

    // Secondary: completion priority
    if (a.status === 'Selesai' && b.status !== 'Selesai') return -1;
    if (b.status === 'Selesai' && a.status !== 'Selesai') return 1;

    // Alphabetical fallback
    return a.nama_sekolah.localeCompare(b.nama_sekolah);
  });

  return sorted.map((item, index) => ({
    ...item,
    rank: index + 1,
  }));
}
