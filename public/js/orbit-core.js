// Orbit Switch core (prototype, t_34f9c354). Pure logic, no DOM: same file runs in node (sim/tests)
// and is inlined into the preview page by scripts/build-orbit.mjs. All tuning numbers live in OC.
// GDD: workspace/maeil-arcade-local/games/orbit-switch/GDD.md (values are [추정] initial values).
export const OC = {
  R: [0.28, 0.42], // lane radius (inner 0, outer 1), unit = short side of the play square
  TRANS: 0.12, // lane switch duration (s); collision uses the interpolated radius during it
  COOLDOWN: 0.25, // inputs within this time after a switch start are ignored (not buffered)
  BUFFER: 0.08, // a queued input older than this is dropped
  DUR: 90,
  HIT_R: 0.045, // radial half band of an obstacle around its lane
  RING_R: 0.05,
  DOT_PAD: 0.045, // angular padding (rad) for the dot's own size
  RING_HALF: 0.13, // ring pickup half angle (rad)
  SEG: [
    { t0: 0, period: 3.0, gap: 2.0, warn: 0.8 },
    { t0: 10, period: 2.6, gap: 1.5, warn: 0.8 },
    { t0: 30, period: 2.2, gap: 1.1, warn: 0.7 },
    { t0: 60, period: 1.8, gap: 0.8, warn: 0.6 },
  ],
  REV: [70, 75], // reverse rotation window
  FIRST_WARN: 6.0, // first obstacle warning starts here
  DOOR_FROM: 20,
  CLOSE_DEG: 6,
  INVULN: 1,
  DT: 1 / 240,
  MULTS: [1, 2, 3, 5],
  MIN_WINDOW: 0.25, // every required switch gets at least this much time (prev danger end → latest start)
};
const TAU = Math.PI * 2;
const D2R = Math.PI / 180;
export const wrap = (a) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
export function hash(s) { let h = 2166136261 >>> 0; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
export function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const segIdx = (t) => (t >= 60 ? 3 : t >= 30 ? 2 : t >= 10 ? 1 : 0);
export const seg = (t) => OC.SEG[segIdx(t)];
const BREAKS = [0, 10, 30, 60, 70, 75, 1e9];
const dirAt = (t) => (t >= OC.REV[0] && t < OC.REV[1] ? -1 : 1);
export const omega = (t) => (dirAt(t) * TAU) / seg(t).period;
// dot angle (rad, clockwise from top) as a pure function of time — independent of input
export function theta(t) {
  let a = 0;
  for (let i = 0; i < BREAKS.length - 1 && t > BREAKS[i]; i++) a += omega(BREAKS[i]) * (Math.min(t, BREAKS[i + 1]) - BREAKS[i]);
  return a;
}
// obstacle center angle at time t (bars rotate against the dot)
export const obCenter = (o, t) => (o.vb ? o.c0 + o.vb * (t - o.T) : o.c0);
export const angHit = (o, t) => Math.abs(wrap(theta(t) - obCenter(o, t))) <= o.hw + OC.DOT_PAD;
export function intervals(o, from, to, step = 1 / 960) {
  const out = []; let s = null;
  for (let t = from; t <= to; t += step) { const h = angHit(o, t); if (h && s === null) s = t; if (!h && s !== null) { out.push([s, t]); s = null; } }
  if (s !== null) out.push([s, to]);
  return out;
}

// ---- level generation (deterministic per seed, rng(hash(seed)+segment)) ----
export function generate(seed) {
  const h = hash(seed);
  const R = OC.SEG.map((_, i) => rng((h + i * 0x9e3779b9) >>> 0));
  const obs = [], rings = [];
  let id = 0, doorDone = false, prevBlocked = null, prevExit = -1, lastSwitch = -9;
  const make = (type, lane, T, r) => {
    const o = { id: id++, type, lane, T, c0: theta(T), hw: 0, vb: 0 };
    if (type === 'block') o.hw = (20 + r() * 20) * D2R / 2;
    else if (type === 'door') o.hw = 14 * D2R / 2;
    else if (type === 'bar') { o.hw = 10 * D2R / 2; o.vb = -omega(T) * 0.6; }
    const warn = seg(T).warn;
    // Pass search window (t_9ad9f847). The old fixed window (warn+1.2 s before, 1.0 s after) is longer than one
    // relative lap from 60 s (dot 1.8 s; bars spin against it ≈1.1 s), so it always saw a 2nd pass and rejected
    // ~95% of bars and most late blocks — the real cause of the thin late game. An obstacle only exists from
    // warnStart to exit, so search ±0.48 lap and then verify no other pass touches the dot in that life span.
    const relP = TAU / Math.abs(omega(T) - o.vb);
    const from = T - Math.min(warn + 1.2, 0.48 * relP), to = T + Math.min(1.0, 0.48 * relP);
    const iv = intervals(o, from, to);
    if (iv.length !== 1 || iv[0][0] <= from + 1e-6 || iv[0][1] >= to - 1e-6) return null;
    o.enter = iv[0][0]; o.exit = iv[0][1]; o.warn = seg(o.enter).warn; o.warnStart = o.enter - o.warn - 0.02;
    if (intervals(o, o.warnStart - 0.1, o.exit + 0.1).length !== 1) return null; // e.g. 70/75 s reverse
    return o;
  };
  // can the player go from the previous safe lane to this obstacle's safe lane in time?
  const fits = (o) => {
    if (o.enter <= prevExit + 0.05) return false;
    if (prevBlocked === null || o.lane === prevBlocked) return true; // first or same blocked lane → no switch needed... (prev safe = new safe)
    const window = o.enter - OC.TRANS - prevExit;
    const st = Math.max(prevExit, lastSwitch + OC.COOLDOWN);
    return window >= OC.MIN_WINDOW && st + OC.TRANS <= o.enter - 0.02;
  };
  const accept = (o) => {
    if (prevBlocked !== null && o.lane !== prevBlocked) lastSwitch = Math.max(prevExit, lastSwitch + OC.COOLDOWN);
    prevBlocked = o.lane; prevExit = o.exit; obs.push(o);
  };
  // NOTE on lanes: o.lane is the BLOCKED lane; safe lane = 1 - o.lane. A switch is needed when the blocked lane changes.
  let T = OC.FIRST_WARN + 0.8 + 0.1;
  let guard = 0;
  while (T < OC.DUR - 0.6 && guard++ < 2000) {
    const si = segIdx(T), S = OC.SEG[si], r = R[si];
    let type = 'block';
    if (T >= OC.DOOR_FROM && !doorDone) type = 'door';
    else if (T >= 60) type = ['block', 'door', 'double', 'bar', 'bar'][Math.floor(r() * 5)];
    else if (T >= 30) type = ['block', 'block', 'door', 'double'][Math.floor(r() * 4)];
    else if (T >= 10 && T >= OC.DOOR_FROM) type = ['block', 'block', 'door'][Math.floor(r() * 3)];
    let lane = r() < 0.5 ? 0 : 1;
    if (type === 'double') {
      let a = make('block', lane, T, r);
      if (a && !fits(a)) { a = make('block', prevBlocked, T, r); }
      if (!a || !fits(a)) { T += 0.05; continue; }
      // second block on the other lane; push it out until its switch window is ≥ MIN_WINDOW (+ a little random slack)
      const want = OC.MIN_WINDOW + 0.03 + r() * 0.08;
      let b = null;
      for (let d = 0.3; d < 1.5; d += 0.01) { const c = make('block', 1 - a.lane, a.T + d, r); if (c && c.enter - OC.TRANS - a.exit >= want) { b = c; break; } }
      accept(a);
      if (b && fits(b)) { b.pair = a.id; a.pair = b.id; accept(b); T = b.T + S.gap; } else T = a.T + S.gap;
      if (lane >= 0) addRing(a, b);
      continue;
    }
    let o = make(type, lane, T, r);
    if (o && !fits(o)) o = make(type, prevBlocked ?? lane, T, r);
    if (!o || !fits(o)) { T += 0.05; continue; }
    if (type === 'door') doorDone = true;
    accept(o);
    addRing(o, null);
    T += S.gap * (0.9 + r() * 0.2);
  }
  function addRing(o, pairB) {
    // rings sit between obstacles; filled in a second pass once the next obstacle is known
    o._ring = true; if (pairB) pairB._ring = false;
  }
  // intro rings: outer at 3.0 s, inner at 4.6 s — '탭=전환' before the first obstacle
  rings.push({ id: 0, kind: 'ring', lane: 1, t: 3.0 }, { id: 1, kind: 'ring', lane: 0, t: 4.6 });
  let shield30 = false, shield60 = false;
  for (let i = 0; i < obs.length - 1; i++) {
    const a = obs[i], n = obs[i + 1];
    if (!a._ring) continue;
    const rr = R[segIdx(a.T)];
    if (rr() > 0.75) continue;
    const t = a.exit + (n.enter - a.exit) * (0.55 + rr() * 0.2);
    const lane = 1 - n.lane; // safe lane of the next obstacle → on the player's way
    let kind = 'ring';
    if (!shield30 && t >= 30) { kind = 'shield'; shield30 = true; } else if (!shield60 && t >= 60) { kind = 'shield'; shield60 = true; }
    rings.push({ id: rings.length, kind, lane, t });
  }
  for (const o of obs) delete o._ring;
  for (const g of rings) { g.c0 = theta(g.t); g.show = g.t - 1.2; }
  return { seed: String(seed), obs, rings };
}

// switch windows (for O5): for every required switch, time between the previous danger end and the latest start
export function switchWindows(level) {
  const out = []; let prev = null, lastSt = -9;
  for (const o of level.obs) {
    if (prev && o.lane !== prev.lane) {
      const latest = o.enter - OC.TRANS, earliest = Math.max(prev.exit, lastSt + OC.COOLDOWN);
      out.push({ at: o.enter, window: latest - prev.exit, slack: latest - earliest });
      lastSt = earliest;
    }
    prev = o;
  }
  return out;
}

// forced placement for tests (O11): one obstacle whose angular overlap with the dot is centred on time T
export function placeOb(lane, T, hwDeg = 24, type = 'block') {
  const o = { id: 0, type, lane, T, c0: theta(T), hw: (hwDeg * D2R) / 2, vb: 0 };
  const iv = intervals(o, T - 2, T + 1); o.enter = iv[0][0]; o.exit = iv[0][1]; o.warn = seg(o.enter).warn; o.warnStart = o.enter - o.warn - 0.02;
  return o;
}

// ---- runtime ----
export function createGame(level, opts = {}) {
  return {
    level, t: 0, lane: 0, trans: null, lastSwitch: -9, queued: null,
    shields: 1, invulnUntil: -1, streak: 0, bestStreak: 0, multI: 0, score: 0,
    over: false, clear: false, events: [], obState: level.obs.map(() => ({ hit: false, passed: false, sw: false, close: false })),
    ringState: level.rings.map(() => ({ got: false, missed: false })),
    log: { switches: [], ignored: [], hits: [], rings: [], warnSeen: [] }, opts,
  };
}
export const radius = (g, t = g.t) => {
  if (!g.trans) return OC.R[g.lane];
  const k = Math.min(1, Math.max(0, (t - g.trans.start) / OC.TRANS));
  return OC.R[g.trans.from] + (OC.R[g.trans.to] - OC.R[g.trans.from]) * k;
};
// input(): returns true when it started a switch. kind is for the log (tap/space/click/bot)
export function input(g, kind = 'tap') {
  if (g.over) return false;
  if (g.t - g.lastSwitch < OC.COOLDOWN - 1e-9) { g.log.ignored.push({ t: g.t, kind, why: 'cooldown' }); return false; }
  const from = g.trans ? g.trans.to : g.lane; // (cooldown > TRANS, so never mid-transit here)
  g.trans = { from, to: 1 - from, start: g.t };
  g.lane = 1 - from; g.lastSwitch = g.t;
  g.log.switches.push({ t: g.t, kind, to: g.lane });
  g.events.push({ e: 'switch', t: g.t });
  return true;
}
export function queue(g, kind) { g.queued = { t: g.t, kind }; }

export function step(g, dt = OC.DT) {
  if (g.over) return;
  if (g.queued) { if (g.t - g.queued.t <= OC.BUFFER) input(g, g.queued.kind); g.queued = null; }
  g.t += dt;
  const t = g.t;
  if (g.trans && t - g.trans.start >= OC.TRANS) g.trans = null;
  const r = radius(g);
  const L = g.level;
  for (let i = 0; i < L.obs.length; i++) {
    const o = L.obs[i], s = g.obState[i];
    if (s.passed || t < o.warnStart) continue;
    if (!s.warned) { s.warned = true; g.log.warnSeen.push({ id: o.id, type: o.type, warnStart: o.warnStart, enter: o.enter, lead: o.enter - o.warnStart, need: o.warn }); }
    if (t > o.exit + 0.02) {
      s.passed = true;
      if (!s.hit && s.sw) { g.streak++; g.bestStreak = Math.max(g.bestStreak, g.streak); g.events.push({ e: s.close ? 'close' : 'dodge', t }); }
      continue;
    }
    if (g.lastSwitch >= o.warnStart - 0.3) s.sw = true;
    const radial = Math.abs(r - OC.R[o.lane]);
    const ah = angHit(o, t);
    if (!s.hit && ah && radial < OC.HIT_R) {
      s.hit = true;
      if (t < g.invulnUntil) continue;
      g.streak = 0;
      g.log.hits.push({ t, id: o.id, type: o.type, r, trans: !!g.trans });
      if (g.shields > 0) { g.shields--; g.invulnUntil = t + OC.INVULN; g.events.push({ e: 'shield', t }); }
      else { g.over = true; g.events.push({ e: 'lose', t }); return; }
    } else if (!s.close && g.trans && !ah && radial >= OC.HIT_R) {
      // just left the obstacle's lane band: CLOSE if the arc edge is within 6°
      const gap = Math.abs(wrap(theta(t) - obCenter(o, t))) - o.hw - OC.DOT_PAD;
      const was = Math.abs(OC.R[g.trans.from] - OC.R[o.lane]) < 1e-9;
      if (was && gap >= 0 && gap < OC.CLOSE_DEG * D2R) s.close = true;
    }
  }
  for (let i = 0; i < L.rings.length; i++) {
    const g2 = L.rings[i], s = g.ringState[i];
    if (s.got || s.missed || t < g2.show) continue;
    if (Math.abs(wrap(theta(t) - g2.c0)) <= OC.RING_HALF && Math.abs(r - OC.R[g2.lane]) < OC.RING_R) {
      s.got = true; g.log.rings.push({ t, id: g2.id, kind: g2.kind });
      if (g2.kind === 'shield') { g.shields = Math.min(1, g.shields + 1); g.events.push({ e: 'shieldUp', t }); }
      else { const m = OC.MULTS[g.multI]; g.score += 10 * m; g.events.push({ e: 'ring', t, m, i: g.multI }); g.multI = Math.min(OC.MULTS.length - 1, g.multI + 1); }
    } else if (t > g2.t + 0.25) { s.missed = true; if (g2.kind === 'ring') g.multI = 0; }
  }
  if (t >= OC.DUR) { g.t = OC.DUR; g.over = true; g.clear = true; g.events.push({ e: 'win', t }); }
}

// record compare: survival → best streak → score
export const better = (a, b) => !b || a.time > b.time + 1e-9 || (Math.abs(a.time - b.time) < 1e-9 && (a.streak > b.streak || (a.streak === b.streak && a.score > b.score)));
export const record = (g) => ({ time: Math.round(g.t * 100) / 100, streak: g.bestStreak, score: g.score, clear: g.clear });

// ---- bot policies (O12 / sims) ----
export const POLICIES = {
  idle: () => () => false,
  fixed: () => (g) => g.lane === 0 && !g.trans, // tap once to outer lane, then hold it
  mash: () => (g) => g.t - g.lastSwitch >= OC.COOLDOWN, // fastest legal mashing (every 0.25 s)
  safe: () => (g) => {
    // react only to warned obstacles: head for the safe lane of the next one when the move is clear
    const L = g.level; let next = null;
    for (let i = 0; i < L.obs.length; i++) { const o = L.obs[i]; if (!g.obState[i].passed && g.t >= o.warnStart && o.exit > g.t) { next = o; break; } }
    if (!next) return false;
    const want = 1 - next.lane;
    if (g.lane === want) return false;
    for (const o of L.obs) if (o.lane === want && o.exit > g.t && o.enter < g.t + OC.TRANS + 0.03 && g.t >= o.warnStart - 1) return false;
    return true;
  },
};
export function simulate(level, policy, maxT = OC.DUR) {
  const g = createGame(level); const p = typeof policy === 'function' ? policy : POLICIES[policy]();
  while (!g.over && g.t < maxT) { if (p(g)) input(g, 'bot'); step(g); }
  return g;
}
