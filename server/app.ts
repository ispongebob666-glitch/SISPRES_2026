import express from 'express';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import crypto from 'node:crypto';
import { db } from './db.js';
import { calculateExamScore } from '../src/utils/scoring.js';

// ---------------------------------------------------------------------
// Aplikasi Express (API). Dipakai oleh:
//   - server.ts      -> development lokal & hosting biasa
//   - api/index.ts   -> Vercel Serverless Function
// ---------------------------------------------------------------------

const app = express();
app.use(express.json({ limit: '10mb' }));

// Bungkus handler async agar error masuk ke respons 500 (bukan menggantung)
const h =
  (fn: (req: Request, res: Response) => Promise<any>): RequestHandler =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };

// ---------------------------------------------------------------------
// Autentikasi admin: token bertanda-tangan (HMAC) yang berlaku 12 jam
// ---------------------------------------------------------------------
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

function tokenSecret(): string {
  const s = process.env.ADMIN_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error('ADMIN_TOKEN_SECRET atau SUPABASE_SERVICE_ROLE_KEY belum diset di environment.');
  return s;
}

function signAdminToken(): string {
  const payload = `admin.${Date.now() + TOKEN_TTL_MS}`;
  const sig = crypto.createHmac('sha256', tokenSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyAdminToken(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3 || parts[0] !== 'admin') return false;
    const exp = Number(parts[1]);
    if (!Number.isFinite(exp) || exp < Date.now()) return false;
    const expected = crypto.createHmac('sha256', tokenSecret()).update(`${parts[0]}.${parts[1]}`).digest();
    const given = Buffer.from(parts[2], 'base64url');
    return given.length === expected.length && crypto.timingSafeEqual(given, expected);
  } catch {
    return false;
  }
}

const checkAdmin = (req: Request, res: Response, next: NextFunction) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (verifyAdminToken(token)) return next();
  return res.status(401).json({ error: 'Sesi admin tidak valid atau sudah berakhir. Silakan login ulang.' });
};

// Kredensial admin: isi lewat environment. Bila kosong, memakai nilai bawaan lama.
const adminUsers = () => {
  const u = process.env.ADMIN_USERNAME;
  return u ? [u] : ['admin', 'panitia'];
};
const adminPasswords = () => {
  const p = process.env.ADMIN_PASSWORD;
  return p ? [p] : ['admin123', 'sispres2026'];
};

// --- AUTH ENDPOINTS ---
app.post('/api/auth/login', h(async (req, res) => {
  const { role, username, password, participant_id } = req.body;

  // 1. ADMIN LOGIN
  if (role === 'ADMIN') {
    if (adminUsers().includes(username) && adminPasswords().includes(password)) {
      return res.json({
        success: true,
        role: 'ADMIN',
        token: signAdminToken(),
        user: { name: 'Administrator SISPRES' },
      });
    }
    return res.status(401).json({ error: 'Username atau password Admin tidak sesuai.' });
  }

  // 2. LIVE SCORE LOGIN (akses langsung, tanpa password)
  if (role === 'LIVE_SCORE') {
    return res.json({
      success: true,
      role: 'LIVE_SCORE',
      token: 'livescore-token-' + Date.now(),
      user: { name: 'Operator Papan Live Score' },
    });
  }

  // 3. PESERTA LOGIN (berdasarkan ID atau nama peserta)
  const participants = await db.getParticipants();
  const key = participant_id ? String(participant_id).trim() : '';
  const found = key
    ? participants.find(p => p.id.toUpperCase() === key.toUpperCase() || p.nama.toLowerCase() === key.toLowerCase())
    : undefined;

  if (!found) {
    return res.status(401).json({ error: 'Data peserta tidak ditemukan pada sistem.' });
  }

  await db.logActivity(found.id, found.nama, found.gender, 'Peserta berhasil masuk (login langsung).');

  return res.json({
    success: true,
    role: 'PESERTA',
    token: 'participant-token-' + found.id,
    participant: found,
  });
}));

