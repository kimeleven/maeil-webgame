// Sort Rail core (t_3f092e76) — DOM-free deterministic engine. GDD r3 (games/sort-rail/GDD.md).
// All times are LOGICAL game ms (active clock: pauses and the R-B notice do not advance it).
// Input = { t: logical event time (from event.timeStamp), at: logical arrival time, lane: 0|1|2 (L|C|R) }.
// Judgment uses t only; irreversible commit (score/log/sound) happens at the receive deadline (+G), see §2.0.1.
export const SR = { DUR: 90000, W: 16, G: 50, FX_OK: 250, FX_BAD: 600, NOTICE: 1500, RB: 25, TRIES: 8, BLOCK: 9, FIRST: 4 };
export const LANES = ['L', 'C', 'R'];
export const SYMS = ['●', '▲', '■', '★'];
export function fnv1a32(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; }
export function mulberry32(a) { return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// §4 table [추정 초기값]. decoy null = colour unconstrained (4~12).
export function tableOf(k) {
  if (k <= 3) return { row: 0, dl: 4000, decoy: 0, bang: 0 };
  if (k <= 12) return { row: 1, dl: 2400, decoy: null, bang: 0 };
  if (k <= 24) return { row: 2, dl: 1800, decoy: 0.5, bang: 0 };
  if (k <= 40) return { row: 3, dl: 1600, decoy: 0.5, bang: 0.3 };
  return { row: 4, dl: 1300, decoy: 0.6, bang: 0.35 };
}
export const ruleOf = (k) => (k >= SR.RB ? 'A+B' : 'A');
export const layoutChangeAt = (k) => k === 4 || k === 13 || (k >= 22 && (k - 22) % 3 === 0);
export const blockOf = (k) => Math.floor((k - SR.FIRST) / SR.BLOCK);
export const blockStart = (b) => SR.FIRST + b * SR.BLOCK;
// answer lane by the rule in force for parcel k
export function answerOf(p) { if (ruleOf(p.k) === 'A+B' && p.bang) return 1; const i = p.lanes.indexOf(p.sym); return i; }
export const isDecoy = (p) => p.color !== p.lanes[p.ans] && p.lanes.includes(p.color);
// Tutorial constants (generate() never called for 1~3). lanes = [L,C,R] symbol indices; ★ on C for parcel 1.
const TL = [0, 3, 1];
export const TUTORIAL = Object.freeze([
  Object.freeze({ k: 1, lanes: TL, sym: 3, color: 3, bang: false, dl: 4000, ans: 1, tutorial: true }),
  Object.freeze({ k: 2, lanes: TL, sym: 0, color: 0, bang: false, dl: 4000, ans: 0, tutorial: true }),
  Object.freeze({ k: 3, lanes: TL, sym: 1, color: 1, bang: false, dl: 4000, ans: 2, tutorial: true }),
]);
const pick = (rng, n) => Math.floor(rng() * n);
function shuffle(rng, a) { for (let i = a.length - 1; i > 0; i--) { const j = pick(rng, i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const rowGroups = (ks) => { const m = new Map(); ks.forEach((k, i) => { const r = tableOf(k).row; if (!m.has(r)) m.set(r, []); m.get(r).push(i); }); return m; };
// one random proposal for block b
function propose(rng, b, prevTail) {
  const k0 = blockStart(b), ks = Array.from({ length: SR.BLOCK }, (_, i) => k0 + i);
  let lanes = null; const ans = [], tail = prevTail.slice();
  const out = ks.map((k) => {
    if (layoutChangeAt(k) || !lanes) lanes = shuffle(rng, [0, 1, 2, 3]).slice(0, 3);
    let a = pick(rng, 3); const n = tail.length;
    if (n >= 2 && tail[n - 1] === tail[n - 2] && a === tail[n - 1]) a = (a + 1 + pick(rng, 2)) % 3;
    tail.push(a); ans.push(a);
    return { k, lanes: lanes.slice(), ans: a, dl: tableOf(k).dl, bang: false, sym: lanes[a], color: lanes[a] };
  });
  for (const [row, idx] of rowGroups(ks)) {
    const T = tableOf(ks[idx[0]]);
    if (T.bang) { const cs = shuffle(rng, idx.filter((i) => out[i].ans === 1)); const need = Math.round(idx.length * T.bang); cs.slice(0, need).forEach((i) => { const p = out[i]; p.bang = true; p.sym = p.lanes[pick(rng, 2) ? 2 : 0]; }); }
    if (T.decoy === null) idx.forEach((i) => (out[i].color = pick(rng, 4)));
    else if (T.decoy) {
      const need = Math.round(idx.length * T.decoy), ds = new Set(shuffle(rng, idx.slice()).slice(0, need));
      idx.forEach((i) => { const p = out[i]; if (ds.has(i)) p.color = p.lanes[(p.ans + 1 + pick(rng, 2)) % 3]; else { const absent = [0, 1, 2, 3].find((s) => !p.lanes.includes(s)); p.color = pick(rng, 2) ? absent : p.lanes[p.ans]; } });
    }
    void row;
  }
  return out;
}
// validate ①~⑤ (GDD §4.1). Returns { ok, why }.
export function realValidate(block, b, prevTail) {
  const bad = (why) => ({ ok: false, why });
  if (!Array.isArray(block) || block.length !== SR.BLOCK) return bad('size');
  const k0 = blockStart(b), cnt = [0, 0, 0], tail = prevTail.slice();
  for (let i = 0; i < SR.BLOCK; i++) {
    const p = block[i], k = k0 + i;
    if (p.k !== k) return bad('k');
    // ⑤ lanes distinct, layout changes only at layoutChangeAt, parcel symbol is one of the lane symbols
    if (p.lanes.length !== 3 || new Set(p.lanes).size !== 3 || p.lanes.some((s) => !(s >= 0 && s <= 3))) return bad('⑤lanes');
    if (i > 0 && !layoutChangeAt(k) && p.lanes.join() !== block[i - 1].lanes.join()) return bad('⑤layout');
    if (!p.lanes.includes(p.sym)) return bad('⑤sym');
    // ① unique answer under ruleOf(k); no "!" before 25; "!" symbol is L or R rail symbol (no fake "!")
    if (p.bang && k < SR.RB) return bad('①bang<25');
    if (p.bang && p.sym === p.lanes[1]) return bad('⑤fakebang');
    if (p.lanes.filter((s) => s === p.sym).length !== 1) return bad('①unique');
    const a = answerOf(p); if (a !== p.ans) return bad('①ans');
    // ④ deadline = table
    if (p.dl !== tableOf(k).dl) return bad('④dl');
    cnt[a]++; tail.push(a); const n = tail.length;
    if (n >= 3 && tail[n - 1] === tail[n - 2] && tail[n - 2] === tail[n - 3]) return bad('③run');
  }
  // ② each lane 2~4 (C includes "!" parcels)
  if (cnt.some((c) => c < 2 || c > 4)) return bad('②count');
  // ④ decoy / "!" counts per table row within the block, ±1
  for (const [, idx] of rowGroups(block.map((p) => p.k))) {
    const T = tableOf(block[idx[0]].k);
    const nb = idx.filter((i) => block[i].bang).length; if (Math.abs(nb - Math.round(idx.length * T.bang)) > 1) return bad('④bang');
    if (T.decoy !== null) { const nd = idx.filter((i) => isDecoy(block[i])).length; if (Math.abs(nd - Math.round(idx.length * T.decoy)) > 1) return bad('④decoy'); }
  }
  return { ok: true, why: '' };
}
// constructive fallback (§4.1). Guarantees ①~⑤ by construction (checked by R7c).
export const PATTERNS = { L: [0, 1, 2, 0, 2, 1, 0, 2, 1], C: [1, 0, 2, 1, 2, 0, 1, 2, 0], R: [2, 0, 1, 2, 1, 0, 2, 0, 1] };
const ROT = [[0, 1, 2], [1, 2, 3], [2, 3, 0], [3, 0, 1]];
export const changeIndex = (k) => (k < 13 ? 0 : k < 22 ? 1 : 2 + Math.floor((k - 22) / 3));
export function fallbackBlock(b, prevTail) {
  const order = ['L', 'C', 'R'];
  const same = prevTail.length >= 2 && prevTail[prevTail.length - 1] === prevTail[prevTail.length - 2] ? prevTail[prevTail.length - 1] : -1;
  const pat = PATTERNS[order.find((n) => PATTERNS[n][0] !== same)];
  const k0 = blockStart(b), ks = pat.map((_, i) => k0 + i);
  const out = pat.map((a, i) => { const k = ks[i], lanes = ROT[changeIndex(k) % 4].slice(); return { k, lanes, ans: a, dl: tableOf(k).dl, bang: false, sym: lanes[a], color: lanes[a], fallback: true }; });
  for (const [, idx] of rowGroups(ks)) {
    const T = tableOf(ks[idx[0]]);
    if (T.bang) idx.filter((i) => out[i].ans === 1).slice(0, Math.round(idx.length * T.bang)).forEach((i) => { out[i].bang = true; out[i].sym = out[i].lanes[0]; });
    if (T.decoy) idx.slice(0, Math.round(idx.length * T.decoy)).forEach((i) => { const p = out[i]; p.color = p.lanes[(p.ans + 1) % 3]; });
  }
  return out;
}
// generate(seed, b, prevTail, validate) — 8 tries, then fallback. Only the injected validate is called.
export function generate(seed, b, prevTail, validate = realValidate) {
  for (let n = 0; n < SR.TRIES; n++) {
    const m = propose(mulberry32(fnv1a32(seed + '#' + b + '#' + n)), b, prevTail);
    if (validate(m, b, prevTail).ok) return { block: m, tries: n + 1, fallback: false };
  }
  return { block: fallbackBlock(b, prevTail), tries: SR.TRIES, fallback: true };
}
// ---- scoring ----
export const mult = (streak) => (streak >= 10 ? 3 : streak >= 5 ? 2 : 1);
export const bonus = (D, t0, dl) => Math.max(0, Math.min(10, Math.floor((10 * (D - t0)) / dl)));
// ---- game state machine ----
// phase: ready → wait (parcel shown at p.s) ⇄ fx → … → end; 'notice' is a flag on parcel 25 handled by the UI clock.
export function newGame(seed) {
  return { seed, phase: 'ready', k: 0, cur: null, blocks: new Map(), fallbacks: [], genMs: [], gens: 0,
    score: 0, correct: 0, judged: 0, streak: 0, maxStreak: 0, late: 0, voids: 0, discarded: false, log: [], commits: [], end: null, endAt: null, noticeDone: false };
}
function parcelK(g, k) {
  if (k <= 3) return { ...TUTORIAL[k - 1] };
  const b = blockOf(k); ensureBlock(g, b); return { ...g.blocks.get(b).block[k - blockStart(b)] };
}
function ensureBlock(g, b) {
  if (g.blocks.has(b)) return;
  const prev = b === 0 ? [TUTORIAL[1].ans, TUTORIAL[2].ans] : g.blocks.get(b - 1).block.slice(-2).map((p) => p.ans);
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const r = generate(g.seed, b, prev); g.blocks.set(b, r); g.gens++;
  g.genMs.push((typeof performance !== 'undefined' ? performance.now() : 0) - t0);
  if (r.fallback) g.fallbacks.push('fallback:' + b);
}
function show(g, k, s) {
  const p = parcelK(g, k); p.s = s; p.D = s + p.dl; p.pend = null; p.voidUntil = -1; p.voids = 0; p.late = 0; p.res = null;
  p.notice = k === SR.RB; g.cur = p; g.k = k; g.phase = 'wait';
  if (k === SR.FIRST) ensureBlock(g, 0);
  if (k >= SR.FIRST && k === blockStart(blockOf(k))) ensureBlock(g, blockOf(k) + 1);   // block b first parcel → generate b+1
  return p;
}
export function start(g) { if (g.phase !== 'ready') return false; ensureBlock(g, 0); show(g, 1, 0); return true; }   // block 0 generated at [start]
// judgment (logical) decided; commit is deferred to commitAt
function decide(g, p, res, lane, jt, commitAt) { p.res = { res, lane, jt, commitAt, t0: p.pend ? p.pend.t : null }; g.phase = 'fx'; }
// advance logical time to `now`: commits everything whose receive deadline ≤ now, in order.
export function advance(g, now) {
  for (let guard = 0; guard < 1000; guard++) {
    if (g.phase === 'ready' || g.phase === 'end') return;
    const p = g.cur, T = SR.DUR;
    if (!p.res) {
      if (p.pend) {   // pending first input: judged at t0+W, commit at max(t0+W+G, its arrival)
        const jt = p.pend.t + SR.W, ca = Math.max(jt + SR.G, p.pend.at);
        if (now < ca) return;
        decide(g, p, p.pend.lane === p.ans ? 'ok' : 'bad', p.pend.lane, jt, ca); commit(g, p);
      } else if (p.D < T) {   // miss at D, commit at D+G
        if (now < p.D + SR.G) return;
        decide(g, p, 'miss', null, p.D, p.D + SR.G); commit(g, p);
      } else {        // board deadline first: parcel discarded at T, end at T+G
        if (now < T + SR.G) return;
        p.res = { res: 'discard', jt: T, commitAt: T + SR.G }; g.discarded = true; g.log.push(p.logE = { k: p.k, s: p.s, D: Math.min(p.D, T), jt: T, res: 'discard', lane: null, t0: null, pts: 0, voids: p.voids, late: 0 }); finish(g, T + SR.G); return;
      }
    }
    // after commit: next parcel or end
    const fxLen = p.res.res === 'ok' ? SR.FX_OK : SR.FX_BAD, s = p.res.jt + fxLen;
    if (s >= T || p.res.jt >= T) { const endAt = Math.max(T, p.res.jt) + SR.G; if (now < endAt) return; finish(g, endAt); return; }
    show(g, p.k + 1, s);
  }
}
function commit(g, p) {
  const r = p.res; g.judged++;
  let pts = 0;
  if (r.res === 'ok') { g.streak++; g.correct++; pts = (10 + bonus(p.D, r.t0, p.dl)) * mult(g.streak); g.score += pts; g.maxStreak = Math.max(g.maxStreak, g.streak); }
  else g.streak = 0;
  r.pts = pts; r.streak = g.streak;
  const e = { k: p.k, s: p.s, D: p.D, ans: p.ans, res: r.res, lane: r.lane, t0: r.t0, jt: r.jt, commitAt: r.commitAt, pts, voids: p.voids, late: 0, fallback: !!p.fallback };
  g.log.push(e); g.commits.push(e); p.logE = e;
}
function finish(g, at) { g.phase = 'end'; g.end = { at, score: g.score, correct: g.correct, judged: g.judged, discarded: g.discarded }; g.endAt = at; }
// one input. Caller must not call while paused/notice (UI drops). Returns a tag for evidence.
// late_drop: the input's time t lies inside an already committed parcel's decision window [s, min(D, jt)).
function lateFor(g, t) {
  for (let i = g.log.length - 1; i >= 0 && i >= g.log.length - 3; i--) { const e = g.log[i]; if (t >= e.s) return t < Math.min(e.D, e.jt) ? e : null; }
  return null;
}
export function input(g, inp) {
  const { t, at, lane } = inp;
  if (g.phase === 'ready') return 'ignored';
  if (t >= SR.DUR) { if (g.phase !== 'end') advance(g, at); return 'ignored_T'; }
  if (g.phase !== 'end') advance(g, at);
  const p = g.cur;
  if (g.phase === 'end' || p.res || t < p.s) { const e = lateFor(g, t); if (e) { e.late++; g.late++; return 'late_drop'; } return 'ignored_fx'; }
  if (t >= p.D) return 'ignored_D';
  if (t < p.voidUntil) { p.voids++; g.voids++; return 'void'; }
  if (!p.pend) { p.pend = { t, at, lane }; return 'pending'; }
  if (t < p.pend.t) {   // earlier timestamp arrived later (still before commit): reorder
    if (p.pend.t < t + SR.W) { p.voidUntil = t + SR.W; p.pend = null; p.voids += 2; g.voids += 2; return 'void'; }
    p.pend = { t, at, lane }; return 'pending_reorder';
  }
  if (t < p.pend.t + SR.W) { p.voidUntil = p.pend.t + SR.W; p.pend = null; p.voids += 2; g.voids += 2; return 'void'; }
  return 'ignored_after_W';
}
// replay an admitted log; frames = optional list of frame times (only call advance) → identical results by construction
export function replay(seed, inputs, frames = []) {
  const g = newGame(seed); start(g);
  const ev = [...inputs.map((x, i) => ({ ...x, i, kind: 'in' })), ...frames.map((f) => ({ at: f, kind: 'fr' }))].sort((a, b) => a.at - b.at || (a.kind === 'fr') - (b.kind === 'fr') || (a.i ?? 0) - (b.i ?? 0));
  const tags = [];
  for (const e of ev) { if (e.kind === 'fr') advance(g, e.at); else tags.push(input(g, e)); }
  advance(g, Infinity);
  return { g, tags, summary: summary(g) };
}
export function summary(g) { return { score: g.score, correct: g.correct, judged: g.judged, late: g.late, voids: g.voids, end: g.end, dots: g.log.filter((e) => e.res !== 'discard').map((e) => (e.res === 'ok' ? '●' : e.res === 'bad' ? '○' : '·')).join(''), log: g.log.map((e) => [e.k, e.res, e.lane, e.t0, e.pts, e.voids, e.late]) }; }
// policy simulator (R11). policy(p) → { t, lane } | null. Arrival = t (+delay).
export function simulate(seed, policy, delay = 0) {
  const g = newGame(seed); start(g); let guard = 0; const inputs = [], tags = [];
  while (g.phase !== 'end' && guard++ < 5000) {
    const p = g.cur;
    if (g.phase === 'wait' && !p.pend && !p._asked) { p._asked = true; const a = policy(p, g); if (a) { const inp = { t: a.t, at: a.at ?? a.t + delay, lane: a.lane }; inputs.push(inp); tags.push(input(g, inp)); continue; } }
    advance(g, g.phase === 'wait' ? (p.pend ? p.pend.t + SR.W + SR.G : p.D + SR.G) : Infinity);
  }
  return { g, inputs, tags, summary: summary(g) };
}
