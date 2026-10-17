import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  School,
  Participant,
  Question,
  Exam,
  ActivityLog,
  CompetitionSettings,
  LiveScoreBoard,
} from '../src/types/index.js';
import { calculateExamScore, rankParticipants } from '../src/utils/scoring.js';

export interface DatabaseSchema {
  schools: School[];
  participants: Participant[];
  questions: Question[];
  exams: Record<string, Exam>; // participant_id -> Exam
  activity_logs: ActivityLog[];
  settings: CompetitionSettings;
}

const DEFAULT_SETTINGS: CompetitionSettings = {
  judul_lomba: 'LOMBA SISWA PRESTASI TINGKAT DASAR',
  subjudul_lomba: 'Ajang Kreasi, Inovasi, dan Prestasi Siswa Berkarakter & Cerdas',
  judul1: 'SELEKSI SISWA BERPRESTASI TINGKAT KABUPATEN/KOTA',
  judul2: 'SISPRES — SISTEM LOMBA SISWA PRESTASI 2026',
  durasi_menit: 45,
  logo_url: '',
  logo1_url: '',
  logo2_url: '',
  background_url: '',
  status_lomba: 'berlangsung',
  mode_hasil_akhir: false,
  acak_soal: false,
  acak_jawaban: false,
  fullscreen_wajib: false,
  blok_copy: true,
  blok_paste: true,
  blok_klik_kanan: true,
  deteksi_pindah_tab: true,
  tampilkan_nilai_peserta: 'langsung',
  live_score_publik: true,
  tampilkan_nilai_sementara: true,
  interval_livescore_detik: 10,
  interval_checkpoint_detik: 10,
  kriteria_seri: 'durasi_tercepat',
  supabase_url: '',
  supabase_anon_key: '',
  github_repo: '',
  github_token: '',
};

// ---------------------------------------------------------------------
// Koneksi Supabase (hanya di server, memakai service_role key)
// ---------------------------------------------------------------------
let _client: SupabaseClient | null = null;

function client(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Konfigurasi server belum lengkap: SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY harus diisi di environment.'
    );
  }
  _client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return _client;
}

function check(res: { data: any; error: { message: string } | null }, ctx: string): any {
  if (res.error) throw new Error(`[Supabase:${ctx}] ${res.error.message}`);
  return res.data;
}

// Supabase mengembalikan null untuk kolom kosong; aplikasi memakai undefined.
function nullToUndef<T extends Record<string, any>>(row: T, keys: string[]): T {
  const out: any = { ...row };
  for (const k of keys) if (out[k] === null) out[k] = undefined;
  return out;
}

const mapParticipant = (r: any): Participant => nullToUndef(r, ['exam_id']) as Participant;
const mapQuestion = (r: any): Question =>
  nullToUndef(r, ['gambar', 'posisi_gambar', 'pembahasan']) as Question;
const mapExam = (r: any): Exam => ({ ...r, jawaban: r.jawaban || {} }) as Exam;

// ID berikutnya = angka terbesar yang sudah ada + 1 (aman setelah ada data yang dihapus)
function nextNumber(ids: string[], prefix: string): number {
  let max = 0;
  for (const id of ids) {
    if (id.startsWith(prefix)) {
      const n = parseInt(id.slice(prefix.length), 10);
      if (!Number.isNaN(n) && n > max) max = n;
    }
  }
  return max + 1;
}

const isDone = (s: string | undefined) => s === 'Selesai' || s === 'Waktu Habis';

const countAnswered = (jawaban: Record<string, any>) =>
  Object.keys(jawaban).filter(k => jawaban[k] !== undefined && jawaban[k] !== null && jawaban[k] !== '').length;

class Database {
  // ---------------- Schools ----------------
  async getSchools(): Promise<School[]> {
    const rows = check(await client().from('schools').select('*').order('id'), 'schools.select');
    return rows || [];
  }

  async addSchool(nama_sekolah: string): Promise<School> {
    const existing = await this.getSchools();
    const id = `SCH-${String(nextNumber(existing.map(s => s.id), 'SCH-')).padStart(2, '0')}`;
    const row = { id, nama_sekolah: nama_sekolah.trim() };
    check(await client().from('schools').insert(row), 'schools.insert');
    return row;
  }

  async deleteSchool(schoolId: string): Promise<boolean> {
    const rows = check(await client().from('schools').delete().eq('id', schoolId).select('id'), 'schools.delete');
    return (rows?.length || 0) > 0;
  }

