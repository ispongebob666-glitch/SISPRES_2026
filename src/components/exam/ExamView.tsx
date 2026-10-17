import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  ChevronLeft,
  ChevronRight,
  Wifi,
  WifiOff,
  Maximize2,
  Minimize2,
  FileText,
  AlertCircle,
  HelpCircle,
  ShieldAlert,
  Award,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import type { Participant, Question, Exam } from '../../types/index.ts';

interface ExamViewProps {
  participant: Participant;
  onFinish: (exam: Exam) => void;
  onLogout: () => void;
}

export const ExamView: React.FC<ExamViewProps> = ({ participant, onFinish, onLogout }) => {
  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [currentIndex, setCurrentIndex] = useState(0);

  // Answers map: { [question_id]: answer }
  const [answers, setAnswers] = useState<Record<string, any>>({});
  
  // Autosave and sync states
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('saved');
  const [lastCheckpointTime, setLastCheckpointTime] = useState<string>('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showDisconnectNotice, setShowDisconnectNotice] = useState(false);

  // Timer states
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number | null>(null);

  // Submission modal states
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [unansweredIndices, setUnansweredIndices] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Load session
  const fetchSession = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getExamSession(participant.id);
      setExam(data.exam);
      setQuestions(data.questions);
      setSettings(data.settings);

      if (data.exam) {
        setAnswers(data.exam.jawaban || {});
        if (data.exam.checkpoint_terakhir) {
          setLastCheckpointTime(new Date(data.exam.checkpoint_terakhir).toLocaleTimeString());
        }

        // Calculate timer remaining from server startTime + durasi
        if (data.exam.waktu_mulai && data.exam.status === 'Sedang Mengerjakan') {
          const startTimeMs = new Date(data.exam.waktu_mulai).getTime();
          const durationMs = (data.settings.durasi_menit || 45) * 60 * 1000;
          const endTimeMs = startTimeMs + durationMs;
          const remainingSecs = Math.max(0, Math.floor((endTimeMs - Date.now()) / 1000));
          setTimeRemainingSeconds(remainingSecs);
        } else if (data.exam.status === 'Selesai' || data.exam.status === 'Waktu Habis') {
          onFinish(data.exam);
        }
      }
    } catch (err: any) {
      console.error('Gagal memuat sesi lomba:', err);
    } finally {
      setLoading(false);
    }
  }, [participant.id, onFinish]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Online / Offline listener
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowDisconnectNotice(false);
      api.logActivity(participant.id, 'Koneksi internet kembali aktif.');
      // Push unsaved answers
      api.recordCheckpoint(participant.id, answers).catch(() => {});
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowDisconnectNotice(true);
      api.logActivity(participant.id, 'Koneksi internet terputus.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [participant.id, answers]);

  // Proctoring: Tab switch detection
  useEffect(() => {
    if (!exam || exam.status !== 'Sedang Mengerjakan' || !settings.deteksi_pindah_tab) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount(prev => prev + 1);
        api.logActivity(participant.id, 'Peserta berpindah tab / jendela.');
      } else {
        api.logActivity(participant.id, 'Peserta kembali ke jendela lomba.');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [exam, settings.deteksi_pindah_tab, participant.id]);

  // Proctoring: Block copy, paste, context menu
  useEffect(() => {
    if (!exam || exam.status !== 'Sedang Mengerjakan') return;

    const handleContextMenu = (e: MouseEvent) => {
      if (settings.blok_klik_kanan) {
        e.preventDefault();
        return false;
      }
    };

    const handleCopy = (e: ClipboardEvent) => {
      if (settings.blok_copy) {
        e.preventDefault();
        return false;
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      if (settings.blok_paste) {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
    };
  }, [exam, settings]);

  // Timer countdown hook
  useEffect(() => {
    if (timeRemainingSeconds === null || timeRemainingSeconds === undefined || !exam || exam.status !== 'Sedang Mengerjakan') {
      return;
    }

    if (timeRemainingSeconds <= 0) {
      // Auto-submit when time is up!
      handleFinishExam('waktu_habis');
      return;
    }

    const timer = setInterval(() => {
      setTimeRemainingSeconds(prev => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(timer);
          handleFinishExam('waktu_habis');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemainingSeconds, exam]);

  // 10-Second Auto Checkpoint
  useEffect(() => {
    if (!exam || exam.status !== 'Sedang Mengerjakan') return;

    const intervalSecs = settings.interval_checkpoint_detik || 10;
    const checkpointTimer = setInterval(async () => {
      try {
        const res = await api.recordCheckpoint(participant.id, answers);
        if (res.checkpoint_terakhir) {
          setLastCheckpointTime(new Date(res.checkpoint_terakhir).toLocaleTimeString());
        }
      } catch (err) {
        console.warn('Checkpoint autosync failed, will retry:', err);
      }
    }, intervalSecs * 1000);

    return () => clearInterval(checkpointTimer);
  }, [exam, answers, participant.id, settings.interval_checkpoint_detik]);

  // Handler: Start Exam
  const handleStartExam = async () => {
    try {
      setLoading(true);
      const res = await api.startExam(participant.id);
      setExam(res.exam);
      const durationSecs = (settings.durasi_menit || 45) * 60;
      setTimeRemainingSeconds(durationSecs);
      setLastCheckpointTime(new Date().toLocaleTimeString());
    } catch (err: any) {
      alert(err.message || 'Gagal memulai lomba.');
    } finally {
      setLoading(false);
    }
  };

  // Handler: Select Answer
  const handleSelectAnswer = async (questionId: string, answerValue: any) => {
    const updated = { ...answers, [questionId]: answerValue };
    setAnswers(updated);
    setSaveStatus('saving');

    try {
      await api.saveAnswer(participant.id, questionId, answerValue);
      setSaveStatus('saved');
    } catch (err) {
      console.error('Gagal menyimpan jawaban:', err);
      setSaveStatus('error');
    }
  };

  // Handler: Open Kirim Jawaban Modal
  const handleOpenSubmitCheck = () => {
    const unanswered: number[] = [];
    questions.forEach((q, idx) => {
      const a = answers[q.id];
      if (a === undefined || a === null || a === '' || (Array.isArray(a) && a.length === 0)) {
        unanswered.push(idx + 1);
      }
    });

    setUnansweredIndices(unanswered);
    setShowSubmitModal(true);
  };

  // Handler: Finish Exam
  const handleFinishExam = async (reason: 'submit_mandiri' | 'waktu_habis') => {
    try {
      setSubmitting(true);
      const res = await api.finishExam(participant.id, reason);
      if (res.exam) {
        onFinish(res.exam);
      }
    } catch (err: any) {
      alert(err.message || 'Gagal menyelesaikan lomba.');
    } finally {
      setSubmitting(false);
      setShowSubmitModal(false);
    }
  };

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
        api.logActivity(participant.id, 'Peserta mengaktifkan mode layar penuh.');
      }).catch(() => {});
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
        api.logActivity(participant.id, 'Peserta keluar dari mode layar penuh.');
      }).catch(() => {});
    }
  };

  // Format time remaining
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-700">Memuat Sesi Lomba SISPRES...</p>
        </div>
      </div>
    );
  }

  // 1. WELCOME SCREEN (Belum Mulai)
  if (!exam || exam.status === 'Belum Mulai') {
    return (
      <div className="min-h-[calc(100vh-4rem)] py-12 px-4 sm:px-6 lg:px-8 bg-slate-50 flex items-center justify-center">
        <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Full Color Header Banner with Dual Logos & Dual Titles */}
          <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 p-6 text-white text-center border-b-2 border-amber-400">
            {/* Dual Logos */}
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 text-slate-950 flex items-center justify-center font-black text-lg shadow-md border border-white">
                🏛️
              </div>
              <span className="text-amber-400 font-black text-sm">✕</span>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center font-black shadow-md border border-white">
                <Award className="w-6 h-6 text-amber-300" />
              </div>
            </div>

            <div className="text-[10px] font-black uppercase tracking-wider text-amber-300 mb-1">
              {settings.judul1 || 'SELEKSI SISWA PRESTASI TINGKAT DASAR'}
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-2">
              {settings.judul2 || settings.judul_lomba || 'LOMBA SISWA PRESTASI'}
            </h2>

            <span className="inline-block px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-widest mb-2 shadow-sm">
              Kategori {participant.gender === 'putra' ? 'PUTRA (L)' : 'PUTRI (P)'}
            </span>
            <p className="mt-1 text-emerald-100 text-xs sm:text-sm font-semibold">
              Peserta: <span className="text-amber-300 underline decoration-amber-400 decoration-2 font-bold">{participant.nama}</span>
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 font-semibold block">Nama Lomba</span>
                <span className="text-slate-900 font-bold text-sm">{settings.judul_lomba || 'Lomba Siswa Prestasi'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block">Durasi Pengerjaan</span>
                <span className="text-slate-900 font-bold text-sm">{settings.durasi_menit || 45} Menit</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block">Jumlah Soal</span>
                <span className="text-slate-900 font-bold text-sm">{questions.length} Butir Soal</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block">Status Sesi</span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold">
                  Belum Mulai
                </span>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600">
              <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                Ketentuan & Tata Tertib Lomba:
              </h3>
              <ul className="space-y-1.5 list-disc pl-4 text-slate-700">
                <li>Setiap peserta hanya berkesempatan mengikuti lomba <strong>1 kali</strong>.</li>
                <li>Timer akan berjalan terus menerus sejak tombol mulai ditekan.</li>
                <li>Menutup atau me-refresh browser <strong>tidak mengulang</strong> timer pengerjaan.</li>
                <li>Sistem dilengkapi <strong>Autosave</strong> &amp; <strong>Checkpoint otomatis setiap 10 detik</strong>.</li>
                <li>Dilarang berpindah jendela atau membuka tab lain selama lomba berlangsung.</li>
              </ul>
            </div>

            <button
              type="button"
              onClick={handleStartExam}
              className="w-full py-3.5 px-6 rounded-xl font-extrabold text-base bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-lg shadow-emerald-700/25 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01]"
            >
              <span>MULAI LOMBA SEKARANG</span>
              <ChevronRight className="w-5 h-5 text-amber-300" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. ACTIVE EXAM SCREEN
  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const isFirstQuestion = currentIndex === 0;
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;

  return (
    <div className={`min-h-[calc(100vh-4rem)] flex flex-col bg-slate-100 select-none ${settings.blok_copy ? 'select-none' : ''}`}>
      {/* Offline Alert Banner */}
      {showDisconnectNotice && (
        <div className="bg-rose-600 text-white px-4 py-2.5 text-xs font-bold flex items-center justify-between sticky top-16 z-30 shadow-md animate-pulse">
          <div className="flex items-center gap-2 max-w-4xl mx-auto">
            <WifiOff className="w-4 h-4 text-amber-300 shrink-0" />
            <span>⚠ Koneksi internet terputus. Jawaban terakhir telah disimpan di memori. Sistem akan otomatis mencoba menghubungkan kembali.</span>
          </div>
        </div>
      )}

      {/* Tab Switch Warning if proctoring triggered */}
      {tabSwitchCount > 0 && (
        <div className="bg-amber-500 text-slate-950 px-4 py-1.5 text-xs font-bold flex items-center justify-center gap-2 sticky top-16 z-20">
          <ShieldAlert className="w-4 h-4 text-slate-950" />
          <span>Peringatan Panitia: Anda terdeteksi meninggalkan layar ujian ({tabSwitchCount} kali). Aktivitas dicatat sistem!</span>
        </div>
      )}

      {/* EXAM HEADER */}
      <div className="bg-slate-900 text-white px-4 sm:px-6 py-3 border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Left: Participant Info */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-inner">
              {participant.gender === 'putra' ? 'PA' : 'PI'}
            </div>
            <div>
              <div className="text-xs font-bold text-white tracking-wide truncate max-w-[200px] sm:max-w-xs">
                {participant.nama}
              </div>
              <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1.5">
                <span>Kategori {participant.gender === 'putra' ? 'Putra' : 'Putri'}</span>
                <span>•</span>
                <span className="text-slate-400">ID: {participant.id}</span>
              </div>
            </div>
          </div>

          {/* Center: Dual Titles */}
          <div className="hidden md:block text-center">
            <div className="text-[10px] font-black text-amber-300 uppercase tracking-wider leading-tight">
              {settings.judul1 || 'SELEKSI SISWA PRESTASI TINGKAT DASAR'}
            </div>
            <div className="text-xs font-black text-white leading-tight">
              {settings.judul2 || settings.judul_lomba || 'SISPRES 2026'}
            </div>
            <div className="text-[10px] text-emerald-300 font-semibold mt-0.5">
              Soal {currentIndex + 1} dari {questions.length}
            </div>
          </div>

          {/* Right: Timer & Tools */}
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 font-mono text-sm sm:text-base font-extrabold shadow-inner ${
              (timeRemainingSeconds || 0) < 300
                ? 'bg-rose-950/80 border-rose-500 text-rose-300 animate-pulse'
                : 'bg-slate-800 border-slate-700 text-amber-300'
            }`}>
              <Clock className="w-4 h-4 text-amber-300" />
              <span>{timeRemainingSeconds !== null ? formatTimer(timeRemainingSeconds) : '--:--'}</span>
            </div>

            <button
              type="button"
              onClick={toggleFullscreen}
              title="Layar Penuh"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* STATUS & AUTOSAVE BAR */}
      <div className="bg-white border-b border-slate-200 px-4 py-2 text-xs text-slate-600">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
          {/* Autosave status indicator */}
          <div className="flex items-center gap-3">
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1 text-amber-600 font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <span>Menyimpan...</span>
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>✓ Jawaban tersimpan</span>
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="flex items-center gap-1 text-rose-600 font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>⚠ Jawaban belum tersimpan</span>
              </span>
            )}

            {lastCheckpointTime && (
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                • Checkpoint terakhir: {lastCheckpointTime}
              </span>
            )}
          </div>

          {/* Answered progress */}
          <div className="font-semibold text-slate-700 flex items-center gap-2">
            <span>Terjawab:</span>
            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
              {Object.keys(answers).filter(k => answers[k] !== undefined && answers[k] !== '' && answers[k] !== null).length} / {questions.length}
            </span>
          </div>
        </div>
      </div>

      {/* MAIN EXAM CONTENT (Desktop: 2 Columns - Numbers on left/top, Question on main area) */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* QUESTION NUMBERS GRID (Clean multi-row layout without nested scroll per #10) */}
        <div className="lg:col-span-4 order-2 lg:order-1">
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm sticky top-24">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>Daftar Nomor Soal</span>
              </h3>
              <span className="text-[11px] text-slate-500 font-semibold">Klik untuk berpindah</span>
            </div>

            {/* Grid of buttons without internal scroll container */}
            <div className="grid grid-cols-5 sm:grid-cols-5 gap-2 pt-1">
              {questions.map((q, idx) => {
                const isAnswered = answers[q.id] !== undefined && answers[q.id] !== null && answers[q.id] !== '' && (Array.isArray(answers[q.id]) ? answers[q.id].length > 0 : true);
                const isActive = idx === currentIndex;

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-11 rounded-xl text-xs font-extrabold flex flex-col items-center justify-center transition-all cursor-pointer relative ${
                      isActive
                        ? 'ring-2 ring-amber-500 ring-offset-2 bg-emerald-800 text-white shadow-md'
                        : isAnswered
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <span>{idx + 1}</span>
                    {isAnswered && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-300 mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-5 pt-3 border-t border-slate-100 grid grid-cols-3 gap-1 text-[10px] text-slate-600 font-semibold text-center">
              <div className="flex items-center justify-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-emerald-600 inline-block" />
                <span>Terjawab</span>
              </div>
              <div className="flex items-center justify-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-slate-200 border border-slate-300 inline-block" />
                <span>Kosong</span>
              </div>
              <div className="flex items-center justify-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-emerald-800 ring-1 ring-amber-500 inline-block" />
                <span>Aktif</span>
              </div>
            </div>

            {/* Kirim Jawaban Button underneath question numbers */}
            <div className="mt-5 pt-2">
              <button
                type="button"
                onClick={handleOpenSubmitCheck}
                className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Send className="w-3.5 h-3.5 text-amber-300" />
                <span>KIRIM JAWABAN LOMBA</span>
              </button>
            </div>
          </div>
        </div>

        {/* ACTIVE QUESTION CARD */}
        <div className="lg:col-span-8 order-1 lg:order-2">
          {currentQuestion ? (
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-sm flex flex-col justify-between min-h-[500px]">
              <div>
                {/* Question Metadata Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
                  <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    SOAL NOMOR {currentIndex + 1}
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    Bobot: {currentQuestion.bobot || 5} Poin
                  </span>
                </div>

                {/* Optional Image at Top */}
                {currentQuestion.gambar && (!currentQuestion.posisi_gambar || currentQuestion.posisi_gambar === 'atas') && (
                  <div className="mb-5 max-w-md mx-auto">
                    <img
                      src={currentQuestion.gambar}
                      alt={`Gambar Soal ${currentIndex + 1}`}
                      className="rounded-xl border border-slate-200 max-h-60 object-contain mx-auto"
                    />
                  </div>
                )}

                {/* Question Text */}
                <div className="text-base sm:text-lg font-semibold text-slate-900 leading-relaxed mb-6">
                  {currentQuestion.soal}
                </div>

                {/* Optional Image at Bottom */}
                {currentQuestion.gambar && currentQuestion.posisi_gambar === 'bawah' && (
                  <div className="mb-6 max-w-md mx-auto">
                    <img
                      src={currentQuestion.gambar}
                      alt={`Gambar Soal ${currentIndex + 1}`}
                      className="rounded-xl border border-slate-200 max-h-60 object-contain mx-auto"
                    />
                  </div>
                )}

                {/* Options List */}
                <div className="space-y-3">
                  {currentQuestion.options && currentQuestion.options.map(opt => {
                    const isSelected = currentAnswer === opt.label;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => handleSelectAnswer(currentQuestion.id, opt.label)}
                        className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center gap-3.5 ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/80 shadow-xs ring-2 ring-emerald-500/20'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {/* Radio Letter Badge */}
                        <div className={`w-8 h-8 rounded-lg font-bold text-sm flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-emerald-700 text-white'
                            : 'bg-slate-100 text-slate-700 border border-slate-300'
                        }`}>
                          {opt.label}
                        </div>

                        {/* Option Text */}
                        <div className="text-sm font-semibold text-slate-800 flex-1 leading-snug">
                          {opt.teks}
                        </div>

                        {opt.gambar && (
                          <img src={opt.gambar} alt={opt.label} className="h-10 object-contain rounded" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Navigation Prev / Next Footer */}
              <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                  disabled={isFirstQuestion}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>SEBELUMNYA</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                  disabled={isLastQuestion}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>SELANJUTNYA</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-8 text-center text-slate-500">
              Tidak ada soal yang tersedia.
            </div>
          )}
        </div>
      </div>

      {/* CONFIRMATION / UNANSWERED VALIDATION MODAL */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-7 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {unansweredIndices.length > 0 ? (
              // Unanswered warning modal - candidate cannot submit until all questions answered per #16
              <div>
                <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  Soal Belum Lengkap Dijawab
                </h3>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  Masih terdapat <span className="font-bold text-rose-600">{unansweredIndices.length} soal</span> yang belum dijawab. Peserta wajib menjawab seluruh soal sebelum mengirimkan jawaban akhir.
                </p>

                <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1.5">
                    Nomor Soal Yang Belum Dijawab:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {unansweredIndices.map(num => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => {
                          setCurrentIndex(num - 1);
                          setShowSubmitModal(false);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 font-bold text-xs hover:bg-rose-200 cursor-pointer"
                      >
                        No. {num}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowSubmitModal(false)}
                    className="px-5 py-2.5 rounded-xl font-bold text-xs bg-slate-900 text-white hover:bg-slate-800 cursor-pointer"
                  >
                    Kembali Kerjakan Soal
                  </button>
                </div>
              </div>
            ) : (
              // Confirmation modal
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  Kirim Jawaban Lomba?
                </h3>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  Seluruh {questions.length} butir soal telah berhasil dijawab. Setelah dikirim, Anda <strong className="text-slate-800">tidak dapat mengubah atau mengerjakan kembali</strong>.
                </p>

                <div className="mt-6 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowSubmitModal(false)}
                    disabled={submitting}
                    className="px-4 py-2.5 rounded-xl font-bold text-xs border border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    BATAL
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFinishExam('submit_mandiri')}
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5 text-amber-300" />
                    <span>{submitting ? 'Mengirim...' : 'KIRIM JAWABAN'}</span>
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
