// Chemistry invites (REBOOT-SPEC §5.3). Rewrites map:
//   POST   /api/invite                    → create {lang,nick,code} → {token, ownerKey}
//   GET    /api/invite/{t}                → ?token=t
//   DELETE /api/invite/{t}                → ?token=t        (x-owner-key)
//   POST   /api/invite/{t}/join           → ?token=t&op=join {nick,code} → {memberKey, chemistry}
//   DELETE /api/invite/{t}/member         → ?token=t&op=member (x-member-key)
import { getSql } from '../lib/db.js';
import { queryOf, readBody, send } from '../lib/http.js';
import { CODES, cleanLang, cleanNick, ensureSchema, isToken, limited, sha256, token128 } from '../lib/reboot.js';
import { chemistry } from '../public/js/logic.js';

const DEF_NICK = { ko: '친구1', en: 'Friend1', ja: 'ともだち1', 'zh-hans': '朋友1', es: 'Amigo1', 'pt-br': 'Amigo1' };
const MAX_MEMBERS = 8;

export default async function handler(req, res, deps = {}) {
  const sql = deps.sql || getSql();
  if (!sql) return send(res, 503, { error: 'db unavailable' });
  try {
    await ensureSchema(sql);
    const q = queryOf(req), token = q.token, op = q.op || '';
    if (!token) {
      if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' });
      if (limited(req)) return send(res, 429, { error: 'too many requests' });
      const b = await readBody(req);
      const lang = cleanLang(b.lang), code = CODES.includes(b.code) ? b.code : null, nick = cleanNick(b.nick, DEF_NICK[lang] || '친구1');
      if (!lang || !code || !nick) return send(res, 400, { error: 'invalid invite' });
      const t = token128(), ownerKey = token128() + token128();
      await sql`INSERT INTO reboot_invites (token, owner_hash, owner_nick, owner_code, lang) VALUES (${t}, ${sha256(ownerKey)}, ${nick}, ${code}, ${lang})`;
      return send(res, 201, { token: t, ownerKey });
    }
    if (!isToken(token)) return send(res, 404, { error: 'not found' });
    const inv = (await sql`SELECT token, owner_hash, owner_nick, owner_code, lang FROM reboot_invites WHERE token = ${token} AND deleted_at IS NULL AND expires_at > now()`)[0];
    if (!inv) return send(res, 404, { error: 'not found' });
    const ownerKey = req.headers['x-owner-key'], memberKey = req.headers['x-member-key'];
    const isOwner = typeof ownerKey === 'string' && sha256(ownerKey) === inv.owner_hash;

    if (op === '' && req.method === 'GET') {
      const members = await sql`SELECT nick, code, member_hash FROM reboot_invite_members WHERE token = ${token} ORDER BY id`;
      const isMember = typeof memberKey === 'string' && members.some((m) => m.member_hash === sha256(memberKey));
      const body = { ownerNick: inv.owner_nick, lang: inv.lang, isOwner, count: members.length, members: [] };
      if (isOwner) body.members = members.map((m) => ({ nick: m.nick, code: m.code.trim() }));
      else body.members = members.map(() => ({})); // count only for visitors
      if (isOwner || isMember) body.ownerCode = inv.owner_code.trim();
      return send(res, 200, body);
    }
    if (op === '' && req.method === 'DELETE') {
      if (!isOwner) return send(res, 403, { error: 'forbidden' });
      await sql`UPDATE reboot_invites SET deleted_at = now() WHERE token = ${token}`; // soft delete (no physical deletion)
      return send(res, 200, { ok: true });
    }
    if (op === 'join' && req.method === 'POST') {
      if (limited(req)) return send(res, 429, { error: 'too many requests' });
      const b = await readBody(req);
      const code = CODES.includes(b.code) ? b.code : null, nick = cleanNick(b.nick, DEF_NICK[inv.lang] || 'Friend');
      if (!code || !nick) return send(res, 400, { error: 'invalid join' });
      const mk = token128() + token128();
      const ins = await sql`INSERT INTO reboot_invite_members (token, member_hash, nick, code)
        SELECT ${token}, ${sha256(mk)}, ${nick}, ${code}
        WHERE (SELECT count(*) FROM reboot_invite_members WHERE token = ${token}) < ${MAX_MEMBERS}
        RETURNING id`;
      if (!ins.length) return send(res, 409, { error: 'full' });
      return send(res, 201, { memberKey: mk, ownerNick: inv.owner_nick, chemistry: chemistry(inv.owner_code.trim(), code) });
    }
    if (op === 'member' && req.method === 'DELETE') {
      if (typeof memberKey !== 'string') return send(res, 403, { error: 'forbidden' });
      // participant removes own result (user-initiated self-deletion, §5.1-6 / §5.4)
      const r = await sql`DELETE FROM reboot_invite_members WHERE token = ${token} AND member_hash = ${sha256(memberKey)} RETURNING id`;
      if (!r.length) return send(res, 404, { error: 'not found' });
      return send(res, 200, { ok: true });
    }
    return send(res, 405, { error: 'method not allowed' });
  } catch (e) {
    console.error('/api/invite', e?.message);
    return send(res, 500, { error: 'server error' });
  }
}