  // ---------------- Participants ----------------
  async getParticipants(): Promise<Participant[]> {
    const rows = check(await client().from('participants').select('*').order('id'), 'participants.select');
    return (rows || []).map(mapParticipant);
  }

  async getParticipant(id: string): Promise<Participant | undefined> {
    const row = check(await client().from('participants').select('*').eq('id', id).maybeSingle(), 'participants.get');
    return row ? mapParticipant(row) : undefined;
  }

  private async nextParticipantIds(count: number): Promise<string[]> {
    const rows = check(await client().from('participants').select('id'), 'participants.ids') || [];
    let n = nextNumber(rows.map((r: any) => r.id), 'P-');
    return Array.from({ length: count }, () => `P-${String(n++).padStart(3, '0')}`);
  }

  async addParticipant(p: { nama: string; gender: 'putra' | 'putri'; password_hash: string }): Promise<{ participant?: Participant; error?: string }> {
    const [id] = await this.nextParticipantIds(1);
    const newParticipant: Participant = {
      id,
      nama: p.nama.trim(),
      gender: p.gender,
      password_hash: p.password_hash || '123456',
      status: 'Belum Mulai',
    };
    check(await client().from('participants').insert(newParticipant), 'participants.insert');
    return { participant: newParticipant };
  }

  // Dipakai import massal: 1x insert untuk semua baris
  async addParticipantsBulk(items: Array<{ nama: string; gender: 'putra' | 'putri'; password_hash: string }>): Promise<Participant[]> {
    if (items.length === 0) return [];
    const ids = await this.nextParticipantIds(items.length);
    const rows: Participant[] = items.map((p, i) => ({
      id: ids[i],
      nama: p.nama.trim(),
      gender: p.gender,
      password_hash: p.password_hash || '123456',
      status: 'Belum Mulai',
    }));
    check(await client().from('participants').insert(rows), 'participants.bulk');
    return rows;
  }

  async updateParticipant(id: string, updates: Partial<Participant>): Promise<Participant | undefined> {
    const { id: _ignore, ...safe } = updates as any;
    const row = check(
      await client().from('participants').update(safe).eq('id', id).select('*').maybeSingle(),
      'participants.update'
    );
    return row ? mapParticipant(row) : undefined;
  }

  async deleteParticipant(id: string): Promise<boolean> {
    check(await client().from('exams').delete().eq('participant_id', id), 'exams.delete');
    const rows = check(await client().from('participants').delete().eq('id', id).select('id'), 'participants.delete');
    return (rows?.length || 0) > 0;
  }

  async resetParticipant(id: string): Promise<boolean> {
    const participant = await this.getParticipant(id);
    if (!participant) return false;
    check(await client().from('exams').delete().eq('participant_id', id), 'exams.delete');
    check(
      await client().from('participants').update({ status: 'Belum Mulai', exam_id: null }).eq('id', id),
      'participants.reset'
    );
    await this.logActivity(id, participant.nama, participant.gender, 'Admin mereset sesi lomba peserta.');
    return true;
  }

  // ---------------- Questions ----------------
  async getQuestions(): Promise<Question[]> {
    const rows = check(await client().from('questions').select('*').order('no_urut').order('id'), 'questions.select');
    return (rows || []).map(mapQuestion);
  }

  async addQuestion(q: Omit<Question, 'id'>): Promise<Question> {
    const rows = check(await client().from('questions').select('id'), 'questions.ids') || [];
    const id = `Q-${String(nextNumber(rows.map((r: any) => r.id), 'Q-')).padStart(2, '0')}`;
    const newQ: Question = { ...q, id } as Question;
    check(await client().from('questions').insert(newQ), 'questions.insert');
    return newQ;
  }

  async updateQuestion(id: string, updates: Partial<Question>): Promise<Question | undefined> {
    const { id: _ignore, ...safe } = updates as any;
    const row = check(
      await client().from('questions').update(safe).eq('id', id).select('*').maybeSingle(),
      'questions.update'
    );
    return row ? mapQuestion(row) : undefined;
  }

  async deleteQuestion(id: string): Promise<boolean> {
    const rows = check(await client().from('questions').delete().eq('id', id).select('id'), 'questions.delete');
    return (rows?.length || 0) > 0;
  }

  // ---------------- Settings ----------------
  async getSettings(): Promise<CompetitionSettings> {
    const row = check(await client().from('settings').select('data').eq('id', 1).maybeSingle(), 'settings.select');
    return { ...DEFAULT_SETTINGS, ...((row as any)?.data || {}) };
  }

