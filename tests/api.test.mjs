import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from '../scripts/dev.mjs';
import { __resetLimiter } from '../lib/reboot.js';

let srv, U;
before(async () => { srv = await startServer(0); U = srv.url; });
after(() => srv.server.close());
const j = async (path, opt = {}) => { const r = await fetch(U + path, { ...opt, headers: { 'content-type': 'application/json', ...(opt.headers || {}) }, body: opt.body ? JSON.stringify(opt.body) : undefined }); return { status: r.status, body: await r.json().catch(() => null) }; };

test('schema: only CREATE TABLE IF NOT EXISTS, no answer/ip columns (D5)', async () => {
  const { SCHEMA } = await import('../lib/reboot.js');
  assert.ok(!/\b(ALTER|DROP|TRUNCATE)\b/i.test(SCHEMA));
  assert.equal((SCHEMA.match(/CREATE TABLE IF NOT EXISTS/g) || []).length, 3);
  assert.ok(!/answers|\bip\b/i.test(SCHEMA));
});

test('share: create + read + validation', async () => {
  __resetLimiter();
  let r = await j('/api/share', { method: 'POST', body: { kind: 'rush', lang: 'ko', payload: { seed: '2026-10-18', stage: 7, score: 12345, assist: false } } });
  assert.equal(r.status, 201); assert.match(r.body.id, /^[A-Za-z0-9]{10}$/);
  const g = await j('/api/share/' + r.body.id);
  assert.equal(g.status, 200); assert.equal(g.body.payload.stage, 7); assert.equal(g.body.kind, 'rush');
  for (const bad of [{ kind: 'rush', lang: 'ko', payload: { seed: 'X!', stage: 1, score: 1 } }, { kind: 'rush', lang: 'ko', payload: { seed: 'a', stage: 0, score: 1 } }, { kind: 'quiz', lang: 'ko', payload: { code: 'XXX' } }, { kind: 'quiz', lang: 'fr', payload: { code: 'SPH' } }])
    assert.equal((await j('/api/share', { method: 'POST', body: bad })).status, 400);
  r = await j('/api/share', { method: 'POST', body: { kind: 'quiz', lang: 'ja', payload: { code: 'CIT', answers: ['a'] } } });
  assert.equal(r.status, 201);
  assert.deepEqual((await j('/api/share/' + r.body.id)).body.payload, { code: 'CIT' }); // extra fields dropped
  assert.equal((await j('/api/share/AAAAAAAAAA')).status, 404);
});

test('invite: full flow, privacy, 9th join 409, delete', async () => {
  __resetLimiter();
  const c = await j('/api/invite', { method: 'POST', body: { lang: 'ko', nick: '민지', code: 'SPH' } });
  assert.equal(c.status, 201); assert.match(c.body.token, /^[A-Za-z0-9_-]{22}$/);
  const { token, ownerKey } = c.body;
  // visitor: no owner code
  let v = await j('/api/invite/' + token);
  assert.equal(v.status, 200); assert.equal(v.body.ownerNick, '민지'); assert.equal(v.body.ownerCode, undefined); assert.equal(v.body.isOwner, false);
  const jn = await j(`/api/invite/${token}/join`, { method: 'POST', body: { nick: '준', code: 'CIT' } });
  assert.equal(jn.status, 201); assert.equal(jn.body.chemistry.pattern, 7); assert.ok(jn.body.memberKey);
  v = await j('/api/invite/' + token, { headers: { 'x-member-key': jn.body.memberKey } });
  assert.equal(v.body.ownerCode, 'SPH');
  const o = await j('/api/invite/' + token, { headers: { 'x-owner-key': ownerKey } });
  assert.equal(o.body.isOwner, true); assert.deepEqual(o.body.members, [{ nick: '준', code: 'CIT' }]);
  __resetLimiter();
  for (let i = 0; i < 7; i++) assert.equal((await j(`/api/invite/${token}/join`, { method: 'POST', body: { code: 'SPT' } })).status, 201);
  assert.equal((await j(`/api/invite/${token}/join`, { method: 'POST', body: { code: 'SPT' } })).status, 409);
  // member leaves
  assert.equal((await j(`/api/invite/${token}/member`, { method: 'DELETE', headers: { 'x-member-key': jn.body.memberKey } })).status, 200);
  // wrong owner key
  assert.equal((await j('/api/invite/' + token, { method: 'DELETE', headers: { 'x-owner-key': 'nope' } })).status, 403);
  assert.equal((await j('/api/invite/' + token, { method: 'DELETE', headers: { 'x-owner-key': ownerKey } })).status, 200);
  assert.equal((await j('/api/invite/' + token)).status, 404);
  // bad inputs
  assert.equal((await j('/api/invite', { method: 'POST', body: { lang: 'ko', nick: 'x'.repeat(13), code: 'SPH' } })).status, 400);
  assert.equal((await j('/api/invite', { method: 'POST', body: { lang: 'ko', code: 'ZZZ' } })).status, 400);
});

test('invite: default nick per lang, expiry → 404', async () => {
  __resetLimiter();
  const c = await j('/api/invite', { method: 'POST', body: { lang: 'en', code: 'CPT' } });
  assert.equal((await j('/api/invite/' + c.body.token)).body.ownerNick, 'Friend1');
  await srv.sql`UPDATE reboot_invites SET expires_at = now() - interval '1 second' WHERE token = ${c.body.token}`;
  assert.equal((await j('/api/invite/' + c.body.token)).status, 404);
});

test('rate limit: 11th create in a minute → 429', async () => {
  __resetLimiter();
  let last;
  for (let i = 0; i < 11; i++) last = await j('/api/share', { method: 'POST', body: { kind: 'quiz', lang: 'ko', payload: { code: 'SPH' } } });
  assert.equal(last.status, 429);
});

test('static: rewrites for r/c/i shells, sitemap, robots', async () => {
  for (const p of ['/ko/r/abc/', '/en/c/2026-10-18-1', '/ja/i/AAAAAAAAAAAAAAAAAAAAAA/', '/es/c/mh-2026-10-23']) {
    const r = await fetch(U + p); assert.equal(r.status, 200, p);
    const t = await r.text(); assert.match(t, /noindex/); assert.equal(r.headers.get('referrer-policy'), 'no-referrer');
  }
  const rb = await (await fetch(U + '/robots.txt')).text();
  for (const d of ['/api/', '/*/r/', '/*/i/', '/*/c/']) assert.ok(rb.includes('Disallow: ' + d));
  const sm = await (await fetch(U + '/sitemap.xml')).text();
  assert.equal((sm.match(/<url>/g) || []).length, 103); assert.equal((sm.match(/play\/magnet-harbor\/<\/loc>/g) || []).length, 6);
});

test('stats: token required, aggregates only', async () => {
  process.env.STATS_TOKEN = 'test-stats-token';
  assert.equal((await j('/api/stats')).status, 401);
  assert.equal((await j('/api/stats', { headers: { 'x-stats-token': 'wrong' } })).status, 401);
  const r = await j('/api/stats', { headers: { 'x-stats-token': 'test-stats-token' } });
  assert.equal(r.status, 200);
  assert.ok(r.body.shares.total >= 2); assert.ok(Array.isArray(r.body.shares.byKindLang));
  assert.ok(!JSON.stringify(r.body).includes('payload'));
  delete process.env.STATS_TOKEN;
});
