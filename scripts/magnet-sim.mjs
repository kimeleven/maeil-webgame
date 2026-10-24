// Magnet Harbor engine checks (t_1c491685): M2 M3 M5 M6 M6b M7 M11a M11b in node (same core file as the page).
// node scripts/magnet-sim.mjs [--json out.json]
import * as E from '../public/js/magnet-core.js';
import { writeFileSync, mkdirSync } from 'node:fs';
const out = {}; const fails = [];
const ok = (name, cond, detail = '') => { (cond ? console.log : console.error)(`${cond ? '✔' : '✘'} ${name}${detail ? ' — ' + detail : ''}`); if (!cond) fails.push(name); out[name] = { pass: !!cond, detail }; };
const { MH } = E;

// M2: one release within 5 s lands; by 30 s land, PERFECT, roll≠0, 2-cell box all occurred (safe bot, 100 seeds)
{
  let firstOk = 0, all30 = 0, worst = 0;
  for (let s = 0; s < 100; s++) {
    const seed = 'm2-' + s, g = E.createGame(seed); E.start(g); const P = E.POLICIES.safe(seed);
    let rel = 0, firstLand = null; const seen = { land: 0, perfect: 0, roll: 0, two: 0 };
    while (!g.over && g.tick < 1800) {
      const inp = P(g); if (inp.release && g.cargo) rel++;
      E.step(g, inp);
      for (const e of g.events.splice(0)) {
        if (e.k === 'land') { seen.land = 1; if (e.perfect) seen.perfect = 1; if (e.w === 2) seen.two = 1; if (firstLand == null) firstLand = { t: e.tick / 60, rel }; }
      }
      if (g.roll !== 0) seen.roll = 1;
    }
    if (firstLand && firstLand.t <= 5 && firstLand.rel === 1) firstOk++;
    worst = Math.max(worst, firstLand ? firstLand.t : 99);
    if (seen.land && seen.perfect && seen.roll && seen.two) all30++;
  }
  ok('M2 first landing ≤5 s with exactly one release (100 seeds)', firstOk === 100, `${firstOk}/100, slowest first landing ${worst.toFixed(2)} s`);
  ok('M2 land+PERFECT+roll+2-cell all within 30 s (100 seeds)', all30 === 100, `${all30}/100`);
}
// M3: replaying the recorded input log twice reproduces every box (ship,col,level) and the score
{
  let same = 0; const ex = [];
  for (let s = 0; s < 50; s++) for (const p of ['safe', 'randomTap']) {
    const seed = 'm3-' + s, g = E.simulate(seed, p), a = E.replay(seed, g.log), b = E.replay(seed, g.log);
    const k = (x) => JSON.stringify([x.placed, x.score, x.ships, x.fails]);
    if (k(g) === k(a) && k(a) === k(b)) same++; else ex.push(seed + p);
  }
  ok('M3 replay identical (50 seeds × 2 policies)', same === 100, `${same}/100 ${ex.slice(0, 3)}`);
}
// M5: no input after start → auto drop exactly 360 ticks after each cargo-ready tick, results < 30 s (100 seeds)
{
  let good = 0, maxT = 0, gaps = new Set();
  for (let s = 0; s < 100; s++) {
    const g = E.createGame('m5-' + s); E.start(g); let ready = 0;
    const evs = []; while (!g.over) { E.step(g, {}); evs.push(...g.events.splice(0)); }
    for (const e of evs) { if (e.k === 'ready') ready = e.tick; if (e.k === 'release') gaps.add(e.tick - ready); }
    maxT = Math.max(maxT, g.tick / 60); if (g.tick / 60 < 30 && g.ships === 0 && g.overWhy === 'lives') good++;
  }
  ok('M5 idle: auto drop 360 ticks after ready, result < 30 s (100 seeds)', good === 100 && gaps.size === 1 && gaps.has(360), `${good}/100, ready→drop ticks {${[...gaps]}}, worst ${maxT.toFixed(2)} s`);
}
// M6: placed boxes keep integer (col, level) until removed; never move (100 seeds, roll/heave active)
{
  let moves = 0, boxes = 0, nonInt = 0;
  for (let s = 0; s < 100; s++) {
    const seed = 'm6-' + s, g = E.createGame(seed); E.start(g); const P = E.POLICIES.safe(seed); const pos = new Map();
    while (!g.over) {
      E.step(g, P(g)); g.events.length = 0;
      const cur = new Map(); g.cols.forEach((col, c) => col.forEach((b, lv) => { if (b.k === 'box') { const key = b.id + ':' + c; cur.set(key, lv + 1); if (!Number.isInteger(b.lv) || !Number.isInteger(b.c)) nonInt++; } }));
      for (const [k, lv] of cur) { if (pos.has(k) && pos.get(k) !== lv) moves++; if (!pos.has(k)) boxes++; pos.set(k, lv); }
    }
  }
  ok('M6 box (col, level) fixed until removed (100 seeds)', moves === 0 && nonInt === 0, `${boxes} box-cells tracked, moved ${moves}, non-integer ${nonInt}`);
}
// M6b: boundary unit cases
{
  const mk = () => { const g = E.createGame('m6b'); E.start(g); g.events.length = 0; return g; };
  const drop = (g, c, w = 1) => { // place a cargo of width w exactly at column c (bypasses swing)
    g.cargo = { i: 99, w, ready: g.tick, auto: 999 }; g.th = 0; g.om = 0; g.crane.v = 0; g.crane.x = MH.SHIP_CX + E.colCenter(c, w); g.phase = 'play';
    E.step(g, { tx: g.crane.x, release: true }); for (let i = 0; i < MH.FALL + 2; i++) E.step(g, { tx: g.crane.x }); g.dropGap = 0;
    return g.events.splice(0);
  };
  let g = mk(); g.ship.target = 99; for (const c of [0, 1, 2, 3, 0, 1, 2, 3, 1, 2]) drop(g, c); // cols0-3 = 2,3,3,2
  const e4 = drop(g, 1); ok('M6b 4th level → over (sea fall)', e4.some((e) => e.k === 'fall' && e.why === 'over') && E.heights(g)[1] === 3, JSON.stringify(E.heights(g)));
  g = mk(); drop(g, 0); drop(g, 0); const e3 = drop(g, 0);
  ok('M6b column 3 above neighbour → top box drops (only 1)', e3.filter((e) => e.k === 'drop').length === 1 && e3.some((e) => e.why === 'step') && E.heights(g)[0] === 2, JSON.stringify(E.heights(g)));
  g = mk(); g.ship.target = 6; for (const c of [0, 0, 1, 1, 2, 2]) drop(g, c);
  ok('M6b load 6 ≥ target but 3 cols → no departure', g.ships === 0 && E.load(g) === 6 && E.usedCols(g) === 3, `load ${E.load(g)} cols ${E.usedCols(g)} ships ${g.ships}`);
  const ed = drop(g, 3); ok('M6b 4th column → departs', g.ships === 1 && ed.some((e) => e.k === 'depart'), `ships ${g.ships}`);
  g = mk(); drop(g, 2); const e2 = drop(g, 2, 2); // 2-cell over col2(h1)+col3(h0): blocks fill col3
  ok('M6b 2-cell box sits on max+1, low side blocked', g.cols[3][0].k === 'block' && g.cols[3][1].k === 'box' && E.load(g) === 3, JSON.stringify(g.cols.map((c) => c.map((b) => b.k[0]))) + e2.length);
}
// M7 + M11a + M11b
{
  let multi = 0, tiltClose = 0;
  const pol = ['idle', 'oneCol', 'stayTap'], m11a = {}; let stuck = 0;
  const check = (g) => { const h = E.heights(g); for (let c = 0; c < 6; c++) { const nb = Math.min(c ? h[c - 1] : 9, c < 5 ? h[c + 1] : 9); if (h[c] - nb >= 3 && g.cols[c][h[c] - 1].k === 'box') return true; } return false; };
  for (const p of [...pol, 'randomTap', 'safe']) {
    const ships = [], score = [];
    for (let s = 0; s < 20; s++) {
      const seed = 'm11-' + s, g = E.createGame(seed); E.start(g); const P = E.POLICIES[p](seed); let lastTilt = -99, lastDrop = -1;
      while (!g.over) {
        E.step(g, P(g));
        const ds = g.events.splice(0).filter((e) => e.k === 'drop');
        if (ds.length > 1 || (ds.length && ds[0].tick === lastDrop)) multi++;
        for (const d of ds) { if (d.why === 'tilt') { if (d.tick - lastTilt < 30) tiltClose++; lastTilt = d.tick; } lastDrop = d.tick; }
        if (g.dropGap === 0 && check(g)) stuck++;
      }
      ships.push(g.ships); score.push(g.score);
    }
    m11a[p] = { ships, score };
  }
  ok('M7 rule drops: one box at a time, tilt ≤1 per 0.5 s', multi === 0 && tiltClose === 0, `multi ${multi}, tilt<0.5s ${tiltClose}`);
  for (const p of pol) ok(`M11a ${p}: 0 ships on all 20 seeds`, m11a[p].ships.every((x) => x === 0), `ships ${m11a[p].ships.join(',')} score ${m11a[p].score.join(',')}`);
  ok('M11a no column left 3 above a neighbour (all policies incl. first 10 s)', stuck === 0, `violations ${stuck}`);
  const lower = m11a.randomTap.score.filter((x, i) => x < m11a.safe.score[i]).length;
  out.M11b = { randomTap: m11a.randomTap, safe: m11a.safe, lower };
  console.log(`M11b (measured, not a guarantee) randomTap < safe on ${lower}/20 seeds — random scores ${m11a.randomTap.score.join(',')} / safe ${m11a.safe.score.join(',')} / safe ships ${m11a.safe.ships.join(',')}`);
  ok('M11b target ≥18/20', lower >= 18, `${lower}/20`);
}
if (process.argv.includes('--json')) { mkdirSync(new URL('../reboot-evidence/magnet/', import.meta.url), { recursive: true }); writeFileSync(new URL('../reboot-evidence/magnet/sim.json', import.meta.url), JSON.stringify(out, null, 1)); }
console.log(fails.length ? `FAIL ${fails.length}: ${fails.join(' | ')}` : `ALL PASS ${Object.keys(out).filter((k) => out[k].pass !== undefined).length}`);
process.exit(fails.length ? 1 : 0);
