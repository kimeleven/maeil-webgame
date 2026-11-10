// t_2d0c7a9f: 오늘의 퍼즐 코어 시험 (스도쿠 유일해·날짜 고정, 지뢰찾기 첫 클릭 0, 연속 기록)
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSudoku, countSolutions, sudokuConflicts, SUDOKU_LEVELS, placeMines, countAdj, openCell, MINE_LEVELS, neighbors, streakShown, streakAfterSolve, kstDate, prevDate, shareSudoku, shareMines } from '../public/js/puzzle-core.js';

test('sudoku: 3 levels, unique solution, valid solution, givens near target', () => {
  for (const lv of Object.keys(SUDOKU_LEVELS)) {
    const t0 = Date.now();
    const { puzzle, solution, givens } = generateSudoku('2026-11-12', lv);
    assert.equal(countSolutions(puzzle, 2), 1, `${lv} unique`);
    assert.equal(sudokuConflicts(solution).size, 0);
    assert.ok(solution.every((v) => v >= 1 && v <= 9));
    assert.ok(puzzle.every((v, i) => !v || v === solution[i]));
    assert.equal(puzzle.filter(Boolean).length, givens);
    assert.ok(givens <= SUDOKU_LEVELS[lv].givens + 4, `${lv} givens ${givens}`);
    console.log(lv, 'givens', givens, Date.now() - t0, 'ms');
  }
});

test('sudoku: same date → same puzzle, other date → different; 30 days all unique', () => {
  assert.deepEqual(generateSudoku('2026-11-12', 'normal').puzzle, generateSudoku('2026-11-12', 'normal').puzzle);
  assert.notDeepEqual(generateSudoku('2026-11-12', 'normal').puzzle, generateSudoku('2026-11-13', 'normal').puzzle);
  let d = '2026-11-12';
  for (let i = 0; i < 30; i++) { assert.equal(countSolutions(generateSudoku(d, 'normal').puzzle, 2), 1, d); d = new Date(Date.parse(d + 'T00:00:00Z') + 86400000).toISOString().slice(0, 10); }
});

test('mines: first click is always 0 on every level for every start cell sample', () => {
  for (const lv of Object.keys(MINE_LEVELS)) {
    const { w, h, mines: n } = MINE_LEVELS[lv];
    for (let first = 0; first < w * h; first += 7) {
      const m = placeMines('2026-11-12', lv, first);
      assert.equal(m.reduce((a, b) => a + b, 0), n);
      assert.equal(m[first], 0);
      const adj = countAdj(m, w, h);
      assert.equal(adj[first], 0, `${lv} first ${first} adj`);
      const s = { w, h, mines: m, adj, open: new Uint8Array(w * h), flag: new Uint8Array(w * h) };
      assert.equal(openCell(s, first), false);
      assert.ok(s.open.reduce((a, b) => a + b, 0) >= 1 + neighbors(first, w, h).length, 'cascade opens neighbors');
    }
  }
  const a = placeMines('2026-11-12', 'intermediate', 5), b = placeMines('2026-11-12', 'intermediate', 5);
  assert.deepEqual([...a], [...b]);
});

test('streak: +1 next day, same day no change, skip resets, display drops to 0', () => {
  let r = streakAfterSolve(undefined, '2026-11-12');
  assert.equal(r.streak, 1);
  r = streakAfterSolve(r, '2026-11-12'); assert.equal(r.streak, 1);
  r = streakAfterSolve(r, '2026-11-13'); assert.equal(r.streak, 2);
  assert.equal(streakShown(r, '2026-11-14'), 2); // 어제까지 이어짐
  assert.equal(streakShown(r, '2026-11-15'), 0); // 하루 건너뜀
  r = streakAfterSolve(r, '2026-11-16'); assert.equal(r.streak, 1);
  assert.equal(r.best, 2);
  assert.equal(prevDate('2026-03-01'), '2026-02-28');
  assert.equal(kstDate(Date.parse('2026-11-11T16:00:00Z')), '2026-11-12'); // 한국 자정
});

test('share text', () => {
  assert.match(shareSudoku('2026-11-12', '보통', 272, 0), /⏱️ 4:32 \| 힌트 0\n🟩🟩🟩🟩🟩/);
  assert.match(shareMines('2026-11-12', '중급', true, 95, 1), /1:35 \| 클리어/);
});

// ---- 빌드 결과: 한국어 URL·sitemap·본문 1,000자·홈 카드 ----
import { readFileSync, existsSync } from 'node:fs';
import { build } from '../scripts/build-i18n.mjs';
test('build: 퍼즐 페이지 4개, 본문 1000자↑, sitemap·홈 카드·내부 링크', () => {
  build();
  const rd = (s) => readFileSync(new URL(`../public/ko/${s}index.html`, import.meta.url), 'utf8');
  for (const s of ['스도쿠/', '스도쿠/오늘/', '지뢰찾기/', '지뢰찾기/오늘/']) {
    const h = rd(s);
    const body = h.match(/<main[\s\S]*<\/main>/)[0].replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, '');
    assert.ok(body.replace(/\s/g, '').length >= 1000, `${s} 본문 ${body.length}자`);
    assert.ok(h.includes(`rel="canonical" href="https://www.playtoday.cloud/ko/${s.split('/').map(encodeURIComponent).join('/')}"`), s + ' canonical');
    assert.ok(/<title>[^<]{5,60}<\/title>/.test(h) && /FAQPage/.test(h) && /"@type":"Game"/.test(h), s + ' meta/jsonld');
  }
  const sm = readFileSync(new URL('../public/sitemap.xml', import.meta.url), 'utf8');
  for (const s of ['스도쿠/', '스도쿠/오늘/', '지뢰찾기/', '지뢰찾기/오늘/']) assert.ok(sm.includes(`<loc>https://www.playtoday.cloud/ko/${s.split('/').map(encodeURIComponent).join('/')}</loc>`), 'sitemap ' + s);
  const home = rd('');
  assert.ok(home.includes('오늘의 퍼즐 3종') && home.indexOf('오늘의 퍼즐 3종') < home.indexOf('data-game="magnet-harbor"'), '홈: 퍼즐 카드가 기존 게임보다 위');
  for (const l of ['en', 'ja']) assert.ok(!readFileSync(new URL(`../public/${l}/index.html`, import.meta.url), 'utf8').includes('오늘의 퍼즐'));
  const hrefs = [...home.matchAll(/<a [^>]*href="(\/ko\/%[^"]+)"/g)].map((m) => m[1]);
  assert.ok(hrefs.length >= 4); for (const x of hrefs) assert.ok(existsSync(new URL(`../public${decodeURIComponent(x)}index.html`, import.meta.url)), x);
});
