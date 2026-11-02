import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SEASON1_END, SEASON2_END, inWindow } from '../public/js/season.js';

const kst = (s) => Date.parse(s + '+09:00');
test('cutoffs are 11/13 00:00 and 12/01 00:00 KST', () => {
  assert.equal(SEASON1_END, 1794495600000);
  assert.equal(SEASON2_END, 1796050800000);
});
test('3 windows: before 11/12, 11/13~11/30, after 12/01', () => {
  const s1 = (n) => inWindow(n, 0, SEASON1_END), s2 = (n) => inWindow(n, SEASON1_END, SEASON2_END);
  assert.deepEqual([s1(kst('2026-11-12T23:59:59')), s2(kst('2026-11-12T23:59:59'))], [true, false]);
  assert.deepEqual([s1(kst('2026-11-13T00:00:00')), s2(kst('2026-11-13T00:00:00'))], [false, true]);
  assert.deepEqual([s1(kst('2026-11-30T23:59:59')), s2(kst('2026-11-30T23:59:59'))], [false, true]);
  assert.deepEqual([s1(kst('2026-12-01T00:00:00')), s2(kst('2026-12-01T00:00:00'))], [false, false]);
});
test('6 languages have sub/subSeason/subSeason2 and built home carries both spans', () => {
  for (const l of ['ko', 'en', 'ja', 'zh-hans', 'es', 'pt-br']) {
    const D = JSON.parse(readFileSync(`i18n/${l}.json`, 'utf8')).lobby;
    for (const k of ['sub', 'subSeason', 'subSeason2']) assert.ok(D[k] && D[k].length > 5, `${l}.${k}`);
    const html = readFileSync(`public/${l}/index.html`, 'utf8');
    assert.ok(html.includes(D.subSeason) && html.includes(D.subSeason2), l);
    assert.ok(!/Halloween|할로윈/i.test(D.subSeason + D.subSeason2));
    const ld = JSON.parse(html.match(/application\/ld\+json">(.*?)<\/script>/)[1]);
    const list = ld['@graph'].find((x) => x['@type'] === 'ItemList');
    assert.equal(list.itemListElement.length, 3);
    assert.ok(html.includes(`/${l}/friends/things-to-do/`));
  }
});