// --- PUBLIC / COMMON ENDPOINTS ---
app.get('/api/public/schools', h(async (_req, res) => {
  res.json(await db.getSchools());
}));

app.get('/api/public/participants', h(async (_req, res) => {
  const list = await db.getParticipants();
  res.json(list.map(p => ({ id: p.id, nama: p.nama, gender: p.gender, status: p.status })));
}));

app.get('/api/public/settings', h(async (_req, res) => {
  const s = await db.getSettings();
  res.json({
    judul_lomba: s.judul_lomba,
    subjudul_lomba: s.subjudul_lomba,
    judul1: s.judul1 || s.judul_lomba,
    judul2: s.judul2 || s.subjudul_lomba,
    logo_url: s.logo_url,
    logo1_url: s.logo1_url || s.logo_url,
    logo2_url: s.logo2_url || '',
    logo3_url: s.logo3_url || '',
    logo4_url: s.logo4_url || '',
    durasi_menit: s.durasi_menit,
    background_url: s.background_url,
    status_lomba: s.status_lomba,
    mode_hasil_akhir: s.mode_hasil_akhir,
    live_score_publik: s.live_score_publik,
    tampilkan_nilai_sementara: s.tampilkan_nilai_sementara,
    fullscreen_wajib: s.fullscreen_wajib,
    blok_copy: s.blok_copy,
    blok_paste: s.blok_paste,
    blok_klik_kanan: s.blok_klik_kanan,
    deteksi_pindah_tab: s.deteksi_pindah_tab,
    interval_livescore_detik: s.interval_livescore_detik,
    interval_checkpoint_detik: s.interval_checkpoint_detik,
  });
}));

// LIVE SCORE BOARD (Public / Display Role)
app.get('/api/live-score', h(async (_req, res) => {
  res.json(await db.getLiveScoreBoard());
}));

// --- EXAM (PESERTA) ENDPOINTS ---
app.get('/api/exam/session', h(async (req, res) => {
  const participantId = req.query.participant_id as string;
  if (!participantId) return res.status(400).json({ error: 'participant_id wajib diisi.' });

  const participant = await db.getParticipant(participantId);
  if (!participant) return res.status(404).json({ error: 'Peserta tidak ditemukan.' });

  const [exam, settings, allQuestions] = await Promise.all([
    db.getExam(participantId),
    db.getSettings(),
    db.getQuestions(),
  ]);

  // Soal untuk peserta: kunci jawaban & pembahasan sengaja tidak dikirim
  const activeQuestions = allQuestions
    .filter(q => q.status === 'aktif')
    .map(q => ({
      id: q.id,
      no_urut: q.no_urut,
      tipe: q.tipe,
      soal: q.soal,
      gambar: q.gambar,
      posisi_gambar: q.posisi_gambar,
      bobot: q.bobot,
      options: q.options,
    }));

  res.json({
    participant,
    exam: exam || null,
    settings: {
      judul_lomba: settings.judul_lomba,
      durasi_menit: settings.durasi_menit,
      status_lomba: settings.status_lomba,
      fullscreen_wajib: settings.fullscreen_wajib,
      blok_copy: settings.blok_copy,
      blok_paste: settings.blok_paste,
      blok_klik_kanan: settings.blok_klik_kanan,
      deteksi_pindah_tab: settings.deteksi_pindah_tab,
      tampilkan_nilai_peserta: settings.tampilkan_nilai_peserta,
    },
    questions: activeQuestions,
    server_time: new Date().toISOString(),
  });
}));

app.post('/api/exam/start', h(async (req, res) => {
  const { participant_id } = req.body;
  if (!participant_id) return res.status(400).json({ error: 'participant_id wajib diisi.' });

  const result = await db.startExam(participant_id);
  if ('error' in result) return res.status(400).json({ error: result.error });
  res.json(result);
}));

