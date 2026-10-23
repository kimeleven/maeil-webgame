// Fair Slice core (t_bbb6c617, GDD fair-slice r2). DOM-free, deterministic. Inlined into the preview page by scripts/build-fair.mjs.
// Game space = 1000×1000 units. Times are integer "active ms" supplied by the caller (UI subtracts pauses).
export const FS = {
  ROUNDS: 10, INTRO: 400, AIM: 10000, SPLIT: 1200,   // GDD 2.0 time contract (ms)
  MIN_DRAG: 24,                                       // GDD 2.1: shorter drag = cancelled, not a cut
  MISS_FRAC: 0.001,                                   // GDD 2.2: min piece / total < 0.001 → miss
  PERFECT: 5, GOOD: 20, OK: 50,                       // grade limits in tenths of error (0.5 / 2.0 / 5.0)
  BONUS: 20, TRIES: 8, MAX_V: 24, KB_LIMIT: 708,
  AREA_MIN: 150000, AREA_MAX: 450000, BOX_MIN: 100, BOX_MAX: 900, MIN_ANGLE: 15, MIN_EDGE: 30, MIN_OFFSET: 40,
};
// vertex-count range per round (GDD 6), concave rounds (validator ⑥)
export const VRANGE = [null, [4, 4], [4, 4], [3, 3], [6, 8], [5, 8], [5, 8], [6, 12], [6, 12], [10, 16], [16, 24]];
export const CONCAVE = [null, false, false, false, true, false, false, true, true, true, true];

