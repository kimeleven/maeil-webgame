import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { weeklyPick } from '../public/js/weekly.js';

const mk = (items, okPaths) => async (u, o) => {
  if (u === '/data/weekly.json') return { ok: true, json: async () => ({ items }) };
  return { ok: okPaths.includes(u) };
};
const item = { slug: 'orbit', path: '/{lang}/play/orbit-switch/', since: '2000-01-01', name: { ko: '궤도', en: 'Orbit' }, desc: { ko: '설명' } };

test('shipped weekly.json is valid and empty-safe', () => {
  const j = JSON.parse(readFileSync(new URL('../public/data/weekly.json', import.meta.url)));
  assert.ok(Array.isArray(j.items));
});
test('empty -> null', async () => assert.equal(await weeklyPick('ko', mk([], [])), null));
test('future since -> null', async () => assert.equal(await weeklyPick('ko', mk([{ ...item, since: '2999-01-01' }], ['/ko/play/orbit-switch/'])), null));
test('broken link -> null', async () => assert.equal(await weeklyPick('ko', mk([item], [])), null));
test('missing lang name -> null', async () => assert.equal(await weeklyPick('ja', mk([item], ['/ja/play/orbit-switch/'])), null));
test('valid -> pick', async () => assert.deepEqual(await weeklyPick('ko', mk([item], ['/ko/play/orbit-switch/'])), { href: '/ko/play/orbit-switch/', name: '궤도', desc: '설명' }));
