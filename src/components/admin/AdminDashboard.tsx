import React, { useState, useEffect } from 'react';
import {
  Users,
  FileQuestion,
  Award,
  School,
  Play,
  Square,
  Tv,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Sparkles,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import type { CompetitionSettings } from '../../types/index.ts';

interface AdminDashboardProps {
  onNavigateTab: (tab: any) => void;
  onOpenLiveScore: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigateTab, onOpenLiveScore }) => {
  const [overview, setOverview] = useState<any>(null);
  const [settings, setSettings] = useState<CompetitionSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ovData, setData] = await Promise.all([
        api.getAdminOverview(),
        api.getSettings(),
      ]);
      setOverview(ovData);
      setSettings(setData);
    } catch (err) {
      console.error('Gagal memuat overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateSetting = async (key: keyof CompetitionSettings, val: any) => {
    if (!settings) return;
    try {
      setUpdating(true);
      const updated = await api.updateSettings({ [key]: val });
      setSettings(updated);
    } catch (err: any) {
      alert(err.message || 'Gagal memperbarui pengaturan.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading || !overview) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title & Status */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Dashboard Utama SISPRES
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Pantau statistik satu event lomba, kontrol status sesi, dan live score secara real-time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenLiveScore}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold text-xs shadow-md shadow-amber-600/20 flex items-center gap-2 cursor-pointer transition-all"
          >
            <Tv className="w-4 h-4" />
            <span>Layar Live Score</span>
          </button>
        </div>
      </div>

      {/* QUICK STATUS SWITCHES BANNER */}
      {settings && (
        <div className="bg-gradient-to-r from-slate-900 to-emerald-950 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300">
                Kontrol Lomba Langsung
              </span>
              <h3 className="text-base font-extrabold text-white mt-0.5">
                Status Acara: <span className="uppercase text-amber-300">{settings.status_lomba}</span>
              </h3>
              <p className="text-xs text-slate-300 mt-1 max-w-md">
                Ubah status event lomba secara instan untuk seluruh peserta dan layar Live Score.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Status Lomba Button Group */}
              <div className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => handleUpdateSetting('status_lomba', 'belum_mulai')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    settings.status_lomba === 'belum_mulai' ? 'bg-slate-700 text-amber-300 shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Belum Mulai
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateSetting('status_lomba', 'berlangsung')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    settings.status_lomba === 'berlangsung' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Berlangsung
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateSetting('status_lomba', 'selesai')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    settings.status_lomba === 'selesai' ? 'bg-rose-700 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Selesai
                </button>
              </div>

              {/* Mode Hasil Akhir Toggle */}
              <button
                type="button"
                onClick={() => handleUpdateSetting('mode_hasil_akhir', !settings.mode_hasil_akhir)}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold border flex items-center gap-2 transition-all cursor-pointer ${
                  settings.mode_hasil_akhir
                    ? 'bg-amber-400 border-amber-300 text-amber-950 shadow-md'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Mode Hasil Akhir: {settings.mode_hasil_akhir ? 'AKTIF (Podium Juara)' : 'OFF'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4 CORE STATS GRIDS - FULL COLOR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* PESERTA STATS (Vibrant Blue/Indigo) */}
        <div
          onClick={() => onNavigateTab('participants')}
          className="bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 text-white rounded-3xl p-5 shadow-xl shadow-blue-600/25 hover:scale-[1.02] transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between mb-3 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold border border-white/30 shadow-inner">
              <Users className="w-6 h-6 text-white" />
            </div>
            <span className="text-3xl font-black font-mono text-white drop-shadow-sm">
              {overview.peserta.total}
            </span>
          </div>
          <h4 className="text-xs font-black text-blue-100 uppercase tracking-wider relative z-10">
            TOTAL PESERTA
          </h4>
          <div className="mt-3 pt-3 border-t border-white/20 space-y-1.5 text-xs relative z-10 font-bold">
            <div className="flex justify-between text-blue-100">
              <span>Belum Mulai:</span>
              <strong className="text-white bg-black/20 px-2 py-0.5 rounded-full">{overview.peserta.belum_mulai}</strong>
            </div>
            <div className="flex justify-between text-amber-200">
              <span>Sedang Mengerjakan:</span>
              <strong className="text-amber-300 bg-black/20 px-2 py-0.5 rounded-full">{overview.peserta.sedang_mengerjakan}</strong>
            </div>
            <div className="flex justify-between text-emerald-200">
              <span>Selesai:</span>
              <strong className="text-emerald-300 bg-black/20 px-2 py-0.5 rounded-full">{overview.peserta.selesai}</strong>
            </div>
          </div>
        </div>

        {/* SOAL STATS (Vibrant Amber/Orange) */}
        <div
          onClick={() => onNavigateTab('questions')}
          className="bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 text-white rounded-3xl p-5 shadow-xl shadow-amber-500/25 hover:scale-[1.02] transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between mb-3 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold border border-white/30 shadow-inner">
              <FileQuestion className="w-6 h-6 text-white" />
            </div>
            <span className="text-3xl font-black font-mono text-white drop-shadow-sm">
              {overview.soal.total}
            </span>
          </div>
          <h4 className="text-xs font-black text-amber-100 uppercase tracking-wider relative z-10">
            BANK SOAL (PILIHAN GANDA)
          </h4>
          <div className="mt-3 pt-3 border-t border-white/20 space-y-1.5 text-xs relative z-10 font-bold">
            <div className="flex justify-between text-amber-100">
              <span>Soal Aktif:</span>
              <strong className="text-white bg-black/20 px-2 py-0.5 rounded-full">{overview.soal.aktif}</strong>
            </div>
            <div className="flex justify-between text-amber-200">
              <span>Soal Nonaktif:</span>
              <strong className="text-white/80 bg-black/20 px-2 py-0.5 rounded-full">{overview.soal.nonaktif}</strong>
            </div>
            <div className="flex justify-between text-yellow-100">
              <span>Format:</span>
              <strong className="text-yellow-200">100% Pilihan Ganda</strong>
            </div>
          </div>
        </div>

        {/* HASIL STATS (Vibrant Emerald/Teal) */}
        <div
          onClick={() => onNavigateTab('results')}
          className="bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-3xl p-5 shadow-xl shadow-emerald-600/25 hover:scale-[1.02] transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between mb-3 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold border border-white/30 shadow-inner">
              <Award className="w-6 h-6 text-amber-300" />
            </div>
            <span className="text-3xl font-black font-mono text-amber-200 drop-shadow-sm">
              {overview.hasil.nilai_rata_rata}
            </span>
          </div>
          <h4 className="text-xs font-black text-emerald-100 uppercase tracking-wider relative z-10">
            NILAI RATA-RATA
          </h4>
          <div className="mt-3 pt-3 border-t border-white/20 space-y-1.5 text-xs relative z-10 font-bold">
            <div className="flex justify-between text-amber-200">
              <span>Tertinggi:</span>
              <strong className="text-amber-300 bg-black/20 px-2 py-0.5 rounded-full">{overview.hasil.nilai_tertinggi}</strong>
            </div>
            <div className="flex justify-between text-rose-200">
              <span>Terendah:</span>
              <strong className="text-rose-100 bg-black/20 px-2 py-0.5 rounded-full">{overview.hasil.nilai_terendah}</strong>
            </div>
            <div className="flex justify-between text-teal-100">
              <span>Rata-Rata:</span>
              <strong className="text-white bg-black/20 px-2 py-0.5 rounded-full">{overview.hasil.nilai_rata_rata}</strong>
            </div>
          </div>
        </div>

        {/* SEKOLAH STATS (Vibrant Purple/Violet) */}
        <div
          onClick={() => onNavigateTab('participants')}
          className="bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-700 text-white rounded-3xl p-5 shadow-xl shadow-purple-600/25 hover:scale-[1.02] transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between mb-3 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold border border-white/30 shadow-inner">
              <School className="w-6 h-6 text-white" />
            </div>
            <span className="text-3xl font-black font-mono text-white drop-shadow-sm">
              {overview.sekolah.total}
            </span>
          </div>
          <h4 className="text-xs font-black text-purple-100 uppercase tracking-wider relative z-10">
            SEKOLAH TERDAFTAR
          </h4>
          <div className="mt-3 pt-3 border-t border-white/20 space-y-1.5 text-xs relative z-10 font-bold">
            <div className="flex justify-between text-purple-100">
              <span>Total Sekolah:</span>
              <strong className="text-white bg-black/20 px-2 py-0.5 rounded-full">{overview.sekolah.total}</strong>
            </div>
            <div className="flex justify-between text-cyan-200">
              <span>Kategori Putra:</span>
              <strong className="text-cyan-100 bg-black/20 px-2 py-0.5 rounded-full">{Math.floor(overview.sekolah.jumlah_peserta / 2)}</strong>
            </div>
            <div className="flex justify-between text-pink-200">
              <span>Kategori Putri:</span>
              <strong className="text-pink-100 bg-black/20 px-2 py-0.5 rounded-full">{Math.ceil(overview.sekolah.jumlah_peserta / 2)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS BANNER */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <h5 className="text-xs font-bold text-slate-800 mb-1">Papan Live Score</h5>
          <p className="text-xs text-slate-500 mb-3">
            Buka tampilan proyektor / TV dengan pembaruan otomatis setiap 10 detik.
          </p>
          <button
            type="button"
            onClick={onOpenLiveScore}
            className="w-full py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200 flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <Tv className="w-4 h-4 text-emerald-700" />
            <span>Tampilkan di Layar Panggung</span>
          </button>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <h5 className="text-xs font-bold text-slate-800 mb-1">Manajemen Peserta</h5>
          <p className="text-xs text-slate-500 mb-3">
            Atur data 2 peserta per sekolah, reset password atau reset lomba.
          </p>
          <button
            type="button"
            onClick={() => onNavigateTab('participants')}
            className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-200 flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <Users className="w-4 h-4" />
            <span>Kelola Daftar Peserta</span>
          </button>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <h5 className="text-xs font-bold text-slate-800 mb-1">Sinkronisasi Cloud</h5>
          <p className="text-xs text-slate-500 mb-3">
            Koneksikan ke Supabase secara real-time dan backup commit ke GitHub.
          </p>
          <button
            type="button"
            onClick={() => onNavigateTab('settings')}
            className="w-full py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs border border-amber-200 flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>Konfigurasi Supabase / GitHub</span>
          </button>
        </div>
      </div>
    </div>
  );
};