// ---- hashing / rng (GDD 6.1) ----
export function fnv1a32(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; }
export function mulberry32(a) { return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---- geometry ----
export function signedArea(P) { let s = 0; for (let i = 0, n = P.length; i < n; i++) { const a = P[i], b = P[(i + 1) % n]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; }
export const area = (P) => Math.abs(signedArea(P));
export function centroid(P) {
  let cx = 0, cy = 0, s = 0;
  for (let i = 0, n = P.length; i < n; i++) { const a = P[i], b = P[(i + 1) % n], c = a[0] * b[1] - b[0] * a[1]; s += c; cx += (a[0] + b[0]) * c; cy += (a[1] + b[1]) * c; }
  return [cx / (3 * s), cy / (3 * s)];
}
export function bbox(P) { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const [x, y] of P) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; } return { x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 }; }
// Sutherland–Hodgman against the half-plane side(v) = cross(d, v − p) · sgn ≥ 0. Concave inputs may give one ring with
// zero-width bridges on the cut line; its shoelace area is still the sum of that side's pieces (GDD 2.2).
export function clipHalf(P, p, d, sgn) {
  const side = (v) => sgn * (d[0] * (v[1] - p[1]) - d[1] * (v[0] - p[0]));
  const out = [];
  for (let i = 0, n = P.length; i < n; i++) {
    const a = P[i], b = P[(i + 1) % n], sa = side(a), sb = side(b);
    if (sa >= 0) out.push(a);
    if ((sa >= 0) !== (sb >= 0)) { const t = sa / (sa - sb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
  }
  return out;
}
// Cut polygon by the infinite line through p0,p1. Returns both sides' areas and rings (for drawing).
export function cutPoly(P, p0, p1) {
  const d = [p1[0] - p0[0], p1[1] - p0[1]];
  const L = clipHalf(P, p0, d, 1), R = clipHalf(P, p0, d, -1);
  const a1 = L.length >= 3 ? area(L) : 0, a2 = R.length >= 3 ? area(R) : 0;
  return { a1, a2, L, R };
}
// round half up to tenths, returned as an integer number of tenths (no float drift in scores)
export const tenths = (x) => Math.floor(x * 10 + 0.5 + 1e-9);
export const q01 = (v) => Math.round(v * 10) / 10;   // input normalisation: 0.1 game units
export function grade(e10) { return e10 <= FS.PERFECT ? 'perfect' : e10 <= FS.GOOD ? 'good' : e10 <= FS.OK ? 'ok' : 'meh'; }
export function roundScore(e10) { return Math.max(0, 100 - 2 * e10) + (e10 <= FS.PERFECT ? FS.BONUS : 0); }   // 100 − 20e (+20 perfect)
// The single judgement function (pointer, mouse and keyboard all end here).
export function judgeCut(P, p0, p1) {
  const { a1, a2, L, R } = cutPoly(P, p0, p1), tot = a1 + a2, mn = Math.min(a1, a2);
  if (!(tot > 0) || mn / tot < FS.MISS_FRAC) return { miss: true, small10: 0, e10: 500, score: 0, grade: 'meh', pct: [a1 >= a2 ? 1000 : 0, a1 >= a2 ? 0 : 1000], L, R };
  const small10 = tenths((100 * mn) / tot), e10 = 500 - small10;
  const pct = a1 <= a2 ? [small10, 1000 - small10] : [1000 - small10, small10];
  return { miss: false, small10, e10, score: roundScore(e10), grade: grade(e10), pct, L, R };
}
export const fmt10 = (n) => `${Math.floor(n / 10)}.${n % 10}`;

// ---- shape validator (GDD 6.1 ①~⑦) ----
function segX(a, b, c, d) {
  const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  const on = (p, q, r) => Math.min(p[0], r[0]) <= q[0] && q[0] <= Math.max(p[0], r[0]) && Math.min(p[1], r[1]) <= q[1] && q[1] <= Math.max(p[1], r[1]);
  const o1 = o(a, b, c), o2 = o(a, b, d), o3 = o(c, d, a), o4 = o(c, d, b);
  if (o1 !== o2 && o3 !== o4) return true;
  return (o1 === 0 && on(a, c, b)) || (o2 === 0 && on(a, d, b)) || (o3 === 0 && on(c, a, d)) || (o4 === 0 && on(c, b, d));
}
export function isSimple(P) {
  const n = P.length; if (n < 3) return false;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    if (j === i + 1 || (i === 0 && j === n - 1)) continue;
    if (segX(P[i], P[(i + 1) % n], P[j], P[(j + 1) % n])) return false;
  }
  return signedArea(P) !== 0;
}
// interior angles (deg) and reflex flags, orientation-independent
export function angles(P) {
  const n = P.length, s = Math.sign(signedArea(P)), out = [];
  for (let i = 0; i < n; i++) {
    const a = P[(i - 1 + n) % n], b = P[i], c = P[(i + 1) % n];
    const u = [a[0] - b[0], a[1] - b[1]], v = [c[0] - b[0], c[1] - b[1]];
    const ang = (Math.acos(Math.max(-1, Math.min(1, (u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v))))) * 180) / Math.PI;
    const turn = s * ((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]));
    out.push({ ang: turn >= 0 ? ang : 360 - ang, reflex: turn < 0 });
  }
  return out;
}
export function checks(P, r) {
  const A = area(P), B = bbox(P), C = centroid(P), an = angles(P), [vmin, vmax] = VRANGE[r];
  let minEdge = Infinity; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; minEdge = Math.min(minEdge, Math.hypot(b[0] - a[0], b[1] - a[1])); }
  const minConvex = Math.min(...an.filter((x) => !x.reflex).map((x) => x.ang));
  return {
    int: P.every(([x, y]) => Number.isInteger(x) && Number.isInteger(y)),
    simple: isSimple(P),                                                        // ①
    count: P.length >= vmin && P.length <= vmax && P.length <= FS.MAX_V,         // ②
    area: A >= FS.AREA_MIN && A <= FS.AREA_MAX,                                  // ③
    box: B.x0 >= FS.BOX_MIN && B.y0 >= FS.BOX_MIN && B.x1 <= FS.BOX_MAX && B.y1 <= FS.BOX_MAX,   // ④
    angle: minConvex >= FS.MIN_ANGLE, edge: minEdge >= FS.MIN_EDGE,             // ⑤
    concave: CONCAVE[r] ? an.some((x) => x.reflex) : true,                       // ⑥
    offset: r < 3 || Math.hypot(C[0] - B.cx, C[1] - B.cy) >= FS.MIN_OFFSET,     // ⑦
    _m: { A, minEdge, minConvex, off: Math.hypot(C[0] - B.cx, C[1] - B.cy), n: P.length },
  };
}
export function realValidate(P, r) { const c = checks(P, r); return c.int && c.simple && c.count && c.area && c.box && c.angle && c.edge && c.concave && c.offset; }

