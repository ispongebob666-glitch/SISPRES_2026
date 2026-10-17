# SISPRES — Sistem Lomba Siswa Prestasi

Aplikasi lomba (Admin, Peserta, Live Score). Frontend React + Vite, API Express,
database **Supabase (Postgres)**, siap dideploy ke **Vercel** lewat **GitHub**.

```
Browser ──► /api/*  (Express: server/app.ts)  ──► Supabase (tabel Postgres)
              ▲ lokal: server.ts       ▲ Vercel: api/index.ts
```

Browser **tidak** mengakses Supabase langsung. Hanya server yang memegang
`SUPABASE_SERVICE_ROLE_KEY`, dan tabel dikunci dengan RLS tanpa policy.

---

## 1. Siapkan Supabase (sekali saja)

1. Buat project di https://supabase.com (atau pakai yang sudah ada).
2. Buka **SQL Editor → New query**, tempel isi `supabase/schema.sql`, klik **Run**.
3. Query baru lagi: tempel isi `supabase/seed.sql`, klik **Run**
   (isi awal: 8 sekolah, 16 peserta, 21 soal, pengaturan). Lewati jika mau mulai kosong.
4. Ambil kunci di **Project Settings → API**:
   - **Project URL** → `SUPABASE_URL`
   - **service_role** / **secret key** → `SUPABASE_SERVICE_ROLE_KEY`
     (RAHASIA. Jangan pakai awalan `VITE_`, jangan di-commit.)

## 2. Jalankan di VS Code (lokal)

Butuh Node.js 20+.

```bash
npm install
cp .env.example .env      # Windows: copy .env.example .env
# isi .env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_USERNAME, ADMIN_PASSWORD
npm run dev
```

Buka http://localhost:3000. Login admin memakai `ADMIN_USERNAME` / `ADMIN_PASSWORD`
dari `.env` (jika kosong, memakai bawaan lama `admin` / `admin123` — segera ganti).

> Jalankan lewat `npm run dev`, bukan `vite` langsung (API ada di server Express).

## 3. Push ke GitHub

```bash
git init
git add .
git status          # PASTIKAN .env TIDAK ada di daftar
git commit -m "SISPRES: Supabase + Vercel"
git branch -M main
git remote add origin https://github.com/USERNAME/NAMA-REPO.git
git push -u origin main
```

## 4. Deploy ke Vercel

1. https://vercel.com → **Add New → Project** → import repo GitHub tadi.
2. Framework otomatis terdeteksi **Vite** (konfigurasi ada di `vercel.json`).
3. **Environment Variables** (Production), isi:

   | Nama | Isi |
   |---|---|
   | `SUPABASE_URL` | Project URL Supabase |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role / secret key |
   | `ADMIN_USERNAME` | username admin pilihanmu |
   | `ADMIN_PASSWORD` | password admin yang kuat |
   | `ADMIN_TOKEN_SECRET` | (opsional) string acak panjang |

4. **Deploy**. Setiap `git push` ke `main` akan otomatis deploy ulang.

## Catatan penting

- **Ukuran gambar:** Vercel membatasi isi request ±4,5 MB. Logo/gambar soal yang
  disimpan sebagai data base64 sebaiknya dikompres (kecil) sebelum diunggah.
- **Backup:** menu *Backup & Restore* tetap ada. File `data/sispres_db.json` adalah
  contoh format backup (bisa di-restore lewat menu tersebut).
- **Supabase gratis** bisa "tidur" bila lama tidak dipakai; buka dashboard untuk membangunkan
  sebelum hari lomba.
- **Hari-H:** coba simulasi dulu dengan beberapa perangkat sekaligus.
- Fitur Pengaturan "Supabase/GitHub" di admin hanya menguji & menyimpan kredensial
  (perilaku sama seperti sebelumnya).

## Struktur

```
api/index.ts        Vercel Function (membungkus Express)
server/app.ts       Semua route API + autentikasi admin
server/db.ts        Akses data ke Supabase
server.ts           Entry lokal (Express + Vite)
supabase/           schema.sql, seed.sql
src/                Frontend React
```
