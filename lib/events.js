// Anonymous game events (t_287677ef): contract, validation, per-instance rate limit, store, aggregation.
// Stored row = event_id (random per event, retry de-dup only) + allowlisted enums + server receive time (UTC).
// Never stored: IP, user agent, full URL, referrer, names, answers, score, seed, any persistent user id.
import { createHash, randomBytes } from 'node:crypto';
import { LANGS } from './reboot.js';

// share_fail is outside the v1 allowlist: diagnostic only (stays in window.__trackLog / Vercel va), never sent or stored.
export const EVENT_NAMES = ['play_start', 'play_again', 'play_end', 'share_click', 'share_done', 'challenge_land', 'share_result'];
// 1024-21: rush/quiz share funnel reuses the same anonymous table (no schema change). Per game the allowed names:
// rush → play_start(from c|direct), share_click, share_result(via=RESULTS, k=challenge optional), challenge_land; quiz → share_click, share_result.
export const FUNNEL_GAMES = { rush: ['play_start', 'share_click', 'share_result', 'challenge_land'], quiz: ['share_click', 'share_result'] };
export const RESULTS = ['shared', 'copied', 'failed', 'cancel'];
// game id → allowed play_end reasons. 'time' = completed (timer ran out / survived); others = early end.
export const GAMES = { magnet: ['time', 'lives'], orbit: ['time', 'hit'], echo: ['time'] };
export const FROMS = ['c', 'direct'];
// magnet inflow source (t_05b366b3): stored in src only. Values outside the list (or empty) are coerced to 'unknown', not rejected.
export const MAGNET_FROMS = ['reddit-webgames', 'itch', 'direct', 'unknown', 'c'];
export const METHODS = ['native', 'text', 'link', 'png'];
export const MAX_EVENTS = 20, MAX_BYTES = 16 * 1024, RATE_PER_MIN = 60, MIN_ENDS = 30;

export const EVENTS_SCHEMA = `
CREATE TABLE IF NOT EXISTS game_events (
  event_id     TEXT PRIMARY KEY,
  g            TEXT NOT NULL,
  name         TEXT NOT NULL,
  lang         TEXT NOT NULL,
  src          TEXT NOT NULL,
  reason       TEXT,
  method       TEXT,
  received_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS game_events_received_at ON game_events (received_at)`;

let ready = null;
export function ensureEventsSchema(sql) {
  // App role is DML only (42501 on CREATE) → the table is created once by the owner (db/game_events.sql).
  const run = async (s) => { try { await sql.query(s); } catch (e) { if (e?.code !== '42501') throw e; } };
  if (!ready) ready = (async () => { for (const s of EVENTS_SCHEMA.split(';').map((x) => x.trim()).filter(Boolean)) await run(s); })().catch((e) => { ready = null; throw e; });
  return ready;
}
export function __resetEventsSchema() { ready = null; }

const ID = /^[A-Za-z0-9_-]{16,32}$/;
const ALLOWED_KEYS = new Set(['id', 'name', 'g', 'lang', 'from', 'end', 'via', 'k', 'qa']);