  async updateSettings(updates: Partial<CompetitionSettings>): Promise<CompetitionSettings> {
    const merged = { ...(await this.getSettings()), ...updates };
    check(await client().from('settings').upsert({ id: 1, data: merged }), 'settings.upsert');
    return merged;
  }

  // ---------------- Exams ----------------
  async getExam(participantId: string): Promise<Exam | undefined> {
    const row = check(await client().from('exams').select('*').eq('participant_id', participantId).maybeSingle(), 'exams.get');
    return row ? mapExam(row) : undefined;
  }

  async getAllExams(): Promise<Exam[]> {
    const rows = check(await client().from('exams').select('*'), 'exams.all');
    return (rows || []).map(mapExam);
  }

  private async saveExam(exam: Exam) {
    check(await client().from('exams').upsert(exam, { onConflict: 'participant_id' }), 'exams.upsert');
  }

  private async activeQuestions(): Promise<Question[]> {
    const rows = check(await client().from('questions').select('*').eq('status', 'aktif'), 'questions.active');
    return (rows || []).map(mapQuestion);
  }

  async startExam(participantId: string): Promise<{ exam: Exam; participant: Participant } | { error: string }> {
    const participant = await this.getParticipant(participantId);
    if (!participant) return { error: 'Peserta tidak ditemukan.' };

    const settings = await this.getSettings();
    if (settings.status_lomba === 'belum_mulai') return { error: 'Lomba belum dimulai oleh Admin.' };

    if (isDone(participant.status)) {
      return { error: 'Peserta telah menyelesaikan lomba dan tidak dapat mengulang.' };
    }

    let exam = await this.getExam(participantId);
    const nowIso = new Date().toISOString();

    if (!exam) {
      const activeQuestions = await this.activeQuestions();
      exam = {
        id: `EXAM-${participantId}-${Date.now()}`,
        participant_id: participantId,
        nama_sekolah: participant.nama,
        gender: participant.gender,
        waktu_mulai: nowIso,
        waktu_selesai: null,
        checkpoint_terakhir: nowIso,
        durasi_detik: 0,
        status: 'Sedang Mengerjakan',
        nilai_sementara: 0,
        nilai_final: null,
        total_soal: activeQuestions.length,
        jumlah_terjawab: 0,
        jawaban: {},
      };
      await this.saveExam(exam);
      check(
        await client().from('participants').update({ status: 'Sedang Mengerjakan', exam_id: exam.id }).eq('id', participantId),
        'participants.start'
      );
      participant.status = 'Sedang Mengerjakan';
      participant.exam_id = exam.id;

      await this.logActivity(participantId, participant.nama, participant.gender, 'Peserta memulai sesi lomba.');
    }

    return { exam, participant };
  }

  async saveAnswer(participantId: string, questionId: string, answer: any): Promise<{ success: boolean; jumlah_terjawab: number; nilai_sementara: number } | { error: string }> {
    const exam = await this.getExam(participantId);
    if (!exam) return { error: 'Sesi lomba tidak ditemukan.' };
    if (isDone(exam.status)) return { error: 'Lomba sudah disubmit.' };

    exam.jawaban[questionId] = answer;
    exam.jumlah_terjawab = countAnswered(exam.jawaban);

    const { score } = calculateExamScore(await this.activeQuestions(), exam.jawaban);
    exam.nilai_sementara = score;
    exam.checkpoint_terakhir = new Date().toISOString();

    if (exam.waktu_mulai) {
      const startMs = new Date(exam.waktu_mulai).getTime();
      exam.durasi_detik = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
    }

    await this.saveExam(exam);
    return { success: true, jumlah_terjawab: exam.jumlah_terjawab, nilai_sementara: exam.nilai_sementara };
  }

  async recordCheckpoint(participantId: string, answers?: Record<string, any>): Promise<{ success: boolean; checkpoint_terakhir: string; nilai_sementara: number } | { error: string }> {
    const exam = await this.getExam(participantId);
    if (!exam) return { error: 'Sesi lomba tidak ditemukan.' };

    const nowIso = new Date().toISOString();
    exam.checkpoint_terakhir = nowIso;

    // Peserta yang sudah selesai tidak boleh mengubah jawaban lewat checkpoint
    if (answers && !isDone(exam.status)) {
      exam.jawaban = { ...exam.jawaban, ...answers };
      exam.jumlah_terjawab = countAnswered(exam.jawaban);
    }

    if (exam.waktu_mulai && exam.status === 'Sedang Mengerjakan') {
      const startMs = new Date(exam.waktu_mulai).getTime();
      exam.durasi_detik = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
    }

    if (!isDone(exam.status)) {
      const { score } = calculateExamScore(await this.activeQuestions(), exam.jawaban);
      exam.nilai_sementara = score;
    }

    await this.saveExam(exam);
    return { success: true, checkpoint_terakhir: nowIso, nilai_sementara: exam.nilai_sementara };
  }

