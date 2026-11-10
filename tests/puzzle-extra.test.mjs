// t_49b0ed25: 단어묶음 · 2048 · 노노그램 · 솔리테어 코어 시험 + 50일 데이터 검증
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { wgDay, wgDayIndex, wgBoard, wgGuess, wgShare, g2048New, g2048Move, g2048Over, nonoGen, nonoSolved, nonoClues, solDeal, solDraw, solMove, solWon, solFoundTarget, cardSuit, cardRank } from '../public/js/puzzle-extra-core.js';
import { buildDays } from '../scripts/build-wordgroup-data.mjs';
import { parsePool, COLORS } from '../scripts/wordgroup-pool.mjs';

const DATA = JSON.parse(readFileSync(new URL('../public/data/wordgroup-days.json', import.meta.url)));

test('wordgroup data: 50 days, 4 groups x 4 words, no duplicate word in a day, levels 0..3, matches generator', () => {
  assert.equal(DATA.days.length, 50);
  assert.deepEqual(DATA.days, buildDays(), '커밋된 JSON 이 생성 스크립트와 같다');
  const pool = parsePool(), all = new Set(COLORS.flatMap((c) => pool[c].map((g) => g.name)));
  for (const d of DATA.days) {
    assert.deepEqual(d.groups.map((g) => g.level), [0, 1, 2, 3]);
    const ws = d.groups.flatMap((g) => g.words);
    assert.equal(ws.length, 16); assert.equal(new Set(ws).size, 16, `day ${d.n} 단어 중복`);
    for (const g of d.groups) { assert.equal(g.words.length, 4); assert.ok(all.has(g.name)); }
  }
  assert.ok(new Set(DATA.days.flatMap((d) => d.groups.map((g) => g.name))).size >= 50, '50일에 서로 다른 묶음 50개 이상');
});

test('wordgroup: pool 8 words each, 56 groups, no clashing words inside a day pool', () => {
  const pool = parsePool();
  for (const c of COLORS) { assert.equal(pool[c].length, 14); for (const g of pool[c]) assert.equal(g.words.length, 8, g.name); }
  for (const d of DATA.days) { // 같은 날 네 묶음의 전체 후보 단어가 겹치지 않는다
    const sets = d.groups.map((g) => new Set(COLORS.map((c) => pool[c]).flat().find((p) => p.name === g.name).words));
    for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) for (const w of sets[a]) assert.ok(!sets[b].has(w), `day ${d.n} ${w}`);
  }
});

test('wordgroup: day index wraps, board is a stable shuffle, guess/one-away/mistakes', () => {
  assert.equal(wgDayIndex('2026-11-18', DATA.start, 50), 0);
  assert.equal(wgDayIndex('2026-12-07', DATA.start, 50), 19);
  assert.equal(wgDayIndex('2027-01-07', DATA.start, 50), 0);
  assert.equal(wgDayIndex('2026-11-17', DATA.start, 50), 49);
  const day = wgDay(DATA, '2026-11-18');
  assert.deepEqual(wgBoard(day, '2026-11-18'), wgBoard(day, '2026-11-18'));
  assert.notDeepEqual(wgBoard(day, '2026-11-18'), day.groups.flatMap((g) => g.words), '정답 순서 그대로가 아니다');
  assert.equal([...wgBoard(day, '2026-11-18')].sort().join(), day.groups.flatMap((g) => g.words).sort().join());
  const g0 = day.groups[0].words, g1 = day.groups[1].words;
  assert.deepEqual(wgGuess(day, g0), { ok: true, gi: 0 });
  assert.deepEqual(wgGuess(day, [...g0.slice(0, 3), g1[0]]), { ok: false, oneAway: true });
  assert.deepEqual(wgGuess(day, [g0[0], g0[1], g1[0], g1[1]]), { ok: false, oneAway: false });
  assert.equal(wgGuess(day, g0.slice(0, 3)).invalid, true);
  assert.deepEqual(wgGuess(day, g0, [0]), { ok: false, oneAway: false }, '이미 푼 묶음은 무시');
  assert.match(wgShare('2026-11-18', [0, -1, 1], true, 1), /🟨🟨🟨🟨\n⬛⬛⬛⬛\n🟩🟩🟩🟩/);
});

test('2048: slide/merge rules, deterministic spawn, no-op returns null, game over', () => {
  let s = { b: [2, 2, 2, 2, 0, 0, 0, 0, 4, 0, 4, 0, 2, 0, 0, 2], score: 0, spawns: 0, date: '2026-11-18', won: false };
  const m = g2048Move(s, 'L');
  assert.equal(m.b[0], 4); assert.equal(m.b[1], 4); assert.equal(m.score, 4 + 4 + 8 + 4);
  assert.equal(m.b.filter(Boolean).length, 5, '4 4 / 8 / 4 / 새 타일 1');
  const a = g2048Move(s, 'U'), b = g2048Move(s, 'U'); assert.deepEqual(a, b);
  assert.equal(g2048Move({ ...s, b: [2, 0, 0, 0, ...new Array(12).fill(0)] }, 'L'), null);
  const n1 = g2048New('2026-11-18'), n2 = g2048New('2026-11-18');
  assert.deepEqual(n1, n2); assert.equal(n1.b.filter(Boolean).length, 2);
  const dead = { b: [2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2], score: 0, spawns: 0, date: 'x' };
  assert.equal(g2048Over(dead), true); assert.equal(g2048Over(s), false);
  // 임의 이동 500회: 합계는 이동마다 새 타일(2|4)만큼만 늘어난다
  let t = g2048New('2026-11-18');
  for (let i = 0; i < 500 && !g2048Over(t); i++) { const before = t.b.reduce((x, y) => x + y, 0); const nx = g2048Move(t, 'LRUD'[i % 4]); if (!nx) continue; const add = nx.b.reduce((x, y) => x + y, 0) - before; assert.ok(add === 2 || add === 4); t = nx; }
});

