import { chromium } from 'playwright';
const R = '/Users/shkim/AIAgents/workspace/maeil-orbit/';
const { startServer } = await import(R + 'scripts/dev.mjs'); await startServer(5193);
const EV = process.argv[2];
const b = await chromium.launch(); const out = [];
for (const l of ['ko', 'en', 'ja', 'zh-hans', 'es', 'pt-br']) for (const w of [360, 412, 1440]) {
  const c = await b.newContext({ viewport: { width: w, height: w > 1000 ? 1000 : 780 }, hasTouch: w < 1000, isMobile: w < 1000 }); const p = await c.newPage();
  await p.goto(`http://localhost:5193/${l}/play/orbit-switch/?seed=po-review`); await p.waitForFunction(() => window.__orbit && __orbit.ready);
  const r = await p.evaluate(() => { const pn = document.querySelector('#ready .panel').getBoundingClientRect(); return { sw: document.documentElement.scrollWidth, iw: innerWidth, panelIn: pn.left >= 0 && pn.right <= innerWidth && pn.top >= 0 && pn.bottom <= innerHeight, how: document.getElementById('r-how').textContent }; });
  if (w === 360) await p.screenshot({ path: `${EV}/ready-360-${l}.png` });
  out.push([l, w, r.sw <= r.iw && r.panelIn ? 'ok' : 'BAD', JSON.stringify(r)]); await c.close();
}
console.log(out.map((x) => x.join(' ')).join('\n')); await b.close(); process.exit(0);
