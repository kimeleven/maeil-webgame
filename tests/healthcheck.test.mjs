import test from 'node:test';
import assert from 'node:assert/strict';
import { run, buildChecks, countLoc, EXPECT_LOC } from '../scripts/maeil/healthcheck.mjs';
const sm = (n) => '<urlset>' + '<url><loc>x</loc></url>'.repeat(n) + '</urlset>';
const mk = (status, n) => async (u) => ({ status, text: async () => sm(n) });
test('checks cover 6 langs, webgame, sitemap, stats', () => assert.equal(buildChecks('https://a.b/').length, 9));
test('countLoc', () => assert.equal(countLoc(sm(3)), 3));
test('all 200 + loc 128 passes', async () => assert.ok((await run('https://a.b', mk(200, EXPECT_LOC))).every((r) => r.ok)));
test('402 fails everything', async () => assert.ok((await run('https://a.b', mk(402, EXPECT_LOC))).every((r) => !r.ok)));
test('wrong loc count fails sitemap only', async () => {
  const r = await run('https://a.b', mk(200, 5));
  assert.deepEqual(r.filter((x) => !x.ok).map((x) => x.name), ['sitemap']);
});
