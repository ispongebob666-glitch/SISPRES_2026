import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  Edit,
  RotateCcw,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import type { Participant, School, Gender } from '../../types/index.ts';

export const AdminParticipants: React.FC = () => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('ALL');
  const [genderFilter, setGenderFilter] = useState('ALL');

  // Modal: Add / Edit
  const [showModal, setShowModal] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [formNama, setFormNama] = useState('');
  const [formGender, setFormGender] = useState<Gender>('putra');
  const [formPassword, setFormPassword] = useState('123456');
  const [formError, setFormError] = useState('');

  // Password visibility map
  const [showPassMap, setShowPassMap] = useState<Record<string, boolean>>({});

  // Confirmation Modal
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    action: () => Promise<void>;
  }>({
    open: false,
    title: '',
    message: '',
    action: async () => {},
  });

  // Modal: Import CSV
  const [showImportModal, setShowImportModal] = useState(false);
  const [importCsvText, setImportCsvText] = useState('');
  const [importResults, setImportResults] = useState<{ addedCount: number; errors: string[] } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const parts = await api.getParticipants();
      setParticipants(parts);
    } catch (err) {
      console.error('Gagal mengambil peserta:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingParticipant(null);
    setFormNama('');
    setFormGender('putra');
    setFormPassword('123456');
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (p: Participant) => {
    setEditingParticipant(p);
    setFormNama(p.nama);
    setFormGender(p.gender);
    setFormPassword(p.password_hash);
    setFormError('');
    setShowModal(true);
  };

  const handleSaveParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    try {
      const name = formNama.trim();
      if (!name) {
        throw new Error('Nama peserta wajib diisi.');
      }

      if (editingParticipant) {
        // Update
        await api.updateParticipant(editingParticipant.id, {
          nama: name,
          gender: formGender,
          password_hash: formPassword,
        });
      } else {
        // Create new
        await api.createParticipant({
          nama: name,
          gender: formGender,
          password_hash: formPassword,
        });
      }

      setShowModal(false);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan data peserta.');
    }
  };

  const confirmReset = (p: Participant) => {
    setConfirmModal({
      open: true,
      title: 'Reset Sesi Lomba Peserta',
      message: `Apakah Anda yakin ingin mereset sesi lomba untuk "${p.nama}" (${p.gender.toUpperCase()})? Semua jawaban dan nilai sementara akan dihapus, dan peserta dapat memulai kembali.`,
      action: async () => {
        await api.resetParticipant(p.id);
        setConfirmModal(prev => ({ ...prev, open: false }));
        await loadData();
      },
    });
  };

  const confirmDelete = (p: Participant) => {
    setConfirmModal({
      open: true,
      title: 'Hapus Peserta',
      message: `Apakah Anda yakin ingin menghapus peserta "${p.nama}" (${p.gender.toUpperCase()})? Data tidak dapat dikembalikan.`,
      action: async () => {
        await api.deleteParticipant(p.id);
        setConfirmModal(prev => ({ ...prev, open: false }));
        await loadData();
      },
    });
  };

  // Export to CSV
  const handleExportCsv = () => {
    const headers = ['ID Peserta', 'Nama Peserta', 'Kategori', 'Password', 'Status'];
    const rows = participants.map(p => [
      p.id,
      `"${p.nama.replace(/"/g, '""')}"`,
      p.gender,
      p.password_hash,
      p.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SISPRES_Peserta_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download sample CSV template
  const handleDownloadTemplate = () => {
    const headers = ['ID Peserta', 'Nama Peserta', 'Kategori', 'Password'];
    const sample = [
      headers.join(','),
      'P-101,Ahmad Pratama,putra,123456',
      'P-102,Siti Nurhaliza,putri,123456',
    ].join('\n');

    const encoded = encodeURI('data:text/csv;charset=utf-8,' + sample);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', 'Template_Peserta_SISPRES.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Process CSV Import
  const handleProcessImport = async () => {
    setFormError('');
    setImportResults(null);
    try {
      const lines = importCsvText.trim().split('\n').filter(Boolean);
      if (lines.length <= 1) {
        throw new Error('Data CSV kosong atau hanya berisi baris header.');
      }

      // Skip header line
      const dataRows = lines.slice(1);
      const items = dataRows.map(line => {
        const parts = line.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
        return {
          id: parts[0],
          nama: parts[1],
          gender: (parts[2] || 'putra').toLowerCase(),
          password: parts[3] || '123456',
        };
      });

      const res = await api.importParticipants(items);
      setImportResults({
        addedCount: res.addedCount || 0,
        errors: res.errors || [],
      });
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Gagal memproses data CSV.');
    }
  };

  // Filtered list
  const filteredParticipants = participants.filter(p => {
    const matchesSearch =
      p.id.toLowerCase().includes(search.toLowerCase()) ||
      p.nama.toLowerCase().includes(search.toLowerCase());

    const matchesGender = genderFilter === 'ALL' || p.gender === genderFilter;

    return matchesSearch && matchesGender;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Daftar Peserta Lomba</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
              {participants.length} Peserta
            </span>
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Setiap sekolah maksimal mengirim 2 peserta (1 Kategori Putra & 1 Kategori Putri).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openAddModal}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Peserta</span>
          </button>

          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4 text-emerald-700" />
            <span>Import CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama sekolah / ID..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Gender filter */}
          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">Semua Kategori</option>
            <option value="putra">Putra</option>
            <option value="putri">Putri</option>
          </select>

          <button
            type="button"
            onClick={loadData}
            title="Muat Ulang"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* PARTICIPANTS TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                <th className="py-3.5 px-4 w-24">ID Peserta</th>
                <th className="py-3.5 px-4">Nama Peserta</th>
                <th className="py-3.5 px-4 w-32 text-center">Kategori</th>
                <th className="py-3.5 px-4 w-36">Password</th>
                <th className="py-3.5 px-4 w-36 text-center">Status Lomba</th>
                <th className="py-3.5 px-4 text-right w-44 pr-6">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Memuat data peserta...</span>
                  </td>
                </tr>
              ) : filteredParticipants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Tidak ada peserta yang cocok dengan pencarian / filter.
                  </td>
                </tr>
              ) : (
                filteredParticipants.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* ID */}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {p.id}
                    </td>

                    {/* Name */}
                    <td className="py-3.5 px-4 font-extrabold text-slate-900">
                      {p.nama}
                    </td>

                    {/* Gender badge */}
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold ${
                        p.gender === 'putra'
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}>
                        <span>{p.gender === 'putra' ? '👦 Putra' : '👧 Putri'}</span>
                      </span>
                    </td>

                    {/* Password with eye toggle */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-mono">
                        <span className="bg-slate-100 px-2 py-1 rounded text-slate-700 border border-slate-200">
                          {showPassMap[p.id] ? p.password_hash : '••••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowPassMap(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer"
                          title="Lihat / Sembunyikan Password"
                        >
                          {showPassMap[p.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold ${
                        p.status === 'Selesai'
                          ? 'bg-emerald-100 text-emerald-900'
                          : p.status === 'Sedang Mengerjakan'
                          ? 'bg-amber-100 text-amber-900 animate-pulse'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {p.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right pr-6">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => confirmReset(p)}
                          title="Reset Sesi Lomba Peserta"
                          className="p-1.5 text-amber-700 hover:bg-amber-50 rounded-lg border border-amber-200 transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(p)}
                          title="Edit Peserta"
                          className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => confirmDelete(p)}
                          title="Hapus Peserta"
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: ADD / EDIT PARTICIPANT */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <h3 className="font-extrabold text-base text-slate-900">
                {editingParticipant ? 'Edit Data Peserta' : 'Tambah Peserta Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveParticipant} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nama Peserta
                </label>
                <input
                  type="text"
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  placeholder="Contoh: Ahmad Pratama"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Kategori Peserta
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormGender('putra')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      formGender === 'putra'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-2xs'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    👦 Putra
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormGender('putri')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      formGender === 'putri'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-2xs'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    👧 Putri
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Password Login Peserta
                </label>
                <input
                  type="text"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="123456"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm cursor-pointer"
                >
                  Simpan Peserta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: IMPORT CSV */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Import Peserta dari CSV / Excel</span>
              </h3>
              <button
                type="button"
                onClick={() => { setShowImportModal(false); setImportResults(null); }}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-3">
              Tempel teks format CSV di bawah atau unduh template resmi untuk memastikan format kolom sesuai aturan.
            </p>

            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Teks CSV:</span>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Template CSV</span>
              </button>
            </div>

            <textarea
              rows={6}
              value={importCsvText}
              onChange={(e) => setImportCsvText(e.target.value)}
              placeholder="ID,Nama,Asal Sekolah,Kategori,Password&#10;P-101,Ahmad,SD Harapan Kita,putra,123456&#10;P-102,Siti,SD Harapan Kita,putri,123456"
              className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-4"
            />

            {importResults && (
              <div className="mb-4 p-3 rounded-xl bg-slate-100 border border-slate-200 text-xs">
                <div className="font-bold text-emerald-800 flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{importResults.addedCount} peserta berhasil diimport!</span>
                </div>
                {importResults.errors.length > 0 && (
                  <div className="mt-2 text-rose-700 space-y-1">
                    <span className="font-bold">Peringatan:</span>
                    <ul className="list-disc pl-4">
                      {importResults.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowImportModal(false); setImportResults(null); }}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 text-slate-600 hover:bg-slate-50"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handleProcessImport}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm"
              >
                Validasi &amp; Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION ACTION MODAL */}
      {confirmModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200">
            <h4 className="font-black text-base text-slate-900 mb-2">
              {confirmModal.title}
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              {confirmModal.message}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmModal(prev => ({ ...prev, open: false }))}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmModal.action}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md cursor-pointer"
              >
                Konfirmasi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
