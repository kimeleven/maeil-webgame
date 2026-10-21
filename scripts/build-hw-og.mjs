// Halloween OG set → public/og/hw/<same name>.png. middleware.js serves these instead of /og/* until 2026-11-01 KST.
// node scripts/build-hw-og.mjs
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { startServer } from './dev.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const LANGS = ['ko', 'en', 'ja', 'zh-hans', 'es', 'pt-br'];
const CODES = ['SPH', 'SPT', 'SIH', 'SIT', 'CPH', 'CPT', 'CIH', 'CIT'];
const OUT = ROOT + 'public/og/hw/';
mkdirSync(OUT, { recursive: true });
const { server, url: U } = await startServer(0);
const browser = await chromium.launch();
const buf = (d) => Buffer.from(d.split(',')[1], 'base64');
let n = 0;
try {
  const p = await browser.newPage();
  await p.goto(U + '/ko/?theme=off', { waitUntil: 'networkidle' });
  for (const l of LANGS) {
    const D = JSON.parse((await (await fetch(`${U}/${l}/`)).text()).match(/<script id="i18n" type="application\/json">([\s\S]*?)<\/script>/)[1]);
    await p.evaluate((d) => (window.__D = d), D);
    writeFileSync(OUT + `site-${l}.png`, buf(await p.evaluate(async () => (await (await import('/js/card.js')).ogSite(window.__D, true)).toDataURL()))); n++;
    writeFileSync(OUT + `challenge-${l}.png`, buf(await p.evaluate(async () => (await (await import('/js/card.js')).ogChallenge(window.__D, true)).toDataURL()))); n++;
    for (const c of CODES) { writeFileSync(OUT + `type-${c}-${l}.png`, buf(await p.evaluate(async (code) => (await (await import('/js/card.js')).ogType(window.__D, code, true)).toDataURL(), c))); n++; }
  }
  const shot = readFileSync(ROOT + 'public/img/shots/rush-1.png').toString('base64');
  writeFileSync(OUT + 'game.png', buf(await p.evaluate(async (b64) => { const m = await import('/js/card.js'); const im = await new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + b64; }); return m.ogGame(im, true).toDataURL(); }, shot))); n++;
  console.log(`halloween og: ${n} files → public/og/hw/`);
} finally { await browser.close(); server.close(); }
