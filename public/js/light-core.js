// Light Workshop rule engine (prototype, t_b8fb1a93). DOM-free, deterministic, fixed step 1/60 s.
// GDD r2: workspace/maeil-arcade-local/games/light-workshop/GDD.md (2.0 time, 2.1 generation, 6 curve, 7 score, 8 abuse).
// Same seed + same board number → same board. Same input log → same result. Integers only in game state.
export const LW = {
  HZ: 60, ACTIVE: 5400,          // 90 s active time
  TRANS: 36,                     // 0.6 s board transition (time flows, input ignored)
  ROT: 7,                        // 0.12 s mirror rotation lock (same mirror)
  EXTRA: 3,                      // default tap limit = par + 3 (per-tier TIERS[].extra wins)
  RESET_PEN: 180, SKIP_PEN: 300, // 3 s / 5 s
  TRIES: 32,
  SCORE: { base: 100, left: 15, bonus: 50, multMax: 3 },
};
// GDD 6: [from board n, grid N, k range, fixed, lamps range, par range]
export const TIERS = [
  { n: 1, N: 4, k: [1, 1], fixed: [0, 0], lamps: [1, 1], par: [1, 1], extra: 3 },   // board 1 stays easy: par + 3
  // t_da9e7634: board 2+ limit = par + 1 (random tapping 17.2% -> 7.2%, scripts/light-tune.mjs), boards 2-3 always k=3
  { n: 2, N: 4, k: [3, 3], fixed: [1, 1], lamps: [1, 2], par: [2, 2], extra: 1 },
  { n: 4, N: 5, k: [4, 5], fixed: [2, 2], lamps: [2, 2], par: [2, 3], extra: 1 },
  { n: 7, N: 6, k: [6, 8], fixed: [2, 3], lamps: [2, 3], par: [3, 5], extra: 1 },
];
export const tierOf = (n) => { let t = 0; for (let i = 0; i < TIERS.length; i++) if (n >= TIERS[i].n) t = i; return t; };
export function hash(s) { let h = 2166136261 >>> 0; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
export function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1];   // 0 right, 1 down, 2 left, 3 up
const BOUNCE = [[3, 2, 1, 0], [1, 0, 3, 2]];      // state 0 = '/', 1 = '\'
// cell types
export const EMPTY = 0, WALL = 1, MIRROR = 2, LAMP = 3;
const pop = (x) => { let c = 0; while (x) { c += x & 1; x >>>= 1; } return c; };

// board: { N, src:{x,y,d}, type[], rot[] (cell indexes of rotatable mirrors, path order), fixedState{}, start (bitmask over rot), sols[], par, lamps[] }
// state of mirror cell i: rotatable → bit of mask, fixed → fixedState
export function trace(b, mask) {
  const N = b.N, lit = new Set(), path = [];
  let x = b.src.x, y = b.src.y, d = b.src.d;
  for (let s = 0; s < 4 * N * N; s++) {
    if (x < 0 || y < 0 || x >= N || y >= N) break;
    const i = y * N + x, t = b.type[i];
    if (t === WALL) break;
    path.push(i);
    if (t === LAMP) lit.add(i);
    if (t === MIRROR) { const r = b.rot.indexOf(i); const st = r >= 0 ? (mask >> r) & 1 : b.fixedState[i]; d = BOUNCE[st][d]; }
    x += DX[d]; y += DY[d];
  }
  return { path, lit, all: b.lamps.every((l) => lit.has(l)) };
}
export const solved = (b, mask) => trace(b, mask).all;
// exact par: 2^k exhaustive (k ≤ 8 → ≤ 256 states)
export function solve(b, start = b.start) {
  const k = b.rot.length; let par = Infinity; const sols = [];
  for (let m = 0; m < 1 << k; m++) if (solved(b, m)) { sols.push(m); par = Math.min(par, pop(m ^ start)); }
  return { par, sols };
}

function walk(N, R, need) {
  // self-avoiding beam path from an edge cell inward with exactly `need` turns, ending at the edge or a wall
  const side = Math.floor(R() * 4); const p = 1 + Math.floor(R() * (N - 2));
  const src = [{ x: 0, y: p, d: 0 }, { x: p, y: 0, d: 1 }, { x: N - 1, y: p, d: 2 }, { x: p, y: N - 1, d: 3 }][side];
  const seen = new Set(), cells = [], turns = [];
  let { x, y, d } = src;
  const inb = (a, c) => a >= 0 && c >= 0 && a < N && c < N;
  for (let s = 0; s < N * N; s++) {
    const i = y * N + x; seen.add(i);
    const cell = { i, din: d }; cells.push(cell);
    const left = need - turns.length;
    if (left > 0 && s > 0) {
      const opts = [(d + 1) % 4, (d + 3) % 4].filter((nd) => inb(x + DX[nd], y + DY[nd]) && !seen.has((y + DY[nd]) * N + x + DX[nd]));
      const ahead = inb(x + DX[d], y + DY[d]) && !seen.has((y + DY[d]) * N + x + DX[d]);
      if (opts.length && (!ahead || R() < 0.55)) { const nd = opts[Math.floor(R() * opts.length)]; cell.turn = nd; turns.push(cell); d = nd; }
    }
    const nx = x + DX[d], ny = y + DY[d];
    if (!inb(nx, ny)) return turns.length === need ? { src, cells, turns, end: null } : null;
    if (seen.has(ny * N + nx)) return null;
    if (turns.length === need && cells.length > need + 1 && R() < 0.25) return { src, cells, turns, end: ny * N + nx };
    x = nx; y = ny;
  }
  return null;
}
const ri = (R, [a, b]) => a + Math.floor(R() * (b - a + 1));

