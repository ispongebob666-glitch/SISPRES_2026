import React, { useState, useEffect, useRef } from 'react';
import {
  Trophy,
  Award,
  Clock,
  RefreshCw,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Tv,
  Sparkles,
  Medal,
  Activity,
  Layers,
  ChevronDown,
  Shield,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import type { LiveScoreBoard, LiveScoreItem, Gender } from '../../types/index.ts';

interface LiveScoreViewProps {
  onBack?: () => void;
  onOpenAdmin?: () => void;
  isOperator?: boolean;
}

export const LiveScoreView: React.FC<LiveScoreViewProps> = ({ onBack, onOpenAdmin, isOperator }) => {
  const [boardData, setBoardData] = useState<LiveScoreBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState<number>(10);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewTab, setViewTab] = useState<'both' | 'putra' | 'putri'>('both');
  const [lastFetchTime, setLastFetchTime] = useState<string>('');
  const [settings, setSettings] = useState<any>(null);

  const intervalRef = useRef<any>(null);
  const countdownRef = useRef<any>(null);

  // Fetch live score data from server
  const fetchScores = async (isManual = false) => {
    try {
      const [data, setts] = await Promise.all([
        api.getLiveScore(),
        settings ? Promise.resolve(settings) : api.getPublicSettings(),
      ]);
      setBoardData(data);
      if (!settings) setSettings(setts);
      setLastFetchTime(new Date().toLocaleTimeString());
      setCountdown(data.interval_livescore_detik || 10);
    } catch (err) {
      console.error('Gagal mengambil data live score:', err);
    } finally {
      if (isManual) setLoading(false);
    }
  };

  useEffect(() => {
    fetchScores(true);

    // Countdown interval (ticks every 1s)
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          fetchScores(false);
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(() => {});
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(() => {});
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Render Rank Badge with Trophy styling
  const renderRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-amber-950 flex items-center justify-center font-black text-sm shadow-md ring-2 ring-amber-300/60">
          <Trophy className="w-4 h-4 text-amber-950" />
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-300 to-slate-100 text-slate-800 flex items-center justify-center font-black text-sm shadow-md ring-2 ring-slate-300">
          <Medal className="w-4 h-4 text-slate-700" />
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-700 to-amber-600 text-amber-100 flex items-center justify-center font-black text-sm shadow-md ring-2 ring-amber-700/60">
          <Medal className="w-4 h-4 text-amber-200" />
        </div>
      );
    }
    return (
      <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 border border-slate-300 flex items-center justify-center font-bold text-sm">
        #{rank}
      </div>
    );
  };

  // Render Status Badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'Sedang Mengerjakan':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            <span>Mengerjakan</span>
          </span>
        );
      case 'Selesai':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Selesai</span>
          </span>
        );
      case 'Waktu Habis':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-200 text-slate-700 border border-slate-300">
            <span>Waktu Habis</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
            <span>Belum Mulai</span>
          </span>
        );
    }
  };

  // Render Single Scoreboard Section (Putra or Putri)
  const renderBoardColumn = (title: string, gender: Gender, items: LiveScoreItem[]) => {
    const isPutra = gender === 'putra';
    const topThree = items.slice(0, 3);
    const modeHasilAkhir = boardData?.mode_hasil_akhir;

    return (
      <div className="flex-1 flex flex-col bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden min-w-[340px]">
        {/* Column Header */}
        <div className={`p-5 text-white flex items-center justify-between ${
          isPutra
            ? 'bg-gradient-to-r from-emerald-800 via-emerald-700 to-emerald-900'
            : 'bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center font-black text-xl text-amber-300 shadow-md">
              {isPutra ? '👦' : '👧'}
            </div>
            <div>
              <h2 className="font-extrabold text-lg sm:text-xl tracking-tight flex items-center gap-2">
                <span>{title}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 font-bold uppercase tracking-wider">
                  {items.length} Sekolah
                </span>
              </h2>
              <p className="text-xs text-emerald-200">
                Peringkat Berdasarkan Nilai &amp; Durasi
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200 block">
              Selesai
            </span>
            <span className="text-sm font-mono font-bold text-amber-300">
              {items.filter(i => i.status === 'Selesai' || i.status === 'Waktu Habis').length} / {items.length}
            </span>
          </div>
        </div>

        {/* TOP 3 PODIUM CARDS (Highlighted in Mode Hasil Akhir or on top) */}
        {modeHasilAkhir && topThree.length > 0 && (
          <div className="p-4 bg-gradient-to-b from-amber-50/70 to-white border-b border-amber-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Podium Juara {title}</span>
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                Resmi Final
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              {topThree.map((item, idx) => (
                <div
                  key={item.participant_id}
                  className={`p-3 rounded-2xl border transition-all ${
                    idx === 0
                      ? 'bg-amber-100/80 border-amber-300 shadow-md ring-2 ring-amber-400/40 order-2'
                      : idx === 1
                      ? 'bg-slate-100 border-slate-300 shadow-xs order-1'
                      : 'bg-amber-50/80 border-amber-200 shadow-xs order-3'
                  }`}
                >
                  <div className="text-2xl mb-1">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                  </div>
                  <div className="text-xs font-black text-slate-900 truncate" title={item.nama_sekolah}>
                    {item.nama_sekolah}
                  </div>
                  <div className="text-base font-black font-mono text-emerald-800 mt-1">
                    {item.nilai_final ?? item.nilai_sementara}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    {formatDuration(item.durasi_detik)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ALL PARTICIPATING SCHOOLS TABLE */}
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-3 text-center w-14">Rank</th>
                <th className="py-3 px-3">Nama Sekolah</th>
                <th className="py-3 px-3 text-center w-24">Nilai</th>
                <th className="py-3 px-3 text-center w-28">Status</th>
                <th className="py-3 px-3 text-right w-24 pr-4">Durasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Belum ada sekolah yang terdaftar pada kategori ini.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const displayScore = item.status === 'Selesai' && item.nilai_final !== null
                    ? item.nilai_final
                    : boardData?.tampilkan_nilai_sementara
                    ? item.nilai_sementara
                    : '-';

                  return (
                    <tr
                      key={item.participant_id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        item.rank <= 3 ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      {/* Rank */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex justify-center">
                          {renderRankBadge(item.rank)}
                        </div>
                      </td>

                      {/* School Name */}
                      <td className="py-3 px-3">
                        <div className="font-extrabold text-slate-900 text-sm leading-tight">
                          {item.nama_sekolah}
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>Terjawab: <strong className="text-slate-700">{item.jumlah_terjawab}/{item.total_soal}</strong></span>
                          {item.checkpoint_terakhir && (
                            <>
                              <span>•</span>
                              <span>Cp: {new Date(item.checkpoint_terakhir).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Score */}
                      <td className="py-3 px-3 text-center">
                        <div className="inline-block px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-black font-mono text-base">
                          {displayScore}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        {renderStatusBadge(item.status)}
                      </td>

                      {/* Duration */}
                      <td className="py-3 px-3 text-right pr-4 font-mono font-bold text-slate-700">
                        {item.durasi_detik > 0 ? formatDuration(item.durasi_detik) : '--:--'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-100 flex flex-col p-3 sm:p-6 select-none">
      {/* LIVE SCORE TOP BAR */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-md mb-5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Dual Logo + Dual Titles + Live status */}
          <div className="flex items-center gap-3.5 w-full md:w-auto">
            {/* Logo 1 */}
            <div className="relative shrink-0">
              {settings?.logo1_url ? (
                <img
                  src={settings.logo1_url}
                  alt="Logo 1"
                  className="w-12 h-12 object-contain rounded-xl p-1 bg-amber-50 border border-amber-300 shadow-sm"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 text-slate-950 flex items-center justify-center font-black text-xl shadow-md border border-white">
                  🏛️
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 text-[8px] font-black bg-amber-400 text-slate-950 px-1 rounded-full border border-slate-900 font-mono">
                L1
              </span>
            </div>

            {/* Logo 2 */}
            <div className="relative shrink-0">
              {settings?.logo2_url ? (
                <img
                  src={settings.logo2_url}
                  alt="Logo 2"
                  className="w-12 h-12 object-contain rounded-xl p-1 bg-emerald-50 border border-emerald-300 shadow-sm"
                />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white flex items-center justify-center font-black shadow-md border border-white">
                  <Award className="w-6 h-6 text-amber-300" />
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 text-[8px] font-black bg-emerald-400 text-slate-950 px-1 rounded-full border border-slate-900 font-mono">
                L2
              </span>
            </div>

            <div>
              <div className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-amber-700 leading-tight">
                {settings?.judul1 || 'SELEKSI SISWA PRESTASI TINGKAT DASAR'}
              </div>
              <div className="flex items-center gap-2.5 mt-0.5">
                <h1 className="font-black text-lg sm:text-xl text-slate-900 tracking-tight leading-tight">
                  {settings?.judul2 || 'PAPAN LIVE SCORE SISPRES'}
                </h1>
                {/* Pulsing Live badge */}
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-400 text-emerald-900 font-black text-xs tracking-wider animate-pulse">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  <span>LIVE</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                {settings?.subjudul_lomba || 'Lomba Siswa Prestasi'} • Pembaruan Otomatis Real-Time Setiap 10 Detik
              </p>
            </div>
          </div>

          {/* Indicators & Actions */}
          <div className="flex items-center flex-wrap justify-between md:justify-end gap-3 w-full md:w-auto">
            {/* Countdown Badge */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold shadow-2xs">
              <Clock className="w-4 h-4 text-amber-600 animate-spin" />
              <span>Update dlm: <strong className="font-mono text-sm">{countdown}s</strong></span>
            </div>

            {/* View Mode Filter (Both / Putra / Putri) */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setViewTab('both')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  viewTab === 'both' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Keduanya
              </button>
              <button
                type="button"
                onClick={() => setViewTab('putra')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  viewTab === 'putra' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Putra
              </button>
              <button
                type="button"
                onClick={() => setViewTab('putri')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  viewTab === 'putri' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Putri
              </button>
            </div>

            {/* Manual refresh button */}
            <button
              type="button"
              onClick={() => fetchScores(true)}
              title="Perbarui Sekarang"
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Panel Admin / Mode Peserta button */}
            {onOpenAdmin && (
              <button
                type="button"
                onClick={onOpenAdmin}
                className="px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Shield className="w-4 h-4 text-amber-300" />
                <span className="hidden sm:inline">Panel Admin / Mode Peserta</span>
                <span className="sm:hidden">Admin</span>
              </button>
            )}

            {/* Fullscreen button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              title="Layar Penuh Proyektor / TV"
              className="px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              <span className="hidden sm:inline">{isFullscreen ? 'Keluar Fullscreen' : 'Layar Penuh'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* BOARDS CONTAINER */}
      {loading && !boardData ? (
        <div className="flex-1 flex items-center justify-center bg-white rounded-3xl border border-slate-200">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-600">Menghubungkan ke Database Live Score...</p>
          </div>
        </div>
      ) : boardData ? (
        <div className="flex-1 flex flex-col lg:flex-row gap-6">
          {(viewTab === 'both' || viewTab === 'putra') && (
            renderBoardColumn('LIVE SCORE PUTRA', 'putra', boardData.putra)
          )}
          {(viewTab === 'both' || viewTab === 'putri') && (
            renderBoardColumn('LIVE SCORE PUTRI', 'putri', boardData.putri)
          )}
        </div>
      ) : null}

      {/* FOOTER AUDIT TIMESTAMP */}
      <div className="mt-4 text-center text-xs text-slate-500 font-semibold flex items-center justify-center gap-2">
        <span>Sinkronisasi Terakhir: <strong>{lastFetchTime || '-'}</strong></span>
        <span>•</span>
        <span>Status Event: <strong className="uppercase text-emerald-800">{boardData?.status_lomba || 'Berlangsung'}</strong></span>
        <span>•</span>
        <span>Mode: <strong className="text-amber-800">{boardData?.mode_hasil_akhir ? 'Hasil Akhir' : 'Live Bertanding'}</strong></span>
      </div>
    </div>
  );
};
