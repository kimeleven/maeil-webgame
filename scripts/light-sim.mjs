// Light Workshop engine evidence (t_b8fb1a93): L2 L3 L5 L6 L7 L10(engine) L11a L11b + score example + generation timing.
// node scripts/light-sim.mjs [--json]   Bot policies only — not human players.
import * as E from '../public/js/light-core.js';
import { writeFileSync, mkdirSync } from 'node:fs';
const ROOT = new URL('..', import.meta.url).pathname; const EV = `${ROOT}reboot-evidence/light/`; mkdirSync(EV, { recursive: true });
const out = {}; const fails = [];
const ok = (name, cond, detail = '') => { console[cond ? 'log' : 'error'](`${cond ? '✔' : '✘'} ${name}${detail ? ' — ' + JSON.stringify(detail) : ''}`); if (!cond) fails.push(name); out[name] = { pass: !!cond, detail }; };
const pop = (x) => { let c = 0; while (x) { c += x & 1; x >>>= 1; } return c; };
const run = (g, pol) => { E.start(g); while (g.phase !== 'result') { if (g.phase === 'play') { const a = pol(g); if (a === 'skip') E.skip(g); else if (a != null) E.tap(g, a); } if (g.phase === 'result') break; E.step(g); } return g; };

// ---- L3 generation contract ----
{
  const sig = (b) => E.encode(b) + '#' + b.par + '#' + b.k;
  let same = 0, total = 0, parOk = 0, rangeOk = 0, kOk = 0, maxTries = 0, how = {}, ms = [], b1 = 0;
  for (let s = 0; s < 1000; s++) for (let n = 1; n <= 30; n++) {
    const t0 = performance.now(); const a = E.genBoard('L3-' + s, n); ms.push(performance.now() - t0);
    const b = E.genBoard('L3-' + s, n); total++; if (sig(a) === sig(b)) same++;
    // independent brute force over all 2^k masks
    let par = Infinity; for (let m = 0; m < 1 << a.rot.length; m++) if (E.trace(a, m).all) par = Math.min(par, pop(m ^ a.start));
    if (par === a.par && !E.trace(a, a.start).all) parOk++;
    const t = E.TIERS[E.tierOf(n)]; if (a.par >= t.par[0] && a.par <= t.par[1] && (n === 1 ? a.par === 1 : a.par >= 2)) rangeOk++;
    const rotCells = a.type.filter((x, i) => x === E.MIRROR && a.rot.includes(i)).length; if (a.k === rotCells && a.k >= t.k[0] && a.k <= t.k[1]) kOk++;
    if (n === 1 && a.par === 1 && a.k === 1) b1++;
    maxTries = Math.max(maxTries, a.tries); how[a.how] = (how[a.how] || 0) + 1;
  }
  ms.sort((x, y) => x - y);
  const timing = { avg: +(ms.reduce((x, y) => x + y, 0) / ms.length).toFixed(3), p99: +ms[Math.floor(ms.length * 0.99)].toFixed(3), max: +ms[ms.length - 1].toFixed(3) };
  ok('L3 same seed+n twice → identical board (1000 seeds × 30)', same === total, { same, total });
  ok('L3 par = independent exhaustive search, start unsolved', parOk === total, { parOk, total });
  ok('L3 board 1 par=1 (k=1); boards 2-30 par>=2 and inside tier range', rangeOk === total && b1 === 1000, { rangeOk, b1 });
  ok('L3 k = number of rotatable mirrors, inside tier k range', kOk === total, { kOk });
  ok('L3 every board done within 33 tries; fallback use counted', maxTries <= 33, { maxTries, how });
  ok('L12 generation ≤ 5 ms per board (node, this Mac)', timing.max <= 5, timing);
  // forced fallbacks: deterministic flip path and built-in table
  let flipOk = 0, flipN = 0, tabOk = 0, tabN = 0;
  for (let s = 0; s < 50; s++) for (let n = 1; n <= 30; n++) {
    const t = E.TIERS[E.tierOf(n)];
    const f = E.genBoard('FB-' + s, n, { forceFallback: true }); flipN++; if (f.how !== 'gen' && f.par >= t.par[0] && f.par <= t.par[1] && f.tries <= 33 && E.encode(f) === E.encode(E.genBoard('FB-' + s, n, { forceFallback: true }))) flipOk++;
    const tb = E.genBoard('FB-' + s, n, { forceTable: true, forceFallback: true }); tabN++; if (tb.how === 'table' && tb.par >= t.par[0] && tb.par <= t.par[1] && !E.trace(tb, tb.start).all) tabOk++;
  }
  const tableEach = E.FALLBACK.map((rows, ti) => rows.map((r) => { const d = E.decode(r); const p = E.solve(d).par; const t = E.TIERS[ti]; return p >= t.par[0] && p <= t.par[1] && d.rot.length >= t.k[0] && d.rot.length <= t.k[1]; }).every(Boolean));
  ok('L3 forced flip-fallback: deterministic, par in range', flipOk === flipN, { flipOk, flipN });
  ok('L3 FALLBACK table: all 16 built-in boards par/k in range, used when forced', tabOk === tabN && tableEach.every(Boolean), { tabOk, tabN, tableEach });
  const g1 = E.simulate('det', 'random'), g2 = E.simulate('det', 'random'); const r = E.replay('det', g1.log);
  ok('L3 replay of input log → same boards/score (node)', g1.boards === r.boards && g1.score === r.score && g1.boards === g2.boards, { boards: r.boards, score: r.score });
}
// ---- L2 first 30 s with a scripted bot: board1 tap at 1 s; board2 same mirror ×5 (warn then reset); then oracle every 0.5 s ----
{
  let pass = 0, worst = {}; const N = 100;
  for (let s = 0; s < N; s++) {
    const g = E.createGame('L2-' + s); let b2 = 0;
    const pol = (g) => {
      if (g.n === 1) return g.tick >= 60 && g.used === 0 ? g.board.rot[0] : null;
      if (g.n === 2 && b2 < 5) { if (g.tick % 12) return null; b2++; return g.board.rot[0]; }
      if (g.tick % 30) return null; const a = E.POLICIES.safe({ ...g, tick: 0 }); return a ? a.c : null;
    };
    run(g, pol);
    const ev = g.ev.filter((e) => e.t <= 1800);
    const first = g.ev.find((e) => e.k === 'solve' && e.n === 1);
    const has = { first5s: !!first && first.t <= 300 && first.used === 1, fixed: ev.some((e) => e.k === 'board' && e.fixed >= 1), lamps2: ev.some((e) => e.k === 'board' && e.lamps >= 2), warn: ev.some((e) => e.k === 'warn'), bonus: ev.some((e) => e.k === 'solve' && e.bonus > 0) };
    if (Object.values(has).every(Boolean)) pass++; else worst[s] = has;
  }
  ok('L2 scripted bot: board1 solved by 1 tap ≤5 s; ≤30 s fixed mirror, 2-lamp board, limit warning, min-tap bonus', pass === N, { pass, N, fails: worst });
}
// ---- L5 idle 90 s ----
{
  const ticks = []; for (let s = 0; s < 20; s++) ticks.push(E.simulate('L5-' + s, 'idle').tick);
  ok('L5 idle after start → result at exactly 5400 ticks (90 s), 20 seeds', ticks.every((t) => t === 5400), { ticks: [...new Set(ticks)] });
}
// ---- L6 reset / skip / penalty to 0 ----
{
  const g = E.createGame('L6'); E.start(g); E.step(g); E.tap(g, g.board.rot[0]); // solve board 1
  while (g.phase === 'trans') E.step(g);
  const b = g.board, left0 = g.left, c = b.rot[0]; let taps = 0;
  while (g.used < b.limit - 0 && g.resets === 0) { E.tap(g, c); taps++; for (let i = 0; i < E.LW.ROT; i++) E.step(g); }
  const dTime = left0 - g.left - (taps - 1) * E.LW.ROT - E.LW.ROT; // subtract time stepped
  ok('L6 limit (par+3) used without solving → start layout back, exactly −180 ticks (3 s)', g.resets === 1 && g.mask === b.start && g.used === 0 && dTime === 180 && taps === b.limit, { taps, limit: b.limit, dTime });
  const s0 = g.score, l1 = g.left, n1 = g.n; E.skip(g);
  ok('L6 skip → −300 ticks (5 s), 0 points, next board', l1 - g.left === 300 && g.score === s0 && g.n === n1 + 1, { d: l1 - g.left });
  g.left = 200; E.skip(g); ok('L6 penalty to ≤0 → result immediately', g.phase === 'result' && g.left === 0);
  const h = E.createGame('L6b'); E.start(h); E.tap(h, h.board.rot[0]); while (h.phase === 'trans') E.step(h); // now on board 2 (par>=2)
  h.left = 150; const hb = h.board; let k = 0;
  while (h.phase === 'play' && k < 10) { E.tap(h, hb.rot[0]); k++; if (h.phase === 'play') for (let j = 0; j < 7; j++) E.step(h); }
  ok('L6 reset penalty crossing 0 → result in that tick', h.phase === 'result' && h.left === 0 && h.resets === 1, { phase: h.phase, taps: k, limit: hb.limit });
}
// ---- L7 / L10 (engine) ----
{
  const g = E.createGame('L7'); E.start(g); const r1 = E.tap(g, g.board.rot[0]);
  const logN = g.log.length, sc = g.score; const r2 = E.tap(g, g.board.rot[0]); E.step(g); const r3 = E.tap(g, g.board.rot[0]);
  const solves = g.ev.filter((e) => e.k === 'solve').length;
  ok('L7 solve fires once; taps during 0.6 s transition not counted', r1.r === 'solve' && r2.r === 'ignored' && r3.r === 'ignored' && g.log.length === logN && g.score === sc && solves === 1, { r: [r1.r, r2.r, r3.r] });
  let t = 0; while (g.phase === 'trans') { E.step(g); t++; } ok('L7 transition lasts 36 ticks (0.6 s)', t === 35 || t === 36, { t: t + 1 });
  const b = g.board, inert = b.type.map((x, i) => i).filter((i) => !b.rot.includes(i));
  const before = JSON.stringify([g.mask, g.used, g.log.length]); const rs = inert.map((i) => E.tap(g, i).r);
  ok('L10 fixed mirror / wall / empty / lamp taps change nothing', JSON.stringify([g.mask, g.used, g.log.length]) === before && rs.every((x) => x === 'inert'), { n: inert.length });
  E.tap(g, b.rot[0]); const u = g.used; const rl = E.tap(g, b.rot[0]); E.step(g); const rl2 = E.tap(g, b.rot[0]);
  ok('L10 same mirror during 0.12 s rotation → ignored, not counted', rl.r === 'locked' && rl2.r === 'locked' && g.used === u, { used: g.used });
}
// ---- score example (GDD 7): 3rd consecutive min-tap solve with limit par+3 → 100 + 45 + 150 = 295 ----
{
  const g = E.createGame('SC'); E.start(g); const pts = [];
  while (pts.length < 3 && g.phase !== 'result') { if (g.phase === 'play') { const a = E.POLICIES.safe({ ...g, tick: 0 }); const r = E.tap(g, a.c); if (r.r === 'solve') pts.push(r.pts); } for (let i = 0; i < 8; i++) E.step(g); }
  ok('Score: min-tap streak 1,2,3 → 195, 245, 295 (bonus ×mult only)', JSON.stringify(pts) === '[195,245,295]', pts);
}
// ---- L11a design guarantees ----
{
  const rows = {}; let pass = true;
  for (const p of ['idle', 'sameMirror', 'skipSpam']) {
    const r = []; for (let s = 0; s < 20; s++) { const g = E.simulate('L11-' + s, p); const after1 = g.ev.filter((e) => e.k === 'solve' && e.n > 1).length; r.push({ boards: g.boards, after1, resets: g.resets, score: g.score });
      if (after1 !== 0) pass = false;
      if (p === 'sameMirror') { // every limit exhaustion → reset
        const boardsSeen = g.ev.filter((e) => e.k === 'board' && e.n > 1).length; if (g.resets < boardsSeen - 1 || g.boards !== 1) pass = false; }
    }
    rows[p] = { boards: [...new Set(r.map((x) => x.boards))], resets: [Math.min(...r.map((x) => x.resets)), Math.max(...r.map((x) => x.resets))], score: [Math.min(...r.map((x) => x.score)), Math.max(...r.map((x) => x.score))] };
  }
  // reset happens every time the limit is hit (count taps vs resets on sameMirror)
  const g = E.simulate('L11-cnt', 'sameMirror'); const taps2 = g.log.filter((e) => e.a === 'tap').length - 1; const lim = g.board.limit;
  ok('L11a idle / same mirror / skip spam: 0 boards beyond board 1, reset on every limit hit (20 seeds)', pass && g.resets === Math.floor(taps2 / lim), { rows, check: { taps2, lim, resets: g.resets } });
}
// ---- L11b measured: random tap vs oracle ----
{
  let lower = 0; const rows = []; const perK = {};
  for (let s = 0; s < 20; s++) { const r = E.simulate('L11b-' + s, 'random'), o = E.simulate('L11b-' + s, 'safe'); if (r.boards < o.boards && r.score < o.score) lower++; rows.push([r.boards, r.score, o.boards, o.score]); }
  // random solve rate within limit per k: fresh boards, random taps until solve or limit
  for (let s = 0; s < 300; s++) for (let n = 1; n <= 12; n++) { const b = E.genBoard('K-' + s, n); const R = E.rng(E.hash('rk' + s + n)); let m = b.start, solvedIn = false;
    for (let u = 0; u < b.limit; u++) { m ^= 1 << Math.floor(R() * b.k); if (E.trace(b, m).all) { solvedIn = true; break; } }
    const e = (perK[b.k] = perK[b.k] || { n: 0, solved: 0 }); e.n++; if (solvedIn) e.solved++; }
  for (const k in perK) perK[k].rate = +(perK[k].solved / perK[k].n).toFixed(3);
  ok('L11b (measured) random tapping below oracle in boards & score: seeds', lower === 20, { lower, of: 20, sample: rows.slice(0, 5), randomSolveRateByK: perK });
}
const total = Object.keys(out).length;
console.log(fails.length ? `FAIL ${fails.length}/${total}: ${fails.join(' | ')}` : `ALL PASS ${total}`);
writeFileSync(EV + 'sim.json', JSON.stringify({ at: new Date().toISOString(), node: process.version, out }, null, 1));
process.exit(fails.length ? 1 : 0);
