// Magnet Harbor launch checks (t_45f1a325): public listing, SEO/OG, /c/mh share landing, 23 l10n fixes, launch events,
// gate-rush /c/ regression. node scripts/magnet-launch-check.mjs [baseUrl]  (default: local dev server)
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const ROOT = new URL('..', import.meta.url).pathname;
const LANGS = ['ko', 'en', 'ja', 'zh-hans', 'es', 'pt-br'];
let U = process.argv[2]; let srv = null;
if (!U) { const { startServer } = await import('./dev.mjs'); const s = await startServer(0); srv = s.server; U = s.url; }
const fails = []; const out = { base: U, at: new Date().toISOString(), checks: {} };
const ok = (k, v, d = '') => { out.checks[k] = { pass: !!v, d }; (v ? console.log : console.error)(`${v ? '✔' : '✘'} ${k}${d ? ' — ' + d : ''}`); if (!v) fails.push(k); };
const get = async (p) => { const r = await fetch(U + p, { redirect: 'manual' }); return { s: r.status, t: await r.text(), h: r.headers }; };

// 23 corrections (LOCALIZATION-REVIEW.md, t_c20e14c7)
const FIX = {
  ja: { lastFall: '直前の落下', guide: '緑のマス＝船上の着地点 · 影が緑のマスに来たら手を離そう' },
  'zh-hans': { lastFall: '上次掉落', comboRule: '连续 PERFECT 可获得 ×2、×3 得分；普通着陆或掉落会重置为 ×1' },
  es: { combo: 'Racha de PERFECT ×{n}' }, 'pt-br': { combo: 'Sequência de PERFECT ×{n}' },
};
for (const l of LANGS) {
  const p = await get(`/${l}/play/magnet-harbor/`);
  ok(`${l} page 200 indexable`, p.s === 200 && !/noindex/.test(p.t) && (/vercel\.app/.test(U) || !(p.h.get('x-robots-tag') || '').includes('noindex'))); // Vercel adds noindex header on every preview URL
  ok(`${l} canonical+hreflang`, p.t.includes(`rel="canonical" href="https://www.playtoday.cloud/${l}/play/magnet-harbor/"`) && (p.t.match(/hreflang=/g) || []).length >= 13);
  ok(`${l} no preview tag`, !p.t.includes('class="tag"'));
  const og = await fetch(`${U}/og/magnet-harbor-${l}.png`); ok(`${l} og image 200`, og.status === 200 && p.t.includes(`/og/magnet-harbor-${l}.png`));
  const T = JSON.parse(p.t.match(/<script id="mt" type="application\/json">([\s\S]*?)<\/script>/)[1]);
  for (const [k, v] of Object.entries(FIX[l] || {})) ok(`${l} l10n ${k}`, T[k] === v, T[k]);
  const lobby = await get(`/${l}/`); ok(`${l} lobby lists game`, lobby.t.includes(`href="/${l}/play/magnet-harbor/" data-game="magnet-harbor"`));
  const c = await get(`/${l}/c/mh-2026-10-23`);
  ok(`${l} /c/mh shell (noindex, magnet OG)`, c.s === 200 && /noindex/.test(c.t) && c.t.includes(`/og/magnet-harbor-${l}.png`) && !c.t.includes('challenge-'));
  const rc = await get(`/${l}/c/abc-1`); ok(`${l} gate-rush /c/ unchanged`, rc.s === 200 && rc.t.includes(`/og/challenge-${l}.png`) && !rc.t.includes('magnet-harbor-'));
}
const sm = (await get('/sitemap.xml')).t; ok('sitemap 103 / magnet 6', (sm.match(/<url>/g) || []).length === 103 && (sm.match(/play\/magnet-harbor\/<\/loc>/g) || []).length === 6);

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, permissions: ['clipboard-read', 'clipboard-write'] });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto(`${U}/ko/c/mh-qa-seed-1?x=1`); await p.waitForURL(/play\/magnet-harbor/);
ok('c → game redirect keeps seed + from=c', /\/ko\/play\/magnet-harbor\/\?from=c&seed=qa-seed-1$/.test(p.url()), p.url());
await p.goto(`${U}/ko/play/magnet-harbor/?seed=qa-seed-1&from=c&qa=1`); await p.waitForFunction(() => window.__mh && window.__mh.ready);
await p.click('#b-start');
await p.evaluate(() => { const g = __mh.g, E = __mh.E; const P = E.POLICIES.safe(g.seed); while (!g.over) E.step(g, P(g) || {}); g.events.length = 0; __mh.finish(); });
await p.click('#b-link'); await p.waitForTimeout(200);
const clip = await p.evaluate(() => navigator.clipboard.readText());
ok('share link is /ko/c/mh-<seed>', clip.includes(`${U}/ko/c/mh-qa-seed-1`), clip.slice(-60));
await p.click('#b-again'); await p.click('#b-start');
const L = await p.evaluate(() => window.__trackLog);
const names = L.map((e) => e.name + (e.end ? ':' + e.end : '') + (e.via ? ':' + e.via : ''));
ok('events: start, end, share try/success, again', JSON.stringify(names) === JSON.stringify(['play_start', 'play_end:time', 'share_click:link', 'share_done:link', 'play_again', 'play_start']), names.join(','));
ok('restart = play_again 1 + play_start 1 (t_287677ef)', names.filter((x) => x === 'play_again').length === 1 && names.filter((x) => x === 'play_start').length === 2, names.join(','));
ok('events tagged g=magnet from=c qa=1, no seed/score', L.every((e) => e.g === 'magnet' && e.from === 'c' && e.qa === '1' && !('seed' in e) && !('score' in e)));
await p.goto(`${U}/ko/play/magnet-harbor/?qa=0`); await p.waitForFunction(() => window.__mh && window.__mh.ready); await p.click('#b-start');
ok('qa=0 clears flag', await p.evaluate(() => window.__trackLog.every((e) => !e.qa && e.from === 'unknown')));
ok('no page errors', errs.length === 0, errs.join(' | '));
await b.close(); if (srv) srv.close();
mkdirSync(`${ROOT}reboot-evidence/magnet`, { recursive: true });
writeFileSync(`${ROOT}reboot-evidence/magnet/launch-${srv ? 'local' : 'remote'}.json`, JSON.stringify({ ...out, fails }, null, 1));
console.log(fails.length ? `FAIL ${fails.length}` : `ALL PASS ${Object.keys(out.checks).length}`); process.exit(fails.length ? 1 : 0);