// ---- generators (one attempt = one rng; bounded by vertex count ≤ 24) ----
const TAU = Math.PI * 2;
function place(local, rng, rot) {
  const c = Math.cos(rot), s = Math.sin(rot);
  let P = local.map(([x, y]) => [x * c - y * s, x * s + y * c]);
  const target = 1e6 * (0.2 + 0.17 * rng()); let k = Math.sqrt(target / area(P)); P = P.map(([x, y]) => [x * k, y * k]);
  let B = bbox(P); const big = Math.max(B.x1 - B.x0, B.y1 - B.y0); if (big > 760) { k = 760 / big; P = P.map(([x, y]) => [x * k, y * k]); B = bbox(P); }   // fit [100,900]
  const mx = Math.max(0, Math.min(40, (790 - (B.x1 - B.x0)) / 2)), my = Math.max(0, Math.min(40, (790 - (B.y1 - B.y0)) / 2));
  const jx = (rng() * 2 - 1) * mx, jy = (rng() * 2 - 1) * my;
  return P.map(([x, y]) => [Math.round(x - B.cx + 500 + jx), Math.round(y - B.cy + 500 + jy)]);
}
// star-shaped polygon from sorted angles + radii (always simple before rounding)
function radial(rng, n, rad, jit = 0.7) {
  const th = []; for (let i = 0; i < n; i++) th.push(((i + (1 - jit) / 2 + jit * rng()) / n) * TAU);
  return th.map((t, i) => { const r = rad(t, i); return [Math.cos(t) * r, Math.sin(t) * r]; });
}
const GEN = {
  1: () => [[250, 250], [750, 250], [750, 750], [250, 750]],   // tutorial: fixed axis-aligned square
  2: (rng) => { const w = 1, h = 0.45 + 0.4 * rng(); return place([[-w, -h], [w, -h], [w, h], [-w, h]], rng, ((rng() * 30) * Math.PI) / 180); },
  3: (rng) => { const a = rng() * TAU; return place([[Math.cos(a), Math.sin(a)], [Math.cos(a + 1.6 + rng()), Math.sin(a + 1.6 + rng())], [Math.cos(a + 3.6 + 0.9 * rng()), Math.sin(a + 3.6 + 0.9 * rng())]].map(([x, y], i) => [x * (i ? 1 : 1.6), y * (i ? 1 : 1.6)]), rng, rng() * TAU); },
  4: (rng) => {
    const t = 0.3 + 0.2 * rng(), w = 1, h = 1 + 0.5 * rng();
    const L = [[0, 0], [w, 0], [w, t], [t, t], [t, h], [0, h]];
    const a = 0.2 + 0.5 * rng(), T = [[0, 0], [w * 1.4, 0], [w * 1.4, t], [a + t, t], [a + t, h], [a, h], [a, t], [0, t]];
    return place(rng() < 0.6 ? L : T, rng, rng() * TAU);
  },
  convex: (rng) => { const n = 5 + Math.floor(rng() * 4), e = 0.55 + 0.4 * rng(), sk = 0.5 + 0.35 * rng();
    return place(radial(rng, n, (t) => 1 / Math.hypot(Math.cos(t) * (1 + sk * Math.cos(t)), Math.sin(t) / e) ), rng, rng() * TAU); },
  concave: (rng) => { const n = 6 + Math.floor(rng() * 7), sk = 0.45 + 0.35 * rng();
    return place(radial(rng, n, (t, i) => (i % 2 ? 0.45 + 0.3 * rng() : 0.85 + 0.3 * rng()) * (1 + sk * Math.cos(t))), rng, rng() * TAU); },
  9: (rng) => { const n = 2 * (5 + Math.floor(rng() * 4)), sk = 0.45 + 0.3 * rng();
    return place(radial(rng, n, (t, i) => (i % 2 ? 0.5 + 0.12 * rng() : 1 + 0.15 * rng()) * (1 + sk * Math.cos(t))), rng, rng() * TAU); },
  10: (rng) => { const n = 16 + Math.floor(rng() * 9), f = 2 + Math.floor(rng() * 3), ph = rng() * TAU, a = 0.9 + 0.3 * rng();
    // wavy blob + one narrow lobe at angle 0: the lobe stretches the bounding box more than it moves the area centroid (⑦)
    return prune(place(radial(rng, n + 4, (t) => { const w = Math.atan2(Math.sin(t), Math.cos(t)); return (0.8 + 0.16 * Math.sin(f * t + ph) + 0.05 * rng()) * (1 + a * Math.exp(-(w * w) / 0.18)); }, 0.3), rng, rng() * TAU), n); },
};
// drop the vertex ending the shortest edge while an edge is < 34 units (and > 16 vertices) or more than `max` vertices remain
function prune(P, max) { P = P.slice(); for (;;) { let k = -1, m = Infinity; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], e = Math.hypot(b[0] - a[0], b[1] - a[1]); if (e < m) { m = e; k = (i + 1) % P.length; } } if ((m >= 34 || P.length <= 16) && P.length <= max) return P; P.splice(k, 1); } }
export function makeShape(r, rng) { return (GEN[r] || (r <= 6 ? GEN.convex : GEN.concave))(rng); }
// fixed fallback shapes (GDD 6.1). Not re-validated inside generate(); checked by realValidate separately (R7c).
export const FALLBACK = [
  // produced once by makeShape(r, seed 'fallback-const') and frozen as literals
  [[250,250],[750,250],[750,750],[250,750]],
  [[208,234],[871,283],[837,750],[174,701]],
  [[111,473],[871,300],[831,733]],
  [[181,139],[866,357],[792,590],[587,525],[480,860],[247,786],[353,451],[106,372]],
  [[127,755],[109,389],[318,137],[857,268],[489,834],[306,866]],
  [[105,378],[257,263],[568,288],[865,634],[267,685],[106,576]],
  [[869,407],[569,586],[348,713],[292,625],[109,551],[198,259]],
  [[124,862],[275,400],[251,199],[523,336],[723,345],[739,475],[884,786],[473,800]],
  [[285,765],[345,455],[111,386],[375,251],[444,168],[513,236],[543,172],[593,225],[816,251],[743,371],[871,715],[630,555]],
  [[122,705],[170,584],[333,487],[423,449],[502,320],[557,270],[621,267],[670,310],[698,365],[782,405],[838,441],[882,503],[851,557],[795,609],[739,679],[708,739],[673,789],[595,791],[545,750],[498,723],[408,741],[255,762]]
];
export function generate(seed, r, validate = realValidate) {
  for (let n = 0; n < FS.TRIES; n++) {
    const P = makeShape(r, mulberry32(fnv1a32(`${seed}#${r}#${n}`)));
    if (validate(P, r)) return { poly: P, tries: n + 1, fallback: false };
  }
  return { poly: FALLBACK[r - 1].map((v) => v.slice()), tries: FS.TRIES, fallback: true, tag: `shape=fallback:${r}` };
}
export function genShapes(seed, validate) { const a = []; for (let r = 1; r <= FS.ROUNDS; r++) a.push(generate(seed, r, validate)); return a; }

