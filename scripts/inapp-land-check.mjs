// 1121-09: challenge_land fires from in-app browser UAs (Kakao/Line/Instagram) in 6 langs. Local server only.
import { chromium } from 'playwright';
import { startServer } from './dev.mjs';
const LANGS = ['ko', 'en', 'ja', 'zh-hans', 'es', 'pt-br'];
const UAS = {
  kakao: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.4.0',
  line: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Line/13.0.0',
  instagram: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 300.0.0.0',
};
const { server, url } = await startServer(0);
const browser = await chromium.launch({ channel: 'chrome' });
let fail = 0; const rows = [];
for (const [n, ua] of Object.entries(UAS)) for (const l of LANGS) {
  const ctx = await browser.newContext({ userAgent: ua, viewport: { width: 390, height: 800 } });
  await ctx.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
  const p = await ctx.newPage(); const evs = [];
  p.on('request', (r) => { if (r.url().includes('/api/events')) { try { evs.push(...JSON.parse(r.postData() || '{}').events.map((e) => e.name)); } catch {} } });
  await p.goto(`${url}/${l}/c/seed-1?vs=x`); await p.waitForTimeout(4200);
  const sw = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const good = evs.includes('challenge_land') && sw <= 0; if (!good) fail++;
  rows.push(`| ${n} | ${l} | ${evs.includes('challenge_land') ? 'fired' : 'MISSING'} | hscroll ${sw} |`);
  await ctx.close();
}
await browser.close(); server.close();
console.log('| UA | lang | challenge_land | 390px |\n|---|---|---|---|\n' + rows.join('\n') + `\n\nFAIL ${fail}/18`);
process.exit(fail ? 1 : 0);
