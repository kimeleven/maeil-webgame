// Echo Courier UI (prototype, t_0e812a29). Inlined after echo-core.js by scripts/build-echo.mjs.
/* global EC, NUMPAD, cellOfKey, showTime, createGame, step, tap, replay, litIndex, record, better */
(() => {
  const T = JSON.parse(document.getElementById('et').textContent);
  const $ = (s) => document.querySelector(s);
  const LS_SET = 'echo-courier-settings', LS_BEST = 'echo-courier-best';
  const load = (k, d) => { try { return Object.assign(d, JSON.parse(localStorage.getItem(k) || 'null') || {}); } catch { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const set = load(LS_SET, { sound: true, haptic: true, motion: true });
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => mq.matches || !set.motion;
  const q = new URLSearchParams(location.search);
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const seed = (q.get('seed') || today()).slice(0, 64);

  // ---- audio: 9-note pentatonic, WebAudio synth, created only on the first user input ----
  let ac = null;
  const unlock = () => { if (!ac && set.sound) { const A = window.AudioContext || window.webkitAudioContext; if (A) try { ac = new A(); } catch {} } if (ac && ac.state === 'suspended' && set.sound) ac.resume(); };
  const PENTA = [261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25, 783.99];
  const tone = (f, d, type = 'triangle', v = 0.13, at = 0) => {
    if (!ac || !set.sound) return; const t = ac.currentTime + at, o = ac.createOscillator(), gn = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); gn.gain.setValueAtTime(v, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(gn).connect(ac.destination); o.start(t); o.stop(t + d + 0.02); W.sfx++;
  };
  const noteOf = (cell) => PENTA[[6, 7, 8, 3, 4, 5, 0, 1, 2][cell]]; // low notes bottom-left like a numpad scale
  const buzz = (ms) => { if (set.haptic && navigator.vibrate) try { navigator.vibrate(ms); W.vib++; } catch {} };

  // ---- DOM ----
  const board = $('#board'), cells = [...board.querySelectorAll('.cell')], svg = $('#lines');
  const hud = { time: $('#h-time'), done: $('#h-done'), len: $('#h-len'), score: $('#h-score') };
  const ready = $('#ready'), res = $('#res'), toast = $('#toast'), status = $('#status'), follow = $('#follow');
  const touchUi = matchMedia('(hover: none) and (pointer: coarse)').matches;
  $('#r-how').textContent = touchUi ? T.howMobile : T.howDesktop;
  $('#r-go').textContent = touchUi ? T.goMobile : T.goDesktop;
  const syncToggles = () => { for (const b of document.querySelectorAll('[data-set]')) { const k = b.dataset.set; b.setAttribute('aria-pressed', String(!!set[k])); b.classList.toggle('off', !set[k]); if (b.dataset.icon) b.textContent = set[k] ? '🔊' : '🔇'; } document.body.classList.toggle('rm', reduced()); };
  for (const b of document.querySelectorAll('[data-set]')) b.addEventListener('click', (e) => { e.stopPropagation(); const k = b.dataset.set; set[k] = !set[k]; save(LS_SET, set); if (k === 'sound') { if (set.sound) unlock(); else if (ac) ac.suspend(); } syncToggles(); });
  mq.addEventListener && mq.addEventListener('change', syncToggles);
  syncToggles();
  const say = (m) => { toast.textContent = m; toast.classList.add('show'); clearTimeout(say.t); say.t = setTimeout(() => toast.classList.remove('show'), 1600); };

  // ---- game ----
  let g, last = 0, running = false, armed = false, hidden = false, firstOk = false, lastLit = -1, finished = false;
  const W = window.__echo = { seed, sfx: 0, vib: 0, frames: 0, ready: false, starts: [], get g() { return g; }, get armed() { return armed; }, get hidden() { return hidden; } };
  function start(go) {
    g = createGame(seed); running = true; finished = false; lastLit = -1; res.hidden = true;
    armed = !!go; ready.hidden = armed; if (armed) arm(); W.ready = true;
  }
  function arm() { armed = true; ready.hidden = true; last = performance.now(); W.armedAt = last; W.starts.push(last); }
  function press(cell) {
    unlock();
    if (!running || g.over) return;
    if (!armed) { arm(); return; } // the starting input only starts the run
    const r = tap(g, cell);
    if (r === 'ignored') return;
    flush();
  }
  board.addEventListener('pointerdown', (e) => { const c = e.target.closest('.cell'); if (!c || e.button > 0) return; e.preventDefault(); press(+c.dataset.cell); });
  ready.addEventListener('pointerdown', (e) => { if (e.button > 0) return; e.preventDefault(); unlock(); if (running && !armed) arm(); });
  document.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (!res.hidden) { if ((e.key === 'Enter' || e.code === 'Space') && !(document.activeElement && document.activeElement !== $('#b-again') && document.activeElement.tagName === 'BUTTON')) { e.preventDefault(); unlock(); start(true); } return; }
    if (running && !armed && (e.key === 'Enter' || e.code === 'Space')) { e.preventDefault(); unlock(); arm(); return; }
    const c = cellOfKey(e.key); if (c >= 0 && armed) { e.preventDefault(); press(c); }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { hidden = true; if (ac) ac.suspend(); W.hiddenAt = g && g.t; }
    else { hidden = false; last = performance.now(); if (ac && set.sound) ac.resume(); if (g && armed && !g.over) { replay(g); lastLit = -1; flush(); } }
  });

  let failUntil = 0, okUntil = 0;
  function flush() {
    for (const ev of g.events.splice(0)) {
      if (ev.e === 'cell') { tone(noteOf(ev.cell), 0.18); buzz(10); }
      else if (ev.e === 'fail') { tone(196, 0.22, 'square', 0.1); tone(147, 0.3, 'square', 0.1, 0.16); buzz(60); }
      else if (ev.e === 'ok') { g.path.forEach((c, i) => tone(noteOf(c), 0.12, 'sine', 0.1, 0.12 + i * 0.05)); if (!firstOk) { firstOk = true; follow.hidden = true; } }
      else if (ev.e === 'round' || ev.e === 'replay') lastLit = -1;
      else if (ev.e === 'over') finished = true;
    }
  }
  function frame(now) {
    requestAnimationFrame(frame);
    if (!running) return;
    W.frames++;
    if (armed && !hidden && !g.over) { step(g, (now - last) / 1000); flush(); }
    last = now;
    const li = litIndex(g); if (li !== lastLit && li >= 0) tone(noteOf(g.path[li]), 0.2, 'sine', 0.11); lastLit = li;
    draw(li);
    if (finished && !W.result) finish();
  }
  const cxy = (c) => [(c % 3) * 100 + 50, ((c / 3) | 0) * 100 + 50];
  let drawKey = '';
  function draw(li) {
    const ph = g.phase, k = `${ph}|${li}|${g.idx}|${g.r}|${armed}`;
    hud.time.textContent = Math.max(0, Math.ceil(EC.DUR - g.t)); hud.done.textContent = g.done; hud.len.textContent = g.path.length; hud.score.textContent = g.score;
    if (k === drawKey) return; drawKey = k;
    const L = g.path.length, faint = L >= EC.FAINT_FROM;
    cells.forEach((el, c) => { el.className = 'cell'; el.style.opacity = ''; el.querySelector('i').textContent = ''; });
    let lines = '';
    if (ph === 'show' && li >= 0) { const el = cells[g.path[li]]; el.classList.add('lit'); if (faint && li >= L - 2) el.style.opacity = String(EC.FAINT_ALPHA); }
    if (ph === 'input') for (let i = 0; i < g.idx; i++) { cells[g.path[i]].classList.add('got'); cells[g.path[i]].querySelector('i').textContent = i + 1; }
    if (ph === 'fail' || ph === 'ok') {
      g.path.forEach((c, i) => { const el = cells[c]; el.classList.add(ph === 'ok' ? 'gold' : 'ans'); const n = el.querySelector('i'); n.textContent = n.textContent ? n.textContent + '·' + (i + 1) : i + 1; });
      if (ph === 'fail' && g.wrong) { cells[g.wrong.cell].classList.add('bad'); }
      lines = path(g.path, ph === 'ok' ? '#facc15' : '#22d3ee');
    }
    svg.innerHTML = lines;
    status.textContent = !armed ? '' : ph === 'show' ? T.watch : ph === 'input' ? T.yourTurn : ph === 'fail' && g.wrong ? T.failAt.replace('{n}', g.wrong.at + 1) : ph === 'ok' ? '✓' : '';
    status.className = 'status ' + ph;
    board.classList.toggle('shake', ph === 'fail' && !reduced());
  }
  const path = (p, col) => `<polyline points="${p.map((c) => cxy(c).join(',')).join(' ')}" fill="none" stroke="${col}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity=".85"${reduced() ? '' : ' class="draw"'}/>`;

  // ---- results ----
  let lastRec = null;
  function finish() {
    const rec = record(g), prev = load(LS_BEST, { v: null }).v; lastRec = rec; W.lastFail = g.log.rounds.filter((x) => x.res === 'fail').length;
    const isBest = better(rec, prev); if (isBest) save(LS_BEST, { v: rec });
    const best = isBest ? rec : prev;
    $('#r-done').textContent = rec.done; $('#r-long').textContent = `${rec.longest} ${T.cells}`; $('#r-score').textContent = rec.score;
    $('#r-best').textContent = `${T.done} ${best.done} · ${T.longest} ${best.longest} · ${best.score}`;
    $('#r-new').hidden = !(isBest && prev); $('#r-first').hidden = !!prev;
    $('#r-path').innerHTML = mini(rec.path);
    res.hidden = false; W.result = { rec, best, prev };
    setTimeout(() => $('#b-again').focus({ preventScroll: true }), 30);
  }
  const mini = (p) => `<svg viewBox="0 0 300 300" width="120" height="120" aria-hidden="true">${[...Array(9)].map((_, c) => `<rect x="${(c % 3) * 100 + 8}" y="${((c / 3) | 0) * 100 + 8}" width="84" height="84" rx="16" fill="rgba(255,255,255,.06)" stroke="rgba(255,255,255,.12)"/>`).join('')}${p.length ? `<polyline points="${p.map((c) => cxy(c).join(',')).join(' ')}" fill="none" stroke="#facc15" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>` : ''}</svg>`;
  const shareUrl = () => { const u = new URL(location.href); u.search = ''; u.searchParams.set('seed', seed); return u.toString(); };
  $('#b-again').addEventListener('click', () => { unlock(); W.result = null; start(true); });
  $('#b-share').addEventListener('click', async () => {
    const text = T.shareText.replace('{done}', lastRec ? lastRec.done : 0).replace('{longest}', lastRec ? lastRec.longest : 0).replace('{url}', shareUrl());
    if (navigator.share) { try { await navigator.share({ text }); return; } catch {} }
    try { await navigator.clipboard.writeText(text); say(T.copied); } catch { say(text); }
  });
  $('#b-link').addEventListener('click', async () => { try { await navigator.clipboard.writeText(shareUrl()); say(T.copied); } catch { say(shareUrl()); } });
  $('#b-png').addEventListener('click', () => {
    const c = document.createElement('canvas'); c.width = 1080; c.height = 1350; const x = c.getContext('2d'), r = lastRec || record(g);
    const gr = x.createLinearGradient(0, 0, 1080, 1350); gr.addColorStop(0, '#0b0d1a'); gr.addColorStop(1, '#07080c'); x.fillStyle = gr; x.fillRect(0, 0, 1080, 1350);
    x.textAlign = 'center'; x.fillStyle = '#e8eaf0'; x.font = '700 60px system-ui,sans-serif'; x.fillText(T.name, 540, 120);
    const ox = 240, oy = 200, s = 200;
    for (let k = 0; k < 9; k++) { x.fillStyle = 'rgba(255,255,255,.06)'; x.strokeStyle = 'rgba(255,255,255,.16)'; x.lineWidth = 3; x.beginPath(); x.roundRect(ox + (k % 3) * s + 14, oy + ((k / 3) | 0) * s + 14, s - 28, s - 28, 28); x.fill(); x.stroke(); }
    if (r.path.length) {
      x.strokeStyle = '#facc15'; x.lineWidth = 18; x.lineCap = x.lineJoin = 'round'; x.shadowColor = '#facc15'; x.shadowBlur = 24; x.beginPath();
      r.path.forEach((k, i) => { const px = ox + (k % 3) * s + s / 2, py = oy + ((k / 3) | 0) * s + s / 2; i ? x.lineTo(px, py) : x.moveTo(px, py); }); x.stroke(); x.shadowBlur = 0;
      const [sx, sy] = [ox + (r.path[0] % 3) * s + s / 2, oy + ((r.path[0] / 3) | 0) * s + s / 2]; x.fillStyle = '#22d3ee'; x.beginPath(); x.arc(sx, sy, 22, 0, Math.PI * 2); x.fill();
    }
    x.font = '800 116px system-ui,sans-serif'; x.fillStyle = '#22d3ee'; x.fillText(`${T.done} ${r.done}`, 540, 1000);
    x.font = '600 54px system-ui,sans-serif'; x.fillStyle = '#e8eaf0'; x.fillText(`${T.longest} ${r.longest} ${T.cells} · ${r.score}`, 540, 1090);
    x.font = '500 34px system-ui,sans-serif'; x.fillStyle = 'rgba(214,219,232,.72)'; x.fillText(`${today()} · seed ${seed} · playtoday.cloud`, 540, 1280);
    c.toBlob((b) => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `echo-courier-${seed}.png`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); W.png = b.size; W.pngUrl = c.toDataURL('image/png'); }, 'image/png');
  });
  $('#seed').textContent = seed;
  requestAnimationFrame(frame);
  start(false);
})();
