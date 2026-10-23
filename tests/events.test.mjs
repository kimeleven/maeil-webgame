// t_287677ef: anonymous game events — POST /api/events + GET /api/stats games, real Postgres (PGlite).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from '../scripts/dev.mjs';
import { __resetEventsLimiter, EVENTS_SCHEMA, validateBatch } from '../lib/events.js';
import eventsHandler, { storeFor } from '../api/events.js';

process.env.STATS_TOKEN = 'test-token-t287';
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1';
let srv, U;
before(async () => { srv = await startServer(0); U = srv.url; });
after(() => srv.server.close());

let n = 0;
const id = () => ('t287ev' + String(++n).padStart(6, '0') + 'xxxxxxxxxx').slice(0, 22);
const ev = (name, extra = {}) => ({ id: id(), name, g: 'orbit', lang: 'ko', from: 'direct', ...extra });
const post = async (body, { origin = U, ua = UA, raw } = {}) => {
  const headers = { 'content-type': 'text/plain', 'user-agent': ua }; if (origin) headers.origin = origin;
  const r = await fetch(U + '/api/events', { method: 'POST', headers, body: raw ?? JSON.stringify(body) });
  return { status: r.status, body: await r.json().catch(() => null) };
};
const stats = async (qs = '', token = 'test-token-t287') => {
  const r = await fetch(U + '/api/stats' + qs, { headers: { 'x-stats-token': token } });
  return { status: r.status, body: await r.json().catch(() => null) };
};
const rows = async () => (await srv.sql`SELECT count(*)::int AS c FROM game_events`)[0].c;

test('schema: additive only, no PII columns', () => {
  assert.ok(!/\b(ALTER|DROP|TRUNCATE|DELETE)\b/i.test(EVENTS_SCHEMA));
  assert.ok(!/\b(ip|user_agent|ua|url|referrer|referer|seed|score|nick|name_text|user_id|anon_id)\b/i.test(EVENTS_SCHEMA.replace(/\bname\b/, '')));
});

test('stats before any collection: games observed=false, byGame null (not 0), existing fields kept', async () => {
  const s = await stats();
  assert.equal(s.status, 200);
  assert.ok(s.body.shares && s.body.invites && s.body.inviteMembers, 'existing fields');
  assert.equal(s.body.games.observed, false);
  assert.equal(s.body.games.byGame, null);
  assert.equal(s.body.games.availableSince, null);
  assert.equal(s.body.games.unobserved.reason, 'collection not started');
  assert.equal((await stats('', 'wrong-token')).status, 401);
  assert.equal((await stats('?start=nope')).status, 400);
  assert.equal((await stats('?start=2026-10-24T00:00:00Z&end=2026-10-23T00:00:00Z')).status, 400);
});

test('schema validation: unknown field / name / game / reason / lang / via → 400, nothing stored', async () => {
  __resetEventsLimiter();
  const bad = [
    { v: 1, events: [ev('play_start', { score: 10 })] },
    { v: 1, events: [ev('play_start', { seed: '2026-10-23' })] },
    { v: 1, events: [ev('share_fail', { via: 'link' })] },
    { v: 1, events: [ev('play_start', { g: 'rush' })] },
    { v: 1, events: [ev('play_end', { end: 'lives' })] }, // orbit allows time|hit only
    { v: 1, events: [ev('play_end', { g: 'echo', end: 'hit' })] }, // echo allows time only
    { v: 1, events: [ev('play_end')] },
    { v: 1, events: [ev('play_start', { lang: 'fr' })] },
    { v: 1, events: [ev('play_start', { from: 'tw' })] },
    { v: 1, events: [ev('share_click', { via: 'kakao' })] },
    { v: 1, events: [ev('play_start', { via: 'link' })] },
    { v: 1, events: [ev('play_start', { id: 'short' })] },
    { v: 1, events: [ev('play_start')], url: 'https://x' },
    { v: 2, events: [ev('play_start')] },
    { v: 1, events: [] },
  ];
  for (const b of bad) assert.equal((await post(b)).status, 400, JSON.stringify(b));
  assert.equal((await post(null, { raw: '{not json' })).status, 400);
  assert.equal(await rows().catch(() => 0), 0);
});

