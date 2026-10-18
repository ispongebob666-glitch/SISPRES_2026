import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReportHtml, formatDurasi, formatJam, formatNilai } from './reportHtml.ts';

test('format jam selalu WIB', () => {
  assert.equal(formatJam('2026-10-17T01:05:12.000Z'), '08:05:12');
  assert.equal(formatJam(null), '-');
  assert.equal(formatJam('bukan-tanggal'), '-');
});

test('format durasi', () => {
  assert.equal(formatDurasi(2292, true), '38 menit 12 detik');
  assert.equal(formatDurasi(3725, true), '1 jam 2 menit 5 detik');
  assert.equal(formatDurasi(0, false), '-');
});

test('format nilai memakai koma desimal', () => {
  assert.equal(formatNilai(85), '85');
  assert.equal(formatNilai(87.5), '87,5');
  assert.equal(formatNilai(null), '-');
});

const settings = {
  judul1: 'JUDUL <SATU>',
  judul2: 'Judul "dua"',
  ketua_nama: 'Drs. A',
  ketua_nip: '123',
  korwil_nama: 'B, S.Pd.',
  korwil_nip: '456',
  tempat_tanggal: 'Rejoso, 18 Oktober 2026',
};
const row = { nama: 'SD <X> & Y', mulai: '2026-10-17T01:00:00Z', selesai: '2026-10-17T01:30:00Z', durasi_detik: 1800, nilai: 90 };

test('laporan memuat dua lembar, kop, tanda tangan, dan aman dari HTML', () => {
  const html = buildReportHtml({ settings, putra: [row], putri: [] });
  assert.ok(html.includes('DAFTAR NILAI PESERTA PUTRA'));
  assert.ok(html.includes('DAFTAR NILAI PESERTA PUTRI'));
  assert.ok(html.includes('Belum ada data peserta.'));
  assert.ok(html.includes('Korwil Kecamatan Rejoso,'));
  assert.ok(!html.includes('Korwil Wilayah'));
  assert.ok(html.includes('NIP. 123') && html.includes('NIP. 456'));
  assert.ok(html.includes('Rejoso, 18 Oktober 2026'));
  assert.ok(html.includes('JUDUL &lt;SATU&gt;'));
  assert.ok(html.includes('SD &lt;X&gt; &amp; Y'));
  assert.ok(!html.includes('<SATU>'));
});

test('nama dan NIP kosong tidak merusak tata letak', () => {
  const html = buildReportHtml({ settings: { judul1: 'a', judul2: 'b' }, putra: [], putri: [] });
  assert.ok(html.includes('..............................'));
  assert.ok(!html.includes('NIP. '));
});

test('peserta yang belum mengerjakan tampil dengan tanda -', () => {
  const html = buildReportHtml({
    settings,
    putra: [{ nama: 'Belum', mulai: null, selesai: null, durasi_detik: 0, nilai: null }],
    putri: [],
  });
  assert.ok(html.includes('<td class="c">-</td>'));
  assert.ok(html.includes('<td class="c b">-</td>'));
});
