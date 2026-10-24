// Odd Tile (다른 하나) deterministic core — GDD r3 (games/odd-tile/GDD.md) [t_2964ede9, t_6b058523]
// DOM-free. All times are integer *active* ms relative to [start] (game clock). Grid model mirrors
// projects/.../02_수행/odd-tile-r2-verify.py (shapes, dots, 3% pixel rule) so the validity table matches.
export const OT = { T: 60000, W: 16, G: 50, ANIM_OK: 300, ANIM_BAD: 600, TRIES: 8, MINDIFF: 0.03, BLOCK: 9 };
export const SHAPES = ['circle', 'triangle', 'square'];
export const BASE_SCALE = 0.8, DOT_R = 0.06;
export const DOT_LAYOUT = { 1: [[0, 0]], 2: [[-0.08, 0], [0.08, 0]], 3: [[-0.08, 0.05], [0.08, 0.05], [0, -0.07]], 4: [[-0.07, -0.07], [0.07, -0.07], [-0.07, 0.07], [0.07, 0.07]] };
// rows of tableOf(k): attribute -> parameter
export const ROWS = {
  T: { size: 2 },
  R1: { rot: 90, dots: [1, 3], size: 1.5 },
  R2: { rot: 45, dots: [2, 3], size: 1.3, round: true },
  R3: { rot: 30, dots: [2, 4], size: 1.2, round: true },
};
// §4.2 validity table (X = never generated). Verified at runtime by the renderer (R7d).
const ALL = ['circle', 'triangle', 'square'];
export const VALID = {
  T: { size: ALL },
  R1: { rot: ['triangle'], dots: ALL, size: ALL },
  R2: { rot: ['triangle', 'square'], dots: ALL, size: ALL, round: ['triangle', 'square'] },
  R3: { rot: ['triangle', 'square'], dots: ALL, size: ALL, round: ['triangle', 'square'] },
};
export const isValid = (row, attr, shape) => !!(VALID[row] && VALID[row][attr] && VALID[row][attr].includes(shape));
export function tableOf(k) {
  if (k <= 3) return { n: 2, dl: 5000, row: 'T' };
  if (k <= 12) return { n: 3, dl: 3000, row: 'R1' };
  if (k <= 24) return { n: 3, dl: 2500, row: 'R2' };
  return { n: 4, dl: Math.max(1800, 2500 - 100 * Math.floor((k - 25) / 6)), row: 'R3' };
}
// ---- rng ----
export function fnv1a32(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; }
export function mulberry32(a) { return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// ---- glyphs ----
// glyph = {shape, scale, rot, round, dots}
export function glyphPair(shape, attr, param, bd) {
  const base = { shape, scale: BASE_SCALE, rot: 0, round: false, dots: bd };
  const odd = { ...base };
  if (attr === 'rot') odd.rot = param;
  else if (attr === 'size') odd.scale = BASE_SCALE * param;
  else if (attr === 'round') odd.round = true;
  else if (attr === 'dots') { base.dots = param[0]; odd.dots = param[1]; }
  return [base, odd];
}
export function diffAttrs(a, b) { return ['shape', 'scale', 'rot', 'round', 'dots'].filter((k) => a[k] !== b[k]); }
// polygon in cell units centered at 0 (y down); null for circle
export function glyphPoly(g) {
  let pts;
  if (g.shape === 'circle') return null;
  if (g.shape === 'square') { const h = 0.32 * g.scale; pts = [[-h, -h], [h, -h], [h, h], [-h, h]]; }
  else { const R = 0.4 * g.scale; pts = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((a) => [R * Math.sin(a), -R * Math.cos(a)]); }
  if (g.round) {
    const out = [], n = pts.length;
    for (let i = 0; i < n; i++) { const p = pts[(i - 1 + n) % n], q = pts[i], r = pts[(i + 1) % n];
      out.push([q[0] + (p[0] - q[0]) * 0.35, q[1] + (p[1] - q[1]) * 0.35]); out.push([q[0] + (r[0] - q[0]) * 0.35, q[1] + (r[1] - q[1]) * 0.35]); }
    pts = out;
  }
  const t = (g.rot * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t);
  return pts.map(([x, y]) => [x * c - y * s, x * s + y * c]);
}
export const circleR = (g) => 0.36 * g.scale;
// ---- grid generation (§4.1) ----
// t_6b058523 (PO t_25646637): the old base 0.8 → odd 1.6 clipped at the cell edge. Keep the ×2 ratio, answer cells and 5 s,
// shrink both: base 0.4 / odd 0.8 (TUT_SCALE). Dots scale with the shape (ds = scale / BASE_SCALE) so they stay inside.
// Generated grids (k ≥ 4) are untouched (no ds → 1).
export const TUT_SCALE = 0.4;
export const TUTORIAL = [ // k = 1..3: 2x2, size x2, 5 s, fixed answer cells (BR, TL, TR)
  { k: 1, n: 2, dl: 5000, row: 'T', ans: 3, attr: 'size', base: { shape: 'circle', scale: TUT_SCALE, rot: 0, round: false, dots: 1 } },
  { k: 2, n: 2, dl: 5000, row: 'T', ans: 0, attr: 'size', base: { shape: 'triangle', scale: TUT_SCALE, rot: 0, round: false, dots: 2 } },
  { k: 3, n: 2, dl: 5000, row: 'T', ans: 1, attr: 'size', base: { shape: 'square', scale: TUT_SCALE, rot: 0, round: false, dots: 1 } },
].map((g) => { const base = { ...g.base, ds: TUT_SCALE / BASE_SCALE }, sc = TUT_SCALE * 2; return { ...g, base, odd: { ...g.base, scale: sc, ds: sc / BASE_SCALE }, glyph: 'tutorial' }; });
export const P9 = [0, 7, 5, 3, 8, 1, 6, 2, 4];
export const P16 = [0, 10, 5, 15, 3, 9, 6, 12, 1, 14, 7, 11, 2, 8, 13, 4];
export const blockKs = (b) => Array.from({ length: OT.BLOCK }, (_, i) => 4 + OT.BLOCK * b + i);
export const centerOf = (n) => (n === 3 ? 4 : -1);
const tailOf = (grids) => grids.slice(-2).map((g) => [g.n, g.ans]);
export const TUT_TAIL = tailOf(TUTORIAL);
function makeGrid(k, ans, base, attr) {
  const t = tableOf(k), param = ROWS[t.row][attr];
  const [b, o] = glyphPair(base.shape, attr, param, base.dots);
  return { k, n: t.n, dl: t.dl, row: t.row, ans, attr, base: b, odd: o, glyph: 'gen' };
}
export function attempt(seed, b, n) {
  const rng = mulberry32(fnv1a32(`${seed}#${b}#${n}`)), out = [], cnt = {}, ks = blockKs(b);
  let prev = null;
  for (const k of ks) {
    const t = tableOf(k), cells = t.n * t.n;
    // sample a cell with soft avoidance (validator still decides)
    let ans = Math.floor(rng() * cells);
    for (let i = 0; i < 6; i++) { const c = cnt[`${t.n}:${ans}`] || 0; const bad = (prev && prev[0] === t.n && prev[1] === ans) || (t.n === 3 ? c >= 2 || (ans === 4 && c >= 1) : c >= 1); if (!bad) break; ans = Math.floor(rng() * cells); }
    cnt[`${t.n}:${ans}`] = (cnt[`${t.n}:${ans}`] || 0) + 1; prev = [t.n, ans];
    const shape = SHAPES[Math.floor(rng() * 3)];
    const attrs = Object.keys(ROWS[t.row]).filter((a) => isValid(t.row, a, shape));
    const attr = attrs[Math.floor(rng() * attrs.length)];
    const dots = 1 + Math.floor(rng() * 4);
    out.push(makeGrid(k, ans, { shape, dots }, attr));
  }
  return out;
}
// returns list of failed condition ids ('' list = pass)
export function validateWhy(block, b, prevTail) {
  const why = new Set(), ks = blockKs(b);
  if (block.length !== ks.length) why.add('len');
  block.forEach((g, i) => {
    const t = tableOf(ks[i]);
    if (g.k !== ks[i] || g.n !== t.n || g.dl !== t.dl || g.row !== t.row || !(g.attr in ROWS[t.row])) why.add('4');
    if (g.ans < 0 || g.ans >= g.n * g.n || !Number.isInteger(g.ans)) why.add('1');
    const d = diffAttrs(g.base, g.odd), want = { rot: 'rot', size: 'scale', round: 'round', dots: 'dots' }[g.attr];
    if (d.length !== 1 || d[0] !== want || !isValid(g.row, g.attr, g.base.shape)) why.add('1');
    const [eb, eo] = glyphPair(g.base.shape, g.attr, ROWS[t.row][g.attr], g.base.dots);
    if (JSON.stringify(eb) !== JSON.stringify(g.base) || JSON.stringify(eo) !== JSON.stringify(g.odd)) why.add('1');
  });
  for (const n of [3, 4]) {
    const cells = block.filter((g) => g.n === n).map((g) => g.ans), c = {};
    cells.forEach((x) => (c[x] = (c[x] || 0) + 1));
    const mx = Math.max(0, ...Object.values(c));
    if (n === 3 && (mx > 2 || (c[4] || 0) > 1)) why.add('2');
    if (n === 4 && mx > 1) why.add('2');
  }
  const full = [...(prevTail || []), ...block.map((g) => [g.n, g.ans])];
  for (let i = 1; i < full.length; i++) if (full[i][0] === full[i - 1][0] && full[i][1] === full[i - 1][1]) why.add('3');
  if (new Set(block.map((g) => g.base.shape)).size < 3) why.add('5');
  return [...why];
}
export const realValidate = (block, b, prevTail) => validateWhy(block, b, prevTail).length === 0;
export function fallbackBlock(b, prevTail) {
  const ks = blockKs(b);
  for (let r = 0; r < 16; r++) {
    const block = ks.map((k, i) => { const t = tableOf(k), P = t.n === 3 ? P9 : P16; return makeGrid(k, P[(i + r) % P.length], { shape: SHAPES[i % 3], dots: 1 + (i % 4) }, 'size'); });
    if (realValidate(block, b, prevTail)) return block.map((g) => ({ ...g, glyph: 'fallback-block', fbRot: r }));
  }
  throw new Error('fallback impossible'); // never (R7c)
}
export function generate(seed, b, prevTail, validate = realValidate) {
  for (let n = 0; n < OT.TRIES; n++) { const blk = attempt(seed, b, n); if (validate(blk, b, prevTail)) return { grids: blk, fallback: false, tries: n + 1 }; }
  return { grids: fallbackBlock(b, prevTail), fallback: true, tries: OT.TRIES };
}
// lazily generated grid sequence for a seed
export function makeDeck(seed, validate = realValidate) {
  const blocks = [], logs = [];
  const ensure = (b) => { while (blocks.length <= b) { const i = blocks.length, tail = i === 0 ? TUT_TAIL : tailOf(blocks[i - 1].grids); const t0 = (globalThis.performance || Date).now(); const r = generate(seed, i, tail, validate); r.ms = (globalThis.performance || Date).now() - t0; blocks.push(r); if (r.fallback) logs.push(`block=fallback:${i}`); } };
  return { blocks, logs, ensure, grid(k) { if (k <= 3) return TUTORIAL[k - 1]; const b = Math.floor((k - 4) / OT.BLOCK); ensure(b); return blocks[b].grids[(k - 4) % OT.BLOCK]; } };
}
// glyph fallback (render check failed): same shape, attribute = row size ratio, same answer cell
export function glyphFallback(g, last = false) {
  if (last) { const [b, o] = glyphPair('square', 'size', 2, g.base.dots); return { ...g, attr: 'size', base: b, odd: o, glyph: `fallback2:${g.k}` }; }
  const [b, o] = glyphPair(g.base.shape, 'size', ROWS[g.row].size, g.base.dots);
  return { ...g, attr: 'size', base: b, odd: o, glyph: `fallback:${g.k}` };
}
// ---- scoring (§5) ----
export const comboMul = (c) => (c >= 10 ? 3 : c >= 5 ? 2 : 1);
export const speedBonus = (D, t0, dl) => Math.max(0, Math.min(10, Math.floor((10 * (D - t0)) / dl)));
// ---- time engine (§2.0.1–2.0.4) ----
// input(t, cell, arr): t = event active time, arr = active arrival time (during pause = tp). Paused-time events never reach here.
// frame(now): resolve everything whose receive deadline <= now and return commits (sound/haptic/score/result) exactly once.
export function createGame(seed, opts = {}) {
  const W = OT.W, G = OT.G, T = opts.T || OT.T;
  const deck = opts.deck || makeDeck(seed, opts.validate);
  const S = { seed, k: 1, start: 0, grid: deck.grid(1), cursor: 0, inbox: [], score: 0, combo: 0, maxCombo: 0, found: 0, judged: 0,
    log: [], commits: [], over: false, endLogical: null, resultAt: null, resultShown: false, lastWin: null, drops: { late: 0, idle: 0, after: 0 }, voids: 0, lateLog: [] };
  const transform = opts.transform || ((g) => g); // UI hook: render check / glyph fallback before showing
  S.grid = transform(S.grid);
  const limitOf = () => Math.min(S.start + S.grid.dl, T);
  function finish(entry, logical, commitAt, anim) {
    S.log.push(entry); S.commits.push({ at: commitAt, entry, done: false });
    S.lastWin = { start: S.start, limit: limitOf(), entry };
    const next = logical + anim;
    if (entry.kind === 'end' || next >= T) {
      S.over = true; S.endLogical = T; const lastJ = entry.kind === 'end' ? T : Math.max(T, logical);
      S.resultAt = lastJ + G; S.commits.push({ at: S.resultAt, entry: { kind: 'result' }, done: false }); S.inbox = []; return;
    }
    S.k++; S.start = next; S.cursor = next; S.inbox = []; S.grid = transform(deck.grid(S.k));
    if (S.k >= 4 && (S.k - 4) % OT.BLOCK === 0) deck.ensure((S.k - 4) / OT.BLOCK + 1); // first grid of block b → generate b+1
  }
  function advance(now) {
    for (let guard = 0; guard < 10000 && !S.over; guard++) {
      if (now < S.start) return; // still in feedback animation of previous grid
      const lim = limitOf(), D = S.start + S.grid.dl;
      const ok = (x) => x.t >= S.cursor && x.t < lim;
      // §2.0.1 fixed receive deadline (PO t_25646637: the §36 max(t0+W+G, arr+1) extension is NOT adopted). A candidate
      // must itself arrive before t0+W+G (and before the miss/end commit lim+G); later arrivals are late_drop in input().
      const cand = S.inbox.filter((x) => ok(x) && x.arr < lim + G && x.arr < x.t + W + G).sort((a, b) => a.t - b.t || a.seq - b.seq)[0];
      if (!cand) {
        if (now < lim + G) return;
        S.drops.late += S.inbox.filter((x) => x.t >= S.cursor && x.t < lim && !x.used).length;
        if (lim === T && T <= D) finish({ k: S.k, kind: 'end', ans: S.grid.ans, glyph: S.grid.glyph, late: S.drops.late }, T, T + G, 0);
        else { S.combo = 0; S.judged++; finish({ k: S.k, kind: 'miss', ans: S.grid.ans, glyph: S.grid.glyph, at: D, late: S.drops.late }, D, D + G, OT.ANIM_BAD); }
        continue;
      }
      const t0 = cand.t, rd = t0 + W + G;
      if (now < rd) return;
      const bundle = S.inbox.filter((x) => x.t >= t0 && x.t < t0 + W && x.t < lim && x.arr < rd);
      S.inbox.filter((x) => x.t >= S.cursor && x.t < t0 && !x.used).forEach((x) => { x.used = true; S.drops.late++; });
      bundle.forEach((x) => (x.used = true));
      if (bundle.length >= 2) { S.voids++; const ve = { k: S.k, kind: 'void', t0, n: bundle.length, cells: bundle.map((x) => x.cell) }; S.log.push(ve); S.commits.push({ at: rd, entry: ve, done: false }); S.cursor = t0 + W; continue; }
      const okc = cand.cell === S.grid.ans; S.judged++;
      let pts = 0;
      if (okc) { S.combo++; S.found++; S.maxCombo = Math.max(S.maxCombo, S.combo); pts = (10 + speedBonus(D, t0, S.grid.dl)) * comboMul(S.combo); S.score += pts; } else S.combo = 0;
      finish({ k: S.k, kind: okc ? 'hit' : 'wrong', cell: cand.cell, ans: S.grid.ans, t0, pts, combo: S.combo, src: cand.src, glyph: S.grid.glyph, late: S.drops.late }, t0 + W, rd, okc ? OT.ANIM_OK : OT.ANIM_BAD);
    }
  }
  let seq = 0;
  return {
    S, deck, T, W, G,
    input(t, cell, arr = t, src = 'x') {
      advance(arr);
      if (S.over || t >= T) { S.drops.after++; return 'after'; }
      if (t < S.start) { const w = S.lastWin; if (w && t >= w.start && t < w.limit) { S.drops.late++; if (w.entry) w.entry.lateAfter = (w.entry.lateAfter || 0) + 1; return 'late_drop'; } S.drops.idle++; return 'idle'; }
      // arrived after its own receive deadline t+W+G: can never open or join a bundle → late_drop now (logical t,
      // arrival and the reason are kept in S.lateLog; never re-stamped with the arrival time).
      if (arr >= t + W + G) { S.drops.late++; S.lateLog.push({ k: S.k, t, arr, cell, src, why: 'arr>=t+W+G' }); return 'late_drop'; }
      S.inbox.push({ t, cell, arr, src, seq: seq++ }); return 'queued';
    },
    advance,
    frame(now) { advance(now); const out = []; for (const c of S.commits) if (!c.done && now >= c.at) { c.done = true; out.push(c.entry); } return out; },
    phase(now) { if (S.over) return S.resultShown ? 'result' : 'ending'; return now < S.start ? 'anim' : 'wait'; },
    get pending() { return S.inbox.length > 0; },
    replayLog() { return S.log.map((e) => ({ k: e.k, kind: e.kind, cell: e.cell, t0: e.t0 ?? e.at, late: e.late, pts: e.pts })); },
  };
}
// headless replay: inputs [{t, cell, arr}] sorted by arr, frames every f ms
export function replay(seed, inputs, f = 1000 / 60, opts = {}) {
  const g = createGame(seed, opts), commits = []; let i = 0, now = 0;
  const xs = [...inputs].sort((a, b) => a.arr - b.arr);
  while (now <= OT.T + 2000) {
    const nf = now + f;
    while (i < xs.length && xs[i].arr < nf) { g.input(xs[i].t, xs[i].cell, xs[i].arr, xs[i].src); i++; }
    now = nf; for (const e of g.frame(Math.floor(now))) commits.push({ at: Math.floor(now), ...e });
    if (g.S.over && commits.some((c) => c.kind === 'result')) break;
  }
  const S = g.S;
  return { score: S.score, found: S.found, judged: S.judged, maxCombo: S.maxCombo, voids: S.voids, drops: S.drops, log: S.log, endLogical: S.endLogical, resultAt: S.resultAt, resultShownAt: (commits.find((c) => c.kind === 'result') || {}).at, commits, game: g };
}
// skilled / unskilled sim policies used by R11 (needs grid start times → driven through the live game)
export function simPolicy(seed, policy, opts = {}) {
  const g = createGame(seed, opts); const f = 1000 / 60; let now = 0, lastK = 0, nextTap = 0; const rng = mulberry32(fnv1a32(seed + '#sim'));
  while (now < OT.T + 2000 && !(g.S.over && g.S.resultShown)) {
    const S = g.S;
    if (!S.over && now >= S.start) {
      const n = S.grid.n * S.grid.n;
      if (policy === 'skilled' && lastK !== S.k) { const t = S.start + Math.floor(S.grid.dl / 2); if (t < OT.T) { g.input(t, S.grid.ans, t); } lastK = S.k; }
      if (policy.startsWith('fixed:') && lastK !== S.k) { g.input(S.start + 200, Math.min(+policy.slice(6), n - 1), S.start + 200); lastK = S.k; }
      if (policy.startsWith('mash:')) { const gap = +policy.slice(5); if (now >= nextTap) { const t = Math.floor(now); g.input(t, Math.floor(rng() * n), t); nextTap = now + Math.max(gap, f); } }
    }
    now += f; for (const e of g.frame(Math.floor(now))) if (e.kind === 'result') g.S.resultShown = true;
  }
  const S = g.S; return { score: S.score, found: S.found, judged: S.judged, acc: S.judged ? S.found / S.judged : 0, log: S.log };
}
