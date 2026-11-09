// OCI 호스트 스모크 (t_a6a9cd42): 모바일 화면에서 주요 게임 페이지 로드·콘솔 오류·실패 요청·이벤트 POST 확인
// node deploy/oci/smoke.mjs <base> [outdir]
import { chromium, devices } from 'playwright';
import { mkdirSync } from 'node:fs';
const B = process.argv[2]; const OUT = process.argv[3] || 'reboot-evidence/oci';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'] });
const pages = ['/ko/', '/ko/webgame/', '/ko/play/commute/', '/ko/play/echo-courier/', '/en/', '/ko/c/mh-12345'];
let bad = 0;
for (const p of pages) {
  const page = await ctx.newPage();
  const errs = []; const fails = []; const apis = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errs.push('console: ' + m.text()));
  page.on('response', (r) => { const u = new URL(r.url()); if (u.origin === new URL(B).origin) { if (r.status() >= 400) fails.push(r.status() + ' ' + u.pathname); if (u.pathname.startsWith('/api/')) apis.push(r.request().method() + ' ' + u.pathname + ' ' + r.status()); } });
  const res = await page.goto(B + p, { waitUntil: 'networkidle' });
  // 게임 시작 시도: 화면 가운데 탭 몇 번
  const vp = page.viewportSize();
  for (let i = 0; i < 4; i++) { await page.mouse.click(vp.width / 2, vp.height / 2); await page.waitForTimeout(400); }
  await page.waitForTimeout(1500);
  const name = p.replace(/[^a-z0-9]+/gi, '_');
  await page.screenshot({ path: `${OUT}/${name}.png` });
  const hasCanvas = await page.locator('canvas').count();
  const ok = res.status() === 200 && !errs.length && !fails.length;
  if (!ok) bad++;
  console.log(ok ? 'PASS' : 'FAIL', p, res.status(), 'canvas=' + hasCanvas, 'api=[' + apis.join(', ') + ']', errs.slice(0, 3).join(' | '), fails.slice(0, 5).join(' | '));
  await page.close();
}
await browser.close();
process.exit(bad ? 1 : 0);