// → { rows, qa } or { error }. Any field outside the contract rejects the whole batch.
export function validateBatch(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'bad body' };
  if (Object.keys(body).some((k) => k !== 'v' && k !== 'events') || body.v !== 1) return { error: 'bad version' };
  const list = body.events;
  if (!Array.isArray(list) || list.length < 1) return { error: 'no events' };
  if (list.length > MAX_EVENTS) return { error: 'too many events' };
  const rows = [], seen = new Set(); let qa = 0;
  for (const e of list) {
    if (!e || typeof e !== 'object' || Array.isArray(e)) return { error: 'bad event' };
    for (const k of Object.keys(e)) if (!ALLOWED_KEYS.has(k)) return { error: 'unknown field' };
    const { id, name, g, lang, end, via } = e;
    let from = e.from ?? (g === 'magnet' ? 'unknown' : 'direct');
    if (g === 'magnet' && !MAGNET_FROMS.includes(from)) from = 'unknown';
    if (typeof id !== 'string' || !ID.test(id)) return { error: 'bad id' };
    if (!EVENT_NAMES.includes(name)) return { error: 'bad name' };
    const funnel = Object.hasOwn(FUNNEL_GAMES, g);
    if (!funnel && !Object.hasOwn(GAMES, g)) return { error: 'bad game' };
    if (funnel ? !FUNNEL_GAMES[g].includes(name) : (name === 'challenge_land' || name === 'share_result')) return { error: 'bad name' };
    if (e.k !== undefined && !(funnel && name === 'share_result' && e.k === 'challenge')) return { error: 'bad k' };
    if (!LANGS.includes(lang)) return { error: 'bad lang' };
    if (g !== 'magnet' && !FROMS.includes(from)) return { error: 'bad from' };
    if (e.qa !== undefined && e.qa !== '1') return { error: 'bad qa' };
    if (name === 'play_end') { if (!GAMES[g].includes(end) || via !== undefined) return { error: 'bad end' }; }
    else if (end !== undefined) return { error: 'bad end' };
    if (name === 'share_result') { if (!RESULTS.includes(via)) return { error: 'bad via' }; }
    else if (funnel) { if (via !== undefined) return { error: 'bad via' }; }
    else if (name.startsWith('share_')) { if (!METHODS.includes(via)) return { error: 'bad via' }; }
    else if (via !== undefined) return { error: 'bad via' };
    if (e.qa === '1') { qa++; continue; } // QA traffic is dropped, never stored
    if (seen.has(id)) continue;
    seen.add(id);
    rows.push({ id, name, g, lang, src: from, reason: end ?? e.k ?? null, method: via ?? null });
  }
  return { rows, qa };
}

const BOT_UA = /bot|crawl|spider|slurp|headless|lighthouse|puppeteer|playwright|phantom|selenium|python|curl|wget|httpclient|go-http|okhttp|axios|node-fetch|undici/i;
export const isBotUA = (ua) => !ua || BOT_UA.test(String(ua));

// Origin must match this deployment's own host, or EVENTS_ORIGINS (comma list), or localhost in dev.
export function originOk(req, extra = process.env.EVENTS_ORIGINS || '') {
  const origin = String(req.headers?.origin || '');
  if (!origin) return false;
  let o; try { o = new URL(origin); } catch { return false; }
  const host = String(req.headers?.['x-forwarded-host'] || req.headers?.host || '').split(',')[0].trim().toLowerCase();
  if (o.host.toLowerCase() === host && (o.protocol === 'https:' || /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host))) return true;
  const allow = ['https://www.playtoday.cloud', 'https://playtoday.cloud', ...extra.split(',').map((s) => s.trim()).filter(Boolean)];
  return allow.includes(o.origin);
}

// Per-instance sliding window keyed by a salted IP hash (salt is random per instance, rotated hourly,
// never stored; the hash itself only lives in memory for ≤60 s). Serverless instances do not share this
// map, so the effective global limit is 60 × (warm instances) — documented limitation, not a guarantee.
const hits = new Map(); let salt = randomBytes(16).toString('hex'), saltAt = Date.now();
export function rateLimited(req, now = Date.now()) {
  if (now - saltAt > 3_600_000) { salt = randomBytes(16).toString('hex'); saltAt = now; hits.clear(); }
  const ip = String(req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
  const key = createHash('sha256').update(salt + ip).digest('hex').slice(0, 20);
  const arr = (hits.get(key) || []).filter((t) => now - t < 60_000);
  arr.push(now); hits.set(key, arr);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.length || now - v.at(-1) > 60_000) hits.delete(k);
  return arr.length > RATE_PER_MIN;
}
export function __resetEventsLimiter() { hits.clear(); }

