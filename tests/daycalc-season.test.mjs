import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dayCalc, fmtDate } from '../public/js/calc-core.js';
import { seasonShareSuffix } from '../public/js/season.js';
const L = ['ko', 'en', 'ja', 'zh-hans', 'es', 'pt-br'];
const kst = (s) => Date.parse(s + '+09:00');
test('dayCalc: 오늘+N일 (윤년·연말 경계), 12/25 이후엔 다음해 크리스마스 기준', () => {
  const a = dayCalc('2027-12-10'); // 연말 경계
  assert.equal(a.plus.find((p) => p.n === 90).date, '2028-03-09'); // 2028 윤년(2/29 포함)
  assert.equal(a.plus.find((p) => p.n === 30).date, '2028-01-09');
  assert.equal(dayCalc('2028-02-28').plus[0].date, '2028-03-29');
  assert.equal(dayCalc('2026-12-25').target, '2026-12-25');
  const b = dayCalc('2026-12-26');
  assert.equal(b.target, '2027-12-25');
  assert.deepEqual(b.before.map((x) => x.date), ['2027-11-05', '2027-11-25', '2027-12-11', '2027-12-18']);
});
test('fmtDate 6 languages and christmas dayCalc keys equal', () => {
  const C = JSON.parse(readFileSync('i18n/christmas.json', 'utf8'));
  const keys = Object.keys(C.ko.dayCalc).sort().join();
  for (const l of L) { assert.equal(Object.keys(C[l].dayCalc).sort().join(), keys, l); assert.equal(C[l].dayCalc.months.length, 12); assert.ok(fmtDate('2026-11-05', C[l].dayCalc, true).includes('2026')); }
  assert.equal(fmtDate('2026-11-05', C.ko.dayCalc, false), '11월 5일');
});
test('share.season: 12/1~12/25 only, 6 languages carry {n}', () => {
  for (const l of L) {
    const D = JSON.parse(readFileSync(`i18n/${l}.json`, 'utf8'));
    assert.ok(D.share.season.includes('{n}'), l);
    assert.equal(seasonShareSuffix(D, kst('2026-11-30T23:59:59')), '');
    assert.equal(seasonShareSuffix(D, kst('2026-12-26T00:00:00')), '');
  }
  const ko = JSON.parse(readFileSync('i18n/ko.json', 'utf8'));
  assert.equal(seasonShareSuffix(ko, kst('2026-12-01T00:00:00')), ' 크리스마스까지 D-24, 30초 한 판?');
  assert.equal(seasonShareSuffix(ko, kst('2026-12-25T23:00:00')), ' 크리스마스까지 D-0, 30초 한 판?');
});
