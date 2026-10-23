// t_da9e7634: same-seed policy comparison for board 2+ tap budget / composition.
import * as E from '../public/js/light-core.js';
const BASE = JSON.parse(JSON.stringify(E.TIERS));
const CANDS = {
  A_before: (T) => T.map((t, i) => ({ ...t, extra: 3, ...(i === 1 ? { k: [2, 3] } : {}) })),
  B_extra1: (T) => T.map((t, i) => ({ ...t, extra: i === 0 ? 3 : 1, ...(i === 1 ? { k: [2, 3] } : {}) })),
  C_extra1_k3_CHOSEN: (T) => T.map((t, i) => ({ ...t, extra: i === 0 ? 3 : 1, ...(i === 1 ? { k: [3, 3] } : {}) })),
  D_extra2_k3: (T) => T.map((t, i) => ({ ...t, extra: i === 0 ? 3 : 2, ...(i === 1 ? { k: [3, 3] } : {}) })),
};
const pop = (x) => { let c = 0; while (x) { c += x & 1; x >>>= 1; } return c; };
function trial(seeds, boards) {
  const perK = {}, perTier = {}; let rnd = 0, ham = 0, tot = 0, minOk = 0;
  for (let s = 0; s < seeds; s++) for (let n = 2; n <= boards; n++) {
    const b = E.genBoard('tune' + s, n); const R = E.rng(E.hash(`r|${s}|${n}`));
    let m = b.start, ok = false; for (let u = 0; u < b.limit && !ok; u++) { m ^= 1 << Math.floor(R() * b.k); ok = E.solved(b, m); }
    // hammer one spot: tap the same mirror (each rotatable, best case) up to limit
    let h = false; for (let r = 0; r < b.k && !h; r++) { let mm = b.start; for (let u = 0; u < b.limit && !h; u++) { mm ^= 1 << r; h = E.solved(b, mm); } }
    const key = 'k' + b.k; (perK[key] ??= [0, 0]); perK[key][0] += ok; perK[key][1]++;
    const tk = 't' + E.tierOf(n); (perTier[tk] ??= [0, 0]); perTier[tk][0] += ok; perTier[tk][1]++;
    rnd += ok; ham += h; tot++; minOk += b.par <= b.limit;
  }
  const pct = (a) => Math.round(1000 * a[0] / a[1]) / 10;
  return { random: Math.round(1000 * rnd / tot) / 10, hammer: Math.round(1000 * ham / tot) / 10, minTap: Math.round(1000 * minOk / tot) / 10,
    byK: Object.fromEntries(Object.entries(perK).sort().map(([k, v]) => [k, pct(v)])), byTier: Object.fromEntries(Object.entries(perTier).map(([k, v]) => [k, pct(v)])) };
}
function games(n) { const r = {}; for (const p of ['random', 'safe', 'sameMirror']) { let b = 0, sc = 0; for (let s = 0; s < n; s++) { const g = E.simulate('tg' + s, p); b += g.boards; sc += g.score; } r[p] = { boards: b / n, score: Math.round(sc / n) }; } return r; }
const out = {};
for (const [name, f] of Object.entries(CANDS)) {
  const T = f(JSON.parse(JSON.stringify(BASE))); E.TIERS.splice(0, E.TIERS.length, ...T);
  const b1 = E.genBoard('x', 1);
  out[name] = { board1: { par: b1.par, limit: b1.limit }, ...trial(300, 12), game90s: games(20) };
  console.log(name, JSON.stringify(out[name]));
}
if (process.argv[2]) (await import('node:fs')).writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