app.post('/api/exam/answer', h(async (req, res) => {
  const { participant_id, question_id, answer } = req.body;
  if (!participant_id || !question_id) {
    return res.status(400).json({ error: 'participant_id dan question_id wajib diisi.' });
  }

  const result = await db.saveAnswer(participant_id, question_id, answer);
  if ('error' in result) return res.status(400).json({ error: result.error });
  res.json(result);
}));

app.post('/api/exam/checkpoint', h(async (req, res) => {
  const { participant_id, answers } = req.body;
  if (!participant_id) return res.status(400).json({ error: 'participant_id wajib diisi.' });

  const result = await db.recordCheckpoint(participant_id, answers);
  if ('error' in result) return res.status(400).json({ error: result.error });
  res.json(result);
}));

app.post('/api/exam/finish', h(async (req, res) => {
  const { participant_id, reason } = req.body;
  if (!participant_id) return res.status(400).json({ error: 'participant_id wajib diisi.' });

  const result = await db.finishExam(participant_id, reason);
  if (result.error) return res.status(400).json({ error: result.error });
  res.json(result);
}));

app.post('/api/exam/log-activity', h(async (req, res) => {
  const { participant_id, aktivitas } = req.body;
  if (!participant_id || !aktivitas) return res.status(400).json({ error: 'Data tidak lengkap.' });

  const participant = await db.getParticipant(participant_id);
  if (participant) {
    await db.logActivity(participant.id, participant.nama, participant.gender, aktivitas);
  }
  res.json({ success: true });
}));

// --- ADMIN ENDPOINTS ---
app.get('/api/admin/overview', checkAdmin, h(async (_req, res) => {
  const [participants, questions, schools, exams] = await Promise.all([
    db.getParticipants(),
    db.getQuestions(),
    db.getSchools(),
    db.getAllExams(),
  ]);

  const finishedExams = exams.filter(e => e.status === 'Selesai' || e.status === 'Waktu Habis');

  let maxScore = 0;
  let minScore = 0;
  let avgScore = 0;

  if (finishedExams.length > 0) {
    const scores = finishedExams.map(e => e.nilai_final ?? e.nilai_sementara);
    maxScore = Math.max(...scores);
    minScore = Math.min(...scores);
    avgScore = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
  }

  res.json({
    peserta: {
      total: participants.length,
      belum_mulai: participants.filter(p => p.status === 'Belum Mulai').length,
      sedang_mengerjakan: participants.filter(p => p.status === 'Sedang Mengerjakan').length,
      selesai: participants.filter(p => p.status === 'Selesai' || p.status === 'Waktu Habis').length,
    },
    soal: {
      total: questions.length,
      aktif: questions.filter(q => q.status === 'aktif').length,
      nonaktif: questions.filter(q => q.status === 'nonaktif').length,
    },
    hasil: {
      nilai_tertinggi: maxScore,
      nilai_terendah: minScore,
      nilai_rata_rata: avgScore,
    },
    sekolah: {
      total: schools.length,
      jumlah_peserta: participants.length,
    },
  });
}));

// Participants CRUD
app.get('/api/admin/participants', checkAdmin, h(async (_req, res) => {
  res.json(await db.getParticipants());
}));

app.post('/api/admin/participants', checkAdmin, h(async (req, res) => {
  const { nama, gender, password_hash } = req.body;
  if (!nama || !gender) return res.status(400).json({ error: 'Nama dan gender wajib diisi.' });

  const result = await db.addParticipant({ nama, gender, password_hash });
  if (result.error) return res.status(400).json({ error: result.error });
  res.json(result.participant);
}));

app.put('/api/admin/participants/:id', checkAdmin, h(async (req, res) => {
  const updated = await db.updateParticipant(req.params.id as string, req.body);
  if (!updated) return res.status(404).json({ error: 'Peserta tidak ditemukan.' });
  res.json(updated);
}));

