import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  Database,
  Cloud,
  Github,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Download,
  Upload,
  Lock,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import type { CompetitionSettings } from '../../types/index.ts';

export const AdminSettings: React.FC = () => {
  const [settings, setSettings] = useState<CompetitionSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successNotice, setSuccessNotice] = useState('');
  const [errorNotice, setErrorNotice] = useState('');

  // Supabase Sync states
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [supabaseTesting, setSupabaseTesting] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<string>('');

  // GitHub Sync states
  const [githubRepo, setGithubRepo] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [githubTesting, setGithubTesting] = useState(false);
  const [githubStatus, setGithubStatus] = useState<string>('');

  // Restore state
  const [restoreJson, setRestoreJson] = useState('');
  const [showRestoreModal, setShowRestoreModal] = useState(false);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await api.getSettings();
      setSettings(data);
      setSupabaseUrl(data.supabase_url || '');
      setSupabaseAnonKey(data.supabase_anon_key || '');
      setGithubRepo(data.github_repo || '');
      setGithubToken(data.github_token || '');
    } catch (err) {
      console.error('Gagal mengambil pengaturan:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    try {
      setSaving(true);
      setSuccessNotice('');
      setErrorNotice('');

      const updated = await api.updateSettings({
        ...settings,
        supabase_url: supabaseUrl,
        supabase_anon_key: supabaseAnonKey,
        github_repo: githubRepo,
        github_token: githubToken,
      });

      setSettings(updated);
      setSuccessNotice('Pengaturan dan parameter lomba berhasil disimpan.');
      setTimeout(() => setSuccessNotice(''), 4000);
    } catch (err: any) {
      setErrorNotice(err.message || 'Gagal menyimpan pengaturan.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestSupabase = async () => {
    if (!supabaseUrl || !supabaseAnonKey) {
      alert('Silakan masukkan Supabase Project URL dan Anon Key terlebih dahulu.');
      return;
    }

    try {
      setSupabaseTesting(true);
      setSupabaseStatus('');
      const res = await api.syncSupabase(supabaseUrl, supabaseAnonKey);
      setSupabaseStatus(res.message);
    } catch (err: any) {
      setSupabaseStatus(`Error: ${err.message}`);
    } finally {
      setSupabaseTesting(false);
    }
  };

  const handleTestGithub = async () => {
    if (!githubRepo || !githubToken) {
      alert('Silakan masukkan GitHub Repository (owner/repo) dan Personal Access Token.');
      return;
    }

    try {
      setGithubTesting(true);
      setGithubStatus('');
      const res = await api.syncGithub(githubRepo, githubToken);
      setGithubStatus(res.message);
    } catch (err: any) {
      setGithubStatus(`Error: ${err.message}`);
    } finally {
      setGithubTesting(false);
    }
  };

  const handleDownloadBackup = async () => {
    try {
      await api.downloadBackup();
    } catch (err: any) {
      alert(`Gagal mengunduh backup: ${err.message}`);
    }
  };

  const handleProcessRestore = async () => {
    try {
      const parsed = JSON.parse(restoreJson);
      await api.restoreBackup(parsed);
      alert('Data backup berhasil dipulihkan!');
      setShowRestoreModal(false);
      await loadSettings();
    } catch (err: any) {
      alert(`Format JSON tidak valid atau gagal restore: ${err.message}`);
    }
  };

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Pengaturan &amp; Cloud Storage</span>
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Konfigurasi parameter lomba, keamanan proctoring, serta koneksi real-time ke Supabase dan GitHub.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSaveSettings}
          disabled={saving}
          className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
        >
          <Save className="w-4 h-4 text-amber-300" />
          <span>{saving ? 'Menyimpan...' : 'Simpan Semua Perubahan'}</span>
        </button>
      </div>

      {successNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successNotice}</span>
        </div>
      )}

      {errorNotice && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          <span>{errorNotice}</span>
        </div>
      )}

      {/* CLOUD INTEGRATION SECTION (SUPABASE & GITHUB) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SUPABASE REAL-TIME STORAGE */}
        <div className="bg-white rounded-2xl p-6 border-2 border-emerald-500/30 shadow-md">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <Cloud className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">
                Koneksi Supabase (Real-Time Database)
              </h3>
              <p className="text-[11px] text-slate-500">
                Hubungkan ke database PostgreSQL / Supabase untuk persistensi cloud live.
              </p>
            </div>
          </div>

          <div className="space-y-3.5 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Supabase Project URL
              </label>
              <input
                type="text"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://your-project.supabase.co"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Supabase Anon / Public API Key
              </label>
              <input
                type="password"
                value={supabaseAnonKey}
                onChange={(e) => setSupabaseAnonKey(e.target.value)}
                placeholder="eyJh......"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={handleTestSupabase}
                disabled={supabaseTesting}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${supabaseTesting ? 'animate-spin' : ''}`} />
                <span>{supabaseTesting ? 'Menguji...' : 'Uji Koneksi & Sinkronkan'}</span>
              </button>

              <span className="text-[11px] text-slate-400">
                Built-in DB aktif otomatis
              </span>
            </div>

            {supabaseStatus && (
              <div className={`p-3 rounded-xl border text-xs font-semibold ${
                supabaseStatus.includes('Error')
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}>
                {supabaseStatus}
              </div>
            )}
          </div>
        </div>

        {/* GITHUB REPO INTEGRATION */}
        <div className="bg-white rounded-2xl p-6 border-2 border-slate-300 shadow-md">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">
                Koneksi GitHub (Cloud Version &amp; Backup)
              </h3>
              <p className="text-[11px] text-slate-500">
                Koneksikan repository GitHub untuk arsip hasil dan bank soal terpusat.
              </p>
            </div>
          </div>

          <div className="space-y-3.5 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                GitHub Repository (owner/repo)
              </label>
              <input
                type="text"
                value={githubRepo}
                onChange={(e) => setGithubRepo(e.target.value)}
                placeholder="contoh: ispongebob/sispres-lomba"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                GitHub Personal Access Token (PAT)
              </label>
              <input
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="ghp_..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={handleTestGithub}
                disabled={githubTesting}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Github className="w-3.5 h-3.5 text-amber-300" />
                <span>{githubTesting ? 'Menghubungkan...' : 'Verifikasi GitHub'}</span>
              </button>
            </div>

            {githubStatus && (
              <div className={`p-3 rounded-xl border text-xs font-semibold ${
                githubStatus.includes('Error')
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}>
                {githubStatus}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* COMPETITION SETTINGS FORM */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tampilan & Ujian */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-extrabold text-sm text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Settings className="w-4 h-4 text-emerald-600" />
            <span>Identitas &amp; Parameter Lomba</span>
          </h3>

          <div className="space-y-3.5 text-xs">
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="font-bold text-emerald-900 block mb-2">Konfigurasi Dua Judul &amp; Dua Logo Resmi:</span>
              <div className="space-y-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Judul 1 (Header Atas)</label>
                  <input
                    type="text"
                    value={settings.judul1 || ''}
                    onChange={(e) => setSettings({ ...settings, judul1: e.target.value })}
                    placeholder="Contoh: SELEKSI SISWA BERPRESTASI TINGKAT KABUPATEN/KOTA"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Judul 2 (Nama Utama Lomba)</label>
                  <input
                    type="text"
                    value={settings.judul2 || ''}
                    onChange={(e) => setSettings({ ...settings, judul2: e.target.value })}
                    placeholder="Contoh: SISPRES — SISTEM LOMBA SISWA PRESTASI 2026"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">URL Logo 1 (Penyelenggara)</label>
                    <input
                      type="text"
                      value={settings.logo1_url || ''}
                      onChange={(e) => setSettings({ ...settings, logo1_url: e.target.value })}
                      placeholder="https://... (PNG/SVG)"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">URL Logo 2 (Logo Event)</label>
                    <input
                      type="text"
                      value={settings.logo2_url || ''}
                      onChange={(e) => setSettings({ ...settings, logo2_url: e.target.value })}
                      placeholder="https://... (PNG/SVG)"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Deskripsi Tambahan / Subjudul</label>
              <input
                type="text"
                value={settings.subjudul_lomba}
                onChange={(e) => setSettings({ ...settings, subjudul_lomba: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Durasi Pengerjaan (Menit)</label>
                <input
                  type="number"
                  value={settings.durasi_menit}
                  onChange={(e) => setSettings({ ...settings, durasi_menit: Number(e.target.value) })}
                  min={1}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Kriteria Pemecah Seri</label>
                <select
                  value={settings.kriteria_seri}
                  onChange={(e) => setSettings({ ...settings, kriteria_seri: e.target.value as any })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-800"
                >
                  <option value="durasi_tercepat">Durasi Tercepat</option>
                  <option value="soal_terbanyak">Soal Terbanyak</option>
                  <option value="imbang">Tetap Imbang</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Tampilkan Nilai ke Peserta</label>
              <select
                value={settings.tampilkan_nilai_peserta}
                onChange={(e) => setSettings({ ...settings, tampilkan_nilai_peserta: e.target.value as any })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-800"
              >
                <option value="langsung">Langsung setelah submit</option>
                <option value="setelah_selesai">Setelah lomba resmi selesai</option>
                <option value="jangan">Jangan tampilkan</option>
              </select>
            </div>
          </div>
        </div>

        {/* Keamanan & Live Score Configuration */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-extrabold text-sm text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-600" />
            <span>Pengamanan Ujian &amp; Live Score</span>
          </h3>

          <div className="space-y-3 text-xs">
            {/* Toggles */}
            <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
              <span className="font-bold text-slate-700">Tampilkan Nilai Sementara di Live Score</span>
              <input
                type="checkbox"
                checked={settings.tampilkan_nilai_sementara}
                onChange={(e) => setSettings({ ...settings, tampilkan_nilai_sementara: e.target.checked })}
                className="w-4 h-4 accent-emerald-600 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
              <span className="font-bold text-slate-700">Akses Live Score Terbuka untuk Publik</span>
              <input
                type="checkbox"
                checked={settings.live_score_publik}
                onChange={(e) => setSettings({ ...settings, live_score_publik: e.target.checked })}
                className="w-4 h-4 accent-emerald-600 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
              <span className="font-bold text-slate-700">Deteksi Pindah Tab &amp; Jendela (Audit Log)</span>
              <input
                type="checkbox"
                checked={settings.deteksi_pindah_tab}
                onChange={(e) => setSettings({ ...settings, deteksi_pindah_tab: e.target.checked })}
                className="w-4 h-4 accent-emerald-600 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
              <span className="font-bold text-slate-700">Blokir Copy, Paste, &amp; Klik Kanan</span>
              <input
                type="checkbox"
                checked={settings.blok_copy}
                onChange={(e) => setSettings({
                  ...settings,
                  blok_copy: e.target.checked,
                  blok_paste: e.target.checked,
                  blok_klik_kanan: e.target.checked,
                })}
                className="w-4 h-4 accent-emerald-600 rounded"
              />
            </label>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Interval Live Score</label>
                <div className="flex items-center gap-1.5 font-bold font-mono">
                  <input
                    type="number"
                    value={settings.interval_livescore_detik}
                    onChange={(e) => setSettings({ ...settings, interval_livescore_detik: Number(e.target.value) })}
                    min={5}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                  <span>dtk</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Interval Checkpoint</label>
                <div className="flex items-center gap-1.5 font-bold font-mono">
                  <input
                    type="number"
                    value={settings.interval_checkpoint_detik}
                    onChange={(e) => setSettings({ ...settings, interval_checkpoint_detik: Number(e.target.value) })}
                    min={5}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                  <span>dtk</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BACKUP & RESTORE SECTION (#33) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold">
            <Database className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-slate-900">
              Cadangan &amp; Pemulihan Data (Backup &amp; Restore)
            </h3>
            <p className="text-[11px] text-slate-500">
              Download seluruh data peserta, sekolah, bank soal, dan hasil dalam format JSON terenkripsi.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleDownloadBackup}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
          >
            <Download className="w-4 h-4 text-amber-300" />
            <span>Download File Backup Lengkap (JSON)</span>
          </button>

          <button
            type="button"
            onClick={() => setShowRestoreModal(true)}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Upload className="w-4 h-4 text-emerald-700" />
            <span>Pulihkan Data dari Backup</span>
          </button>
        </div>
      </div>

      {/* RESTORE MODAL */}
      {showRestoreModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
            <h3 className="font-extrabold text-base text-slate-900 mb-2">
              Pulihkan Data SISPRES (Restore Backup)
            </h3>
            <p className="text-xs text-rose-600 font-semibold mb-4 leading-relaxed">
              Peringatan: Melakukan pemulihan data akan menimpa data yang sedang aktif saat ini.
            </p>

            <textarea
              rows={8}
              value={restoreJson}
              onChange={(e) => setRestoreJson(e.target.value)}
              placeholder="Tempelkan isi file JSON backup di sini..."
              className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-4"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRestoreModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleProcessRestore}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md cursor-pointer"
              >
                Proses Pemulihan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