test('size: 21 events → 400, >16KB → 413', async () => {
  __resetEventsLimiter();
  assert.equal((await post({ v: 1, events: Array.from({ length: 21 }, () => ev('play_start')) })).status, 400);
  assert.equal((await post(null, { raw: JSON.stringify({ v: 1, events: [ev('play_start')], pad: 'x'.repeat(17000) }) })).status, 413);
});

test('origin: missing / forged → 403', async () => {
  __resetEventsLimiter();
  assert.equal((await post({ v: 1, events: [ev('play_start')] }, { origin: null })).status, 403);
  assert.equal((await post({ v: 1, events: [ev('play_start')] }, { origin: 'https://evil.example' })).status, 403);
  assert.equal((await post({ v: 1, events: [ev('play_start')] }, { origin: 'https://www.playtoday.cloud.evil.example' })).status, 403);
});

test('qa=1 and bot/automation UA are dropped server side', async () => {
  __resetEventsLimiter();
  let r = await post({ v: 1, events: [ev('play_start', { qa: '1' })] });
  assert.equal(r.status, 202); assert.equal(r.body.stored, 0); assert.equal(r.body.dropped, 'qa');
  for (const ua of ['Mozilla/5.0 (compatible; Googlebot/2.1)', 'Mozilla/5.0 HeadlessChrome/131.0', 'curl/8.4', '']) {
    r = await post({ v: 1, events: [ev('play_start')] }, { ua });
    assert.equal(r.status, 202, ua); assert.equal(r.body.stored, 0, ua);
  }
  assert.equal(await rows().catch(() => 0), 0);
});

