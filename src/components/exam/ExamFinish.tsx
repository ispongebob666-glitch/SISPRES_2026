import React from 'react';
import { Award, CheckCircle2, Clock, Tv, LogOut, FileCheck } from 'lucide-react';
import type { Exam, Participant } from '../../types/index.ts';

interface ExamFinishProps {
  exam: Exam;
  participant: Participant;
  onGoToLiveScore: () => void;
  onLogout: () => void;
  showScore?: boolean;
}

export const ExamFinish: React.FC<ExamFinishProps> = ({
  exam,
  participant,
  onGoToLiveScore,
  onLogout,
  showScore = true,
}) => {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins} menit ${secs} detik`;
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 bg-slate-50">
      <div className="max-w-lg w-full bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden text-center">
        {/* Banner */}
        <div className="bg-gradient-to-br from-emerald-800 via-emerald-700 to-emerald-900 p-8 text-white relative">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-amber-300 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Award className="w-8 h-8" />
          </div>
          <span className="inline-block px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-400/40 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
            Lomba Selesai
          </span>
          <h2 className="text-2xl font-black tracking-tight">Terima Kasih, Peserta!</h2>
          <p className="mt-1 text-emerald-100 text-xs sm:text-sm font-medium">
            Jawaban Anda telah tersimpan dan terverifikasi secara permanen.
          </p>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Identity Card */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 text-left space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-semibold">Nama Peserta</span>
              <span className="text-xs font-bold text-slate-900">{participant.nama}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-semibold">Kategori</span>
              <span className="text-xs font-bold text-emerald-700 uppercase">
                {participant.gender === 'putra' ? 'Kategori Putra' : 'Kategori Putri'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-semibold">Waktu Selesai</span>
              <span className="text-xs font-mono font-bold text-slate-800">
                {exam.waktu_selesai ? new Date(exam.waktu_selesai).toLocaleTimeString() : '-'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-semibold">Durasi Pengerjaan</span>
              <span className="text-xs font-bold text-slate-800">
                {formatDuration(exam.durasi_detik || 0)}
              </span>
            </div>
          </div>

          {/* Score card (if enabled) */}
          {showScore && exam.nilai_final !== null && (
            <div className="bg-gradient-to-br from-emerald-50 to-amber-50 rounded-2xl p-5 border border-emerald-200 text-center">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                Nilai Akhir
              </span>
              <div className="text-4xl font-black text-emerald-800 font-mono tracking-tight">
                {exam.nilai_final}
              </div>
              <p className="mt-1 text-[11px] text-slate-500 font-medium">
                Dari total {exam.total_soal} butir soal pilihan ganda
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={onGoToLiveScore}
              className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Tv className="w-4 h-4 text-amber-300" />
              <span>Lihat Posisi Sekolah di Papan Live Score</span>
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar dari Sesi</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
