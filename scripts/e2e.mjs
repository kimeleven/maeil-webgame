// Browser checks + asset generation (OG PNGs, screenshots) with Playwright against the local dev server.
// node scripts/e2e.mjs [--assets]
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { startServer } from './dev.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const LANGS = ['ko', 'en', 'ja', 'zh-hans', 'es', 'pt-br'];
const CODES = ['SPH', 'SPT', 'SIH', 'SIT', 'CPH', 'CPT', 'CIH', 'CIT'];
const assets = process.argv.includes('--assets');
const { server, url: U } = await startServer(0);
const browser = await chromium.launch();
const out = { checks: {}, errors: [] };
const ok = (k, v, info) => { out.checks[k] = !!v; console.log(v ? '✔' : '✖', k, info ?? ''); };
mkdirSync(ROOT + 'reboot-evidence/shots', { recursive: true });

async function page(ctx, path, vp) {
  const p = await ctx.newPage(); if (vp) await p.setViewportSize(vp);
  p.on('pageerror', (e) => out.errors.push(path + ' ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) out.errors.push(path + ' ' + m.text()); });
  await p.goto(U + path, { waitUntil: 'networkidle' });
  return p;
}
const dataURL = async (p, expr, arg) => Buffer.from((await p.evaluate(expr, arg)).split(',')[1], 'base64');

try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  // all pages load without errors, no raw keys
  let rawKey = 0;
  for (const l of LANGS) for (const s of ['', 'play/gate-rush/', 'me/play-character/', 'me/play-character/types/sph/', 'friends/chemistry/', 'about/', 'privacy/']) {
    const p = await page(ctx, `/${l}/${s}`);
    const t = await p.evaluate(() => document.body.innerText);
    if (/\b(game|quiz|chem|seo|cta|common)\.[a-z][A-Za-z]+\b|undefined|\{(stage|score|name|url|nick)\}/.test(t)) { rawKey++; out.errors.push(`raw key/undefined on /${l}/${s}`); }
    await p.close();
  }
  ok('pages_6x7_no_raw_keys', rawKey === 0);

  // game: start, steer, run a full stage at real speed-independent steps
  const g = await page(ctx, '/ko/play/gate-rush/?seed=e2e-seed');
  await g.click('.gmodal .btn');
  await g.waitForTimeout(1500);
  const fps = await g.evaluate(() => new Promise((r) => setTimeout(() => r(window.__gameFps || 0), 2500)));
  ok('game_running_fps', fps > 20, fps.toFixed(1) + ' (headless software render, dpr2)');
  await g.screenshot({ path: ROOT + 'reboot-evidence/shots/game-mobile.png' });
  const st = await g.evaluate(() => { const T = window.__gameTest; T.step(40); return T.state; });
  ok('game_stage_resolves', ['upgrade', 'lost'].includes(st.state), st.state + ' power ' + st.power);
  await g.waitForTimeout(1600);
  await g.screenshot({ path: ROOT + 'reboot-evidence/shots/game-end.png' });
  const modalText = await g.evaluate(() => document.querySelector('.gmodal')?.innerText || '');
  ok('game_end_modal', modalText.length > 10, modalText.slice(0, 60).replace(/\n/g, ' / '));
  // determinism across reload
  const c1 = await g.evaluate(() => JSON.stringify(window.__gameTest.course(3)));
  const g2 = await page(ctx, '/en/play/gate-rush/?seed=e2e-seed');
  ok('game_same_seed_same_course', c1 === (await g2.evaluate(() => JSON.stringify(window.__gameTest.course(3)))));
  // save card
  const card = await g2.evaluate(async () => { const m = await import('/js/card.js'); const D = JSON.parse(document.getElementById('i18n').textContent); const c = await m.rushCard(D, { stage: 7, score: 23456, mods: { armor: 2, magnet: 1, recruit: 1 }, history: [1, 2, 3, 4, 5, 6, 7].map((s) => ({ stage: s, power: 200 + s * 40, boss: 240 + s * 30, win: s < 7 })), zone: D.game.zones[6] }); return c.toDataURL(); });
  writeFileSync(ROOT + 'reboot-evidence/shots/card-rush-en.png', Buffer.from(card.split(',')[1], 'base64'));
  ok('card_rush', card.length > 20000);
  await g2.close(); await g.close();

  // quiz flow: no network during quiz (C5)
  const q = await page(ctx, '/ja/me/play-character/');
  const reqs = []; q.on('request', (r) => { if (r.url().includes('/api/')) reqs.push(r.url()); });
  await q.click('[data-start]');
  for (let i = 0; i < 10; i++) await q.click(i % 3 ? '[data-a="a"]' : '[data-a="b"]');
  await q.waitForSelector('.result');
  ok('quiz_no_network', reqs.length === 0, reqs.join(','));
  const qr = await q.evaluate(() => JSON.parse(localStorage.getItem('play-character')));
  ok('quiz_result', CODES.includes(qr.code), qr.code);
  await q.screenshot({ path: ROOT + 'reboot-evidence/shots/quiz-result-ja.png', fullPage: true });
  await q.close();

  // chemistry: owner creates → friend (separate context) joins → owner sees member
  const own = await page(ctx, '/ko/friends/chemistry/');
  await own.fill('[data-nick]', '민지'); await own.click('[data-create]');
  await own.waitForSelector('code.sel');
  const link = await own.textContent('code.sel');
  ok('chem_invite_link', /\/ko\/i\/[A-Za-z0-9_-]{22}$/.test(link), link);
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const fr = await page(ctx2, new URL(link).pathname);
  const hidden = await fr.evaluate(() => document.body.innerText);
  ok('chem_invitee_sees_nick_not_type', hidden.includes('민지'));
  await fr.click('[data-go]');
  for (let i = 0; i < 10; i++) await fr.click('[data-a="b"]');
  await fr.fill('[data-nick]', '준'); await fr.click('[data-join]');
  await fr.waitForSelector('.pair');
  await fr.screenshot({ path: ROOT + 'reboot-evidence/shots/chem-result-ko.png', fullPage: true });
  ok('chem_result_shown', (await fr.textContent('h2')).length > 1, await fr.textContent('h2'));
  const ownRoom = await page(ctx, new URL(link).pathname);
  await ownRoom.waitForSelector('.members li');
  ok('chem_owner_sees_member', (await ownRoom.textContent('.members')).includes('준'));
  await ownRoom.screenshot({ path: ROOT + 'reboot-evidence/shots/chem-owner-ko.png', fullPage: true });
  await ctx2.close();

  // desktop lobby screenshot
  const dctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  for (const l of ['ko', 'en']) { const p = await page(dctx, `/${l}/`); await p.screenshot({ path: ROOT + `reboot-evidence/shots/lobby-${l}-desktop.png` }); await p.close(); }
  const pg = await page(dctx, '/ko/play/gate-rush/'); await pg.screenshot({ path: ROOT + 'reboot-evidence/shots/game-ko-desktop.png' }); await pg.close();

  if (assets) {
    mkdirSync(ROOT + 'public/og', { recursive: true }); mkdirSync(ROOT + 'public/img/shots', { recursive: true });
    const ap = await page(dctx, '/ko/');
    for (const l of LANGS) {
      const D = JSON.parse(await (await fetch(`${U}/${l}/`)).text().then((h) => h.match(/<script id="i18n" type="application\/json">([\s\S]*?)<\/script>/)[1]));
      await ap.evaluate((d) => (window.__D = d), D);
      writeFileSync(ROOT + `public/og/site-${l}.png`, await dataURL(ap, async () => (await (await import('/js/card.js')).ogSite(window.__D)).toDataURL()));
      writeFileSync(ROOT + `public/img/endcard-${l}.png`, await dataURL(ap, async () => (await (await import('/js/card.js')).endcard(window.__D)).toDataURL()));
      for (const c of CODES) writeFileSync(ROOT + `public/og/type-${c}-${l}.png`, await dataURL(ap, async (code) => (await (await import('/js/card.js')).ogType(window.__D, code)).toDataURL(), c));
    }
    // game screenshots (language-free capture mode) → page shots + OG
    const cp = await browser.newPage({ viewport: { width: 540, height: 960 } });
    await cp.goto(U + '/en/play/gate-rush/?capture=1&seed=shot', { waitUntil: 'networkidle' });
    await cp.waitForTimeout(3600);
    const shot = (await cp.screenshot({ path: ROOT + 'public/img/shots/rush-1.png' })).toString('base64');
    await cp.evaluate(() => window.__gameTest.step(14)); await cp.waitForTimeout(2200);
    await cp.screenshot({ path: ROOT + 'public/img/shots/rush-2.png' });
    writeFileSync(ROOT + 'public/og/game.png', await dataURL(cp, async (b64) => { const m = await import('/js/card.js'); const im = await new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + b64; }); return m.ogGame(im).toDataURL(); }, shot));
    console.log('assets: og site×6, type×48, endcard×6, game×1, shots×2');
  }
} catch (e) { out.errors.push('FATAL ' + e.stack); console.error(e); }
ok('no_console_errors', out.errors.length === 0, out.errors.slice(0, 8).join('\n'));
writeFileSync(ROOT + 'reboot-evidence/e2e.json', JSON.stringify(out, null, 2));
await browser.close(); server.close();
process.exit(Object.values(out.checks).every(Boolean) ? 0 : 1);
