// 1128-21: christmas 인접 D-day 표(연말·새해·설날) + /r/ 시즌 계측 경계.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nearDays } from '../public/js/calc-core.js';
import { seasonFlag } from '../public/js/season.js';
import { validateBatch } from '../lib/events.js';
const L = ['ko', 'en', 'ja', 'zh-hans', 'es', 'pt-br'];
const kst = (s) => Date.parse(s + '+09:00');
const by = (a) => Object.fromEntries(a.map((x) => [x.k, x]));
test('nearDays: 연말·새해 경계(12/31→1/1, 연도 넘김)와 설날', () => {
  const a = by(nearDays('2026-12-31'));
  assert.equal(a.eoy.n, 0); assert.equal(a.ny.n, 1); assert.equal(a.ny.date, '2027-01-01');
  assert.equal(a.eve.date, '2027-12-24'); // 12/24는 지났으니 내년
  const b = by(nearDays('2027-01-01'));
  assert.equal(b.ny.n, 0); assert.equal(b.eoy.date, '2027-12-31'); assert.equal(b.seol.n, 36);
  const c = by(nearDays('2026-11-28'));
  assert.deepEqual([c.eve.n, c.xmas.n, c.eoy.n, c.ny.n, c.seol.n], [26, 27, 33, 34, 70]);
  assert.equal(by(nearDays('2027-02-07')).seol.date, '2028-01-26'); // 설날 지나면 다음 설날
  assert.equal(nearDays('bad'), null);
});
test('christmas.near: 6언어 키 동일·h2 중복 0', () => {
  const C = JSON.parse(readFileSync('i18n/christmas.json', 'utf8'));
  const keys = Object.keys(C.ko.near).sort().join();
  for (const l of L) { assert.equal(Object.keys(C[l].near).sort().join(), keys, l); assert.ok(C[l].near.unit.includes('{n}'), l); }
  assert.equal(new Set(L.map((l) => C[l].near.h2)).size, 6);
  assert.equal(new Set(L.map((l) => C[l].title)).size, 6);
});
test('/r/ 시즌 계측: 경계 12/1 00:00, 12/25 23:59(KST) 안, 12/26 00:00 밖', () => {
  assert.equal(seasonFlag(kst('2026-11-30T23:59:59')), '0');
  assert.equal(seasonFlag(kst('2026-12-01T00:00:00')), '1');
  assert.equal(seasonFlag(kst('2026-12-25T23:59:59')), '1');
  assert.equal(seasonFlag(kst('2026-12-26T00:00:00')), '0');
});
test('/r/ share_cta_click season 0/1은 6언어·quiz/rush 모두 s0/s1(in/out)로 저장, unknown 경로 없음', () => {
  let n = 0;
  for (const l of L) for (const g of ['quiz', 'rush']) for (const s of ['0', '1']) {
    const id = ('nr' + String(++n).padStart(5, '0') + 'abcdefghijklmnopq').slice(0, 22);
    const r = validateBatch({ v: 1, events: [{ id, name: 'share_cta_click', g, lang: l, from: 'r', season: s }] });
    assert.equal(r.error, undefined, `${l}/${g}/${s}`);
    assert.equal(r.rows[0].method, 's' + s);
  }
  const bad = validateBatch({ v: 1, events: [{ id: 'nrbad0000000000000000a', name: 'share_cta_click', g: 'quiz', lang: 'ko', from: 'r', season: '2' }] });
  assert.ok(bad.error || (bad.rows || []).length === 0);
});
