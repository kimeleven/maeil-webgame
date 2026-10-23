// Orbit Switch UI (prototype, t_34f9c354). Inlined after orbit-core.js by scripts/build-orbit.mjs
// (one HTML request, no other network). Uses core names (OC, generate, createGame, step, input, ...) from scope.
/* global OC, generate, createGame, step, input, queue, theta, obCenter, radius, record, better, wrap */
(() => {
  const T = JSON.parse(document.getElementById('ot').textContent);
  const $ = (s) => document.querySelector(s);
  const LS_SET = 'orbit-switch-settings', LS_BEST = 'orbit-switch-best';
  const load = (k, d) => { try { return Object.assign(d, JSON.parse(localStorage.getItem(k) || 'null') || {}); } catch { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const set = load(LS_SET, { sound: true, haptic: true, motion: true });
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => mq.matches || !set.motion;
  const q = new URLSearchParams(location.search);
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const seed = (q.get('seed') || today()).slice(0, 64);
  const level = generate(seed);
  // ---- launch metrics (t_06bfa4bc): same contract as magnet (main 8a5531e) — Vercel Web Analytics custom events,
  // g=orbit, from=c|direct, qa='1' when ?qa=1 set localStorage 'pt-qa' (?qa=0 clears). No ids/seeds/scores/result text.
  // per run: play_start x1 (+ play_again x1 just before it when restarted from the result), play_end x1 end=time|hit.
  if (q.get('qa') === '1') save('pt-qa', 1); else if (q.get('qa') === '0') { try { localStorage.removeItem('pt-qa'); } catch {} }
  const qa = (() => { try { return localStorage.getItem('pt-qa') === '1'; } catch { return false; } })();
  const from = q.get('from') === 'c' ? 'c' : 'direct';
  const ev = (name, data = {}) => {
    const d = { g: 'orbit', from, ...data }; if (qa) d.qa = '1';
    (window.__trackLog = window.__trackLog || []).push({ name, ...d });
    try { if (window.va) window.va('event', { name, data: d }); } catch {}
    try { if (window.gev) window.gev(name, d); } catch {} // own OCI collection (t_287677ef); share_fail not in v1
  };
  if (!/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && !window.va) { window.va = function () { (window.vaq = window.vaq || []).push(arguments); }; const sc = document.createElement('script'); sc.defer = true; sc.src = '/_vercel/insights/script.js'; document.head.append(sc); }
  let runOpen = false; // true between play_start and play_end of one run (dedupe)
  const runStart = () => { if (runOpen) return; runOpen = true; ev('play_start'); };
  const runEnd = (end) => { if (!runOpen) return; runOpen = false; ev('play_end', { end }); };

  // ---- audio (WebAudio synth, created only after the first user input) ----
  let ac = null;
  const unlock = () => { if (!ac && set.sound) { const A = window.AudioContext || window.webkitAudioContext; if (A) try { ac = new A(); } catch {} } if (ac && ac.state === 'suspended') ac.resume(); };
  const tone = (f, d, type = 'sine', v = 0.12, f2) => {
    if (!ac || !set.sound) return; const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g).connect(ac.destination); o.start(t); o.stop(t + d + 0.02);
    window.__orbit && window.__orbit.sfx++;
  };
  const NOTES = [523.25, 659.25, 783.99, 1046.5];
  const sfx = { switch: () => tone(880, 0.05), ring: (i) => tone(NOTES[i] || 1046.5, 0.12, 'triangle', 0.14), close: () => tone(1600, 0.16, 'sawtooth', 0.05, 300), hit: () => tone(110, 0.3, 'square', 0.12, 55), win: () => { tone(523, 0.15, 'triangle'); setTimeout(() => tone(1046, 0.25, 'triangle'), 120); } };
  const buzz = (ms) => { if (set.haptic && navigator.vibrate) try { navigator.vibrate(ms); window.__orbit.vib++; } catch {} };
  document.addEventListener('visibilitychange', () => { if (document.hidden) { if (ac) ac.suspend(); pause(); } });

  // ---- DOM ----
  const cv = $('#oc'), ctx = cv.getContext('2d');
  const hud = { time: $('#h-time'), streak: $('#h-streak'), mult: $('#h-mult'), shield: $('#h-shield') };
  const ov = $('#ov'), res = $('#res'), toast = $('#toast'), ready = $('#ready');
  // touch-first device → tap wording; otherwise Space / Click (t_9ad9f847)
  const touchUi = matchMedia('(hover: none) and (pointer: coarse)').matches;
  $('#hint').textContent = touchUi ? T.startMobile : T.startDesktop;
  $('#r-how').textContent = touchUi ? T.startMobile : T.startDesktop;
  $('#r-go').textContent = touchUi ? T.startActionMobile : T.startActionDesktop;
  let S = 300, dpr = 1;
  const fit = () => { dpr = Math.min(2, devicePixelRatio || 1); S = cv.clientWidth; cv.width = cv.height = Math.round(S * dpr); };
  addEventListener('resize', fit); fit();
  const syncToggles = () => {
    for (const b of document.querySelectorAll('[data-set]')) { const k = b.dataset.set; b.setAttribute('aria-pressed', String(!!set[k])); b.classList.toggle('off', !set[k]); }
  };
  for (const b of document.querySelectorAll('[data-set]')) b.addEventListener('click', () => { const k = b.dataset.set; set[k] = !set[k]; save(LS_SET, set); if (k === 'sound' && !set.sound && ac) ac.suspend(); if (k === 'sound' && set.sound) unlock(); syncToggles(); });
  syncToggles();
  const say = (m) => { toast.textContent = m; toast.classList.add('show'); clearTimeout(say.t); say.t = setTimeout(() => toast.classList.remove('show'), 1600); };

  // ---- game loop ----
  let g, acc = 0, last = 0, running = false, armed = false, hitMark = null, finishT = 0, paused = false, trail = [], shakeUntil = 0, slowUntil = 0, fx = [];
  const W = window.__orbit = { seed, level, sfx: 0, vib: 0, frames: 0, ready: false, get armed() { return armed; }, get hitMark() { return hitMark; }, get g() { return g; }, starts: [], dbg: () => ({ trail: trail.length, reduced: reduced(), shake: shakeUntil > performance.now(), slow: slowUntil > performance.now() }) };
  // start(false): first visit — clock frozen on a ready sheet until the first input, which only starts (no switch).
  // start(true): the big 'again' button — the player already knows the rules, the run starts right away.
  function start(go) {
    if (go) { if (runOpen) return; ev('play_again'); runStart(); } // restart only from a finished run
    g = createGame(level); acc = 0; last = performance.now(); running = true; paused = false; trail = []; fx = []; hitMark = null; finishT = 0;
    res.hidden = true; ov.hidden = true; armed = !!go; ready.hidden = armed; W.starts.push(performance.now()); W.ready = true;
  }
  function arm() { runStart(); armed = true; ready.hidden = true; last = performance.now(); acc = 0; W.armedAt = performance.now(); }
  function pause() { if (running && armed && !g.over) { paused = true; ov.hidden = false; } }
  function resume() { paused = false; ov.hidden = true; last = performance.now(); }
  const isUi = (el) => el && el.closest && el.closest('[data-ui]');
  function press(kind) {
    unlock();
    if (paused) { resume(); return; }
    if (!running || g.over) return;
    if (!armed) { arm(); return; } // the starting input is consumed: it never doubles as a lane switch
    queue(g, kind);
  }
  document.addEventListener('pointerdown', (e) => { if (isUi(e.target) || e.button > 0) return; e.preventDefault(); press(e.pointerType === 'mouse' ? 'click' : 'tap'); }, { passive: false });
  document.addEventListener('keydown', (e) => {
    if (e.code !== 'Space' && e.key !== ' ') { if ((e.key === 'r' || e.key === 'R') && g && g.over && !res.hidden) start(true); return; }
    e.preventDefault(); if (e.repeat) { if (g) g.log.ignored.push({ t: g.t, kind: 'space', why: 'repeat' }); return; }
    if (isUi(document.activeElement) && g && g.over) return; // Space on a focused result button = that button
    press('space');
  });
  function frame(now) {
    requestAnimationFrame(frame);
    if (!running) return;
    W.frames++;
    let dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (armed && !paused && !g.over) {
      const scale = !reduced() && now < slowUntil ? 0.4 : 1; // slow-mo is presentation only: sim time stays consistent
      acc += dt * scale;
      while (acc >= OC.DT && !g.over) { step(g); acc -= OC.DT; }
      for (const ev of g.events.splice(0)) onEvent(ev, now);
      if (g.over) finishT = now + (g.clear ? 0 : 650); // let the hit marker register before the result sheet
    }
    if (finishT && now >= finishT) { finishT = 0; finish(); }
    draw(now);
  }
  function onEvent(ev, now) {
    if (ev.e === 'switch') { sfx.switch(); buzz(10); }
    else if (ev.e === 'ring') { sfx.ring(ev.i); fx.push({ k: 'ring', at: now }); }
    else if (ev.e === 'close') { sfx.close(); buzz(20); fx.push({ k: 'close', at: now }); }
    else if (ev.e === 'shield' || ev.e === 'lose') {
      const h = g.log.hits[g.log.hits.length - 1], o = h && level.obs.find((x) => x.id === h.id);
      if (h && o) hitMark = { t: h.t, a: theta(h.t), r: h.r, o, kind: ev.e, trans: h.trans, at: now, text: ev.e === 'shield' ? T.hitShield : causeText(o) };
      sfx.hit(); buzz(40); if (!reduced()) { shakeUntil = now + 300; if (ev.e === 'shield') slowUntil = now + 350; } }
    else if (ev.e === 'shieldUp') sfx.ring(3);
    else if (ev.e === 'win') sfx.win();
  }

  const causeText = (o) => (o.vb ? T.causeBar : o.type === 'door' ? T.causeGate : T.causeBlock);
  const tipText = () => {
    const h = hitMark; if (!h) return T.tipSwitch;
    const mash = g.log.ignored.filter((x) => x.why === 'cooldown' && x.t > h.t - 3).length;
    if (mash >= 3) return T.tipMash;
    if (h.trans) return T.tipEarly;
    if (h.o.vb) return T.tipBar;
    return T.tipSwitch;
  };
  // ---- drawing ----
  const RED = '#ff4d5e', CYAN = '#22d3ee';
  let hatch = null;
  const hatchPat = () => {
    if (hatch) return hatch; const c = document.createElement('canvas'); c.width = c.height = 12; const x = c.getContext('2d');
    x.fillStyle = RED; x.fillRect(0, 0, 12, 12); x.strokeStyle = 'rgba(40,0,8,.75)'; x.lineWidth = 3; x.beginPath(); x.moveTo(-3, 15); x.lineTo(15, -3); x.moveTo(-3, 3); x.lineTo(3, -3); x.moveTo(9, 15); x.lineTo(15, 9); x.stroke();
    return (hatch = ctx.createPattern(c, 'repeat'));
  };
  let bg = null, bgKey = '';
  const bgLayer = (rm) => {
    const k = `${S}|${dpr}|${rm}`; if (bg && bgKey === k) return bg; bgKey = k;
    bg = document.createElement('canvas'); bg.width = bg.height = Math.round(S * dpr); const x = bg.getContext('2d'); x.scale(dpr, dpr);
    x.lineWidth = 2; for (const R of OC.R) { x.strokeStyle = 'rgba(99,102,241,.5)'; x.shadowColor = '#6366f1'; x.shadowBlur = rm ? 0 : 10; x.beginPath(); x.arc(S / 2, S / 2, R * S, 0, Math.PI * 2); x.stroke(); }
    x.shadowBlur = 0; x.fillStyle = '#fde68a'; x.beginPath(); x.arc(S / 2, S / 2, S * 0.05, 0, Math.PI * 2); x.fill();
    return bg;
  };
  const P = (a, r) => [S / 2 + Math.sin(a) * r * S, S / 2 - Math.cos(a) * r * S];
  const arc = (c, hw, r) => { ctx.beginPath(); ctx.arc(S / 2, S / 2, r * S, c - hw - Math.PI / 2, c + hw - Math.PI / 2); };
  function draw(now) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, S, S);
    if (now < shakeUntil) ctx.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
    const t = g.t, rm = reduced();
    if (!rm) { ctx.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 24; i++) { const a = i * 2.4 + t * 0.05 * (1 + (i % 3)), d = 0.08 + ((i * 37) % 40) / 100; const [x, y] = P(a, d); ctx.fillRect(x, y, 1.5, 1.5); } }
    ctx.drawImage(bgLayer(rm), 0, 0, S, S); // orbits + star, cached (shadowBlur is costly per frame)
    // obstacles
    const L = level;
    for (let i = 0; i < L.obs.length; i++) {
      const o = L.obs[i], s = g.obState[i];
      if (t < o.warnStart || t > o.exit + 0.35) continue;
      const c = obCenter(o, t), R = OC.R[o.lane];
      if (t < o.enter - 0.2) { ctx.setLineDash([6, 6]); ctx.strokeStyle = RED; ctx.lineWidth = 3; arc(c, o.hw + 0.02, R); ctx.stroke(); ctx.setLineDash([]); if (o.type === 'door') doorFrame(c, o); continue; }
      ctx.globalAlpha = t > o.exit ? Math.max(0, 1 - (t - o.exit) / 0.35) : 1;
      ctx.strokeStyle = s.hit ? '#888' : hatchPat(); ctx.lineWidth = OC.HIT_R * 2 * S * 0.8; ctx.lineCap = 'butt'; arc(c, o.hw, R); ctx.stroke();
      if (o.type === 'door') doorFrame(c, o);
      if (o.type === 'bar') { ctx.strokeStyle = '#fb923c'; ctx.lineWidth = 2; arc(c, o.hw, R + OC.HIT_R); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }
    for (let i = 0; i < L.rings.length; i++) {
      const r = L.rings[i], s = g.ringState[i]; if (s.got || s.missed || t < r.show || t > r.t + 0.3) continue;
      const [x, y] = P(r.c0, OC.R[r.lane]);
      if (r.kind === 'shield') { ctx.fillStyle = '#4ade80'; ctx.beginPath(); ctx.moveTo(x, y - 10); ctx.lineTo(x + 9, y - 6); ctx.lineTo(x + 7, y + 5); ctx.lineTo(x, y + 11); ctx.lineTo(x - 7, y + 5); ctx.lineTo(x - 9, y - 6); ctx.closePath(); ctx.fill(); }
      else { ctx.strokeStyle = CYAN; ctx.shadowColor = CYAN; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.stroke(); }
    }
    // dot + trail
    const a = theta(t), r = radius(g), [dx, dy] = P(a, r);
    if (!rm) { trail.push([dx, dy]); if (trail.length > 14) trail.shift(); trail.forEach(([x, y], k) => { ctx.fillStyle = `rgba(34,211,238,${(k / trail.length) * 0.45})`; ctx.beginPath(); ctx.arc(x, y, 3 + k * 0.35, 0, Math.PI * 2); ctx.fill(); }); } else trail.length = 0;
    const inv = t < g.invulnUntil && Math.floor(t * 12) % 2;
    ctx.fillStyle = inv ? 'rgba(255,255,255,.35)' : '#fff'; ctx.beginPath(); ctx.arc(dx, dy, S * 0.022, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    if (g.shields > 0) { ctx.strokeStyle = 'rgba(74,222,128,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(dx, dy, S * 0.034, 0, Math.PI * 2); ctx.stroke(); }
    // guide (0–3 s): tap circle + radial double arrow, no text
    if (t < 3) {
      const k = (t % 1), [gx, gy] = P(a, 0.35);
      ctx.strokeStyle = `rgba(255,255,255,${0.9 - k * 0.6})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(S / 2, S / 2 + S * 0.15, 10 + k * 14, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(S / 2, S / 2 + S * 0.15, 6, 0, Math.PI * 2); ctx.fill();
      const [ix, iy] = P(a, 0.3), [ox, oy] = P(a, 0.4); ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.moveTo(ix, iy); ctx.lineTo(ox, oy); ctx.stroke();
      for (const [x, y] of [[ix, iy], [ox, oy]]) { ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill(); } void gx; void gy;
    }
    W.lbl = []; const lbl = (txt, x, y, col) => { W.lbl.push(txt); ctx.font = `700 ${Math.max(12, S * 0.036)}px system-ui,sans-serif`; const hw = ctx.measureText(txt).width / 2 + 4; x = Math.min(S - hw, Math.max(hw, x)); ctx.font = `700 ${Math.max(12, S * 0.036)}px system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(7,8,12,.85)'; ctx.strokeText(txt, x, y); ctx.fillStyle = col; ctx.fillText(txt, x, y); };
    // labels: you (until 5 s), first ring / first warning, 'tap now' while the first ring waits on the other orbit
    if (t < 5) lbl(T.legendYou, dx, dy - S * 0.05, '#fff');
    const r0 = L.rings[0];
    if (r0 && !g.ringState[0].got && !g.ringState[0].missed && t >= r0.show && t < r0.t + 0.3) {
      const [rx, ry] = P(r0.c0, OC.R[r0.lane]); lbl(T.legendRing, rx, ry - S * 0.045, CYAN);
      if (g.lane !== r0.lane && !g.trans && armed) lbl(T.tapNow, S / 2, S / 2 + S * 0.12, '#facc15');
    }
    const o0 = L.obs[0];
    if (o0 && t >= o0.warnStart && t < o0.exit && !g.obState[0].hit) { const [ox, oy] = P(obCenter(o0, t), OC.R[o0.lane]); lbl(T.legendDanger, ox, oy - S * 0.05, RED); }
    if (hitMark && (g.over || now - hitMark.at < 1600)) {
      const [hx, hy] = P(hitMark.a, hitMark.r), k = Math.min(1, (now - hitMark.at) / 250);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; arc(obCenter(hitMark.o, Math.min(t, hitMark.t)), hitMark.o.hw + 0.02, OC.R[hitMark.o.lane]); ctx.stroke();
      ctx.strokeStyle = RED; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(hx, hy, S * (0.03 + 0.03 * (rm ? 1 : k)), 0, Math.PI * 2); ctx.stroke();
      const c = S * 0.022; ctx.beginPath(); ctx.moveTo(hx - c, hy - c); ctx.lineTo(hx + c, hy + c); ctx.moveTo(hx + c, hy - c); ctx.lineTo(hx - c, hy + c); ctx.stroke();
      lbl(hitMark.text, S / 2, S * 0.1, hitMark.kind === 'shield' ? '#facc15' : '#ff8a96');
    }
    for (const f of fx) { const k = (now - f.at) / 600; if (k > 1) continue; if (f.k === 'close') { ctx.fillStyle = `rgba(250,204,21,${1 - k})`; ctx.font = `800 ${S * 0.07}px system-ui`; ctx.textAlign = 'center'; ctx.fillText(T.close, S / 2, S / 2 - S * 0.12 - k * 20); } }
    fx = fx.filter((f) => now - f.at < 600);
    hudUpdate();
  }
  function doorFrame(c, o) { const w = o.hw + 0.06; ctx.strokeStyle = 'rgba(255,77,94,.7)'; ctx.lineWidth = 2; for (const e of [c - w, c + w]) { const [x1, y1] = P(e, OC.R[0] - 0.05), [x2, y2] = P(e, OC.R[1] + 0.05); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); } }
  let hudPrev = '';
  function hudUpdate() {
    const s = `${Math.ceil(OC.DUR - g.t)}|${g.streak}|${OC.MULTS[g.multI]}|${g.shields}`; if (s === hudPrev) return; hudPrev = s;
    hud.time.textContent = Math.ceil(OC.DUR - g.t); hud.streak.textContent = g.streak; hud.mult.textContent = '×' + OC.MULTS[g.multI]; hud.shield.textContent = g.shields ? '◆' : '◇';
  }

  // ---- results ----
  let lastRec = null;
  const fmtT = (x) => x.toFixed(1);
  function finish() {
    runEnd(g.clear ? 'time' : 'hit'); // complete = 'time' (survived 90 s); 'hit' = early end
    const rec = record(g), prev = load(LS_BEST, { v: null }).v; lastRec = rec;
    const isBest = better(rec, prev); if (isBest) save(LS_BEST, { v: rec });
    const best = isBest ? rec : prev;
    $('#r-title').textContent = rec.clear ? T.clear : T.over;
    $('#r-now').textContent = `${fmtT(rec.time)}${T.sec} · ${T.streak} ${rec.streak} · ${rec.score}`;
    $('#r-best').textContent = `${fmtT(best.time)}${T.sec} · ${T.streak} ${best.streak} · ${best.score}`;
    const dT = prev ? rec.time - prev.time : 0, dS = prev ? rec.streak - prev.streak : 0;
    $('#r-dt').textContent = prev ? `${dT >= 0 ? '+' : '−'}${fmtT(Math.abs(dT))}${T.sec}` : T.first;
    $('#r-ds').textContent = prev ? `${T.streak} ${dS >= 0 ? '+' : '−'}${Math.abs(dS)}` : '';
    $('#r-near').textContent = prev && !isBest && prev.time - rec.time > 0.05 && prev.time - rec.time <= 10 ? T.toBest.replace('{n}', fmtT(prev.time - rec.time)) : '';
    $('#r-new').hidden = !(isBest && prev);
    const showCause = !rec.clear && hitMark && hitMark.kind === 'lose';
    $('#r-cause').hidden = !showCause;
    $('#r-cause-t').textContent = showCause ? `${T.cause}: ${hitMark.text}` : '';
    $('#r-tip').textContent = showCause ? `${T.tip}: ${tipText()}` : '';
    W.cause = showCause ? { type: hitMark.o.vb ? 'bar' : hitMark.o.type, text: hitMark.text, tip: $('#r-tip').textContent } : null;
    res.hidden = false; W.result = { rec, best, prev };
    setTimeout(() => $('#b-again').focus({ preventScroll: true }), 30);
  }
  const shareUrl = () => { const u = new URL(location.href); u.search = ''; u.searchParams.set('seed', seed); return u.toString(); };
  $('#b-again').addEventListener('click', () => { unlock(); start(true); });
  $('#b-share').addEventListener('click', async () => {
    const text = T.shareText.replace('{streak}', lastRec ? lastRec.streak : 0).replace('{url}', shareUrl());
    if (navigator.share) {
      ev('share_click', { via: 'native' });
      try { await navigator.share({ text }); ev('share_done', { via: 'native' }); return; } // handed to the share sheet, not an SNS post
      catch (e) { if (e && e.name === 'AbortError') { ev('share_fail', { via: 'native' }); return; } } // cancelled: never a success
    }
    ev('share_click', { via: 'text' });
    try { await navigator.clipboard.writeText(text); ev('share_done', { via: 'text' }); say(T.copied); } catch { ev('share_fail', { via: 'text' }); say(text); }
  });
  $('#b-link').addEventListener('click', async () => { ev('share_click', { via: 'link' }); try { await navigator.clipboard.writeText(shareUrl()); ev('share_done', { via: 'link' }); say(T.copied); } catch { ev('share_fail', { via: 'link' }); say(shareUrl()); } });
  $('#b-png').addEventListener('click', () => {
    ev('share_click', { via: 'png' });
    const c = document.createElement('canvas'); c.width = 1080; c.height = 1350; const x = c.getContext('2d'), r = lastRec || record(g);
    const gr = x.createLinearGradient(0, 0, 1080, 1350); gr.addColorStop(0, '#0b0d1a'); gr.addColorStop(1, '#07080c'); x.fillStyle = gr; x.fillRect(0, 0, 1080, 1350);
    x.strokeStyle = 'rgba(99,102,241,.7)'; x.lineWidth = 6; for (const R of OC.R) { x.beginPath(); x.arc(540, 520, R * 900, 0, Math.PI * 2); x.stroke(); }
    x.fillStyle = '#fde68a'; x.beginPath(); x.arc(540, 520, 44, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#fff'; x.beginPath(); x.arc(540 + 0.42 * 900 * Math.sin(1), 520 - 0.42 * 900 * Math.cos(1), 20, 0, Math.PI * 2); x.fill();
    x.textAlign = 'center'; x.fillStyle = '#e8eaf0'; x.font = '700 56px system-ui,sans-serif'; x.fillText(T.name, 540, 110);
    x.font = '800 120px system-ui,sans-serif'; x.fillStyle = '#22d3ee'; x.fillText(`${T.streak} ${r.streak}`, 540, 1060);
    x.font = '600 52px system-ui,sans-serif'; x.fillStyle = '#e8eaf0'; x.fillText(`${fmtT(r.time)}${T.sec} · ${r.score}`, 540, 1150);
    x.font = '500 34px system-ui,sans-serif'; x.fillStyle = 'rgba(214,219,232,.72)'; x.fillText(`seed ${seed} · playtoday.cloud`, 540, 1290);
    c.toBlob((b) => { if (!b) { ev('share_fail', { via: 'png' }); return; } const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `orbit-switch-${seed}.png`; document.body.appendChild(a); a.click(); a.remove(); ev('share_done', { via: 'png' }); setTimeout(() => URL.revokeObjectURL(a.href), 4000); W.png = b.size; }, 'image/png');
  });
  $('#seed').textContent = seed;
  requestAnimationFrame(frame);
  start(false);
})();
