import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const LANGS = ['ko', 'en', 'ja', 'zh-hans', 'es', 'pt-br'];
const load = (l) => JSON.parse(readFileSync(`i18n/${l}.json`, 'utf8'));
// unmeasured time claims ("1분" etc.) are forbidden in quiz share text
const TIME_CLAIM = /1\s*분|1\s*minutes?|one minute|1\s*分|一分钟|1\s*minuto|um minuto|un minuto/i;

test('quiz.shareText: no time claim, has {name} and {url}', () => {
  for (const l of LANGS) {
    const t = load(l).quiz.shareText;
    assert.ok(!TIME_CLAIM.test(t), `${l}: ${t}`);
    assert.ok(t.includes('{name}') && t.includes('{url}'), l);
  }
});

test('game.challengeReshareText exists in 6 languages with {url}, no time-claim, no contact ask', () => {
  for (const l of LANGS) {
    const t = load(l).game.challengeReshareText;
    assert.ok(t && t.includes('{url}'), l);
    assert.ok(!TIME_CLAIM.test(t), l);
    assert.ok(!/30\s*(초|秒|seconds?|segundos)/i.test(t), `${l}: unmeasured 30s claim`);
    assert.ok(!/(email|phone|연락처|電話|电话|teléfono|telefone)/i.test(t), l);
  }
});

test('rush result landing reshare passes text (not bare url) and swallows share errors', () => {
  const js = readFileSync('public/js/app.js', 'utf8');
  assert.ok(js.includes('D.game.challengeReshareText'));
});

test('season copy keys exist in 6 languages (length 6+)', () => {
  for (const l of LANGS) {
    const D = load(l);
    for (const k of ['subSeason', 'subSeason2', 'subSeason3']) assert.ok(D.lobby[k] && D.lobby[k].length > 5, `${l}.lobby.${k}`);
    assert.ok(D.quiz.shareSeason && D.quiz.shareSeason.length > 5, `${l}.quiz.shareSeason`);
  }
});

test('r page reshare records share_result from=r for quiz and rush (t_ff207dc5)', () => {
  const js = readFileSync('public/js/app.js', 'utf8');
  assert.ok((js.match(/window\.gev\('share_result', \{ g: '(quiz|rush)', from: 'r', via: rr \}/g) || []).length === 2);
  assert.ok(js.includes("track('share_click', { from: 'r' })"));
});
