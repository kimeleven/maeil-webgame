// 12h funnel snapshot: GET /api/stats (x-stats-token) -> one JSON line appended to funnel-log.jsonl.
// Never prints/logs the token. Exit 1 on failure (a reason row is still appended).
// env: SNAP_BASE (default https://www.playtoday.cloud), SNAP_TOKEN_FILE, SNAP_LOG
import { readFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const MIN_N = 30;
const num = (v) => (typeof v === 'number' ? v : 0);

export function buildRow(stats, now = new Date()) {
  const f = stats?.funnel;
  if (!f || f.observed === false) return { ts: now.toISOString(), ok: false, reason: 'funnel not observed' };
  const r = f.rush || {}, c = f.challenge || {}, q = f.quiz || {};
  const shareClick = num(r.shareClick), land = num(c.challengeLand);
  return {
    ts: now.toISOString(), ok: true,
    window: f.window ? { start: f.window.startUtc, end: f.window.endUtc } : null,
    rush: { shareClick, shareResultTotal: num(r.shareResultTotal), challengeShareTotal: Object.values(r.challengeShareResult || {}).reduce((a, b) => a + num(b), 0), shareResultPerClick: r.shareResultPerClick ?? 'N/A', sample: shareClick >= MIN_N ? 'ok' : `표본부족(n=${shareClick})`, playStart: num(r.playStart) },
    challenge: { challengeLand: land, playStartFromChallenge: num(c.playStartFromChallenge), playStartPerLand: c.playStartPerLand ?? 'N/A', sample: land >= MIN_N ? 'ok' : `표본부족(n=${land})` },
    quiz: { shareClick: num(q.shareClick), shareResultTotal: num(q.shareResultTotal) },
  };
}

export async function snapshot({ base, tokenFile, logFile, fetchFn = fetch, now = new Date() }) {
  const append = (row) => { mkdirSync(dirname(logFile), { recursive: true }); appendFileSync(logFile, JSON.stringify(row) + '\n'); return row; };
  let token;
  try { token = readFileSync(tokenFile, 'utf8').trim(); } catch { return append({ ts: now.toISOString(), ok: false, reason: 'token file unreadable' }); }
  if (!token) return append({ ts: now.toISOString(), ok: false, reason: 'token empty' });
  let res;
  try { res = await fetchFn(`${base}/api/stats`, { headers: { 'x-stats-token': token } }); } catch (e) { return append({ ts: now.toISOString(), ok: false, reason: 'network error' }); }
  if (!res.ok) return append({ ts: now.toISOString(), ok: false, reason: `http ${res.status}` });
  let body; try { body = await res.json(); } catch { return append({ ts: now.toISOString(), ok: false, reason: 'bad json' }); }
  return append(buildRow(body, now));
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const row = await snapshot({
    base: process.env.SNAP_BASE || 'https://www.playtoday.cloud',
    tokenFile: process.env.SNAP_TOKEN_FILE || resolve(here, '../../maeil-reboot/.stats-token'),
    logFile: process.env.SNAP_LOG || resolve(here, '../../maeil-arcade-local/funnel-log.jsonl'),
  });
  console.log(JSON.stringify(row));
  process.exit(row.ok ? 0 : 1);
}
