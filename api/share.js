// POST /api/share {kind, lang, payload} → {id};  GET /api/share/{id} (rewrite → ?id=) → minimal summary
import { getSql } from '../lib/db.js';
import { queryOf, readBody, send } from '../lib/http.js';
import { base62, cleanLang, ensureSchema, isShareId, limited, validShare } from '../lib/reboot.js';

export default async function handler(req, res, deps = {}) {
  const sql = deps.sql || getSql();
  if (!sql) return send(res, 503, { error: 'db unavailable' });
  try {
    await ensureSchema(sql);
    if (req.method === 'POST') {
      if (limited(req)) return send(res, 429, { error: 'too many requests' });
      const b = await readBody(req);
      const lang = cleanLang(b.lang), payload = validShare(b.kind, b.payload);
      if (!lang || !payload) return send(res, 400, { error: 'invalid share' });
      const id = base62(10);
      await sql`INSERT INTO reboot_shares (id, kind, lang, payload) VALUES (${id}, ${b.kind}, ${lang}, ${JSON.stringify(payload)}::jsonb)`;
      return send(res, 201, { id });
    }
    if (req.method === 'GET') {
      const { id } = queryOf(req);
      if (!isShareId(id)) return send(res, 404, { error: 'not found' });
      const rows = await sql`SELECT id, kind, lang, payload FROM reboot_shares WHERE id = ${id} AND expires_at > now()`;
      if (!rows.length) return send(res, 404, { error: 'not found' });
      const r = rows[0], p = typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload;
      return send(res, 200, { id: r.id, kind: r.kind, lang: r.lang, payload: p });
    }
    return send(res, 405, { error: 'method not allowed' });
  } catch (e) {
    console.error('/api/share', e?.message);
    return send(res, 500, { error: 'server error' });
  }
}
