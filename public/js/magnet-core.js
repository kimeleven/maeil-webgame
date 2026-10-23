// Magnet Harbor rule engine (prototype, t_1c491685). DOM-free, deterministic, fixed step 1/60 s.
// GDD r2: workspace/maeil-arcade-local/games/magnet-harbor/GDD.md (2.0 time, 2.1 stacking/departure, 2.2 coords).
// All tunables live in MH. Same seed + same input log → same result (state quantized every tick).
export const MH = {
  HZ: 60, ACTIVE: 5400,            // 90 s of active time
  AUTO: 360, BLINK: 120,           // auto drop 6 s from cargo-ready tick, blink last 2 s
  COOL: 36, FALL: 21, DEPART: 120, // 0.6 s cooldown, 0.35 s fall, 2 s departure
  LIVES: 3,
  W: 9, SHIP_CX: 4.5, COLS: 6, MAXH: 3, CRANE0: 0.5, // world in cell widths; ship covers 1.5..7.5
  VMAX: 10.8 / 60,                 // 1.2 screen widths per second
  ROPE: 2.5, G: 30,                // pendulum length (cells), gravity (cells/s²)
  PERFECT: 0.15, LAND: 0.5,
  L: 10,                           // tilt limit |roll°| × |CoM offset (cols)|
  DROP_GAP: 30,                    // ≤1 rule drop per 0.5 s
  SEG: [ // from (s), roll amp (deg), period (s), damping, 2-cell share, target cells, heave, wind
    { t: 0, amp: 0, per: 3, damp: 6, two: 0, target: 6, heave: 0 },
    { t: 10, amp: 4, per: 3.0, damp: 1.6, two: 0, target: 8, heave: 0 },
    { t: 20, amp: 4, per: 3.0, damp: 1.6, two: 0.3, target: 8, heave: 0 },
    { t: 30, amp: 7, per: 2.4, damp: 0.7, two: 0.5, target: 8, heave: 0 },
    { t: 60, amp: 10, per: 2.0, damp: 0.7, two: 0.5, target: 10, heave: 0.12, wind: true },
  ],
  WIND_F: 9, WIND_LEN: 180, WIND_WARN: 60,
  SCORE: { land: 10, perfect: 25, multMax: 3, depart: 50, balance: 20 },
};
const q3 = (v) => Math.round(v * 1000) / 1000;   // 1/1000 quantization (angle in rad, x in cells)
const q2 = (v) => Math.round(v * 100) / 100;
export function hash(s) { let h = 2166136261 >>> 0; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
export function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const u = (seed, ...k) => rng(hash(seed + '|' + k.join('|')))();
export const segAt = (tick) => { const s = tick / MH.HZ; let r = MH.SEG[0]; for (const x of MH.SEG) if (s >= x.t) r = x; return r; };
export const colCenter = (c, w = 1) => c - 2.5 + (w - 1) / 2; // ship-relative x of a box's centre

export function createGame(seed) {
  const s = String(seed);
  const w0 = 61 + Math.floor(u(s, 'w0') * 4), w1 = 75 + Math.floor(u(s, 'w1') * 6);
  return {
    seed: s, phase: 'ready', tick: 0, ftick: 0,
    phi: u(s, 'phi') * Math.PI * 2,
    winds: [w0 * 60, w1 * 60].map((at, i) => ({ at, dir: u(s, 'wd', i) < 0.5 ? -1 : 1 })),
    crane: { x: MH.CRANE0, v: 0 }, th: 0, om: 0, roll: 0, heave: 0,
    cargo: null, cargoN: 0, cool: 0, falling: null, depart: 0,
    cols: Array.from({ length: MH.COLS }, () => []), boxN: 0, ship: null, ships: 0,
    fails: 0, score: 0, mult: 1, perfects: 0, dropGap: 0, over: false, overWhy: '',
    events: [], log: [], placed: [], last: { tx: null, dir: 0 },
  };
}
// cargo i: size depends on the segment at its ready tick, but the draw is fixed per (seed, i)
function nextCargo(g) {
  const sg = segAt(g.tick), i = g.cargoN++;
  // GDD 3: the 2-cell box must show up by 30 s → the first cargo after 20 s is always 2-cell
  const w = sg.two && !g.twoSeen ? 2 : u(g.seed, 'c', i) < sg.two ? 2 : 1; if (w === 2) g.twoSeen = true;
  const th = g.ftick > 0 && sg.damp < 6 && !g.lastPerfect ? q3((u(g.seed, 'th', i) - 0.5) * 0.3) : 0;
  g.cargo = { i, w, ready: g.tick, auto: MH.AUTO }; g.th = th; g.om = 0;
  ev(g, 'ready', { i, w });
}
function newShip(g) { g.ship = { n: g.ships + 1, target: segAt(g.tick).target, at: g.tick }; g.cols = Array.from({ length: MH.COLS }, () => []); ev(g, 'ship', { target: g.ship.target }); }
const ev = (g, k, d = {}) => g.events.push({ k, tick: g.tick, ...d });
export const heights = (g) => g.cols.map((c) => c.length);
export function load(g) { let n = 0; const seen = new Set(); for (const col of g.cols) for (const b of col) if (b.k === 'box' && !seen.has(b.id)) { seen.add(b.id); n += b.w; } return n; }
export const usedCols = (g) => g.cols.filter((c) => c.some((b) => b.k === 'box')).length;
export function com(g) { let m = 0, s = 0; const seen = new Set(); for (const col of g.cols) for (const b of col) if (b.k === 'box' && !seen.has(b.id)) { seen.add(b.id); m += b.w; s += b.w * colCenter(b.c, b.w); } return m ? s / m : 0; }

export function start(g) { if (g.phase !== 'ready') return false; g.phase = 'play'; newShip(g); nextCargo(g); ev(g, 'start'); return true; }

// ship motion: function of active time only (deterministic)
function shipMotion(g) {
  const sg = segAt(g.tick), t = g.tick / MH.HZ;
  g.roll = sg.amp ? q2(sg.amp * Math.sin((2 * Math.PI * t) / sg.per + g.phi)) : 0;
  g.heave = sg.heave ? q3(sg.heave * Math.sin((2 * Math.PI * t) / (sg.per * 1.7) + g.phi * 0.5)) : 0;
}
export function windAt(g, tick = g.tick) { for (const w of g.winds) { if (tick >= w.at && tick < w.at + MH.WIND_LEN) return { on: true, dir: w.dir }; if (tick >= w.at - MH.WIND_WARN && tick < w.at) return { warn: true, dir: w.dir }; } return {}; }

// input: { tx: target world x | null, dir: -1|0|1, release: bool } — applied this tick
export function step(g, inp = {}) {
  if (g.over || g.phase === 'ready' || g.phase === 'result') return;
  const rec = inp.tx != null ? q3(inp.tx) : null;
  if (rec !== g.last.tx || (inp.dir | 0) !== g.last.dir || inp.release) { g.log.push([g.tick, rec, inp.dir | 0, inp.release ? 1 : 0]); g.last = { tx: rec, dir: inp.dir | 0 }; }
  shipMotion(g);
  const departing = g.phase === 'depart';
  // crane (kinematic, capped speed). Input is ignored during departure.
  const c = g.crane; let v = 0;
  if (!departing) { if (inp.dir) v = inp.dir * MH.VMAX; else if (rec != null) v = Math.max(-MH.VMAX, Math.min(MH.VMAX, rec - c.x)); }
  const nx = q3(Math.max(0, Math.min(MH.W, c.x + v))); const vel = (nx - c.x) * MH.HZ; const acc = (vel - c.v) * MH.HZ;
  c.x = nx; c.v = q3(vel);
  // damped pendulum on the cargo (state θ, ω), crane acceleration + wind push it
  if (g.cargo) {
    const sg = segAt(g.tick), dt = 1 / MH.HZ, wd = windAt(g);
    const f = wd.on ? wd.dir * MH.WIND_F : 0;
    const a = -(MH.G / MH.ROPE) * Math.sin(g.th) - ((acc - f) / MH.ROPE) * Math.cos(g.th) - sg.damp * g.om;
    g.om = q3(g.om + a * dt); g.th = q3(Math.max(-1.2, Math.min(1.2, g.th + g.om * dt)));
  }
  if (!departing) {
    if (g.cool > 0 && --g.cool === 0 && !g.cargo) nextCargo(g);
    if (g.cargo) {
      if (inp.release) release(g, 'tap');
      else if (g.cargo.ready !== g.tick && --g.cargo.auto <= 0) release(g, 'auto');
    }
  }
  // falling cargo: straight line, fixed 21 ticks, landing x fixed at release
  if (g.falling && g.tick >= g.falling.land) land(g);
  // rule drops: step rule first, then tilt; at most one per 0.5 s, never during departure
  if (g.dropGap > 0) g.dropGap--;
  if (!departing && !g.over && g.dropGap === 0) ruleDrop(g);
  if (departing && --g.depart <= 0) { g.phase = 'play'; newShip(g); if (!g.cargo && g.cool === 0) nextCargo(g); }
  g.tick++; g.ftick++;
  if (g.tick >= MH.ACTIVE && !g.over) end(g, 'time');
}
export const cargoX = (g) => q3(g.crane.x + MH.ROPE * Math.sin(g.th));
export const cargoVx = (g) => g.crane.v + MH.ROPE * Math.cos(g.th) * g.om;
export const landX = (g) => q3(cargoX(g) + cargoVx(g) * (MH.FALL / MH.HZ));
function release(g, why) {
  const cg = g.cargo; if (!cg) return;
  const x0 = cargoX(g), xl = landX(g);
  g.falling = { ...cg, x0, xl, at: g.tick, land: g.tick + MH.FALL, why };
  g.cargo = null; g.cool = MH.COOL; ev(g, 'release', { i: cg.i, why, x: x0, xl });
}
function fail(g, why, d = {}) { g.fails++; g.mult = 1; ev(g, 'fall', { why, ...d }); if (g.fails >= MH.LIVES) end(g, 'lives'); }
// snap: landing x → ship-relative x → column (roll/heave not used for snapping, GDD 2.2)
export function snap(xl, w) {
  const rel = xl - MH.SHIP_CX, c = Math.max(0, Math.min(MH.COLS - w, Math.round(rel + 2.5 - (w - 1) / 2)));
  return { c, err: Math.abs(rel - colCenter(c, w)), rel };
}
function land(g) {
  const f = g.falling; g.falling = null; g.lastPerfect = false;
  const { c, err } = snap(f.xl, f.w);
  if (err >= MH.LAND) return fail(g, 'sea', { i: f.i, xl: f.xl });
  const span = Array.from({ length: f.w }, (_, k) => c + k);
  const seat = Math.max(...span.map((k) => g.cols[k].length)) + 1;
  if (seat > MH.MAXH) return fail(g, 'over', { i: f.i, c });
  const id = ++g.boxN;
  for (const k of span) { while (g.cols[k].length < seat - 1) g.cols[k].push({ k: 'block' }); g.cols[k].push({ k: 'box', id, w: f.w, c, lv: seat }); }
  const perfect = err < MH.PERFECT;
  if (perfect) { g.score += MH.SCORE.perfect * g.mult; g.mult = Math.min(MH.SCORE.multMax, g.mult + 1); g.perfects++; g.lastPerfect = true; }
  else { g.score += MH.SCORE.land; g.mult = 1; }
  g.placed.push({ id, ship: g.ship.n, c, lv: seat, w: f.w, tick: g.tick });
  ev(g, 'land', { i: f.i, id, c, lv: seat, w: f.w, perfect, err: q3(err) });
  // step rule is applied in the same tick (landing-caused violation drops immediately)
  if (stepViolation(g) >= 0) { g.dropGap = 0; ruleDrop(g); }
  if (!g.over && load(g) >= g.ship.target && usedCols(g) >= 4) departShip(g);
}
function departShip(g) {
  const sg = segAt(g.tick), maxRoll = sg.amp;
  const margin = 1 - (Math.abs(com(g)) * maxRoll) / MH.L;
  g.score += MH.SCORE.depart + (margin >= 0.5 ? MH.SCORE.balance : 0);
  g.ships++; g.phase = 'depart'; g.depart = MH.DEPART;
  ev(g, 'depart', { n: g.ships, load: load(g), cols: usedCols(g), margin: q3(margin), shape: heights(g) });
  g.lastShape = g.cols.map((col) => col.map((b) => b.k + (b.w || '')));
}
// index of a column that is ≥3 higher than its lower neighbour (deck edge: one neighbour), else -1
export function stepViolation(g) {
  const h = heights(g); let best = -1, gap = 2;
  for (let c = 0; c < MH.COLS; c++) { const nb = Math.min(c > 0 ? h[c - 1] : Infinity, c < MH.COLS - 1 ? h[c + 1] : Infinity); if (h[c] - nb > gap && topBox(g, c)) { gap = h[c] - nb; best = c; } }
  return best;
}
const topBox = (g, c) => { const t = g.cols[c][g.cols[c].length - 1]; return t && t.k === 'box' ? t : null; };
function removeTop(g, c, why) {
  const b = topBox(g, c); if (!b) return false;
  for (let k = b.c; k < b.c + b.w; k++) { const col = g.cols[k]; if (col[col.length - 1] && col[col.length - 1].id === b.id) col.pop(); }
  // a 2-cell box can leave blocks under it; trailing blocks with nothing above stay (they mark the column)
  g.dropGap = MH.DROP_GAP; ev(g, 'drop', { why, id: b.id, c: b.c, w: b.w });
  fail(g, why, { id: b.id }); return true;
}
function ruleDrop(g) {
  const sv = stepViolation(g); if (sv >= 0) return removeTop(g, sv, 'step');
  const m = com(g);
  if (Math.abs(g.roll) * Math.abs(m) > MH.L) {
    // CoM side: tallest column with a box on top (ties → outermost) — lowering the tallest never creates a new step violation
    const side = m > 0 ? [5, 4, 3] : [0, 1, 2]; let pick = -1;
    for (const c of side) if (topBox(g, c) && (pick < 0 || g.cols[c].length > g.cols[pick].length)) pick = c;
    if (pick >= 0) return removeTop(g, pick, 'tilt');
  }
  return false;
}
function end(g, why) { g.over = true; g.overWhy = why; g.phase = 'result'; g.cargo = null; ev(g, 'end', { why, ships: g.ships, score: g.score }); }
export const record = (g) => ({ ships: g.ships, score: g.score, perfects: g.perfects });
export const better = (a, b) => !b || a.ships > b.ships || (a.ships === b.ships && a.score > b.score);
export const activeSec = (g) => g.tick / MH.HZ;

// ---- replay & policies (shared by node tests/sim and browser checks) ----
export function replay(seed, log, maxTicks = MH.ACTIVE + 2000) {
  const g = createGame(seed); start(g); let i = 0, cur = { tx: null, dir: 0 };
  for (let n = 0; n < maxTicks && !g.over; n++) {
    let rel = false;
    while (i < log.length && log[i][0] === g.tick) { cur = { tx: log[i][1], dir: log[i][2] }; rel = rel || !!log[i][3]; i++; }
    step(g, { ...cur, release: rel });
  }
  return g;
}
export function simulate(seed, policy, maxTicks = MH.ACTIVE + 2000) {
  const g = createGame(seed); start(g); const P = typeof policy === 'function' ? policy : POLICIES[policy](seed);
  for (let n = 0; n < maxTicks && !g.over; n++) step(g, P(g) || {});
  return g;
}
const worldCol = (c, w = 1) => MH.SHIP_CX + colCenter(c, w);
export const POLICIES = {
  idle: () => () => ({}),
  // stay put and hammer release every tick
  stayTap: () => () => ({ release: true }),
  // park over one column and release as soon as possible
  oneCol: (seed) => { const c = hash(seed) % 6; return (g) => ({ tx: worldCol(c, 1), release: !!g.cargo && Math.abs(g.crane.x - worldCol(c)) < 0.01 }); },
  // move to random x and release asap
  randomTap: (seed) => { const r = rng(hash(seed + 'rnd')); let tx = 4.5; return (g) => { if (g.tick % 18 === 0) tx = 1 + r() * 7; return { tx, release: !!g.cargo }; }; },
  // wait for the swing to settle, aim the lowest legal column (spreading across ≥4 cols), compensate landing x
  safe: () => (g) => {
    if (!g.cargo) return { tx: g.crane.x };
    const w = g.cargo.w, h = heights(g); let best = null;
    for (let c = 0; c <= 6 - w; c++) {
      const span = Array.from({ length: w }, (_, k) => c + k), seat = Math.max(...span.map((k) => h[k])) + 1; if (seat > 3) continue;
      const hh = h.slice(); for (const k of span) hh[k] = seat;
      const bad = hh.some((x, k) => x - Math.min(k > 0 ? hh[k - 1] : 9, k < 5 ? hh[k + 1] : 9) >= 3); if (bad) continue;
      const waste = span.reduce((a, k) => a + (seat - 1 - h[k]), 0);
      const cost = seat * 10 + waste * 6 + Math.abs(colCenter(c, w) + com(g) * 0.5) * 2;
      if (!best || cost < best.cost) best = { c, cost };
    }
    if (!best) best = { c: 0 };
    const tx = worldCol(best.c, w), settled = Math.abs(g.th) < 0.02 && Math.abs(g.om) < 0.05;
    const near = Math.abs(landX(g) - tx) < 0.08 && Math.abs(g.crane.x - tx) < 0.02;
    return { tx, release: settled && near || (g.cargo.auto < 20 && Math.abs(landX(g) - tx) < 0.45) };
  },
};
