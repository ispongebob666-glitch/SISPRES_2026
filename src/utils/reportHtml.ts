// Template laporan nilai (A4). Menghasilkan HTML siap cetak / simpan PDF.
// Murni string (tanpa React) supaya hasilnya identik di aplikasi dan di contoh PDF.

export interface ReportRow {
  nama: string;
  mulai: string | null; // ISO
  selesai: string | null; // ISO
  durasi_detik: number;
  nilai: number | null;
}

export interface ReportSettings {
  judul1: string;
  judul2: string;
  logo3_url?: string;
  logo4_url?: string;
  ketua_nama?: string;
  ketua_nip?: string;
  korwil_nama?: string;
  korwil_nip?: string;
  tempat_tanggal?: string; // diisi manual, mis. "Rejoso, 18 Oktober 2026"
}

export interface ReportInput {
  settings: ReportSettings;
  putra: ReportRow[];
  putri: ReportRow[];
  watermark?: string; // mis. "CONTOH" (hanya untuk contoh)
}

const esc = (s: unknown) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Waktu selalu ditampilkan dalam WIB agar sama di semua komputer
const timeFmt = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
  timeZone: 'Asia/Jakarta',
});

export function formatJam(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '-' : timeFmt.format(d);
}

export function formatDurasi(detik: number, adaUjian: boolean): string {
  if (!adaUjian) return '-';
  const total = Math.max(0, Math.round(detik));
  const j = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return j > 0 ? `${j} jam ${m} menit ${s} detik` : `${m} menit ${s} detik`;
}

export function formatNilai(n: number | null): string {
  if (n === null || n === undefined) return '-';
  return (Math.round(n * 100) / 100).toString().replace('.', ',');
}

function kop(s: ReportSettings): string {
  const logo = (url?: string, alt = '') =>
    url ? `<img class="logo" src="${esc(url)}" alt="${esc(alt)}">` : `<div class="logo"></div>`;
  return `
  <div class="kop">
    ${logo(s.logo3_url, 'Logo 3')}
    <div class="kop-teks">
      <div class="j1">${esc(s.judul1)}</div>
      <div class="j2">${esc(s.judul2)}</div>
    </div>
    ${logo(s.logo4_url, 'Logo 4')}
  </div>
  <div class="garis"></div>`;
}

function tandaTangan(s: ReportSettings): string {
  const nip = (v?: string) => (v && v.trim() ? `NIP. ${esc(v.trim())}` : '&nbsp;');
  return `
  <div class="ttd">
    <div class="ttd-kol">
      <div class="ttd-tempat">&nbsp;</div>
      <div>Ketua Panitia,</div>
      <div class="ttd-ruang"></div>
      <div class="ttd-nama">${esc(s.ketua_nama || '..............................')}</div>
      <div>${nip(s.ketua_nip)}</div>
    </div>
    <div class="ttd-kol">
      <div class="ttd-tempat">${esc(s.tempat_tanggal || '')}&nbsp;</div>
      <div>Korwil Kecamatan Rejoso,</div>
      <div class="ttd-ruang"></div>
      <div class="ttd-nama">${esc(s.korwil_nama || '..............................')}</div>
      <div>${nip(s.korwil_nip)}</div>
    </div>
  </div>`;
}

function lembar(kategori: 'PUTRA' | 'PUTRI', rows: ReportRow[], s: ReportSettings): string {
  const body = rows.length
    ? rows
        .map((r, i) => {
          const ada = !!r.mulai;
          return `<tr>
        <td class="c">${i + 1}</td>
        <td>${esc(r.nama)}</td>
        <td class="c">${formatJam(r.mulai)}</td>
        <td class="c">${formatJam(r.selesai)}</td>
        <td class="c">${formatDurasi(r.durasi_detik, ada)}</td>
        <td class="c b">${formatNilai(ada ? r.nilai : null)}</td>
      </tr>`;
        })
        .join('')
    : `<tr><td class="c" colspan="6">Belum ada data peserta.</td></tr>`;

  return `
<section class="lembar">
  ${kop(s)}
  <div class="judul-tabel">DAFTAR NILAI PESERTA ${kategori}</div>
  <table>
    <thead>
      <tr>
        <th style="width:10mm">No</th>
        <th>Nama</th>
        <th style="width:26mm">Mulai Ujian</th>
        <th style="width:26mm">Selesai Ujian</th>
        <th style="width:33mm">Durasi Ujian</th>
        <th style="width:14mm">Nilai</th>
      </tr>
    </thead>
    <tbody>${body}</tbody>
  </table>
  ${tandaTangan(s)}
</section>`;
}

export function buildReportHtml(input: ReportInput): string {
  const { settings: s } = input;
  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<title>Daftar Nilai - ${esc(s.judul2)}</title>
<style>
  @page { size: A4; margin: 12mm 15mm 14mm 15mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: "Times New Roman", "Liberation Serif", "DejaVu Serif", serif;
    font-size: 11pt; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .lembar { page-break-after: always; }
  .lembar:last-child { page-break-after: auto; }

  .kop { display: flex; align-items: center; gap: 5mm; padding-bottom: 2.5mm; }
  .logo { width: 24mm; height: 24mm; object-fit: contain; flex: none; }
  .kop-teks { flex: 1; text-align: center; line-height: 1.25; }
  .j1 { font-size: 13pt; font-weight: bold; text-transform: uppercase; }
  .j2 { font-size: 12pt; font-weight: bold; text-transform: uppercase; }
  .garis { border-top: 0.9mm solid #000; border-bottom: 0.3mm solid #000; height: 1.3mm; margin-bottom: 5mm; }

  .judul-tabel { text-align: center; font-weight: bold; font-size: 12pt; margin: 0 0 3.5mm; }

  table { width: 100%; border-collapse: collapse; font-size: 10.5pt; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  th, td { border: 0.25mm solid #000; padding: 1.5mm 2mm; vertical-align: middle; }
  th { background: #e6e6e6; text-align: center; font-weight: bold; }
  td.c { text-align: center; }
  td.b { font-weight: bold; }

  .ttd { display: flex; justify-content: space-between; margin-top: 10mm; page-break-inside: avoid; font-size: 11pt; }
  .ttd-kol { width: 48%; text-align: center; line-height: 1.35; }
  .ttd-ruang { height: 22mm; }
  .ttd-nama { font-weight: bold; text-decoration: underline; }

  .wm {
    position: fixed; top: 42%; left: 0; right: 0; text-align: center; z-index: 0;
    font-size: 96pt; font-weight: bold; color: rgba(0,0,0,0.055); transform: rotate(-28deg);
    pointer-events: none; letter-spacing: 2mm;
  }
</style>
</head>
<body>
${input.watermark ? `<div class="wm">${esc(input.watermark)}</div>` : ''}
${lembar('PUTRA', input.putra, s)}
${lembar('PUTRI', input.putri, s)}
</body>
</html>`;
}
