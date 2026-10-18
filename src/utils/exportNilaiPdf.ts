import { api } from '../services/api.ts';
import { buildReportHtml } from './reportHtml.ts';
import type { ReportRow } from './reportHtml.ts';
import type { LiveScoreItem } from '../types/index.ts';

const absolutize = (u?: string): string | undefined => {
  if (!u) return undefined;
  try {
    return new URL(u, window.location.origin).href;
  } catch {
    return u;
  }
};

const toRow = (it: LiveScoreItem): ReportRow => ({
  nama: it.nama_sekolah,
  mulai: it.waktu_mulai,
  selesai: it.waktu_selesai,
  durasi_detik: it.durasi_detik,
  nilai: it.nilai_final ?? it.nilai_sementara,
});

/**
 * Membuka laporan nilai (lembar Putra + lembar Putri) di jendela baru lalu memanggil
 * dialog cetak browser. Pilih "Simpan sebagai PDF" untuk menyimpannya.
 * Data diambil dari papan peringkat sehingga urutannya sama dengan halaman Peringkat.
 */
export async function exportNilaiPdf(): Promise<void> {
  // Jendela dibuka langsung saat klik (sebelum menunggu data) agar tidak diblokir pop-up
  const w = window.open('', '_blank');
  if (!w) {
    alert('Pop-up diblokir browser. Izinkan pop-up untuk situs ini, lalu coba lagi.');
    return;
  }
  w.document.write('<p style="font-family:sans-serif;padding:24px">Menyiapkan laporan nilai...</p>');

  try {
    const [board, s] = await Promise.all([api.getLiveScore(), api.getSettings()]);

    const html = buildReportHtml({
      settings: {
        judul1: s.judul1 || s.judul_lomba || '',
        judul2: s.judul2 || s.subjudul_lomba || '',
        logo3_url: absolutize(s.logo3_url),
        logo4_url: absolutize(s.logo4_url),
        ketua_nama: s.ketua_nama,
        ketua_nip: s.ketua_nip,
        korwil_nama: s.korwil_nama,
        korwil_nip: s.korwil_nip,
        tempat_tanggal: s.tempat_tanggal,
      },
      putra: board.putra.map(toRow),
      putri: board.putri.map(toRow),
    });

    w.document.open();
    w.document.write(html);
    w.document.close();

    // Tunggu logo selesai dimuat (maksimal 4 detik) sebelum mencetak
    const imgs = Array.from(w.document.images);
    const loaded = Promise.all(
      imgs.map(img =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>(resolve => {
              img.addEventListener('load', () => resolve());
              img.addEventListener('error', () => resolve());
            })
      )
    );
    await Promise.race([loaded, new Promise(resolve => setTimeout(resolve, 4000))]);

    w.focus();
    w.print();
  } catch (err: any) {
    w.close();
    alert(`Gagal membuat laporan nilai: ${err?.message || 'kesalahan tidak diketahui'}`);
  }
}