function build(N, wp, k, lampsN, R) {
  const type = new Array(N * N).fill(EMPTY), fixedState = {};
  for (const c of wp.turns) { type[c.i] = MIRROR; fixedState[c.i] = BOUNCE[0][c.din] === c.turn ? 0 : 1; }
  if (wp.end != null) type[wp.end] = WALL;
  // lamps: straight path cells, preferring cells after the last turn
  const straight = wp.cells.filter((c, j) => j > 0 && type[c.i] === EMPTY);
  const lastTurn = wp.cells.indexOf(wp.turns[wp.turns.length - 1]);
  const late = straight.filter((c) => wp.cells.indexOf(c) > lastTurn), early = straight.filter((c) => wp.cells.indexOf(c) <= lastTurn && wp.cells.indexOf(c) > wp.cells.indexOf(wp.turns[0]));
  if (!late.length) return null;
  const lamps = [late[late.length - 1 - Math.floor(R() * Math.min(2, late.length))].i];
  const pool = [...early, ...late].map((c) => c.i).filter((i) => !lamps.includes(i));
  while (lamps.length < lampsN && pool.length) lamps.push(pool.splice(Math.floor(R() * pool.length), 1)[0]);
  if (lamps.length < lampsN) return null;
  for (const l of lamps) type[l] = LAMP;
  // decoration walls off the path (1 + N/3), never the source cell
  const onPath = new Set(wp.cells.map((c) => c.i)); const free = [];
  for (let i = 0; i < N * N; i++) if (!onPath.has(i) && type[i] === EMPTY) free.push(i);
  for (let w = 0, nw = 1 + Math.floor(N / 3); w < nw && free.length; w++) type[free.splice(Math.floor(R() * free.length), 1)[0]] = WALL;
  // k rotatable among turns (path order), the rest fixed
  const idx = wp.turns.map((_, j) => j); const pick = [];
  while (pick.length < k) pick.push(idx.splice(Math.floor(R() * idx.length), 1)[0]);
  pick.sort((a, b) => a - b);
  const rot = pick.map((j) => wp.turns[j].i);
  let sol = 0; rot.forEach((i, r) => { sol |= fixedState[i] << r; delete fixedState[i]; });
  return { N, src: wp.src, type, rot, fixedState, sol, lamps };
}
const fin = (b, start, n, how, tries) => { b.start = start; const s = solve(b); return Object.assign(b, { par: s.par, sols: s.sols, k: b.rot.length, n, how, tries, limit: s.par + (TIERS[tierOf(n)].extra ?? LW.EXTRA) }); };
const okPar = (b, start, t) => { if (solved(b, start)) return false; const p = solve(b, start).par; return p >= t.par[0] && p <= t.par[1]; };

