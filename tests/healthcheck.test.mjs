import test from 'node:test';
import assert from 'node:assert/strict';
import { run, buildChecks, countLoc, EXPECT_LOC } from '../scripts/maeil/healthcheck.mjs';
const sm = (n) => '<urlset>' + '<url><loc>x</loc></url>'.repeat(n) + '</urlset>';
const mk = (status, n) => async (u) => ({ status, text: async () => sm(n) });
test('checks cover 6 langs, webgame, sitemap, stats', () => assert.equal(buildChecks('https://a.b/').length, 9));
test('countLoc', () => assert.equal(countLoc(sm(3)), 3));
test('200 + loc 128 passes; stats 401 is OK, stats 200 is not', async () => {
  const f = async (u) => ({ status: u.endsWith('/api/stats') ? 401 : 200, text: async () => sm(EXPECT_LOC) });
  assert.ok((await run('https://a.b', f)).every((r) => r.ok));
});
test('402 fails everything', async () => assert.ok((await run('https://a.b', mk(402, EXPECT_LOC))).every((r) => !r.ok)));
test('wrong loc count fails sitemap only', async () => {
  const r = await run('https://a.b', async (u) => ({ status: u.endsWith('/api/stats') ? 401 : 200, text: async () => sm(5) }));
  assert.deepEqual(r.filter((x) => !x.ok).map((x) => x.name), ['sitemap']);
});
