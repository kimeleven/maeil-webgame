// Late-game (60–90 s) obstacle mix evidence (t_9ad9f847). node scripts/orbit-late.mjs [seed]
import * as O from '../public/js/orbit-core.js';
const kind = (o) => (o.vb ? 'bar' : o.pair !== undefined ? 'double' : o.type);
const mix = {}; let late = 0;
for (let i = 0; i < 100; i++) for (const o of O.generate('s' + i).obs) if (o.T >= 60) { late++; mix[kind(o)] = (mix[kind(o)] || 0) + 1; }
const seed = process.argv[2] || 'po-review';
const L = O.generate(seed);
const tl = L.obs.filter((o) => o.T >= 60).map((o) => `${o.warnStart.toFixed(2)}→${o.exit.toFixed(2)} ${kind(o)} lane${o.lane}`);
const safe = O.simulate(L, 'safe');
console.log(JSON.stringify({ seeds100_late60: { obstacles: late, perSeed: late / 100, mix, barShare: +(mix.bar / late).toFixed(3) }, seed, lateTimeline: tl, safeBot: { clear: safe.clear, hits: safe.log.hits.length } }, null, 1));
