// Fair Slice keyboard recovery after aborted pointer input (t_411a0ed8). node scripts/fair-kb-recover.mjs [baseUrl]
// Each case: start → R1 aim → disrupt (tap / short drag / pointercancel / lostpointercapture / second pointer / pause-resume mid-drag)
// → ArrowRight must show a new preview in the SAME round → Enter must cut exactly once (via key). 412 + 1440, headless Chromium.
// tap / short drag / pause-resume use real mouse+keyboard; cancel / lostcapture / second-pointer use synthetic PointerEvent.
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
const ROOT = new URL('..', import.meta.url).pathname;
const EV = `${ROOT}reboot-evidence/fair/`; mkdirSync(EV, { recursive: true });
let U = process.argv[2]; const tag = U ? 'preview' : 'local';
if (!U) { const { startServer } = await import('./dev.mjs'); await startServer(5198); U = 'http://localhost:5198'; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch(); const out = { base: U, at: new Date().toISOString(), cases: [] }; const fails = [];
const st = (p) => p.evaluate(() => ({ phase: __fs.g.phase, r: __fs.g.r, rounds: __fs.g.rounds.length, drag: !!__fs.drag, paused: __fs.paused,
  kb: __fs.kb && { th: __fs.kb.th, shown: __fs.kb.shown }, cuts: __fs.evlog.filter((e) => e.k === 'cut').map((e) => [e.via, e.ok, e.why]) }));
const synth = (p, list) => p.evaluate((list) => { const pa = document.getElementById('play'), r = document.getElementById('cv').getBoundingClientRect();
  for (const [type, id, fx, fy] of list) pa.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: id, isPrimary: id === 1, clientX: r.left + r.width * fx, clientY: r.top + r.height * fy, pointerType: 'touch' })); }, list);
const CASES = {
  tap: async (p, c) => { await p.mouse.click(c[0], c[1]); },
  shortDrag: async (p, c) => { await p.mouse.move(c[0], c[1]); await p.mouse.down(); await p.mouse.move(c[0] + 4, c[1] + 3, { steps: 2 }); await p.mouse.up(); },
  pointercancel: async (p) => { await synth(p, [['pointerdown', 7, 0.1, 0.5], ['pointermove', 7, 0.3, 0.5], ['pointercancel', 7, 0.3, 0.5]]); },
  lostcapture: async (p) => { await synth(p, [['pointerdown', 8, 0.1, 0.5], ['pointermove', 8, 0.3, 0.5], ['lostpointercapture', 8, 0.3, 0.5]]); },
  secondPointer: async (p) => { await synth(p, [['pointerdown', 9, 0.1, 0.5], ['pointermove', 9, 0.3, 0.5], ['pointerdown', 10, 0.6, 0.6], ['pointerup', 9, 0.9, 0.5], ['pointerup', 10, 0.6, 0.6]]); },
  pauseMidDrag: async (p, c) => { await p.mouse.move(c[0] - 200, c[1]); await p.mouse.down(); await p.mouse.move(c[0], c[1], { steps: 3 }); await p.keyboard.press('p'); await sleep(80); await p.keyboard.press('Enter'); await sleep(40); await p.mouse.move(c[0] + 200, c[1], { steps: 3 }); await p.mouse.up(); },
};
for (const w of [412, 1440]) for (const [name, fn] of Object.entries(CASES)) {
  const ctx = await b.newContext({ viewport: { width: w, height: w === 1440 ? 1000 : 915 } }); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(U + '/ko/play/fair-slice/?seed=kbr'); await p.waitForFunction(() => window.__fs && __fs.ready);
  await p.keyboard.press('Enter'); await p.waitForFunction(() => __fs.g.phase === 'aim' && __fs.g.r === 1 && __fs.kb, null, { timeout: 15000 });
  const box = await p.locator('#cv').boundingBox(); const c = [box.x + box.width / 2, box.y + box.height / 2];
  await fn(p, c); await sleep(60); const s1 = await st(p);
  await p.keyboard.press('ArrowRight'); await sleep(40); const s2 = await st(p);
  await p.screenshot({ path: `${EV}kbr-${name}-${w}.png` });
  await p.keyboard.press('Enter'); await sleep(60); const s3 = await st(p);
  await p.keyboard.press('Enter'); await sleep(60); const s4 = await st(p);   // second Enter during split must not cut again
  const keyCuts = s4.cuts.filter((x) => x[0] === 'key' && x[1]).length;
  const pass = s1.rounds === 0 && s1.r === 1 && !s1.drag && !s1.paused && s2.r === 1 && s2.kb && s2.kb.shown && s2.kb.th === 1 && s3.rounds === 1 && s4.rounds === 1 && keyCuts === 1 && errs.length === 0;
  const row = { w, name, pass, after: s1, arrow: s2.kb, roundsAfterEnter: s3.rounds, roundsAfter2ndEnter: s4.rounds, keyCuts, cuts: s4.cuts, errs };
  out.cases.push(row); (pass ? console.log : console.error)(`${pass ? '✔' : '✘'} ${w} ${name} — kb ${JSON.stringify(s2.kb)} rounds ${s3.rounds}/${s4.rounds} cuts ${JSON.stringify(s4.cuts)}`);
  if (!pass) fails.push(`${w} ${name}`); await ctx.close();
}
await b.close(); writeFileSync(`${EV}kb-recover-${tag}.json`, JSON.stringify(out, null, 1));
console.log(`${out.cases.length - fails.length}/${out.cases.length} pass (${tag})`); process.exit(fails.length ? 1 : 0);
