// Echo Courier core (prototype, t_0e812a29). Pure logic, no DOM: runs in node (tests/sim) and is
// inlined into the preview page by scripts/build-echo.mjs.
// GDD: workspace/maeil-arcade-local/games/echo-courier/GDD.md (times are [추정] initial values).
export const EC = {
  DUR: 90, // real elapsed active seconds, from the first echo display (ready sheet excluded)
  MIN: 3, MAX: 12, BASE: 12, // path length bounds; every round has a 12-cell base path, L-prefix is used
  FAIL_SHOW: 0.8, FAIL_GAP: 0.4, // wrong → answer replay 0.8 s → 0.4 s → next path
  OK_GAP: 0.5, // success → next path
  LEAD: 0.25, // blank time before the first echo cell of a round
  COMBO_STEP: 1.1, COMBO_MAX: 2, SHORT_MULT: 0.8,
  FAINT_FROM: 9, FAINT_ALPHA: 0.6,
};
// numpad layout: cell index 0..8 is row-major from the top-left; key = NUMPAD[cell]
export const NUMPAD = [7, 8, 9, 4, 5, 6, 1, 2, 3];
export const cellOfKey = (k) => NUMPAD.indexOf(Number(k));
export const showTime = (L) => (L <= 5 ? 0.45 : L <= 8 ? 0.4 : 0.35);

export function hash(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
export function rng(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const adjacent = (a, b) => a !== b && Math.abs((a % 3) - (b % 3)) <= 1 && Math.abs(((a / 3) | 0) - ((b / 3) | 0)) <= 1;

// Base path for round r (1-based): depends only on seed and r (GDD §5 contract).
// Cells 1..6 never repeat; from cell 7 revisits are allowed; never the same cell twice in a row; moves are adjacent.
export function basePath(seed, r) {
  const R = rng((hash(seed) + r * 7919) >>> 0);
  for (;;) {
    const p = [Math.floor(R() * 9)];
    while (p.length < EC.BASE) {
      const prev = p[p.length - 1], uniq = p.length < 6;
      const opts = [];
      for (let c = 0; c < 9; c++) if (adjacent(prev, c) && (!uniq || !p.includes(c))) opts.push(c);
      if (!opts.length) break; // dead end inside the unique part: retry with the same stream (deterministic)
      p.push(opts[Math.floor(R() * opts.length)]);
    }
    if (p.length === EC.BASE) return p;
  }
}

export function createGame(seed) {
  const g = { seed, t: 0, over: false, r: 0, L: EC.MIN, fails: 0, short: false, streak: 0, done: 0, score: 0,
    longest: 0, longestPath: [], path: [], phase: 'idle', ph0: 0, idx: 0, wrong: null, events: [],
    log: { rounds: [], ignored: [], taps: [] } };
  nextRound(g);
  return g;
}
function nextRound(g) {
  g.r++; g.path = basePath(g.seed, g.r).slice(0, g.L); g.idx = 0; g.wrong = null;
  g.phase = 'show'; g.ph0 = g.t; g.log.rounds.push({ r: g.r, L: g.L, path: g.path.slice(), t: +g.t.toFixed(3) });
  g.events.push({ e: 'round', r: g.r, L: g.L });
}
export const showEnd = (g) => EC.LEAD + g.path.length * showTime(g.path.length);
// which echo cell is lit right now (index into path) or -1
export function litIndex(g) {
  if (g.phase !== 'show') return -1;
  const k = g.t - g.ph0 - EC.LEAD; if (k < 0) return -1;
  const i = Math.floor(k / showTime(g.path.length)); return i < g.path.length ? i : -1;
}
// advance active time; the round in progress when 90 s hits is not recorded
export function step(g, dt) {
  if (g.over) return;
  g.t = Math.min(EC.DUR, g.t + dt);
  for (let guard = 0; guard < 4; guard++) {
    const k = g.t - g.ph0;
    if (g.phase === 'show' && k >= showEnd(g)) { g.phase = 'input'; g.ph0ShowEnd = g.t; g.events.push({ e: 'input' }); }
    else if (g.phase === 'fail' && k >= EC.FAIL_SHOW + EC.FAIL_GAP) nextRound(g);
    else if (g.phase === 'ok' && k >= EC.OK_GAP) nextRound(g);
    else break;
  }
  if (g.t >= EC.DUR) { g.over = true; g.phase = 'over'; g.events.push({ e: 'over' }); }
}
// a cell tap/key. Returns 'ok' | 'step' | 'fail' | 'ignored'
export function tap(g, cell) {
  if (g.over || g.phase !== 'input') { g.log.ignored.push({ t: +g.t.toFixed(3), cell, phase: g.phase }); return 'ignored'; }
  g.log.taps.push({ t: +g.t.toFixed(3), cell, r: g.r });
  if (cell !== g.path[g.idx]) {
    g.wrong = { at: g.idx, cell }; g.phase = 'fail'; g.ph0 = g.t; g.streak = 0; g.fails++;
    const L = g.L; if (g.fails >= 2) { g.L = Math.max(EC.MIN, g.L - 1); g.fails = 0; g.short = g.L < L; }
    g.log.rounds[g.log.rounds.length - 1].res = 'fail';
    g.events.push({ e: 'fail', at: g.idx, cell }); return 'fail';
  }
  g.idx++; g.events.push({ e: 'cell', i: g.idx - 1, cell });
  if (g.idx < g.path.length) return 'step';
  const L = g.path.length; g.streak++; g.done++; g.fails = 0;
  const mult = Math.min(EC.COMBO_MAX, EC.COMBO_STEP ** (g.streak - 1)) * (g.short ? EC.SHORT_MULT : 1);
  g.score += Math.round(L * 100 * mult); g.short = false;
  if (L > g.longest || (L === g.longest && !g.longestPath.length)) { g.longest = L; g.longestPath = g.path.slice(); }
  g.L = Math.min(EC.MAX, L + 1);
  g.phase = 'ok'; g.ph0 = g.t; g.log.rounds[g.log.rounds.length - 1].res = 'ok';
  g.events.push({ e: 'ok', L }); return 'ok';
}
// tab came back: replay the current round's echo from the start (time keeps running from where it paused)
export function replay(g) {
  if (g.over || (g.phase !== 'show' && g.phase !== 'input')) return false;
  g.phase = 'show'; g.ph0 = g.t; g.idx = 0; g.events.push({ e: 'replay' }); return true;
}
export const record = (g) => ({ done: g.done, longest: g.longest, score: g.score, path: g.longestPath.slice(), rounds: g.r });
export const better = (a, b) => !b || a.done > b.done || (a.done === b.done && (a.score > b.score || (a.score === b.score && a.longest > b.longest)));

// headless play: policy(g) → cell to tap at input phase ('perfect', 'failAt:<round list>', function)
export function simulate(seed, policy = 'perfect', perCell = 0.6, dt = 1 / 120) {
  const g = createGame(seed); let wait = 0;
  while (!g.over) {
    if (g.phase === 'input') {
      wait += dt;
      if (wait >= perCell) { wait = 0; const want = g.path[g.idx]; const c = typeof policy === 'function' ? policy(g, want) : want; tap(g, c); }
    } else wait = 0;
    step(g, dt);
  }
  return g;
}
