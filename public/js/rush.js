// Gate Rush v4 browser renderer + UI. Logic lives in rush-core.js.
import * as G from './rush-core.js';
import { rushCard, saveCanvas, shareOrCopy, copyText } from './card.js';
import { api } from './net.js';
import { track, stageBucket } from './track.js';
// 1024-21: anonymous server-side funnel (gev.js, game_events); never throws
const gv = (n, d) => { try { window.gev && window.gev(n, Object.assign({ g: 'rush' }, d)); } catch (e) {} };

const KEY = 'gate-rush-v3';
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmt = (s, v) => String(s).replace(/\{(\w+)\}/g, (_, k) => (k in v ? v[k] : ''));

function loadSave() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(KEY)); } catch {}
  if (!s || s.version !== 3) {
    s = { version: 3, best: 0, bestStage: 0, run: null, assist: false };
    try { const v2 = JSON.parse(localStorage.getItem('gate-rush-v2')); if (v2 && Number.isFinite(v2.best)) s.best = Math.max(0, v2.best | 0); if (v2 && Number.isInteger(v2.bestStage)) s.bestStage = Math.max(0, v2.bestStage); } catch {}
  }
  return s;
}
const store = (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} };

export function mountRush(root, { D, lang, seed, challenge, capture, landing }) {
  const g = D.game;
  const save = loadSave();
  let assist = !capture && !!save.assist;
  seed = seed || today();
  // resume: same seed & unfinished → restart that sector (no score duplication)
  let run;
  if (!challenge && save.run && save.run.seed === seed && save.run.state !== 'lost') {
    run = G.createRun({ seed, stage: save.run.stage, mods: save.run.mods, score: save.run.score });
    run.history = save.run.history || [];
    run.assist = !!save.run.assist;
    if (save.run.state === 'upgrade') run.state = 'upgrade';
  } else run = G.createRun({ seed });
  run.assist = run.assist || assist;

  root.innerHTML = `<div class="gamebox" tabindex="0" aria-label="${g.name}"><canvas aria-label="${g.controls[0]}"></canvas>
  <div class="ghud"><span>${g.troops}<b data-h="power">20</b></span><span>${g.sector}<b data-h="stage">1</b></span><span>${g.score}<b data-h="score">0</b></span></div>
  <div class="gover" data-ov><div class="gmodal" role="dialog" aria-live="polite"></div></div></div>
  ${capture ? '' : `<label class="gtoggle"><input type="checkbox" data-assist ${assist ? 'checked' : ''}> ${g.slow}</label><p class="muted" style="text-align:center">${g.assistNote}</p>`}`;
  const box = root.querySelector('.gamebox'), cv = box.querySelector('canvas'), ctx = cv.getContext('2d');
  const ov = box.querySelector('[data-ov]'), modal = ov.firstElementChild;
  const hud = Object.fromEntries([...box.querySelectorAll('[data-h]')].map((e) => [e.dataset.h, e]));
  let W = 360, H = 640, dpr = 1, paused = false, fx = [], parts = [], shake = 0, slow = 0, last = 0, lastSync = '';
  const persist = () => {
    save.run = { seed: run.seed, stage: run.stage, mods: run.mods, score: run.state === 'running' ? run.stageScore : run.score, state: run.state === 'running' ? 'ready' : run.state, history: run.history, assist: run.assist };
    save.assist = assist; store(save);
  };

  function resize() {
    if (capture) { W = 1080; H = 1920; dpr = 1; cv.width = W; cv.height = H; return; }
    const b = cv.getBoundingClientRect(); W = b.width || 360; H = b.height || 640;
    dpr = Math.min(devicePixelRatio || 1, 2); cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  addEventListener('resize', resize); resize();
  const S = () => (capture ? 2.6 : Math.min(W / 400, 1.4)); // ui scale

  // ---------- overlay screens ----------
  const btn = (label, cls, fn) => { const b = document.createElement('button'); b.className = 'btn ' + (cls || ''); b.textContent = label; b.onclick = fn; return b; };
  function show(html, buttons = []) {
    modal.innerHTML = html; const st = document.createElement('div'); st.className = 'stack';
    buttons.forEach((b) => st.append(b)); modal.append(st); ov.hidden = false;
    if (capture && buttons.length) setTimeout(() => buttons.at(-1).click(), 600);
  }
  function screenReady() {
    const tgt = challenge ? `<p class="tag">${fmt(g.target, challenge)}</p>` : '';
    show(`${challenge ? `<h2>${g.challengeTitle}</h2>` : ''}${tgt}<h2>${fmt(g.readyTitle, { stage: run.stage })}</h2><p>${fmt(g.readyDesc, { boss: G.boss(run) })}</p><p class="muted">${g.zones[G.zoneOf(run.stage) - 1]} · ${g.seedLabel} ${run.seed}</p>`,
      [btn(g.start, '', start)]);
    if (challenge || landing) modal.querySelector('.btn')?.focus({ preventScroll: true });
  }
  function screenUpgrade() {
    const next = run.stage + 1, P0 = G.patternsFor(run.stage), P1 = G.patternsFor(next);
    const np = ['A', 'B', 'C', 'D', 'E', 'F'].filter((k) => P1[k] && !P0[k]).map((k) => g.patName[k]);
    const b = run.choices.map((k) => { const x = btn('', 'ghost', () => { G.chooseUpgrade(run, k); persist(); screenReadyNext(); }); x.innerHTML = `${g.upg[k].n} <small>${g.upg[k].d}</small>`; return x; });
    show(`<span class="tag">SECTOR CLEAR</span><h2>${fmt(g.clearTitle, { stage: run.stage })}</h2><p>${fmt(g.nextInfo, { stage: next, boss: G.bossDefense(next) })}</p>${np.length ? `<p class="muted">${fmt(g.newPattern, { p: np.join(', ') })}</p>` : ''}<p>${g.choose}</p><div class="upg"></div>`, []);
    modal.querySelector('.upg').append(...b);
    if (capture) setTimeout(() => b[0].click(), 600);
  }
  function screenReadyNext() { run.state = 'ready'; screenReady(); }
  function record() { return { seed: run.seed, stage: run.stage, cleared: run.stage - 1, score: run.score, mods: { ...run.mods }, history: run.history, assist: run.assist, zone: g.zones[G.zoneOf(run.stage) - 1] }; }
  function screenLost() {
    const rec = record();
    if (!run.assist) { save.best = Math.max(save.best, rec.score); save.bestStage = Math.max(save.bestStage, rec.cleared); }
    persist();
    const beat = challenge && (rec.stage > challenge.stage || (rec.stage === challenge.stage && rec.score > challenge.score));
    const status = document.createElement('p'); status.className = 'status'; status.setAttribute('role', 'status');
    let busy = false;
    const showUrl = (url, prefix = '') => {
      status.textContent = prefix ? `${prefix}: ` : '';
      const a = document.createElement('a'); a.href = url; a.textContent = url; a.target = '_blank'; a.rel = 'noopener';
      status.append(a);
    };
    const shareUrl = async () => {
      let id = null;
      try { const r = await api('/api/share', { method: 'POST', body: { kind: 'rush', lang, payload: { seed: run.seed, stage: rec.stage, score: rec.score, assist: rec.assist } } }); id = r.id; } catch {}
      if (rec.assist) return id ? `${location.origin}/${lang}/r/${id}` : location.href;
      return `${location.origin}/${lang}/c/${run.seed}-1${id ? `?vs=${id}` : ''}`;
    };
    const buttons = [
      btn(D.cta.save, 'ghost', async () => saveCanvas(await rushCard(D, rec), `gate-rush-${rec.stage}.png`)),
      btn(D.cta.share, 'ghost', async () => {
        track('share_click', { from: 'rush' }); gv('share_click');
        if (busy) return; busy = true;
        try {
          const url = await shareUrl();
          // show the link right away: the native share sheet (desktop Chrome/macOS) can stay pending indefinitely
          showUrl(url);
          const r = await shareOrCopy({ title: g.name, text: fmt(g.shareText, { stage: rec.cleared, url }), canvas: await rushCard(D, rec), name: 'gate-rush.png' });
          { const rr = r === 'shared' ? 'shared' : r === 'copied' ? 'copied' : r === 'failed' ? 'failed' : 'cancel'; track('share_result', { from: 'rush', r: rr }); gv('share_result', { via: rr }); }
          showUrl(url, r === 'failed' ? D.common.error : r === 'copied' ? D.common.copied : '');
        } finally { busy = false; }
      }),
    ];
    if (!rec.assist) buttons.push(btn(g.challenge, '', async () => {
      if (busy) return; busy = true;
      try {
        const url = await shareUrl();
        showUrl(url);
        // native share sheet first (1 tap on mobile); fall back to copying the link
        if (navigator.share) {
          try {
            track('challenge_copy', { method: 'native' });
            await navigator.share({ title: g.challengeTitle, text: fmt(g.challengeShareText, { stage: rec.cleared, score: rec.score.toLocaleString(), url }) });
            track('share_result', { from: 'rush', r: 'shared', k: 'challenge' }); gv('share_result', { via: 'shared', k: 'challenge' });
            return;
          } catch (e) { if (e.name === 'AbortError') { track('share_result', { from: 'rush', r: 'cancel', k: 'challenge' }); gv('share_result', { via: 'cancel', k: 'challenge' }); return; } }
        } else track('challenge_copy', { method: 'copy' });
        const okc = await copyText(url);
        track('share_result', { from: 'rush', r: okc ? 'copied' : 'failed', k: 'challenge' }); gv('share_result', { via: okc ? 'copied' : 'failed', k: 'challenge' });
        showUrl(url, okc ? D.common.copied : '');
      } finally { busy = false; }
    }));
    buttons.push(btn(g.newRun, 'ghost', () => { run = G.createRun({ seed: run.seed }); run.assist = assist; persist(); screenReady(); }));
    show(`<span class="tag">${rec.assist ? 'ASSIST' : 'GAME OVER'}</span><h2>${g.lostTitle}</h2><p style="font-size:30px;font-weight:800;margin:6px 0">${g.sector} ${rec.stage}</p><p>${fmt(g.lostDesc, { stage: rec.cleared, score: rec.score.toLocaleString() })}</p>${beat ? `<p class="tag">${g.beat}</p>` : ''}<p class="muted">${g.best}: ${save.bestStage} · ${save.best.toLocaleString()}</p><p class="muted" data-share-hint>${g.shareHint}</p>`, buttons);
    modal.append(status);
  }
  function start() { if (run.stage === 1) { track('play_start', { mode: challenge ? 'challenge' : 'daily' }); gv('play_start', { from: challenge ? 'c' : 'direct' }); } G.startStage(run); wasRunning = true; ov.hidden = true; fx = []; parts = []; box.focus({ preventScroll: true }); persist(); }

  // ---------- input ----------
  const keys = {};
  box.addEventListener('keydown', (e) => { if (['ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault(); keys[e.key.toLowerCase()] = true; });
  addEventListener('keydown', (e) => { if (document.activeElement === document.body && ['ArrowLeft', 'ArrowRight'].includes(e.key) && run.state === 'running') { e.preventDefault(); keys[e.key.toLowerCase()] = true; } });
  addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
  let drag = false;
  const ptr = (e) => { const b = cv.getBoundingClientRect(); run.target = Math.max(-0.92, Math.min(0.92, (e.clientX - b.left - b.width / 2) / (b.width * 0.39))); };
  cv.addEventListener('pointerdown', (e) => { drag = true; cv.setPointerCapture(e.pointerId); ptr(e); });
  cv.addEventListener('pointermove', (e) => { if (drag) ptr(e); });
  cv.addEventListener('pointerup', () => (drag = false)); cv.addEventListener('pointercancel', () => (drag = false));
  document.addEventListener('visibilitychange', () => {
    for (const k in keys) keys[k] = false; drag = false;
    if (document.hidden && run.state === 'running' && !paused) {
      paused = true; show(`<h2>${g.paused}</h2><p>${g.pausedDesc}</p>`, [btn(g.resume, '', () => { paused = false; ov.hidden = true; last = 0; })]);
    }
  });
  root.querySelector('[data-assist]')?.addEventListener('change', (e) => { assist = e.target.checked; if (run.state !== 'running') run.assist = assist || run.assist && run.state !== 'ready'; if (run.state === 'ready' && run.stage === 1) run.assist = assist; persist(); });

  // ---------- drawing ----------
  const proj = (lane, z) => { const d = Math.max(0, Math.min(1, z)), s = 0.1 + 0.9 * d * d; return { x: W / 2 + lane * W * 0.43 * s, y: H * 0.23 + H * 0.65 * d * d, s }; };
  const crowdX = () => W / 2 + run.x * W * 0.28;
  const poly = (pts, c) => { ctx.fillStyle = c; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(...p) : ctx.moveTo(...p))); ctx.closePath(); ctx.fill(); };
  const font = (px, w = 800) => `${w} ${px}px -apple-system,"SF Pro",system-ui,sans-serif`;
  const city = (() => { const r = G.rng(642); return Array.from({ length: 36 }, (_, i) => ({ x: r(), h: 30 + r() * 0.22, w: 14 + r() * 30, i })); })();
  function burst(color, n = 28, x = crowdX(), y = H * 0.79) { if (parts.length > 300) return; for (let i = 0; i < n; i++) parts.push({ x, y, vx: (Math.random() - 0.5) * 320 * S(), vy: -Math.random() * 320 * S(), life: 0.7 + Math.random() * 0.4, color }); }

  function drawScene(t, zoom) {
    const z = G.zoneOf(run.stage), hue = [190, 200, 260, 30, 350, 230, 280, 320][z - 1];
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, `hsl(${hue},55%,9%)`); sky.addColorStop(0.6, `hsl(${hue + 20},38%,26%)`); sky.addColorStop(1, '#0b1428');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#9ae9f6'; ctx.shadowColor = '#9ae9f6'; ctx.shadowBlur = 30; ctx.beginPath(); ctx.arc(W * 0.76, H * 0.12, 22 * S(), 0, 7); ctx.fill(); ctx.shadowBlur = 0;
    for (const b of city) { const bh = b.h * H; ctx.fillStyle = b.i % 2 ? '#142039' : '#202a49'; ctx.fillRect(b.x * W, H * 0.3 - bh, b.w * S(), bh); ctx.fillStyle = `hsla(${hue},90%,65%,.45)`; for (let j = 0; j < 4; j++) ctx.fillRect(b.x * W + 5, H * 0.3 - bh + 8 + j * 15, 3, 4); }
    poly([[W * 0.43, H * 0.23], [W * 0.57, H * 0.23], [W * 1.15, H], [W * -0.15, H]], '#1d2140');
    for (const lane of [-1, 1]) { const a = proj(lane, 0), b = proj(lane, 1.1); ctx.strokeStyle = '#42deed'; ctx.shadowColor = '#42deed'; ctx.shadowBlur = 10; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.shadowBlur = 0; }
    const spd = G.speedAt(run.stage, t);
    for (let i = 0; i < 18; i++) {
      const zz = (i / 18 + t * 0.15 * spd) % 1, a = proj(0, zz), b = proj(0, Math.min(1, zz + 0.025));
      ctx.strokeStyle = '#c8ceef66'; ctx.lineWidth = 2 * a.s; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      for (const side of [-1, 1]) { const p = proj(side * 1.18, zz); ctx.fillStyle = '#1b2344'; ctx.fillRect(p.x - 3 * p.s, p.y - 50 * p.s * S(), 6 * p.s, 50 * p.s * S()); ctx.fillStyle = `hsl(${hue + 120},90%,72%)`; ctx.fillRect(p.x - 8 * p.s, p.y - 50 * p.s * S(), 16 * p.s, 4 * p.s); }
    }
  }
  function drawGate(e, z, dim) {
    const p = proj(0, z), gw = W * 0.37 * p.s, gh = 76 * p.s * S();
    for (const [side, gt] of [[-1, e.left], [1, e.right]]) {
      const xx = p.x + side * W * 0.215 * p.s, bad = gt.op === '-' || (gt.op === 'risk');
      const col = gt.op === '-' ? '#ff5a7a' : gt.op === 'risk' ? '#facc15' : gt.op === 'x' ? '#b79aff' : '#5cf2ff';
      ctx.globalAlpha = dim; ctx.shadowBlur = 16 * p.s; ctx.shadowColor = col;
      ctx.fillStyle = gt.op === '-' ? '#5a1830dd' : gt.op === 'risk' ? '#4a3a08dd' : gt.op === 'x' ? '#3a2777dd' : '#08506add';
      ctx.fillRect(xx - gw / 2, p.y - gh, gw, gh); ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, 3 * p.s); ctx.strokeRect(xx - gw / 2, p.y - gh, gw, gh); ctx.shadowBlur = 0;
      if (gt.op === '-') { ctx.fillStyle = '#ff5a7a'; ctx.fillRect(xx - gw / 2, p.y - gh, gw, 5 * p.s); }
      ctx.fillStyle = '#fff'; ctx.font = font(Math.max(10, (gt.op === 'risk' ? 24 : 36) * p.s * S())); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(G.gateLabel(gt), xx, p.y - gh * 0.5); ctx.textBaseline = 'alphabetic'; ctx.globalAlpha = 1;
      if (bad && gt.op === '-') { ctx.fillStyle = '#ffd0d8'; ctx.font = font(Math.max(9, 16 * p.s * S())); ctx.fillText('!', xx + gw / 2 - 10 * p.s, p.y - gh + 18 * p.s); }
    }
  }
  function drawBarrier(e, z) {
    const p = proj(e.lane * 0.52, z), sz = 46 * p.s * S();
    poly([[p.x - sz, p.y], [p.x + sz, p.y], [p.x + sz * 0.8, p.y - sz], [p.x - sz * 0.8, p.y - sz]], '#d83761');
    ctx.strokeStyle = '#ffd0d8'; ctx.lineWidth = 2 * p.s; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(p.x + k * sz * 0.35, p.y); ctx.lineTo(p.x + k * sz * 0.35 + sz * 0.3, p.y - sz); ctx.stroke(); }
    ctx.fillStyle = '#fff'; ctx.font = font(Math.max(10, 20 * p.s * S())); ctx.textAlign = 'center'; ctx.fillText('−' + G.barrierDamage(run.stage), p.x, p.y - sz * 0.35);
  }
  function drawCrowd(t) {
    const n = Math.min(70, Math.max(1, Math.ceil(run.power / 8))), cx = crowdX(), sc = 0.7 * S();
    for (let i = n - 1; i >= 0; i--) {
      const row = Math.floor(i / 7), col = i % 7, px = cx + ((col - 3) * 12 + (row % 2) * 5) * S(), py = H * 0.8 + row * 7 * S() + Math.sin(t * 18 + i) * 1.7;
      ctx.fillStyle = '#0005'; ctx.beginPath(); ctx.ellipse(px + 2 * sc, py + 9 * sc, 8 * sc, 3 * sc, 0, 0, 7); ctx.fill();
      ctx.fillStyle = i % 5 ? '#24c8ed' : '#b18cff'; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 6; ctx.fillRect(px - 6 * sc, py - 9 * sc, 12 * sc, 14 * sc); ctx.shadowBlur = 0;
      ctx.fillStyle = '#b3f5ff'; ctx.beginPath(); ctx.arc(px, py - 14 * sc, 5 * sc, 0, 7); ctx.fill();
    }
    ctx.fillStyle = '#101b36e6'; ctx.beginPath(); ctx.roundRect(cx - 36 * S(), H * 0.735 - 22 * S(), 72 * S(), 28 * S(), 10 * S()); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = font(17 * S()); ctx.fillText(String(run.power), cx, H * 0.735 - 2 * S());
  }
  function drawBoss(t) {
    if (t < 25) return;
    const z = Math.min(1, (t - 25) / 5), p = proj(0, z), b = G.boss(run), win = run.power >= b;
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.s * S(), p.s * S()); ctx.shadowColor = '#ff587e'; ctx.shadowBlur = 30;
    poly([[-70, 0], [-80, -100], [-45, -132], [45, -132], [80, -100], [70, 0]], win ? '#4a6196' : '#742c5b'); ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffdf81'; ctx.fillRect(-44, -88, 28, 12); ctx.fillRect(16, -88, 28, 12);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = font(30); ctx.fillText(String(b), 0, -146); ctx.restore();
  }
  function drawAttacks(t) {
    const cx = (lane) => W / 2 + lane * G.LANE * W * 0.28;
    for (const a of run.attacks) {
      if (a.state === 'pending' || a.state === 'done') continue;
      if (a.type === 'A' || a.type === 'F' || a.type === 'E') {
        const lanes = a.type === 'E' ? [[a.lane, a.hit, a.state === 'warned'], [a.lane2, a.hit2, true]] : [[a.lane, a.hit, true]];
        for (const [lane, hit, live] of lanes) {
          if (!live) continue;
          const left = hit - t, px = cx(lane), col = a.type === 'F' ? '#ff8a3d' : '#ff5a5f';
          ctx.fillStyle = col + '33'; ctx.beginPath(); ctx.ellipse(px, H * 0.8, W * 0.2, H * 0.05, 0, 0, 7); ctx.fill();
          ctx.strokeStyle = col; ctx.lineWidth = 3 * S(); ctx.setLineDash([10 * S(), 7 * S()]);
          ctx.beginPath(); ctx.moveTo(W / 2, H * 0.2); ctx.lineTo(px, H * 0.8); ctx.stroke(); ctx.setLineDash([]);
          ctx.beginPath(); ctx.ellipse(px, H * 0.8, W * 0.2 * Math.max(0.15, left / 2), H * 0.05 * Math.max(0.15, left / 2), 0, 0, 7); ctx.stroke();
          ctx.fillStyle = '#fff'; ctx.font = font(44 * S(), 900); ctx.textAlign = 'center'; ctx.fillText(String(Math.max(1, Math.ceil(left))), px, H * 0.68);
          ctx.font = font(22 * S()); ctx.fillText(a.type === 'F' ? '☠' : '▼', W / 2, H * 0.19);
        }
      } else if (a.type === 'B') {
        const p0 = proj(a.lane * 0.5, 0.55), p1 = proj(a.lane * 0.5, 1.05), wv = W * 0.2;
        ctx.save(); ctx.globalAlpha = 0.55 + 0.35 * Math.sin(t * 20); ctx.fillStyle = '#ff2d55';
        for (let k = 0; k < 8; k++) { const y = p0.y + (p1.y - p0.y) * (k / 8); ctx.fillRect(p1.x - wv + (k % 2) * 12, y, wv * 2, (p1.y - p0.y) / 16); }
        ctx.restore(); ctx.fillStyle = '#fff'; ctx.font = font(30 * S(), 900); ctx.textAlign = 'center'; ctx.fillText('⚠ ' + Math.max(0, a.hit - t).toFixed(1), p1.x, p0.y - 6);
      } else if (a.type === 'C') {
        const blink = t < a.start, k = Math.max(0, Math.min(1, (t - a.start) / a.sweep)), from = a.dir === 1 ? -1 : 1;
        const xx = blink ? W / 2 + from * W * 0.3 : W / 2 + (from + 2 * k * a.dir) * W * 0.3;
        ctx.save(); ctx.globalAlpha = blink ? 0.4 + 0.6 * (Math.sin(t * 30) > 0) : 1;
        ctx.strokeStyle = '#ff3df2'; ctx.shadowColor = '#ff3df2'; ctx.shadowBlur = 24; ctx.lineWidth = (blink ? 3 : 9) * S();
        ctx.beginPath(); ctx.moveTo(xx, H * 0.55); ctx.lineTo(xx, H * 0.95); ctx.stroke(); ctx.restore();
        ctx.fillStyle = '#fff'; ctx.font = font(28 * S(), 900); ctx.textAlign = 'center'; ctx.fillText(a.dir === 1 ? '⇢' : '⇠', W / 2, H * 0.52);
      } else if (a.type === 'D' && t < a.hit) {
        ctx.fillStyle = 'rgba(255,40,80,.25)'; ctx.fillRect(0, 0, W, H * 0.16);
        ctx.fillStyle = '#fff'; ctx.font = font(46 * S(), 900); ctx.textAlign = 'center'; ctx.fillText(capture ? '⚠ ⚠ ⚠' : '⚠ AMBUSH', W / 2, H * 0.11);
      }
    }
  }
  function drawFx(dt, t) {
    for (const p of parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 420 * dt; ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, 4 * S(), 6 * S()); }
    ctx.globalAlpha = 1; parts = parts.filter((p) => p.life > 0);
    for (const f of fx) {
      f.life -= dt; const k = 1 - f.life / f.max, sc = 1 + 0.4 * Math.sin(Math.min(1, k * 2.5) * Math.PI);
      ctx.globalAlpha = Math.max(0, Math.min(1, f.life * 3)); ctx.fillStyle = f.color; ctx.textAlign = 'center';
      ctx.font = font(f.size * sc * S(), 900); ctx.shadowColor = '#000'; ctx.shadowBlur = 8; ctx.fillText(f.text, f.x, f.y - k * 40 * S()); ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1; fx = fx.filter((f) => f.life > 0);
    if (run.flash > 0) { ctx.fillStyle = `rgba(255,90,120,${run.flash * 0.45})`; ctx.fillRect(0, 0, W, H); run.flash -= dt; }
  }
  function drawHudCanvas(t) {
    // language-free HUD (capture mode + always: timer bar)
    ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(0, 0, W, 6 * S());
    const gr = ctx.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, '#6366f1'); gr.addColorStop(1, '#22d3ee');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W * Math.min(1, t / 30), 6 * S());
    if (!capture) return;
    ctx.fillStyle = '#fff'; ctx.font = font(64, 900); ctx.textAlign = 'left'; ctx.fillText('◆ ' + run.stage, 40, 110);
    ctx.textAlign = 'right'; ctx.fillText(String(Math.max(0, Math.ceil(30 - t))), W - 40, 110);
    ctx.textAlign = 'center'; ctx.font = font(88, 900); ctx.fillText(String(run.power), W / 2, 130);
  }
  function handleEvents() {
    for (const ev of run.events.splice(0)) {
      const cx = crowdX();
      if (ev.kind === 'gate') { const up = ev.after >= ev.before; fx.push({ text: `${ev.before} → ${ev.after}`, x: cx, y: H * 0.66, color: up ? '#5cf2ff' : '#ff7a90', size: 34, life: 0.9, max: 0.9 }); burst(up ? '#22d3ee' : '#ff527a', up ? Math.min(60, 10 + (ev.after - ev.before) / 2) : 20); }
      else if (ev.kind === 'hit') { run.flash = 0.5; fx.push({ text: '−' + ev.loss, x: cx, y: H * 0.68, color: '#ff7a90', size: 40, life: 0.9, max: 0.9 }); burst('#ff527a', 30); }
      else if (ev.kind === 'dodge') { fx.push({ text: (ev.add ? '+' + ev.add : '') + (ev.close ? '  ' + (capture ? '!' : g.close) : ''), x: cx, y: H * 0.68, color: '#4ade80', size: ev.close ? 44 : 30, life: 0.8, max: 0.8 }); burst('#4ade80', 18); if (ev.close && !reduced()) slow = 0.3; }
      else if (ev.kind === 'warn' && ev.type === 'D') { if (!reduced()) shake = 0.4; }
      else if (ev.kind === 'win' || ev.kind === 'lose') { const d = ev.power - ev.boss; fx.push({ text: (d >= 0 ? '+' : '−') + Math.abs(d), x: W / 2, y: H * 0.45, color: d >= 0 ? '#4ade80' : '#ff7a90', size: 72, life: 1.2, max: 1.2 }); }
    }
  }
  function sync() {
    const s = `${run.power}|${run.stage}|${run.score}`;
    if (s === lastSync) return; lastSync = s;
    hud.power.textContent = run.power; hud.stage.textContent = run.stage; hud.score.textContent = Math.floor(run.score).toLocaleString();
  }
  // capture-mode autopilot (trailer/screenshot recording only): best gate, dodge warned lanes
  function autopilot() {
    const t = run.t;
    const threat = run.attacks.find((a) => (a.state === 'warned' || a.state === 'half') && ['A', 'E', 'F'].includes(a.type) && a.hit - t < 1.6);
    if (threat) { const lane = threat.state === 'half' ? threat.lane2 : threat.lane; run.target = lane > 0 ? -0.75 : 0.75; return; }
    const mine = run.attacks.find((a) => a.type === 'B' && a.state === 'warned');
    const next = run.course.find((e) => !e.done && e.time > t);
    if (!next) return;
    if (next.type === 'gate') {
      const l = G.applyGate(run.power, next.left, run.stage, run.mods), r = G.applyGate(run.power, next.right, run.stage, run.mods);
      run.target = l >= r ? -0.6 : 0.6;
    } else run.target = next.lane > 0 ? -0.6 : 0.6;
    if (mine) run.target = mine.lane > 0 ? -0.6 : 0.6;
  }
  let wasRunning = false, endTimer = 0, fpsN = 0, fpsT = 0;
  function frame(now) {
    let dt = Math.min((now - last) / 1000 || 0, 0.04); last = now;
    fpsN++; fpsT += dt; if (fpsT > 2) { window.__gameFps = fpsN / fpsT; fpsN = 0; fpsT = 0; }
    let gdt = dt * (run.assist ? 0.8 : 1);
    if (slow > 0) { slow -= dt; gdt *= 0.35; }
    if (run.state === 'running' && !paused) {
      if (capture) autopilot();
      if (keys.arrowleft || keys.a) run.target -= dt * 2.6;
      if (keys.arrowright || keys.d) run.target += dt * 2.6;
      let left = gdt; while (left > 0 && run.state === 'running') { const d = Math.min(0.02, left); G.step(run, d); left -= d; }
      handleEvents();
    }
    if (wasRunning && run.state !== 'running' && run.state !== 'ready') { wasRunning = false; endTimer = 1.1; }
    if (run.state !== 'running' && endTimer > 0) {
      endTimer -= dt; handleEvents();
      if (endTimer <= 0) { persist(); track('play_end', { stage: stageBucket(run.stage), result: run.state === 'upgrade' ? 'clear' : 'lost' }); run.state === 'upgrade' ? screenUpgrade() : screenLost(); }
    }
    const t = run.t || 0;
    ctx.save();
    if (shake > 0) { shake -= dt; ctx.translate((Math.random() - 0.5) * 14 * S(), (Math.random() - 0.5) * 10 * S()); }
    // boss clash zoom: last 1.5s
    const zoom = !reduced() && run.state === 'running' && t > 28.5 ? 1 + 0.12 * Math.min(1, (t - 28.5) / 1.5) : 1;
    if (zoom > 1) { ctx.translate(W / 2, H * 0.7); ctx.scale(zoom, zoom); ctx.translate(-W / 2, -H * 0.7); }
    drawScene(t);
    if (run.course && run.state !== 'ready') {
      const win = G.reactionWindow(run.stage, t, run.mods), dark = G.patternsFor(run.stage).dark;
      const vis = run.course.filter((e) => !e.done && e.time - t < win && e.time - t > 0).sort((a, b) => b.time - a.time);
      for (const e of vis) { const z = 1 - (e.time - t) / win; e.type === 'gate' ? drawGate(e, z, dark ? Math.min(1, 0.25 + z) : 1) : drawBarrier(e, z); }
      drawBoss(t); drawAttacks(t);
      if (zoom > 1) { const b = G.boss(run); ctx.fillStyle = '#fff'; ctx.font = font(40 * S(), 900); ctx.textAlign = 'center'; ctx.fillText(`${run.power}  vs  ${b}`, W / 2, H * 0.36); }
    }
    drawCrowd(t);
    ctx.restore();
    drawFx(dt, t); drawHudCanvas(t); sync();
    requestAnimationFrame(frame);
  }
  if (run.state === 'upgrade') { run.choices = G.upgradeChoices(run.seed, run.stage, run.mods); screenUpgrade(); } else screenReady();
  requestAnimationFrame(frame);

  // QA hook (§10 B2/B6/B8)
  window.__gameTest = {
    version: 4, get state() { return { state: run.state, t: run.t, stage: run.stage, power: run.power, score: run.score, x: run.x, seed: run.seed, mods: { ...run.mods }, speed: G.speedAt(run.stage, run.t || 0), boss: G.boss(run), reaction: G.reactionWindow(run.stage, run.t || 0, run.mods), assist: run.assist, attacks: (run.attacks || []).map((a) => ({ type: a.type, warnAt: a.warnAt, hit: a.hit, state: a.state })) }; },
    start, step: (sec) => { let l = sec; while (l > 0 && run.state === 'running') { const d = Math.min(0.02, l); G.step(run, d); l -= d; } handleEvents(); },
    steer: (v) => (run.target = v), move: (v) => { run.target = run.x = v; },
    course: (s = run.stage) => G.makeCourse(run.seed, s, run.mods), choices: (s = run.stage) => G.upgradeChoices(run.seed, s, run.mods),
    choose: (k) => { const ok = G.chooseUpgrade(run, k); if (ok) { run.state = 'ready'; persist(); screenReady(); } return ok; },
    speedAt: G.speedAt, bossDefense: G.bossDefense, core: G,
  };
  return { run: () => run };
}