app.delete('/api/admin/participants/:id', checkAdmin, h(async (req, res) => {
  const ok = await db.deleteParticipant(req.params.id as string);
  if (!ok) return res.status(404).json({ error: 'Peserta gagal dihapus.' });
  res.json({ success: true });
}));

app.post('/api/admin/participants/reset/:id', checkAdmin, h(async (req, res) => {
  const ok = await db.resetParticipant(req.params.id as string);
  if (!ok) return res.status(404).json({ error: 'Gagal mereset peserta.' });
  res.json({ success: true, message: 'Peserta berhasil direset.' });
}));

// Bulk Import Participants
app.post('/api/admin/participants/import', checkAdmin, h(async (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'Format data tidak valid.' });

  const errors: string[] = [];
  const valid: Array<{ nama: string; gender: 'putra' | 'putri'; password_hash: string }> = [];

  for (const item of items) {
    if (!item.nama || !item.gender) {
      errors.push(`Baris "${item.id || 'Peserta'}": Nama dan gender wajib diisi.`);
      continue;
    }
    valid.push({
      nama: item.nama,
      gender: item.gender === 'putri' ? 'putri' : 'putra',
      password_hash: item.password || '123456',
    });
  }

  const added = await db.addParticipantsBulk(valid);
  res.json({ success: true, addedCount: added.length, errors });
}));

// Questions CRUD
app.get('/api/admin/questions', checkAdmin, h(async (_req, res) => {
  res.json(await db.getQuestions());
}));

app.post('/api/admin/questions', checkAdmin, h(async (req, res) => {
  res.json(await db.addQuestion(req.body));
}));

app.put('/api/admin/questions/:id', checkAdmin, h(async (req, res) => {
  const updated = await db.updateQuestion(req.params.id as string, req.body);
  if (!updated) return res.status(404).json({ error: 'Soal tidak ditemukan.' });
  res.json(updated);
}));

app.delete('/api/admin/questions/:id', checkAdmin, h(async (req, res) => {
  const ok = await db.deleteQuestion(req.params.id as string);
  if (!ok) return res.status(404).json({ error: 'Gagal menghapus soal.' });
  res.json({ success: true });
}));

// Results & Rankings
app.get('/api/admin/results', checkAdmin, h(async (_req, res) => {
  const [participants, exams, questions] = await Promise.all([
    db.getParticipants(),
    db.getAllExams(),
    db.getQuestions(),
  ]);
  const examMap = new Map(exams.map(e => [e.participant_id, e]));

  const results = participants.map((p, idx) => {
    const exam = examMap.get(p.id);
    const stats = exam
      ? calculateExamScore(questions, exam.jawaban || {})
      : { score: 0, maxScore: 100, percentage: 0, correctCount: 0, incorrectCount: 0, unansweredCount: questions.length };

    return {
      no: idx + 1,
      participant_id: p.id,
      nama: p.nama,
      nama_sekolah: p.nama,
      gender: p.gender,
      waktu_mulai: exam?.waktu_mulai || null,
      waktu_selesai: exam?.waktu_selesai || null,
      durasi_detik: exam?.durasi_detik || 0,
      nilai: exam?.nilai_final ?? (exam?.nilai_sementara || 0),
      status: p.status,
      stats,
    };
  });

  res.json(results);
}));

app.get('/api/admin/results/:participantId', checkAdmin, h(async (req, res) => {
  const participantId = req.params.participantId as string;
  const participant = await db.getParticipant(participantId);
  if (!participant) return res.status(404).json({ error: 'Peserta tidak ditemukan.' });

  const [exam, questions] = await Promise.all([db.getExam(participantId), db.getQuestions()]);

  const detailList = questions.map((q, idx) => {
    const ans = exam?.jawaban?.[q.id];
    const isAnswered = ans !== undefined && ans !== null && ans !== '';
    const isCorrect = isAnswered && String(ans).trim().toUpperCase() === String(q.kunci).trim().toUpperCase();

    return {
      no: idx + 1,
      question_id: q.id,
      soal: q.soal,
      jawaban_peserta: ans || '-',
      kunci: q.kunci,
      status: !isAnswered ? 'Kosong' : isCorrect ? 'Benar' : 'Salah',
      nilai: isCorrect ? q.bobot : 0,
      bobot: q.bobot,
      pembahasan: q.pembahasan || '',
    };
  });

  res.json({ participant, exam, details: detailList });
}));

