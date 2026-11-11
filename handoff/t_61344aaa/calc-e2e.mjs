import { startServer } from '/Users/shkim/AIAgents/workspace/maeil-reboot/scripts/dev.mjs';
import { chromium } from 'playwright';
const { server, url } = await startServer(0);
const b = await chromium.launch();
const out = [];
for (const w of [412, 1440]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  for (const s of ['', 'percent', 'date', 'dday', 'pyeong', 'age', 'wage', 'vat', 'discount', 'unit', 'interest']) {
    const t0 = Date.now(); const r = await p.goto(`${url}/calc/${s ? s + '/' : ''}`, { waitUntil: 'load' }); const ms = Date.now() - t0;
    await p.waitForTimeout(150);
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const main = s ? await p.textContent('#calc-main') : '';
    out.push(`${w} /calc/${s} ${r.status()} load=${ms}ms overflow=${ov} main=${main}`);
  }
  // 입력 즉시 반영 + URL 재현 + 이벤트
  await p.goto(`${url}/calc/percent/`); await p.evaluate(() => { window.__sent = []; });
  await p.fill('input[name=a]', '80'); await p.click('[data-mode=change]'); await p.fill('input[name=b]', '100');
  const m1 = await p.textContent('#calc-main'), u1 = p.url();
  await p.goto(u1); const m2 = await p.textContent('#calc-main');
  out.push(`${w} percent change: ${m1} url=${u1.replace(url, '')} reload=${m2}`);
  await p.goto(`${url}/calc/vat/?m=total&x=11000`); out.push(`${w} vat q: ${await p.textContent('#calc-main')} | ${await p.textContent('#calc-lines')}`);
  await p.goto(`${url}/calc/age/?b=2000-02-29&r=2026-11-11`); out.push(`${w} age: ${await p.textContent('#calc-main')}`);
  await p.goto(`${url}/calc/unit/`); await p.selectOption('select[name=c]', 'temp'); await p.fill('input[name=x]', '212'); out.push(`${w} unit temp: ${await p.textContent('#calc-main')}`);
  await p.goto(`${url}/ko/`); await p.waitForTimeout(200);
  out.push(`${w} home: ${(await p.$$eval('[data-calc-prev]', (a) => a.map((x) => x.textContent))).join(' | ')} overflow=${await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)}`);
  if (w === 1440) await p.screenshot({ path: 'handoff/t_61344aaa/calc-1440.png' });
  out.push(`${w} errors: ${JSON.stringify(errs)}`);
}
console.log(out.join('\n'));
await b.close(); server.close(); process.exit(0);
