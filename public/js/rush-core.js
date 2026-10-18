// Gate Rush v4 core — pure, deterministic game logic (REBOOT-SPEC §3).
// Shared by the browser renderer (public/js/rush.js) and the Node simulation (scripts/rush-sim.mjs).
// No DOM, no Math.random: every random draw comes from the seeded rng.

export const BOSS_A = 36; // boss coefficient: spec 45 → 36 (−20%, §3.6 sim tuning)
export const BOSS_B = 3.2; // spec 4 → 3.2 (−20%)
export const DURATION = 30;
export const LANE = 0.65; // lane centre used by attacks
export const UPGRADES = ['recruit', 'amplify', 'armor', 'magnet', 'scout', 'gamble'];
export const UPGRADE_CAP = { armor: 5, magnet: 3, scout: 3, gamble: 2 }; // armor 12%×5 = 60%
export const ZONES = 8;

export function hashSeed(seed) {
  let h = 2166136261;
  for (const ch of String(seed)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}
export function rng(s) {
  return () => {
    s |= 0; s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- difficulty formulas (§3.2) ----
export const speedAt = (s, t) => Math.min(4.2, 1.45 + 0.14 * (s - 1) + (0.9 * t) / 30);
export const eventInterval = (s) => Math.max(1.45, 2.0 - 0.05 * (s - 1));
export const eventCount = (s) => Math.floor(26 / eventInterval(s) + 1e-9);
export const bossDefense = (s, a = BOSS_A, b = BOSS_B) => Math.round(240 + a * (s - 1) + b * (s - 1) ** 2);
export const barrierDamage = (s) => 30 + 4 * s;
export const attackGap = (s) => Math.max(1.6, 4.5 - 0.3 * (s - 1));
export const zoneOf = (s) => ((s - 1) % ZONES) + 1;
export const droneWarn = (v) => Math.max(0.8, 2.6 / v);
export function reactionWindow(s, t, mods = {}) {
  let w = Math.max(0.8, 3.0 / speedAt(s, t)) + 0.15 * (mods.scout || 0);
  if (zoneOf(s) === 6) w *= 0.7; // 암흑 터널: far gates hidden
  return w;
}
export const recruitBonus = (m) => Math.round(12 * Math.sqrt(m.recruit || 0));
export const ampBonus = (m) => 10 * Math.sqrt(m.amplify || 0);

// pattern availability per stage (§3.3); s>=9 → everything on
export function patternsFor(s) {
  const p = { A: true, B: s >= 2, C: s >= 3, D: s >= 4, E: s >= 6, F: s >= 8 };
  const z = zoneOf(s);
  return { ...p, bDouble: z === 5 || s >= 9, cFast: z === 7 || s >= 9, dark: z === 6 };
}

// ---- course (gates/barriers) ----
function gateSet(s, r, m) {
  const plus = () => ({ op: '+', n: 24 + 2 * s + Math.floor(r() * 11) });
  const times = () => ({ op: 'x', n: 1.6 });
  const minus = (k = 1) => ({ op: '-', n: Math.round((14 + 3 * s) * k) });
  const risk = () => ({ op: 'risk', n: 2 });
  const roll = r();
  if (s >= 3 && roll < 0.25) return { kind: 'bothBad', pair: [minus(1), r() < 0.5 ? minus(1.9) : risk()] };
  if (s >= 5 && roll < 0.40) return { kind: 'bothGood', pair: [plus(), times()] };
  const good = r() < 0.5 ? plus() : times();
  const bad = r() < 0.6 ? minus() : risk();
  return { kind: 'mixed', pair: [good, bad] };
}

export function makeCourse(seed, s, mods = {}) {
  const r = rng((hashSeed(seed) + s * 7919) >>> 0);
  const gap = eventInterval(s), n = eventCount(s), ev = [];
  for (let i = 0; i < n; i++) {
    const time = +(3 + i * gap).toFixed(4);
    if (i % 3 === 2) ev.push({ i, time, type: 'barrier', lane: r() < 0.5 ? -1 : 1 });
    else {
      const g = gateSet(s, r, mods);
      const flip = r() < 0.5;
      ev.push({ i, time, type: 'gate', kind: g.kind, left: flip ? g.pair[1] : g.pair[0], right: flip ? g.pair[0] : g.pair[1] });
    }
  }
  return ev;
}

export function applyGate(v, g, s, m = {}) {
  const amp = ampBonus(m);
  if (g.op === 'x') return Math.max(0, Math.round(v + Math.min(v * (g.n - 1), 60 + 5 * s + amp)));
  if (g.op === 'risk') return Math.max(0, Math.round(v - 25 + Math.min(Math.max(0, v - 25), 80 + amp + 40 * (m.gamble || 0))));
  if (g.op === '-') return Math.max(0, Math.round(v - g.n * (1 + 0.1 * (m.gamble || 0))));
  return Math.round(v + g.n + 5 * Math.sqrt(m.amplify || 0));
}
export function gateLabel(g) {
  return g.op === 'risk' ? '−25→×2' : g.op === 'x' ? '×' + g.n : (g.op === '-' ? '−' : '+') + g.n;
}

// ---- attack schedule (deterministic times/types; drone lanes are aimed at runtime) ----
export function makeAttacks(seed, s, course) {
  const r = rng((hashSeed(seed) + s * 7919 + 104729) >>> 0);
  const P = patternsFor(s), list = [];
  const gateTimes = course.filter((e) => e.type === 'gate').map((e) => e.time);
  const barTimes = course.filter((e) => e.type !== 'gate').map((e) => e.time);
  // no impact within ±0.7s of a gate pass (§3.3), ±0.35s of a barrier (readability)
  const busy = (a, b) => gateTimes.find((g) => g > a - 0.7 && g < b + 0.7) ?? barTimes.find((g) => g > a - 0.35 && g < b + 0.35);
  const clearOfGates = (hit) => {
    for (let k = 0; k < 8; k++) {
      const near = busy(hit, hit);
      if (near === undefined) return hit;
      hit = near + (gateTimes.includes(near) ? 0.7 : 0.35) + 1e-3;
    }
    return hit;
  };
  let t = 6;
  while (t < 26.2) {
    const pool = ['A', 'A'];
    if (P.B) pool.push('B', ...(P.bDouble ? ['B', 'B'] : []));
    if (P.C) pool.push('C', 'C');
    if (P.E) pool.push('E');
    const type = s === 1 ? 'A' : pool[Math.floor(r() * pool.length)];
    const v = speedAt(s, t);
    if (type === 'A' || type === 'E') {
      const warn = droneWarn(v);
      const hit = clearOfGates(t + warn);
      if (type === 'A') list.push({ type, warnAt: t, hit, warn: hit - t });
      else list.push({ type, warnAt: t, hit, hit2: clearOfGates(hit + 0.6), warn: hit - t });
      t = (type === 'E' ? list.at(-1).hit2 : hit);
    } else if (type === 'B') {
      const hit = clearOfGates(t + 0.9);
      list.push({ type, warnAt: hit - 0.9, hit, warn: 0.9, lane: r() < 0.5 ? -1 : 1 });
      t = hit;
    } else {
      const sweep = 1.2 / (P.cFast ? 1.3 : 1);
      let start = t + 0.8;
      const dir = r() < 0.5 ? 1 : -1; // 1: left→right
      // keep both discrete checks ≥0.7s away from gate passes (§3.3 rule). Barriers are allowed
      // between/near the two checks (the gate-free window at high stages is too short otherwise).
      const busyG = (a, b) => gateTimes.find((g) => g > a - 0.7 && g < b + 0.7);
      let ok = false;
      for (let k = 0; k < 12; k++) {
        const bad = busyG(start + sweep * 0.25, start + sweep * 0.75);
        if (bad === undefined) { ok = true; break; }
        start = bad + 0.7 - sweep * 0.25 + 1e-3;
      }
      if (!ok || start + sweep > 27.5) { t = start; continue; }
      t = start - 0.8;
      const h1 = start + sweep * 0.25, h2 = start + sweep * 0.75;
      list.push({ type, warnAt: t, start, hit: h1, hit2: h2, sweep, dir, warn: 0.8 });
      t = start + sweep;
    }
    t += attackGap(s) + r() * 0.8;
  }
  if (P.D) list.push({ type: 'D', warnAt: 14, hit: 15, warn: 1 });
  if (P.F) { const hit = clearOfGates(28.4); list.push({ type: 'F', warnAt: hit - droneWarn(speedAt(s, hit)), hit, warn: droneWarn(speedAt(s, hit)) }); }
  list.sort((a, b) => a.warnAt - b.warnAt);
  return list;
}

export function upgradeChoices(seed, s, mods) {
  const r = rng((hashSeed(seed) + s + 1000) >>> 0);
  const pool = UPGRADES.filter((k) => !(UPGRADE_CAP[k] && (mods[k] || 0) >= UPGRADE_CAP[k]));
  const out = [];
  while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
  return out;
}

const hitsLane = (x, lane) => Math.abs(x - lane * LANE) < 0.76;

// ---- run state machine ----
export function createRun({ seed, stage = 1, mods = {}, score = 0, bossA = BOSS_A, bossB = BOSS_B } = {}) {
  const run = {
    seed: String(seed), stage, score, mods: Object.fromEntries(UPGRADES.map((k) => [k, mods[k] || 0])),
    bossA, bossB, state: 'ready', history: [], log: [],
  };
  return run;
}

export function startStage(run) {
  const s = run.stage;
  run.course = makeCourse(run.seed, s, run.mods);
  run.attacks = makeAttacks(run.seed, s, run.course);
  run.t = 0; run.x = 0; run.target = 0;
  run.power = 20 + recruitBonus(run.mods);
  run.stageScore = run.score;
  run.state = 'running';
  run.lastGoodGate = -99;
  run.events = []; // fx queue for renderer (popups, close calls…)
  for (const a of run.attacks) { a.state = 'pending'; a.lane = a.lane ?? null; }
  for (const e of run.course) e.done = false;
  return run;
}

export function boss(run, s = run.stage) { return bossDefense(s, run.bossA, run.bossB); }
export function speed(run) { return speedAt(run.stage, run.t); }

function damage(run, n, label) {
  const loss = Math.round(n * (1 - Math.min(0.6, 0.12 * run.mods.armor)));
  run.power = Math.max(0, run.power - loss);
  run.events.push({ kind: 'hit', label, loss, t: run.t });
  if (run.power <= 0) end(run, false);
}
function reward(run, troops, pts, label, close) {
  const add = Math.round(troops * (1 + 0.5 * run.mods.magnet));
  run.power += add; run.score += pts;
  run.events.push({ kind: 'dodge', label, add, pts, close, t: run.t });
}
function end(run, win) {
  const b = boss(run);
  const rec = { stage: run.stage, power: run.power, boss: b, win };
  run.history.push(rec);
  if (win) {
    run.score += run.power * 5 + 1000 * run.stage + (run.power - b) * 3;
    run.cleared = run.stage;
    run.state = 'upgrade';
    run.choices = upgradeChoices(run.seed, run.stage, run.mods);
  } else {
    run.state = 'lost';
  }
  run.events.push({ kind: win ? 'win' : 'lose', t: run.t, power: run.power, boss: b });
}

export function chooseUpgrade(run, k) {
  if (run.state !== 'upgrade' || !run.choices.includes(k)) return false;
  run.mods[k]++; run.stage++; startStage(run); return true;
}

// step the simulation by dt (seconds of game time). x moves toward target (v3 movement).
export function step(run, dt) {
  if (run.state !== 'running') return;
  const s = run.stage;
  run.t += dt;
  run.target = Math.max(-0.92, Math.min(0.92, run.target));
  run.x += Math.max(-3 * dt, Math.min(3 * dt, (run.target - run.x) * Math.min(1, dt * 14)));
  const t = run.t;

  for (const a of run.attacks) {
    if (run.state !== 'running') return;
    if (a.state === 'pending' && t >= a.warnAt) {
      a.state = 'warned';
      if (a.type === 'A' || a.type === 'F') a.lane = run.x < 0 ? -1 : 1;
      if (a.type === 'E') { a.lane = run.x < 0 ? -1 : 1; a.lane2 = -a.lane; }
      if (a.type === 'C') a.lane = a.dir === 1 ? -1 : 1; // first half hits the start side
      run.log.push({ type: a.type, warnAt: a.warnAt, hit: a.hit, warn: +(a.hit - a.warnAt).toFixed(3), stage: s });
      run.events.push({ kind: 'warn', type: a.type, t });
    }
    if (a.state === 'warned' && t >= a.hit) {
      a.state = (a.type === 'E' || a.type === 'C') ? 'half' : 'done';
      const dist = Math.abs(run.x - (a.lane ?? 0) * LANE);
      if (a.type === 'A') hitsLane(run.x, a.lane) ? damage(run, Math.max(30, run.power * 0.4), 'drone') : reward(run, 8, 250, 'drone', dist - 0.76 < 0.15);
      else if (a.type === 'F') hitsLane(run.x, a.lane) ? damage(run, run.power * 0.35, 'boss') : reward(run, 0, 400, 'boss', dist - 0.76 < 0.15);
      else if (a.type === 'B') (run.x < 0 ? -1 : 1) === a.lane ? damage(run, 22 + 4 * s, 'mine') : reward(run, 0, 150, 'mine', false);
      else if (a.type === 'D') {
        const n = 60 + 25 * (s - 4), half = t - run.lastGoodGate <= 3;
        damage(run, half ? n / 2 : n, 'ambush');
        if (run.state === 'running') { run.score += 500; run.events.push({ kind: 'ambush', half, t }); }
      } else if (a.type === 'E') hitsLane(run.x, a.lane) ? damage(run, run.power * 0.25, 'split') : reward(run, 6, 0, 'split', dist - 0.76 < 0.15);
      else if (a.type === 'C') { a.c1 = hitsLane(run.x, a.lane); }
    }
    if (a.state === 'half' && t >= a.hit2) {
      a.state = 'done';
      if (a.type === 'E') hitsLane(run.x, a.lane2) ? damage(run, run.power * 0.25, 'split') : reward(run, 6, 0, 'split', false);
      else {
        const c2 = hitsLane(run.x, -a.lane);
        if (a.c1 || c2) damage(run, run.power * 0.3, 'laser'); else reward(run, 12, 300, 'laser', false);
      }
    }
  }
  for (const e of run.course) {
    if (run.state !== 'running') return;
    if (e.done || t < e.time) continue;
    e.done = true;
    if (e.type === 'gate') {
      const g = run.x < 0 ? e.left : e.right;
      const before = run.power;
      run.power = applyGate(before, g, s, run.mods);
      run.score += 100;
      if (run.power > before) run.lastGoodGate = t;
      run.events.push({ kind: 'gate', before, after: run.power, g, t });
      if (run.power <= 0) end(run, false);
    } else if (Math.abs(run.x - e.lane * 0.8) < 0.42) damage(run, barrierDamage(s), 'barrier');
    else { run.score += 150; run.events.push({ kind: 'barrierOk', t }); }
  }
  if (run.state === 'running' && run.t >= DURATION) end(run, run.power >= boss(run));
}
