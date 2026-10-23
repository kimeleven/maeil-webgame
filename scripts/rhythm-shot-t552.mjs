// t_552009cf after-captures: PO-shaped session (1 on-beat hit, then idle → 5 misses) at 412 and 1440. Local only.
import { chromium } from 'playwright';
const { startServer } = await import('./dev.mjs'); await startServer(5198);
const EV = new URL('../reboot-evidence/rhythm/t_552009cf/', import.meta.url).pathname;
const b = await chromium.launch();
for (const [w, h, l] of [[412, 915, 'ko'], [1440, 1000, 'ko'], [412, 915, 'en']]) {
  const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage();
  await p.goto(`http://localhost:5198/${l}/play/rhythm-garden/?seed=po`); await p.waitForFunction(() => window.__rg && __rg.ready);
  await p.click('#b-start');
  // one key tap 32 ms early on the first seed, then nothing
  await p.evaluate(() => new Promise((r) => { const t = __rg.g.chart.beats[0].t - 32; const f = () => { if (__rg.act(performance.now()) >= t) { document.body.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })); document.body.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true })); r(); } else requestAnimationFrame(f); }; f(); }));
  // mid-play capture of the wilt cue (icon + short label)
  await p.waitForFunction(() => __rg.g.wilts >= 1); await p.waitForTimeout(150); await p.screenshot({ path: `${EV}after-play-wilt-${l}-${w}.png` });
  await p.waitForSelector('#res:not([hidden])', { timeout: 20000 });
  const s = await p.evaluate(() => ({ chips: [...document.querySelectorAll('#r-czl i')].map((i) => i.textContent), tip: document.getElementById('r-tipt').textContent, accn: document.getElementById('r-accn').textContent, mean: document.getElementById('r-mean').textContent, n: __rg.E.accuracy(__rg.g).n }));
  console.log(l, w, JSON.stringify(s));
  await p.screenshot({ path: `${EV}after-result-${l}-${w}.png` });
}
await b.close(); process.exit(0);
