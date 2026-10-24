// t_287677ef: browser E2E for the game-event transport (public/js/gev.js) on the magnet page.
// Local (default): dev server + isolated in-memory Postgres (PGlite) → real insert → /api/stats games match.
// Remote (--url https://<preview>): preview never writes (sink disabled-nonprod); checks transport + 202.
// 412 touch and 1440 mouse/keyboard. Automation is excluded by design, so the "human" contexts mask
// navigator.webdriver and use a normal UA; a separate plain-automation context must send nothing.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { startServer } from './dev.mjs';

const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const remote = arg('--url');
process.env.STATS_TOKEN ||= 'local-e2e-token';
const srv = remote ? null : await startServer(0);
const U = remote || srv.url;
const HUMAN_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const res = []; let fails = 0;
const ok = (name, cond, extra) => { res.push({ name, pass: !!cond, ...(extra ? { extra } : {}) }); if (!cond) fails++; console.log(cond ? 'PASS' : 'FAIL', name, extra ? JSON.stringify(extra).slice(0, 300) : ''); };

const browser = await chromium.launch();
async function ctx(kind, human = true) {
  const opt = kind === 412 ? { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: 1440, height: 900 } };
  const c = await browser.newContext({ ...opt, ...(human ? { userAgent: HUMAN_UA } : {}) });
  await c.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: U });
  if (human) await c.addInitScript(() => Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false }));
  const p = await c.newPage();
  const posts = [];
  p.on('request', (r) => { if (r.url().endsWith('/api/events') && r.method() === 'POST') posts.push({ body: JSON.parse(r.postData() || '{}') }); });
  p.on('response', async (r) => { if (r.url().endsWith('/api/events')) { const x = posts.find((q) => !q.status); if (x) { x.status = r.status(); x.res = await r.json().catch(() => null); } } });
  const errors = []; p.on('pageerror', (e) => errors.push(String(e)));
  return { c, p, posts, errors };
}
const finish = (p) => p.evaluate(() => { const g = __mh.g, E = __mh.E; const P = E.POLICIES.safe(g.seed); while (!g.over) E.step(g, P(g) || {}); g.events.length = 0; __mh.finish(); });
const press = async (p, sel, touch) => (touch ? p.tap(sel) : p.click(sel));

async function play(kind) {
  const { c, p, posts, errors } = await ctx(kind);
  const touch = kind === 412;
  await p.goto(`${U}/ko/play/magnet-harbor/?qa=0&from=c`); await p.waitForFunction(() => window.__mh && window.__mh.ready && window.gev);
  ok(`${kind} no event before first input`, (await p.evaluate(() => (window.__trackLog || []).length)) === 0 && posts.length === 0);
  await press(p, '#b-start', touch); await finish(p);
  await press(p, '#b-link', touch); await p.waitForTimeout(150);
  await press(p, '#b-again', touch);
  if (touch) await p.tap('#b-start'); else { await p.focus('#b-start'); await p.keyboard.press('Enter'); }
  await finish(p);
  await p.evaluate(() => window.gev.flush()); await p.waitForTimeout(800);
  const log = await p.evaluate(() => window.__trackLog.map((e) => e.name + (e.end ? ':' + e.end : '') + (e.via ? ':' + e.via : '')));
  const sent = await p.evaluate(() => window.__gevSent.slice());
  const want = log.filter((n) => !n.startsWith('share_fail'));
  ok(`${kind} sent = trackLog minus share_fail`, JSON.stringify(sent.map((e) => e.name + (e.end ? ':' + e.end : '') + (e.via ? ':' + e.via : ''))) === JSON.stringify(want), { log, sent: sent.length });
  const keys = new Set(sent.flatMap(Object.keys));
  ok(`${kind} restart = play_again 1 + play_start 1 (2 runs → start 2, again 1)`, sent.filter((e) => e.name === 'play_start').length === 2 && sent.filter((e) => e.name === 'play_again').length === 1);
  ok(`${kind} only contract keys sent`, [...keys].every((k) => ['id', 'name', 'lang', 'g', 'from', 'end', 'via'].includes(k)), [...keys]);
  ok(`${kind} g=magnet lang=ko from=c`, sent.every((e) => e.g === 'magnet' && e.lang === 'ko' && e.from === 'c'));
  ok(`${kind} unique ids`, new Set(sent.map((e) => e.id)).size === sent.length);
  ok(`${kind} batches ≤20 and 202`, posts.length > 0 && posts.every((x) => x.body.events.length <= 20 && x.status === 202), posts.map((x) => [x.body.events.length, x.status, x.res]));
  ok(`${kind} no page errors`, errors.length === 0, errors);
  await c.close();
  return sent;
}

