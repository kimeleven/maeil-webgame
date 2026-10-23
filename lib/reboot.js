// Shared helpers for reboot APIs (REBOOT-SPEC §5.3). New tables only; never alters existing ones.
import { createHash, randomBytes } from 'node:crypto';

export const LANGS = ['ko', 'en', 'ja', 'zh-hans', 'es', 'pt-br'];
export const CODES = ['SPH', 'SPT', 'SIH', 'SIT', 'CPH', 'CPT', 'CIH', 'CIT'];
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS reboot_shares (
  id          TEXT PRIMARY KEY,
  kind        TEXT NOT NULL CHECK (kind IN ('rush','quiz')),
  lang        TEXT NOT NULL,
  payload     JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT now() + interval '90 days'
);
CREATE TABLE IF NOT EXISTS reboot_invites (
  token        TEXT PRIMARY KEY,
  owner_hash   TEXT NOT NULL,
  owner_nick   TEXT NOT NULL,
  owner_code   CHAR(3) NOT NULL,
  lang         TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT now() + interval '7 days',
  deleted_at   TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS reboot_invite_members (
  id           BIGSERIAL PRIMARY KEY,
  token        TEXT NOT NULL REFERENCES reboot_invites(token),
  member_hash  TEXT NOT NULL,
  nick         TEXT NOT NULL,
  code         CHAR(3) NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (token, member_hash)
);`;

let ready = null;
export function ensureSchema(sql) {
  // The app DB role has DML only (no CREATE on schema): an existing table makes CREATE … IF NOT EXISTS
  // fail with 42501, so skip that error; a truly missing table still fails on first use. (t_6ba1c9f1)
  const run = async (stmt) => { try { await sql.query(stmt); } catch (e) { if (e?.code !== '42501') throw e; } };
  if (!ready) ready = (async () => { for (const stmt of SCHEMA.split(';').map((s) => s.trim()).filter(Boolean)) await run(stmt); })().catch((e) => { ready = null; throw e; });
  return ready;
}

const B62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
export function base62(n = 10) { const b = randomBytes(n * 2); let s = ''; for (let i = 0; s.length < n && i < b.length; i++) if (b[i] < 248) s += B62[b[i] % 62]; return s.length === n ? s : base62(n); }
export const token128 = () => randomBytes(16).toString('base64url'); // 22 chars
export const sha256 = (s) => createHash('sha256').update(String(s)).digest('hex');
export const isShareId = (s) => typeof s === 'string' && /^[A-Za-z0-9]{10}$/.test(s);
export const isToken = (s) => typeof s === 'string' && /^[A-Za-z0-9_-]{22}$/.test(s);
export const cleanLang = (l) => (LANGS.includes(l) ? l : null);
export function cleanNick(s, def) {
  if (s == null || s === '') return def;
  if (typeof s !== 'string') return null;
  const n = s.replace(/[\u0000-\u001f\u007f<>]/g, '').trim();
  return [...n].length >= 1 && [...n].length <= 12 ? n : n ? null : def;
}

export function validShare(kind, payload) {
  if (!payload || typeof payload !== 'object') return null;
  if (kind === 'rush') {
    const { seed, stage, score, assist } = payload;
    if (typeof seed !== 'string' || !/^[a-z0-9-]{1,32}$/.test(seed)) return null;
    if (!Number.isInteger(stage) || stage < 1 || stage > 999) return null;
    if (!Number.isInteger(score) || score < 0 || score > 1e8) return null;
    return { seed, stage, score, assist: !!assist };
  }
  if (kind === 'quiz') return CODES.includes(payload.code) ? { code: payload.code } : null;
  return null;
}

// per-instance limiter: IP hash only, 10 creations / minute (spec allows memory counter)
const hits = new Map();
export function limited(req, bucket = 'create') {
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
  const key = bucket + ':' + sha256('rl:' + ip).slice(0, 24), now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < 60_000);
  arr.push(now); hits.set(key, arr);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.length || now - v.at(-1) > 3_600_000) hits.delete(k);
  return arr.length > 10;
}
export const __resetLimiter = () => hits.clear();
