import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Medal,
  Clock,
  Download,
  Printer,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import type { LiveScoreBoard, LiveScoreItem } from '../../types/index.ts';

export const AdminRankings: React.FC = () => {
  const [boardData, setBoardData] = useState<LiveScoreBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'putra' | 'putri'>('putra');

  const loadRankings = async () => {
    try {
      setLoading(true);
      const data = await api.getLiveScore();
      setBoardData(data);
    } catch (err) {
      console.error('Gagal memuat papan peringkat:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRankings();
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleExportCsv = () => {
    if (!boardData) return;
    const items = activeTab === 'putra' ? boardData.putra : boardData.putri;
    const headers = ['Peringkat', 'Nama Sekolah', 'Kategori', 'Nilai', 'Durasi', 'Status'];
    const rows = items.map(item => [
      item.rank,
      `"${item.nama_sekolah.replace(/"/g, '""')}"`,
      activeTab,
      item.nilai_final ?? item.nilai_sementara,
      formatDuration(item.durasi_detik),
      item.status,
    ]);

    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(x => x.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', `Peringkat_SISPRES_${activeTab.toUpperCase()}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeItems = activeTab === 'putra' ? boardData?.putra || [] : boardData?.putri || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Papan Peringkat Resmi</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold border border-amber-300">
              Kategori Terpisah
            </span>
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Peringkat dihitung berdasarkan nilai tertinggi, dengan durasi tercepat sebagai pemecah seri.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-700" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak</span>
          </button>
        </div>
      </div>

      {/* TABS: PUTRA vs PUTRI */}
      <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('putra')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'putra'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span>👦 Peringkat PUTRA ({boardData?.putra.length || 0})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('putri')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'putri'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span>👧 Peringkat PUTRI ({boardData?.putri.length || 0})</span>
        </button>
      </div>

      {/* TOP 3 PODIUM PREVIEW */}
      {activeItems.length >= 3 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Rank 2 */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 text-center flex flex-col justify-between order-2 sm:order-1">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center font-black text-xl mx-auto mb-2 border border-slate-300">
                🥈
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Juara 2</span>
              <h4 className="font-black text-slate-900 text-sm mt-1">{activeItems[1]?.nama_sekolah}</h4>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 font-mono">
              <span className="text-2xl font-black text-slate-800">{activeItems[1]?.nilai_final ?? activeItems[1]?.nilai_sementara}</span>
              <span className="text-xs text-slate-400 block">{formatDuration(activeItems[1]?.durasi_detik)}</span>
            </div>
          </div>

          {/* Rank 1 */}
          <div className="bg-gradient-to-b from-amber-50/80 to-white rounded-2xl p-6 border-2 border-amber-300 text-center flex flex-col justify-between order-1 sm:order-2 shadow-md ring-2 ring-amber-400/20">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center font-black text-2xl mx-auto mb-2 shadow-md">
                🥇
              </div>
              <span className="text-xs font-black uppercase tracking-wider text-amber-800">Juara 1 (Pemenang)</span>
              <h4 className="font-black text-slate-900 text-base mt-1">{activeItems[0]?.nama_sekolah}</h4>
            </div>
            <div className="mt-4 pt-3 border-t border-amber-200 font-mono">
              <span className="text-3xl font-black text-emerald-800">{activeItems[0]?.nilai_final ?? activeItems[0]?.nilai_sementara}</span>
              <span className="text-xs text-slate-500 block">{formatDuration(activeItems[0]?.durasi_detik)}</span>
            </div>
          </div>

          {/* Rank 3 */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 text-center flex flex-col justify-between order-3 sm:order-3">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-black text-xl mx-auto mb-2 border border-amber-300">
                🥉
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700">Juara 3</span>
              <h4 className="font-black text-slate-900 text-sm mt-1">{activeItems[2]?.nama_sekolah}</h4>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 font-mono">
              <span className="text-2xl font-black text-slate-800">{activeItems[2]?.nilai_final ?? activeItems[2]?.nilai_sementara}</span>
              <span className="text-xs text-slate-400 block">{formatDuration(activeItems[2]?.durasi_detik)}</span>
            </div>
          </div>
        </div>
      )}

      {/* FULL RANKINGS TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
              <th className="py-3.5 px-4 w-16 text-center">Peringkat</th>
              <th className="py-3.5 px-4">Nama Sekolah</th>
              <th className="py-3.5 px-4 text-center w-28">Nilai Resmi</th>
              <th className="py-3.5 px-4 text-center w-28">Durasi</th>
              <th className="py-3.5 px-4 text-center w-36">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-medium">
            {activeItems.map(item => (
              <tr key={item.participant_id} className={`hover:bg-slate-50 ${item.rank <= 3 ? 'bg-amber-50/20' : ''}`}>
                <td className="py-3.5 px-4 text-center font-black">
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs ${
                    item.rank === 1
                      ? 'bg-amber-400 text-amber-950 font-black'
                      : item.rank === 2
                      ? 'bg-slate-200 text-slate-800'
                      : item.rank === 3
                      ? 'bg-amber-100 text-amber-800'
                      : 'text-slate-500'
                  }`}>
                    #{item.rank}
                  </span>
                </td>
                <td className="py-3.5 px-4 font-black text-slate-900 text-sm">
                  {item.nama_sekolah}
                </td>
                <td className="py-3.5 px-4 text-center">
                  <span className="inline-block px-3 py-1 rounded-xl bg-emerald-50 text-emerald-900 font-mono font-black text-sm border border-emerald-200">
                    {item.nilai_final ?? item.nilai_sementara}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-700">
                  {formatDuration(item.durasi_detik)}
                </td>
                <td className="py-3.5 px-4 text-center">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold ${
                    item.status === 'Selesai'
                      ? 'bg-emerald-100 text-emerald-900'
                      : item.status === 'Sedang Mengerjakan'
                      ? 'bg-amber-100 text-amber-900 animate-pulse'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