export async function insertEvents(sql, rows) {
  if (!rows.length) return 0;
  const vals = [], ph = rows.map((r, i) => {
    vals.push(r.id, r.g, r.name, r.lang, r.src, r.reason, r.method);
    const b = i * 7; return `($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7})`;
  });
  const out = await sql.query(`INSERT INTO game_events (event_id, g, name, lang, src, reason, method) VALUES ${ph.join(',')} ON CONFLICT (event_id) DO NOTHING RETURNING event_id`, vals);
  return out.length;
}

const rate = (num, den) => (den > 0 ? Math.round((num / den) * 10000) / 10000 : 'N/A');

// Aggregate for GET /api/stats → games. Window [start, end) in UTC. Never fills unobserved time with 0.
export async function gameStats(sql, { start, end } = {}) {
  const [m] = await sql`SELECT min(received_at) AS since FROM game_events`;
  const availableSince = m?.since ? new Date(m.since).toISOString() : null;
  const endAt = end ? new Date(end) : new Date();
  const startAt = start ? new Date(start) : new Date(endAt.getTime() - 24 * 3600_000);
  const base = {
    window: { startUtc: startAt.toISOString(), endUtc: endAt.toISOString() },
    availableSince,
    unit: 'events (not users)',
    notes: ['rates are event ratios over play_end, not user ratios', 'share_done = native sheet/clipboard/png save finished, not a confirmed SNS post', 'qa=1 and automation/bot traffic excluded on client and server (best effort, not complete bot detection)'],
  };
  if (!availableSince) return { ...base, observed: false, unobserved: { startUtc: startAt.toISOString(), endUtc: endAt.toISOString(), reason: 'collection not started' }, byGame: null };
  const since = new Date(availableSince);
  const unobserved = startAt < since ? { startUtc: startAt.toISOString(), endUtc: (since < endAt ? since : endAt).toISOString(), reason: 'before collection start (not recoverable, not zero)' } : null;
  if (since >= endAt) return { ...base, observed: false, unobserved, byGame: null };
  const rows = await sql`SELECT g, name, reason, method, src, count(*) AS c FROM game_events
      WHERE received_at >= ${startAt.toISOString()} AND received_at < ${endAt.toISOString()} GROUP BY 1,2,3,4,5`;
  const byGame = {};
  for (const g of Object.keys(GAMES)) byGame[g] = {
    counts: Object.fromEntries(EVENT_NAMES.filter((n) => n !== 'challenge_land' && n !== 'share_result').map((n) => [n, 0])),
    endReasons: Object.fromEntries(GAMES[g].map((r) => [r, 0])),
    shareMethods: Object.fromEntries(METHODS.map((v) => [v, { click: 0, done: 0 }])),
    ...(g === 'magnet' ? { playStartByFrom: Object.fromEntries(MAGNET_FROMS.map((f) => [f, 0])) } : {}),
  };
  for (const r of rows) {
    const x = byGame[r.g]; if (!x) continue; const c = Number(r.c);
    if (x.counts[r.name] !== undefined) x.counts[r.name] += c;
    if (x.playStartByFrom && r.name === 'play_start') x.playStartByFrom[MAGNET_FROMS.includes(r.src) ? r.src : 'unknown'] += c;
    if (r.name === 'play_end' && x.endReasons[r.reason] !== undefined) x.endReasons[r.reason] += c;
    if (r.method && x.shareMethods[r.method]) x.shareMethods[r.method][r.name === 'share_done' ? 'done' : 'click'] += c;
  }
  for (const [g, x] of Object.entries(byGame)) {
    const ends = x.counts.play_end;
    x.rates = { completion: rate(x.endReasons.time, ends), again: rate(x.counts.play_again, ends), shareClick: rate(x.counts.share_click, ends), shareDone: rate(x.counts.share_done, x.counts.share_click) };
    x.sample = { ends, enough: ends >= MIN_ENDS, label: ends >= MIN_ENDS ? 'ok' : `표본부족(n=${ends})` };
    x.completionRule = g === 'echo' ? 'time only (echo has no early end)' : `time vs ${GAMES[g].filter((r) => r !== 'time').join('|')} (early end)`;
    x.plays = x.counts.play_start;
    x.playsRule = 'play_start (one per run; a restart sends play_again 1 + play_start 1 in every game)';
    if (x.playStartByFrom) x.playStartByFromRule = '?from= allowlist (reddit-webgames|itch|direct|c), else unknown; rows before 2026-10-29 deploy were stored as direct|c';
  }
  return { ...base, observed: true, unobserved, byGame };
}

