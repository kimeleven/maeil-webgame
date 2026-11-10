// 오늘의 퍼즐 코어 (t_2d0c7a9f): 날짜 시드 · 스도쿠 생성/검증 · 지뢰찾기 배치 · 연속 기록 · 공유 문구.
// DOM 없는 순수 함수만. 브라우저(ES module)와 node --test 양쪽에서 쓴다.

// ---- 날짜 시드 (한국 날짜 기준, 같은 날 같은 판) ----
export function kstDate(now = Date.now()) {
  return new Date(now + 9 * 3600 * 1000).toISOString().slice(0, 10);
}
export function prevDate(d) {
  const t = Date.parse(d + 'T00:00:00Z') - 86400000;
  return new Date(t).toISOString().slice(0, 10);
}
export function hashStr(s) { // xmur3 → 32bit
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}
export function rng(seedStr) { // mulberry32
  let a = hashStr(seedStr);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const dailySeed = (type, date, extra = '') => `${type}-${date}${extra ? '-' + extra : ''}`;
function shuffle(arr, r) {
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}

// ---- 스도쿠 ----
export const SUDOKU_LEVELS = { easy: { name: '쉬움', givens: 40 }, normal: { name: '보통', givens: 32 }, hard: { name: '어려움', givens: 26 } };
const peersCache = [];
function peers(i) {
  if (peersCache[i]) return peersCache[i];
  const r = Math.floor(i / 9), c = i % 9, s = new Set();
  for (let k = 0; k < 9; k++) { s.add(r * 9 + k); s.add(k * 9 + c); }
  const br = r - (r % 3), bc = c - (c % 3);
  for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) s.add((br + a) * 9 + bc + b);
  s.delete(i);
  return (peersCache[i] = [...s]);
}
function candidates(g, i) {
  let m = 0x3fe; // bits 1..9
  for (const p of peers(i)) if (g[p]) m &= ~(1 << g[p]);
  return m;
}
const popcnt = (m) => { let n = 0; while (m) { m &= m - 1; n++; } return n; };
// 해 개수 세기 (limit 에서 중단). 가장 후보 적은 칸 우선.
export function countSolutions(grid, limit = 2) {
  const g = grid.slice();
  let n = 0;
  (function rec() {
    if (n >= limit) return;
    let best = -1, bm = 0, bc = 10;
    for (let i = 0; i < 81; i++) if (!g[i]) {
      const m = candidates(g, i), c = popcnt(m);
      if (c < bc) { bc = c; best = i; bm = m; if (c <= 1) break; }
    }
    if (best < 0) { n++; return; }
    if (bc === 0) return;
    for (let v = 1; v <= 9; v++) if (bm & (1 << v)) { g[best] = v; rec(); if (n >= limit) break; }
    g[best] = 0;
  })();
  return n;
}
export function solveGrid(grid) {
  const g = grid.slice();
  const rec = () => {
    let best = -1, bm = 0, bc = 10;
    for (let i = 0; i < 81; i++) if (!g[i]) {
      const m = candidates(g, i), c = popcnt(m);
      if (c < bc) { bc = c; best = i; bm = m; if (c <= 1) break; }
    }
    if (best < 0) return true;
    for (let v = 1; v <= 9; v++) if (bm & (1 << v)) { g[best] = v; if (rec()) return true; }
    g[best] = 0;
    return false;
  };
  return rec() ? g : null;
}
function fullGrid(r) {
  const g = new Array(81).fill(0);
  const rec = () => {
    let best = -1, bm = 0, bc = 10;
    for (let i = 0; i < 81; i++) if (!g[i]) {
      const m = candidates(g, i), c = popcnt(m);
      if (c < bc) { bc = c; best = i; bm = m; if (c <= 1) break; }
    }
    if (best < 0) return true;
    const vs = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9].filter((v) => bm & (1 << v)), r);
    for (const v of vs) { g[best] = v; if (rec()) return true; }
    g[best] = 0;
    return false;
  };
  rec();
  return g;
}
// 날짜+난이도 → { puzzle[81], solution[81], givens }. 항상 해가 정확히 하나.
export function generateSudoku(date, level = 'normal') {
  const L = SUDOKU_LEVELS[level];
  if (!L) throw new Error('bad level ' + level);
  const r = rng(dailySeed('sudoku', date, level));
  const solution = fullGrid(r);
  const puzzle = solution.slice();
  const order = shuffle([...Array(81).keys()], r);
  let givens = 81;
  for (const i of order) {
    if (givens <= L.givens) break;
    const keep = puzzle[i];
    puzzle[i] = 0;
    if (countSolutions(puzzle, 2) !== 1) puzzle[i] = keep; else givens--;
  }
  return { puzzle, solution, givens };
}
export function sudokuConflicts(g) { // 규칙 위반 칸 인덱스 집합
  const bad = new Set();
  for (let i = 0; i < 81; i++) if (g[i]) for (const p of peers(i)) if (g[p] === g[i]) { bad.add(i); bad.add(p); }
  return bad;
}
export const sudokuDone = (g, solution) => g.every((v, i) => v === solution[i]);

