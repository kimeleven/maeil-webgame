// 오늘의 퍼즐 추가 코어 (t_49b0ed25): 단어묶음 · 2048 · 노노그램 · 솔리테어. DOM 없는 순수 함수.
import { rng, hashStr, dailySeed } from './puzzle-core.js';

// ---------------- 단어묶음 ----------------
export const WG_LEVELS = [{ name: '노랑', emoji: '🟨' }, { name: '초록', emoji: '🟩' }, { name: '파랑', emoji: '🟦' }, { name: '보라', emoji: '🟪' }];
export const WG_MAX_MISTAKES = 4;
const dayNum = (d) => Math.floor(Date.parse(d + 'T00:00:00Z') / 86400000);
// 데이터 {start, days[]} 에서 날짜에 맞는 판. 시작일 전·50일 뒤에는 순환한다.
export function wgDayIndex(date, start, n) { return (((dayNum(date) - dayNum(start)) % n) + n) % n; }
export function wgDay(data, date) { return data.days[wgDayIndex(date, data.start, data.days.length)]; }
export function wgBoard(day, date) { // 16 단어를 날짜 시드로 섞는다 (같은 날 모두 같은 배치)
  const r = rng(dailySeed('wordgroup-board', date)), w = day.groups.flatMap((g) => g.words);
  for (let i = w.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [w[i], w[j]] = [w[j], w[i]]; }
  return w;
}
// 선택 4개 판정: {ok:true, gi} | {ok:false, oneAway} (3개가 한 묶음이면 oneAway)
export function wgGuess(day, sel, solvedGi = []) {
  if (sel.length !== 4) return { ok: false, oneAway: false, invalid: true };
  let best = 0;
  for (let gi = 0; gi < day.groups.length; gi++) {
    if (solvedGi.includes(gi)) continue;
    const n = sel.filter((w) => day.groups[gi].words.includes(w)).length;
    if (n === 4) return { ok: true, gi };
    best = Math.max(best, n);
  }
  return { ok: false, oneAway: best === 3 };
}
export function wgShare(date, rows, win, mistakes) { // rows: 제출 순서별 묶음 난이도(성공) 또는 -1 (오답) 4칸 배열 대신 간단히 난이도 배열
  const grid = rows.map((r) => (r < 0 ? '⬛⬛⬛⬛' : WG_LEVELS[r].emoji.repeat(4))).join('\n');
  return `오늘의 단어 묶음 · ${date}\n${win ? `✅ 클리어 (오답 ${mistakes})` : '❌ 아쉬워요'}\n${grid}\nplaytoday.cloud/ko/단어묶음/`;
}

// ---------------- 2048 ----------------
// 판 16칸 (행 우선). 같은 날·같은 이동 순서면 같은 새 타일 → '오늘의 2048'
export function g2048New(date) {
  let s = { b: new Array(16).fill(0), score: 0, spawns: 0, date, won: false };
  s = spawn(s); s = spawn(s);
  return s;
}
function spawn(s) {
  const empty = []; s.b.forEach((v, i) => { if (!v) empty.push(i); });
  if (!empty.length) return s;
  const h = hashStr(`2048-${s.date}-${s.spawns}`);
  const b = s.b.slice(); b[empty[h % empty.length]] = ((h >>> 8) % 10) === 0 ? 4 : 2;
  return { ...s, b, spawns: s.spawns + 1 };
}
function slideLine(line) {
  const a = line.filter(Boolean), out = []; let gain = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === a[i + 1]) { out.push(a[i] * 2); gain += a[i] * 2; i++; } else out.push(a[i]);
  }
  while (out.length < 4) out.push(0);
  return { out, gain };
}
export function g2048Move(s, dir) { // dir: 'L' 'R' 'U' 'D' → 새 상태, 변화 없으면 null
  const b = s.b.slice(); let gain = 0;
  for (let k = 0; k < 4; k++) {
    const idx = [0, 1, 2, 3].map((j) => (dir === 'L' || dir === 'R' ? k * 4 + j : j * 4 + k));
    if (dir === 'R' || dir === 'D') idx.reverse();
    const { out, gain: g } = slideLine(idx.map((i) => b[i]));
    gain += g; idx.forEach((i, j) => { b[i] = out[j]; });
  }
  if (b.every((v, i) => v === s.b[i])) return null;
  const n = spawn({ ...s, b, score: s.score + gain });
  return { ...n, won: s.won || b.includes(2048) };
}
export function g2048Over(s) {
  if (s.b.includes(0)) return false;
  return !['L', 'R', 'U', 'D'].some((d) => g2048Move(s, d));
}
export const g2048Max = (s) => Math.max(...s.b);
export const g2048Share = (date, s) => `오늘의 2048 · ${date}\n🔢 최고 ${g2048Max(s)} | 점수 ${s.score}\nplaytoday.cloud/ko/2048/`;

