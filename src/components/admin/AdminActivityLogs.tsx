import React, { useState, useEffect } from 'react';
import {
  Activity,
  Search,
  Filter,
  RefreshCw,
  Clock,
  ShieldAlert,
  LogIn,
  CheckCircle2,
  WifiOff,
  Wifi,
  ExternalLink,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import type { ActivityLog } from '../../types/index.ts';

export const AdminActivityLogs: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await api.getActivityLogs();
      setLogs(data);
    } catch (err) {
      console.error('Gagal mengambil audit log:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, 10000);
    return () => clearInterval(interval);
  }, []);

  const getLogIcon = (aktivitas: string) => {
    const act = aktivitas.toLowerCase();
    if (act.includes('tab') || act.includes('fullscreen')) {
      return <ShieldAlert className="w-4 h-4 text-amber-600" />;
    }
    if (act.includes('login') || act.includes('masuk')) {
      return <LogIn className="w-4 h-4 text-emerald-600" />;
    }
    if (act.includes('submit') || act.includes('selesai')) {
      return <CheckCircle2 className="w-4 h-4 text-emerald-700" />;
    }
    if (act.includes('terputus')) {
      return <WifiOff className="w-4 h-4 text-rose-600" />;
    }
    if (act.includes('kembali')) {
      return <Wifi className="w-4 h-4 text-emerald-600" />;
    }
    return <Activity className="w-4 h-4 text-slate-500" />;
  };

  const filteredLogs = logs.filter(l =>
    l.nama_sekolah.toLowerCase().includes(search.toLowerCase()) ||
    l.participant_id.toLowerCase().includes(search.toLowerCase()) ||
    l.aktivitas.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Log Aktivitas &amp; Proctoring</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
              {logs.length} Kejadian
            </span>
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Pencatatan real-time untuk audit kejujuran peserta (deteksi pindah tab, keluar fullscreen, submit).
          </p>
        </div>

        <button
          type="button"
          onClick={loadLogs}
          className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Perbarui Log</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-3">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari aktivitas atau nama sekolah..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="text-xs text-slate-400 font-semibold hidden sm:block">
          Diperbarui otomatis setiap 10 detik
        </div>
      </div>

      {/* LOG LIST */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
        {loading && logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>Memuat riwayat log aktivitas...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs font-semibold">
            Belum ada aktivitas yang tercatat.
          </div>
        ) : (
          filteredLogs.map(log => (
            <div key={log.id} className="p-4 hover:bg-slate-50 flex items-center justify-between gap-4 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                  {getLogIcon(log.aktivitas)}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 leading-snug">
                    {log.aktivitas}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                    <span className="font-semibold text-slate-700">{log.nama_sekolah}</span>
                    <span>•</span>
                    <span className="uppercase text-emerald-700 font-bold">Kategori {log.gender}</span>
                    <span>•</span>
                    <span className="font-mono text-slate-400">ID: {log.participant_id}</span>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-xs font-mono font-bold text-slate-600 block">
                  {new Date(log.waktu).toLocaleTimeString()}
                </span>
                <span className="text-[10px] text-slate-400">
                  {new Date(log.waktu).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
