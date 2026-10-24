// GET /api/stats[?start=ISO&end=ISO] (header x-stats-token: STATS_TOKEN) → aggregate counts only, no rows/PII
import { timingSafeEqual } from 'node:crypto';
import { getSql } from '../lib/db.js';
import { send } from '../lib/http.js';
import { ensureSchema } from '../lib/reboot.js';
import { queryOf } from '../lib/http.js';
import { gameStats, parseWindow, ensureEventsSchema } from '../lib/events.js';

function authorized(req, token) {
  if (!token) return false;
  const got = String(req.headers?.['x-stats-token'] || '');
  const a = Buffer.from(got), b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

const n = (v) => Number(v || 0);

// Share funnel baseline (t_11d5fd4b). Only anonymous game_events are stored server-side (magnet/orbit/echo:
// share_click, share_done by method). Rush/quiz/challenge share_click·share_result·challenge_land·play_start(challenge)
// go to Vercel Analytics only (client track.js), so they are reported as unobserved, never 0.
export function funnelOf(games) {
  const unobserved = (what) => ({ observed: false, reason: `${what} is client-side (Vercel Analytics) only; not stored server-side` });
  const out = {
    rush: { shareClick: unobserved('rush share_click'), shareResult: unobserved('rush share_result (shared|copied|failed|cancel)') },
    challenge: { challengeLand: unobserved('challenge_land'), playStartFromChallenge: unobserved('play_start(challenge)') },
    games: null,
    testSeparation: 'qa=1 events are dropped before storage and bot UAs are excluded (best effort); no separate test counts are stored',
    pii: 'none (aggregate counts only)',
  };
  if (games?.observed && games.byGame) {
    out.games = { window: games.window, availableSince: games.availableSince, byGame: Object.fromEntries(Object.entries(games.byGame).map(([g, x]) => [g, { shareClick: x.counts.share_click, shareDone: x.counts.share_done, byMethod: x.shareMethods, plays: x.plays }])) };
  } else out.games = { observed: false, reason: games?.error || 'no game_events in window', unobserved: games?.unobserved ?? null };
  return out;
}

export default async function handler(req, res, deps = {}) {
  if (req.method !== 'GET') return send(res, 405, { error: 'method not allowed' });
  const token = (deps.token ?? process.env.STATS_TOKEN ?? '').trim();
  if (!authorized(req, token)) return send(res, 401, { error: 'unauthorized' });
  const sql = deps.sql || getSql();
  if (!sql) return send(res, 503, { error: 'db unavailable' });
  const win = parseWindow(queryOf(req));
  if (win.error) return send(res, 400, { error: win.error });
  try {
    await ensureSchema(sql);
    const [s] = await sql`SELECT count(*) AS total,
        count(*) FILTER (WHERE created_at > now() - interval '24 hours') AS d1,
        count(*) FILTER (WHERE created_at > now() - interval '7 days') AS d7 FROM reboot_shares`;
    const byKind = await sql`SELECT kind, lang, count(*) AS c FROM reboot_shares GROUP BY kind, lang ORDER BY kind, lang`;
    const daily = await sql`SELECT to_char(date_trunc('day', created_at AT TIME ZONE 'Asia/Seoul'), 'YYYY-MM-DD') AS day, count(*) AS c
        FROM reboot_shares WHERE created_at > now() - interval '14 days' GROUP BY 1 ORDER BY 1`;
    const [i] = await sql`SELECT count(*) AS total,
        count(*) FILTER (WHERE created_at > now() - interval '7 days') AS d7 FROM reboot_invites`;
    const [m] = await sql`SELECT count(*) AS total,
        count(*) FILTER (WHERE created_at > now() - interval '7 days') AS d7 FROM reboot_invite_members`;
    // games (t_287677ef): separate guard so a missing events table never breaks the existing fields
    let games;
    try { await ensureEventsSchema(sql); games = await gameStats(sql, win); }
    catch (e) { games = { observed: false, byGame: null, error: e?.code === '42P01' ? 'events table not created yet' : 'events unavailable' }; }
    return send(res, 200, {
      funnel: funnelOf(games),
      generatedAt: new Date().toISOString(),
      shares: { total: n(s.total), last24h: n(s.d1), last7d: n(s.d7),
        byKindLang: byKind.map((r) => ({ kind: r.kind, lang: r.lang, count: n(r.c) })),
        dailyKst14d: daily.map((r) => ({ day: r.day, count: n(r.c) })) },
      invites: { total: n(i.total), last7d: n(i.d7) },
      inviteMembers: { total: n(m.total), last7d: n(m.d7) },
      games,
    });
  } catch (e) {
    console.error('/api/stats', e?.message);
    return send(res, 500, { error: 'server error' });
  }
}