  async finishExam(participantId: string, reason: 'submit_mandiri' | 'waktu_habis' = 'submit_mandiri'): Promise<{ exam: Exam; error?: string }> {
    const exam = await this.getExam(participantId);
    const participant = await this.getParticipant(participantId);
    if (!exam || !participant) {
      return { exam: {} as Exam, error: 'Sesi lomba atau peserta tidak ditemukan.' };
    }

    if (isDone(exam.status)) return { exam };

    const nowIso = new Date().toISOString();
    exam.waktu_selesai = nowIso;
    exam.checkpoint_terakhir = nowIso;
    exam.status = reason === 'waktu_habis' ? 'Waktu Habis' : 'Selesai';

    if (exam.waktu_mulai) {
      const startMs = new Date(exam.waktu_mulai).getTime();
      exam.durasi_detik = Math.max(0, Math.floor((new Date(nowIso).getTime() - startMs) / 1000));
    }

    const { score, percentage } = calculateExamScore(await this.activeQuestions(), exam.jawaban);
    exam.nilai_final = score;
    exam.nilai_sementara = score;

    await this.saveExam(exam);
    check(await client().from('participants').update({ status: exam.status }).eq('id', participantId), 'participants.finish');

    const logMsg = reason === 'waktu_habis'
      ? `Waktu lomba habis. Sesi otomatis disubmit dengan nilai akhir ${score} (${percentage}%).`
      : `Peserta mengirim jawaban mandiri dengan nilai akhir ${score} (${percentage}%).`;
    await this.logActivity(participantId, participant.nama, participant.gender, logMsg);

    return { exam };
  }