// GDD 2.1: tries i = 0..31 with rng(hash(seed,n,i)); then deterministic flip fallback on try 31; then FALLBACK table.
export function genBoard(seed, n, opt = {}) {
  const t = TIERS[tierOf(n)]; const N = t.N; let last = null;
  const tries = opt.forceFallback ? 0 : LW.TRIES;
  for (let i = 0; i < LW.TRIES; i++) {
    const R = rng(hash(`${seed}|${n}|${i}`));
    const k = ri(R, t.k), fx = ri(R, t.fixed), lampsN = ri(R, t.lamps);
    let b = null;
    for (let w = 0; w < 40 && !b; w++) { const wp = walk(N, R, k + fx); if (wp) b = build(N, wp, k, lampsN, R); }
    if (!b) continue;
    last = b;
    if (i >= tries) continue;
    const f = 1 + Math.floor(R() * k); const idx = b.rot.map((_, r) => r); let start = b.sol;
    for (let j = 0; j < f; j++) start ^= 1 << idx.splice(Math.floor(R() * idx.length), 1)[0];
    if (okPar(b, start, t)) return fin(b, start, n, 'gen', i + 1);
  }
  if (last && !opt.forceTable) { // deterministic: flip rotatable mirrors in path order (closest to source first)
    let start = last.sol;
    for (let r = 0; r < last.rot.length; r++) { start ^= 1 << r; if (okPar(last, start, t)) return fin(last, start, n, 'flip', LW.TRIES + 1); }
  }
  const tb = FALLBACK[tierOf(n)]; return fin(decode(tb[n % tb.length]), decode(tb[n % tb.length]).start, n, 'table', LW.TRIES + 1);
}
// built-in boards per tier (4 each). rows: . empty  # wall  / \ fixed mirror  a b rotatable (start '/' '\')  L lamp ; src "x,y,d"
export const FALLBACK = [
  ["0,2,0|....|#...|..a#|..L.","2,0,1|....|#...|...#|#Lb.","3,1,2|....|.#b.|..L#|..#.","1,0,1|...#|Lb..|....|#..."],
  ["3,2,2|#...|bL.#|./..|aa#.","0,1,0|...#|.\\#.|ab..|a.LL","3,2,2|b\\#.|.a.L|b...|..#.","3,2,2|.LLa|.#/a|..a.|#..."],  // t_da9e7634: k=3, par 2
  ["3,4,3|./\\..|.L...|..aLa|##.ba|....#","2,0,1|.#.#.|..aa.|..a/.|bL/..|L....","3,4,3|..L..|.aa..|bb.#.|\\L.\\#|.....","2,4,3|...L.|...L.|...aa|.#b\\.|#..b/"],
  ["0,1,0|.a\\.bL|.bLb/.|..aa..|.....#|......|#....#","0,4,0|/L...a|b.ba.a|La....|.aaL.#|.../..|.#.#..","0,2,0|b..L.b|\\a.#..|./....|.#..ab|.aL#..|.\\..b#","1,0,1|..a..b|.aa..L|...#..|.#.#ab|L..ab\\|...\\./"],
];
export function decode(s) {
  const [src, ...rows] = s.split('|'); const N = rows.length; const [x, y, d] = src.split(',').map(Number);
  const type = [], fixedState = {}, rot = [], lamps = []; let start = 0;
  rows.forEach((row, yy) => [...row].forEach((ch, xx) => { const i = yy * N + xx; type[i] = EMPTY;
    if (ch === '#') type[i] = WALL; else if (ch === 'L') { type[i] = LAMP; lamps.push(i); } else if (ch === '/' || ch === '\\') { type[i] = MIRROR; fixedState[i] = ch === '/' ? 0 : 1; } else if (ch === 'a' || ch === 'b') { type[i] = MIRROR; rot.push(i); } }));
  // rotatable in beam order of the all-'/' trace is not needed; keep row order and set start bits
  rot.forEach((i, r) => { const ch = rows[Math.floor(i / N)][i % N]; if (ch === 'b') start |= 1 << r; });
  return { N, src: { x, y, d }, type, rot, fixedState, lamps, start, sol: null };
}

