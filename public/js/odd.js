// Odd Tile UI (inlined after odd-core in a single noindex HTML) [t_2964ede9]
const D = JSON.parse(document.getElementById('ot').textContent);
const $ = (id) => document.getElementById(id);
const loadLS = (k, d) => { try { return Object.assign(d, JSON.parse(localStorage.getItem(k) || 'null') || {}); } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const set = loadLS('ot-set', { sound: true, haptic: true, motion: !matchMedia('(prefers-reduced-motion: reduce)').matches });
const canVib = typeof navigator.vibrate === 'function';
const qs = new URLSearchParams(location.search);
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const rawSeed = qs.get('seed'); const seed = rawSeed && /^[A-Za-z0-9-]{1,64}$/.test(rawSeed) ? rawSeed : today();
// evidence hooks (headless checks read these): snd requested sounds, osc real oscillators, vibs vibrate calls, ev log, ft frame times
const W8 = { snd: [], osc: 0, vibs: [], ev: [], ft: [], pausedDrop: 0, uiDrop: 0, renderFail: false, renderChecks: [] };
let ac = null;
const unlock = () => { if (!ac && set.sound) { const A = window.AudioContext || window.webkitAudioContext; if (A) try { ac = new A(); } catch {} } if (ac && ac.state === 'suspended' && set.sound) ac.resume(); };
function tone(fr, d, type = 'sine', at = 0, vol = 0.12) { if (!ac || !set.sound) return; const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + at; o.type = type; o.frequency.value = fr; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g).connect(ac.destination); o.start(t); o.stop(t + d + 0.02); W8.osc++; }
const sfx = (k) => { W8.snd.push(k); if (k === 'hit') tone(1320, 0.12); else if (k === 'bad') tone(150, 0.16, 'triangle', 0, 0.16); else if (k === 'combo') { tone(880, 0.09); tone(1175, 0.12, 'sine', 0.08); } };
const buzz = (p) => { if (set.haptic && canVib) try { navigator.vibrate(p); W8.vibs.push(p); } catch {} };
// ---- active clock (performance.now minus paused intervals) ----
const pauses = []; // [startPerf, endPerf|null]
let t0perf = 0; // perf time of [start]
const pausedSum = (ts) => pauses.reduce((s, [a, b]) => s + (b !== null && b <= ts ? b - a : 0), 0);
const inPause = (ts) => pauses.some(([a, b]) => ts >= a && (b === null || ts < b));
const activeOf = (ts) => Math.floor(ts - t0perf - pausedSum(ts));
const activeNow = () => { const p = pauses.length && pauses[pauses.length - 1][1] === null ? pauses[pauses.length - 1][0] : performance.now(); return Math.floor(p - t0perf - pausedSum(p)); };
// ---- glyph render ----
const FG = '#e8eaf0', HOLE = '#0d1020';
function drawGlyph(ctx, g, px) {
  ctx.clearRect(0, 0, px, px); ctx.save(); ctx.translate(px / 2, px / 2); ctx.scale(px, px);
  ctx.fillStyle = FG; ctx.beginPath();
  if (g.shape === 'circle') ctx.arc(0, 0, circleR(g), 0, Math.PI * 2); else { const P = glyphPoly(g); ctx.moveTo(P[0][0], P[0][1]); for (const p of P.slice(1)) ctx.lineTo(p[0], p[1]); ctx.closePath(); }
  ctx.fill(); ctx.fillStyle = HOLE;
  for (const [x, y] of DOT_LAYOUT[g.dots]) { ctx.beginPath(); ctx.arc(x, y, DOT_R, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
const bitmap = (g, px) => { const c = document.createElement('canvas'); c.width = c.height = px; drawGlyph(c.getContext('2d'), g, px); return c; };
function diffRatio(a, b, px) { const A = bitmap(a, px).getContext('2d').getImageData(0, 0, px, px).data, B = bitmap(b, px).getContext('2d').getImageData(0, 0, px, px).data; let d = 0;
  for (let i = 0; i < A.length; i += 4) if (Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]) + Math.abs(A[i + 3] - B[i + 3]) > 96) d++; return d / (px * px); }
let cellPx = 88;
// render check right before a grid is shown: base vs odd at real cell size × DPR, ≥ 3% differing pixels
function renderCheck(g) {
  if (g.glyph === 'tutorial') return g;
  const px = Math.max(8, Math.round(cellPx * (devicePixelRatio || 1)));
  const r = W8.renderFail ? 0 : diffRatio(g.base, g.odd, px);
  W8.renderChecks.push({ k: g.k, r: Math.round(r * 1e4) / 1e4, px });
  if (r >= OT.MINDIFF) return g;
  let f = glyphFallback(g); if (W8.renderFail || diffRatio(f.base, f.odd, px) < OT.MINDIFF) { if (W8.renderFail === 'both') f = glyphFallback(g, true); }
  W8.ev.push({ k: 'glyph', v: f.glyph }); return f;
}
// ---- DOM ----
const gridEl = $('grid'), stage = $('stage');
let game = null, state = 'ready', shownK = 0, focus = 0, held = new Set(), raf = 0, fbK = 0, best = loadLS('ot-best', { score: -1, found: 0 });
const ui = { ready: $('ready'), pz: $('pz'), res: $('res') };
const show = (k) => { for (const x of Object.keys(ui)) ui[x].hidden = x !== k; };
const defFocus = (n) => (n === 2 ? 0 : n === 3 ? 4 : 5);
function layoutGrid(g) {
  gridEl.style.setProperty('--n', g.n); gridEl.innerHTML = '';
  const r = gridEl.getBoundingClientRect(), gap = 6; cellPx = Math.floor((r.width - gap * (g.n - 1)) / g.n);
  const px = Math.round(cellPx * (devicePixelRatio || 1)), baseBm = bitmap(g.base, px);
  for (let i = 0; i < g.n * g.n; i++) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'cell'; b.dataset.i = i; b.tabIndex = -1; b.setAttribute('aria-label', String(i + 1));
    const c = document.createElement('canvas'); c.width = c.height = px; const cx = c.getContext('2d');
    if (i === g.ans) drawGlyph(cx, g.odd, px); else cx.drawImage(baseBm, 0, 0); // base cells: copies of one bitmap
    b.appendChild(c); gridEl.appendChild(b);
  }
  if (g.k === 1) gridEl.children[g.ans].classList.add('breathe');
  focus = defFocus(g.n); paintFocus();
}
function measureCell(n) { const r = gridEl.getBoundingClientRect(); cellPx = Math.floor((r.width - 6 * (n - 1)) / n); }
const paintFocus = () => { [...gridEl.children].forEach((c, i) => c.classList.toggle('focus', i === focus && state === 'play')); };
const cells = () => [...gridEl.children];
function hud(now) {
  const S = game ? game.S : null, left = S ? Math.max(0, OT.T - Math.min(now, OT.T)) : OT.T;
  $('h-time').textContent = (Math.ceil(left / 100) / 10).toFixed(1); $('h-bar').style.width = `${(100 * left) / OT.T}%`; $('h-bar').classList.toggle('low', left < 10000);
  $('h-found').textContent = S ? S.found : 0; $('h-score').textContent = S ? S.score : 0; $('h-combo').textContent = S && S.combo ? `×${comboMul(S.combo)} · ${S.combo}` : '—';
  if (S && !S.over && now >= S.start) { const dl = S.grid.dl, rest = Math.max(0, S.start + dl - now); $('dbar').style.width = `${(100 * rest) / dl}%`; } else $('dbar').style.width = '0%';
}
// ---- game flow ----
function start() {
  unlock(); pauses.length = 0; t0perf = performance.now(); held.clear(); W8.pausedDrop = 0; W8.uiDrop = 0; W8.renderChecks = []; W8.ev.push({ k: 'start', at: 0 });
  measureCell(2); game = createGame(seed, { transform: (g) => { measureCell(g.n); return renderCheck(g); } }); shownK = 0; fbK = 0; state = 'play'; show(null); stage.classList.add('playing');
  window.__ot.game = game; loop();
}
function loop() {
  cancelAnimationFrame(raf);
  const tick = () => {
    if (state !== 'play') return;
    const now = activeNow(); W8.ft.push(performance.now());
    for (const e of game.frame(now)) commit(e, now);
    if (state !== 'play') return;
    const S = game.S;
    if (!S.over && now >= S.start && shownK !== S.k) { layoutGrid(S.grid); shownK = S.k; W8.ev.push({ k: 'show', grid: S.k, at: now, n: S.grid.n }); }
    hud(now); raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
}
function commit(e, now) {
  W8.ev.push({ k: 'commit', kind: e.kind, grid: e.k, at: now });
  if (e.kind === 'result') return finishGame(now);
  if (e.kind === 'void') { cells().forEach((c) => c.classList.remove('down')); return; }
  if (e.kind === 'end') return;
  const cs = cells(); cs.forEach((c) => c.classList.remove('down', 'breathe'));
  if (e.kind === 'hit') { cs[e.ans] && cs[e.ans].classList.add('ok'); sfx(e.combo >= 5 && e.combo % 5 === 0 ? 'combo' : 'hit'); buzz(10); }
  else { if (e.kind === 'wrong' && cs[e.cell]) cs[e.cell].classList.add('bad'); cs[e.ans] && cs[e.ans].classList.add('show'); sfx('bad'); buzz(25); }
  chip(e);
}
function chip(e) { const c = $('chip'); c.hidden = false; c.className = `chip ${e.kind}`; c.textContent = e.kind === 'hit' ? `✓ +${e.pts}` : e.kind === 'wrong' ? '✕' : '…'; }
function select(i, ev, src) {
  // §2.0.4: an event stamped inside a pause interval is paused_drop; one stamped before tp but delivered during the
  // pause is admitted with arrival = tp (activeNow() is frozen at tp while paused).
  if (inPause(ev.timeStamp)) { W8.pausedDrop++; return; }
  if (state !== 'play' && state !== 'paused') { W8.uiDrop++; return; }
  const t = activeOf(ev.timeStamp), arr = activeNow();
  if (game.S.over || arr < game.S.start) { W8.uiDrop++; return; }
  const r = game.input(t, i, arr, src); W8.ev.push({ k: 'in', i, t, arr, src, r });
  if (r === 'queued' && state === 'play' && cells()[i]) cells()[i].classList.add('down');
}
gridEl.addEventListener('pointerdown', (e) => { const c = e.target.closest('.cell'); if (!c) return; e.preventDefault(); held.add(`p${e.pointerId}`); select(+c.dataset.i, e, e.pointerType || 'ptr'); });
addEventListener('pointerup', (e) => held.delete(`p${e.pointerId}`)); addEventListener('pointercancel', (e) => held.delete(`p${e.pointerId}`)); // never changes a judgement
gridEl.addEventListener('contextmenu', (e) => e.preventDefault());
function pause(why) {
  if (state !== 'play') return; const tp = performance.now(); pauses.push([tp, null]); state = 'paused'; cancelAnimationFrame(raf);
  held.clear(); cells().forEach((c) => c.classList.remove('down')); // DOM/physical state only; logical candidates kept in the engine
  W8.ev.push({ k: 'pause', why, at: activeNow() }); show('pz');
}
function resume() { if (state !== 'paused') return; pauses[pauses.length - 1][1] = performance.now(); state = 'play'; show(null); W8.ev.push({ k: 'resume', at: activeNow() }); paintFocus(); loop(); }
function toReady() { cancelAnimationFrame(raf); state = 'ready'; game = null; window.__ot.game = null; gridEl.innerHTML = ''; $('chip').hidden = true; stage.classList.remove('playing'); show('ready'); hud(0); }
function finishGame(now) {
  state = 'result'; cancelAnimationFrame(raf); const S = game.S; S.resultShown = true; W8.ev.push({ k: 'result', at: now });
  const prev = best.score >= 0 ? { ...best } : null, isNew = !prev || S.score > prev.score || (S.score === prev.score && S.found > prev.found);
  if (isNew) { best = { score: S.score, found: S.found }; save('ot-best', best); }
  $('r-score').textContent = S.score; $('r-found').textContent = S.found; $('r-acc').textContent = `${S.judged ? Math.round((100 * S.found) / S.judged) : 0}%`; $('r-combo').textContent = S.maxCombo;
  $('r-best').textContent = prev ? `${prev.score} (${prev.found})` : '—'; const d = prev ? S.score - prev.score : 0; $('r-diff').textContent = prev ? (d > 0 ? `+${d}` : String(d)) : '—';
  $('r-new').hidden = !(isNew && prev); $('r-first').hidden = !!prev; $('r-cut').hidden = !S.log.some((e) => e.kind === 'end');
  $('r-line').textContent = S.log.filter((e) => ['hit', 'wrong', 'miss'].includes(e.kind)).map((e) => (e.kind === 'hit' ? '●' : e.kind === 'wrong' ? '○' : '·')).join('');
  const fbs = [...game.deck.logs, ...S.log.filter((e) => /^fallback/.test(e.glyph || '')).map((e) => `glyph=${e.glyph}`)]; $('r-fb').textContent = fbs.length ? `${D.fbNote} (${fbs.join(', ')})` : '';
  $('seed').textContent = seed; show('res'); $('b-again').focus({ preventScroll: true });
}
// ---- keyboard: arrows move focus, Space selects, Enter per state, Esc/P pause ----
addEventListener('keydown', (e) => {
  if (e.repeat) { if ([' ', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault(); return; }
  const k = e.key;
  if (k === 'Enter') { e.preventDefault(); if (state === 'ready') start(); else if (state === 'paused') resume(); else if (state === 'result') toReady(); return; }
  if (k === 'Escape' || k === 'p' || k === 'P') { e.preventDefault(); if (state === 'play') pause('key'); else if (state === 'paused' && k === 'Escape') resume(); return; }
  if (state !== 'play' && state !== 'paused') return;
  if (k === ' ' || k === 'Spacebar') { e.preventDefault(); held.add('Space'); select(focus, e, 'key'); return; }
  const mv = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[k];
  if (mv && state === 'play' && game && shownK) { e.preventDefault(); const n = game.S.grid.n; let x = focus % n, y = Math.floor(focus / n); x = Math.max(0, Math.min(n - 1, x + mv[0])); y = Math.max(0, Math.min(n - 1, y + mv[1])); focus = y * n + x; paintFocus(); }
});
addEventListener('keyup', (e) => { if (e.key === ' ') held.delete('Space'); });
document.addEventListener('visibilitychange', () => { if (document.hidden) pause('hidden'); });
addEventListener('blur', () => pause('blur'));
// ---- buttons (outside the grid, stopPropagation) ----
const on = (id, f) => $(id).addEventListener('click', (e) => { e.stopPropagation(); f(e); });
on('b-start', () => start()); on('b-resume', () => resume()); on('b-pause', () => (state === 'play' ? pause('button') : resume()));
on('b-restart', () => toReady()); on('b-again', () => toReady());
document.querySelectorAll('[data-ui]').forEach((x) => x.addEventListener('pointerdown', (e) => e.stopPropagation()));
const shareUrl = () => `${location.origin}${location.pathname}?seed=${encodeURIComponent(seed)}`;
const toast = (t) => { const el = $('toast'); el.textContent = t; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 1800); };
on('b-link', async () => { const t = D.shareText.replace('{n}', game ? game.S.found : 0).replace('{url}', shareUrl()); try { await navigator.clipboard.writeText(t); toast(D.copied); } catch { toast(t); } W8.ev.push({ k: 'copy', t }); });
on('b-png', () => {
  const S = game.S, c = document.createElement('canvas'); c.width = 1080; c.height = 1350; const x = c.getContext('2d');
  const gr = x.createLinearGradient(0, 0, 1080, 1350); gr.addColorStop(0, '#0b0d1a'); gr.addColorStop(1, '#141a33'); x.fillStyle = gr; x.fillRect(0, 0, 1080, 1350);
  x.fillStyle = 'rgba(255,255,255,.06)'; x.fillRect(80, 160, 920, 900); x.fillStyle = '#e8eaf0'; x.textAlign = 'center';
  x.font = '800 64px system-ui,sans-serif'; x.fillText(D.name, 540, 270); x.font = '900 220px system-ui,sans-serif'; x.fillStyle = '#22d3ee'; x.fillText(String(S.found), 540, 560);
  x.fillStyle = '#e8eaf0'; x.font = '700 54px system-ui,sans-serif'; x.fillText(`${D.score} ${S.score} · ${D.maxCombo} ${S.maxCombo}`, 540, 680);
  const line = $('r-line').textContent; x.font = '40px system-ui,sans-serif'; for (let i = 0; i < line.length; i += 20) x.fillText(line.slice(i, i + 20).split('').join(' '), 540, 790 + (i / 20) * 56);
  x.fillStyle = 'rgba(214,219,232,.72)'; x.font = '600 40px system-ui,sans-serif'; x.fillText(seed === today() ? seed : `${today()} · #${seed}`, 540, 1180); x.fillText('playtoday.cloud', 540, 1250);
  c.toBlob((bl) => { const a = document.createElement('a'); a.href = URL.createObjectURL(bl); a.download = `odd-tile-${seed}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); W8.ev.push({ k: 'png', w: c.width, h: c.height }); }, 'image/png');
});
function paintSet() { document.querySelectorAll('[data-set]').forEach((b) => { const k = b.dataset.set, v = set[k]; b.setAttribute('aria-pressed', String(v)); b.classList.toggle('off', !v); if (b.dataset.icon) b.textContent = k === 'sound' ? (v ? '🔊' : '🔇') : v ? '📳' : '📴'; if (k === 'haptic' && !canVib) b.hidden = true; }); document.body.classList.toggle('rm', !set.motion); }
document.querySelectorAll('[data-set]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); const k = b.dataset.set; set[k] = !set[k]; save('ot-set', set); if (k === 'sound') unlock(); paintSet(); }));
paintSet(); hud(0); $('seed').textContent = seed;
window.__ot = { ready: true, E: { OT, createGame, makeDeck, glyphPair, VALID, ROWS, SHAPES, isValid, glyphFallback }, W: W8, get state() { return state; }, get game() { return game; }, set game(v) {}, seed, activeNow, activeOf, diffRatio, renderCheck, bitmap, get focus() { return focus; }, get shownK() { return shownK; }, held };
