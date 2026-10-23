// Fair Slice UI (prototype, t_bbb6c617). Inlined after fair-core.js by scripts/build-fair.mjs. No /api, no analytics.
// Active time: act(ts) = ts − T0 − P (P = paused total). Cuts are judged at the pointerup / Enter event.timeStamp.
const D = JSON.parse(document.getElementById('ft').textContent);
const $ = (id) => document.getElementById(id);
const loadLS = (k, d) => { try { return Object.assign(d, JSON.parse(localStorage.getItem(k) || 'null') || {}); } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const q = new URLSearchParams(location.search);
const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
const seed = (q.get('seed') || today).replace(/[^A-Za-z0-9-]/g, '').slice(0, 64) || today;
const mq = matchMedia('(prefers-reduced-motion: reduce)');
const set = loadLS('fs-set', { sound: true, haptic: true, motion: !mq.matches });
const canVib = typeof navigator.vibrate === 'function';
// evidence: snd = requested sounds, osc = real oscillator starts, vibs = real vibrate calls, txt = text drawn on canvas per phase, ft = frame times
const W = { snd: [], osc: [], vibs: [], txt: { aim: 0, drag: 0 }, ft: [] };
const LAG = 50;   // frames close the aim window 50 ms behind "now" so a queued pointerup with an earlier timeStamp is judged first
// ---- audio (WebAudio synth, no files; created on the first input = Start) ----
let ac = null;
const unlock = () => { if (!ac && set.sound) { const A = window.AudioContext || window.webkitAudioContext; if (A) try { ac = new A(); } catch {} } if (ac && ac.state === 'suspended' && set.sound) ac.resume(); };
function tone(f, dur, type = 'sine', vol = 0.12, at = 0, f2) {
  if (!set.sound || !ac) return; const t = ac.currentTime + at, o = ac.createOscillator(), gn = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  gn.gain.setValueAtTime(vol, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(gn).connect(ac.destination); o.start(t); o.stop(t + dur + 0.02);
  W.osc.push({ k: curSnd, st: ac.state });
}
const SND = {
  swish: () => tone(1800, 0.14, 'sawtooth', 0.035, 0, 300),
  ting: () => [1568, 2093].forEach((f, j) => tone(f, 0.35, 'triangle', 0.07, 0.12 + j * 0.05)),
  thud: () => tone(140, 0.22, 'sine', 0.14, 0.1, 70),
  finish: () => [523, 659, 784, 1047].forEach((f, j) => tone(f, 0.4, 'triangle', 0.08, j * 0.06)),
};
let curSnd = '';
const play = (k) => { W.snd.push(k); if (set.sound) { curSnd = k; SND[k](); } };
const buzz = (p) => { if (set.haptic && canVib) try { navigator.vibrate(p); W.vibs.push(p); } catch {} };
// ---- state ----
let g = createGame(seed), T0 = 0, P = 0, pauseAt = 0, paused = false, ptr = null, drag = null, kb = null, kbR = 0, hinted = false;
let best = loadLS('fs-best', { rec: null }).rec, shown = 0;
const cv = $('cv'), cx = cv.getContext('2d'), pa = $('play');
const act = (ts) => Math.round(ts - T0 - P);
const nowAct = () => (paused ? act(pauseAt) : act(performance.now()));
const S = window.__fs = { ready: false, E: { FS, createGame, start, advance, cut, judgeCut, cutPoly, halfLine, replay, simulate, generate, genShapes, realValidate, checks, FALLBACK, kbInit, kbRotate, kbMove, kbPoints, kbOffset, bbox, area }, W, seed, set, evlog: [], act,
  get g() { return g; }, get kb() { return kb; }, get drag() { return drag; }, get paused() { return paused; }, get T0() { return T0; }, get P() { return P; } };
const motion = () => set.motion && !mq.matches;
function applySet() {
  document.querySelectorAll('[data-set]').forEach((b) => { const k = b.dataset.set, on = !!set[k]; b.setAttribute('aria-pressed', on); b.classList.toggle('off', !on); if (b.dataset.icon) b.textContent = k === 'sound' ? (on ? '🔊' : '🔇') : on ? '📳' : '📴'; });
  document.querySelectorAll('[data-set="haptic"]').forEach((b) => (b.hidden = !canVib));
  document.body.classList.toggle('rm', !motion());
}
document.querySelectorAll('[data-set]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); const k = b.dataset.set; set[k] = !set[k]; save('fs-set', set); if (k === 'sound' && set.sound) unlock(); applySet(); }));
applySet();
// ---- coordinates: canvas CSS box → 1000×1000 game space, 0.1-unit rounding (GDD 2.1) ----
const toGame = (e) => { const r = cv.getBoundingClientRect(); return [Math.round(((e.clientX - r.left) / r.width) * 10000) / 10, Math.round(((e.clientY - r.top) / r.height) * 10000) / 10]; };
// ---- actions ----
function doStart(ts) { if (g.phase !== 'ready') return; unlock(); start(g, 0); T0 = ts; P = 0; drag = null; ptr = null; kb = null; kbR = 0; hinted = false; $('ready').hidden = true; S.evlog.push({ k: 'start', at: ts }); hud(); }
function cancelDrag(why) { if (drag) S.evlog.push({ k: 'cancel', why, r: g.r }); drag = null; ptr = null; }
function onCut(r, via) {
  S.evlog.push({ k: 'cut', via, ok: r.ok, why: r.why, r: r.rec ? r.rec.r : g.r, e10: r.rec && r.rec.e10, at: r.rec && r.rec.at });
  if (!r.ok) return;
  const rec = r.rec; play('swish'); buzz(15);
  if (rec.grade === 'perfect') { play('ting'); buzz([10, 60, 10]); } else if (rec.grade === 'meh') play('thud');
  chip(rec); kb = null; hud();
}
function chip(rec) { const c = $('chip'); c.hidden = false; c.className = 'chip ' + rec.grade; c.textContent = rec.timeout ? `${rec.r}/10 · ⌛ ${D.timeout} 50.0` : `${rec.r}/10 · ${D.err} ${fmt10(rec.e10)} · ${D['g_' + rec.grade]}`; }
pa.addEventListener('pointerdown', (e) => {
  if (e.target.closest('[data-ui]')) return; e.preventDefault(); unlock();
  if (ptr !== null && e.pointerId !== ptr) { S.evlog.push({ k: 'second-pointer', id: e.pointerId }); cancelDrag('second-pointer'); return; }   // GDD 2.1: 2nd pointer cancels
  if (paused || advance(g, nowAct()) !== 'aim') return;
  ptr = e.pointerId; try { pa.setPointerCapture(e.pointerId); } catch {}
  const p = toGame(e); drag = { p0: p, p1: p, id: e.pointerId }; kb = null;   // pointer resets the keyboard line
  S.evlog.push({ k: 'down', p, r: g.r });
});
pa.addEventListener('pointermove', (e) => { if (drag && e.pointerId === ptr) drag.p1 = toGame(e); });
pa.addEventListener('pointerup', (e) => {
  if (!drag || e.pointerId !== ptr) return; const p1 = toGame(e), p0 = drag.p0; drag = null; ptr = null;
  onCut(cut(g, p0, p1, act(e.timeStamp)), 'pointer');
});
const cancelEv = (e) => { if (drag && e.pointerId === ptr) cancelDrag(e.type); };
pa.addEventListener('pointercancel', cancelEv); pa.addEventListener('lostpointercapture', cancelEv);
addEventListener('keydown', (e) => {
  const k = e.key;
  if (k === 'Enter') {
    e.preventDefault(); if (e.repeat) { S.evlog.push({ k: 'repeat' }); return; }   // GDD 2.1: held Enter never acts
    if (g.phase === 'ready') { doStart(e.timeStamp); return; }
    if (paused) { resume(); return; }
    if (g.phase === 'result') { if (!$('res').hidden) again(); return; }
    if (advance(g, nowAct()) !== 'aim' || drag || !kb || !kb.shown) { S.evlog.push({ k: 'enter-ignored', phase: g.phase, drag: !!drag, kb: !!(kb && kb.shown) }); return; }
    const [p0, p1] = kbPoints(kb); onCut(cut(g, p0, p1, act(e.timeStamp)), 'key'); return;
  }
  if (k === 'Escape' || k === 'p' || k === 'P') { if (paused) resume(); else pause('key'); return; }
  if (!k.startsWith('Arrow') || paused || drag || g.phase === 'ready' || g.phase === 'result') return;
  e.preventDefault(); if (advance(g, nowAct()) !== 'aim' || !kb) return;
  const big = e.shiftKey ? 10 : 1;
  kb = k === 'ArrowLeft' ? kbRotate(kb, -big) : k === 'ArrowRight' ? kbRotate(kb, big) : kbMove(kb, k === 'ArrowUp' ? -big : big);
  S.evlog.push({ k: 'kb', th: kb.th, d: Math.round(kbOffset(kb) * 10) / 10 });
}, true);
$('b-start').addEventListener('click', (e) => { e.stopPropagation(); doStart(e.timeStamp || performance.now()); });
// pause (button, P/Esc, hidden tab, blur): timer frozen, drag cancelled, shape blurred by the sheet
function pause(why) {
  if (paused || g.phase === 'ready' || g.phase === 'result') return; pauseAt = performance.now(); paused = true; cancelDrag('pause');
  $('pz').hidden = false; S.evlog.push({ k: 'pause', why, raw: act(pauseAt) });
}
function resume() { if (!paused) return; P += performance.now() - pauseAt; paused = false; $('pz').hidden = true; S.evlog.push({ k: 'resume', P: Math.round(P) }); }
$('b-pause').addEventListener('click', (e) => { e.stopPropagation(); pause('button'); });
$('b-resume').addEventListener('click', (e) => { e.stopPropagation(); resume(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) pause('hidden'); });
addEventListener('blur', () => pause('blur'));
// ---- result ----
function showResult() {
  const rec = finalRecord(g), was = best, nb = better(rec, was); if (nb) { best = rec; save('fs-best', { rec }); }
  $('r-score').textContent = rec.score; $('r-err').textContent = fmt10(rec.err10);
  $('r-best').textContent = was ? `${was.score} · ${D.errSum} ${fmt10(was.err10)}` : '—';
  const sg = (n) => (n >= 0 ? '+' : '−') + Math.abs(n);
  $('r-diff').textContent = was ? `${sg(rec.score - was.score)} · ${D.errSum} ${rec.err10 - was.err10 >= 0 ? '+' : '−'}${fmt10(Math.abs(rec.err10 - was.err10))}` : '—';
  $('r-new').hidden = !(nb && was); $('r-first').hidden = !!was;
  const bars = $('r-bars'); bars.textContent = '';
  for (const x of g.rounds) { const b = document.createElement('div'); b.className = 'rb ' + x.grade; b.innerHTML = `<i style="height:${Math.max(4, (Math.min(x.e10, 200) / 200) * 100)}%"></i><s>${x.timeout ? '⌛' : fmt10(x.e10)}</s><u>${x.r}</u>`; bars.append(b); }
  const near = g.rounds.filter((x) => !x.miss && x.e10 > FS.PERFECT).sort((a, b) => a.e10 - b.e10)[0];
  $('r-near').textContent = near ? D.near.replace('{r}', near.r).replace('{e}', fmt10(near.e10)) : g.rounds.every((x) => x.grade === 'perfect') ? D.allPerfect : '';
  const meh = g.rounds.filter((x) => x.grade === 'meh').length; $('r-warn').hidden = meh < 3;
  $('seed').textContent = seed; $('r-fb').textContent = g.shapes.filter((s) => s.fallback).map((s) => s.tag).join(' ');
  play('finish'); $('res').hidden = false; shown = performance.now(); S.evlog.push({ k: 'result', at: shown, rec }); $('b-again').focus({ preventScroll: true });
}
function again() { g = createGame(seed); paused = false; ptr = null; drag = null; kb = null; $('res').hidden = true; $('pz').hidden = true; $('chip').hidden = true; $('ready').hidden = false; hud(); S.evlog.push({ k: 'again', at: performance.now() }); }
$('b-again').addEventListener('click', (e) => { e.stopPropagation(); again(); });
const shareUrl = () => `${location.origin}${location.pathname}?seed=${encodeURIComponent(seed)}`;
$('b-link').addEventListener('click', async (e) => { e.stopPropagation(); const t = D.shareText.replace('{sum}', fmt10(g.err10)).replace('{url}', shareUrl()); try { await navigator.clipboard.writeText(t); toast(D.copied); } catch { toast(t); } S.evlog.push({ k: 'copy', t }); });
$('b-png').addEventListener('click', (e) => { e.stopPropagation(); const c = document.createElement('canvas'); c.width = 1080; c.height = 1350; const x = c.getContext('2d');
  const gr = x.createLinearGradient(0, 0, 0, 1350); gr.addColorStop(0, '#141b33'); gr.addColorStop(1, '#07080c'); x.fillStyle = gr; x.fillRect(0, 0, 1080, 1350);
  x.fillStyle = '#e8eaf0'; x.textAlign = 'center'; x.font = '700 46px system-ui,sans-serif'; x.fillText(`${D.name} · ${seed}`, 540, 90);
  g.rounds.forEach((rc, i) => { const s = 180, ox = 60 + (i % 5) * 196, oy = 140 + Math.floor(i / 5) * 250, k = s / 1000;
    x.save(); x.translate(ox, oy); x.fillStyle = 'rgba(255,255,255,.05)'; x.fillRect(0, 0, s, s); x.scale(k, k);
    drawRing(x, rc.timeout ? g.shapes[i].poly : rc.L, rc.timeout ? 'rgba(148,163,184,.6)' : '#facc15'); if (!rc.timeout) drawRing(x, rc.R, '#22d3ee');
    if (rc.cut) { x.strokeStyle = '#fff'; x.lineWidth = 8; lineAcross(x, rc.cut[0], rc.cut[1]); }
    x.restore(); x.fillStyle = '#e8eaf0'; x.font = '700 34px system-ui,sans-serif'; x.fillText(rc.timeout ? '⌛' : fmt10(rc.e10), ox + s / 2, oy + s + 44); });
  x.font = '800 170px system-ui,sans-serif'; x.fillText(g.score, 540, 860); x.font = '600 50px system-ui,sans-serif'; x.fillStyle = 'rgba(214,219,232,.85)';
  x.fillText(`${D.errSum} ${fmt10(g.err10)}`, 540, 950); x.font = '500 34px system-ui,sans-serif'; x.fillText('playtoday.cloud', 540, 1290);
  c.toBlob((bl) => { const a = document.createElement('a'); a.href = URL.createObjectURL(bl); a.download = `fair-slice-${seed}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); S.evlog.push({ k: 'png' }); }, 'image/png'); });
let tt = 0; function toast(s) { const t = $('toast'); t.textContent = s; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 1300); }
// ---- HUD ----
function hud(a) {
  const ph = g.phase, now = a ?? nowAct();
  const left = ph === 'aim' ? Math.max(0, g.deadline - now) : ph === 'intro' || ph === 'ready' ? FS.AIM : 0;
  $('h-round').textContent = `${Math.max(1, g.r)}/10`; $('h-time').textContent = (Math.ceil(left / 100) / 10).toFixed(1); $('h-score').textContent = g.score;
  $('h-bar').style.width = (100 * left) / FS.AIM + '%'; $('h-bar').classList.toggle('low', ph === 'aim' && left < 3000);
}
// ---- render ----
function fit() { const r = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight; if (cv.width !== Math.round(w * r) || cv.height !== Math.round(h * r)) { cv.width = Math.round(w * r); cv.height = Math.round(h * r); } cx.setTransform(r, 0, 0, r, 0, 0); return [w, h]; }
function ringPath(x, R) { if (!R || R.length < 3) return false; x.beginPath(); x.moveTo(R[0][0], R[0][1]); for (let i = 1; i < R.length; i++) x.lineTo(R[i][0], R[i][1]); x.closePath(); return true; }
function drawRing(x, R, fill, stroke = 'rgba(255,255,255,.55)') { if (!ringPath(x, R)) return; x.fillStyle = fill; x.fill(); x.strokeStyle = stroke; x.lineWidth = 3; x.lineJoin = 'round'; x.stroke(); }
function lineAcross(x, p0, p1) { const d = [p1[0] - p0[0], p1[1] - p0[1]], L = Math.hypot(...d) || 1, u = [d[0] / L, d[1] / L]; x.beginPath(); x.moveTo(p0[0] - u[0] * 3000, p0[1] - u[1] * 3000); x.lineTo(p0[0] + u[0] * 3000, p0[1] + u[1] * 3000); x.stroke(); }
function text(x, s, px, py, size, color, phase) { if (phase === 'aim') W.txt.aim++; if (drag) W.txt.drag++; x.font = `800 ${size}px system-ui,sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = size / 5; x.strokeStyle = 'rgba(7,8,12,.85)'; x.strokeText(s, px, py); x.fillStyle = color; x.fillText(s, px, py); }
const cen = (R) => { if (!R || R.length < 3) return null; const a = area(R); if (a < 1) return null; let sx = 0, sy = 0, s = 0; for (let i = 0; i < R.length; i++) { const p = R[i], q2 = R[(i + 1) % R.length], c = p[0] * q2[1] - q2[0] * p[1]; s += c; sx += (p[0] + q2[0]) * c; sy += (p[1] + q2[1]) * c; } return [sx / (3 * s), sy / (3 * s)]; };
function frame(now) {
  W.ft.push(now); if (W.ft.length > 240) W.ft.shift();
  const [w, h] = fit(); cx.clearRect(0, 0, w, h); const k = w / 1000, mo = motion();
  cx.save(); cx.scale(k, k);
  // backdrop grid
  cx.strokeStyle = 'rgba(255,255,255,.04)'; cx.lineWidth = 1 / k; for (let i = 100; i < 1000; i += 100) { cx.beginPath(); cx.moveTo(i, 0); cx.lineTo(i, 1000); cx.moveTo(0, i); cx.lineTo(1000, i); cx.stroke(); }
  if (g.phase !== 'ready') {
    const a = nowAct(); if (!paused) advance(g, a - LAG);
    if (g.phase === 'result' && $('res').hidden) { cx.restore(); hud(a); showResult(); return requestAnimationFrame(frame); }
    if (g.phase === 'aim' && kbR !== g.r) { kbR = g.r; kb = kbInit(g.shapes[g.r - 1].poly); }
    const sh = g.shapes[Math.max(0, g.r - 1)].poly;
    if (g.phase === 'intro') {
      const t = Math.min(1, Math.max(0, (a - g.at) / FS.INTRO)); cx.save();
      if (mo) { const B = bbox(sh); cx.translate(B.cx, B.cy); cx.scale(0.85 + 0.15 * t, 0.85 + 0.15 * t); cx.translate(-B.cx, -B.cy); }
      cx.globalAlpha = mo ? t : 1; drawRing(cx, sh, 'rgba(129,140,248,.55)'); cx.restore();
    } else if (g.phase === 'aim' || (g.phase === 'split' && a < g.at) ) {
      drawRing(cx, sh, 'rgba(129,140,248,.55)');
      if (drag) { cx.setLineDash([16, 12]); cx.strokeStyle = '#fff'; cx.lineWidth = 4; lineAcross(cx, drag.p0, drag.p1); cx.setLineDash([]); cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(drag.p0[0], drag.p0[1], 9, 0, 7); cx.fill(); }
      else if (kb && kb.shown) { const [p0, p1] = kbPoints(kb); cx.setLineDash([16, 12]); cx.strokeStyle = '#fde68a'; cx.lineWidth = 4; lineAcross(cx, p0, p1); cx.setLineDash([]); }
      else if (g.r === 1 && !hinted) {   // round-1 icon: a finger crossing the shape from outside (no words)
        const t = ((a - g.at) % 1400) / 1000; if (t <= 1) { const px = 60 + 880 * t, py = 560 - 120 * t; cx.font = '64px system-ui'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.globalAlpha = 0.85; cx.fillText('👆', px, py + 40); cx.globalAlpha = 1; cx.setLineDash([10, 10]); cx.strokeStyle = 'rgba(255,255,255,.45)'; cx.lineWidth = 3; cx.beginPath(); cx.moveTo(60, 560); cx.lineTo(px, py); cx.stroke(); cx.setLineDash([]); }
      }
    } else if (g.phase === 'split' || g.phase === 'result') {
      const rc = g.rounds[g.rounds.length - 1]; hinted = true; const t = a - rc.at;
      if (rc.timeout) { drawRing(cx, sh, 'rgba(148,163,184,.35)'); text(cx, `⌛ ${D.timeout}`, 500, 500, 64, '#fecaca', g.phase); }
      else {
        const d = [rc.cut[1][0] - rc.cut[0][0], rc.cut[1][1] - rc.cut[0][1]], L = Math.hypot(...d), n = [-d[1] / L, d[0] / L];
        const sp = mo ? 24 * Math.min(1, Math.max(0, (t - 150) / 500)) : 0;
        cx.save(); cx.translate(n[0] * sp, n[1] * sp); drawRing(cx, rc.L, 'rgba(250,204,21,.6)', rc.miss ? 'rgba(255,255,255,.55)' : '#fde68a'); cx.restore();
        cx.save(); cx.translate(-n[0] * sp, -n[1] * sp); drawRing(cx, rc.R, 'rgba(34,211,238,.55)', '#a5f3fc'); cx.restore();
        if (t < 150 && mo) { cx.strokeStyle = 'rgba(255,255,255,.95)'; cx.lineWidth = 10; lineAcross(cx, rc.cut[0], rc.cut[1]); }
        else if (!mo) { cx.strokeStyle = '#fff'; cx.lineWidth = 6; lineAcross(cx, rc.cut[0], rc.cut[1]); }
        if (!mo || t >= 650) {
          const c1 = cen(rc.L), c2 = cen(rc.R);
          if (c1) text(cx, fmt10(rc.pct[0]) + '%', c1[0] + n[0] * sp, c1[1] + n[1] * sp, 60, '#fef08a', g.phase);
          if (c2) text(cx, fmt10(rc.pct[1]) + '%', c2[0] - n[0] * sp, c2[1] - n[1] * sp, 60, '#a5f3fc', g.phase);
          const col = { perfect: '#facc15', good: '#4ade80', ok: '#e8eaf0', meh: '#fca5a5' }[rc.grade];
          text(cx, rc.miss ? D.missed : `${D['g_' + rc.grade]} · ${fmt10(rc.e10)}`, 500, 70, 58, col, g.phase);
        }
      }
    }
    hud(a);
  }
  cx.restore();
  requestAnimationFrame(frame);
}
hud(); requestAnimationFrame(frame); S.ready = true;
