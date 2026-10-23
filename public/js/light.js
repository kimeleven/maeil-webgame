// Light Workshop UI (prototype, t_b8fb1a93). Inlined after light-core.js by scripts/build-light.mjs. No /api, no analytics.
const D = JSON.parse(document.getElementById('lt').textContent);
const $ = (id) => document.getElementById(id);
const loadLS = (k, d) => { try { return Object.assign(d, JSON.parse(localStorage.getItem(k) || 'null') || {}); } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const q = new URLSearchParams(location.search);
const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
const seed = (q.get('seed') || today).replace(/[^A-Za-z0-9-]/g, '').slice(0, 64) || today;
const mq = matchMedia('(prefers-reduced-motion: reduce)');
const set = loadLS('lw-set', { sound: true, haptic: true, motion: !mq.matches });
const canVib = typeof navigator.vibrate === 'function';
const W = { snd: [], vib: 0, frames: 0, ft: [] };
// ---- audio (WebAudio synth, no files; silent until first input) ----
let ac = null;
const unlock = () => { if (!ac && set.sound) { const A = window.AudioContext || window.webkitAudioContext; if (A) try { ac = new A(); } catch {} } if (ac && ac.state === 'suspended' && set.sound) ac.resume(); };
function tone(f, dur, type = 'sine', vol = 0.12, at = 0) {
  if (!set.sound || !ac) return; const t = ac.currentTime + at, o = ac.createOscillator(), gn = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); gn.gain.setValueAtTime(vol, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(gn).connect(ac.destination); o.start(t); o.stop(t + dur + 0.02);
}
const SND = {
  tick: () => tone(1800, 0.04, 'square', 0.05),
  tuk: () => tone(180, 0.05, 'sine', 0.06),
  lamp: (j) => tone([660, 784, 988][j % 3], 0.18, 'triangle', 0.09),
  solve: () => [523, 659, 784, 1047].forEach((f, j) => tone(f, 0.35, 'triangle', 0.08, j * 0.04)),
  reset: () => { if (!set.sound || !ac) return; const t = ac.currentTime, o = ac.createOscillator(), gn = ac.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(600, t); o.frequency.exponentialRampToValueAtTime(80, t + 0.3); gn.gain.setValueAtTime(0.07, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.32); o.connect(gn).connect(ac.destination); o.start(t); o.stop(t + 0.35); },
};
const play = (k, a) => { W.snd.push(k); if (set.sound) SND[k](a); };
const buzz = (ms) => { if (set.haptic && canVib) try { navigator.vibrate(ms); W.vib++; } catch {} };
// ---- state ----
let g = createGame(seed), paused = false, count = 0, best = loadLS('lw-best', { rec: null }).rec, cur = -1, prevLit = new Set(), lastSolved = null, flash = 0, shake = 0, pending = null, trans = null;
const cv = $('cv'), cx = cv.getContext('2d');
const S = window.__lw = { ready: false, E: { LW, createGame, start, tap, skip, step, replay, simulate, genBoard, solve, trace, POLICIES }, W, seed, set, evlog: [], get g() { return g; }, get paused() { return paused || count > 0; } };
const motion = () => set.motion && !mq.matches;
function applySet() {
  document.querySelectorAll('[data-set]').forEach((b) => { const k = b.dataset.set, on = !!set[k]; b.setAttribute('aria-pressed', on); b.classList.toggle('off', !on); if (b.dataset.icon) b.textContent = k === 'sound' ? (on ? '🔊' : '🔇') : on ? '📳' : '📴'; });
  document.querySelectorAll('[data-set="haptic"]').forEach((b) => (b.hidden = !canVib));
  document.body.classList.toggle('rm', !motion());
}
document.querySelectorAll('[data-set]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); const k = b.dataset.set; set[k] = !set[k]; save('lw-set', set); if (k === 'sound' && set.sound) unlock(); applySet(); }));
applySet();
// ---- geometry ----
function fit() { const r = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight; if (cv.width !== Math.round(w * r) || cv.height !== Math.round(h * r)) { cv.width = Math.round(w * r); cv.height = Math.round(h * r); } cx.setTransform(r, 0, 0, r, 0, 0); return [w, h]; }
function geo() { const w = cv.clientWidth, h = cv.clientHeight, N = g.board ? g.board.N : 4; const size = Math.min(w * 0.92, h * 0.92, 600); return { N, size, cs: size / N, ox: (w - size) / 2, oy: (h - size) / 2 }; }
function cellAt(px, py) { const r = cv.getBoundingClientRect(), G = geo(); const x = Math.floor((px - r.left - G.ox) / G.cs), y = Math.floor((py - r.top - G.oy) / G.cs); return x >= 0 && y >= 0 && x < G.N && y < G.N ? y * G.N + x : -1; }
S.cellCenter = (i) => { const r = cv.getBoundingClientRect(), G = geo(); return { x: r.left + G.ox + ((i % G.N) + 0.5) * G.cs, y: r.top + G.oy + (Math.floor(i / G.N) + 0.5) * G.cs, cs: G.cs }; };
// ---- actions ----
function doStart() { if (g.phase !== 'ready') return; unlock(); start(g); $('ready').hidden = true; onBoard(); S.evlog.push({ k: 'start', at: performance.now() }); hud(); }
function onBoard() { cur = g.board.rot[0]; prevLit = trace(g.board, g.mask).lit; }
function doTap(c) {
  if (paused || count) return; unlock();
  const was = g.n, res = tap(g, c); S.evlog.push({ k: 'tap', c, r: res.r, tick: g.tick });
  if (res.r === 'inert') { play('tuk'); shake = performance.now(); return; }
  if (res.r === 'locked' || res.r === 'ignored') return;
  if (res.r === 'turn' || res.r === 'solve') { play('tick'); buzz(8); let j = 0; for (const l of res.lit) if (!prevLit.has(l)) play('lamp', j++); prevLit = res.lit; }
  if (res.r === 'solve') { play('solve'); buzz(25); flash = performance.now(); lastSolved = { b: g.board, mask: g.mask }; trans = { b: g.board, mask: g.mask, at: performance.now() }; toast(`+${res.pts}${res.bonus ? ` (${D.bonus} +${res.bonus})` : ''}`); }
  if (res.r === 'reset') { play('reset'); buzz(50); toast(D.resetMsg); prevLit = trace(g.board, g.mask).lit; }
  if (g.phase === 'result') showResult(); hud(); void was;
}
function doSkip() { if (paused || count || g.phase !== 'play') return; unlock(); skip(g); play('reset'); if (g.phase === 'result') showResult(); else onBoard(); hud(); }
// pointer: rotate only when pointerup happens on the same cell as pointerdown; pointercancel drops it
cv.addEventListener('pointerdown', (e) => { if (!e.isPrimary) return; pending = { id: e.pointerId, c: cellAt(e.clientX, e.clientY) }; });
cv.addEventListener('pointerup', (e) => { if (!pending || pending.id !== e.pointerId) return; const c = cellAt(e.clientX, e.clientY), p = pending; pending = null; if (g.phase === 'ready' || c < 0 || c !== p.c) return; cur = c; doTap(c); });
cv.addEventListener('pointercancel', () => { pending = null; S.evlog.push({ k: 'cancel' }); });
cv.addEventListener('lostpointercapture', () => { pending = null; });
addEventListener('keydown', (e) => {
  if (e.target.closest && e.target.closest('button,summary,a') && (e.key === ' ' || e.key === 'Enter') && g.phase !== 'ready') return;
  if (e.repeat) { if (e.key === ' ' || e.key.startsWith('Arrow') || e.key === 'Enter') e.preventDefault(); S.evlog.push({ k: 'repeat' }); return; }
  if (g.phase === 'ready') { if (e.key === 'Enter') { e.preventDefault(); doStart(); } return; }
  if (g.phase === 'result') { if (e.key === 'Enter') { e.preventDefault(); again(); } return; }
  if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') { pause(); return; }
  const N = g.board.N; const mv = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }[e.key];
  if (mv) { e.preventDefault(); if (cur < 0) cur = 0; const x = Math.min(N - 1, Math.max(0, (cur % N) + mv[0])), y = Math.min(N - 1, Math.max(0, Math.floor(cur / N) + mv[1])); cur = y * N + x; return; }
  if (e.key === ' ') { e.preventDefault(); if (cur >= 0) doTap(cur); }
});
$('b-start').addEventListener('click', (e) => { e.stopPropagation(); doStart(); });
$('b-skip').addEventListener('click', (e) => { e.stopPropagation(); doSkip(); });
// pause (button, P, hidden tab) → resume tap → 3 s count
function pause() { if (g.phase !== 'play' && g.phase !== 'trans') return; paused = true; count = 0; $('pz').hidden = false; $('pz-n').textContent = ''; S.evlog.push({ k: 'pause', tick: g.tick }); }
$('b-pause').addEventListener('click', (e) => { e.stopPropagation(); pause(); });
$('pz').addEventListener('click', (e) => { if (e.target.closest('[data-set]') || !paused) return; paused = false; count = 3 * 60; });
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
// ---- result ----
function showResult() {
  const rec = record(g), was = best, nb = better(rec, was); if (nb) { best = rec; save('lw-best', { rec }); }
  $('r-boards').textContent = D.boardsN.replace('{n}', rec.boards); $('r-score').textContent = rec.score; $('r-par').textContent = '★'.repeat(Math.min(rec.parSolves, 10)) + ` ${rec.parSolves}`;
  $('r-best').textContent = was ? `${D.boardsN.replace('{n}', was.boards)} · ${was.score}` : '—';
  $('r-diff').textContent = was ? `${rec.boards - was.boards >= 0 ? '+' : ''}${rec.boards - was.boards} · ${rec.score - was.score >= 0 ? '+' : ''}${rec.score - was.score}` : '—';
  $('r-new').hidden = !(nb && was); $('r-first').hidden = !!was; $('seed').textContent = seed;
  $('r-stat').textContent = D.stat.replace('{r}', g.resets).replace('{s}', g.skips);
  $('res').hidden = false; S.evlog.push({ k: 'result', at: performance.now(), rec }); $('b-again').focus({ preventScroll: true });
}
function again() { g = createGame(seed); paused = false; count = 0; lastSolved = null; trans = null; cur = -1; $('res').hidden = true; $('pz').hidden = true; $('ready').hidden = false; hud(); S.evlog.push({ k: 'again', at: performance.now() }); }
$('b-again').addEventListener('click', (e) => { e.stopPropagation(); again(); });
const shareUrl = () => `${location.origin}${location.pathname}?seed=${encodeURIComponent(seed)}`;
$('b-link').addEventListener('click', async (e) => { e.stopPropagation(); const t = D.shareText.replace('{boards}', g.boards).replace('{url}', shareUrl()); try { await navigator.clipboard.writeText(t); toast(D.copied); } catch { toast(t); } S.evlog.push({ k: 'copy', t }); });
$('b-png').addEventListener('click', (e) => { e.stopPropagation(); const c = document.createElement('canvas'); c.width = 1080; c.height = 1350; const x = c.getContext('2d');
  const gr = x.createLinearGradient(0, 0, 0, 1350); gr.addColorStop(0, '#11132a'); gr.addColorStop(1, '#07080c'); x.fillStyle = gr; x.fillRect(0, 0, 1080, 1350);
  if (lastSolved) drawBoard(x, lastSolved.b, lastSolved.mask, 190, 140, 700, { silhouette: true });
  x.fillStyle = '#e8eaf0'; x.textAlign = 'center'; x.font = '800 120px system-ui,sans-serif'; x.fillText(D.boardsN.replace('{n}', g.boards), 540, 1000);
  x.font = '600 44px system-ui,sans-serif'; x.fillStyle = 'rgba(214,219,232,.8)'; x.fillText(`${D.score} ${g.score} · ★ ${g.parSolves}`, 540, 1080); x.fillText(D.name, 540, 1160); x.font = '500 34px system-ui,sans-serif'; x.fillText('playtoday.cloud', 540, 1290);
  c.toBlob((bl) => { const a = document.createElement('a'); a.href = URL.createObjectURL(bl); a.download = `light-workshop-${seed}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); S.evlog.push({ k: 'png' }); }, 'image/png'); });
let tt = 0; function toast(s) { const t = $('toast'); t.textContent = s; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 1300); }
// ---- HUD ----
function hud() {
  $('h-time').textContent = Math.ceil(g.left / 60); $('h-boards').textContent = g.boards; $('h-score').textContent = g.score;
  const b = g.board, left = b ? b.limit - g.used : 0; $('h-taps').textContent = b ? `💡${left}` : '—';
  $('h-taps').parentElement.classList.toggle('warn', !!b && left === 1 && g.phase === 'play');
  $('h-mult').textContent = `×${g.mult}`;
}
// ---- render ----
function drawBoard(x, b, mask, ox, oy, size, o = {}) {
  const N = b.N, cs = size / N, now = performance.now(), mo = motion() && !o.silhouette;
  x.save(); x.translate(ox, oy);
  x.fillStyle = 'rgba(255,255,255,.035)'; x.strokeStyle = 'rgba(255,255,255,.08)'; x.lineWidth = 1;
  for (let i = 0; i < N * N; i++) { const cx0 = (i % N) * cs, cy0 = Math.floor(i / N) * cs; x.fillRect(cx0 + 2, cy0 + 2, cs - 4, cs - 4); }
  const tr = trace(b, mask);
  // beam
  const sx = (b.src.x + 0.5) * cs, sy = (b.src.y + 0.5) * cs; const pts = [[sx, sy]];
  for (const i of tr.path) pts.push([((i % N) + 0.5) * cs, (Math.floor(i / N) + 0.5) * cs]);
  const lastI = tr.path[tr.path.length - 1]; let ex = 0, ey = 0;
  { let xx = b.src.x, yy = b.src.y, d = b.src.d; for (const i of tr.path) { xx = i % N; yy = Math.floor(i / N); if (b.type[i] === MIRROR) { const r = b.rot.indexOf(i); d = [[3, 2, 1, 0], [1, 0, 3, 2]][r >= 0 ? (mask >> r) & 1 : b.fixedState[i]][d]; } } void lastI; const nx = xx + [1, 0, -1, 0][d], ny = yy + [0, 1, 0, -1][d]; ex = (xx + 0.5 + [1, 0, -1, 0][d] * (nx < 0 || ny < 0 || nx >= N || ny >= N ? 0.5 : 0.45)) * cs; ey = (yy + 0.5 + [0, 1, 0, -1][d] * (nx < 0 || ny < 0 || nx >= N || ny >= N ? 0.5 : 0.45)) * cs; }
  pts.push([ex, ey]);
  x.lineCap = 'round'; x.lineJoin = 'round';
  for (const [w, c] of [[cs * 0.32, 'rgba(250,204,21,.16)'], [cs * 0.1, 'rgba(253,224,71,.95)']]) { x.strokeStyle = c; x.lineWidth = w; x.beginPath(); pts.forEach(([a, bb], j) => (j ? x.lineTo(a, bb) : x.moveTo(a, bb))); x.stroke(); }
  if (mo) { x.setLineDash([cs * 0.12, cs * 0.3]); x.lineDashOffset = -((now / 12) % (cs * 0.42)); x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = cs * 0.05; x.beginPath(); pts.forEach(([a, bb], j) => (j ? x.lineTo(a, bb) : x.moveTo(a, bb))); x.stroke(); x.setLineDash([]); }
  // source
  x.fillStyle = '#facc15'; x.beginPath(); x.arc(sx, sy, cs * 0.24, 0, 7); x.fill(); x.fillStyle = '#07080c'; x.font = `800 ${cs * 0.28}px system-ui`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('→↓←↑'[b.src.d], sx, sy + 1);
  for (let i = 0; i < N * N; i++) {
    const t = b.type[i], px = ((i % N) + 0.5) * cs, py = (Math.floor(i / N) + 0.5) * cs;
    if (t === WALL) { x.fillStyle = 'rgba(148,163,184,.35)'; x.fillRect(px - cs * 0.42, py - cs * 0.42, cs * 0.84, cs * 0.84); x.strokeStyle = 'rgba(148,163,184,.6)'; x.lineWidth = 2; x.beginPath(); x.moveTo(px - cs * 0.42, py); x.lineTo(px + cs * 0.42, py); x.stroke(); }
    if (t === LAMP) { const on = tr.lit.has(i); x.lineWidth = 3; x.strokeStyle = on ? '#fde047' : 'rgba(214,219,232,.6)'; x.fillStyle = on ? '#fde047' : 'rgba(7,8,12,.9)'; x.beginPath(); x.arc(px, py, cs * 0.22, 0, 7); x.fill(); x.stroke(); if (on) { x.strokeStyle = '#fde047'; for (let a = 0; a < 8; a++) { const an = (a * Math.PI) / 4; x.beginPath(); x.moveTo(px + Math.cos(an) * cs * 0.29, py + Math.sin(an) * cs * 0.29); x.lineTo(px + Math.cos(an) * cs * 0.38, py + Math.sin(an) * cs * 0.38); x.stroke(); } } }
    if (t === MIRROR) {
      const r = b.rot.indexOf(i), st = r >= 0 ? (mask >> r) & 1 : b.fixedState[i];
      let ang = st ? Math.PI / 4 : -Math.PI / 4;
      if (r >= 0 && mo && b === g.board && g.lock[i] > g.tick) ang -= (Math.PI / 2) * ((g.lock[i] - g.tick) / LW.ROT) * (st ? 1 : -1);
      if (r >= 0) { x.strokeStyle = 'rgba(34,211,238,.9)'; x.lineWidth = 3; x.strokeRect(px - cs * 0.44, py - cs * 0.44, cs * 0.88, cs * 0.88); }
      x.save(); x.translate(px, py); x.rotate(ang); x.strokeStyle = r >= 0 ? '#e0f2fe' : 'rgba(148,163,184,.85)'; x.lineWidth = cs * (r >= 0 ? 0.1 : 0.08); x.beginPath(); x.moveTo(-cs * 0.4, 0); x.lineTo(cs * 0.4, 0); x.stroke(); x.restore();
    }
  }
  if (!o.silhouette && b === g.board && g.phase === 'play' && cur >= 0) { const px = (cur % N) * cs, py = Math.floor(cur / N) * cs; x.strokeStyle = '#a78bfa'; x.lineWidth = 3; x.setLineDash([6, 4]); x.strokeRect(px + 3, py + 3, cs - 6, cs - 6); x.setLineDash([]); }
  if (!o.silhouette && b === g.board && g.n === 1 && g.used === 0 && g.phase === 'play') { const i = b.rot[0], px = ((i % N) + 0.75) * cs, py = (Math.floor(i / N) + 0.8) * cs + (mo ? Math.sin(now / 180) * 5 : 0); x.font = `${cs * 0.45}px system-ui`; x.fillText('👆', px, py); }
  x.restore();
}
function frame(now) {
  const [w, h] = fit(); cx.clearRect(0, 0, w, h);
  const G = geo();
  if (g.board) {
    let ox = G.ox; const sh = motion() && now - shake < 150 ? Math.sin((now - shake) / 15) * 4 : 0;
    if (trans && g.phase === 'trans') { drawBoard(cx, trans.b, trans.mask, ox + sh, G.oy, G.size); }
    else { if (trans && motion() && now - trans.at < 900) { const k = Math.min(1, (now - trans.at - 600) / 200); if (k > 0 && k < 1) ox += (1 - k) * w * 0.3; } drawBoard(cx, g.board, g.mask, ox + sh, G.oy, G.size); }
    if (now - flash < 600) { cx.fillStyle = `rgba(253,224,71,${0.18 * (1 - (now - flash) / 600)})`; cx.fillRect(0, 0, w, h); }
  } else { cx.strokeStyle = 'rgba(255,255,255,.08)'; for (let i = 0; i < 16; i++) cx.strokeRect(G.ox + (i % 4) * G.cs + 2, G.oy + Math.floor(i / 4) * G.cs + 2, G.cs - 4, G.cs - 4); }
  W.drawn = g.board ? { n: g.n, mask: g.mask, at: now } : null;
  if (count > 0) { cx.fillStyle = 'rgba(7,8,12,.5)'; cx.fillRect(0, 0, w, h); cx.fillStyle = '#fff'; cx.font = '800 72px system-ui'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(Math.ceil(count / 60), w / 2, h / 2); }
}
// ---- loop: fixed 1/60 s steps while playing (ready / pause / result do not step) ----
let last = performance.now(), acc = 0;
function loop(now) {
  const dt = Math.min(0.25, (now - last) / 1000); last = now; W.frames++; W.ft.push(now); if (W.ft.length > 600) W.ft.shift();
  if (paused) acc = 0;
  else if (count > 0) { count -= dt * 60; if (count <= 0) { count = 0; $('pz').hidden = true; } acc = 0; }
  else if (g.phase === 'play' || g.phase === 'trans') {
    acc += dt; while (acc >= 1 / 60 && (g.phase === 'play' || g.phase === 'trans')) { const n0 = g.n; step(g); acc -= 1 / 60; if (g.n !== n0) { onBoard(); trans = trans && { ...trans, at: now - 600 }; } }
    if (g.phase === 'result' && $('res').hidden) showResult();
  } else acc = 0;
  $('pz').hidden = !(paused || count > 0) ; if (count > 0) $('pz-n').textContent = Math.ceil(count / 60);
  hud(); frame(now); requestAnimationFrame(loop);
}
$('pz').hidden = true;
requestAnimationFrame(loop);
S.ready = true;