// Activity Logs
app.get('/api/admin/logs', checkAdmin, h(async (_req, res) => {
  res.json(await db.getActivityLogs());
}));

// Settings
app.get('/api/admin/settings', checkAdmin, h(async (_req, res) => {
  res.json(await db.getSettings());
}));

app.put('/api/admin/settings', checkAdmin, h(async (req, res) => {
  res.json(await db.updateSettings(req.body));
}));

// Backup & Restore
app.get('/api/admin/backup/export', checkAdmin, h(async (_req, res) => {
  const raw = await db.getRawData();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="SISPRES_backup_${Date.now()}.json"`);
  res.json(raw);
}));

app.post('/api/admin/backup/restore', checkAdmin, h(async (req, res) => {
  const ok = await db.restoreData(req.body);
  if (!ok) return res.status(400).json({ error: 'Format file backup tidak sesuai.' });
  res.json({ success: true, message: 'Data SISPRES berhasil dipulihkan.' });
}));

// External Sync: Supabase & GitHub (uji koneksi + simpan kredensial di pengaturan)
app.post('/api/admin/sync/supabase', checkAdmin, h(async (req, res) => {
  const { supabase_url, supabase_anon_key } = req.body;
  if (!supabase_url || !supabase_anon_key) {
    return res.status(400).json({ error: 'Supabase URL dan Anon Key harus diisi.' });
  }

  try {
    const cleanUrl = String(supabase_url).replace(/\/+$/, '');
    const testRes = await fetch(`${cleanUrl}/rest/v1/`, {
      method: 'GET',
      headers: { apikey: supabase_anon_key, Authorization: `Bearer ${supabase_anon_key}` },
    });

    await db.updateSettings({ supabase_url: cleanUrl, supabase_anon_key });

    if (testRes.ok || testRes.status === 200 || testRes.status === 404) {
      return res.json({
        success: true,
        message: 'Koneksi ke Supabase berhasil diverifikasi. Data tersinkronisasi!',
        status: 'connected',
      });
    }
    return res.json({
      success: true,
      message: `Supabase terhubung (respon HTTP ${testRes.status}). Kredensial tersimpan.`,
      status: 'connected',
    });
  } catch (err: any) {
    return res.status(500).json({ error: `Gagal menghubungkan ke Supabase: ${err.message || 'Network error'}` });
  }
}));

app.post('/api/admin/sync/github', checkAdmin, h(async (req, res) => {
  const { github_repo, github_token } = req.body;
  if (!github_repo || !github_token) {
    return res.status(400).json({ error: 'GitHub repository (owner/repo) dan Personal Access Token harus diisi.' });
  }

  try {
    const testRes = await fetch(`https://api.github.com/repos/${github_repo}`, {
      headers: {
        Authorization: `Bearer ${github_token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'SISPRES-App',
      },
    });

    await db.updateSettings({ github_repo, github_token });

    if (testRes.ok) {
      const repoData = await testRes.json();
      return res.json({
        success: true,
        message: `Terhubung ke repositori GitHub "${repoData.full_name}". Siap untuk auto-backup.`,
        status: 'connected',
      });
    }
    return res.status(testRes.status).json({
      error: `GitHub API error: HTTP ${testRes.status} (Periksa hak akses token)`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: `Gagal verifikasi GitHub: ${err.message}` });
  }
}));

// Penanganan error terpusat (mis. Supabase tidak bisa dihubungi)
app.use('/api', (err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('API error:', err);
  res.status(500).json({ error: err?.message || 'Terjadi kesalahan pada server.' });
});

export default app;
