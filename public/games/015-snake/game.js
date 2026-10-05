(() => {
  "use strict";
  const G = "015-snake";
  const BK = "maeil-best-015";
  const N = 16; // grid cells per side
  const ROUND = 60; // seconds
  const START_STEP = 150; // ms per move
  const MIN_STEP = 62;
  const INK = "#141311", CREAM = "#efe6d4", GOLD = "#e8c87a", TEAL = "#7ddec0", CORAL = "#ff7a5c";

  const $ = (id) => document.getElementById(id);
  const cv = $("game"), ctx = cv.getContext("2d");
  const stage = $("stage");
  const scEl = $("score"), lenEl = $("len"), tmEl = $("time"), bsEl = $("best"), lvlEl = $("lvl");
  const stO = $("start"), rsO = $("results"), fn = $("final-score"), nh = $("new-high");
  const detailEl = $("result-detail"), titleEl = $("result-title"), rankEl = $("rank-line");
  const play = $("btn-play"), again = $("btn-again"), fav = $("btn-fav");

  let best = +localStorage.getItem(BK) || 0;
  bsEl.textContent = best;

  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const OPP = { up: "down", down: "up", left: "right", right: "left" };

  let S = 0, dpr = 1, cell = 20; // canvas css size
  let body = [], prev = [], dir = "right", queue = [], grow = 0;
  let food = null, bonus = null, eaten = 0, score = 0, level = 1;
  let stepMs = START_STEP, acc = 0, timeLeft = ROUND, lastEat = -99, combo = 0;
  let running = false, ended = false, last = 0, clock = 0, shake = 0, deathAt = 0;
  let parts = [], floats = [];
  let bgCache = null;

  function resize() {
    const r = stage.getBoundingClientRect();
    const size = Math.max(200, Math.floor(Math.min(r.width - 24, r.height - 8, 460)));
    dpr = Math.min(devicePixelRatio || 1, 2);
    S = size;
    cell = S / N;
    cv.width = Math.round(S * dpr);
    cv.height = Math.round(S * dpr);
    cv.style.width = S + "px";
    cv.style.height = S + "px";
    bgCache = null;
  }
  addEventListener("resize", resize);

  function buildBg() {
    const c = document.createElement("canvas");
    c.width = cv.width; c.height = cv.height;
    const g = c.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const lg = g.createLinearGradient(0, 0, S, S);
    lg.addColorStop(0, "#1c1a15"); lg.addColorStop(1, "#100f0c");
    g.fillStyle = lg; g.fillRect(0, 0, S, S);
    const rg = g.createRadialGradient(S / 2, S * 0.4, 10, S / 2, S / 2, S * 0.75);
    rg.addColorStop(0, "rgba(232,200,122,0.07)"); rg.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = rg; g.fillRect(0, 0, S, S);
    // checker tint + dots
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      if ((x + y) & 1) { g.fillStyle = "rgba(239,230,212,0.022)"; g.fillRect(x * cell, y * cell, cell, cell); }
      g.fillStyle = "rgba(239,230,212,0.08)";
      g.beginPath(); g.arc(x * cell + cell / 2, y * cell + cell / 2, Math.max(0.8, cell * 0.05), 0, 7); g.fill();
    }
    g.strokeStyle = "rgba(232,200,122,0.28)"; g.lineWidth = 2;
    g.strokeRect(1, 1, S - 2, S - 2);
    bgCache = c;
  }

  const rnd = (a, b) => a + Math.random() * (b - a);
  const lerp = (a, b, t) => a + (b - a) * t;
  function mix(c1, c2, t) {
    return "rgb(" + [0, 1, 2].map((i) => Math.round(lerp(c1[i], c2[i], t))).join(",") + ")";
  }
  const HEAD = [244, 222, 160], MID = [232, 200, 122], TAIL = [72, 150, 128];

  function occupied(x, y) { return body.some((p) => p.x === x && p.y === y); }
  function freeCell() {
    for (let i = 0; i < 400; i++) {
      const x = (Math.random() * N) | 0, y = (Math.random() * N) | 0;
      if (!occupied(x, y) && !(food && food.x === x && food.y === y) && !(bonus && bonus.x === x && bonus.y === y)) return { x, y };
    }
    return null;
  }

  function reset() {
    const cy = (N / 2) | 0;
    body = [{ x: 5, y: cy }, { x: 4, y: cy }, { x: 3, y: cy }];
    prev = body.map((p) => ({ ...p }));
    dir = "right"; queue = []; grow = 0;
    food = null; bonus = null; food = freeCell();
    eaten = 0; score = 0; level = 1; stepMs = START_STEP; acc = 0;
    timeLeft = ROUND; lastEat = -99; combo = 0; parts = []; floats = []; shake = 0;
    ended = false; clock = 0;
    hud();
  }

  function hud() {
    scEl.textContent = score;
    lenEl.textContent = body.length;
    tmEl.textContent = Math.max(0, Math.ceil(timeLeft));
  }

  function turn(d) {
    if (!running || ended || !DIRS[d]) return;
    const lastDir = queue.length ? queue[queue.length - 1] : dir;
    if (d === lastDir || d === OPP[lastDir]) return;
    if (queue.length < 3) queue.push(d);
  }

  function burst(x, y, color, n, sp) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = rnd(sp * 0.3, sp);
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, decay: rnd(1.4, 2.4), r: rnd(1.5, 3.8), c: color });
    }
  }
  function floatText(x, y, t, c) { floats.push({ x, y, t, c, life: 1 }); }
  function flashLevel(t) {
    lvlEl.textContent = t; lvlEl.classList.add("on");
    clearTimeout(flashLevel._t); flashLevel._t = setTimeout(() => lvlEl.classList.remove("on"), 900);
  }

  function step() {
    if (queue.length) dir = queue.shift();
    const [dx, dy] = DIRS[dir];
    const h = body[0];
    const nx = h.x + dx, ny = h.y + dy;
    // collision: walls or self (tail cell is free if not growing)
    const tailFree = grow === 0;
    const hitSelf = body.some((p, i) => p.x === nx && p.y === ny && !(tailFree && i === body.length - 1));
    if (nx < 0 || ny < 0 || nx >= N || ny >= N || hitSelf) { die(); return; }
    prev = body.map((p) => ({ ...p }));
    body.unshift({ x: nx, y: ny });
    if (grow > 0) grow--; else body.pop();
    const px = nx * cell + cell / 2, py = ny * cell + cell / 2;
    if (food && nx === food.x && ny === food.y) {
      eaten++;
      combo = clock - lastEat < 3.2 ? combo + 1 : 0;
      lastEat = clock;
      const gain = 10 + (level - 1) * 3 + combo * 5;
      score += gain; grow += 1;
      burst(px, py, CORAL, 18, 3.6); burst(px, py, CREAM, 8, 2.4);
      floatText(px, py - cell * 0.4, "+" + gain + (combo ? " 콤보" : ""), combo ? TEAL : CREAM);
      shake = 4;
      food = freeCell();
      if (eaten % 4 === 0) {
        level++;
        stepMs = Math.max(MIN_STEP, START_STEP - (level - 1) * 11);
        flashLevel("속도 UP · Lv." + level);
      }
      if (eaten % 5 === 0 && !bonus) { const c = freeCell(); if (c) bonus = { ...c, until: clock + 5 }; }
      try { navigator.vibrate && navigator.vibrate(12); } catch (_) {}
    } else if (bonus && nx === bonus.x && ny === bonus.y) {
      const gain = 50 + level * 5;
      score += gain; grow += 2; timeLeft = Math.min(ROUND, timeLeft + 3);
      burst(px, py, GOLD, 26, 4.4); burst(px, py, CREAM, 10, 2.6);
      floatText(px, py - cell * 0.4, "+" + gain + " · +3초", GOLD);
      shake = 6; bonus = null;
      try { navigator.vibrate && navigator.vibrate([10, 30, 10]); } catch (_) {}
    }
    hud();
  }

  function die() {
    deathAt = clock;
    const h = body[0];
    for (const p of body) burst(p.x * cell + cell / 2, p.y * cell + cell / 2, mix(MID, TAIL, Math.random()), 3, 2.6);
    burst(h.x * cell + cell / 2, h.y * cell + cell / 2, CORAL, 24, 4.8);
    shake = 10;
    try { navigator.vibrate && navigator.vibrate(60); } catch (_) {}
    endGame(false);
  }

  function endGame(timeUp) {
    if (ended) return;
    ended = true;
    const lenBonus = timeUp ? body.length * 5 : 0;
    score += lenBonus;
    hud();
    let neu = 0;
    if (score > best) { best = score; localStorage.setItem(BK, String(best)); bsEl.textContent = best; neu = 1; }
    setTimeout(() => {
      running = false;
      fn.textContent = String(score);
      nh.hidden = !neu;
      titleEl.textContent = timeUp ? "시간 종료!" : "꽝! 부딪혔어요";
      detailEl.textContent = `먹이 ${eaten}개 · 길이 ${body.length} · Lv.${level}` + (lenBonus ? ` · 길이 보너스 +${lenBonus}` : "");
      rankEl.textContent = "";
      rsO.hidden = false;
    }, timeUp ? 350 : 750);
    try {
      const p = window.MaeilGuest && window.MaeilGuest.postScore && window.MaeilGuest.postScore(G, score);
      p && p.then(() => window.MaeilGuest.fetchTop(G, 20)).then((d) => {
        if (!d) return;
        const me = (d.top || []).find((r) => r.mine);
        rankEl.textContent = me ? `현재 순위 ${me.rank}위 · 최고 ${me.score}점` : (d.mine != null ? `내 최고 ${d.mine}점` : "");
      }).catch(() => {});
    } catch (_) {}
  }

  // ---------- rendering ----------
  function segPos(i, t) {
    const a = prev[i] || body[i], b = body[i];
    return { x: (lerp(a.x, b.x, t) + 0.5) * cell, y: (lerp(a.y, b.y, t) + 0.5) * cell };
  }

  function drawSnake(t) {
    const n = body.length;
    const tt = ended ? 1 : t;
    const C = (p) => ({ x: (p.x + 0.5) * cell, y: (p.y + 0.5) * cell });
    // exact grid path (no corner cutting): moving head, fixed joints, retracting tail
    const pts = [segPos(0, tt)];
    for (let i = 1; i < n; i++) pts.push(C(body[i]));
    if (prev.length >= n && n > 1) {
      const a = body[n - 1], b = prev[n - 1];
      pts.push({ x: (lerp(a.x, b.x, 1 - tt) + 0.5) * cell, y: (lerp(a.y, b.y, 1 - tt) + 0.5) * cell });
    }
    const m = pts.length;
    const w = cell * 0.78;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    // soft shadow
    ctx.strokeStyle = "rgba(0,0,0,0.38)"; ctx.lineWidth = w;
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x + 2, p.y + 4) : ctx.moveTo(p.x + 2, p.y + 4))); ctx.stroke();
    // body gradient (tail -> head)
    for (let i = m - 1; i > 0; i--) {
      const k = i / Math.max(1, m - 1);
      const col = k < 0.35 ? mix(HEAD, MID, k / 0.35) : mix(MID, TAIL, (k - 0.35) / 0.65);
      ctx.strokeStyle = col;
      ctx.lineWidth = w * (1 - k * 0.28);
      ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[i - 1].x, pts[i - 1].y); ctx.stroke();
    }
    // inner darker belly stripe for depth
    ctx.strokeStyle = "rgba(20,19,17,0.16)"; ctx.lineWidth = w * 0.28;
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x + w * 0.16, p.y + w * 0.16) : ctx.moveTo(p.x + w * 0.16, p.y + w * 0.16))); ctx.stroke();
    // glossy highlight
    ctx.strokeStyle = "rgba(255,250,236,0.42)"; ctx.lineWidth = w * 0.2;
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x - w * 0.17, p.y - w * 0.17) : ctx.moveTo(p.x - w * 0.17, p.y - w * 0.17))); ctx.stroke();
    // head
    const h = pts[0];
    const [dx, dy] = DIRS[dir];
    const hg = ctx.createRadialGradient(h.x - w * 0.18, h.y - w * 0.2, 1, h.x, h.y, w * 0.62);
    hg.addColorStop(0, "#fff6dc"); hg.addColorStop(0.55, "rgb(" + HEAD.join(",") + ")"); hg.addColorStop(1, "#c8943a");
    ctx.fillStyle = hg;
    ctx.shadowColor = "rgba(232,200,122,0.55)"; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(h.x, h.y, w * 0.56, 0, 7); ctx.fill();
    ctx.shadowBlur = 0;
    // eyes
    const ex = -dy, ey = dx; // perpendicular
    const dead = ended && deathAt;
    for (const s of [-1, 1]) {
      const cx = h.x + dx * w * 0.16 + ex * s * w * 0.24, cy = h.y + dy * w * 0.16 + ey * s * w * 0.24;
      ctx.fillStyle = INK;
      if (dead) {
        ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.5, w * 0.07);
        const r = w * 0.09;
        ctx.beginPath(); ctx.moveTo(cx - r, cy - r); ctx.lineTo(cx + r, cy + r); ctx.moveTo(cx + r, cy - r); ctx.lineTo(cx - r, cy + r); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(cx, cy, w * 0.11, 0, 7); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(cx + dx * w * 0.03 - w * 0.03, cy + dy * w * 0.03 - w * 0.03, w * 0.04, 0, 7); ctx.fill();
      }
    }
  }

  function drawOrb(x, y, r, core, glow, pulse) {
    const R = r * (1 + 0.08 * Math.sin(pulse));
    const HR = R * (3.4 + 0.4 * Math.sin(pulse * 0.5));
    const halo = ctx.createRadialGradient(x, y, R * 0.3, x, y, HR);
    halo.addColorStop(0, glow); halo.addColorStop(0.45, "rgba(255,122,92,0.18)"); halo.addColorStop(1, "rgba(0,0,0,0)");
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(x, y, HR, 0, 7); ctx.fill(); ctx.restore();
    ctx.shadowColor = "rgba(255,140,100,0.9)"; ctx.shadowBlur = R * 1.6;
    const g = ctx.createRadialGradient(x - R * 0.35, y - R * 0.4, R * 0.1, x, y, R);
    g.addColorStop(0, "#fff4e6"); g.addColorStop(0.4, core); g.addColorStop(1, "rgba(120,40,20,0.95)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,255,255,0.75)"; ctx.beginPath(); ctx.arc(x - R * 0.35, y - R * 0.38, R * 0.2, 0, 7); ctx.fill();
  }

  function drawStar(x, y, r, rot) {
    const halo = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 2.8);
    halo.addColorStop(0, "rgba(232,200,122,0.6)"); halo.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(x, y, r * 2.8, 0, 7); ctx.fill();
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    const g = ctx.createLinearGradient(-r, -r, r, r); g.addColorStop(0, "#fff3cc"); g.addColorStop(1, "#c8943a");
    ctx.fillStyle = g; ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = (i * Math.PI) / 5 - Math.PI / 2, rr = i & 1 ? r * 0.45 : r; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill(); ctx.restore();
  }

  function render(t) {
    if (!bgCache) buildBg();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    const sx = shake ? rnd(-shake, shake) : 0, sy = shake ? rnd(-shake, shake) : 0;
    ctx.setTransform(dpr, 0, 0, dpr, sx * dpr, sy * dpr);
    ctx.drawImage(bgCache, 0, 0, S, S);
    if (food) drawOrb((food.x + 0.5) * cell, (food.y + 0.5) * cell, cell * 0.36, CORAL, "rgba(255,140,100,0.7)", clock * 6);
    if (bonus) {
      const left = bonus.until - clock;
      if (left > 1.5 || ((clock * 8) | 0) % 2 === 0) drawStar((bonus.x + 0.5) * cell, (bonus.y + 0.5) * cell, cell * 0.44, clock * 1.6);
    }
    if (body.length) drawSnake(t);
    // particles
    for (const p of parts) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.4 + p.life * 0.6), 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = "900 " + Math.round(cell * 0.62) + 'px "Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif';
    for (const f of floats) {
      ctx.globalAlpha = Math.max(0, f.life);
      ctx.lineWidth = 3; ctx.strokeStyle = "rgba(10,9,8,0.85)"; ctx.strokeText(f.t, f.x, f.y);
      ctx.fillStyle = f.c; ctx.fillText(f.t, f.x, f.y);
    }
    ctx.globalAlpha = 1;
    // timer bar
    ctx.fillStyle = "rgba(239,230,212,0.08)"; ctx.fillRect(6, S - 6, S - 12, 3);
    ctx.fillStyle = timeLeft < 10 ? CORAL : TEAL; ctx.fillRect(6, S - 6, (S - 12) * Math.max(0, timeLeft / ROUND), 3);
  }

  function frame(now) {
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000 || 0));
    last = now;
    clock += dt;
    if (running && !ended) {
      timeLeft -= dt;
      if (timeLeft <= 0) { timeLeft = 0; hud(); endGame(true); }
      else {
        acc += dt * 1000;
        let guard = 0;
        while (acc >= stepMs && !ended && guard++ < 4) { acc -= stepMs; step(); }
        const tl = Math.ceil(timeLeft);
        if (tmEl.textContent !== String(tl)) tmEl.textContent = tl;
      }
      if (bonus && clock > bonus.until) bonus = null;
    }
    for (const p of parts) { p.x += p.vx; p.y += p.vy; p.vx *= 0.94; p.vy *= 0.94; p.life -= p.decay * dt; }
    parts = parts.filter((p) => p.life > 0);
    for (const f of floats) { f.y -= 28 * dt; f.life -= 1.3 * dt; }
    floats = floats.filter((f) => f.life > 0);
    if (shake) shake = Math.max(0, shake - 40 * dt);
    render(ended || !running ? 1 : Math.min(1, acc / stepMs));
    requestAnimationFrame(frame);
  }

  // ---------- input ----------
  addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    const map = { arrowup: "up", w: "up", arrowdown: "down", s: "down", arrowleft: "left", a: "left", arrowright: "right", d: "right" };
    if (map[k]) {
      if (e.target && e.target.tagName === "INPUT") return;
      e.preventDefault();
      turn(map[k]);
    } else if ((k === " " || k === "enter") && !running && e.target.tagName !== "INPUT") {
      e.preventDefault(); start();
    }
  });
  document.querySelectorAll(".pd").forEach((b) => {
    b.addEventListener("pointerdown", (e) => {
      e.preventDefault(); turn(b.dataset.d);
      b.classList.add("hit"); setTimeout(() => b.classList.remove("hit"), 110);
    });
  });
  let sw = null;
  const wrap = $("wrap");
  wrap.addEventListener("pointerdown", (e) => {
    if (!running || e.target.closest(".pd,button,a,input")) return;
    sw = { x: e.clientX, y: e.clientY, id: e.pointerId };
  });
  wrap.addEventListener("pointermove", (e) => {
    if (!sw || e.pointerId !== sw.id) return;
    const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
    turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
    sw.x = e.clientX; sw.y = e.clientY; // allow chained swipes in one drag
  });
  const endSw = () => (sw = null);
  wrap.addEventListener("pointerup", endSw);
  wrap.addEventListener("pointercancel", endSw);
  document.addEventListener("touchmove", (e) => { if (running && !e.target.closest("input")) e.preventDefault(); }, { passive: false });
  document.addEventListener("visibilitychange", () => { last = performance.now(); });

  function start() {
    resize(); reset();
    running = true;
    stO.hidden = true; rsO.hidden = true; nh.hidden = true;
    acc = 0; last = performance.now();
    flashLevel("출발!");
  }
  play.onclick = start;
  again.onclick = start;
  fav && (fav.onclick = () => {
    try {
      const k = "maeil-favs", a = JSON.parse(localStorage.getItem(k) || "[]");
      if (!a.includes(G)) a.push(G);
      localStorage.setItem(k, JSON.stringify(a)); fav.textContent = "★";
    } catch (_) {}
  });
  try { if (JSON.parse(localStorage.getItem("maeil-favs") || "[]").includes(G)) fav.textContent = "★"; } catch (_) {}

  if (/[?&]debug\b/.test(location.search)) window.__snk = () => ({ body, food, bonus, dir, level, stepMs, score, running, ended });
  resize(); reset();
  if (document.fonts && document.fonts.load) document.fonts.load('900 16px "Noto Sans KR"').catch(() => {});
  last = performance.now();
  requestAnimationFrame(frame);
})();