test('nonogram: clues, solved by any grid satisfying clues, daily stable', () => {
  for (const lv of ['easy', 'normal']) {
    const p = nonoGen('2026-11-18', lv), q = nonoGen('2026-11-18', lv);
    assert.deepEqual(p, q); assert.equal(p.grid.length, p.n * p.n);
    assert.equal(nonoSolved(p.grid, p.n, p.rows, p.cols), true);
    assert.equal(nonoSolved(p.grid.map(() => 0), p.n, p.rows, p.cols), false);
  }
  assert.deepEqual(nonoClues([1, 1, 0, 1, 0, 0, 0, 1, 1], 3), { rows: [[2], [1], [2]], cols: [[2], [1, 1], [1]] });
  assert.notDeepEqual(nonoGen('2026-11-18', 'easy').grid, nonoGen('2026-11-19', 'easy').grid);
});

test('solitaire: deal 28 tableau + 24 stock, draw/recycle, rule-checked moves, win detection', () => {
  const s = solDeal('2026-11-18');
  assert.deepEqual(s.tab.map((c) => c.length), [1, 2, 3, 4, 5, 6, 7]);
  assert.equal(s.stock.length, 24);
  assert.deepEqual(s, solDeal('2026-11-18'));
  const all = [...s.tab.flat().map((x) => x.c), ...s.stock]; assert.equal(new Set(all).size, 52);
  assert.ok(s.tab.every((col) => col.filter((x) => x.up).length === 1 && col[col.length - 1].up));
  let d = s; for (let i = 0; i < 24; i++) d = solDraw(d); assert.equal(d.stock.length, 0); assert.equal(d.waste.length, 24);
  d = solDraw(d); assert.equal(d.stock.length, 24); assert.equal(d.waste.length, 0);
  // 규칙: A 는 기초로, 2 를 같은 무늬 A 없이 올릴 수 없다, K 만 빈 열
  const mk = (tab, waste = [], found = [[], [], [], []]) => ({ tab, stock: [], waste, found, moves: 0 });
  const A = 0, two = 1, tabEmpty = [[], [], [], [], [], [], []];
  assert.ok(solMove(mk(tabEmpty, [A]), { k: 'w' }, { k: 'f', s: 0 }));
  assert.equal(solMove(mk(tabEmpty, [two]), { k: 'w' }, { k: 'f', s: 0 }), null);
  assert.equal(solMove(mk(tabEmpty, [5]), { k: 'w' }, { k: 'f', s: 0 }) , null);
  assert.equal(solMove(mk(tabEmpty, [5]), { k: 'w' }, { k: 't', col: 0 }), null, 'K 아니면 빈 열 불가');
  const K = 12; assert.ok(solMove(mk(tabEmpty, [K]), { k: 'w' }, { k: 't', col: 0 }));
  // 번갈아 색: ♠Q(11) 위에 ♥J(13+10=23) 가능, ♠J(10) 불가
  const t1 = [...tabEmpty]; t1[0] = [{ c: 11, up: true }];
  assert.ok(solMove(mk(t1, [23]), { k: 'w' }, { k: 't', col: 0 }));
  assert.equal(solMove(mk(t1, [10]), { k: 'w' }, { k: 't', col: 0 }), null);
  // 열 이동: 뒤집힌 카드 아래로는 못 끌고, 이동 뒤 아래 카드가 뒤집힌다
  const t2 = [...tabEmpty]; t2[1] = [{ c: 40, up: false }, { c: 23, up: true }]; t2[0] = [{ c: 11, up: true }];
  const mv = solMove(mk(t2), { k: 't', col: 1, idx: 1 }, { k: 't', col: 0 });
  assert.ok(mv); assert.equal(mv.tab[1][0].up, true); assert.equal(mv.tab[0].length, 2);
  assert.equal(solMove(mk(t2), { k: 't', col: 1, idx: 0 }, { k: 't', col: 0 }), null, '뒤집힌 카드는 못 옮김');
  assert.equal(solFoundTarget(mk(tabEmpty), A) >= 0, true);
  // 완주: 기초 4×13
  const full = mk(tabEmpty, [], [0, 1, 2, 3].map((su) => Array.from({ length: 13 }, (_, r) => su * 13 + r)));
  assert.equal(solWon(full), true); assert.equal(solWon(s), false);
  assert.equal(cardSuit(14), 1); assert.equal(cardRank(14), 1);
  // 임의 플레이 1000수: 카드 보존
  let g = solDeal('2026-11-18');
  for (let i = 0; i < 1000; i++) {
    const nx = solMove(g, { k: 'w' }, { k: 't', col: i % 7 }) || solMove(g, { k: 't', col: i % 7, idx: g.tab[i % 7].length - 1 }, { k: 'f', s: i % 4 }) || solDraw(g);
    if (nx) g = nx;
    const cnt = g.tab.flat().length + g.stock.length + g.waste.length + g.found.flat().length; assert.equal(cnt, 52);
  }
});
