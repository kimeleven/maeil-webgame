import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EVENTS } from '../public/js/track.js';

const LANGS = ['ko', 'en', 'ja', 'zh-hans', 'es', 'pt-br'];
test('share_cta_click is allowlisted', () => assert.ok(EVENTS.includes('share_cta_click')));
test('quiz shareText has {name}/{url}, fits 140 chars, tryToo exists in 6 langs', () => {
  for (const l of LANGS) {
    const D = JSON.parse(readFileSync(new URL(`../i18n/${l}.json`, import.meta.url), 'utf8'));
    const t = D.quiz.shareText;
    assert.ok(t.includes('{name}') && t.includes('{url}'), l);
    const filled = t.replace('{name}', 'X'.repeat(10)).replace('{url}', 'https://www.playtoday.cloud/r/abcdef12');
    assert.ok([...filled].length <= 140, `${l} ${[...filled].length}`);
    assert.ok(D.quiz.shareHint && D.cta.tryToo, l);
  }
});