test('store → aggregate: start/end/again/share incl. cancel, resend de-dup, numbers match', async () => {
  __resetEventsLimiter();
  const before = new Date(Date.now() - 3600_000).toISOString();
  // orbit: 2 runs. run1 start → end:time → share native click+done → share native click (cancelled, no done)
  //        → again → start → end:hit
  const batch1 = [ev('play_start'), ev('play_end', { end: 'time' }), ev('share_click', { via: 'native' }), ev('share_done', { via: 'native' }), ev('share_click', { via: 'native' })];
  const batch2 = [ev('play_again'), ev('play_start'), ev('play_end', { end: 'hit' }), ev('share_click', { via: 'link', from: 'c' }), ev('share_done', { via: 'link', from: 'c' })];
  let r = await post({ v: 1, events: batch1 });
  assert.equal(r.status, 202); assert.equal(r.body.stored, 5); assert.equal(r.body.sink, 'isolated');
  r = await post({ v: 1, events: batch1 }); // network retry: same ids
  assert.equal(r.body.stored, 0); assert.equal(r.body.duplicate, 5);
  r = await post({ v: 1, events: [...batch2, batch2[0]] }); // in-batch duplicate too
  assert.equal(r.body.stored, 5);
  // magnet: restart = play_again + play_start (unified, t_287677ef); echo: time only
  r = await post({ v: 1, events: [
    { ...ev('play_start'), g: 'magnet', lang: 'en' }, { ...ev('play_end', { end: 'lives' }), g: 'magnet', lang: 'en' },
    { ...ev('play_again'), g: 'magnet', lang: 'en' }, { ...ev('play_start'), g: 'magnet', lang: 'en' }, { ...ev('play_end', { end: 'time' }), g: 'magnet', lang: 'en' },
    { ...ev('share_click', { via: 'png' }), g: 'magnet', lang: 'ja' }, { ...ev('share_done', { via: 'png' }), g: 'magnet', lang: 'ja' },
    { ...ev('play_start'), g: 'echo', lang: 'pt-br' }, { ...ev('play_end', { end: 'time' }), g: 'echo', lang: 'zh-hans' },
  ] });
  assert.equal(r.body.stored, 9);
  assert.equal(await rows(), 19);
  // stored row has only contract columns
  const cols = (await srv.sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'game_events' ORDER BY ordinal_position`).map((c) => c.column_name);
  assert.deepEqual(cols, ['event_id', 'g', 'name', 'lang', 'src', 'reason', 'method', 'received_at']);

  const s = await stats('?start=' + before);
  assert.equal(s.status, 200);
  const G = s.body.games;
  assert.equal(G.observed, true);
  assert.ok(G.availableSince && new Date(G.availableSince) > new Date(before));
  assert.equal(G.unobserved.startUtc, new Date(before).toISOString()); // before collection: reported as unobserved
  assert.equal(G.unobserved.endUtc, G.availableSince);
  const o = G.byGame.orbit;
  assert.deepEqual(o.counts, { play_start: 2, play_again: 1, play_end: 2, share_click: 3, share_done: 2 });
  assert.deepEqual(o.endReasons, { time: 1, hit: 1 });
  assert.deepEqual(o.shareMethods.native, { click: 2, done: 1 });
  assert.deepEqual(o.shareMethods.link, { click: 1, done: 1 });
  assert.equal(o.rates.completion, 0.5); assert.equal(o.rates.again, 0.5); assert.equal(o.rates.shareClick, 1.5);
  assert.equal(o.plays, 2); assert.equal(o.sample.enough, false); assert.equal(o.sample.label, '표본부족(n=2)');
  const m = G.byGame.magnet;
  assert.equal(m.plays, 2); assert.deepEqual(m.endReasons, { time: 1, lives: 1 });
  const e = G.byGame.echo;
  assert.deepEqual(e.endReasons, { time: 1 }); assert.equal(e.rates.completion, 1); assert.equal(e.rates.shareDone, 'N/A');
  // window entirely before collection → not observed, no zeros
  const s2 = await stats('?start=2026-01-01T00:00:00Z&end=2026-01-02T00:00:00Z');
  assert.equal(s2.body.games.observed, false); assert.equal(s2.body.games.byGame, null);
  // existing API unaffected
  assert.ok(Number.isInteger(s.body.shares.total));
});

test('rate limit: 61st request in a minute → 429', async () => {
  __resetEventsLimiter();
  let last;
  for (let i = 0; i < 61; i++) last = await post({ v: 1, events: [ev('share_click', { via: 'text' })] }, { origin: null });
  assert.equal(last.status, 429);
  __resetEventsLimiter();
});

test('non-production without isolated store never writes (preview/local with prod DATABASE_URL)', async () => {
  assert.equal(storeFor({}, { VERCEL_ENV: 'preview', DATABASE_URL: 'postgres://x' }).sql, null);
  assert.equal(storeFor({}, {}).sink, 'disabled-nonprod');
  const prevEnv = process.env.VERCEL_ENV; process.env.VERCEL_ENV = 'preview';
  const out = {}; const res = { setHeader() {}, end(b) { out.body = JSON.parse(b); }, set statusCode(v) { out.status = v; } };
  await eventsHandler({ method: 'POST', headers: { origin: 'https://www.playtoday.cloud', host: 'www.playtoday.cloud', 'user-agent': UA }, body: JSON.stringify({ v: 1, events: [ev('play_start')] }) }, res);
  process.env.VERCEL_ENV = prevEnv;
  assert.equal(out.status, 202); assert.equal(out.body.stored, 0); assert.equal(out.body.sink, 'disabled-nonprod');
});

test('validateBatch drops qa and in-batch duplicates without touching others', () => {
  const a = ev('play_start');
  const v = validateBatch({ v: 1, events: [a, a, ev('play_start', { qa: '1' })] });
  assert.equal(v.rows.length, 1); assert.equal(v.qa, 1);
});