// ---------------- 노노그램 ----------------
export const NONO_LEVELS = { easy: { name: '5×5', n: 5, fill: 0.6 }, normal: { name: '10×10', n: 10, fill: 0.55 } };
export function nonoGen(date, level = 'easy') {
  const L = NONO_LEVELS[level]; if (!L) throw new Error('bad level ' + level);
  const r = rng(dailySeed('nono', date, level)); let g;
  do { g = Array.from({ length: L.n * L.n }, () => (r() < L.fill ? 1 : 0)); } while (!nonoOk(g, L.n)); // 빈 줄이 너무 많은 판 제외
  return { n: L.n, grid: g, ...nonoClues(g, L.n) };
}
function nonoOk(g, n) { for (let i = 0; i < n; i++) { let a = 0, b = 0; for (let j = 0; j < n; j++) { a += g[i * n + j]; b += g[j * n + i]; } if (!a || !b) return false; } return true; }
function lineClue(line) { const c = []; let run = 0; for (const v of line) { if (v) run++; else if (run) { c.push(run); run = 0; } } if (run) c.push(run); return c.length ? c : [0]; }
export function nonoClues(g, n) {
  const rows = [], cols = [];
  for (let i = 0; i < n; i++) { rows.push(lineClue(Array.from({ length: n }, (_, j) => g[i * n + j]))); cols.push(lineClue(Array.from({ length: n }, (_, j) => g[j * n + i]))); }
  return { rows, cols };
}
// 정답 판정은 '그림이 같은가'가 아니라 '모든 줄 힌트를 만족하는가' (해가 여럿인 판도 인정)
export function nonoSolved(filled, n, rows, cols) {
  const c = nonoClues(filled.map((v) => (v === 1 ? 1 : 0)), n);
  return JSON.stringify(c.rows) === JSON.stringify(rows) && JSON.stringify(c.cols) === JSON.stringify(cols);
}
export const nonoShare = (date, name, time) => `오늘의 노노그램 · ${date} (${name})\n⏱️ ${Math.floor(time / 60)}:${String(time % 60).padStart(2, '0')}\n⬛⬛⬜⬛⬛\nplaytoday.cloud/ko/노노그램/`;

