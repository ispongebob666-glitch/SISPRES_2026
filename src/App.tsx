import React, { useState, useEffect } from 'react';
import { Navbar } from './components/common/Navbar.tsx';
import { LoginView } from './components/auth/LoginView.tsx';
import { ExamView } from './components/exam/ExamView.tsx';
import { ExamFinish } from './components/exam/ExamFinish.tsx';
import { LiveScoreView } from './components/livescore/LiveScoreView.tsx';
import { AdminLayout, AdminTab } from './components/admin/AdminLayout.tsx';
import { AdminDashboard } from './components/admin/AdminDashboard.tsx';
import { AdminParticipants } from './components/admin/AdminParticipants.tsx';
import { AdminQuestions } from './components/admin/AdminQuestions.tsx';
import { AdminResults } from './components/admin/AdminResults.tsx';
import { AdminRankings } from './components/admin/AdminRankings.tsx';
import { AdminActivityLogs } from './components/admin/AdminActivityLogs.tsx';
import { AdminSettings } from './components/admin/AdminSettings.tsx';
import { api } from './services/api.ts';
import type { UserRole, Participant, Exam } from './types/index.ts';

export default function App() {
  const [activeView, setActiveView] = useState<'login' | 'exam' | 'live-score' | 'admin'>('login');
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [finishedExam, setFinishedExam] = useState<Exam | null>(null);
  const [adminTab, setAdminTab] = useState<AdminTab>('dashboard');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const [settings, setSettings] = useState<any>(null);

  // Restore session from localStorage on mount & check query params & load public settings
  useEffect(() => {
    api.getPublicSettings().then((s: any) => setSettings(s)).catch(() => {});

    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');

    if (viewParam === 'live-score' || window.location.pathname === '/live-score') {
      setActiveView('live-score');
      return;
    }

    try {
      const savedRole = localStorage.getItem('sispres_role') as UserRole;
      const savedPart = localStorage.getItem('sispres_participant');

      if (savedRole === 'ADMIN' && localStorage.getItem('sispres_admin_token')) {
        setCurrentRole('ADMIN');
        setActiveView('admin');
      } else if (savedRole === 'ADMIN') {
        // Sesi admin lama tanpa token: minta login ulang
        localStorage.removeItem('sispres_role');
      } else if (savedRole === 'LIVE_SCORE') {
        setCurrentRole('LIVE_SCORE');
        setActiveView('live-score');
      } else if (savedRole === 'PESERTA' && savedPart) {
        const parsed = JSON.parse(savedPart);
        setParticipant(parsed);
        setCurrentRole('PESERTA');
        setActiveView('exam');
      }
    } catch {
      // Ignore parse error
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLoginSuccess = (role: UserRole, data: any) => {
    setCurrentRole(role);
    localStorage.setItem('sispres_role', role);

    if (role === 'PESERTA') {
      setParticipant(data);
      localStorage.setItem('sispres_participant', JSON.stringify(data));
      setActiveView('exam');
    } else if (role === 'LIVE_SCORE') {
      setActiveView('live-score');
    } else if (role === 'ADMIN') {
      setActiveView('admin');
      setAdminTab('dashboard');
    }
  };

  const handleLogout = () => {
    setCurrentRole(null);
    setParticipant(null);
    setFinishedExam(null);
    localStorage.removeItem('sispres_role');
    localStorage.removeItem('sispres_participant');
    localStorage.removeItem('sispres_admin_token');
    setActiveView('login');
  };

  const handleExamFinished = (exam: Exam) => {
    setFinishedExam(exam);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased selection:bg-emerald-200 selection:text-emerald-900">
      {/* Top Navbar */}
      <Navbar
        currentRole={currentRole}
        activeView={activeView}
        onNavigate={(view) => {
          // Prevent candidate from leaving active exam unless intentional
          if (activeView === 'exam' && view !== 'exam' && !finishedExam) {
            const leave = confirm('Ujian sedang berlangsung! Apakah Anda yakin ingin membuka halaman lain? Timer akan tetap berjalan.');
            if (!leave) return;
          }
          setActiveView(view);
        }}
        onLogout={handleLogout}
        userLabel={participant ? `${participant.nama} (${participant.gender.toUpperCase()})` : undefined}
        isOnline={isOnline}
        judul1={settings?.judul1}
        judul2={settings?.judul2}
        logo1Url={settings?.logo1_url}
        logo2Url={settings?.logo2_url}
      />

      {/* VIEW 1: LOGIN */}
      {activeView === 'login' && (
        <LoginView
          onLoginSuccess={handleLoginSuccess}
          onOpenLiveScoreDirect={() => setActiveView('live-score')}
          settings={settings}
        />
      )}

      {/* VIEW 2: EXAM (PESERTA) */}
      {activeView === 'exam' && participant && (
        finishedExam ? (
          <ExamFinish
            exam={finishedExam}
            participant={participant}
            onGoToLiveScore={() => setActiveView('live-score')}
            onLogout={handleLogout}
          />
        ) : (
          <ExamView
            participant={participant}
            onFinish={handleExamFinished}
            onLogout={handleLogout}
          />
        )
      )}

      {/* VIEW 3: LIVE SCORE SCREEN */}
      {activeView === 'live-score' && (
        <LiveScoreView
          onBack={() => setActiveView(currentRole === 'ADMIN' ? 'admin' : 'login')}
          onOpenAdmin={() => {
            setCurrentRole('ADMIN');
            setActiveView('admin');
            setAdminTab('dashboard');
          }}
          isOperator={currentRole === 'LIVE_SCORE' || currentRole === 'ADMIN'}
        />
      )}

      {/* VIEW 4: ADMIN PANEL */}
      {activeView === 'admin' && (
        <AdminLayout
          currentTab={adminTab}
          onTabChange={setAdminTab}
          onOpenLiveScore={() => setActiveView('live-score')}
          onLogout={handleLogout}
        >
          {adminTab === 'dashboard' && (
            <AdminDashboard
              onNavigateTab={(tab) => setAdminTab(tab)}
              onOpenLiveScore={() => setActiveView('live-score')}
            />
          )}
          {adminTab === 'participants' && <AdminParticipants />}
          {adminTab === 'questions' && <AdminQuestions />}
          {adminTab === 'results' && <AdminResults />}
          {adminTab === 'rankings' && <AdminRankings />}
          {adminTab === 'logs' && <AdminActivityLogs />}
          {adminTab === 'settings' && <AdminSettings />}
          {adminTab === 'backup' && <AdminSettings />}
        </AdminLayout>
      )}
    </div>
  );
}
