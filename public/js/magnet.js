// Magnet Harbor UI (prototype, t_1c491685). Inlined after magnet-core.js by scripts/build-magnet.mjs.
/* global MH, createGame, start, step, heights, load, usedCols, cargoX, landX, segAt, windAt, colCenter, record, better, activeSec, replay, simulate, POLICIES, snap */
(() => {
  const T = JSON.parse(document.getElementById('mt').textContent);
  const $ = (s) => document.querySelector(s);
  const LS_SET = 'magnet-harbor-settings', LS_BEST = 'magnet-harbor-best';
  const loadLS = (k, d) => { try { return Object.assign(d, JSON.parse(localStorage.getItem(k) || 'null') || {}); } catch { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const set = loadLS(LS_SET, { sound: true, haptic: true, motion: true });
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => mq.matches || !set.motion;
  const q = new URLSearchParams(location.search);
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const seed = (q.get('seed') || today()).slice(0, 64);
  const W = { sfx: 0, vib: 0, frames: 0, steps: 0 };
  // ---- launch metrics (t_45f1a325): existing Vercel Web Analytics custom events, prop g=magnet. No ids/seeds/scores.
  // QA traffic: ?qa=1 once sets localStorage 'pt-qa'=1 -> every event carries qa='1' (filter it out; ?qa=0 clears).
  if (q.get('qa') === '1') save('pt-qa', 1); else if (q.get('qa') === '0') { try { localStorage.removeItem('pt-qa'); } catch {} }
  const qa = (() => { try { return localStorage.getItem('pt-qa') === '1'; } catch { return false; } })();
  // inflow source (t_05b366b3): only allowlisted ?from= values, else 'unknown'; 'c' = challenge link (kept).
  const from = (() => { const v = q.get('from'); return ['c', 'reddit-webgames', 'itch', 'direct'].includes(v) ? v : 'unknown'; })();
  const ev = (name, data = {}) => {
    const d = { g: 'magnet', from, ...data }; if (qa) d.qa = '1';
    (window.__trackLog = window.__trackLog || []).push({ name, ...d });
    try { if (window.va) window.va('event', { name, data: d }); } catch {}
    try { if (window.gev) window.gev(name, d); } catch {} // own OCI collection (t_287677ef); share_fail is not in v1 and is dropped
  };
  if (!/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && !window.va) { window.va = function () { (window.vaq = window.vaq || []).push(arguments); }; const sc = document.createElement('script'); sc.defer = true; sc.src = '/_vercel/insights/script.js'; document.head.append(sc); }
  let runs = 0;
  const canVib = typeof navigator.vibrate === 'function';

  // ---- audio: WebAudio synth only, created on the first explicit input ----
  let ac = null, hum = null;
  const unlock = () => { if (!ac && set.sound) { const A = window.AudioContext || window.webkitAudioContext; if (A) try { ac = new A(); } catch {} } if (ac && ac.state === 'suspended' && set.sound) ac.resume(); };
  const tone = (f, d, type = 'triangle', v = 0.14, at = 0, f2) => {
    if (!ac || !set.sound) return; const t = ac.currentTime + at, o = ac.createOscillator(), gn = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    gn.gain.setValueAtTime(v, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(gn).connect(ac.destination); o.start(t); o.stop(t + d + 0.02); W.sfx++;
  };
  const splash = () => { if (!ac || !set.sound) return; const n = ac.sampleRate * 0.4, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 2; const s = ac.createBufferSource(), f = ac.createBiquadFilter(), gn = ac.createGain(); f.type = 'lowpass'; f.frequency.value = 900; gn.gain.value = 0.25; s.buffer = b; s.connect(f).connect(gn).connect(ac.destination); s.start(); W.sfx++; };
  const humOn = (on) => {
    if (!ac || !set.sound) on = false;
    if (on && !hum) { const o = ac.createOscillator(), gn = ac.createGain(); o.type = 'sine'; o.frequency.value = 72; gn.gain.value = 0.035; o.connect(gn).connect(ac.destination); o.start(); hum = { o, gn }; W.sfx++; }
    if (!on && hum) { try { hum.o.stop(); } catch {} hum = null; }
  };
  const SFX = {
    release: () => tone(1800, 0.05, 'square', 0.06),
    land: () => tone(110, 0.22, 'sine', 0.3, 0, 60),
    perfect: () => { tone(523.25, 0.3, 'triangle', 0.12); tone(659.25, 0.3, 'triangle', 0.1, 0.03); tone(783.99, 0.35, 'triangle', 0.1, 0.06); },
    fall: () => splash(),
    depart: () => { tone(147, 0.9, 'sawtooth', 0.07); tone(220, 0.9, 'sawtooth', 0.05); },
    tick: () => tone(1200, 0.04, 'square', 0.04),
  };
  const buzz = (ms) => { if (set.haptic && canVib) try { navigator.vibrate(ms); W.vib++; } catch {} };

  // ---- DOM ----
  const cv = $('#cv'), cx = cv.getContext('2d'), play = $('#play');
  const hud = { time: $('#h-time'), ships: $('#h-ships'), tgt: $('#h-tgt'), cols: $('#h-cols'), lives: $('#h-lives') };
  const ready = $('#ready'), res = $('#res'), pz = $('#pz'), toast = $('#toast');
  const touchUi = matchMedia('(hover: none) and (pointer: coarse)').matches;
  $('#r-how').textContent = touchUi ? T.howMobile : T.howDesktop;
  if (!canVib) for (const b of document.querySelectorAll('[data-set="haptic"]')) b.hidden = true; // GDD 9: hide on unsupported devices
  const syncToggles = () => { for (const b of document.querySelectorAll('[data-set]')) { const k = b.dataset.set; b.setAttribute('aria-pressed', String(!!set[k])); b.classList.toggle('off', !set[k]); if (b.dataset.icon) b.textContent = k === 'sound' ? (set[k] ? '🔊' : '🔇') : set[k] ? '📳' : '📴'; } document.body.classList.toggle('rm', reduced()); };
  for (const b of document.querySelectorAll('[data-set]')) b.addEventListener('click', (e) => { e.stopPropagation(); const k = b.dataset.set; set[k] = !set[k]; save(LS_SET, set); if (k === 'sound') { if (set.sound) unlock(); else { humOn(false); if (ac) ac.suspend(); } } syncToggles(); });
  mq.addEventListener && mq.addEventListener('change', syncToggles);
  syncToggles();
  const say = (m) => { toast.textContent = m; toast.classList.add('show'); clearTimeout(say.t); say.t = setTimeout(() => toast.classList.remove('show'), 1600); };
  const fmt = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k]);

  // ---- game state ----
  let g, fx, held = 0, keys = { l: 0, r: 0 }, drag = null, tx = null, pendRel = false, paused = false, countdown = 0, acc = 0, lastT = 0;
  const S = window.__mh = { ready: false, E: { MH, createGame, start, step, replay, simulate, POLICIES, snap, heights, load, usedCols, landX }, W, seed, set, get g() { return g; } };
  function reset() {
    g = createGame(seed); fx = { parts: [], icons: [], shake: 0, flash: 0, departX: 0, lastBlink: -1 };
    tx = null; pendRel = false; drag = null; keys = { l: 0, r: 0 }; held = 0; paused = false; countdown = 0;
    res.hidden = true; pz.hidden = true; ready.hidden = false; humOn(false); renderHud(); draw();
    S.armed = false; S.evlog = []; S.blinkSeen = false;
  }
  function begin() { // explicit start only: [start] button, Space, Enter
    if (g.phase !== 'ready') return; unlock(); start(g); ready.hidden = true; S.armed = true; runs++; if (runs > 1) ev('play_again'); ev('play_start'); // again1+start1 per restart, same as orbit/echo (PO t_287677ef) lastT = performance.now(); acc = 0; S.tStart = lastT;
  }
  $('#b-start').addEventListener('click', (e) => { e.stopPropagation(); begin(); });

  // ---- input: drag anywhere (relative), release = drop; ←/→ + Space ----
  const cellPx = () => cv.clientWidth / MH.W;
  const live = () => g.phase === 'play' || g.phase === 'depart';
  play.addEventListener('pointerdown', (e) => {
    if (e.target.closest('[data-ui]') || !live() || paused || countdown) return;
    unlock(); drag = { id: e.pointerId, x0: e.clientX, c0: g.crane.x }; tx = g.crane.x;
    try { play.setPointerCapture(e.pointerId); } catch {}
    e.preventDefault();
  });
  play.addEventListener('pointermove', (e) => { if (!drag || e.pointerId !== drag.id) return; tx = Math.max(0, Math.min(MH.W, drag.c0 + (e.clientX - drag.x0) / cellPx())); });
  play.addEventListener('pointerup', (e) => { if (!drag || e.pointerId !== drag.id) return; drag = null; pendRel = true; S.lastInput = 'pointerup'; });
  const cancel = (e) => { if (drag && e.pointerId === drag.id) { drag = null; S.cancels = (S.cancels || 0) + 1; } }; // drag ends, cargo stays (GDD 8)
  play.addEventListener('pointercancel', cancel); play.addEventListener('lostpointercapture', cancel);
  addEventListener('keydown', (e) => {
    if (e.repeat) { if (e.code === 'Space' || e.code === 'Enter') e.preventDefault(); return; } // auto-repeat ignored
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      if (g.phase === 'ready') return begin();
      if (g.phase === 'result') return e.code === 'Enter' && again();
      if (paused) return resume();
      if (e.code === 'Space' && live() && !countdown) { pendRel = true; S.lastInput = 'space'; }
      return;
    }
    if (e.code === 'ArrowLeft') { keys.l = 1; e.preventDefault(); } else if (e.code === 'ArrowRight') { keys.r = 1; e.preventDefault(); } else if (e.code === 'KeyP' || e.code === 'Escape') { if (live()) paused ? resume() : pause(); }
  });
  addEventListener('keyup', (e) => { if (e.code === 'ArrowLeft') keys.l = 0; if (e.code === 'ArrowRight') keys.r = 0; });

  // ---- pause (button, hidden tab) — active time and auto drop stop; resume with a 3 s countdown ----
  function pause() { if (!live() || paused) return; paused = true; countdown = 0; drag = null; humOn(false); pz.hidden = false; $('#pz-n').textContent = ''; S.pauses = (S.pauses || 0) + 1; }
  function resume() { if (!paused) return; paused = false; pz.hidden = true; countdown = 3 * 60; lastT = performance.now(); }
  $('#b-pause').addEventListener('click', (e) => { e.stopPropagation(); paused ? resume() : pause(); });
  $('#pz').addEventListener('click', (e) => { e.stopPropagation(); resume(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

  // ---- events from the core → sound / haptic / fx ----
  function onEvents() {
    for (const e of g.events.splice(0)) {
      S.evlog.push(e);
      if (e.k === 'release') { SFX.release(); }
      else if (e.k === 'land') { if (e.perfect) { SFX.perfect(); buzz(25); fx.flash = e.mult > 1 ? 40 : 20; fx.flashText = e.mult > 1 ? fmt(T.combo, { n: e.mult }) : T.perfect; } else { SFX.land(); buzz(15); } if (!reduced()) fx.shake = e.perfect ? 4 : 6; }
      else if (e.k === 'fall') { SFX.fall(); buzz(50); const x = e.xl != null ? e.xl : MH.SHIP_CX; fx.icons.push({ why: e.why, x: e.why === 'sea' ? x : MH.SHIP_CX, t: 36 }); if (!reduced()) for (let i = 0; i < 14; i++) fx.parts.push({ x, y: 0, vx: (Math.random() - 0.5) * 0.12, vy: -Math.random() * 0.18, t: 40 }); }
      else if (e.k === 'drop') { fx.icons.push({ why: e.why, x: MH.SHIP_CX + colCenter(e.c, e.w), t: 36 }); }
      else if (e.k === 'depart') { SFX.depart(); fx.departShape = g.cols.map((c) => c.slice()); fx.departT = MH.DEPART; }
      else if (e.k === 'end') finish();
    }
  }
  // ---- main loop: fixed 1/60 s steps ----
  function frame(now) {
    W.frames++;
    const dt = Math.min(250, now - (lastT || now)); lastT = now;
    if (S.armed && !paused && !g.over) {
      if (countdown) { countdown = Math.max(0, countdown - dt * 0.06); }
      else {
        acc += dt; let n = 0;
        while (acc >= 1000 / 60 && n < 8 && !g.over) {
          acc -= 1000 / 60; n++;
          const dir = keys.r - keys.l, inp = { tx: dir ? null : tx, dir, release: pendRel };
          if (dir) tx = null;
          pendRel = false; step(g, inp); W.steps++; onEvents();
        }
        if (n >= 8) acc = 0;
        // blink + tick during last 2 s of the auto-drop gauge
        if (g.cargo && g.phase === 'play' && g.cargo.auto <= MH.BLINK) { const s = Math.ceil(g.cargo.auto / 30); if (s !== fx.lastBlink) { fx.lastBlink = s; SFX.tick(); } S.blinkSeen = true; }
        humOn(!!(g.cargo && drag));
      }
    }
    renderHud(); draw();
    requestAnimationFrame(frame);
  }
  function renderHud() {
    hud.time.textContent = Math.max(0, Math.ceil(90 - activeSec(g)));
    hud.ships.textContent = g.ships;
    const tg = g.ship ? g.ship.target : 6; hud.tgt.textContent = `${Math.min(load(g), tg)}/${tg}`;
    hud.cols.textContent = `${Math.min(usedCols(g), 4)}/4`;
    hud.lives.textContent = '⚓'.repeat(MH.LIVES - g.fails) + '·'.repeat(g.fails);
    hud.lives.setAttribute('aria-label', `${MH.LIVES - g.fails}/${MH.LIVES}`);
  }

  // ---- drawing ----
  const C = { sea: '#0b2a4a', sea2: '#0e3a63', rail: '#9aa4b8', box1: '#22d3ee', box2: '#facc15', block: 'rgba(255,255,255,.18)', ship: '#e8eaf0', hull: '#ff4d5e', mag: '#a78bfa' };
  function fit() { const r = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight; if (cv.width !== Math.round(w * r) || cv.height !== Math.round(h * r)) { cv.width = Math.round(w * r); cv.height = Math.round(h * r); } cx.setTransform(r, 0, 0, r, 0, 0); return [w, h]; }
  function boxRect(x, y, w, k, s) { cx.fillStyle = k === 'block' ? C.block : w === 2 ? C.box2 : C.box1; cx.fillRect(x + 1, y + 1, w * s - 2, s - 2); if (k !== 'block') { cx.strokeStyle = 'rgba(0,0,0,.35)'; cx.lineWidth = 2; cx.strokeRect(x + 3, y + 3, w * s - 6, s - 6); } else { cx.strokeStyle = 'rgba(255,255,255,.35)'; cx.setLineDash([4, 4]); cx.strokeRect(x + 3, y + 3, w * s - 6, s - 6); cx.setLineDash([]); } }
  function draw() {
    const [Wd, H] = fit(), s = Wd / MH.W, rm = reduced();
    const railY = H * 0.13, seaY = H * 0.6, deckY = H * 0.8;
    let sh = 0; if (fx.shake && !rm) { sh = (Math.random() - 0.5) * fx.shake; fx.shake = Math.max(0, fx.shake - 0.5); }
    cx.save(); cx.translate(sh, 0);
    cx.clearRect(-10, 0, Wd + 20, H);
    // sky / dock
    const sk = cx.createLinearGradient(0, 0, 0, seaY); sk.addColorStop(0, '#0d0f1c'); sk.addColorStop(1, '#141a33'); cx.fillStyle = sk; cx.fillRect(-10, 0, Wd + 20, seaY);
    cx.fillStyle = C.rail; cx.fillRect(0, railY - 3, Wd, 6);
    // sea (waves are decoration → off in reduced motion)
    cx.fillStyle = C.sea; cx.fillRect(-10, seaY, Wd + 20, H - seaY);
    if (!rm) { cx.strokeStyle = C.sea2; cx.lineWidth = 2; const ph = performance.now() / 700; for (let r = 0; r < 4; r++) { cx.beginPath(); for (let x = 0; x <= Wd; x += 8) cx.lineTo(x, seaY + 14 + r * 28 + Math.sin(x / 30 + ph + r) * 4); cx.stroke(); } }
    // wind arrow (warn 1 s before, on while active)
    const wd = g.phase !== 'ready' ? windAt(g) : {};
    if (wd.on || wd.warn) { cx.fillStyle = wd.on ? 'rgba(250,204,21,.9)' : 'rgba(250,204,21,.45)'; cx.font = `700 ${Math.round(s * 0.7)}px system-ui`; cx.textAlign = 'center'; cx.fillText(wd.dir > 0 ? '➜ ➜' : '⬅ ⬅', Wd / 2, railY + s * 1.1); }
    // ship (roll + heave transform; departure slides it away unless reduced motion)
    let dx = 0, alpha = 1; if (g.phase === 'depart') { const k = 1 - g.depart / MH.DEPART; if (rm) alpha = 1 - k; else dx = k * Wd; }
    const shipX = MH.SHIP_CX * s;
    cx.save(); cx.globalAlpha = alpha; cx.translate(shipX + dx, deckY + g.heave * s); cx.rotate((g.roll * Math.PI) / 180);
    cx.fillStyle = C.hull; cx.beginPath(); cx.moveTo(-3.3 * s, 0); cx.lineTo(3.3 * s, 0); cx.lineTo(2.7 * s, 0.9 * s); cx.lineTo(-2.7 * s, 0.9 * s); cx.closePath(); cx.fill();
    cx.fillStyle = 'rgba(255,255,255,.12)'; for (let c = 0; c < 6; c++) cx.fillRect((c - 3) * s + 2, -3, s - 4, 3);
    // first-landing guide: ready screen + until the first box lands, the 6 deck cells glow green (valid landing width)
    if (g.phase === 'ready' || (g.phase === 'play' && !g.placed.length)) {
      const pulse = rm ? 0.3 : 0.22 + 0.12 * Math.sin(performance.now() / 260);
      cx.fillStyle = `rgba(74,222,128,${pulse})`; cx.strokeStyle = 'rgba(74,222,128,.85)'; cx.lineWidth = 2;
      for (let c = 0; c < 6; c++) { cx.fillRect((c - 3) * s + 2, -s + 2, s - 4, s - 4); cx.strokeRect((c - 3) * s + 2, -s + 2, s - 4, s - 4); }
      if (g.phase === 'ready') { cx.fillStyle = 'rgba(74,222,128,.95)'; cx.font = `800 ${Math.round(s * 0.8)}px system-ui`; cx.textAlign = 'center'; cx.fillText('⬇', colCenter(2) * s, -s * 1.4); } // aim a cell centre, not the ship centre (a column boundary)
    }
    const seen = new Set();
    g.cols.forEach((col, c) => col.forEach((b, lv) => { const y = -(lv + 1) * s; if (b.k === 'block') boxRect((c - 3) * s, y, 1, 'block', s); else if (!seen.has(b.id)) { seen.add(b.id); boxRect((b.c - 3) * s, y, b.w, 'box', s); } }));
    cx.restore();
    // landing shadow on the waterline (x_land), helps when the finger covers the ship
    const live = g.cargo && (g.phase === 'play');
    if (live) {
      const lx = landX(g), xl = lx * s, w = g.cargo.w * s, sn = snap(lx, g.cargo.w), okLand = sn.err < MH.LAND;
      cx.fillStyle = 'rgba(167,139,250,.28)'; cx.fillRect(xl - w / 2, deckY - 6, w, 6);
      // landing marker over the snapped cell: green ✓ near the cell centre, amber ✓ at the edge (still lands), red ✕ = sea
      const tier = sn.err < 0.25 ? 'good' : okLand ? 'edge' : 'miss';
      cx.font = `800 ${Math.round(s * 0.55)}px system-ui`; cx.textAlign = 'center';
      cx.fillStyle = { good: 'rgba(74,222,128,.95)', edge: 'rgba(250,204,21,.95)', miss: 'rgba(255,77,94,.95)' }[tier]; cx.fillText(okLand ? '✓' : '✕', xl, deckY - (okLand ? Math.max(...g.cols.slice(sn.c, sn.c + g.cargo.w).map((c) => c.length)) : 0) * s - s * 0.15 - 10); // above the stack it would land on
      S.aim = okLand; S.aimTier = tier;
    }
    // crane trolley + rope + cargo
    const crX = g.crane.x * s; cx.fillStyle = C.mag; cx.fillRect(crX - s * 0.45, railY - s * 0.25, s * 0.9, s * 0.4);
    if (g.cargo) {
      const px = cargoX(g) * s, py = railY + MH.ROPE * Math.cos(g.th) * s;
      cx.strokeStyle = 'rgba(232,234,240,.7)'; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(crX, railY); cx.lineTo(px, py); cx.stroke();
      cx.fillStyle = C.mag; cx.fillRect(px - s * 0.35, py - s * 0.12, s * 0.7, s * 0.12);
      boxRect(px - (g.cargo.w * s) / 2, py, g.cargo.w, 'box', s);
      // auto-drop gauge: small ring above cargo, blinks in the last 2 s
      const f = g.cargo.auto / MH.AUTO, blink = g.cargo.auto <= MH.BLINK && Math.floor(g.cargo.auto / 10) % 2 === 0;
      cx.strokeStyle = blink ? '#ff4d5e' : 'rgba(255,255,255,.85)'; cx.lineWidth = 3; cx.beginPath(); cx.arc(px, py - s * 0.45, s * 0.22, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2); cx.stroke();
    } else { cx.strokeStyle = 'rgba(232,234,240,.4)'; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(crX, railY); cx.lineTo(crX, railY + MH.ROPE * s * 0.6); cx.stroke(); }
    if (g.falling) { const f = g.falling, k = Math.min(1, (g.tick - f.at) / MH.FALL), x = (f.x0 + (f.xl - f.x0) * k) * s, y0 = railY + MH.ROPE * s, y1 = deckY - s * 1.2; boxRect(x - (f.w * s) / 2, y0 + (y1 - y0) * k, f.w, 'box', s); }
    // splash particles + cause icons
    fx.parts = fx.parts.filter((p) => p.t-- > 0); cx.fillStyle = 'rgba(180,220,255,.8)'; for (const p of fx.parts) { p.x += p.vx; p.y += p.vy; p.vy += 0.012; cx.fillRect(p.x * s, seaY + p.y * s, 3, 3); }
    fx.icons = fx.icons.filter((i) => i.t-- > 0); cx.font = `${Math.round(s * 0.8)}px system-ui`; cx.textAlign = 'center';
    for (const i of fx.icons) { cx.fillText({ sea: '🌊', over: '⬆', step: '⬆', tilt: '⚖' }[i.why] || '!', i.x * s, deckY - s * 3.8); }
    if (fx.flash) { fx.flash--; cx.fillStyle = '#facc15'; cx.font = `800 ${Math.round(s * 0.75)}px system-ui`; cx.fillText(fx.flashText || T.perfect, Wd / 2, H * 0.47); }
    if (countdown) { cx.fillStyle = '#fff'; cx.font = `800 ${Math.round(s * 2)}px system-ui`; cx.fillText(String(Math.ceil(countdown / 60)), Wd / 2, H * 0.45); }
    // first-play hint 0–2 s after start: finger drag → release icon (no text)
    if (g.phase === 'play' && g.tick < 120 && !g.placed.length) { cx.font = `${Math.round(s * 0.9)}px system-ui`; cx.globalAlpha = 0.9; const k = (g.tick % 60) / 60; cx.fillText('👆', (1 + k * 3) * s, H * 0.5); cx.fillText('→', 2.5 * s, H * 0.44); cx.globalAlpha = 1; }
    cx.restore();
  }

  // ---- result ----
  function finish() {
    humOn(false); drag = null;
    const r = record(g), prev = loadLS(LS_BEST, {}); const had = prev.ships != null; const nb = better(r, had ? prev : null);
    if (nb) save(LS_BEST, r);
    $('#r-ships').textContent = fmt(T.shipsN, { n: r.ships }); $('#r-score').textContent = r.score; $('#r-perf').textContent = r.perfects;
    $('#r-best').textContent = had ? `${fmt(T.shipsN, { n: prev.ships })} · ${prev.score}` : '—';
    $('#r-diff').textContent = had ? `${r.ships - prev.ships >= 0 ? '+' : ''}${r.ships - prev.ships} · ${r.score - prev.score >= 0 ? '+' : ''}${r.score - prev.score}` : '';
    $('#r-new').hidden = !(nb && had); $('#r-first').hidden = had;
    // what to do next: cells / columns left for the next boat + a short tip for the last drop cause
    const left = g.ship ? Math.max(0, g.ship.target - load(g)) : 0, colsLeft = Math.max(0, 4 - usedCols(g));
    $('#r-near').hidden = !(left > 0 || colsLeft > 0);
    $('#r-near').textContent = left > 0 && colsLeft > 0 ? fmt(T.left, { n: left, c: colsLeft }) : left > 0 ? fmt(T.leftCells, { n: left }) : fmt(T.leftCols, { c: colsLeft });
    const lf = g.lastFail, tip = !lf ? T.tipTime : lf === 'sea' ? T.tipSea : lf === 'tilt' ? T.tipTilt : T.tipHigh;
    $('#r-tip').textContent = tip; $('#r-tipk').textContent = lf ? `${T.lastFall} ${{ sea: '🌊', over: '⬆', step: '⬆', tilt: '⚖' }[lf] || ''}` : '⏱';
    S.tip = { why: lf || 'time', text: tip, near: $('#r-near').textContent };
    $('#r-why').textContent = g.overWhy === 'time' ? T.endTime : T.endLives;
    $('#seed').textContent = seed;
    res.hidden = false; S.result = { ...r, at: performance.now() };
    ev('play_end', { end: g.overWhy === 'time' ? 'time' : 'lives' }); // complete = 'time' (90 s timer); 'lives' = early end after 3 falls
    setTimeout(() => $('#b-again').focus({ preventScroll: true }), 30);
  }
  function again() { reset(); S.againAt = performance.now(); }
  $('#b-again').addEventListener('click', (e) => { e.stopPropagation(); again(); });
  // share link -> /{lang}/c/mh-{seed}: own static shell with Magnet OG, redirects to the game with the same seed
  const link = () => `${location.origin}/${document.body.dataset.lang}/c/mh-${seed.replace(/[^A-Za-z0-9-]/g, '-')}`;
  $('#b-link').addEventListener('click', async (e) => {
    e.stopPropagation(); const txt = fmt(T.shareText, { ships: g.ships, url: link() });
    ev('share_click', { via: 'link' }); let ok = false;
    try { await navigator.clipboard.writeText(txt); ok = true; } catch { const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); try { ok = document.execCommand('copy'); } catch {} ta.remove(); }
    ev(ok ? 'share_done' : 'share_fail', { via: 'link' });
    S.copied = txt; say(T.copied);
  });
  // 1080×1350 card, local download only (no network)
  function card() {
    const c = document.createElement('canvas'); c.width = 1080; c.height = 1350; const k = c.getContext('2d');
    const bg = k.createLinearGradient(0, 0, 0, 1350); bg.addColorStop(0, '#0d0f1c'); bg.addColorStop(1, '#0b2a4a'); k.fillStyle = bg; k.fillRect(0, 0, 1080, 1350);
    k.fillStyle = '#e8eaf0'; k.textAlign = 'center'; k.font = '800 64px system-ui'; k.fillText(T.name, 540, 150);
    k.fillStyle = '#22d3ee'; k.font = '900 180px system-ui'; k.fillText(fmt(T.shipsN, { n: g.ships }), 540, 380);
    k.fillStyle = '#e8eaf0'; k.font = '700 52px system-ui'; k.fillText(`${T.score} ${g.score} · PERFECT ${g.perfects}`, 540, 480);
    const shape = fx.departShape || g.cols, s = 110, ox = 540 - 3 * s, oy = 1050; k.fillStyle = '#ff4d5e'; k.fillRect(ox - 40, oy, 6 * s + 80, 70);
    const seen = new Set(); shape.forEach((col, ci) => col.forEach((b, lv) => { const y = oy - (lv + 1) * s; if (b.k === 'block') { k.fillStyle = 'rgba(255,255,255,.2)'; k.fillRect(ox + ci * s + 3, y + 3, s - 6, s - 6); } else if (!seen.has(b.id)) { seen.add(b.id); k.fillStyle = b.w === 2 ? '#facc15' : '#22d3ee'; k.fillRect(ox + b.c * s + 3, y + 3, b.w * s - 6, s - 6); } }));
    k.fillStyle = 'rgba(214,219,232,.8)'; k.font = '500 34px system-ui'; k.fillText(`seed ${seed}`, 540, 1200); k.font = '700 40px system-ui'; k.fillText('playtoday.cloud', 540, 1280);
    return c;
  }
  $('#b-png').addEventListener('click', (e) => { e.stopPropagation(); ev('share_click', { via: 'png' }); card().toBlob((b) => { if (!b) return; const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `magnet-harbor-${seed}.png`; document.body.appendChild(a); a.click(); a.remove(); ev('share_done', { via: 'png' }); setTimeout(() => URL.revokeObjectURL(a.href), 2000); S.png = (S.png || 0) + 1; }, 'image/png'); });

  S.finish = finish; // test hook (layout checks)
  reset(); S.ready = true; requestAnimationFrame(frame);
})();