// Rush/quiz share funnel aggregate (1024-21) for GET /api/stats → funnel. Counts events in the window; never fills pre-collection time with 0.
export async function funnelStats(sql, { start, end } = {}) {
  const [m] = await sql`SELECT min(received_at) AS since FROM game_events`;
  const availableSince = m?.since ? new Date(m.since).toISOString() : null;
  const endAt = end ? new Date(end) : new Date();
  const startAt = start ? new Date(start) : new Date(endAt.getTime() - 24 * 3600_000);
  if (!availableSince || new Date(availableSince) >= endAt) return { observed: false, availableSince };
  const rows = await sql`SELECT g, name, src, reason, method, count(*) AS c FROM game_events
      WHERE g IN ('rush','quiz') AND received_at >= ${startAt.toISOString()} AND received_at < ${endAt.toISOString()} GROUP BY 1,2,3,4,5`;
  const c = { rush: { shareClick: 0, shareResult: Object.fromEntries(RESULTS.map((r) => [r, 0])), challengeShareResult: Object.fromEntries(RESULTS.map((r) => [r, 0])), challengeLand: 0, playStart: 0, playStartFromChallenge: 0 }, quiz: { shareClick: 0, shareResult: Object.fromEntries(RESULTS.map((r) => [r, 0])) } };
  for (const r of rows) {
    const x = c[r.g]; if (!x) continue; const n = Number(r.c);
    if (r.name === 'share_click') x.shareClick += n;
    else if (r.name === 'share_result' && RESULTS.includes(r.method)) (r.reason === 'challenge' ? x.challengeShareResult : x.shareResult)[r.method] += n;
    else if (r.name === 'challenge_land') x.challengeLand += n;
    else if (r.name === 'play_start') { x.playStart += n; if (r.src === 'c') x.playStartFromChallenge += n; }
  }
  const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
  const ratio = (a, b) => (b > 0 ? Math.round((a / b) * 10000) / 10000 : 'N/A');
  const R = c.rush, Q = c.quiz, rs = sum(R.shareResult);
  const label = (n) => (n >= MIN_ENDS ? 'ok' : `표본부족(n=${n})`);
  return {
    observed: true, availableSince,
    window: { startUtc: startAt.toISOString(), endUtc: endAt.toISOString() },
    unobserved: startAt < new Date(availableSince) ? { startUtc: startAt.toISOString(), endUtc: availableSince, reason: 'before collection start (not recoverable, not zero)' } : null,
    rush: { ...R, shareResultTotal: rs, shareResultPerClick: ratio(rs, R.shareClick), sample: label(R.shareClick) },
    quiz: { ...Q, shareResultTotal: sum(Q.shareResult), shareResultPerClick: ratio(sum(Q.shareResult), Q.shareClick), sample: label(Q.shareClick) },
    challenge: { challengeLand: R.challengeLand, playStartFromChallenge: R.playStartFromChallenge, playStartPerLand: ratio(R.playStartFromChallenge, R.challengeLand), sample: label(R.challengeLand) },
  };
}

export function parseWindow(q) {
  const p = (v) => { if (v == null || v === '') return undefined; const d = new Date(String(v)); return Number.isNaN(d.getTime()) ? null : d; };
  const start = p(q.start), end = p(q.end);
  if (start === null || end === null) return { error: 'bad start/end (ISO 8601 UTC)' };
  if (start && end && start >= end) return { error: 'start must be before end' };
  if (start && end && end - start > 92 * 86400_000) return { error: 'window too long (max 92 days)' };
  return { start, end };
}
