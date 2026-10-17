export type Gender = 'putra' | 'putri';

export type ExamStatus = 'Belum Mulai' | 'Sedang Mengerjakan' | 'Selesai' | 'Waktu Habis';

export type UserRole = 'ADMIN' | 'PESERTA' | 'LIVE_SCORE';

export interface School {
  id: string;
  nama_sekolah: string;
}

export interface Participant {
  id: string;
  nama: string;
  gender: Gender;
  password_hash: string;
  status: ExamStatus;
  exam_id?: string;
}

export type QuestionType = 'pilihan_ganda' | 'pilihan_ganda_kompleks' | 'benar_salah';

export interface QuestionOption {
  id: string;
  label: string; // A, B, C, D
  teks: string;
  gambar?: string;
}

export interface Question {
  id: string;
  no_urut: number;
  tipe: QuestionType;
  soal: string;
  gambar?: string;
  posisi_gambar?: 'atas' | 'bawah';
  bobot: number;
  kunci: string | string[] | Record<string, string>; // e.g. "A" or ["A","C"] or {"1":"benar","2":"salah"}
  pembahasan?: string;
  status: 'aktif' | 'nonaktif';
  options: QuestionOption[];
}

export interface Exam {
  id: string;
  participant_id: string;
  nama_sekolah: string;
  gender: Gender;
  waktu_mulai: string | null;
  waktu_selesai: string | null;
  checkpoint_terakhir: string | null;
  durasi_detik: number;
  status: ExamStatus;
  nilai_sementara: number;
  nilai_final: number | null;
  total_soal: number;
  jumlah_terjawab: number;
  jawaban: Record<string, any>; // question_id -> answer
}

export interface ActivityLog {
  id: string;
  participant_id: string;
  nama_sekolah: string;
  gender: Gender;
  aktivitas: string;
  waktu: string;
}

export interface CompetitionSettings {
  judul_lomba: string;
  subjudul_lomba: string;
  judul1: string;
  judul2: string;
  durasi_menit: number;
  logo_url: string;
  logo1_url: string;
  logo2_url: string;
  background_url?: string;
  status_lomba: 'belum_mulai' | 'berlangsung' | 'selesai';
  mode_hasil_akhir: boolean;
  acak_soal: boolean;
  acak_jawaban: boolean;
  fullscreen_wajib: boolean;
  blok_copy: boolean;
  blok_paste: boolean;
  blok_klik_kanan: boolean;
  deteksi_pindah_tab: boolean;
  tampilkan_nilai_peserta: 'langsung' | 'setelah_selesai' | 'jangan';
  live_score_publik: boolean;
  tampilkan_nilai_sementara: boolean;
  interval_livescore_detik: number;
  interval_checkpoint_detik: number;
  kriteria_seri: 'durasi_tercepat' | 'soal_terbanyak' | 'imbang';
  // External cloud integration configurations
  supabase_url?: string;
  supabase_anon_key?: string;
  github_repo?: string;
  github_token?: string;
}

export interface LiveScoreItem {
  rank: number;
  participant_id: string;
  nama_sekolah: string;
  gender: Gender;
  status: ExamStatus;
  nilai_sementara: number;
  nilai_final: number | null;
  durasi_detik: number;
  waktu_mulai: string | null;
  checkpoint_terakhir: string | null;
  waktu_selesai: string | null;
  jumlah_terjawab: number;
  total_soal: number;
}

export interface LiveScoreBoard {
  putra: LiveScoreItem[];
  putri: LiveScoreItem[];
  last_update: string;
  status_lomba: 'belum_mulai' | 'berlangsung' | 'selesai';
  mode_hasil_akhir: boolean;
  tampilkan_nilai_sementara: boolean;
  total_sekolah: number;
  total_selesai: number;
  interval_livescore_detik: number;
}
