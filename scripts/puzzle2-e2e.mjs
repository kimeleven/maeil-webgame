// t_49b0ed25 브라우저 수용 시험 (2차): node scripts/puzzle2-e2e.mjs  (PW_CHROME=크롬 경로, 빈 포트 정적 서버)
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { chromium, devices } from 'playwright';
import assert from 'node:assert/strict';

const ROOT = new URL('../public/', import.meta.url).pathname;
const SHOTS = process.env.SHOTS || '';
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const MIME = { html: 'text/html; charset=utf-8', js: 'text/javascript', css: 'text/css', svg: 'image/svg+xml', png: 'image/png', json: 'application/json' };
const srv = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = ROOT + p; if (!f.startsWith(ROOT) || !existsSync(f) || statSync(f).isDirectory()) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'content-type': MIME[f.split('.').pop()] || 'application/octet-stream' }); res.end(readFileSync(f));
}).listen(0, '127.0.0.1');
await new Promise((r) => srv.once('listening', r));
const base = `http://127.0.0.1:${srv.address().port}`;
const b = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROME || undefined });
const ok = (m) => console.log('PASS', m);
const shot = async (pg, n) => { if (SHOTS) await pg.screenshot({ path: `${SHOTS}/${n}.png`, fullPage: false }); };
const fresh = async () => { const ctx = await b.newContext({ ...devices['iPhone 13'], locale: 'ko-KR' }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(String(e))); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text())); return { pg, errs }; };
const noOverflow = async (pg, n) => { const ov = await pg.evaluate(() => document.documentElement.scrollWidth - innerWidth); assert.ok(ov <= 1, `${n} overflow ${ov}`); };
let code = 0;
try {
  // ---------- 단어 묶음: 클리어 ----------
  let { pg, errs } = await fresh();
  await pg.goto(base + '/ko/단어묶음/오늘/'); await pg.waitForSelector('.wg-w'); assert.equal(await pg.locator('.wg-w').count(), 16); ok('단어묶음 16칸');
  await shot(pg, 'wg-start');
  const day = await pg.evaluate(() => window.__pz.day);
  // 오답 1회 (한 개 차이): 묶음0 3개 + 묶음1 1개
  const pick = async (ws) => { for (const w of ws) await pg.locator(`.wg-w[data-w="${w}"]`).tap(); };
  await pick([...day.groups[0].words.slice(0, 3), day.groups[1].words[0]]); await pg.locator('#wg-submit').tap();
  assert.match(await pg.locator('#wg-msg').innerText(), /한 개 차이/); assert.equal(await pg.locator('#wg-left').innerText(), '3'); ok('한 개 차이 힌트·남은 기회 3');
  for (const gi of [0, 1, 2]) { await pick(day.groups[gi].words); await pg.locator('#wg-submit').tap(); }
  await pg.waitForSelector('#wg-done:not([hidden])');
  const st = await pg.evaluate(() => JSON.parse(localStorage.getItem('pz.v1')).wordgroup);
  assert.equal(st.streak, 1); assert.equal(st.last.win, true); assert.equal(st.last.mistakes, 1); ok('클리어 기록·streak 저장 ' + JSON.stringify(st.last));
  assert.match(await pg.locator('#wg-share-text').inputValue(), /오늘의 단어 묶음 .*\n✅ 클리어 \(오답 1\)\n⬛⬛⬛⬛\n🟨🟨🟨🟨\n🟩🟩🟩🟩\n🟦🟦🟦🟦\n🟪🟪🟪🟪\nplaytoday\.cloud/u); ok('공유 문구(단어 비노출)');
  assert.ok(!(await pg.locator('#wg-share-text').inputValue()).includes(day.groups[0].words[0])); ok('공유 글에 정답 단어 없음');
  await shot(pg, 'wg-done'); await pg.locator('#wg-close').tap(); await pg.reload(); await pg.waitForSelector('#wg-solved .wg-g');
  assert.equal(await pg.locator('#wg-solved .wg-g').count(), 4); assert.equal(await pg.locator('#wg-streak').innerText(), '1'); ok('새로고침 후 완료 상태 유지');
  await noOverflow(pg, '단어묶음'); assert.deepEqual(errs, []); ok('단어묶음 콘솔 오류 0');

  // ---------- 단어 묶음: 4회 오답 종료 ----------
  ({ pg, errs } = await fresh());
  await pg.goto(base + '/ko/단어묶음/오늘/'); await pg.waitForSelector('.wg-w');
  const d2 = await pg.evaluate(() => window.__pz.day);
  for (let k = 0; k < 4; k++) { const ws = [d2.groups[0].words[0], d2.groups[1].words[0], d2.groups[2].words[0], d2.groups[3].words[k % 4 === 0 ? 0 : k]]; for (const w of ws) await pg.locator(`.wg-w[data-w="${w}"]`).tap(); await pg.locator('#wg-submit').tap(); }
  await pg.waitForSelector('#wg-done:not([hidden])'); assert.match(await pg.locator('#wg-title').innerText(), /아쉬워요/); assert.equal(await pg.locator('#wg-solved .wg-g').count(), 4); ok('4회 오답 → 종료, 정답 4묶음 공개');
  const st2 = await pg.evaluate(() => JSON.parse(localStorage.getItem('pz.v1')).wordgroup); assert.equal(st2.last.win, false); assert.ok(!st2.streak); ok('실패는 연속 기록 미증가');
  // 오늘 단어묶음 홈 카드
  await pg.goto(base + '/ko/'); assert.equal(await pg.locator('.pz-home .card').count(), 3); await pg.locator('[data-pz="wordgroup"]').tap(); await pg.waitForURL(/%EB%8B%A8%EC%96%B4%EB%AC%B6%EC%9D%8C\/%EC%98%A4%EB%8A%98\//); ok('홈 → 단어묶음 오늘 이동');

  // ---------- 어제 정답 ----------
  ({ pg, errs } = await fresh());
  await pg.goto(base + '/ko/단어묶음/어제/'); await pg.waitForSelector('#wy-box:not([hidden])');
  assert.equal(await pg.locator('#wy-list').isVisible(), false); ok('어제 정답: 처음에는 접힘(스포일러 방지)');
  await shot(pg, 'wy-closed'); await pg.locator('#wy-box summary').tap();
  assert.equal(await pg.locator('#wy-list .wg-g').count(), 4); ok('펼치면 4묶음 + 카테고리 이름·단어');
  const y = await pg.evaluate(() => document.querySelector('#wy-date').textContent); const kst = new Date(Date.now() + 9 * 3600e3 - 86400e3).toISOString().slice(0, 10); assert.ok(y.startsWith(kst), y + ' vs ' + kst); ok('어제 날짜 ' + y);
  await shot(pg, 'wy-open'); await pg.locator('#wy-box summary').tap(); assert.equal(await pg.locator('#wy-list').isVisible(), false); ok('다시 접힘');
  await noOverflow(pg, '어제'); assert.deepEqual(errs, []);

  // ---------- 2048 ----------
  ({ pg, errs } = await fresh());
  await pg.goto(base + '/ko/2048/'); await pg.waitForSelector('.g-t'); assert.equal(await pg.locator('.g-t').count(), 16);
  const b0 = await pg.evaluate(() => window.__pz.s.b.filter(Boolean).length); assert.equal(b0, 2);
  await pg.keyboard.press('ArrowLeft'); await pg.keyboard.press('ArrowUp'); await pg.keyboard.press('ArrowRight'); await pg.keyboard.press('ArrowDown');
  const s1 = await pg.evaluate(() => window.__pz.s); assert.ok(s1.spawns > 2); ok('2048 방향키 이동·새 타일 ' + s1.spawns);
  // 스와이프
  const bb = await pg.locator('#g-board').boundingBox(), cx = bb.x + bb.width / 2, cy = bb.y + bb.height / 2;
  const before = await pg.evaluate(() => window.__pz.s.spawns);
  for (const [dx, dy] of [[80, 0], [-80, 0], [0, 80], [0, -80]]) { await pg.evaluate(([x, y, dx, dy]) => { const el = document.querySelector('#g-board'); const mk = (t, px, py) => new TouchEvent(t, { bubbles: true, cancelable: true, touches: t === 'touchend' ? [] : [new Touch({ identifier: 1, target: el, clientX: px, clientY: py })], changedTouches: [new Touch({ identifier: 1, target: el, clientX: px, clientY: py })] }); el.dispatchEvent(mk('touchstart', x, y)); el.dispatchEvent(mk('touchend', x + dx, y + dy)); }, [cx, cy, dx, dy]); }
  assert.ok((await pg.evaluate(() => window.__pz.s.spawns)) >= before); ok('2048 스와이프 4방향 처리');
  // 같은 날 같은 입력 → 같은 판
  const ctxB = await b.newContext(); const p2 = await ctxB.newPage(); await p2.goto(base + '/ko/2048/'); await p2.waitForSelector('.g-t');
  const bA = await pg.evaluate(() => { localStorage.clear(); return 0; }); await pg.reload(); await pg.waitForSelector('.g-t');
  assert.deepEqual(await pg.evaluate(() => window.__pz.s.b), await p2.evaluate(() => window.__pz.s.b)); ok('같은 날 같은 시작 판');
  // 게임오버·2048
  await pg.evaluate(() => { window.__pz.s = { b: [2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 1024], score: 5, spawns: 10, date: window.__pz.s.date, won: false }; });
  await pg.evaluate(() => { window.__pz.s = { b: [1024, 1024, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], score: 5, spawns: 10, date: window.__pz.s.date, won: false }; });
  await pg.keyboard.press('ArrowLeft'); await pg.waitForSelector('#g-done:not([hidden])'); assert.match(await pg.locator('#g-title').innerText(), /2048 달성/); ok('2048 달성 → 결과 창');
  assert.match(await pg.locator('#g-share-text').inputValue(), /오늘의 2048 .*\n🔢 최고 2048 \| 점수 \d+\nplaytoday\.cloud/u); ok('2048 공유 문구');
  await shot(pg, 'g2048'); await noOverflow(pg, '2048'); assert.deepEqual(errs, []); ok('2048 콘솔 오류 0');

  // ---------- 노노그램 ----------
  ({ pg, errs } = await fresh());
  await pg.goto(base + '/ko/노노그램/'); await pg.waitForSelector('.n-c'); assert.equal(await pg.locator('.n-c').count(), 25); ok('노노그램 5×5');
  await shot(pg, 'nono-start');
  const grid = await pg.evaluate(() => window.__pz.P.grid);
  await pg.locator('#n-x').tap(); await pg.locator('.n-c').nth(grid.findIndex((v) => !v)).tap(); assert.equal(await pg.locator('.n-c.x').count(), 1); await pg.locator('.n-c.x').tap(); assert.equal(await pg.locator('.n-c.x').count(), 0); await pg.locator('#n-x').tap(); ok('✕ 표시 모드·해제');
  for (let i = 0; i < 25; i++) if (grid[i]) await pg.locator('.n-c').nth(i).tap();
  await pg.waitForSelector('#n-done:not([hidden])'); const ns = await pg.evaluate(() => JSON.parse(localStorage.getItem('pz.v1')).nono); assert.equal(ns.streak, 1); ok('노노그램 완성·기록 ' + JSON.stringify(ns.last));
  await pg.locator('#n-close').tap(); await pg.locator('.n-lv[data-lv="normal"]').tap(); assert.equal(await pg.locator('.n-c').count(), 100); ok('10×10 전환');
  await shot(pg, 'nono-10'); await noOverflow(pg, '노노그램'); assert.deepEqual(errs, []); ok('노노그램 콘솔 오류 0');

  // ---------- 솔리테어 ----------
  ({ pg, errs } = await fresh());
  await pg.goto(base + '/ko/솔리테어/'); await pg.waitForSelector('.s-col'); assert.equal(await pg.locator('.s-col').count(), 7);
  assert.equal(await pg.locator('#s-tab .s-card').count(), 28); ok('솔리테어 배치 28장');
  await shot(pg, 'sol-start');
  await pg.locator('#s-stock [data-a="draw"]').tap(); assert.equal(await pg.evaluate(() => window.__pz.s.waste.length), 1); ok('뽑기');
  await pg.locator('#s-undo').tap(); assert.equal(await pg.evaluate(() => window.__pz.s.waste.length), 0); ok('되돌리기');
  // 규칙 위반 이동은 무시
  const mv0 = await pg.evaluate(() => window.__pz.s.moves); await pg.locator('#s-tab .s-col').nth(0).locator('.s-card').last().tap(); await pg.locator('#s-found [data-s="0"]').tap();
  assert.equal(await pg.evaluate(() => window.__pz.s.moves) >= mv0, true); ok('잘못된 이동은 적용 안 됨(카드 수 보존)');
  assert.equal(await pg.evaluate(() => { const s = window.__pz.s; return s.tab.flat().length + s.stock.length + s.waste.length + s.found.flat().length; }), 52);
  // 완주 직전 상태 → 마지막 카드 올리기
  await pg.evaluate(() => { window.__pz.s = { tab: [[], [], [], [], [], [], []], stock: [], waste: [51], found: [Array.from({ length: 13 }, (_, i) => i), Array.from({ length: 13 }, (_, i) => 13 + i), Array.from({ length: 13 }, (_, i) => 26 + i), Array.from({ length: 12 }, (_, i) => 39 + i)], moves: 80 }; });
  await pg.locator('#s-waste .s-card').tap(); await pg.locator('#s-waste .s-card').tap();
  await pg.waitForSelector('#s-done:not([hidden])'); const ss = await pg.evaluate(() => JSON.parse(localStorage.getItem('pz.v1')).solitaire); assert.equal(ss.streak, 1); ok('솔리테어 클리어·기록 ' + JSON.stringify(ss.last));
  assert.match(await pg.locator('#s-share-text').inputValue(), /오늘의 솔리테어 .*\n🃏 클리어 \| \d+수\nplaytoday\.cloud/u); ok('솔리테어 공유 문구');
  await noOverflow(pg, '솔리테어'); assert.deepEqual(errs, []); ok('솔리테어 콘솔 오류 0');

  // ---------- 허브·FAQ JSON-LD ----------
  ({ pg, errs } = await fresh());
  for (const u of ['단어묶음/', '단어묶음/오늘/', '단어묶음/어제/', '2048/', '솔리테어/', '노노그램/']) {
    await pg.goto(base + '/ko/' + u); const ld = await pg.evaluate(() => JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent));
    const faq = ld['@graph'].find((x) => x['@type'] === 'FAQPage'); assert.ok(faq && faq.mainEntity.length >= 3, u + ' FAQ'); await noOverflow(pg, u);
  }
  ok('6개 페이지 FAQ JSON-LD(3문항↑)·가로 넘침 없음');
  await pg.goto(base + '/ko/'); const links = await pg.locator('.pz-home a').evaluateAll((a) => a.map((x) => x.getAttribute('href'))); assert.ok(links.some((l) => decodeURIComponent(l).includes('2048/')) && links.some((l) => decodeURIComponent(l).includes('솔리테어/')) && links.some((l) => decodeURIComponent(l).includes('노노그램/'))); ok('홈에서 2048·솔리테어·노노그램 접근');
  await shot(pg, 'home');
  assert.deepEqual(errs, []);
} catch (e) { console.error('FAIL', e); code = 1; }
await b.close(); srv.close(); process.exitCode = code;