// ---- keyboard cut line (GDD 2.1): integer angle 0..179, foot point F (closest point to bbox centre) ----
export function kbInit(P) { const B = bbox(P); return { th: 0, F: [B.cx, B.cy], C: [B.cx, B.cy], shown: false }; }
const dirOf = (th) => [Math.cos((th * Math.PI) / 180), Math.sin((th * Math.PI) / 180)];
const nrmOf = (th) => { const [c, s] = dirOf(th); return [-s, c]; };
export const kbOffset = (k) => { const n = nrmOf(k.th); return (k.F[0] - k.C[0]) * n[0] + (k.F[1] - k.C[1]) * n[1]; };
export function kbRotate(k, deg) {
  const th = (((k.th + deg) % 180) + 180) % 180, n = nrmOf(th), d = (k.F[0] - k.C[0]) * n[0] + (k.F[1] - k.C[1]) * n[1];
  return { ...k, th, F: [k.C[0] + n[0] * d, k.C[1] + n[1] * d], shown: true };   // rotate about F, re-project to the foot
}
export function kbMove(k, du) { const n = nrmOf(k.th), d = Math.max(-FS.KB_LIMIT, Math.min(FS.KB_LIMIT, kbOffset(k) + du)); return { ...k, F: [k.C[0] + n[0] * d, k.C[1] + n[1] * d], shown: true }; }
export function kbPoints(k) { const u = dirOf(k.th); return [[q01(k.F[0] - u[0] * 100), q01(k.F[1] - u[1] * 100)], [q01(k.F[0] + u[0] * 100), q01(k.F[1] + u[1] * 100)]]; }
// exact half line at angle th by bisection on the normal offset (R2 auto player / tests)
export function halfLine(P, th) {
  const u = dirOf(th), n = nrmOf(th), B = bbox(P), C = [B.cx, B.cy], tot = area(P);
  const at = (d) => { const p = [C[0] + n[0] * d, C[1] + n[1] * d]; return [p, [p[0] + u[0] * 100, p[1] + u[1] * 100]]; };
  const left = (d) => { const [p0, p1] = at(d); return cutPoly(P, p0, p1).a1 / tot; };
  let lo = -800, hi = 800; const s = left(lo) > left(hi) ? 1 : -1;
  for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if ((left(m) - 0.5) * s > 0) lo = m; else hi = m; }
  const [p0, p1] = at((lo + hi) / 2); return [[q01(p0[0]), q01(p0[1])], [q01(p1[0]), q01(p1[1])]];
}

