import React, { useState, useEffect } from 'react';
import {
  FileQuestion,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Edit,
  Trash2,
  Copy,
  CheckCircle2,
  XCircle,
  X,
  AlertTriangle,
  RefreshCw,
  FileSpreadsheet,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { RichText } from '../common/RichText.tsx';
import type { Question, QuestionOption } from '../../types/index.ts';

export const AdminQuestions: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'aktif' | 'nonaktif'>('ALL');

  // Modal: Add/Edit Question
  const [showModal, setShowModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [formSoal, setFormSoal] = useState('');
  const [formBobot, setFormBobot] = useState(5);
  const [formGambar, setFormGambar] = useState('');
  const [formPosisiGambar, setFormPosisiGambar] = useState<'atas' | 'bawah'>('atas');
  const [formKunci, setFormKunci] = useState('A');
  const [formPembahasan, setFormPembahasan] = useState('');
  const [formOptions, setFormOptions] = useState<Array<{ label: string; teks: string }>>([
    { label: 'A', teks: '' },
    { label: 'B', teks: '' },
    { label: 'C', teks: '' },
    { label: 'D', teks: '' },
  ]);
  const [formError, setFormError] = useState('');

  // Import / Template state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFileText, setImportFileText] = useState('');

  const handleDownloadTemplate = () => {
    const csvContent = "no_urut,tipe,soal,opsi_a,opsi_b,opsi_c,opsi_d,kunci,bobot,pembahasan\n" +
      "1,pilihan_ganda,\"Ibukota negara Indonesia adalah...\",\"Jakarta\",\"Bandung\",\"Surabaya\",\"Medan\",\"A\",5,\"Jakarta adalah ibukota negara Indonesia.\"\n" +
      "2,pilihan_ganda,\"Hasil dari 15 + 10 x 2 adalah...\",\"35\",\"50\",\"30\",\"25\",\"A\",5,\"Kerjakan perkalian dahulu: 10 x 2 = 20, lalu 15 + 20 = 35.\"";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'SISPRES_Template_Soal.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleProcessImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFileText.trim()) return;
    try {
      const lines = importFileText.split('\n').filter(l => l.trim().length > 0);
      const startIdx = lines[0].toLowerCase().includes('no_urut') ? 1 : 0;
      let added = 0;
      for (let i = startIdx; i < lines.length; i++) {
        const parts = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
        if (parts.length >= 8) {
          const cleanParts = parts.map(p => p.replace(/^"|"$/g, '').trim());
          const no_urut = Number(cleanParts[0]) || (questions.length + added + 1);
          const tipe = 'pilihan_ganda';
          // Di sel CSV, tulis \n untuk membuat baris baru pada soal/pembahasan
          const nl = (s: string) => s.replace(/\\n/g, '\n');
          const soal = nl(cleanParts[2] || `Soal Impor ${no_urut}`);
          const opsiA = cleanParts[3] || 'A';
          const opsiB = cleanParts[4] || 'B';
          const opsiC = cleanParts[5] || 'C';
          const opsiD = cleanParts[6] || 'D';
          const kunci = (cleanParts[7] || 'A').toUpperCase();
          const bobot = Number(cleanParts[8]) || 5;
          const pembahasan = nl(cleanParts[9] || '');

          await api.createQuestion({
            no_urut,
            tipe,
            soal,
            bobot,
            kunci,
            pembahasan,
            status: 'aktif',
            options: [
              { id: 'opt-1', label: 'A', teks: opsiA },
              { id: 'opt-2', label: 'B', teks: opsiB },
              { id: 'opt-3', label: 'C', teks: opsiC },
              { id: 'opt-4', label: 'D', teks: opsiD },
            ],
          });
          added++;
        }
      }
      setShowImportModal(false);
      setImportFileText('');
      await loadQuestions();
      alert(`Berhasil mengimpor ${added} butir soal baru!`);
    } catch (err: any) {
      alert(err.message || 'Gagal mengimpor file soal.');
    }
  };

  // Confirmation modal
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

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const data = await api.getQuestions();
      setQuestions(data);
    } catch (err) {
      console.error('Gagal mengambil bank soal:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, []);

  const openAddModal = () => {
    setEditingQuestion(null);
    setFormSoal('');
    setFormBobot(5);
    setFormGambar('');
    setFormPosisiGambar('atas');
    setFormKunci('A');
    setFormPembahasan('');
    setFormOptions([
      { label: 'A', teks: '' },
      { label: 'B', teks: '' },
      { label: 'C', teks: '' },
      { label: 'D', teks: '' },
    ]);
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (q: Question) => {
    setEditingQuestion(q);
    setFormSoal(q.soal);
    setFormBobot(q.bobot);
    setFormGambar(q.gambar || '');
    setFormPosisiGambar(q.posisi_gambar || 'atas');
    setFormKunci(String(q.kunci));
    setFormPembahasan(q.pembahasan || '');
    setFormOptions(
      q.options.map(opt => ({ label: opt.label, teks: opt.teks }))
    );
    setFormError('');
    setShowModal(true);
  };

  const handleDuplicate = async (q: Question) => {
    try {
      await api.createQuestion({
        no_urut: questions.length + 1,
        tipe: q.tipe,
        soal: `${q.soal} (Salinan)`,
        gambar: q.gambar,
        posisi_gambar: q.posisi_gambar,
        bobot: q.bobot,
        kunci: q.kunci,
        pembahasan: q.pembahasan,
        status: 'aktif',
        options: q.options.map(opt => ({ ...opt, id: `opt-${Date.now()}-${Math.random()}` })),
      });
      await loadQuestions();
    } catch (err: any) {
      alert(err.message || 'Gagal menduplikasi soal.');
    }
  };

  const handleToggleStatus = async (q: Question) => {
    const nextStatus = q.status === 'aktif' ? 'nonaktif' : 'aktif';
    try {
      await api.updateQuestion(q.id, { status: nextStatus });
      await loadQuestions();
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah status soal.');
    }
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formSoal.trim()) {
      setFormError('Teks soal wajib diisi.');
      return;
    }

    const emptyOpt = formOptions.find(o => !o.teks.trim());
    if (emptyOpt) {
      setFormError(`Teks untuk Opsi ${emptyOpt.label} wajib diisi.`);
      return;
    }

    try {
      const optionsPayload: QuestionOption[] = formOptions.map((o, idx) => ({
        id: `opt-${idx + 1}`,
        label: o.label,
        teks: o.teks.trim(),
      }));

      if (editingQuestion) {
        await api.updateQuestion(editingQuestion.id, {
          soal: formSoal.trim(),
          bobot: Number(formBobot) || 5,
          gambar: formGambar.trim() || undefined,
          posisi_gambar: formPosisiGambar,
          kunci: formKunci.trim().toUpperCase(),
          pembahasan: formPembahasan.trim(),
          options: optionsPayload,
        });
      } else {
        await api.createQuestion({
          no_urut: questions.length + 1,
          tipe: 'pilihan_ganda',
          soal: formSoal.trim(),
          bobot: Number(formBobot) || 5,
          gambar: formGambar.trim() || undefined,
          posisi_gambar: formPosisiGambar,
          kunci: formKunci.trim().toUpperCase(),
          pembahasan: formPembahasan.trim(),
          status: 'aktif',
          options: optionsPayload,
        });
      }

      setShowModal(false);
      await loadQuestions();
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan soal.');
    }
  };

  const confirmDelete = (q: Question) => {
    setConfirmModal({
      open: true,
      title: 'Hapus Soal',
      message: `Apakah Anda yakin ingin menghapus soal #${q.no_urut} ("${q.soal.substring(0, 40)}...")?`,
      action: async () => {
        await api.deleteQuestion(q.id);
        setConfirmModal(prev => ({ ...prev, open: false }));
        await loadQuestions();
      },
    });
  };

  const confirmDeleteAll = () => {
    setConfirmModal({
      open: true,
      title: 'Hapus SEMUA Soal',
      message: `Yakin ingin menghapus SEMUA ${questions.length} soal? Data tidak dapat dikembalikan. Disarankan unduh Backup atau Export Bank Soal terlebih dahulu.`,
      action: async () => {
        try {
          await api.deleteAllQuestions();
        } catch (err: any) {
          alert(`Gagal menghapus: ${err.message}`);
        }
        setConfirmModal(prev => ({ ...prev, open: false }));
        await loadQuestions();
      },
    });
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = ['No Urut', 'Tipe', 'Soal', 'Opsi A', 'Opsi B', 'Opsi C', 'Opsi D', 'Kunci', 'Bobot', 'Pembahasan', 'Status'];
    const rows = questions.map(q => {
      const a = q.options.find(o => o.label === 'A')?.teks || '';
      const b = q.options.find(o => o.label === 'B')?.teks || '';
      const c = q.options.find(o => o.label === 'C')?.teks || '';
      const d = q.options.find(o => o.label === 'D')?.teks || '';
      return [
        q.no_urut,
        q.tipe,
        `"${q.soal.replace(/"/g, '""')}"`,
        `"${a.replace(/"/g, '""')}"`,
        `"${b.replace(/"/g, '""')}"`,
        `"${c.replace(/"/g, '""')}"`,
        `"${d.replace(/"/g, '""')}"`,
        q.kunci,
        q.bobot,
        `"${(q.pembahasan || '').replace(/"/g, '""')}"`,
        q.status,
      ];
    });

    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', `SISPRES_BankSoal_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.soal.toLowerCase().includes(search.toLowerCase()) || String(q.no_urut).includes(search);
    const matchesStatus = statusFilter === 'ALL' || q.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Bank Soal Lomba</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
              {questions.length} Butir Soal
            </span>
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Seluruh soal terintegrasi langsung untuk satu event Lomba Siswa Prestasi (tanpa mapel/guru rumit).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openAddModal}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Soal</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="px-3 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Download Templat CSV Soal"
          >
            <Download className="w-4 h-4" />
            <span>Download Templat Soal</span>
          </button>

          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="px-3.5 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs border border-amber-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Import Soal dari CSV"
          >
            <Upload className="w-4 h-4" />
            <span>Import Soal</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Bank Soal</span>
          </button>

          <button
            type="button"
            onClick={confirmDeleteAll}
            disabled={questions.length === 0}
            className="px-3 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            <span>Hapus Semua</span>
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari teks soal / nomor..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">Semua Status</option>
            <option value="aktif">Soal Aktif Saja</option>
            <option value="nonaktif">Soal Nonaktif</option>
          </select>

          <button
            type="button"
            onClick={loadQuestions}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* QUESTION LIST */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-200">
            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>Memuat butir soal...</span>
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-200">
            Tidak ada butir soal yang sesuai kriteria.
          </div>
        ) : (
          filteredQuestions.map((q, idx) => (
            <div
              key={q.id}
              className={`bg-white rounded-2xl p-5 border transition-all ${
                q.status === 'aktif'
                  ? 'border-slate-200/90 shadow-2xs hover:shadow-sm'
                  : 'border-slate-200 bg-slate-50/70 opacity-75'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 font-extrabold text-xs flex items-center justify-center border border-slate-200">
                    {idx + 1}
                  </span>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {q.tipe.replace('_', ' ')} • Bobot: {q.bobot} Poin
                  </span>
                </div>

                {/* Status and Action Buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(q)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                      q.status === 'aktif'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {q.status === 'aktif' ? 'Aktif' : 'Nonaktif'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDuplicate(q)}
                    title="Duplikat Soal"
                    className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditModal(q)}
                    title="Edit Soal"
                    className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg border border-emerald-200 transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => confirmDelete(q)}
                    title="Hapus Soal"
                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Soal Body */}
              <div className="mt-3 text-sm font-semibold text-slate-900 leading-relaxed">
                <RichText text={q.soal} />
              </div>

              {q.gambar && (
                <div className="mt-3">
                  <img src={q.gambar} alt="Soal" className="h-32 object-contain rounded-lg border border-slate-200" />
                </div>
              )}

              {/* Options Preview */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {q.options.map(opt => {
                  const isKey = String(q.kunci).trim().toUpperCase() === opt.label.toUpperCase();
                  return (
                    <div
                      key={opt.id}
                      className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                        isKey
                          ? 'bg-emerald-50 border-emerald-300 font-bold text-emerald-950'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded font-bold text-[11px] flex items-center justify-center shrink-0 ${
                        isKey ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {opt.label}
                      </span>
                      <span className="truncate"><RichText text={opt.teks} multiline={false} /></span>
                      {isKey && <span className="ml-auto text-[10px] text-emerald-700 font-bold uppercase">(KUNCI)</span>}
                    </div>
                  );
                })}
              </div>

              {q.pembahasan && (
                <div className="mt-3 p-3 bg-amber-50/60 rounded-xl border border-amber-200 text-xs text-amber-900">
                  <span className="font-bold">Pembahasan: </span>
                  <span>{q.pembahasan}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* MODAL: ADD / EDIT QUESTION */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <h3 className="font-extrabold text-base text-slate-900">
                {editingQuestion ? 'Edit Soal' : 'Tambah Soal Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
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

            <form onSubmit={handleSaveQuestion} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Teks Pertanyaan / Soal
                </label>
                <textarea
                  rows={3}
                  value={formSoal}
                  onChange={(e) => setFormSoal(e.target.value)}
                  placeholder="Tuliskan butir soal di sini..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Bobot Nilai
                  </label>
                  <input
                    type="number"
                    value={formBobot}
                    onChange={(e) => setFormBobot(Number(e.target.value))}
                    min={1}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Kunci Jawaban Benar
                  </label>
                  <select
                    value={formKunci}
                    onChange={(e) => setFormKunci(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="A">Opsi A</option>
                    <option value="B">Opsi B</option>
                    <option value="C">Opsi C</option>
                    <option value="D">Opsi D</option>
                  </select>
                </div>
              </div>

              {/* Image URL & position */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    URL Gambar Soal (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formGambar}
                    onChange={(e) => setFormGambar(e.target.value)}
                    placeholder="https://... (jika ada)"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Posisi Gambar
                  </label>
                  <select
                    value={formPosisiGambar}
                    onChange={(e) => setFormPosisiGambar(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="atas">Di Atas Teks</option>
                    <option value="bawah">Di Bawah Teks</option>
                  </select>
                </div>
              </div>

              {/* Options A-D */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pilihan Jawaban (A, B, C, D)
                </label>
                {formOptions.map((opt, idx) => (
                  <div key={opt.label} className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-slate-100 font-bold text-xs flex items-center justify-center border border-slate-300">
                      {opt.label}
                    </span>
                    <input
                      type="text"
                      value={opt.teks}
                      onChange={(e) => {
                        const copy = [...formOptions];
                        copy[idx].teks = e.target.value;
                        setFormOptions(copy);
                      }}
                      placeholder={`Isi teks untuk opsi ${opt.label}...`}
                      className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                ))}
              </div>

              {/* Pembahasan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Pembahasan Kunci (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={formPembahasan}
                  onChange={(e) => setFormPembahasan(e.target.value)}
                  placeholder="Penjelasan ringkas kunci jawaban..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm cursor-pointer"
                >
                  Simpan Soal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
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
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMPORT CSV MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 border border-slate-200">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
                <Upload className="w-5 h-5 text-amber-600" />
                <span>Import Bank Soal (CSV)</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProcessImport} className="space-y-4">
              <p className="text-xs text-slate-600">
                Paste data CSV dari Excel atau edit file CSV sesuai templat yang telah didownload. Pastikan kolom sesuai urutan: <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-[11px]">no_urut, tipe, soal, opsi_a, opsi_b, opsi_c, opsi_d, kunci, bobot, pembahasan</code>.
              </p>

              <div>
                <textarea
                  rows={8}
                  value={importFileText}
                  onChange={(e) => setImportFileText(e.target.value)}
                  placeholder="Paste isi CSV / teks soal di sini..."
                  className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-300 text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md cursor-pointer"
                >
                  Proses Import Soal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
