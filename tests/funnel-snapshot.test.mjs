import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { snapshot } from '../scripts/funnel-snapshot.mjs';

const dir = mkdtempSync(join(tmpdir(), 'snap-'));
const tokenFile = join(dir, 'tok'); writeFileSync(tokenFile, 'SECRET-TOKEN-XYZ\n');
const ok = (body) => async (url, o) => { assert.equal(o.headers['x-stats-token'], 'SECRET-TOKEN-XYZ'); return { ok: true, status: 200, json: async () => body }; };

test('funnel-snapshot: success row, n<30 flagged, no token in log', async () => {
  const logFile = join(dir, 'a.jsonl');
  const row = await snapshot({ base: 'http://x', tokenFile, logFile, fetchFn: ok({ funnel: { observed: true, rush: { shareClick: 4, shareResultTotal: 2, shareResultPerClick: 0.5, challengeShareResult: { shared: 1, copied: 1 }, playStart: 3 }, challenge: { challengeLand: 40, playStartFromChallenge: 10, playStartPerLand: 0.25 }, quiz: {} } }) });
  assert.equal(row.ok, true); assert.equal(row.rush.sample, '표본부족(n=4)'); assert.equal(row.challenge.sample, 'ok'); assert.equal(row.rush.challengeShareTotal, 2);
  const txt = readFileSync(logFile, 'utf8'); assert.equal(txt.trim().split('\n').length, 1); assert.ok(!txt.includes('SECRET'));
});
test('funnel-snapshot: 401 and network failure append reason rows', async () => {
  const logFile = join(dir, 'b.jsonl');
  const r1 = await snapshot({ base: 'http://x', tokenFile, logFile, fetchFn: async () => ({ ok: false, status: 401 }) });
  const r2 = await snapshot({ base: 'http://x', tokenFile, logFile, fetchFn: async () => { throw new Error('boom'); } });
  assert.deepEqual([r1.ok, r1.reason, r2.ok, r2.reason], [false, 'http 401', false, 'network error']);
  assert.equal(readFileSync(logFile, 'utf8').trim().split('\n').length, 2);
});
