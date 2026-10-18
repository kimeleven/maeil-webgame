// Gate Rush v4 balance simulation (REBOOT-SPEC §3.6). Writes reboot-evidence/rush-sim.json.
// usage: node scripts/rush-sim.mjs [--a 45 --b 4] [--out path]
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import * as G from '../public/js/rush-core.js';

const DT = 1 / 60, MAX_STAGE = 40, REACT = 0.25;

function gateBest(run, e) {
  const l = G.applyGate(run.power, e.left, run.stage, run.mods), r = G.applyGate(run.power, e.right, run.stage, run.mods);
  return l > r ? -1 : 1;
}

const controllers = {
  idle: () => () => 0,
  random: (seed) => {
    const r = G.rng(G.hashSeed('rand:' + seed));
    let lane = r() < 0.5 ? -1 : 1, nextIdx = 0;
    return (run) => {
      const e = run.course[nextIdx];
      if (e && run.t >= e.time - 0.9) { lane = r() < 0.5 ? -1 : 1; nextIdx++; }
      if (run.t < 0.01) nextIdx = 0;
      return lane * 0.75;
    };
  },
  greedy: () => (run) => {
    const win = G.reactionWindow(run.stage, run.t, run.mods);
    const e = run.course.find((e) => !e.done && e.type === 'gate' && e.time - run.t < win);
    return e ? gateBest(run, e) * 0.75 : run.target;
  },
  skilled: () => (run) => {
    const t = run.t, win = G.reactionWindow(run.stage, t, run.mods), c = [];
    for (const e of run.course) {
      if (e.done || e.time - t > win - REACT) continue;
      c.push([e.time, e.type === 'gate' ? gateBest(run, e) : -e.lane]);
    }
    for (const a of run.attacks) {
      if (a.state === 'pending' || a.state === 'done' || t - a.warnAt < REACT) continue;
      if (a.type === 'A' || a.type === 'F' || a.type === 'B') { if (a.state === 'warned') c.push([a.hit, -a.lane]); }
      else if (a.type === 'E') { if (a.state === 'warned') c.push([a.hit, -a.lane]); c.push([a.hit2, -a.lane2]); }
      else if (a.type === 'C') { if (a.state === 'warned') c.push([a.hit, -a.lane]); c.push([a.hit2, a.lane]); }
    }
    c.sort((p, q) => p[0] - q[0]);
    return c.length ? c[0][1] * 0.75 : run.target;
  },
};

function pickUpgrade(policy, run) {
  const ch = run.choices;
  if (policy.build === 'armor') return ch.includes('armor') ? 'armor' : (ch.find((k) => k === 'recruit' || k === 'amplify') || ch[0]);
  const want = run.stage % 2 ? 'recruit' : 'amplify', alt = want === 'recruit' ? 'amplify' : 'recruit';
  return ch.includes(want) ? want : ch.includes(alt) ? alt : ch[0];
}

export function simulate(seed, policy, opts = {}) {
  const run = G.createRun({ seed, bossA: opts.a, bossB: opts.b });
  G.startStage(run);
  const ctl = controllers[policy.name](seed);
  const hits = {};
  while (run.stage <= MAX_STAGE) {
    while (run.state === 'running') {
      run.target = ctl(run); G.step(run, DT);
      for (const ev of run.events.splice(0)) if (ev.kind === 'hit') hits[ev.label] = (hits[ev.label] || 0) + 1;
    }
    if (run.state !== 'upgrade') break;
    if (run.stage >= MAX_STAGE) break;
    G.chooseUpgrade(run, pickUpgrade(policy, run));
  }
  const cleared = run.history.filter((h) => h.win).length;
  return { reached: run.stage, cleared, score: run.score, hits, log: run.log, history: run.history };
}

export function runAll(opts = {}) {
  const seeds = Array.from({ length: 50 }, (_, i) => 'sim-' + i);
  const policies = [
    { key: 'idle', name: 'idle' }, { key: 'random', name: 'random' }, { key: 'greedy', name: 'greedy' },
    { key: 'skilled', name: 'skilled' }, { key: 'skilled_armor', name: 'skilled', build: 'armor' },
  ];
  const res = {}, minWarn = {}, firstStage = {};
  for (const p of policies) {
    const runs = seeds.map((s) => simulate(s, p, opts));
    const pct = (f) => +(100 * runs.filter(f).length / runs.length).toFixed(1);
    res[p.key] = {
      clear1: pct((r) => r.cleared >= 1), reach3: pct((r) => r.reached >= 3), reach5: pct((r) => r.reached >= 5),
      reach8: pct((r) => r.reached >= 8), reach12: pct((r) => r.reached >= 12),
      avgReached: +(runs.reduce((a, r) => a + r.reached, 0) / runs.length).toFixed(2),
      reached: runs.map((r) => r.reached),
    };
    for (const r of runs) for (const l of r.log) {
      minWarn[l.type] = Math.min(minWarn[l.type] ?? 99, l.warn);
      firstStage[l.type] = Math.min(firstStage[l.type] ?? 99, l.stage);
    }
  }
  const s = res;
  const checks = {
    idle_clear1_0: s.idle.clear1 === 0,
    random_clear1_le20: s.random.clear1 <= 20,
    greedy_reach3_le30: s.greedy.reach3 <= 30,
    skilled_clear1_100: s.skilled.clear1 === 100,
    skilled_reach5_ge70: s.skilled.reach5 >= 70,
    skilled_reach12_le20: s.skilled.reach12 <= 20,
    armor_build_worse: s.skilled_armor.avgReached < s.skilled.avgReached,
  };
  return { bossA: opts.a ?? G.BOSS_A, bossB: opts.b ?? G.BOSS_B, results: res, checks, pass: Object.values(checks).every(Boolean), minWarn, firstStage };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
  const opts = { a: arg('--a') ? +arg('--a') : undefined, b: arg('--b') ? +arg('--b') : undefined };
  const out = arg('--out') || new URL('../reboot-evidence/rush-sim.json', import.meta.url).pathname;
  const r = runAll(opts);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), seeds: 'sim-0..sim-49', ...r }, null, 1));
  const brief = Object.fromEntries(Object.entries(r.results).map(([k, v]) => [k, { ...v, reached: undefined }]));
  console.log(JSON.stringify({ bossA: r.bossA, bossB: r.bossB, brief, checks: r.checks, pass: r.pass, minWarn: r.minWarn, firstStage: r.firstStage }, null, 1));
}
