import test from 'node:test';
import assert from 'node:assert/strict';
import { splitFractions } from './richText.ts';

test('pecahan sederhana', () => {
  assert.deepEqual(splitFractions('1/2'), [{ num: '1', den: '2' }]);
  assert.deepEqual(splitFractions('Hasil 3/4 + 1/4 = ...'), [
    'Hasil ',
    { num: '3', den: '4' },
    ' + ',
    { num: '1', den: '4' },
    ' = ...',
  ]);
});

test('bilangan campuran', () => {
  assert.deepEqual(splitFractions('2 1/2 jam'), ['2 ', { num: '1', den: '2' }, ' jam']);
});

test('tanggal dan rantai garis miring tidak diubah', () => {
  assert.deepEqual(splitFractions('Lahir 17/10/2026'), ['Lahir 17/10/2026']);
  assert.deepEqual(splitFractions('1/2/3'), ['1/2/3']);
});

test('desimal tidak diubah', () => {
  assert.deepEqual(splitFractions('0,5/2'), ['0,5/2']);
  assert.deepEqual(splitFractions('1/2.5'), ['1/2.5']);
});

test('satuan dan kata penghubung tidak diubah', () => {
  assert.deepEqual(splitFractions('60 km/jam dan/atau'), ['60 km/jam dan/atau']);
});

test('escape dengan garis miring terbalik', () => {
  assert.deepEqual(splitFractions('Nomor \\1/2 saja'), ['Nomor 1/2 saja']);
});

test('teks biasa dan kosong', () => {
  assert.deepEqual(splitFractions(''), []);
  assert.deepEqual(splitFractions('Ibukota Indonesia'), ['Ibukota Indonesia']);
});
