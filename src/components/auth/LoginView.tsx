import React, { useState, useEffect } from 'react';
import {
  User,
  Shield,
  ArrowRight,
  AlertCircle,
  Sparkles,
  Zap,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import type { Participant, UserRole, CompetitionSettings, Gender } from '../../types/index.ts';

interface LoginViewProps {
  onLoginSuccess: (role: UserRole, data: any) => void;
  onOpenLiveScoreDirect: () => void;
  settings?: Partial<CompetitionSettings>;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  onOpenLiveScoreDirect,
  settings,
}) => {
  const [roleTab, setRoleTab] = useState<'PESERTA' | 'ADMIN'>('PESERTA');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Peserta Login form state
  const [selectedParticipantId, setSelectedParticipantId] = useState('');
  const [selectedGender, setSelectedGender] = useState<Gender>('putra');

  // Admin Login form state
  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('admin123');

  const judul1 = settings?.judul1 || 'SELEKSI SISWA BERPRESTASI TINGKAT DASAR';
  const judul2 = settings?.judul2 || 'SISPRES — SISTEM LOMBA SISWA PRESTASI 2026';
  const logo3Url = settings?.logo3_url;
  const logo4Url = settings?.logo4_url;

  // Load registered participants
  useEffect(() => {
    api.getPublicParticipants()
      .then(data => {
        setParticipants(data);
      })
      .catch(err => {
        console.error('Gagal mengambil daftar peserta:', err);
      });
  }, []);

  // Reset participant selection when gender changes
  useEffect(() => {
    setSelectedParticipantId('');
  }, [selectedGender]);

  const handlePesertaLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      if (!selectedParticipantId) {
        throw new Error('Silakan pilih Nama Peserta.');
      }

      const res = await api.login({
        role: 'PESERTA',
        participant_id: selectedParticipantId,
      });
      onLoginSuccess('PESERTA', res.participant);
    } catch (err: any) {
      setErrorMessage(err.message || 'Data peserta tidak ditemukan pada sistem.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      const res = await api.login({
        role: 'ADMIN',
        username: adminUsername,
        password: adminPassword,
      });
      onLoginSuccess('ADMIN', res.user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Username atau password Admin tidak sesuai.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex flex-col justify-center py-4 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-gradient-to-br from-slate-900 via-emerald-950 to-teal-950">
      {/* VIBRANT FULL COLOR GLOWS & BACKGROUND SHAPES */}
      <div className="absolute -top-24 -left-24 w-80 h-80 bg-gradient-to-tr from-emerald-500/30 to-teal-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-20 w-80 h-80 bg-gradient-to-br from-amber-500/25 to-yellow-400/20 rounded-full blur-3xl pointer-events-none" />

      {/* MAIN CARD HEADER: DUAL LOGO + DUAL TITLES (FULL COLOR) */}
      <div className="sm:mx-auto sm:w-full sm:max-w-lg text-center mb-4">
        {/* Logo 3 & Logo 4 (besar, tanpa kotak; cocok untuk PNG transparan) */}
        {(logo3Url || logo4Url) && (
          <div className="flex items-center justify-center gap-6 sm:gap-10 mb-4">
            {logo3Url && (
              <img
                src={logo3Url}
                alt="Logo 3"
                className="h-24 sm:h-32 w-auto max-w-[44%] object-contain drop-shadow-lg"
              />
            )}
            {logo4Url && (
              <img
                src={logo4Url}
                alt="Logo 4"
                className="h-24 sm:h-32 w-auto max-w-[44%] object-contain drop-shadow-lg"
              />
            )}
          </div>
        )}

        {/* Dual Titles: Judul 1 & Judul 2 */}
        <div className="inline-block px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-400/20 via-emerald-400/20 to-teal-400/20 border border-amber-300/40 text-amber-300 text-[11px] sm:text-xs font-black uppercase tracking-widest mb-1.5 shadow-sm">
          {judul1}
        </div>
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-emerald-100 to-amber-200 drop-shadow-md">
          {judul2}
        </h1>
        <p className="mt-1 text-xs text-emerald-200/90 max-w-md mx-auto font-medium">
          Portal Satu Kali Pelaksanaan Lomba Siswa Prestasi • Cepat, Adil &amp; Terintegrasi Real-Time
        </p>
      </div>

      {/* LOGIN CARD */}
      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-black/40 border-2 border-amber-400/40 overflow-hidden">
          {/* Header Bar of Card */}
          <div className="p-3.5 bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-300" />
              <span className="font-black text-xs sm:text-sm uppercase tracking-wider">
                {roleTab === 'PESERTA' ? 'Login Peserta (Tanpa Password)' : 'Login Administrator'}
              </span>
            </div>
            {/* Admin toggle button in top right of card header */}
            <button
              type="button"
              onClick={() => {
                setRoleTab(roleTab === 'ADMIN' ? 'PESERTA' : 'ADMIN');
                setErrorMessage('');
              }}
              className="px-2.5 py-1 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-[11px] flex items-center gap-1 border border-white/30 transition-all cursor-pointer shadow-sm"
            >
              <Shield className="w-3.5 h-3.5 text-amber-300" />
              <span>{roleTab === 'ADMIN' ? 'Mode Peserta' : 'Panel Admin'}</span>
            </button>
          </div>

          <div className="p-5 sm:p-6">
            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-800 text-xs flex items-start gap-2.5 shadow-sm">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span className="font-bold leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {/* TAB: PESERTA LOGIN (TANPA PASSWORD) */}
            {roleTab === 'PESERTA' ? (
              <form onSubmit={handlePesertaLogin} className="space-y-4">
                <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-amber-50 border-2 border-emerald-200 rounded-2xl p-3 text-xs text-emerald-950 flex items-start gap-2.5 shadow-inner">
                  <Sparkles className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div className="leading-relaxed text-[11px] sm:text-xs">
                    <strong className="text-emerald-900 block font-black mb-0.5">
                      Pilih Nama Peserta
                    </strong>
                    Silakan pilih nama Anda dari daftar peserta yang terdaftar, lalu klik masuk.
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">
                    1. Kategori Peserta
                  </label>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <button
                      type="button"
                      onClick={() => setSelectedGender('putra')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        selectedGender === 'putra'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-2xs'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      👦 Putra
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedGender('putri')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        selectedGender === 'putri'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-2xs'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      👧 Putri
                    </button>
                  </div>

                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">
                    2. Pilih Nama Peserta
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-700">
                      <User className="w-4 h-4" />
                    </div>
                    <select
                      value={selectedParticipantId}
                      onChange={(e) => setSelectedParticipantId(e.target.value)}
                      className="w-full pl-10 pr-3 py-3 bg-slate-50 border-2 border-slate-300 rounded-2xl text-xs sm:text-sm font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-600 shadow-sm cursor-pointer"
                      required
                    >
                      <option value="" disabled>-- Pilih Nama Peserta --</option>
                      {participants.filter(p => p.gender === selectedGender).map(p => (
                        <option key={p.id} value={p.id}>
                          {p.nama}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* SUBMIT BUTTON */}
                <button
                  type="submit"
                  data-testid="btn-login-peserta"
                  aria-label="MASUK & MULAI MENGERJAKAN"
                  disabled={loading}
                  className="w-full py-3.5 px-5 rounded-2xl font-black text-sm bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-xl shadow-emerald-700/30 focus:outline-none focus:ring-4 focus:ring-emerald-500/50 transition-all flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-50 hover:scale-[1.01]"
                >
                  <span>{loading ? 'Memvalidasi Peserta...' : 'MASUK & MULAI MENGERJAKAN'}</span>
                  <ArrowRight className="w-4 h-4 text-amber-300 group-hover:translate-x-1.5 transition-transform" />
                </button>
              </form>
            ) : (
              /* TAB: ADMIN LOGIN */
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="bg-slate-100 border border-slate-300 rounded-2xl p-3 text-xs text-slate-700 flex items-start gap-2.5">
                  <Shield className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-black text-slate-900 block text-xs mb-0.5">
                      Autentikasi Administrator
                    </span>
                    Kelola data peserta, bank soal, hasil, dan konfigurasi kompetisi.
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">
                    Username Admin
                  </label>
                  <input
                    type="text"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    placeholder="admin"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-300 rounded-2xl text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">
                    Password Admin
                  </label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="admin123"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-300 rounded-2xl text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
                    required
                  />
                  <p className="mt-1 text-[10px] text-slate-500 font-semibold">
                    Default demo: <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1 py-0.5 rounded">admin</span> / <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1 py-0.5 rounded">admin123</span>
                  </p>
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setRoleTab('PESERTA')}
                    className="py-2.5 px-4 rounded-2xl font-bold text-xs border-2 border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    Kembali ke Peserta
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 px-4 rounded-2xl font-black text-xs sm:text-sm bg-slate-900 hover:bg-slate-800 text-white shadow-lg cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span>{loading ? 'Memverifikasi...' : 'Masuk Panel Admin'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
