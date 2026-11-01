// Orbit Switch core evidence (t_34f9c354): O2 O3 O4 O5 O11 O12 via the same core the page runs.
// node scripts/orbit-sim.mjs  → reboot-evidence/orbit/sim.json, exit 1 on any failure.
import { writeFileSync, mkdirSync } from 'node:fs';
import * as O from '../public/js/orbit-core.js';
const ROOT = new URL('..', import.meta.url).pathname;
const out = {}; const fails = [];
const ok = (name, cond, detail) => { (cond ? console.log : console.error)(`${cond ? '✔' : '✘'} ${name}${detail ? ' — ' + detail : ''}`); if (!cond) fails.push(name); };
const seeds = (n, p = 's') => Array.from({ length: n }, (_, i) => `${p}${i}`);

// O2: first ring reachable with one tap before 5 s; block, door, ring all seen within 30 s
{
  const rows = [];
  for (const s of ['2026-10-23', ...seeds(99)]) {
    const L = O.generate(s); const g = O.createGame(L);
    while (g.t < 30 && !g.over) { if (Math.abs(g.t - 1.0) < O.OC.DT / 2) O.input(g, 'bot'); O.step(g); }
    const firstRing = g.log.rings.find((r) => r.kind === 'ring');
    const types30 = new Set(L.obs.filter((o) => o.enter < 30).map((o) => o.type));
    rows.push({ s, firstRingT: firstRing ? +firstRing.t.toFixed(2) : null, oneTapGot: !!firstRing && firstRing.t < 5, block: types30.has('block'), door: types30.has('door'), ring30: L.rings.some((r) => r.t < 30) });
  }
  const bad = rows.filter((r) => !(r.oneTapGot && r.block && r.door && r.ring30));
  out.O2 = { seeds: rows.length, bad: bad.length, sample: rows[0] };
  ok('O2 first ring <5s with 1 tap, block+door+ring <30s (100 seeds)', bad.length === 0, bad.length ? JSON.stringify(bad.slice(0, 3)) : `daily: ring ${rows[0].firstRingT}s`);
}
// O3: warning lead ≥ table value for every obstacle (generator + runtime log)
{
  let n = 0, minMargin = 9; const bad = [];
  for (const s of seeds(100)) {
    const L = O.generate(s); const g = O.simulate(L, 'safe');
    for (const w of g.log.warnSeen) { n++; const need = O.seg(w.enter).warn; minMargin = Math.min(minMargin, w.lead - need); if (w.lead < need - 1e-9) bad.push({ s, ...w }); }
  }
  out.O3 = { obstacles: n, minMarginSec: +minMargin.toFixed(4), bad: bad.length };
  ok('O3 warning lead ≥ table (0.8/0.8/0.7/0.6 s)', bad.length === 0, `${n} obstacles, min margin ${minMargin.toFixed(4)}s`);
}
// O4: same seed → same first 10 obstacles/rings; different seed differs
{
  const pick = (L) => JSON.stringify({ o: L.obs.slice(0, 10).map((o) => [o.type, o.lane, o.T.toFixed(4), o.hw.toFixed(4)]), r: L.rings.slice(0, 10).map((r) => [r.kind, r.lane, r.t.toFixed(4)]) });
  const a = pick(O.generate('2026-10-23')), b = pick(O.generate('2026-10-23')), c = pick(O.generate('2026-10-24'));
  out.O4 = { same: a === b, differs: a !== c };
  ok('O4 deterministic seed (first 10 obstacles + rings)', a === b && a !== c);
}
// O5: 100 seeds — every required switch has ≥0.25 s window, cooldown-feasible, and the warning-only safe bot clears 90 s
{
  let minW = 9, minSlack = 9, switches = 0; const notClear = [];
  const types = {};
  for (const s of seeds(100)) {
    const L = O.generate(s);
    for (const o of L.obs) types[o.vb ? 'bar' : o.pair !== undefined ? 'double' : o.type] = (types[o.vb ? 'bar' : o.pair !== undefined ? 'double' : o.type] || 0) + 1;
    for (const w of O.switchWindows(L)) { switches++; minW = Math.min(minW, w.window); minSlack = Math.min(minSlack, w.slack); }
    const g = O.simulate(L, 'safe'); if (!g.clear || g.log.hits.length) notClear.push({ s, t: g.t, hits: g.log.hits.length });
  }
  out.O5 = { seeds: 100, requiredSwitches: switches, minWindowSec: +minW.toFixed(4), minSlackSec: +minSlack.toFixed(4), safeBotClearNoHit: 100 - notClear.length, notClear, obstacleTypes: types };
  ok('O5 required switch window ≥ 0.25 s (100 seeds)', minW >= 0.25 - 1e-9 && minSlack >= 0, `${switches} switches, min window ${minW.toFixed(3)}s, min slack ${minSlack.toFixed(3)}s`);
  ok('O5 warning-only safe bot clears 90 s with 0 hits on all 100 seeds', notClear.length === 0, notClear.length ? JSON.stringify(notClear.slice(0, 3)) : '');
}
// O11: forced placement — hit while mid-switch (interpolated radius), cooldown / repeat ignored
{
  const run = (ob, switchAt, extraInputs = []) => {
    const L = { seed: 'forced', obs: [ob], rings: [] }; const g = O.createGame(L); g.shields = 0;
    const presses = [switchAt, ...extraInputs];
    while (!g.over && g.t < ob.exit + 0.3) { for (const p of presses) if (Math.abs(g.t - p) < O.OC.DT / 2) O.input(g, 'test'); O.step(g); }
    return g;
  };
  const dest = O.placeOb(1, 5.0); // obstacle on the OUTER lane; player starts inner and switches out
  const g1 = run(dest, dest.enter - 0.10);
  const orig = O.placeOb(0, 5.0); // obstacle on the INNER (origin) lane; switch starts just before it
  const g2 = run(orig, orig.enter - 0.015);
  const g3 = run(dest, dest.enter - 0.6); // control: switch completes long before → hit (sits on outer)
  const g4 = run(orig, orig.enter - 0.3); // control: left inner early → safe
  const c = O.createGame({ seed: 'x', obs: [], rings: [] });
  for (let i = 0; i < 240; i++) O.step(c);
  const a1 = O.input(c, 'tap'); for (let i = 0; i < 24; i++) O.step(c); const a2 = O.input(c, 'tap'); for (let i = 0; i < 36; i++) O.step(c); const a3 = O.input(c, 'tap');
  out.O11 = {
    destLaneMidSwitch: { hit: g1.log.hits.length === 1, r: g1.log.hits[0]?.r, inTransition: g1.log.hits[0]?.trans },
    originLaneJustLeaving: { hit: g2.log.hits.length === 1, r: g2.log.hits[0]?.r, inTransition: g2.log.hits[0]?.trans },
    control: { sittingOnBlockedLaneHit: g3.log.hits.length === 1, leftEarlySafe: g4.log.hits.length === 0 },
    cooldown: { first: a1, at0_1s: a2, at0_25s: a3, ignoredLog: c.log.ignored },
  };
  ok('O11 hit during switch (dest lane, interpolated r)', g1.log.hits.length === 1 && g1.log.hits[0].trans, `r=${g1.log.hits[0]?.r.toFixed(3)}`);
  ok('O11 hit during switch (origin lane, interpolated r)', g2.log.hits.length === 1 && g2.log.hits[0].trans, `r=${g2.log.hits[0]?.r.toFixed(3)}`);
  ok('O11 controls (stay=hit, early leave=safe)', g3.log.hits.length === 1 && g4.log.hits.length === 0);
  ok('O11 2nd input within 0.25 s ignored, accepted at 0.25 s', a1 && !a2 && a3);
}
// O12: 20 seeds × 4 policies
{
  const rows = []; let bad = 0, mashClear = 0;
  for (const s of seeds(20, 'p')) {
    const L = O.generate(s); const r = {};
    for (const p of ['idle', 'fixed', 'mash', 'safe']) r[p] = +O.simulate(L, p).t.toFixed(2);
    if (!(r.idle < r.safe && r.fixed < r.safe && r.mash < r.safe)) bad++;
    if (r.mash >= O.OC.DUR) mashClear++;
    rows.push({ seed: s, ...r });
  }
  const avg = (k) => +(rows.reduce((a, r) => a + r[k], 0) / rows.length).toFixed(2);
  out.O12 = { rows, avg: { idle: avg('idle'), fixed: avg('fixed'), mash: avg('mash'), safe: avg('safe') }, max: { idle: Math.max(...rows.map((r) => r.idle)), fixed: Math.max(...rows.map((r) => r.fixed)), mash: Math.max(...rows.map((r) => r.mash)) }, seedsViolating: bad, mashClears: mashClear };
  ok('O12 idle/fixed/mash shorter than safe on all 20 seeds', bad === 0, JSON.stringify(out.O12.avg));
  ok('O12 mash clears 90 s on 0 seeds', mashClear === 0, `max mash ${out.O12.max.mash}s`);
}
mkdirSync(`${ROOT}reboot-evidence/orbit`, { recursive: true });
writeFileSync(`${ROOT}reboot-evidence/orbit/sim.json`, JSON.stringify(out, null, 1));
console.log(fails.length ? `FAILED ${fails.length}` : 'all core checks passed');
process.exit(fails.length ? 1 : 0);
