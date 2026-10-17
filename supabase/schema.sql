-- =====================================================================
-- SISPRES - Skema database Supabase
-- Jalankan SELURUH file ini di Supabase: SQL Editor -> New query -> Run
-- Aman dijalankan ulang (memakai IF NOT EXISTS).
-- =====================================================================

create table if not exists public.schools (
  id           text primary key,
  nama_sekolah text not null
);

create table if not exists public.participants (
  id            text primary key,
  nama          text not null,
  gender        text not null check (gender in ('putra','putri')),
  password_hash text not null default '123456',
  status        text not null default 'Belum Mulai',
  exam_id       text
);

create table if not exists public.questions (
  id            text primary key,
  no_urut       integer not null default 0,
  tipe          text not null,
  soal          text not null default '',
  gambar        text,
  posisi_gambar text,
  bobot         double precision not null default 1,
  kunci         jsonb,
  pembahasan    text,
  status        text not null default 'aktif',
  options       jsonb not null default '[]'::jsonb
);

create table if not exists public.exams (
  participant_id      text primary key,
  id                  text not null,
  nama_sekolah        text,
  gender              text,
  waktu_mulai         text,
  waktu_selesai       text,
  checkpoint_terakhir text,
  durasi_detik        integer not null default 0,
  status              text not null default 'Sedang Mengerjakan',
  nilai_sementara     double precision not null default 0,
  nilai_final         double precision,
  total_soal          integer not null default 0,
  jumlah_terjawab     integer not null default 0,
  jawaban             jsonb not null default '{}'::jsonb
);

create table if not exists public.activity_logs (
  id             text primary key,
  participant_id text,
  nama_sekolah   text,
  gender         text,
  aktivitas      text not null,
  waktu          text not null
);
create index if not exists activity_logs_waktu_idx on public.activity_logs (waktu desc);

-- Pengaturan lomba disimpan sebagai satu baris (id selalu 1)
create table if not exists public.settings (
  id   integer primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb
);

-- ---------------------------------------------------------------------
-- KEAMANAN: aktifkan Row Level Security TANPA policy.
-- Artinya key publik (anon/publishable) dari browser TIDAK bisa membaca
-- atau menulis tabel apa pun. Hanya server (service_role key) yang bisa.
-- ---------------------------------------------------------------------
alter table public.schools       enable row level security;
alter table public.participants  enable row level security;
alter table public.questions     enable row level security;
alter table public.exams         enable row level security;
alter table public.activity_logs enable row level security;
alter table public.settings      enable row level security;