// ---- game state machine (GDD 2.0) ----
export function createGame(seed, opt = {}) {
  const g = { seed: String(seed), phase: 'ready', tick: 0, left: LW.ACTIVE, n: 0, board: null, mask: 0, used: 0, boards: 0, score: 0, parSolves: 0, mult: 1,
    resets: 0, skips: 0, log: [], ev: [], lock: {}, trans: 0, fallback: 0, opt };
  return g;
}
function nextBoard(g) {
  g.n++; g.board = genBoard(g.seed, g.n, g.opt); g.mask = g.board.start; g.used = 0; g.lock = {};
  if (g.board.how !== 'gen') { g.fallback++; g.ev.push({ t: g.tick, k: 'fallback', n: g.n, how: g.board.how }); }
  const b = g.board, fixed = b.type.filter((t, i) => t === MIRROR && !b.rot.includes(i)).length;
  g.ev.push({ t: g.tick, k: 'board', n: g.n, N: b.N, k_: b.k, par: b.par, lamps: b.lamps.length, fixed });
}
export function start(g) { if (g.phase !== 'ready') return false; g.phase = 'play'; g.log.push({ t: g.tick, a: 'start' }); nextBoard(g); return true; }
function over(g) { if (g.left <= 0) { g.left = 0; g.phase = 'result'; g.ev.push({ t: g.tick, k: 'end' }); return true; } return false; }
// tap rotatable mirror at cell index c. Returns what happened (for UI feedback). Ignored inputs never change state.
export function tap(g, c) {
  if (g.phase !== 'play') return { r: 'ignored' };
  const b = g.board, r = b.rot.indexOf(c);
  if (r < 0) return { r: 'inert' };                                   // fixed mirror / wall / empty / lamp
  if ((g.lock[c] || 0) > g.tick) return { r: 'locked' };              // rotating
  g.log.push({ t: g.tick, a: 'tap', c });
  g.mask ^= 1 << r; g.used++; g.lock[c] = g.tick + LW.ROT;
  const tr = trace(b, g.mask);
  if (tr.all) {
    const S = LW.SCORE, isPar = g.used === b.par;
    const bonus = isPar ? S.bonus * g.mult : 0, pts = S.base + (b.limit - g.used) * S.left + bonus;
    g.score += pts; g.boards++; if (isPar) g.parSolves++;
    g.ev.push({ t: g.tick, k: 'solve', n: g.n, used: g.used, par: b.par, pts, bonus, mult: isPar ? g.mult : 0 });
    g.mult = isPar ? Math.min(S.multMax, g.mult + 1) : 1;
    g.phase = 'trans'; g.trans = LW.TRANS; return { r: 'solve', pts, bonus, lit: tr.lit };
  }
  if (g.used >= b.limit) {
    g.mask = b.start; g.used = 0; g.mult = 1; g.resets++; g.left -= LW.RESET_PEN; g.lock = { [c]: g.tick + LW.ROT }; // t_da9e7634: keep rotation lock across limit reset (fast double tap must not eat the new budget)
    g.ev.push({ t: g.tick, k: 'reset', n: g.n }); over(g); return { r: 'reset', lit: tr.lit };
  }
  if (b.limit - g.used === 1) g.ev.push({ t: g.tick, k: 'warn', n: g.n });
  return { r: 'turn', lit: tr.lit };
}
export function skip(g) {
  if (g.phase !== 'play') return false;
  g.log.push({ t: g.tick, a: 'skip' }); g.skips++; g.mult = 1; g.left -= LW.SKIP_PEN; g.ev.push({ t: g.tick, k: 'skip', n: g.n });
  if (!over(g)) nextBoard(g); return true;
}
// one fixed tick (only while playing / transitioning; ready, pause, result are input-wait states → caller doesn't step)
export function step(g) {
  if (g.phase !== 'play' && g.phase !== 'trans') return;
  g.tick++; g.left--;
  if (g.phase === 'trans' && --g.trans <= 0) { g.phase = 'play'; nextBoard(g); }
  over(g);
}
export const record = (g) => ({ boards: g.boards, score: g.score, parSolves: g.parSolves });
export const better = (a, b) => !b || a.boards > b.boards || (a.boards === b.boards && a.score > b.score);

// ---- replay & bot policies (evidence only) ----
export function replay(seed, log, opt) {
  const g = createGame(seed, opt); let j = 0;
  const apply = () => { while (j < log.length && log[j].t === g.tick) { const e = log[j++]; if (e.a === 'start') start(g); else if (e.a === 'tap') tap(g, e.c); else if (e.a === 'skip') skip(g); } };
  apply(); while (g.phase !== 'result' && g.tick < 100000) { step(g); apply(); }
  return g;
}
const nearest = (b, mask) => { let best = null, bd = 99; for (const s of b.sols) { const d = pop(s ^ mask); if (d < bd) { bd = d; best = s; } } return best; };
export const POLICIES = {
  idle: () => null,
  sameMirror: (g) => (g.tick % 10 === 0 ? { a: 'tap', c: g.board.rot[0] } : null),
  skipSpam: (g) => (g.tick % 10 === 0 ? { a: 'skip' } : null),
  random: (g, R) => (g.tick % 10 === 0 ? { a: 'tap', c: g.board.rot[Math.floor(R() * g.board.rot.length)] } : null),
  // oracle: knows the nearest solution, taps one differing mirror every 10 ticks (0.17 s)
  safe: (g) => { if (g.tick % 10) return null; const s = nearest(g.board, g.mask); const diff = s ^ g.mask; for (let r = 0; r < g.board.rot.length; r++) if ((diff >> r) & 1) return { a: 'tap', c: g.board.rot[r] }; return null; },
};
export function simulate(seed, policy, opt) {
  const g = createGame(seed, opt); const R = rng(hash('pol|' + seed + '|' + policy)); start(g);
  while (g.phase !== 'result') {
    if (g.phase === 'play') { const a = POLICIES[policy](g, R); if (a) { if (a.a === 'tap') tap(g, a.c); else skip(g); } }
    if (g.phase === 'result') break; step(g);
  }
  return g;
}
export function encode(b, start = b.start) {
  const N = b.N; const rows = [];
  for (let y = 0; y < N; y++) { let s = ''; for (let x = 0; x < N; x++) { const i = y * N + x, t = b.type[i], r = b.rot.indexOf(i);
    s += t === WALL ? '#' : t === LAMP ? 'L' : t === MIRROR ? (r >= 0 ? ((start >> r) & 1 ? 'b' : 'a') : b.fixedState[i] ? '\\' : '/') : '.'; } rows.push(s); }
  return `${b.src.x},${b.src.y},${b.src.d}|${rows.join('|')}`;
}
