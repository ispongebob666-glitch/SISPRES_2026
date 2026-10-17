import React, { useState, useEffect } from 'react';
import {
  Award,
  Search,
  Filter,
  Download,
  Printer,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  X,
  FileCheck,
} from 'lucide-react';
import { api } from '../../services/api.ts';

export const AdminResults: React.FC = () => {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'nilai' | 'waktu' | 'nama'>('nilai');

  // Detail Modal
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadResults = async () => {
    try {
      setLoading(true);
      const data = await api.getResults();
      setResults(data);
    } catch (err) {
      console.error('Gagal mengambil hasil lomba:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResults();
  }, []);

  const openDetail = async (pId: string) => {
    try {
      setSelectedParticipantId(pId);
      setDetailLoading(true);
      const data = await api.getResultDetail(pId);
      setDetailData(data);
    } catch (err: any) {
      alert(err.message || 'Gagal memuat detail hasil.');
    } finally {
      setDetailLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const handleExportCsv = () => {
    const headers = ['No', 'ID Peserta', 'Asal Sekolah', 'Kategori', 'Waktu Mulai', 'Waktu Selesai', 'Durasi (detik)', 'Nilai', 'Status', 'Benar', 'Salah', 'Kosong'];
    const rows = sortedResults.map((r, idx) => [
      idx + 1,
      r.participant_id,
      `"${r.nama_sekolah.replace(/"/g, '""')}"`,
      r.gender,
      r.waktu_mulai ? `"${new Date(r.waktu_mulai).toLocaleTimeString()}"` : '-',
      r.waktu_selesai ? `"${new Date(r.waktu_selesai).toLocaleTimeString()}"` : '-',
      r.durasi_detik,
      r.nilai,
      r.status,
      r.stats?.correctCount || 0,
      r.stats?.incorrectCount || 0,
      r.stats?.unansweredCount || 0,
    ]);

    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(x => x.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', `SISPRES_HasilLomba_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  // Filter & Sort
  const filteredResults = results.filter(r => {
    const matchesSearch =
      r.nama_sekolah.toLowerCase().includes(search.toLowerCase()) ||
      r.participant_id.toLowerCase().includes(search.toLowerCase()) ||
      r.nama.toLowerCase().includes(search.toLowerCase());
    const matchesGender = genderFilter === 'ALL' || r.gender === genderFilter;
    return matchesSearch && matchesGender;
  });

  const sortedResults = [...filteredResults].sort((a, b) => {
    if (sortBy === 'nilai') {
      return (b.nilai || 0) - (a.nilai || 0);
    }
    if (sortBy === 'waktu') {
      return (a.durasi_detik || 0) - (b.durasi_detik || 0);
    }
    return a.nama_sekolah.localeCompare(b.nama_sekolah);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Rekap Hasil Lomba</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
              {results.length} Peserta Terdaftar
            </span>
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Lihat perolehan nilai resmi, durasi pengerjaan, dan audit butir jawaban setiap peserta.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
            onClick={handlePrint}
            className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Rekap</span>
          </button>
        </div>
      </div>

      {/* Filter and Sort toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari sekolah / peserta..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Gender */}
          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">Semua Kategori</option>
            <option value="putra">Putra</option>
            <option value="putri">Putri</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="nilai">Urut: Nilai Tertinggi</option>
            <option value="waktu">Urut: Durasi Tercepat</option>
            <option value="nama">Urut: Nama Sekolah</option>
          </select>

          <button
            type="button"
            onClick={loadResults}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* RESULTS TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                <th className="py-3.5 px-4 w-12 text-center">No</th>
                <th className="py-3.5 px-4">Nama Sekolah</th>
                <th className="py-3.5 px-4 w-28 text-center">Kategori</th>
                <th className="py-3.5 px-4 text-center w-24">Mulai</th>
                <th className="py-3.5 px-4 text-center w-24">Selesai</th>
                <th className="py-3.5 px-4 text-center w-24">Durasi</th>
                <th className="py-3.5 px-4 text-center w-24">Nilai</th>
                <th className="py-3.5 px-4 text-center w-32">Status</th>
                <th className="py-3.5 px-4 text-right w-24 pr-6">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Memuat hasil lomba...</span>
                  </td>
                </tr>
              ) : sortedResults.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Tidak ada hasil lomba yang cocok.
                  </td>
                </tr>
              ) : (
                sortedResults.map((r, idx) => (
                  <tr key={r.participant_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                      {idx + 1}
                    </td>

                    <td className="py-3.5 px-4 font-extrabold text-slate-900">
                      <div>{r.nama_sekolah}</div>
                      <div className="text-[10px] text-slate-400 font-mono font-normal">{r.participant_id}</div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        r.gender === 'putra' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {r.gender}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono text-slate-600">
                      {r.waktu_mulai ? new Date(r.waktu_mulai).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono text-slate-600">
                      {r.waktu_selesai ? new Date(r.waktu_selesai).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-700">
                      {formatDuration(r.durasi_detik)}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-block px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-black font-mono text-sm">
                        {r.nilai}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold ${
                        r.status === 'Selesai'
                          ? 'bg-emerald-100 text-emerald-900'
                          : r.status === 'Sedang Mengerjakan'
                          ? 'bg-amber-100 text-amber-900 animate-pulse'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {r.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right pr-6">
                      <button
                        type="button"
                        onClick={() => openDetail(r.participant_id)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Detail</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL AUDIT MODAL (Per-Question Answers vs Key) */}
      {selectedParticipantId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  Audit Rincian Hasil Peserta
                </h3>
                {detailData && (
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    {detailData.participant?.nama_sekolah} • Kategori {detailData.participant?.gender?.toUpperCase()}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedParticipantId(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {detailLoading || !detailData ? (
              <div className="py-12 text-center text-slate-400">
                <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <span>Memuat rincian butir soal...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Score Summary Box */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
                  <div>
                    <span className="text-slate-500 block">Nilai Total</span>
                    <strong className="text-lg font-black font-mono text-emerald-800">
                      {detailData.exam?.nilai_final ?? detailData.exam?.nilai_sementara ?? 0}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Waktu Mulai</span>
                    <strong className="font-mono text-slate-800">
                      {detailData.exam?.waktu_mulai ? new Date(detailData.exam.waktu_mulai).toLocaleTimeString() : '-'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Waktu Selesai</span>
                    <strong className="font-mono text-slate-800">
                      {detailData.exam?.waktu_selesai ? new Date(detailData.exam.waktu_selesai).toLocaleTimeString() : '-'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Durasi</span>
                    <strong className="font-mono text-slate-800">
                      {formatDuration(detailData.exam?.durasi_detik || 0)}
                    </strong>
                  </div>
                </div>

                {/* Per Question Comparison Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 font-extrabold text-slate-700">
                        <th className="py-2.5 px-3 w-10 text-center">No</th>
                        <th className="py-2.5 px-3">Soal</th>
                        <th className="py-2.5 px-3 text-center w-24">Jawaban Peserta</th>
                        <th className="py-2.5 px-3 text-center w-20">Kunci</th>
                        <th className="py-2.5 px-3 text-center w-20">Status</th>
                        <th className="py-2.5 px-3 text-right w-16 pr-3">Poin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detailData.details.map((d: any) => (
                        <tr key={d.question_id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 text-center font-bold text-slate-400">{d.no}</td>
                          <td className="py-2 px-3 text-slate-800 font-medium">
                            <div className="line-clamp-1">{d.soal}</div>
                            {d.pembahasan && (
                              <div className="text-[10px] text-slate-400 italic mt-0.5 line-clamp-1">
                                {d.pembahasan}
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center font-mono font-bold text-slate-800">
                            {d.jawaban_peserta}
                          </td>
                          <td className="py-2 px-3 text-center font-mono font-bold text-emerald-700">
                            {String(d.kunci)}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                              d.status === 'Benar'
                                ? 'bg-emerald-100 text-emerald-800'
                                : d.status === 'Salah'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}>
                              {d.status}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right pr-3 font-mono font-bold text-slate-700">
                            {d.nilai}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedParticipantId(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