  // ---------------- Activity logs ----------------
  async logActivity(participantId: string, namaSekolah: string, gender: 'putra' | 'putri', aktivitas: string): Promise<void> {
    const newLog: ActivityLog = {
      id: `LOG-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      participant_id: participantId,
      nama_sekolah: namaSekolah,
      gender,
      aktivitas,
      waktu: new Date().toISOString(),
    };
    // Log bersifat pelengkap: kegagalan menulis log tidak boleh menggagalkan aksi utama.
    const { error } = await client().from('activity_logs').insert(newLog);
    if (error) console.error('[Supabase:activity_logs.insert]', error.message);
  }

  async getActivityLogs(): Promise<ActivityLog[]> {
    const rows = check(
      await client().from('activity_logs').select('*').order('waktu', { ascending: false }).limit(500),
      'activity_logs.select'
    );
    return rows || [];
  }

  // ---------------- Live score ----------------
  async getLiveScoreBoard(): Promise<LiveScoreBoard> {
    const c = client();
    const [participants, settings, schools, activeRows, examRows] = await Promise.all([
      this.getParticipants(),
      this.getSettings(),
      this.getSchools(),
      (async () => check(await c.from('questions').select('id').eq('status', 'aktif'), 'questions.count') || [])(),
      // kolom 'jawaban' sengaja tidak diambil: papan skor tidak membutuhkannya dan datanya besar
      (async () =>
        check(
          await c
            .from('exams')
            .select('participant_id,status,nilai_sementara,nilai_final,durasi_detik,waktu_mulai,checkpoint_terakhir,waktu_selesai,jumlah_terjawab,total_soal'),
          'exams.board'
        ) || [])(),
    ]);

    const activeQuestionsCount = (activeRows as any[]).length;
    const examMap = new Map<string, any>((examRows as any[]).map(e => [e.participant_id, e]));

    const items = participants.map(p => {
      const exam = examMap.get(p.id);
      if (!exam) {
        return {
          rank: 0,
          participant_id: p.id,
          nama_sekolah: p.nama,
          gender: p.gender,
          status: p.status,
          nilai_sementara: 0,
          nilai_final: null as number | null,
          durasi_detik: 0,
          waktu_mulai: null as string | null,
          checkpoint_terakhir: null as string | null,
          waktu_selesai: null as string | null,
          jumlah_terjawab: 0,
          total_soal: activeQuestionsCount,
        };
      }

      let dur = exam.durasi_detik;
      if (exam.status === 'Sedang Mengerjakan' && exam.waktu_mulai) {
        const startMs = new Date(exam.waktu_mulai).getTime();
        dur = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
      }

      return {
        rank: 0,
        participant_id: p.id,
        nama_sekolah: p.nama,
        gender: p.gender,
        status: exam.status,
        nilai_sementara: exam.nilai_sementara,
        nilai_final: exam.nilai_final as number | null,
        durasi_detik: dur,
        waktu_mulai: exam.waktu_mulai as string | null,
        checkpoint_terakhir: exam.checkpoint_terakhir as string | null,
        waktu_selesai: exam.waktu_selesai as string | null,
        jumlah_terjawab: exam.jumlah_terjawab,
        total_soal: exam.total_soal || activeQuestionsCount,
      };
    });

    const rankedPutra = rankParticipants(items.filter(it => it.gender === 'putra') as any, settings.kriteria_seri);
    const rankedPutri = rankParticipants(items.filter(it => it.gender === 'putri') as any, settings.kriteria_seri);
    const totalSelesai = items.filter(it => it.status === 'Selesai' || it.status === 'Waktu Habis').length;

    return {
      putra: rankedPutra,
      putri: rankedPutri,
      last_update: new Date().toISOString(),
      status_lomba: settings.status_lomba,
      mode_hasil_akhir: settings.mode_hasil_akhir,
      tampilkan_nilai_sementara: settings.tampilkan_nilai_sementara,
      total_sekolah: schools.length,
      total_selesai: totalSelesai,
      interval_livescore_detik: settings.interval_livescore_detik || 10,
    };
  }

  // ---------------- Backup & restore ----------------
  async getRawData(): Promise<DatabaseSchema> {
    const [schools, participants, questions, exams, logs, settings] = await Promise.all([
      this.getSchools(),
      this.getParticipants(),
      this.getQuestions(),
      this.getAllExams(),
      this.getActivityLogs(),
      this.getSettings(),
    ]);
    const examMap: Record<string, Exam> = {};
    for (const e of exams) examMap[e.participant_id] = e;
    return { schools, participants, questions, exams: examMap, activity_logs: logs, settings };
  }

  async restoreData(backup: DatabaseSchema): Promise<boolean> {
    if (!backup || !backup.schools || !backup.participants || !backup.questions) return false;
    const c = client();

    // Hapus semua data lama (urutan bebas: tidak ada foreign key)
    check(await c.from('exams').delete().neq('participant_id', '__none__'), 'restore.exams.clear');
    check(await c.from('activity_logs').delete().neq('id', '__none__'), 'restore.logs.clear');
    check(await c.from('participants').delete().neq('id', '__none__'), 'restore.participants.clear');
    check(await c.from('questions').delete().neq('id', '__none__'), 'restore.questions.clear');
    check(await c.from('schools').delete().neq('id', '__none__'), 'restore.schools.clear');

    const pick = (o: any, keys: string[]) => Object.fromEntries(keys.filter(k => o[k] !== undefined).map(k => [k, o[k]]));

    if (backup.schools.length)
      check(await c.from('schools').insert(backup.schools.map(s => pick(s, ['id', 'nama_sekolah']))), 'restore.schools');
    if (backup.participants.length)
      check(
        await c.from('participants').insert(
          backup.participants.map(p => pick(p, ['id', 'nama', 'gender', 'password_hash', 'status', 'exam_id']))
        ),
        'restore.participants'
      );
    if (backup.questions.length)
      check(
        await c.from('questions').insert(
          backup.questions.map(q =>
            pick(q, ['id', 'no_urut', 'tipe', 'soal', 'gambar', 'posisi_gambar', 'bobot', 'kunci', 'pembahasan', 'status', 'options'])
          )
        ),
        'restore.questions'
      );

    const exams = Object.entries(backup.exams || {}).map(([pid, e]) => ({
      ...pick(e, [
        'id', 'nama_sekolah', 'gender', 'waktu_mulai', 'waktu_selesai', 'checkpoint_terakhir', 'durasi_detik',
        'status', 'nilai_sementara', 'nilai_final', 'total_soal', 'jumlah_terjawab', 'jawaban',
      ]),
      participant_id: pid,
    }));
    if (exams.length) check(await c.from('exams').insert(exams), 'restore.exams');

    if (backup.activity_logs?.length)
      check(
        await c.from('activity_logs').insert(
          backup.activity_logs.map(l => pick(l, ['id', 'participant_id', 'nama_sekolah', 'gender', 'aktivitas', 'waktu']))
        ),
        'restore.logs'
      );

    if (backup.settings)
      check(await c.from('settings').upsert({ id: 1, data: { ...DEFAULT_SETTINGS, ...backup.settings } }), 'restore.settings');

    return true;
  }
}

export const db = new Database();
