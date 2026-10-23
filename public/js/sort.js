// Sort Rail UI (prototype, t_3f092e76). Inlined after sort-core.js by scripts/build-sort.mjs. No /api, no analytics.
// Game clock gt(ts) = ts − T0 − P (P = frozen total: pauses + R-B notice). Inputs use event.timeStamp → t, arrival performance.now() → at.
// Frames only call advance(now) and draw; judgments come from (t, at) alone (sort-core §2.0.1).
const D = JSON.parse(document.getElementById('st').textContent);
const $ = (id) => document.getElementById(id);
const loadLS = (k, d) => { try { return Object.assign(d, JSON.parse(localStorage.getItem(k) || 'null') || {}); } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const q = new URLSearchParams(location.search);
const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
const seed = (q.get('seed') || today).replace(/[^A-Za-z0-9-]/g, '').slice(0, 64) || today;
const FPS = Math.max(0, Math.min(120, Number(q.get('fps')) || 0));   // debug: throttle frames (evidence only)
const mq = matchMedia('(prefers-reduced-motion: reduce)');
const set = loadLS('sr-set', { sound: true, haptic: true, motion: !mq.matches });
const canVib = typeof navigator.vibrate === 'function';
const COL = ['#22d3ee', '#facc15', '#f472b6', '#4ade80'];
const ARW = ['←', '↓', '→'];
// evidence: W.snd = requested sounds (at commit), W.osc = oscillator starts, W.vibs = vibrate calls
const W = { snd: [], osc: [], vibs: [], frames: 0, ft: [] };
let ac = null;
const unlock = () => { if (!ac && set.sound) { const A = window.AudioContext || window.webkitAudioContext; if (A) try { ac = new A(); } catch {} } if (ac && ac.state === 'suspended' && set.sound) ac.resume(); };
function tone(f, dur, type = 'sine', vol = 0.1, at = 0) {
  if (!set.sound || !ac) return; const t = ac.currentTime + at, o = ac.createOscillator(), gn = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); gn.gain.setValueAtTime(vol, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(gn).connect(ac.destination); o.start(t); o.stop(t + dur + 0.02); W.osc.push(ac.state);
}
const SND = { tick: () => tone(1568, 0.07, 'triangle', 0.07), thud: () => tone(130, 0.14, 'sine', 0.12), up: () => [1047, 1568].forEach((f, j) => tone(f, 0.16, 'triangle', 0.07, j * 0.08)), finish: () => [523, 659, 784].forEach((f, j) => tone(f, 0.3, 'triangle', 0.07, j * 0.07)) };
const play = (k) => { W.snd.push(k); if (set.sound) SND[k](); };
const buzz = (ms) => { if (set.haptic && canVib) try { navigator.vibrate(ms); W.vibs.push(ms); } catch {} };
// ---- state ----
let g = newGame(seed), T0 = 0, P = 0, frozen = null, paused = false, notice = null, lastThaw = 0, seen = 0, shownK = 0, lastLanes = '', flashUntil = 0, fxUntil = 0;
let best = loadLS('sr-best', { rec: null }).rec;
const gt = (ts) => (frozen !== null ? frozen : ts) - T0 - P;
const S = window.__sr = { ready: false, E: { SR, TUTORIAL, generate, realValidate, fallbackBlock, newGame, start, advance, input, replay, simulate, answerOf, ruleOf, tableOf, mult, bonus },
  W, seed, set, evlog: [], gt: (ts) => gt(ts ?? performance.now()), get g() { return g; }, get paused() { return paused; }, get notice() { return notice; }, get frozen() { return frozen; } };
const motion = () => set.motion && !mq.matches;
function applySet() {
  document.querySelectorAll('[data-set]').forEach((b) => { const k = b.dataset.set, on = !!set[k]; b.setAttribute('aria-pressed', on); b.classList.toggle('off', !on); if (b.dataset.icon) b.textContent = k === 'sound' ? (on ? '🔊' : '🔇') : on ? '📳' : '📴'; });
  document.querySelectorAll('[data-set="haptic"]').forEach((b) => (b.hidden = !canVib));
  document.body.classList.toggle('rm', !motion());
}
document.querySelectorAll('[data-set]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); const k = b.dataset.set; set[k] = !set[k]; save('sr-set', set); if (k === 'sound' && set.sound) unlock(); applySet(); }));
applySet();
// ---- freeze (pause / notice): game clock stops at the freeze instant ----
function freeze(realTs) { if (frozen === null) { frozen = realTs; } }
function thaw(now) { if (frozen === null || paused || notice) return; P += now - frozen; frozen = null; lastThaw = now; }
// ---- actions ----
function doStart(ts) {
  if (g.phase !== 'ready') return; unlock(); start(g); T0 = ts; P = 0; frozen = null; seen = 0; shownK = 0; lastLanes = ''; lastThaw = ts;
  $('ready').hidden = true; S.evlog.push({ k: 'start', at: ts }); render(ts);
}
const rails = [...document.querySelectorAll('.rail')];
function press(lane, ts, src) {
  const now = performance.now();
  rails[lane].classList.add('on'); setTimeout(() => rails[lane].classList.remove('on'), 110);   // DOM press shown immediately
  if (g.phase === 'ready' || g.phase === 'end') { S.evlog.push({ k: 'in-ignored', phase: g.phase, src }); return; }
  if (paused || notice || frozen !== null || ts < lastThaw) { S.evlog.push({ k: 'in-dropped', why: paused ? 'paused' : notice ? 'notice' : 'thaw', src }); return; }
  const t = gt(ts), at = Math.max(t, gt(now)); const tag = input(g, { t, at, lane });
  S.evlog.push({ k: 'in', t, at, lane, src, tag, kk: g.k }); react(now);
}
document.querySelectorAll('.rail').forEach((b) => b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); unlock(); press(+b.dataset.lane, e.timeStamp, 'ptr' + e.pointerId); }));
// pointercancel / lostpointercapture / pointerup never cancel a pending or committed choice (GDD §2.1)
document.querySelectorAll('.rail').forEach((b) => ['pointercancel', 'lostpointercapture', 'pointerup'].forEach((ty) => b.addEventListener(ty, () => S.evlog.push({ k: ty }))));
const KEYS = { ArrowLeft: 0, ArrowDown: 1, ArrowRight: 2 };
addEventListener('keydown', (e) => {
  const k = e.key;
  if (k in KEYS || k === 'Enter' || k === 'Escape') e.preventDefault();
  if (e.repeat) { S.evlog.push({ k: 'repeat', key: k }); return; }
  if (g.phase === 'ready') { if (k === 'Enter' && !$('ready').hidden) doStart(e.timeStamp); return; }
  if (g.phase === 'end') { if (k === 'Enter' && !$('res').hidden) again(); return; }
  if (paused) { if (k === 'Enter' || k === 'Escape' || k === 'p' || k === 'P') resume(); else if (k in KEYS) S.evlog.push({ k: 'in-dropped', why: 'paused', src: 'key' }); return; }
  if (k === 'Escape' || k === 'p' || k === 'P') { pause('key'); return; }
  if (k in KEYS) press(KEYS[k], e.timeStamp, 'key');
  else if (k === 'Enter') S.evlog.push({ k: 'enter-ignored', phase: g.phase });
}, true);
$('b-start').addEventListener('click', (e) => { e.stopPropagation(); doStart(performance.now()); });
// ---- pause: button, Esc/P, hidden tab, blur. Logical pending candidate is kept; DOM pressed state dropped. ----
function pause(why) {
  if (paused || g.phase === 'ready' || g.phase === 'end') return; const now = performance.now(); paused = true; freeze(now);
  rails.forEach((r) => r.classList.remove('on'));
  $('pz').hidden = false; document.body.classList.add('hid'); S.evlog.push({ k: 'pause', why, t: gt(now) }); $('b-resume').focus({ preventScroll: true });
}
function resume() { if (!paused) return; const now = performance.now(); paused = false; if (notice) notice.last = now; $('pz').hidden = true; document.body.classList.remove('hid'); thaw(now); S.evlog.push({ k: 'resume', t: gt(now), P }); }
$('b-pause').addEventListener('click', (e) => { e.stopPropagation(); pause('button'); });
$('b-resume').addEventListener('click', (e) => { e.stopPropagation(); resume(); });
$('b-restart').addEventListener('click', (e) => { e.stopPropagation(); S.evlog.push({ k: 'restart', at: performance.now() }); again(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) pause('hidden'); });
addEventListener('blur', () => pause('blur'));
// ---- feedback at commit (after the receive deadline) ----
function react(now) {
  for (; seen < g.commits.length; seen++) {
    const e = g.commits[seen]; const lane = e.lane ?? -1;
    if (e.res === 'ok') { play(e.streak === 5 || e.streak === 10 ? 'up' : 'tick'); buzz(10); }
    else { play('thud'); buzz(25); }
    mark(e, now); S.evlog.push({ k: 'commit', e, at: now }); void lane;
  }
}
function mark(e, now) {
  rails.forEach((r) => r.classList.remove('ok', 'bad')); const fb = $('fb');
  if (e.res === 'ok') { rails[e.lane].classList.add('ok'); fb.textContent = '✓'; fb.className = 'fb ok'; }
  else { const ans = e.ans; if (e.lane !== null) rails[e.lane].classList.add('bad'); if (ans !== null) rails[ans].classList.add('ok'); fb.textContent = e.res === 'miss' ? '·  ✕' : '✕'; fb.className = 'fb bad'; }
  fxUntil = now + (e.res === 'ok' ? SR.FX_OK : SR.FX_BAD) - 40;
}
// ---- result ----
const rec = () => ({ score: g.score, correct: g.correct });
const better = (a, b) => !b || a.score > b.score || (a.score === b.score && a.correct > b.correct);
const dotsOf = () => g.log.filter((e) => e.res !== 'discard').map((e) => (e.res === 'ok' ? '●' : e.res === 'bad' ? '○' : '·')).join('');
const accOf = () => (g.judged ? Math.round((100 * g.correct) / g.judged) : 0);
function showResult() {
  const r = rec(), was = best, nb = better(r, was); if (nb) { best = r; save('sr-best', { rec: r }); }
  const sg = (n) => (n >= 0 ? '+' : '') + n;
  $('r-n').textContent = r.correct; $('r-score').textContent = r.score; $('r-acc').textContent = accOf() + '%'; $('r-max').textContent = g.maxStreak;
  $('r-best').textContent = was ? `${was.score} · ${was.correct}${D.unit}` : '—';
  $('r-diff').textContent = was ? `${sg(r.score - was.score)} · ${sg(r.correct - was.correct)}${D.unit}` : '—';
  $('r-new').hidden = !(nb && was); $('r-first').hidden = !!was; $('r-cut').hidden = !g.discarded;
  $('r-dots').textContent = dotsOf() || '—';
  $('seed').textContent = seed; $('r-fb').textContent = g.fallbacks.map((f) => 'block=' + f).join(' ');
  play('finish'); $('res').hidden = false; S.evlog.push({ k: 'result', at: performance.now(), r, end: g.end }); $('b-again').focus({ preventScroll: true });
}
function again() {
  g = newGame(seed); paused = false; notice = null; frozen = null; seen = 0; shownK = 0; lastLanes = '';
  $('res').hidden = true; $('pz').hidden = true; $('note').hidden = true; document.body.classList.remove('hid'); $('ready').hidden = false;
  rails.forEach((r) => r.classList.remove('ok', 'bad', 'on')); render(performance.now()); S.evlog.push({ k: 'again', at: performance.now() });
}
$('b-again').addEventListener('click', (e) => { e.stopPropagation(); again(); });
const shareUrl = () => `${location.origin}${location.pathname}?seed=${encodeURIComponent(seed)}`;
$('b-link').addEventListener('click', async (e) => { e.stopPropagation(); const t = D.shareText.replace('{n}', g.correct).replace('{url}', shareUrl()); try { await navigator.clipboard.writeText(t); toast(D.copied); } catch { toast(t); } S.evlog.push({ k: 'copy', t }); });
$('b-png').addEventListener('click', (e) => { e.stopPropagation(); const c = document.createElement('canvas'); c.width = 1080; c.height = 1350; const x = c.getContext('2d');
  const gr = x.createLinearGradient(0, 0, 0, 1350); gr.addColorStop(0, '#1b1a3a'); gr.addColorStop(1, '#07080c'); x.fillStyle = gr; x.fillRect(0, 0, 1080, 1350);
  x.textAlign = 'center'; x.fillStyle = '#e8eaf0'; x.font = '700 56px system-ui,sans-serif'; x.fillText(D.name, 540, 150);
  x.font = '800 220px system-ui,sans-serif'; x.fillStyle = '#22d3ee'; x.fillText(g.correct, 540, 470); x.font = '600 52px system-ui,sans-serif'; x.fillStyle = '#e8eaf0'; x.fillText(`${D.sorted} · ${g.score} ${D.pts} · ${accOf()}%`, 540, 560);
  const dots = dotsOf(), per = 20, sz = 44; [...dots].slice(0, per * 9).forEach((d, i) => { const px = 540 - (Math.min(per, dots.length) * sz) / 2 + (i % per + 0.5) * sz, py = 680 + Math.floor(i / per) * sz; x.beginPath(); if (d === '●') { x.arc(px, py, 14, 0, 7); x.fillStyle = '#facc15'; x.fill(); } else if (d === '○') { x.arc(px, py, 13, 0, 7); x.strokeStyle = 'rgba(214,219,232,.75)'; x.lineWidth = 4; x.stroke(); } else { x.arc(px, py, 4, 0, 7); x.fillStyle = 'rgba(214,219,232,.6)'; x.fill(); } });
  x.font = '500 44px system-ui,sans-serif'; x.fillStyle = 'rgba(214,219,232,.85)'; x.fillText(`${D.maxCombo} ${g.maxStreak}`, 540, 1150); x.fillText(seed, 540, 1215);
  x.font = '500 34px system-ui,sans-serif'; x.fillText('playtoday.cloud', 540, 1300);
  c.toBlob((bl) => { const a = document.createElement('a'); a.href = URL.createObjectURL(bl); a.download = `sort-rail-${seed}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); S.evlog.push({ k: 'png' }); }, 'image/png'); });
let tt = 0; function toast(s) { const t = $('toast'); t.textContent = s; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 1300); }
// ---- render (DOM) ----
const pc = $('parcel'), psym = $('p-sym'), pdl = $('p-dl');
function render(now) {
  const G = g.phase === 'ready' ? 0 : gt(now), left = g.phase === 'ready' ? SR.DUR : Math.max(0, SR.DUR - G);
  $('h-time').textContent = Math.ceil(left / 1000); $('h-bar').style.width = (100 * left) / SR.DUR + '%'; $('h-time').parentNode.classList.toggle('warn', g.phase !== 'ready' && left <= 10000 && left > 0);
  $('h-n').textContent = g.correct; $('h-score').textContent = g.score; $('h-combo').textContent = `${g.streak} ×${mult(g.streak)}`;
  const p = g.cur, live = p && (g.phase === 'wait' || g.phase === 'fx') && G >= p.s && !(p.notice && notice);
  // rule strip (pictures): R-A always, R-B after its notice
  $('rule-b').hidden = !(g.noticeDone || (p && p.k > SR.RB));
  if (!p || g.phase === 'ready') { pc.hidden = true; rails.forEach((r, i) => { r.querySelector('i').textContent = ''; r.setAttribute('aria-label', D.lanes.split(',')[i]); }); return; }
  const lk = p.lanes.join();
  if (lk !== lastLanes) { if (lastLanes) flashUntil = now + 150; lastLanes = lk; rails.forEach((r, i) => { const s = r.querySelector('i'); s.textContent = SYMS[p.lanes[i]]; s.style.color = COL[p.lanes[i]]; r.setAttribute('aria-label', `${D.lanes.split(',')[i]} ${SYMS[p.lanes[i]]}`); }); }
  document.getElementById('rails').classList.toggle('flash', now < flashUntil);
  if (g.phase === 'wait' && shownK !== p.k && G >= p.s) { shownK = p.k; rails.forEach((r) => r.classList.remove('ok', 'bad')); $('fb').className = 'fb'; $('fb').textContent = ''; pc.classList.remove('in'); void pc.offsetWidth; if (motion()) pc.classList.add('in'); }
  pc.hidden = !live || (g.phase === 'fx' && now > fxUntil);
  if (live) {
    psym.textContent = SYMS[p.sym]; psym.style.color = COL[p.color]; pc.classList.toggle('bang', !!p.bang);
    const rem = g.phase === 'wait' ? Math.max(0, Math.min(1, (p.D - G) / p.dl)) : 0; pdl.style.width = rem * 100 + '%';
    pc.setAttribute('aria-label', `${SYMS[p.sym]}${p.bang ? ' !' : ''}`);
  }
  $('tut').hidden = !(g.phase === 'wait' && p.k === 1 && G >= p.s && G < 1000);
}
// ---- frame loop: notice freeze, advance, commit feedback, result ----
let lastF = 0;
function frame(now) {
  requestAnimationFrame(frame);
  if (FPS && now - lastF < 1000 / FPS - 0.5) return; lastF = now; W.frames++; if (W.ft.length < 4000) W.ft.push(now);
  if (g.phase !== 'ready' && g.phase !== 'end') {
    if (notice && !paused) { notice.left -= now - notice.last; notice.last = now; if (notice.left <= 0) { S.evlog.push({ k: 'notice-end', at: now, G: gt(now) }); notice = null; $('note').hidden = true; thaw(now); } }
    if (frozen === null) {
      const G = gt(now), p = g.cur;
      advance(g, G); react(now);
      const c = g.cur;
      if (c && c.notice && !g.noticeDone && g.phase === 'wait' && G >= c.s) {   // R-B notice: clock frozen exactly at parcel 25's logical start
        g.noticeDone = true; freeze(T0 + P + c.s); notice = { left: SR.NOTICE, last: now }; $('note').hidden = false; S.evlog.push({ k: 'notice', at: now, s: c.s, G: gt(now) });
      }
      void p;
    }
    if (g.phase === 'end' && $('res').hidden) { render(now); showResult(); return; }
  }
  render(now);
}
requestAnimationFrame(frame);
S.ready = true;
