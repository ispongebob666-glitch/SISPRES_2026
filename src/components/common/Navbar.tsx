import React from 'react';
import { Award, Shield, Tv, UserCheck, LogOut, Sparkles } from 'lucide-react';
import type { UserRole } from '../../types/index.ts';

interface NavbarProps {
  currentRole: UserRole | null;
  activeView: 'login' | 'exam' | 'live-score' | 'admin';
  onNavigate: (view: 'login' | 'exam' | 'live-score' | 'admin') => void;
  onLogout: () => void;
  userLabel?: string;
  isOnline?: boolean;
  judul1?: string;
  judul2?: string;
  logo1Url?: string;
  logo2Url?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  activeView,
  onNavigate,
  onLogout,
  userLabel,
  isOnline = true,
  judul1 = 'SELEKSI SISWA PRESTASI TINGKAT DASAR',
  judul2 = 'SISPRES — SISTEM LOMBA SISWA PRESTASI',
  logo1Url,
  logo2Url,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white border-b-2 border-amber-400 shadow-xl">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-3">
        {/* Left: Dual Logo (Logo 1 & Logo 2) + Dual Titles (Judul 1 & Judul 2) */}
        <div 
          onClick={() => onNavigate(currentRole === 'ADMIN' ? 'admin' : currentRole === 'PESERTA' ? 'exam' : 'login')}
          className="flex items-center gap-2.5 sm:gap-3.5 cursor-pointer group select-none min-w-0"
        >
          {/* Logo 1 (Penyelenggara / Pendidikan) */}
          <div className="relative">
            {logo1Url ? (
              <img
                src={logo1Url}
                alt="Logo 1"
                className="w-10 h-10 sm:w-12 sm:h-12 object-contain rounded-xl p-1 bg-white/10 backdrop-blur border border-amber-300/60 shadow-md group-hover:scale-105 transition-transform"
              />
            ) : (
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20 border-2 border-white/40 group-hover:scale-105 transition-transform">
                <span className="text-lg sm:text-xl">🏛️</span>
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 text-[8px] font-black bg-amber-400 text-slate-950 px-1 py-0.2 rounded-full border border-slate-900 font-mono">
              L1
            </span>
          </div>

          {/* Logo 2 (Logo Lomba / SISPRES) */}
          <div className="relative">
            {logo2Url ? (
              <img
                src={logo2Url}
                alt="Logo 2"
                className="w-10 h-10 sm:w-12 sm:h-12 object-contain rounded-xl p-1 bg-white/10 backdrop-blur border border-emerald-300/60 shadow-md group-hover:scale-105 transition-transform"
              />
            ) : (
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 text-white flex items-center justify-center font-black shadow-lg shadow-emerald-500/20 border-2 border-emerald-300/50 group-hover:scale-105 transition-transform">
                <Award className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300 drop-shadow-md" />
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 text-[8px] font-black bg-emerald-400 text-slate-950 px-1 py-0.2 rounded-full border border-slate-900 font-mono">
              L2
            </span>
          </div>

          {/* Dual Titles: Judul 1 & Judul 2 */}
          <div className="min-w-0 pr-2">
            {/* Judul 1 */}
            <div className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-amber-300 truncate max-w-[220px] sm:max-w-md drop-shadow-xs flex items-center gap-1.5">
              <span>{judul1}</span>
            </div>
            {/* Judul 2 */}
            <h1 className="font-black text-sm sm:text-lg tracking-tight text-white group-hover:text-amber-200 transition-colors truncate max-w-[240px] sm:max-w-md drop-shadow-sm">
              {judul2}
            </h1>
          </div>
        </div>

        {/* Right Corner: TAB LIVE SCORE & TAB ADMIN IN TOP-RIGHT CORNER PER USER REQUEST */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Connection Status indicator */}
          <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-black/25 backdrop-blur text-emerald-300 border border-emerald-400/30">
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            <span>{isOnline ? 'Online' : 'Offline'}</span>
          </div>

          {/* TAB LIVE SCORE (DI POJOK KANAN ATAS, LANGSUNG BUKA TANPA PASSWORD) */}
          <button
            type="button"
            data-testid="btn-nav-livescore"
            aria-label="Papan Live Score"
            onClick={() => onNavigate('live-score')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer shadow-md ${
              activeView === 'live-score'
                ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 ring-2 ring-white shadow-amber-500/40'
                : 'bg-white/10 hover:bg-white/20 text-amber-300 border border-amber-300/40 hover:scale-105'
            }`}
          >
            <Tv className="w-4 h-4 text-amber-300 shrink-0" />
            <span className="font-extrabold tracking-wide">Live Score</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </button>

          {/* TAB ADMIN (DI POJOK KANAN ATAS) */}
          <button
            type="button"
            data-testid="btn-nav-admin"
            aria-label="Panel Admin"
            onClick={() => {
              if (currentRole === 'ADMIN') {
                onNavigate('admin');
              } else {
                onNavigate('login');
              }
            }}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer shadow-md ${
              activeView === 'admin'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white ring-2 ring-white shadow-emerald-500/40'
                : 'bg-white/10 hover:bg-white/20 text-emerald-300 border border-emerald-400/40 hover:scale-105'
            }`}
          >
            <Shield className="w-4 h-4 text-emerald-300 shrink-0" />
            <span className="font-extrabold tracking-wide">Admin</span>
          </button>

          {/* User profile / Logout if logged in */}
          {currentRole && (
            <div className="flex items-center gap-1.5 pl-1 sm:pl-2 border-l border-white/20">
              <div className="text-right hidden xl:block">
                <p className="text-xs font-bold text-amber-200 leading-tight truncate max-w-[140px]">
                  {userLabel || currentRole}
                </p>
                <span className="text-[9px] text-emerald-300 font-mono uppercase">
                  {currentRole}
                </span>
              </div>
              <button
                type="button"
                onClick={onLogout}
                title="Keluar / Ganti Akun"
                className="p-2 text-rose-300 hover:text-white hover:bg-rose-600/50 rounded-xl transition-colors border border-rose-400/30 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