// ---- 지뢰찾기 ----
export const MINE_LEVELS = { beginner: { name: '초급', w: 9, h: 9, mines: 10 }, intermediate: { name: '중급', w: 16, h: 16, mines: 40 }, expert: { name: '고급', w: 30, h: 16, mines: 99 } };
// 첫 클릭(자신+이웃)에는 지뢰가 없다 → 첫 클릭은 항상 0. 같은 날·같은 첫 클릭이면 같은 판.
export function placeMines(date, level, firstIdx) {
  const L = MINE_LEVELS[level];
  const { w, h } = L;
  const fx = firstIdx % w, fy = Math.floor(firstIdx / w);
  const safe = new Set();
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const x = fx + dx, y = fy + dy;
    if (x >= 0 && x < w && y >= 0 && y < h) safe.add(y * w + x);
  }
  const r = rng(dailySeed('mines', date, level));
  const cells = shuffle([...Array(w * h).keys()], r).filter((i) => !safe.has(i));
  const mines = new Uint8Array(w * h);
  for (const i of cells.slice(0, L.mines)) mines[i] = 1;
  return mines;
}
export function neighbors(i, w, h) {
  const x = i % w, y = Math.floor(i / w), out = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (!dx && !dy) continue;
    const nx = x + dx, ny = y + dy;
    if (nx >= 0 && nx < w && ny >= 0 && ny < h) out.push(ny * w + nx);
  }
  return out;
}
export function countAdj(mines, w, h) {
  const adj = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) if (!mines[i]) adj[i] = neighbors(i, w, h).reduce((a, n) => a + mines[n], 0);
  return adj;
}
// 열기: open(Uint8Array) 갱신, 지뢰를 열면 true. 0이면 연쇄.
export function openCell(state, i) {
  const { w, h, mines, adj, open, flag } = state;
  if (open[i] || flag[i] === 1) return false;
  if (mines[i]) { open[i] = 1; return true; }
  const st = [i];
  while (st.length) {
    const c = st.pop();
    if (open[c] || flag[c] === 1) continue;
    open[c] = 1;
    if (adj[c] === 0) for (const n of neighbors(c, w, h)) if (!open[n] && !mines[n]) st.push(n);
  }
  return false;
}
export const minesWon = (s) => { for (let i = 0; i < s.w * s.h; i++) if (!s.mines[i] && !s.open[i]) return false; return true; };

// ---- 연속 기록 (localStorage 값 처리, 저장소와 분리) ----
// rec = { streak, lastPlayed, best, last:{date,level,time,hints|result} }
export function streakShown(rec, today) { // 화면에 보이는 연속일: 어제까지 이었으면 유지, 하루라도 건너뛰었으면 0
  if (!rec || !rec.lastPlayed) return 0;
  return rec.lastPlayed === today || rec.lastPlayed === prevDate(today) ? rec.streak || 0 : 0;
}
export function streakAfterSolve(rec, today) { // 오늘 완료 처리
  rec = rec || {};
  if (rec.lastPlayed === today) return { ...rec, streak: rec.streak || 1 };
  const streak = rec.lastPlayed === prevDate(today) ? (rec.streak || 0) + 1 : 1;
  return { ...rec, streak, lastPlayed: today, best: Math.max(rec.best || 0, streak) };
}

// ---- 공유 ----
export const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
export function shareSudoku(date, levelName, time, hints) {
  const y = Math.min(hints, 5);
  return `오늘의 스도쿠 · ${date} (${levelName})\n⏱️ ${fmtTime(time)} | 힌트 ${hints}\n${'🟩'.repeat(5 - y)}${'🟨'.repeat(y)}\nplaytoday.cloud/ko/스도쿠/`;
}
export function shareMines(date, levelName, win, time, progress) {
  const g = win ? 5 : Math.min(4, Math.floor(progress * 5));
  return `오늘의 지뢰찾기 · ${date} (${levelName})\n${win ? '⏱️ ' + fmtTime(time) + ' | 클리어' : '💥 ' + Math.round(progress * 100) + '%에서 폭발'}\n${'🟩'.repeat(g)}${win ? '' : '🟥'.repeat(5 - g)}\nplaytoday.cloud/ko/지뢰찾기/`;
}