const sent412 = await play(412);
const sent1440 = await play(1440);

// qa=1 and plain automation: nothing leaves the browser
for (const [label, human, qs] of [['qa=1', true, '?qa=1'], ['automation(webdriver)', false, '?qa=0']]) {
  const { c, p, posts } = await ctx(1440, human);
  await p.goto(`${U}/ko/play/magnet-harbor/${qs}`); await p.waitForFunction(() => window.__mh && window.__mh.ready && window.gev);
  await p.click('#b-start'); await finish(p); await p.evaluate(() => window.gev.flush()); await p.waitForTimeout(500);
  ok(`${label}: 0 POST /api/events`, posts.length === 0 && (await p.evaluate(() => window.__trackLog.length)) > 0);
  await c.close();
}

// collection failure must not block the game; queue stays bounded
{
  const { c, p, errors } = await ctx(412);
  await c.route('**/api/events', (r) => r.abort());
  await p.goto(`${U}/ko/play/magnet-harbor/?qa=0`); await p.waitForFunction(() => window.__mh && window.__mh.ready && window.gev);
  for (let i = 0; i < 4; i++) { await p.tap(i ? '#b-again' : '#b-start'); if (i) await p.tap('#b-start'); await finish(p); }
  await p.evaluate(() => { for (let i = 0; i < 200; i++) window.gev('share_click', { g: 'magnet', from: 'direct', via: 'text' }); window.gev.flush(); });
  await p.waitForTimeout(800);
  const st = await p.evaluate(() => ({ phase: __mh.g.over, again: !document.querySelector('#b-again')?.hidden, sent: window.__gevSent.length }));
  ok('network down: game still finishes runs, nothing sent, no page errors', st.phase && st.sent === 0 && errors.length === 0, st);
  await c.close();
}

if (!remote) {
  const r = await fetch(U + '/api/stats', { headers: { 'x-stats-token': process.env.STATS_TOKEN } });
  const G = (await r.json()).games;
  const all = [...sent412, ...sent1440];
  const cnt = (n, f = () => true) => all.filter((e) => e.name === n && f(e)).length;
  const m = G.byGame.magnet;
  const want = { play_start: cnt('play_start'), play_again: cnt('play_again'), play_end: cnt('play_end'), share_click: cnt('share_click'), share_done: cnt('share_done') };
  ok('DB stats.games.magnet counts == events sent by 412+1440', JSON.stringify(m.counts) === JSON.stringify(want), { db: m.counts, want });
  ok('DB endReasons match', m.endReasons.time + m.endReasons.lives === want.play_end && m.endReasons.time === cnt('play_end', (e) => e.end === 'time'), m.endReasons);
  ok('DB rows exactly = unique sent (qa/automation/failed not stored)', (await srv.sql`SELECT count(*)::int AS c FROM game_events`)[0].c === all.length);
  ok('orbit/echo untouched (0) and sample flagged', G.byGame.orbit.counts.play_end === 0 && m.sample.label.startsWith('표본부족'), m.sample);
  ok('availableSince set', !!G.availableSince, G.availableSince);
}

await browser.close(); srv?.server.close();
const out = `reboot-evidence/events/e2e-${remote ? 'remote' : 'local'}.json`;
await mkdir('reboot-evidence/events', { recursive: true });
await writeFile(out, JSON.stringify({ at: new Date().toISOString(), base: remote ? remote.replace(/\/\/[^.]+/, '//<preview>') : 'local', pass: res.length - fails, fail: fails, res }, null, 2));
console.log(fails ? `FAILED ${fails}/${res.length}` : `ALL PASS ${res.length}`, '→', out);
process.exit(fails ? 1 : 0);
