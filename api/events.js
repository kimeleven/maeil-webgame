// POST /api/events  body {v:1, events:[{id,name,g,lang,from,end?,via?}]}  (t_287677ef)
// Anonymous batch collection into the existing free OCI DB. Writes only on the production deployment;
// preview/local never touch the production table (they pass an isolated store via deps.sql, or drop).
import { getSql } from '../lib/db.js';
import { send } from '../lib/http.js';
import { MAX_BYTES, validateBatch, isBotUA, originOk, rateLimited, insertEvents, ensureEventsSchema } from '../lib/events.js';

async function rawBody(req) {
  if (typeof req.body === 'string') return req.body;
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  if (req.body && typeof req.body === 'object') return JSON.stringify(req.body);
  const chunks = []; let size = 0;
  for await (const c of req) { size += c.length; if (size > MAX_BYTES) return null; chunks.push(c); }
  return Buffer.concat(chunks).toString('utf8');
}

export function storeFor(deps = {}, env = process.env) {
  if (deps.sql) return { sql: deps.sql, sink: 'isolated' };
  if (env.VERCEL_ENV === 'production') { const sql = getSql(); return { sql, sink: sql ? 'production' : 'none' }; }
  return { sql: null, sink: 'disabled-nonprod' };
}

export default async function handler(req, res, deps = {}) {
  if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' });
  if (rateLimited(req)) { res.setHeader('Retry-After', '60'); return send(res, 429, { error: 'rate limited' }); }
  if (!originOk(req)) return send(res, 403, { error: 'origin' });
  const ct = String(req.headers['content-type'] || 'text/plain').split(';')[0].trim().toLowerCase();
  if (ct !== 'text/plain' && ct !== 'application/json') return send(res, 415, { error: 'content-type' }); // form bodies get pre-parsed by the platform
  if (Number(req.headers['content-length'] || 0) > MAX_BYTES) return send(res, 413, { error: 'too large' });
  const raw = await rawBody(req);
  if (raw == null || Buffer.byteLength(raw) > MAX_BYTES) return send(res, 413, { error: 'too large' });
  let body; try { body = JSON.parse(raw); } catch { return send(res, 400, { error: 'bad json' }); }
  const v = validateBatch(body);
  if (v.error) return send(res, 400, { error: v.error });
  if (isBotUA(req.headers['user-agent'])) return send(res, 202, { stored: 0, dropped: 'bot' });
  if (!v.rows.length) return send(res, 202, { stored: 0, dropped: v.qa ? 'qa' : 'duplicate' });
  const { sql, sink } = storeFor(deps);
  if (!sql) return send(res, 202, { stored: 0, sink });
  try {
    await ensureEventsSchema(sql);
    const stored = await insertEvents(sql, v.rows);
    return send(res, 202, { stored, duplicate: v.rows.length - stored, qa: v.qa, sink });
  } catch (e) {
    console.error('/api/events', e?.code || e?.message);
    return send(res, 503, { error: 'store unavailable' });
  }
}