// ---------------- 솔리테어 (클론다이크, 1장 뽑기) ----------------
// 카드: 0..51, 무늬 = ⌊c/13⌋ (0♠ 1♥ 2♦ 3♣), 숫자 = c%13 (0=A … 12=K)
export const SUITS = ['♠', '♥', '♦', '♣'];
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const cardSuit = (c) => Math.floor(c / 13), cardRank = (c) => c % 13;
export const isRed = (c) => cardSuit(c) === 1 || cardSuit(c) === 2;
// 풀리지 않는 판 방지 (t_9242a69d): 날짜 시드로 만든 판을 DFS 풀이기로 검증해 풀이가 확인된 판만 쓴다.
// 못 풀면 같은 날짜에 salt를 올려 다음 판을 시도한다 (결정적이라 같은 날 모두 같은 판).
export function solRaw(date, salt = 0) {
  const r = rng(dailySeed('solitaire', date, salt ? 's' + salt : '')), d = [...Array(52).keys()];
  for (let i = 51; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
  const tab = []; let p = 0;
  for (let c = 0; c < 7; c++) { const col = []; for (let k = 0; k <= c; k++) col.push({ c: d[p++], up: k === c }); tab.push(col); }
  return { tab, stock: d.slice(p), waste: [], found: [[], [], [], []], moves: 0 };
}
// 풀이기: 1장 뽑기·무제한 재순환 클론다이크. 노드 한도 안에 승리 경로를 찾으면 true.
export function solSolvable(s, budget = 60000, trace = null) {
  const col = s.tab.map((c) => c.map((x) => x.c)), dn = s.tab.map((c) => c.filter((x) => !x.up).length);
  const cyc = s.stock.slice().reverse().concat(s.waste), fnd = s.found.map((p) => p.length);
  // 서 있는 상태 → [col, dn, fnd, cyc, pos] ; 상태는 문자열 키로 방문 처리
  const seen = new Set(); let nodes = 0;
  const rk = (c) => c % 13, su = (c) => Math.floor(c / 13), red = (c) => su(c) === 1 || su(c) === 2;
  const key = (cl, d, f, cy, pos) => cl.map((c, i) => d[i] + ':' + c.join(',')).join('|') + '/' + f.join(',') + '/' + pos + '/' + cy.join(',');
  const safe = (c, f) => { const r = rk(c); if (r <= 1) return true; const o = red(c) ? [0, 3] : [1, 2]; return f[o[0]] >= r && f[o[1]] >= r; };
  function dfs(cl, d, f, cy, pos) {
    if (f[0] + f[1] + f[2] + f[3] === 52) return true;
    if (++nodes > budget) return false;
    const k = key(cl, d, f, cy, pos); if (seen.has(k)) return false; seen.add(k);
    // 1) 안전한 기초 올리기는 강제 (분기 없음)
    for (let i = 0; i < 7; i++) {
      if (!cl[i].length || d[i] >= cl[i].length) continue;
      const c = cl[i][cl[i].length - 1];
      if (f[su(c)] === rk(c) && safe(c, f)) {
        const cl2 = cl.map((x) => x.slice()), d2 = d.slice(), f2 = f.slice(); cl2[i].pop();
        if (cl2[i].length && d2[i] >= cl2[i].length) d2[i] = cl2[i].length - 1;
        f2[su(c)]++; if (dfs(cl2, d2, f2, cy, pos)) { trace?.push({ t: 'f', i, c }); return true; } return false;
      }
    }
    if (pos >= 0) { const c = cy[pos]; if (f[su(c)] === rk(c) && safe(c, f)) { const cy2 = cy.slice(); cy2.splice(pos, 1); const f2 = f.slice(); f2[su(c)]++; if (dfs(cl, d, f2, cy2, pos - 1)) { trace?.push({ t: 'wf', c }); return true; } return false; } }
    const moves = [];
    // 2) 열 → 열 (뒤집을 카드가 생기는 이동 우선)
    for (let i = 0; i < 7; i++) {
      for (let a = d[i]; a < cl[i].length; a++) {
        const c = cl[i][a];
        for (let j = 0; j < 7; j++) {
          if (j === i) continue;
          const t = cl[j][cl[j].length - 1], ok = t === undefined ? rk(c) === 12 : (cl[j].length > d[j] && red(t) !== red(c) && rk(t) === rk(c) + 1);
          if (!ok) continue;
          if (t === undefined && a === 0) continue; // 빈 열 → 빈 열 무의미
          moves.push({ t: 'c', i, a, j, pri: a === d[i] && d[i] > 0 ? 0 : a === 0 && t !== undefined ? 1 : 3 });
        }
      }
      if (cl[i].length > d[i]) { const c = cl[i][cl[i].length - 1]; if (f[su(c)] === rk(c)) moves.push({ t: 'f', i, pri: 2 }); }
    }
    // 3) 뽑은 카드 → 열/기초
    if (pos >= 0) {
      const c = cy[pos];
      if (f[su(c)] === rk(c)) moves.push({ t: 'wf', pri: 1 });
      for (let j = 0; j < 7; j++) { const t = cl[j][cl[j].length - 1]; if (t === undefined ? rk(c) === 12 : (cl[j].length > d[j] && red(t) !== red(c) && rk(t) === rk(c) + 1)) moves.push({ t: 'wc', j, pri: 2 }); }
    }
    if (cy.length > 0) moves.push({ t: 'd', pri: 5 });
    moves.sort((x, y) => x.pri - y.pri);
    for (const m of moves) {
      const cl2 = cl.map((x) => x.slice()), d2 = d.slice(), f2 = f.slice(); let cy2 = cy, pos2 = pos;
      if (m.t === 'c') { const mv = cl2[m.i].splice(m.a); cl2[m.j].push(...mv); if (d2[m.i] > cl2[m.i].length - 1 && cl2[m.i].length) d2[m.i] = Math.min(d2[m.i], cl2[m.i].length - 1); else if (!cl2[m.i].length) d2[m.i] = 0; if (m.a === d[m.i] && d[m.i] > 0) d2[m.i] = d[m.i] - 1; }
      else if (m.t === 'f') { const c = cl2[m.i].pop(); f2[su(c)]++; if (cl2[m.i].length && d2[m.i] >= cl2[m.i].length) d2[m.i] = cl2[m.i].length - 1; else if (!cl2[m.i].length) d2[m.i] = 0; }
      else if (m.t === 'wf') { const c = cy[pos]; cy2 = cy.slice(); cy2.splice(pos, 1); pos2 = pos - 1; f2[su(c)]++; }
      else if (m.t === 'wc') { const c = cy[pos]; cy2 = cy.slice(); cy2.splice(pos, 1); pos2 = pos - 1; cl2[m.j].push(c); }
      else { pos2 = pos + 1 >= cy.length ? 0 : pos + 1; }
      if (dfs(cl2, d2, f2, cy2, pos2)) { trace?.push({ ...m, c: m.t === 'c' ? cl[m.i][m.a] : m.t === 'f' ? cl[m.i][cl[m.i].length - 1] : cy[pos] }); return true; }
      if (nodes > budget) return false;
    }
    return false;
  }
  const ok = dfs(col, dn, fnd, cyc, -1); if (ok && trace) trace.reverse(); return ok;
}
export function solDeal(date) {
  for (let salt = 0; salt < 40; salt++) { const s = solRaw(date, salt); if (solSolvable(s)) return s; }
  return solRaw(date, 0); // 사실상 도달 불가 (40판 연속 미해결)
}
export function solDraw(s) {
  const n = structuredClone(s);
  if (n.stock.length) n.waste.push(n.stock.pop());
  else if (n.waste.length) { n.stock = n.waste.reverse(); n.waste = []; }
  else return null;
  n.moves++; return n;
}
const canFound = (card, pile) => (pile.length ? cardSuit(pile[pile.length - 1]) === cardSuit(card) && cardRank(card) === cardRank(pile[pile.length - 1]) + 1 : cardRank(card) === 0);
const canTab = (card, col) => { if (!col.length) return cardRank(card) === 12; const t = col[col.length - 1]; return t.up && isRed(t.c) !== isRed(card) && cardRank(t.c) === cardRank(card) + 1; };
// from: {k:'w'} | {k:'t',col,idx} | {k:'f',s} ; to: {k:'t',col} | {k:'f',s}. 규칙 위반이면 null.
export function solMove(s, from, to) {
  const n = structuredClone(s); let cards;
  if (from.k === 'w') { if (!n.waste.length) return null; cards = [n.waste[n.waste.length - 1]]; }
  else if (from.k === 'f') { const p = n.found[from.s]; if (!p.length) return null; cards = [p[p.length - 1]]; }
  else { const col = n.tab[from.col]; const cs = col.slice(from.idx); if (!cs.length || cs.some((x) => !x.up)) return null; cards = cs.map((x) => x.c); }
  if (to.k === 'f') {
    if (cards.length !== 1 || !canFound(cards[0], n.found[to.s])) return null;
    if (from.k === 'f' && from.s === to.s) return null;
    n.found[to.s].push(cards[0]);
  } else {
    if (from.k === 't' && from.col === to.col) return null;
    if (!canTab(cards[0], n.tab[to.col])) return null;
    n.tab[to.col].push(...cards.map((c) => ({ c, up: true })));
  }
  if (from.k === 'w') n.waste.pop();
  else if (from.k === 'f') n.found[from.s].pop();
  else { const col = n.tab[from.col]; col.splice(from.idx); if (col.length) col[col.length - 1].up = true; }
  n.moves++; return n;
}
// 카드를 놓을 수 있는 기초 더미 번호 (자동 올리기용), 없으면 -1
export function solFoundTarget(s, card) { for (let i = 0; i < 4; i++) if (canFound(card, s.found[i])) return i; return -1; }
export const solWon = (s) => s.found.every((p) => p.length === 13);
export const solShare = (date, s, win) => `오늘의 솔리테어 · ${date}\n${win ? '🃏 클리어' : '🃏 ' + s.found.reduce((a, p) => a + p.length, 0) + '/52장 올림'} | ${s.moves}수\nplaytoday.cloud/ko/솔리테어/`;
