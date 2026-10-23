// Rhythm Garden rule engine (prototype, t_177308a9). DOM-free, deterministic, integer ms on the ACTIVE clock.
// GDD r2: workspace/maeil-arcade-local/games/rhythm-garden/GDD.md (2.0 time, 2.1 judge, 2.2 vine, 6/6.1 chart, 7 score, 8 abuse).
// Same seed → same chart. Same input log (kind, raw active ms, offset) → same result. No wall clock, no frames.
export const RG = {
  DUR: 90000, LIVES: 5, PERFECT: 50,
  W_EARLY: 160, W_LATE: 120, W_SWITCH: 10000,   // w_k = t_k < 10000 ? 160 : 120 (10000 exactly → 120)
  GAP_PAD: 20,                                    // neighbours: t_{k+1} - t_k >= w_k + w_{k+1} + 20
  FIRST: 1334,                                    // intro 2 beats at 90 BPM (2 × 667)
  TRIES: 8,
  SCORE: { good: 10, perfect: 20, per: 10, multMax: 4, finish: 100, leaf: 20 },
  // [from ms, beat ms, rest ratio, vine ratio, vine lengths, offbeat ratio]
  SEG: [
    { at: 0, p: 667, rest: 0, vine: 0, len: [], off: 0 },
    { at: 10000, p: 600, rest: 0.2, vine: 0, len: [], off: 0 },
    { at: 30000, p: 545, rest: 0.2, vine: 0.12, len: [1, 2], off: 0.1 },
    { at: 60000, p: 500, rest: 0.25, vine: 0.12, len: [2], off: 0 },   // 120 BPM: no offbeats (PO)
  ],
  VINE_FIRST: [30000, 36000],
};
export const winOf = (t) => (t < RG.W_SWITCH ? RG.W_EARLY : RG.W_LATE);
export const segOf = (t) => { let s = RG.SEG[0]; for (const x of RG.SEG) if (t >= x.at) s = x; return s; };
export function hash(s) { let h = 2166136261 >>> 0; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
export function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// offset o (ms): o > 0 means "my input is stamped late". Stored value → integer in [-100, 100]; NaN → 0.
export function normOffset(v) { const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN; if (!Number.isFinite(n)) return 0; return Math.max(-100, Math.min(100, Math.round(n))); }

// ---- chart ----
// beat: { t, w, kind: 'seed'|'rest'|'head'|'tail', off?: true, v?: vine index }; vines: [{ h, e }] (beat indexes)
// Last beat window must end by 90000 (t + w <= 90000) so every judged beat can close inside the session.
function build(R) {
  const beats = [], vines = []; let t = RG.FIRST, slot = 0, restRun = 0, vineDone = false;
  const push = (b) => { b.w = winOf(b.t); beats.push(b); return beats.length - 1; };
  const room = (t) => t + winOf(t) <= RG.DUR;
  while (room(t)) {
    const s = segOf(t);
    // first vine guaranteed in [30000, 36000]: R decides early, forced at the last slot that still fits
    const vineOk = s.vine > 0 && (vineDone || (t >= RG.VINE_FIRST[0] && t <= RG.VINE_FIRST[1]));
    const forceVine = !vineDone && vineOk && t + segOf(t).p > RG.VINE_FIRST[1];
    if (slot >= 5 && vineOk && (forceVine || R('vine') < (vineDone ? s.vine : 0.35))) {
      const L = s.len.length === 1 ? s.len[0] : s.len[Math.floor(R('len') * s.len.length) % s.len.length];
      let e = t; for (let i = 0; i < L; i++) e += segOf(e).p;
      const after = e + segOf(e).p;               // the slot after the tail stays empty
      if (room(e)) {
        const h = push({ t, kind: 'head', v: vines.length }), ei = push({ t: e, kind: 'tail', v: vines.length });
        vines.push({ h, e: ei }); vineDone = true; restRun = 0; t = after + segOf(after).p; slot += L + 2; continue;
      }
    }
    if (slot >= 5 && s.rest > 0 && restRun < 2 && R('rest') < s.rest) { push({ t, kind: 'rest' }); restRun++; }
    else {
      push({ t, kind: 'seed' }); restRun = 0;
      const half = Math.ceil(s.p / 2), nt = t + s.p;
      if (slot >= 5 && s.off > 0 && t + half < 60000 && segOf(nt).off > 0 && room(t + half) && R('off') < s.off) push({ t: t + half, kind: 'seed', off: true });
    }
    t += s.p; slot++;
  }
  return { beats, vines };
}
// 6.1 validator ①~⑧ (independent of the builder). Returns list of failed rule numbers.
export function validate(c) {
  const B = c.beats, bad = new Set();
  for (let k = 0; k + 1 < B.length; k++) if (B[k + 1].t - B[k].t < B[k].w + B[k + 1].w + RG.GAP_PAD) bad.add(1);
  for (const b of B) if (b.w !== winOf(b.t)) bad.add(1);
  if (B.length < 5 || B.slice(0, 5).some((b) => b.kind !== 'seed')) bad.add(2);
  if (B.filter((b) => b.kind === 'rest' && b.t >= 10000 && b.t < 30000).length < 5) bad.add(3);
  let run = 0; for (const b of B) { run = b.kind === 'rest' ? run + 1 : 0; if (run > 2) bad.add(4); }
  for (const v of c.vines) {
    const h = B[v.h], e = B[v.e]; if (h.kind !== 'head' || e.kind !== 'tail' || v.e !== v.h + 1 || h.off || e.off) bad.add(5);
    const nxt = B[v.e + 1], gap = segOf(e.t).p;  // nothing inside the vine and in the slot right after the tail
    if (nxt && nxt.t <= e.t + gap) bad.add(5);
    const L = Math.round((e.t - h.t) / segOf(h.t).p); if (L < 1 || L > 2) bad.add(5);
  }
  B.forEach((b, i) => { if ((b.kind === 'head' || b.kind === 'tail') && !c.vines.some((v) => v.h === i || v.e === i)) bad.add(5); });
  const firstV = c.vines.length ? B[c.vines[0].h].t : -1;
  if (!(firstV >= RG.VINE_FIRST[0] && firstV <= RG.VINE_FIRST[1]) || c.vines.some((v) => B[v.h].t < 30000)) bad.add(6);
  if (B.some((b) => b.off && b.t >= 60000)) bad.add(7);
  if (!B.length || B[B.length - 1].t > RG.DUR) bad.add(8);
  for (let k = 0; k + 1 < B.length; k++) if (B[k + 1].t <= B[k].t) bad.add(1);
  return [...bad].sort();
}
// Fixed fallback chart (no rng): seeds, rest pattern every 3rd/7th slot in 10–30 s, vine 1 at first slot ≥ 30 s, more vines every 9 slots.
let FB = null;
export function fallbackChart() {
  if (FB) return FB; let n = 0;
  const R = (k) => { n++; if (k === 'rest') return n % 4 === 0 ? 0 : 1; if (k === 'vine') return n % 9 === 0 ? 0 : 1; if (k === 'len') return 0.9; return 1; };
  FB = { ...build(R), attempt: -1, fallback: true }; return FB;
}
export function genChart(seed, opts = {}) {
  const check = opts.validate || validate; let tries = 0;
  for (let a = 0; a < RG.TRIES; a++) {
    tries++; const r = rng(hash(`${seed}#${a}`)); const c = build(() => r());
    if (check(c).length === 0) return { ...c, attempt: a, fallback: false, tries };
  }
  return { ...fallbackChart(), tries };
}

// ---- game ----
// phases: ready → play → result. The UI owns pause/count; it converts event.timeStamp → raw active ms (integer) and calls these.
export function createGame(seed, opts = {}) {
  const chart = opts.chart || genChart(seed, opts);
  return { seed, chart, o: normOffset(opts.offset ?? 0), phase: 'ready', now: 0, ci: 0,
    res: chart.beats.map(() => null),         // per beat: null | 'perfect'|'good'|'miss'|'pass'|'wilt'|'hit'
    taps: chart.beats.map(() => 0), vine: chart.vines.map(() => 'wait'),   // wait|held|done
    held: null, wilts: 0, score: 0, combo: 0, maxCombo: 0, perfect: 0, good: 0, deltas: [], events: [], log: [], end: null };
}
export function start(g) { if (g.phase !== 'ready') return false; g.phase = 'play'; g.now = 0; return true; }
export const mult = (combo) => Math.min(RG.SCORE.multMax, 1 + Math.floor(combo / RG.SCORE.per));
const ev = (g, e) => { g.events.push(e); return e; };
function wilt(g, c, why, k) {
  g.wilts++; g.combo = 0; const e = ev(g, { a: 'wilt', why, k, c });
  if (g.wilts >= RG.LIVES) finish(g, c, false);
  return e;
}
function hit(g, k, c, part) {
  const b = g.chart.beats[k], d = c - b.t, per = Math.abs(d) <= RG.PERFECT;
  const m = mult(g.combo), pts = (per ? RG.SCORE.perfect : RG.SCORE.good) * m;
  g.score += pts; g.combo++; g.maxCombo = Math.max(g.maxCombo, g.combo); if (per) g.perfect++; else g.good++; g.deltas.push(d);
  return ev(g, { a: per ? 'perfect' : 'good', k, d, pts, part, c });
}
function finish(g, c, survived) {
  if (g.phase === 'result') return; g.phase = 'result'; g.held = null;
  const leaves = RG.LIVES - g.wilts, bonus = survived ? RG.SCORE.finish + RG.SCORE.leaf * leaves : 0;
  g.score += bonus; g.end = { c, survived, bonus, leaves };
}
// close every beat whose window ended before corrected time c (strictly: an input exactly at t+w still belongs to the window)
function close(g, c) {
  const B = g.chart.beats;
  while (g.phase === 'play' && g.ci < B.length && B[g.ci].t + B[g.ci].w < c) {
    const k = g.ci, b = B[k]; g.ci++; const end = b.t + b.w;
    if (b.kind === 'seed') { if (!g.taps[k]) { g.res[k] = 'miss'; wilt(g, end, 'miss', k); } }
    else if (b.kind === 'rest') { if (!g.res[k]) { g.res[k] = 'pass'; ev(g, { a: 'pass', k, c: end }); } }
    else if (b.kind === 'head') { if (g.vine[b.v] === 'wait') { g.vine[b.v] = 'done'; g.res[k] = 'miss'; wilt(g, end, 'miss', k); } }
    else if (b.kind === 'tail') { if (g.vine[b.v] === 'held') { g.vine[b.v] = 'done'; g.held = null; g.res[k] = 'late'; wilt(g, end, 'late', k); } }
  }
}
// advance to raw active ms (frame driver / before every input). Ends at 90 s active.
export function advance(g, raw) {
  if (g.phase !== 'play') return; raw = Math.max(raw, g.now); g.now = raw;
  close(g, raw - g.o);
  if (g.phase === 'play' && raw >= RG.DUR) { close(g, RG.DUR - g.o); if (g.phase === 'play') finish(g, RG.DUR - g.o, true); }
}
const beatAt = (g, c) => { const B = g.chart.beats; for (let k = g.ci; k < B.length && B[k].t - B[k].w <= c; k++) if (Math.abs(c - B[k].t) <= B[k].w) return k; return -1; };
// kind: 'down' | 'up' | 'cancel'; id: pointer id or 'key'. Returns the event it produced (or {a:'ignored'}).
export function input(g, kind, raw, id = 'p') {
  raw = Math.round(raw); if (g.phase !== 'play') return { a: 'ignored' };
  g.log.push([kind, raw, g.o, id]);
  advance(g, raw); if (g.phase !== 'play') return { a: 'ignored' };
  const c = raw - g.o, B = g.chart.beats;
  if (kind === 'down') {
    if (g.held) return ev(g, { a: 'ignored', why: 'holding', c });
    const k = beatAt(g, c);
    if (k < 0) return wilt(g, c, 'stray', -1);
    const b = B[k];
    if (b.kind === 'seed') { g.taps[k]++; if (g.taps[k] > 1) { g.res[k] = 'wilt'; return wilt(g, c, 'double', k); } const e = hit(g, k, c, 'seed'); g.res[k] = e.a; return e; }
    if (b.kind === 'rest') { g.taps[k]++; g.res[k] = 'wilt'; return wilt(g, c, 'rest', k); }
    if (b.kind === 'head' && g.vine[b.v] === 'wait') { g.vine[b.v] = 'held'; g.held = { v: b.v, id }; const e = hit(g, k, c, 'head'); g.res[k] = e.a; return e; }
    return ev(g, { a: 'ignored', why: 'vine-done', c });   // head/tail window of a finished vine: no extra wilt (≤ 1 per vine)
  }
  // up / cancel
  if (!g.held || g.held.id !== id) return { a: 'ignored', why: 'not-held' };
  const v = g.held.v, e = B[g.chart.vines[v].e], ek = g.chart.vines[v].e; g.held = null; g.vine[v] = 'done';
  if (c < e.t - e.w) { g.res[ek] = 'early'; return wilt(g, c, 'early', ek); }
  const r = hit(g, ek, c, 'tail'); g.res[ek] = r.a; return r;
}
// Late delivery (t_2b703714). The frame driver closes windows at receive−LAG; an input whose event timeStamp is EARLIER than
// that point (delivered after a frame because of delivery delay / main-thread stall) used to be judged against an already
// closed window → miss + stray (double penalty). Closings are provisional: if the input's timeStamp is not older than
// HORIZON ms at delivery, the game is rebuilt from the timestamp-ordered input log (deterministic: same rules, windows,
// chart, score) and advanced back to where it was. Older than HORIZON: the closed beats are final; a down with no open
// beat at its timestamp is discarded as 'stale' (no second penalty). Windows are never widened; no unbounded wait.
export const HORIZON = 250;
export function deliver(g, kind, raw, id = 'p', recv = raw, H = HORIZON) {
  raw = Math.round(raw); recv = Math.round(recv);
  const ended = g.phase === 'result';
  if (raw >= g.now && !ended) return { e: input(g, kind, raw, id), path: 'direct' };
  if (recv - raw > H || (ended && raw >= g.now)) {
    if (ended) return { e: { a: 'ignored', why: 'ended' }, path: 'final' };
    if (kind === 'down' && !g.held && beatAt(g, raw - g.o) < 0) { (g.stale = g.stale || []).push([kind, raw, recv, id]); return { e: { a: 'ignored', why: 'stale', c: raw - g.o }, path: 'stale' }; }
    return { e: input(g, kind, raw, id), path: 'final' };
  }
  // rebuild: insert into the log by timestamp (stable), replay, advance back to the frame point
  const log = g.log.slice(); let at = log.length; while (at > 0 && log[at - 1][1] > raw) at--;
  log.splice(at, 0, [kind, raw, g.o, id]);
  const h = createGame(g.seed, { chart: g.chart, offset: g.o }); start(h); let e = null;
  log.forEach(([k, r, o, i], j) => { h.o = o; const x = input(h, k, r, i); if (j === at) e = x; });
  h.o = g.o; const before = g.events, now = g.now; advance(h, now); h.now = Math.max(h.now, now);
  if (g.stale) h.stale = g.stale;
  // revoked = provisional events of the old timeline that no longer exist (UI drops their effects)
  const sig = (x) => `${x.a}|${x.why || ''}|${x.k}|${x.c}`, keep = new Set(h.events.map(sig));
  const revoked = before.filter((x) => !keep.has(sig(x)));
  for (const key of Object.keys(g)) delete g[key]; Object.assign(g, h);
  return { e: e || { a: 'ignored' }, path: 'rebuild', revoked };
}
// pause while holding a vine: treat as up at the last active time before the pause; buttons/keys still down after resume are not "held".
export function pauseRelease(g, raw) { if (g.held) return input(g, 'up', raw, g.held.id); return null; }
export function record(g) { return { score: g.score, maxCombo: g.maxCombo, perfect: g.perfect }; }
export function better(a, b) { if (!b) return true; if (a.score !== b.score) return a.score > b.score; return a.maxCombo > b.maxCombo; }
export function accuracy(g) {
  const d = g.deltas, n = d.length, mean = n ? Math.round(d.reduce((s, x) => s + x, 0) / n) : 0;
  const bins = { early: d.filter((x) => x < -RG.PERFECT).length, ok: d.filter((x) => Math.abs(x) <= RG.PERFECT).length, late: d.filter((x) => x > RG.PERFECT).length };
  return { n, mean, bins };
}
// failure causes (t_552009cf): counts per engine wilt reason, in fixed order; top = most frequent (ties → this order).
// miss=seed/vine head not tapped, stray=tap with no pot in reach, double=second tap on one pot, rest=tap on an empty pot,
// early=vine released too soon, late=vine held past its end. Display only — scoring/judging unchanged.
export const CAUSES = ['miss', 'stray', 'double', 'rest', 'early', 'late'];
export function causes(g) {
  const n = Object.fromEntries(CAUSES.map((k) => [k, 0]));
  for (const e of g.events) if (e.a === 'wilt' && e.why in n) n[e.why]++;
  let top = null; for (const k of CAUSES) if (n[k] > 0 && (!top || n[k] > n[top])) top = k;
  return { n, total: CAUSES.reduce((s, k) => s + n[k], 0), top };
}
// replay a log [[kind, raw, o, id], ...] — o comes from the log, so changing the setting later does not change a replay
export function replay(seed, log, opts = {}) {
  const g = createGame(seed, opts); start(g);
  for (const [kind, raw, o, id] of log) { g.o = o; input(g, kind, raw, id); }
  g.o = log.length ? log[log.length - 1][2] : g.o; advance(g, RG.DUR); return g;
}
// ---- policies (R2 / R5 / R11) ----
export const POLICIES = ['perfect', 'idle', 'double', 'everyBeat', 'random'];
// returns list of [kind, raw, id]
export function policyInputs(chart, pol, r = rng(1)) {
  const out = [], B = chart.beats;
  if (pol === 'perfect') for (const b of B) { if (b.kind === 'seed' || b.kind === 'head') out.push(['down', b.t, 'p']); if (b.kind === 'tail') out.push(['up', b.t, 'p']); }
  if (pol === 'double') for (const b of B) if (b.kind !== 'tail' && !b.off) { out.push(['down', b.t, 'p'], ['up', b.t + 20, 'p'], ['down', b.t + 40, 'p'], ['up', b.t + 60, 'p']); }
  if (pol === 'everyBeat') for (const b of B) if (!b.off && b.kind !== 'tail') { out.push(['down', b.t, 'p'], ['up', b.t + 30, 'p']); }  // on every grid beat incl. rests, ignoring kinds
  if (pol === 'random') { // one tap per beat period at a uniformly random moment inside it
    let t = RG.FIRST - Math.round(segOf(0).p / 2); while (t < RG.DUR) { const p = segOf(t).p; const x = t + Math.floor(r() * p); out.push(['down', x, 'p'], ['up', x + 40, 'p']); t += p; }
  }
  return out;
}
export function simulate(seed, pol, opts = {}) {
  const g = createGame(seed, opts); start(g); const r = rng(hash('pol:' + seed));
  for (const [k, raw, id] of policyInputs(g.chart, pol, r)) { if (g.phase !== 'play') break; input(g, k, raw, id); }
  advance(g, RG.DUR); return g;
}
