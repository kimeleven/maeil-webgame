// t_2d0c7a9f 브라우저 수용 시험: node scripts/puzzle-e2e.mjs  (PW_CHROME=크롬 경로, 빈 포트에 정적 서버를 띄움)
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { chromium, devices } from 'playwright';
import assert from 'node:assert/strict';

const ROOT = new URL('../public/', import.meta.url).pathname;
const MIME = { html: 'text/html; charset=utf-8', js: 'text/javascript', css: 'text/css', svg: 'image/svg+xml', png: 'image/png', json: 'application/json' };
const srv = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = ROOT + p; if (!f.startsWith(ROOT) || !existsSync(f) || statSync(f).isDirectory()) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'content-type': MIME[f.split('.').pop()] || 'application/octet-stream' }); res.end(readFileSync(f));
}).listen(0, '127.0.0.1');
await new Promise((r) => srv.once('listening', r));
const base = `http://127.0.0.1:${srv.address().port}`;
const b = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROME || undefined });
const out = [];
const ok = (m) => { out.push('PASS ' + m); console.log('PASS', m); };
try {
  // ---------- 홈 ----------
  const ctx = await b.newContext({ ...devices['iPhone 13'], locale: 'ko-KR' });
  const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(String(e))); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await pg.goto(base + '/ko/'); await pg.waitForLoadState('networkidle');
  assert.equal(await pg.locator('.pz-home .card').count(), 3); ok('홈 퍼즐 카드 3종');
  const y = await pg.locator('.pz-home').evaluate((e) => e.getBoundingClientRect().top), y2 = await pg.locator('[data-game="magnet-harbor"]').evaluate((e) => e.getBoundingClientRect().top);
  assert.ok(y < y2); ok('홈: 퍼즐 카드가 기존 게임보다 위');
  await pg.locator('[data-pz="sudoku"]').click(); await pg.waitForURL(/%EC%8A%A4%EB%8F%84%EC%BF%A0\/%EC%98%A4%EB%8A%98\//); ok('홈 → 스도쿠 오늘 이동');

  // ---------- 스도쿠 ----------
  await pg.waitForSelector('#sd-board .sd-c'); assert.equal(await pg.locator('.sd-c').count(), 81);
  const info = await pg.evaluate(() => ({ date: window.__pz.today, lv: window.__pz.level, giv: window.__pz.v.filter(Boolean).length }));
  console.log(info); ok('스도쿠 열림 ' + info.date + ' ' + info.lv + ' 단서 ' + info.giv);
  // 풀이: solution 으로 모든 칸을 UI 클릭+숫자패드로 채움
  const sol = await pg.evaluate(() => window.__pz.solution), v0 = await pg.evaluate(() => window.__pz.v.slice());
  for (let i = 0; i < 81; i++) if (!v0[i]) { await pg.locator('.sd-c').nth(i).click(); await pg.locator(`.sd-n[data-n="${sol[i]}"]`).click(); }
  await pg.waitForSelector('#sd-done:not([hidden])');
  const store = await pg.evaluate(() => JSON.parse(localStorage.getItem('pz.v1')).sudoku);
  assert.equal(store.streak, 1); assert.ok(store.last.time >= 0 && store.last.hints === 0 && store.last.date === info.date);
  ok('스도쿠 완료: 시간·힌트·streak 저장 ' + JSON.stringify(store.last));
  assert.match(await pg.locator('#sd-share-text').inputValue(), /오늘의 스도쿠 .*\n⏱️ \d+:\d\d \| 힌트 0\n🟩{5}\nplaytoday\.cloud/u); ok('공유 문구 생성');
  await pg.locator('#sd-close').click(); await pg.reload(); await pg.waitForSelector('#sd-board .sd-c');
  assert.match(await pg.locator('#sd-last').innerText(), /오늘 기록 \d+:\d\d/); assert.equal(await pg.locator('#sd-streak').innerText(), '1'); ok('새로고침 후 기록·연속 1일 유지');
  // 날짜 시드: 같은 날 새 컨텍스트는 같은 판
  const ctx2 = await b.newContext(); const p2 = await ctx2.newPage(); await p2.goto(base + '/ko/스도쿠/오늘/?level=normal'); await p2.waitForSelector('.sd-c');
  const a = await p2.evaluate(() => window.__pz.v.join('')), a2 = (await pg.evaluate(() => window.__pz.solution)).length; assert.ok(a.length === 81 && a2 === 81);
  const p3 = await ctx2.newPage(); await p3.goto(base + '/ko/스도쿠/오늘/?level=normal'); await p3.waitForSelector('.sd-c'); assert.equal(await p3.evaluate(() => window.__pz.v.join('')), a); ok('같은 날 같은 판(고정)');
  const p4 = await ctx2.newPage(); await p4.goto(base + '/ko/스도쿠/오늘/?level=normal&date=2026-11-13'); await p4.waitForSelector('.sd-c'); assert.notEqual(await p4.evaluate(() => window.__pz.v.join('')), a); ok('다른 날짜는 다른 판');
  // 다음날 streak: localStorage 에 어제 기록을 심고 오늘 풀면 +1, 이틀 전이면 1로 리셋
  for (const [last, streak, expect] of [[-1, 5, 6], [-2, 5, 1]]) {
    const c = await b.newContext(); const q = await c.newPage(); await q.goto(base + '/ko/스도쿠/오늘/?level=easy'); await q.waitForSelector('.sd-c');
    const today = await q.evaluate(() => window.__pz.today);
    const d = new Date(Date.parse(today + 'T00:00:00Z') + last * 86400000).toISOString().slice(0, 10);
    await q.evaluate(([d, s]) => localStorage.setItem('pz.v1', JSON.stringify({ sudoku: { streak: s, lastPlayed: d, best: s } })), [d, streak]); await q.reload(); await q.waitForSelector('.sd-c');
    assert.equal(await q.locator('#sd-streak').innerText(), last === -1 ? '5' : '0');
    const s2 = await q.evaluate(() => window.__pz.solution), v2 = await q.evaluate(() => window.__pz.v.slice());
    for (let i = 0; i < 81; i++) if (!v2[i]) { await q.locator('.sd-c').nth(i).click(); await q.locator(`.sd-n[data-n="${s2[i]}"]`).click(); }
    await q.waitForSelector('#sd-done:not([hidden])');
    assert.equal((await q.evaluate(() => JSON.parse(localStorage.getItem('pz.v1')).sudoku.streak)), expect); ok(`연속 ${last === -1 ? '어제→오늘 5→6 증가' : '이틀 공백 → 1 리셋(표시 0)'}`); await c.close();
  }
  // 힌트
  const c5 = await b.newContext(); const h = await c5.newPage(); await h.goto(base + '/ko/스도쿠/오늘/?level=hard'); await h.waitForSelector('.sd-c'); await h.locator('#sd-hint').click(); await h.locator('#sd-hint').click();
  assert.equal(await h.locator('#sd-hints').innerText(), '2'); ok('힌트 횟수 집계');

  // ---------- 지뢰찾기 (중급, 모바일 터치) ----------
  const mp = await (await b.newContext({ ...devices['iPhone 13'], hasTouch: true })).newPage(); const merr = []; mp.on('pageerror', (e) => merr.push(String(e)));
  await mp.goto(base + '/ko/지뢰찾기/오늘/'); await mp.waitForSelector('.ms-c');
  assert.equal(await mp.locator('.ms-c').count(), 256); ok('지뢰찾기 중급 16×16');
  // 첫 클릭 0 보장: 여러 위치(모서리 포함)에서 새로 시작해 첫 탭이 항상 빈 칸(0)이고 폭발 없음
  for (const idx of [0, 15, 120, 255, 17]) {
    await mp.locator('#ms-reset').click();
    await mp.locator('.ms-c').nth(idx).tap();
    const r = await mp.evaluate((i) => { const s = window.__pz.st; return { over: s.over, open: s.open[i], adj: s.adj[i], mine: s.mines[i] }; }, idx);
    assert.deepEqual([r.open, r.adj, r.mine], [1, 0, 0], 'first click ' + idx);
  }
  ok('첫 클릭 0 보장 (모서리 포함 5곳, 터치 탭)');
  // 길게 누르기 = 깃발
  await mp.locator('#ms-reset').click();
  await mp.locator('.ms-c').nth(5).scrollIntoViewIfNeeded(); const box = await mp.locator('.ms-c').nth(5).boundingBox();
  const cdp = await mp.context().newCDPSession(mp);
  const pt = [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt }); await mp.waitForTimeout(650); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  assert.equal(await mp.locator('.ms-c').nth(5).innerText(), '🚩'); assert.equal(await mp.locator('#ms-left').innerText(), '39'); ok('모바일 길게 누르기 → 깃발 (남은 지뢰 39)');
  // 깃발 모드: 탭 = 깃발, 켜진 상태에서 열기 안 됨
  await mp.locator('#ms-flag').tap(); await mp.locator('.ms-c').nth(7).tap(); assert.equal(await mp.locator('.ms-c').nth(7).innerText(), '🚩');
  await mp.locator('.ms-c').nth(7).tap(); assert.equal(await mp.locator('.ms-c').nth(7).innerText(), ''); ok('깃발 모드 탭: 꽂기/빼기');
  await mp.locator('#ms-flag').tap();
  // 클리어: 지뢰가 아닌 칸을 모두 열기 (판 정보는 페이지 내부 상태 이용)
  await mp.locator('#ms-reset').click(); await mp.locator('.ms-c').nth(0).tap();
  const nonMines = await mp.evaluate(() => { const s = window.__pz.st; const o = []; for (let i = 0; i < s.w * s.h; i++) if (!s.mines[i] && !s.open[i]) o.push(i); return o; });
  for (const i of nonMines) { if (await mp.locator('#ms-done:not([hidden])').count()) break; const cls = await mp.locator('.ms-c').nth(i).getAttribute('class'); if (!cls.includes(' o')) await mp.locator('.ms-c').nth(i).tap(); }
  await mp.waitForSelector('#ms-done:not([hidden])');
  const ms = await mp.evaluate(() => JSON.parse(localStorage.getItem('pz.v1')).minesweeper); assert.equal(ms.streak, 1); assert.equal(ms.last.win, 1); ok('지뢰찾기 클리어: 시간·streak 저장 ' + JSON.stringify(ms.last));
  assert.match(await mp.locator('#ms-share-text').inputValue(), /오늘의 지뢰찾기 .*\n⏱️ \d+:\d\d \| 클리어\n🟩{5}\nplaytoday\.cloud/u); ok('지뢰찾기 공유 문구');
  // 실패 케이스: 지뢰 클릭
  await mp.locator('#ms-close').tap(); await mp.locator('#ms-reset').tap(); await mp.locator('.ms-c').nth(0).tap();
  const mine = await mp.evaluate(() => window.__pz.st.mines.findIndex((x) => x)); await mp.locator('.ms-c').nth(mine).tap(); await mp.waitForSelector('#ms-done:not([hidden])');
  assert.match(await mp.locator('#ms-title').innerText(), /폭발/); ok('지뢰 클릭 → 실패 화면');
  // 고급 레이아웃(가로 스크롤 가능, 오류 없음)
  await mp.locator('#ms-close').tap(); await mp.locator('.ms-lv[data-lv="expert"]').tap(); assert.equal(await mp.locator('.ms-c').count(), 480); ok('고급 30×16');
  assert.deepEqual(merr, []); assert.deepEqual(errs, []); ok('콘솔/페이지 오류 0');
  // 가로 넘침 없음(모바일)
  const ov = await pg.evaluate(() => document.documentElement.scrollWidth - innerWidth); assert.ok(ov <= 1, 'overflow ' + ov); ok('스도쿠 모바일 가로 넘침 없음');
} catch (e) { console.error('FAIL', e); process.exitCode = 1; }
await b.close(); srv.close();
