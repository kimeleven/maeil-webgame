// Rhythm Garden UI (prototype, t_177308a9). Inlined after rhythm-core.js by scripts/build-rhythm.mjs. No /api, no analytics.
// Judging uses event.timeStamp → active ms (GDD 2.1): active(ts) = ts − T_start − P. Frames only draw and close windows (with a small lag).
const D = JSON.parse(document.getElementById('rt').textContent);
const $ = (id) => document.getElementById(id);
const loadLS = (k, d) => { try { return Object.assign(d, JSON.parse(localStorage.getItem(k) || 'null') || {}); } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const q = new URLSearchParams(location.search);
const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
const seed = (q.get('seed') || today).replace(/[^A-Za-z0-9-]/g, '').slice(0, 64) || today;
const FPS = Math.max(0, Math.min(120, Number(q.get('fps')) || 0));   // debug: throttle drawing + frame driver (R6 evidence)
const mq = matchMedia('(prefers-reduced-motion: reduce)');
const set = loadLS('rg-set', { sound: true, haptic: true, motion: !mq.matches });
let off = (() => { try { return normOffset(JSON.parse(localStorage.getItem('rg-off'))); } catch { return normOffset(localStorage.getItem('rg-off')); } })();
const canVib = typeof navigator.vibrate === 'function';
const W = { snd: [], vib: 0, frames: 0, ft: [], drawn: 0 };
const LAG = 40;           // frame driver closes windows 40 ms behind "now" so queued input events (earlier timeStamp) are judged first
const LEAD = 2000;        // a pot travels from the left edge to the line in 2 s (constant speed)
const CZ_ICON = { miss: '⌛', stray: '✋', double: '✌', rest: '◌✕', early: '⤴', late: '⏳' };
// ---- audio (WebAudio synth, no files; silent until the first input = Start) ----
let ac = null;
const unlock = () => { if (!ac && set.sound) { const A = window.AudioContext || window.webkitAudioContext; if (A) try { ac = new A(); } catch {} } if (ac && ac.state === 'suspended' && set.sound) ac.resume(); };
function tone(f, dur, type = 'sine', vol = 0.12, at = 0) {
  if (!set.sound || !ac) return; const t = ac.currentTime + at, o = ac.createOscillator(), gn = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); gn.gain.setValueAtTime(vol, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(gn).connect(ac.destination); o.start(t); o.stop(t + dur + 0.02);
}
const SND = {
  tick: () => tone(1500, 0.035, 'square', 0.035),
  perfect: () => [659, 831, 988].forEach((f) => tone(f, 0.22, 'triangle', 0.07)),
  good: () => tone(659, 0.16, 'triangle', 0.08),
  wilt: () => tone(110, 0.2, 'sawtooth', 0.06),
  finish: () => [523, 659, 784, 1047].forEach((f, j) => tone(f, 0.4, 'triangle', 0.08, j * 0.06)),
};
const play = (k) => { W.snd.push(k); if (set.sound) SND[k](); };
const buzz = (ms) => { if (set.haptic && canVib) try { navigator.vibrate(ms); W.vib++; } catch {} };
// ---- state ----
let g = createGame(seed, { offset: off }), T0 = 0, P = 0, pauseAt = 0, paused = false, countEnd = 0, ptr = null, keyDown = false;
let best = loadLS('rg-best', { rec: null }).rec, lastTick = -1, fx = [];
const cv = $('cv'), cx = cv.getContext('2d');
const grid = (() => { const a = []; let t = RG.FIRST; while (t <= RG.DUR) { a.push(t); t += segOf(t).p; } return a; })();
const act = (ts) => Math.round(ts - T0 - P);
const S = window.__rg = { ready: false, E: { RG, createGame, start, input, deliver, HORIZON, advance, replay, simulate, genChart, validate, policyInputs, normOffset, winOf, segOf, accuracy, causes, CAUSES }, W, seed, set, evlog: [], act, grid, LAG,
  get g() { return g; }, get paused() { return paused || countEnd > 0; }, get T0() { return T0; }, get P() { return P; }, get off() { return off; } };
const motion = () => set.motion && !mq.matches;
function applySet() {
  document.querySelectorAll('[data-set]').forEach((b) => { const k = b.dataset.set, on = !!set[k]; b.setAttribute('aria-pressed', on); b.classList.toggle('off', !on); if (b.dataset.icon) b.textContent = k === 'sound' ? (on ? '🔊' : '🔇') : on ? '📳' : '📴'; });
  document.querySelectorAll('[data-set="haptic"]').forEach((b) => (b.hidden = !canVib));
  document.body.classList.toggle('rm', !motion());
  $('ofs-v').textContent = (off > 0 ? '+' : '') + off; $('o-v').textContent = (off > 0 ? '+' : '') + off;
}
document.querySelectorAll('[data-set]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); const k = b.dataset.set; set[k] = !set[k]; save('rg-set', set); if (k === 'sound' && set.sound) unlock(); applySet(); }));
const setOff = (v) => { off = normOffset(v); save('rg-off', off); g.o = off; applySet(); };
$('b-ofs').addEventListener('click', (e) => { e.stopPropagation(); $('ofs').hidden = false; });
$('o-m').addEventListener('click', (e) => { e.stopPropagation(); setOff(off - 10); });
$('o-p').addEventListener('click', (e) => { e.stopPropagation(); setOff(off + 10); });
$('o-x').addEventListener('click', (e) => { e.stopPropagation(); $('ofs').hidden = true; });
applySet();
// ---- actions ----
function doStart(ts) { if (g.phase !== 'ready') return; unlock(); g.o = off; start(g); T0 = ts; P = 0; lastTick = -1; fx = []; $('ready').hidden = true; $('ofs').hidden = true; S.evlog.push({ k: 'start', at: ts }); hud(); }
// t_2b703714: inputs go through deliver() — judged at their event timeStamp even if a frame already closed that window
// (bounded by HORIZON ms between timeStamp and delivery). Log keeps raw ts / receive time / frame point / path for evidence.
function feed(kind, ts, id) {
  const shown = !$('res').hidden;
  if (!(g.phase === 'play' || (g.phase === 'result' && !shown)) || paused || countEnd) { S.evlog.push({ k: 'drop', kind }); return; }
  const raw = act(ts), recv = act(performance.now()), frameAt = g.now, n0 = g.events.length;
  const r = deliver(g, kind, raw, id, recv);
  S.evlog.push({ k: kind, id, raw, recv, frameAt, path: r.path, r: r.e.a, why: r.e.why, revoked: r.revoked ? r.revoked.map((x) => `${x.a}:${x.why || ''}:${x.k}`) : undefined });
  if (r.path === 'rebuild') {
    const gone = new Set((r.revoked || []).filter((x) => x.a === 'wilt').map((x) => x.k)); fx = fx.filter((f) => !(f.k === 'wilt' && gone.has(f.bk)));
    const i = g.events.indexOf(r.e); react(i >= 0 ? i : g.events.length, i >= 0); return;
  }
  react(n0);
}
function react(n0, one) {
  for (let i = n0; i < (one ? n0 + 1 : g.events.length); i++) {
    const e = g.events[i]; if (e.a === 'perfect' || e.a === 'good') { play(e.a); buzz(10); fx.push({ k: e.a, d: e.d, at: performance.now() }); }
    if (e.a === 'wilt') { play('wilt'); buzz(40); fx.push({ k: 'wilt', why: e.why, bk: e.k, at: performance.now() }); }
  }
  // result appears only once no in-flight input (≤ HORIZON old) can still revise it
  if (g.phase === 'result' && $('res').hidden && act(performance.now()) - g.now > HORIZON) showResult();
}
// pointer: anywhere in the play area (not on UI). First pointer only; cancel/lost capture = up.
const pa = $('play');
pa.addEventListener('pointerdown', (e) => {
  if (e.target.closest('[data-ui]')) return; e.preventDefault(); unlock();
  if (g.phase !== 'play' && !(g.phase === 'result' && $('res').hidden)) return;
  if (ptr !== null) { S.evlog.push({ k: 'second-pointer', id: e.pointerId }); return; }
  ptr = e.pointerId; try { pa.setPointerCapture(e.pointerId); } catch {}
  feed('down', e.timeStamp, e.pointerId);
});
const endPtr = (kind) => (e) => { if (ptr !== e.pointerId) return; ptr = null; S.evlog.push({ k: 'ptr-' + e.type }); feed(kind, e.timeStamp, e.pointerId); };
pa.addEventListener('pointerup', endPtr('up'));
pa.addEventListener('pointercancel', endPtr('cancel'));
pa.addEventListener('lostpointercapture', endPtr('cancel'));
addEventListener('keydown', (e) => {
  if (g.phase === 'ready') { if (e.key === 'Enter' && $('ofs').hidden) { e.preventDefault(); doStart(e.timeStamp); } return; }
  if (g.phase === 'result' && !$('res').hidden) { if (e.key === 'Enter') { e.preventDefault(); again(); } return; }
  if (e.key === ' ' || e.code === 'Space') {
    e.preventDefault(); if (e.repeat) { S.evlog.push({ k: 'repeat' }); return; }
    if (keyDown) return; keyDown = true; unlock(); feed('down', e.timeStamp, 'key'); return;
  }
  if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') pause();
}, true);
addEventListener('keyup', (e) => { if ((e.key === ' ' || e.code === 'Space') && keyDown) { e.preventDefault(); keyDown = false; feed('up', e.timeStamp, 'key'); } }, true);
$('b-start').addEventListener('click', (e) => { e.stopPropagation(); doStart(e.timeStamp || performance.now()); });
// pause (button, P/Esc, hidden tab, blur) → tap → 3 s count; active time frozen the whole time
function pause() {
  if (g.phase !== 'play' || paused) return; const now = performance.now();
  if (countEnd) { countEnd = 0; } else pauseAt = now;
  const n0 = g.events.length; if (g.held) { const r = pauseRelease(g, act(pauseAt)); S.evlog.push({ k: 'pause-release', r: r && r.a }); }
  ptr = null; keyDown = false; paused = true; $('pz').hidden = false; $('pz-n').textContent = ''; S.evlog.push({ k: 'pause', raw: act(pauseAt) }); react(n0);
}
$('b-pause').addEventListener('click', (e) => { e.stopPropagation(); pause(); });
$('pz').addEventListener('click', (e) => { if (e.target.closest('[data-set]') || !paused) return; paused = false; countEnd = performance.now() + 3000; });
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
addEventListener('blur', () => pause());
// ---- result ----
function showResult() {
  const rec = record(g), was = best, nb = better(rec, was); if (nb) { best = rec; save('rg-best', { rec }); }
  $('r-score').textContent = rec.score; $('r-combo').textContent = rec.maxCombo; $('r-perf').textContent = rec.perfect;
  $('r-best').textContent = was ? `${was.score} · ${D.maxCombo} ${was.maxCombo}` : '—';
  const sg = (n) => (n >= 0 ? '+' : '') + n;
  $('r-diff').textContent = was ? `${sg(rec.score - was.score)} · ${sg(rec.maxCombo - was.maxCombo)}` : '—';
  $('r-new').hidden = !(nb && was); $('r-first').hidden = !!was; $('seed').textContent = seed; $('r-chart').textContent = g.chart.fallback ? `· chart=fallback (${D.fallback})` : '';
  const A = accuracy(g), tot = Math.max(1, A.n), bars = $('r-acc').children;
  bars[0].style.width = (100 * A.bins.early) / tot + '%'; bars[1].style.width = (100 * A.bins.ok) / tot + '%'; bars[2].style.width = (100 * A.bins.late) / tot + '%';
  $('r-ae').textContent = `◀ ${D.early} ${A.bins.early}`; $('r-ao').textContent = `${D.ok} ${A.bins.ok}`; $('r-al').textContent = `${D.late} ${A.bins.late} ▶`;
  $('r-accn').textContent = D.accN.replace('{n}', A.n); $('r-acc').hidden = !A.n; $('r-acc').nextElementSibling.hidden = !A.n;
  const mean = !A.n ? '' : Math.abs(A.mean) <= 10 ? D.meanOk.replace('{n}', 10) : (A.mean < 0 ? D.meanEarly : D.meanLate).replace('{n}', Math.abs(A.mean));
  $('r-stat').textContent = g.end.survived ? D.finish.replace('{n}', g.end.bonus) : D.wilted; $('r-mean').textContent = mean;
  // failure causes (t_552009cf): count per engine reason, most frequent first-highlighted, tip for the top cause
  const C = causes(g), czl = $('r-czl'); czl.textContent = '';
  if (!C.total) { const i = document.createElement('i'); i.className = 'zero'; i.textContent = D.noWilt; czl.append(i); }
  for (const k of CAUSES) if (C.n[k]) { const i = document.createElement('i'); i.className = k === C.top ? 'top' : ''; i.dataset.k = k; i.textContent = `${CZ_ICON[k]} ${D['c_' + k]} ${C.n[k]}`; czl.append(i); }
  $('r-tipt').textContent = C.top ? D['tip_' + C.top] : D.tip_none;
  if (g.end.survived) play('finish');
  $('res').hidden = false; S.evlog.push({ k: 'result', at: performance.now(), rec, acc: A }); $('b-again').focus({ preventScroll: true });
}
function again() { g = createGame(seed, { offset: off }); paused = false; countEnd = 0; ptr = null; keyDown = false; fx = []; $('res').hidden = true; $('pz').hidden = true; $('ready').hidden = false; hud(); S.evlog.push({ k: 'again', at: performance.now() }); }
$('b-again').addEventListener('click', (e) => { e.stopPropagation(); again(); });
const shareUrl = () => `${location.origin}${location.pathname}?seed=${encodeURIComponent(seed)}`;
$('b-link').addEventListener('click', async (e) => { e.stopPropagation(); const t = D.shareText.replace('{combo}', g.maxCombo).replace('{url}', shareUrl()); try { await navigator.clipboard.writeText(t); toast(D.copied); } catch { toast(t); } S.evlog.push({ k: 'copy', t }); });
$('b-png').addEventListener('click', (e) => { e.stopPropagation(); const c = document.createElement('canvas'); c.width = 1080; c.height = 1350; const x = c.getContext('2d');
  const gr = x.createLinearGradient(0, 0, 0, 1350); gr.addColorStop(0, '#0f1f17'); gr.addColorStop(1, '#07080c'); x.fillStyle = gr; x.fillRect(0, 0, 1080, 1350);
  // garden strip: planted pots in order (flower / wilted leaf)
  const items = g.res.map((r, k) => ({ r, b: g.chart.beats[k] })).filter((o) => o.r && o.r !== 'pass' && o.b.kind !== 'tail');
  const per = 14, sz = 64; items.slice(0, per * 8).forEach((o, i) => { const px = 70 + (i % per) * sz, py = 150 + Math.floor(i / per) * sz; drawFlower(x, px + sz / 2, py + sz / 2, sz * 0.4, o.r); });
  x.fillStyle = '#e8eaf0'; x.textAlign = 'center'; x.font = '800 150px system-ui,sans-serif'; x.fillText(g.score, 540, 900);
  x.font = '600 48px system-ui,sans-serif'; x.fillStyle = 'rgba(214,219,232,.85)'; x.fillText(`${D.maxCombo} ${g.maxCombo} · PERFECT ${g.perfect}`, 540, 990); x.fillText(D.name, 540, 1080);
  x.font = '500 34px system-ui,sans-serif'; x.fillText('playtoday.cloud', 540, 1290);
  c.toBlob((bl) => { const a = document.createElement('a'); a.href = URL.createObjectURL(bl); a.download = `rhythm-garden-${seed}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); S.evlog.push({ k: 'png' }); }, 'image/png'); });
let tt = 0; function toast(s) { const t = $('toast'); t.textContent = s; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 1300); }
// ---- HUD ----
function hud(raw) {
  const left = g.phase === 'ready' ? 90 : Math.max(0, Math.ceil((RG.DUR - (raw ?? g.now)) / 1000));
  $('h-time').textContent = g.phase === 'result' && g.end && g.end.survived ? 0 : left; $('h-score').textContent = g.score;
  $('h-combo').textContent = `${g.combo} ×${mult(g.combo)}`; $('h-leaves').textContent = `🍃${RG.LIVES - g.wilts}`;
}
// ---- render ----
function fit() { const r = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight; if (cv.width !== Math.round(w * r) || cv.height !== Math.round(h * r)) { cv.width = Math.round(w * r); cv.height = Math.round(h * r); } cx.setTransform(r, 0, 0, r, 0, 0); return [w, h]; }
function drawFlower(x, px, py, s, r) {
  if (r === 'perfect' || r === 'good' || r === 'hit') {
    const big = r === 'perfect', R = s * (big ? 1 : 0.7);
    x.fillStyle = big ? '#f472b6' : '#f9a8d4'; for (let a = 0; a < 5; a++) { const an = (a * 2 * Math.PI) / 5 - Math.PI / 2; x.beginPath(); x.arc(px + Math.cos(an) * R * 0.55, py + Math.sin(an) * R * 0.55, R * 0.42, 0, 7); x.fill(); }
    x.fillStyle = '#facc15'; x.beginPath(); x.arc(px, py, R * 0.3, 0, 7); x.fill();
    if (big) { x.strokeStyle = '#facc15'; x.lineWidth = 3; x.beginPath(); x.arc(px, py, R * 1.08, 0, 7); x.stroke(); }
  } else { // wilted leaf
    x.save(); x.translate(px, py); x.rotate(0.6); x.fillStyle = '#92400e'; x.beginPath(); x.ellipse(0, 0, s * 0.55, s * 0.25, 0, 0, 7); x.fill(); x.strokeStyle = '#451a03'; x.lineWidth = 2; x.beginPath(); x.moveTo(-s * 0.5, 0); x.lineTo(s * 0.5, 0); x.stroke(); x.restore();
  }
}
function pot(x, px, py, s, b, r, tilt) {
  x.save(); x.translate(px, py); if (tilt) x.rotate(0.35);
  if (b.kind === 'rest') {
    x.setLineDash([5, 4]); x.strokeStyle = 'rgba(214,219,232,.75)'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(-s * 0.5, -s * 0.4); x.lineTo(s * 0.5, -s * 0.4); x.lineTo(s * 0.36, s * 0.45); x.lineTo(-s * 0.36, s * 0.45); x.closePath(); x.stroke(); x.setLineDash([]);
    x.strokeStyle = 'rgba(248,113,113,.9)'; x.lineWidth = 3; x.beginPath(); x.moveTo(-s * 0.18, -s * 0.12); x.lineTo(s * 0.18, s * 0.24); x.moveTo(s * 0.18, -s * 0.12); x.lineTo(-s * 0.18, s * 0.24); x.stroke();
  } else {
    const k = b.off ? 0.72 : 1; x.scale(k, k);
    x.fillStyle = '#b45309'; x.strokeStyle = '#fbbf24'; x.lineWidth = 2; x.beginPath(); x.moveTo(-s * 0.5, -s * 0.4); x.lineTo(s * 0.5, -s * 0.4); x.lineTo(s * 0.36, s * 0.45); x.lineTo(-s * 0.36, s * 0.45); x.closePath(); x.fill(); x.stroke();
    x.fillStyle = '#78350f'; x.fillRect(-s * 0.55, -s * 0.5, s * 1.1, s * 0.16);
    if (!r) { x.fillStyle = '#fde68a'; x.beginPath(); x.ellipse(0, s * 0.02, s * 0.11, s * 0.16, 0, 0, 7); x.fill(); }
  }
  x.restore();
}
function frame(now) {
  const [w, h] = fit(); cx.clearRect(0, 0, w, h); const mo = motion();
  const raw = g.phase === 'ready' ? 0 : g.phase === 'result' ? g.now : paused ? act(pauseAt) : countEnd ? act(pauseAt) : act(now);
  const c = raw - g.o, laneY = h * 0.8, s = Math.min(46, w * 0.1), lineX = w * 0.75, sp = lineX / LEAD;
  // garden (planted so far) in the middle: rows of 10 from the bottom up
  const done = g.res.map((r, k) => ({ r, b: g.chart.beats[k] })).filter((o) => o.r && o.r !== 'pass' && o.b.kind !== 'tail');
  const cols = 10, cs = Math.min(36, (w - 24) / cols), gy0 = laneY - s * 1.6;
  done.slice(-cols * 9).forEach((o, i) => drawFlower(cx, 12 + (i % cols + 0.5) * ((w - 24) / cols), gy0 - Math.floor(i / cols) * cs, cs * 0.38, o.r));
  // lane
  cx.fillStyle = 'rgba(34,197,94,.08)'; cx.fillRect(0, laneY - s, w, s * 2); cx.strokeStyle = 'rgba(34,197,94,.3)'; cx.lineWidth = 1; cx.strokeRect(-1, laneY - s, w + 2, s * 2);
  cx.strokeStyle = 'rgba(255,255,255,.12)'; for (const t of grid) { const px = lineX - (t - c) * sp; if (px < -4 || px > w + 4) continue; cx.beginPath(); cx.moveTo(px, laneY + s * 0.7); cx.lineTo(px, laneY + s); cx.stroke(); }
  // plant line + beat flashes (intro, resume count, 1 beat before a tempo change: 2 flashes)
  const near = grid.reduce((m, t) => (Math.abs(t - c) < Math.abs(m - c) ? t : m), grid[0]);
  const chg = RG.SEG.some((sg) => sg.at > 0 && near < sg.at && sg.at - near <= segOf(near).p * 1.01);
  const flashOn = (c < RG.FIRST || countEnd > 0 || chg) && Math.abs(near - c) < 90 && g.phase === 'play';
  cx.strokeStyle = flashOn && !mo ? '#fff' : flashOn ? '#fef9c3' : 'rgba(125,211,252,.9)'; cx.lineWidth = flashOn ? (mo ? 6 : 9) : 3;
  if (flashOn && mo) { cx.fillStyle = 'rgba(254,249,195,.18)'; cx.fillRect(lineX - 24, laneY - s * 1.2, 48, s * 2.4); }
  cx.beginPath(); cx.moveTo(lineX, laneY - s * 1.15); cx.lineTo(lineX, laneY + s * 1.15); cx.stroke();
  cx.font = `${s * 0.6}px system-ui`; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText('💧', lineX, laneY - s * 1.45);
  // pots
  const B = g.chart.beats;
  for (const v of g.chart.vines) { const h0 = lineX - (B[v.h].t - c) * sp, e0 = lineX - (B[v.e].t - c) * sp; if (h0 < -s || e0 > w + s) continue; const st = g.vine[v.h === undefined ? 0 : B[v.h].v];
    cx.fillStyle = st === 'held' ? 'rgba(74,222,128,.85)' : g.res[v.e] === 'early' || g.res[v.e] === 'late' || g.res[v.h] === 'miss' ? 'rgba(146,64,14,.6)' : 'rgba(34,197,94,.6)';
    cx.fillRect(e0, laneY - s * 0.16, h0 - e0, s * 0.32); cx.fillStyle = '#86efac'; cx.beginPath(); cx.arc(e0, laneY, s * 0.22, 0, 7); cx.fill(); }
  for (let k = Math.max(0, g.ci - 8); k < B.length; k++) {
    const b = B[k], px = lineX - (b.t - c) * sp; if (px > w + s) continue; if (px < -s) break; if (b.kind === 'tail') continue;
    const r = g.res[k], bad = r === 'miss' || r === 'wilt';
    if (px > lineX + 2) cx.globalAlpha = Math.max(0.15, 1 - (px - lineX) / (w - lineX + s));
    pot(cx, px, laneY, s, b, r && r !== 'pass' ? r : null, bad); cx.globalAlpha = 1;
    if (r === 'perfect' || r === 'good') drawFlower(cx, px, laneY - s * 0.55, s * 0.42, r);
    if (bad) drawFlower(cx, px, laneY - s * 0.6, s * 0.4, 'wilt');
  }
  // judgement fx (0.6 s): early/late arrows (shape, not colour), wilt cause icon
  fx = fx.filter((f) => now - f.at < 600);
  for (const f of fx) { const a = 1 - (now - f.at) / 600, yy = laneY - s * 2.2 - (mo ? (1 - a) * 20 : 0); cx.globalAlpha = a; cx.textAlign = 'center';
    if (f.k === 'wilt') { cx.font = `800 ${s * 0.55}px system-ui`; cx.fillStyle = '#fca5a5'; cx.fillText(CZ_ICON[f.why] || '✕', lineX, yy);
      if (D['c_' + f.why]) { cx.font = `700 ${Math.max(12, s * 0.32)}px system-ui`; cx.fillText(D['c_' + f.why], Math.min(lineX, w - 60), yy + s * 0.5); } }
    else { cx.font = `800 ${s * 0.5}px system-ui`; cx.fillStyle = f.k === 'perfect' ? '#facc15' : '#e8eaf0'; cx.fillText((f.k === 'good' && f.d < -RG.PERFECT ? '◀ ' : '') + (f.k === 'perfect' ? 'PERFECT' : 'GOOD') + (f.k === 'good' && f.d > RG.PERFECT ? ' ▶' : ''), lineX, yy); }
    cx.globalAlpha = 1; }
  if (mo && fx.some((f) => f.k === 'wilt' && now - f.at < 120)) { cv.style.transform = `translateX(${Math.sin(now / 15) * 3}px)`; } else cv.style.transform = '';
  // first-run icon during the intro: "tap when the pot touches the line"
  if (g.phase === 'play' && c < RG.FIRST + 200) { cx.font = `${s * 0.8}px system-ui`; cx.fillText('👆', lineX, laneY + s * 1.6 + (mo ? Math.sin(now / 160) * 4 : 0)); }
  if (countEnd > 0) { cx.fillStyle = 'rgba(7,8,12,.45)'; cx.fillRect(0, 0, w, h * 0.6); cx.fillStyle = '#fff'; cx.font = '800 72px system-ui'; cx.fillText(Math.ceil((countEnd - now) / 1000), w / 2, h * 0.35); }
  W.drawn = raw;
  return raw;
}
// ---- loop ----
let lastDraw = 0;
function loop(now) {
  W.frames++; W.ft.push(now); if (W.ft.length > 600) W.ft.shift();
  if (countEnd && now >= countEnd) { P += now - pauseAt; countEnd = 0; $('pz').hidden = true; }
  if (!FPS || now - lastDraw >= 1000 / FPS - 1) {
    lastDraw = now;
    if (g.phase === 'play' && !paused && !countEnd) {
      const raw = act(now), n0 = g.events.length; advance(g, raw - LAG); if (raw >= RG.DUR) advance(g, raw);
      // metronome: one tick per grid beat as it reaches the line (sound only; judging never uses it)
      const gi = grid.findIndex((t) => t > raw - g.o) - 1; if (gi > lastTick) { lastTick = gi; if (gi >= 0) play('tick'); }
      react(n0);
    }
    if (g.phase === 'result' && $('res').hidden && act(now) - g.now > HORIZON) showResult();
    $('pz').hidden = !(paused || countEnd > 0); if (countEnd > 0) $('pz-n').textContent = Math.ceil((countEnd - now) / 1000);
    const raw = frame(now); hud(raw);
  }
  requestAnimationFrame(loop);
}
$('pz').hidden = true;
requestAnimationFrame(loop);
S.ready = true;
