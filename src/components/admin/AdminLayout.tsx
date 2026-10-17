import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  FileQuestion,
  Award,
  BarChart3,
  Activity,
  Settings,
  Database,
  LogOut,
  Tv,
  Menu,
  X,
} from 'lucide-react';

export type AdminTab =
  | 'dashboard'
  | 'participants'
  | 'questions'
  | 'results'
  | 'rankings'
  | 'logs'
  | 'settings'
  | 'backup';

interface AdminLayoutProps {
  currentTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  onOpenLiveScore: () => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentTab,
  onTabChange,
  onOpenLiveScore,
  onLogout,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems: Array<{ id: AdminTab; label: string; icon: any; color: string }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'text-emerald-400' },
    { id: 'participants', label: 'Data Peserta', icon: Users, color: 'text-blue-400' },
    { id: 'questions', label: 'Bank Soal', icon: FileQuestion, color: 'text-amber-400' },
    { id: 'results', label: 'Hasil Lomba', icon: Award, color: 'text-emerald-300' },
    { id: 'rankings', label: 'Peringkat', icon: BarChart3, color: 'text-yellow-400' },
    { id: 'logs', label: 'Aktivitas Peserta', icon: Activity, color: 'text-cyan-400' },
    { id: 'settings', label: 'Pengaturan & Cloud', icon: Settings, color: 'text-purple-400' },
    { id: 'backup', label: 'Backup & Restore', icon: Database, color: 'text-rose-400' },
  ];

  return (
    <div className="min-h-[calc(100vh-5rem)] flex bg-slate-100 relative">
      {/* MOBILE HEADER BAR */}
      <div className="md:hidden fixed top-20 left-0 right-0 z-40 bg-slate-950 text-white px-4 py-2.5 flex items-center justify-between border-b border-slate-800 shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-black tracking-widest text-emerald-300">PANEL ADMIN</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenLiveScore}
            className="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1"
          >
            <Tv className="w-3 h-3" /> Live Score
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-200"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* MOBILE DRAWER */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex">
          <div className="w-72 bg-slate-950 text-white p-6 flex flex-col justify-between shadow-2xl border-r border-slate-800">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="font-black text-sm text-emerald-400 uppercase tracking-wider">Menu Admin</span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-lg bg-slate-800 text-slate-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="space-y-1.5">
                {menuItems.map(item => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onTabChange(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-black flex items-center gap-3 transition-all cursor-pointer ${
                        isActive
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white ring-2 ring-amber-400 shadow-md'
                          : 'bg-white/5 hover:bg-white/10 text-slate-300'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-amber-300' : item.color}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <button
                type="button"
                onClick={onLogout}
                className="w-full py-2.5 rounded-xl bg-rose-500/20 text-rose-300 font-bold text-xs flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" /> Keluar Admin
              </button>
            </div>
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      {/* FIXED LEFT SIDEBAR (DESKTOP) - NEVER SCROLLS AWAY */}
      <aside className="hidden md:flex fixed left-0 top-20 bottom-0 w-64 bg-slate-950 text-white flex-col justify-between border-r border-slate-800 shadow-2xl z-30">
        <div className="p-4 space-y-6">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-950/60 border border-emerald-500/30">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-black text-emerald-300 uppercase tracking-widest">
              PANEL ADMIN
            </span>
          </div>

          <nav className="space-y-1.5">
            {menuItems.map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-testid={`admin-tab-${item.id}`}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-black flex items-center gap-3 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white ring-2 ring-amber-400 shadow-lg shadow-emerald-500/20 scale-[1.02]'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-300' : item.color}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* BOTTOM SIDEBAR ACTIONS */}
        <div className="p-4 border-t border-slate-800 space-y-2 bg-slate-900/50">
          <button
            type="button"
            onClick={onOpenLiveScore}
            className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition-transform hover:scale-105"
          >
            <Tv className="w-4 h-4" />
            <span>Buka Live Score</span>
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="w-full py-2 rounded-xl bg-rose-500/20 hover:bg-rose-600/30 text-rose-300 font-bold text-xs flex items-center justify-center gap-2 border border-rose-500/30 cursor-pointer transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar Admin</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT BODY (OFFSET BY ml-64 ON DESKTOP, SO SIDEBAR STAYS FIXED) */}
      <main className="flex-1 md:ml-64 p-4 sm:p-6 lg:p-8 mt-12 md:mt-0 max-w-full overflow-x-hidden">
        {children}
      </main>
    </div>
  );
};