// ---- game state (GDD 2.0). Caller passes active ms. ----
export function createGame(seed, opts = {}) {
  return { seed, shapes: genShapes(seed, opts.validate), phase: 'ready', r: 0, at: 0, deadline: 0, rounds: [], log: [], score: 0, err10: 0, end: null };
}
export function start(g, at = 0) { if (g.phase !== 'ready') return false; g.phase = 'intro'; g.r = 1; g.at = at; g.log.push({ k: 'start', at }); return true; }
// move the clock to `now`: intro → aim → (timeout at deadline) → split → next intro … → result
export function advance(g, now) {
  for (;;) {
    if (g.phase === 'intro' && now >= g.at + FS.INTRO) { g.phase = 'aim'; g.at += FS.INTRO; g.deadline = g.at + FS.AIM; continue; }
    if (g.phase === 'aim' && now >= g.deadline) { record(g, null, g.deadline); continue; }
    if (g.phase === 'split' && now >= g.at + FS.SPLIT) {
      g.at += FS.SPLIT;
      if (g.r >= FS.ROUNDS) { g.phase = 'result'; g.end = { at: g.at }; } else { g.r++; g.phase = 'intro'; }
      continue;
    }
    return g.phase;
  }
}
function record(g, cut, at) {
  const P = g.shapes[g.r - 1].poly;
  const j = cut ? judgeCut(P, cut[0], cut[1]) : { miss: true, timeout: true, small10: 0, e10: 500, score: 0, grade: 'meh', pct: [1000, 0], L: P, R: [] };
  const rec = { r: g.r, cut, at, timeout: !cut, miss: j.miss, small10: j.small10, e10: j.e10, score: j.score, grade: j.grade, pct: j.pct, L: j.L, R: j.R };
  g.rounds.push(rec); g.score += j.score; g.err10 += j.e10; g.log.push(cut ? { r: g.r, p0: cut[0], p1: cut[1], at } : { r: g.r, timeout: true, at });
  g.phase = 'split'; g.at = at; return rec;
}
// confirm a cut released at active time `at` (event timeStamp). Accepted only if at < deadline (GDD 2.0 boundary).
export function cut(g, p0, p1, at) {
  if (g.phase === 'aim' && at >= g.deadline) { advance(g, at); return { ok: false, why: 'timeout' }; }
  advance(g, at);
  if (g.phase !== 'aim') return { ok: false, why: 'phase' };
  const a = [q01(p0[0]), q01(p0[1])], b = [q01(p1[0]), q01(p1[1])];
  if (Math.hypot(b[0] - a[0], b[1] - a[1]) < FS.MIN_DRAG) return { ok: false, why: 'short' };
  return { ok: true, rec: record(g, [a, b], at) };
}
export function finalRecord(g) { return { score: g.score, err10: g.err10 }; }
export function better(a, b) { return !b || a.score > b.score || (a.score === b.score && a.err10 < b.err10); }
// replay a log [{r,p0,p1,at}|{r,timeout,at}] → per-round results (R3)
export function replay(seed, log) {
  const g = createGame(seed); start(g, 0);
  for (const e of log) { if (e.k === 'start') continue; if (e.timeout) advance(g, e.at); else { const r = cut(g, e.p0, e.p1, e.at); if (!r.ok) throw new Error(`replay rejected r${e.r}: ${r.why}`); } }
  advance(g, 1e9);
  return { score: g.score, err10: g.err10, rounds: g.rounds.map((x) => [x.r, x.small10, x.e10, x.score, x.grade]) };
}
// policy simulation (no real time): policy(P, r) → [p0,p1] or null; cuts at `delay` ms into each aim
export function simulate(seed, policy, delay = 1000) {
  const g = createGame(seed); start(g, 0); let t = 0;
  while (g.phase !== 'result') {
    advance(g, t);
    if (g.phase === 'aim') { const P = g.shapes[g.r - 1].poly, c = policy(P, g.r); if (c) cut(g, c[0], c[1], g.at + delay); else advance(g, g.deadline); t = g.at; }
    else t = g.phase === 'intro' ? g.at + FS.INTRO : g.at + FS.SPLIT;
  }
  return g;
}
