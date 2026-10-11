(() => {
  "use strict";
  const G = "016-omok";
  const BK = "maeil-best-016";
  const N = 15;
  const EMPTY = 0, PLAYER = 1, AI = 2;
  const INK = "#141311", CREAM = "#efe6d4", GOLD = "#e8c87a", TEAL = "#7ddec0";
  const DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]];

  const $ = (id) => document.getElementById(id);
  const cv = $("game"), ctx = cv.getContext("2d");
  const stage = $("stage");
  const fx = $("fx"), fxCtx = fx.getContext("2d");
  const scEl = $("score"), mvEl = $("moves"), tmEl = $("time"), bsEl = $("best");
  const stO = $("start"), rsO = $("results"), fn = $("final-score"), nh = $("new-high");
  const detailEl = $("result-detail"), titleEl = $("result-title"), rankEl = $("rank-line");
  const play = $("btn-play"), again = $("btn-again"), fav = $("btn-fav");

  let best = +localStorage.getItem(BK) || 0;
  bsEl.textContent = best;

  let S = 0, dpr = 1, pad = 0, cell = 0;
  let board = [];
  let started = false, ended = false, thinking = false;
  let moves = 0, score = 0, seconds = 0, timerId = null, t0 = 0;
  let winLine = null, hover = null, lastMove = null;
  let parts = [], fxRaf = 0, animRaf = 0;
  let placePulse = null; // {x,y,t,who}

  function resize() {
    const r = stage.getBoundingClientRect();
    const size = Math.max(220, Math.floor(Math.min(r.width - 8, r.height - 8, 460)));
    dpr = Math.min(devicePixelRatio || 1, 2);
    S = size;
    pad = S * 0.06;
    cell = (S - pad * 2) / (N - 1);
    cv.width = Math.round(S * dpr);
    cv.height = Math.round(S * dpr);
    cv.style.width = S + "px";
    cv.style.height = S + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    resizeFx();
    draw();
  }
  function resizeFx() {
    const r = fx.parentElement.getBoundingClientRect();
    const d = Math.min(devicePixelRatio || 1, 2);
    fx.width = r.width * d;
    fx.height = r.height * d;
    fx.style.width = r.width + "px";
    fx.style.height = r.height + "px";
    fxCtx.setTransform(d, 0, 0, d, 0, 0);
  }
  addEventListener("resize", resize);

  const rnd = (a, b) => a + Math.random() * (b - a);
  function idx(r, c) { return r * N + c; }
  function inBound(r, c) { return r >= 0 && r < N && c >= 0 && c < N; }
  function xy(r, c) { return { x: pad + c * cell, y: pad + r * cell }; }

  function burst(px, py, color, n, spread) {
    for (let i = 0; i < n; i++) {
      parts.push({
        x: px, y: py,
        vx: rnd(-spread, spread), vy: rnd(-spread * 1.1, -0.3),
        life: 1, c: color, r: rnd(1.5, 3.8), g: rnd(10, 22),
      });
    }
    if (!fxRaf) fxRaf = requestAnimationFrame(tickFx);
  }
  function tickFx() {
    const W = fx.clientWidth, H = fx.clientHeight;
    fxCtx.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy; p.vy += p.g * 0.012; p.life -= 0.026; p.r *= 0.985;
      fxCtx.globalAlpha = Math.max(0, p.life);
      fxCtx.fillStyle = p.c;
      fxCtx.beginPath(); fxCtx.arc(p.x, p.y, p.r, 0, 7); fxCtx.fill();
    }
    fxCtx.globalAlpha = 1;
    parts = parts.filter((p) => p.life > 0);
    fxRaf = parts.length ? requestAnimationFrame(tickFx) : 0;
  }
  function boardToFx(r, c) {
    const p = xy(r, c);
    const br = cv.getBoundingClientRect();
    const wr = fx.parentElement.getBoundingClientRect();
    return { x: br.left - wr.left + p.x, y: br.top - wr.top + p.y };
  }

  function emptyBoard() {
    board = new Array(N * N).fill(EMPTY);
  }

  function countDir(r, c, dr, dc, who) {
    let n = 0;
    let rr = r + dr, cc = c + dc;
    while (inBound(rr, cc) && board[idx(rr, cc)] === who) { n++; rr += dr; cc += dc; }
    return n;
  }

  function lineLen(r, c, who) {
    let best = 1;
    for (const [dr, dc] of DIRS) {
      const len = 1 + countDir(r, c, dr, dc, who) + countDir(r, c, -dr, -dc, who);
      if (len > best) best = len;
    }
    return best;
  }

  function findWinLine(r, c, who) {
    for (const [dr, dc] of DIRS) {
      const cells = [[r, c]];
      let rr = r + dr, cc = c + dc;
      while (inBound(rr, cc) && board[idx(rr, cc)] === who) { cells.push([rr, cc]); rr += dr; cc += dc; }
      rr = r - dr; cc = c - dc;
      while (inBound(rr, cc) && board[idx(rr, cc)] === who) { cells.unshift([rr, cc]); rr -= dr; cc -= dc; }
      if (cells.length >= 5) return cells.slice(0, 5);
    }
    return null;
  }

  function longestLine(who) {
    let best = 0;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      if (board[idx(r, c)] !== who) continue;
      for (const [dr, dc] of DIRS) {
        // only start of a run
        const pr = r - dr, pc = c - dc;
        if (inBound(pr, pc) && board[idx(pr, pc)] === who) continue;
        let len = 0, rr = r, cc = c;
        while (inBound(rr, cc) && board[idx(rr, cc)] === who) { len++; rr += dr; cc += dc; }
        if (len > best) best = len;
      }
    }
    return best;
  }

  // Threat: open-ended patterns for AI scoring
  function evaluatePoint(r, c, who) {
    if (board[idx(r, c)] !== EMPTY) return -1e9;
    board[idx(r, c)] = who;
    let score = 0;
    const opp = who === PLAYER ? AI : PLAYER;
    const centerBias = 7.5 - Math.max(Math.abs(r - 7), Math.abs(c - 7));
    score += centerBias * 2;

    for (const [dr, dc] of DIRS) {
      const a = countDir(r, c, dr, dc, who);
      const b = countDir(r, c, -dr, -dc, who);
      const len = 1 + a + b;
      const oa = inBound(r + (a + 1) * dr, c + (a + 1) * dc) && board[idx(r + (a + 1) * dr, c + (a + 1) * dc)] === EMPTY;
      const ob = inBound(r - (b + 1) * dr, c - (b + 1) * dc) && board[idx(r - (b + 1) * dr, c - (b + 1) * dc)] === EMPTY;
      const open = (oa ? 1 : 0) + (ob ? 1 : 0);
      if (len >= 5) score += 100000;
      else if (len === 4 && open >= 1) score += 12000;
      else if (len === 4) score += 2500;
      else if (len === 3 && open === 2) score += 1800;
      else if (len === 3 && open === 1) score += 400;
      else if (len === 2 && open === 2) score += 120;
      else if (len === 2 && open === 1) score += 30;
      else if (len === 1 && open === 2) score += 8;
    }
    board[idx(r, c)] = EMPTY;
    return score;
  }

  function candidateMoves() {
    const set = new Set();
    let any = false;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      if (board[idx(r, c)] === EMPTY) continue;
      any = true;
      for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) {
        const rr = r + dr, cc = c + dc;
        if (inBound(rr, cc) && board[idx(rr, cc)] === EMPTY) set.add(idx(rr, cc));
      }
    }
    if (!any) return [[7, 7]];
    const out = [];
    for (const i of set) out.push([(i / N) | 0, i % N]);
    return out;
  }

  function pickAI() {
    const cands = candidateMoves();
    // Priority: win now > block opponent win > best attack/defense combo
    let bestWin = null, bestBlock = null, bestScore = -1e18, bestMove = cands[0];

    for (const [r, c] of cands) {
      // can AI win?
      board[idx(r, c)] = AI;
      const win = findWinLine(r, c, AI);
      board[idx(r, c)] = EMPTY;
      if (win) return [r, c];

      // would player win here?
      board[idx(r, c)] = PLAYER;
      const pwin = findWinLine(r, c, PLAYER);
      board[idx(r, c)] = EMPTY;
      if (pwin && !bestBlock) bestBlock = [r, c];

      const atk = evaluatePoint(r, c, AI);
      const def = evaluatePoint(r, c, PLAYER);
      const s = atk + def * 0.95 + rnd(-3, 3);
      if (s > bestScore) { bestScore = s; bestMove = [r, c]; }
    }
    if (bestBlock) {
      // if we can make a stronger open-four ourselves prefer attack, else block
      const [br, bc] = bestBlock;
      const blockVal = evaluatePoint(br, bc, PLAYER);
      if (blockVal >= 10000 || bestScore < 10000) return bestBlock;
    }
    return bestMove;
  }

  function drawBoardBg() {
    const lg = ctx.createLinearGradient(0, 0, S, S);
    lg.addColorStop(0, "#3a2e1e");
    lg.addColorStop(0.45, "#2c2216");
    lg.addColorStop(1, "#1e1810");
    ctx.fillStyle = lg;
    ctx.fillRect(0, 0, S, S);
    // wood grain soft stripes
    ctx.globalAlpha = 0.06;
    for (let i = 0; i < 18; i++) {
      ctx.fillStyle = i % 2 ? "#efe6d4" : "#000";
      ctx.fillRect(0, (S / 18) * i, S, S / 36);
    }
    ctx.globalAlpha = 1;
    // outer rim
    ctx.strokeStyle = "rgba(232,200,122,0.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(1.5, 1.5, S - 3, S - 3);
    // grid lines
    ctx.strokeStyle = "rgba(20,19,17,0.55)";
    ctx.lineWidth = 1.15;
    for (let i = 0; i < N; i++) {
      const p = pad + i * cell;
      ctx.beginPath(); ctx.moveTo(pad, p); ctx.lineTo(pad + (N - 1) * cell, p); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(p, pad); ctx.lineTo(p, pad + (N - 1) * cell); ctx.stroke();
    }
    // star points
    const stars = [[3, 3], [3, 11], [7, 7], [11, 3], [11, 11]];
    ctx.fillStyle = "rgba(20,19,17,0.7)";
    for (const [r, c] of stars) {
      const p = xy(r, c);
      ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(2.2, cell * 0.12), 0, 7); ctx.fill();
    }
  }

  function drawStone(r, c, who, pulse) {
    const p = xy(r, c);
    const rad = cell * 0.42 * (pulse || 1);
    const isP = who === PLAYER;
    // shadow
    ctx.beginPath();
    ctx.arc(p.x + 1.2, p.y + 1.8, rad, 0, 7);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fill();
    // body
    const g = ctx.createRadialGradient(p.x - rad * 0.35, p.y - rad * 0.4, rad * 0.1, p.x, p.y, rad);
    if (isP) {
      g.addColorStop(0, "#fff8ec");
      g.addColorStop(0.55, "#efe6d4");
      g.addColorStop(1, "#c9bda6");
    } else {
      g.addColorStop(0, "#3a3630");
      g.addColorStop(0.55, "#1c1a16");
      g.addColorStop(1, "#0a0908");
    }
    ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, 7); ctx.fillStyle = g; ctx.fill();
    // rim
    ctx.strokeStyle = isP ? "rgba(201,189,166,0.7)" : "rgba(0,0,0,0.55)";
    ctx.lineWidth = 1;
    ctx.stroke();
    // highlight
    ctx.beginPath();
    ctx.ellipse(p.x - rad * 0.28, p.y - rad * 0.32, rad * 0.35, rad * 0.22, -0.4, 0, 7);
    ctx.fillStyle = isP ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.12)";
    ctx.fill();
  }

  function draw() {
    drawBoardBg();
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const v = board[idx(r, c)];
      if (v === EMPTY) continue;
      let pulse = 1;
      if (placePulse && placePulse.r === r && placePulse.c === c) {
        pulse = 0.7 + 0.3 * Math.min(1, placePulse.t / 0.18);
      }
      drawStone(r, c, v, pulse);
    }
    // last move marker
    if (lastMove) {
      const p = xy(lastMove.r, lastMove.c);
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(2, cell * 0.1), 0, 7);
      ctx.fillStyle = GOLD;
      ctx.fill();
    }
    // hover ghost
    if (hover && started && !ended && !thinking) {
      const [hr, hc] = hover;
      if (board[idx(hr, hc)] === EMPTY) {
        const p = xy(hr, hc);
        ctx.beginPath();
        ctx.arc(p.x, p.y, cell * 0.38, 0, 7);
        ctx.fillStyle = "rgba(239,230,212,0.28)";
        ctx.fill();
      }
    }
    // win line highlight
    if (winLine) {
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = Math.max(3, cell * 0.14);
      ctx.lineCap = "round";
      ctx.beginPath();
      const a = xy(winLine[0][0], winLine[0][1]);
      const b = xy(winLine[winLine.length - 1][0], winLine[winLine.length - 1][1]);
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
  }

  function tickAnim(ts) {
    if (placePulse) {
      placePulse.t += 0.016;
      if (placePulse.t > 0.25) placePulse = null;
      draw();
    }
    if (placePulse || winLine) animRaf = requestAnimationFrame(tickAnim);
    else animRaf = 0;
  }

  function hud() {
    scEl.textContent = String(score);
    mvEl.textContent = String(moves);
    tmEl.textContent = String(seconds);
  }

  function startTimer() {
    if (timerId) return;
    t0 = performance.now();
    timerId = setInterval(() => {
      if (ended) return;
      seconds = Math.floor((performance.now() - t0) / 1000);
      // live preview: remaining empty bonus estimate for wins only shown on end
      tmEl.textContent = String(seconds);
    }, 250);
  }
  function stopTimer() {
    if (timerId) { clearInterval(timerId); timerId = null; }
  }

  function emptyCount() {
    let n = 0;
    for (let i = 0; i < board.length; i++) if (board[i] === EMPTY) n++;
    return n;
  }

  function calcScore(result) {
    // result: 'win' | 'lose' | 'draw'
    const empty = emptyCount();
    const longest = longestLine(PLAYER);
    if (result === "win") {
      const emptyBonus = empty * 8;
      const speedBonus = Math.max(0, 900 - seconds * 10);
      const moveBonus = Math.max(0, 400 - moves * 4);
      return Math.round(1000 + emptyBonus + speedBonus + moveBonus);
    }
    if (result === "draw") {
      return Math.round(200 + longest * 40 + Math.max(0, 100 - seconds));
    }
    // lose: partial by longest player line
    return Math.round(Math.max(0, longest * 80 + moves * 3 - seconds * 2));
  }

  function endGame(result) {
    if (ended) return;
    ended = true;
    stopTimer();
    score = calcScore(result);
    hud();
    let neu = 0;
    if (score > best) {
      best = score;
      localStorage.setItem(BK, String(best));
      bsEl.textContent = best;
      neu = 1;
    }
    fn.textContent = String(score);
    if (nh) nh.hidden = !neu;
    if (result === "win") {
      titleEl.textContent = "승리!";
      detailEl.textContent = `${moves}수 · ${seconds}초 · 빈칸 ${emptyCount()}`;
      // celebration particles
      for (const [r, c] of (winLine || [])) {
        const p = boardToFx(r, c);
        burst(p.x, p.y, GOLD, 14, 3.5);
        burst(p.x, p.y, CREAM, 8, 2.5);
      }
    } else if (result === "draw") {
      titleEl.textContent = "무승부";
      detailEl.textContent = `${moves}수 · ${seconds}초`;
    } else {
      titleEl.textContent = "패배";
      detailEl.textContent = `최장 ${longestLine(PLAYER)}줄 · ${moves}수 · ${seconds}초`;
    }
    if (rankEl) rankEl.textContent = "";
    rsO.hidden = false;
    try {
      fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: G, score }),
      });
    } catch (e) {}
    try {
      window.MaeilGuest && window.MaeilGuest.postScore && window.MaeilGuest.postScore(G, score);
    } catch (e) {}
    draw();
    if (!animRaf) animRaf = requestAnimationFrame(tickAnim);
  }

  function place(r, c, who) {
    board[idx(r, c)] = who;
    lastMove = { r, c };
    moves++;
    placePulse = { r, c, t: 0, who };
    const p = boardToFx(r, c);
    burst(p.x, p.y, who === PLAYER ? CREAM : "#3a3630", 10, 2.4);
    burst(p.x, p.y, GOLD, 5, 1.8);
    score = Math.max(score, moves * 5);
    hud();
    draw();
    if (!animRaf) animRaf = requestAnimationFrame(tickAnim);
    const wl = findWinLine(r, c, who);
    if (wl) {
      winLine = wl;
      endGame(who === PLAYER ? "win" : "lose");
      return true;
    }
    if (emptyCount() === 0) {
      endGame("draw");
      return true;
    }
    return false;
  }

  function aiTurn() {
    if (ended) return;
    thinking = true;
    draw();
    setTimeout(() => {
      if (ended) { thinking = false; return; }
      const [r, c] = pickAI();
      thinking = false;
      place(r, c, AI);
    }, 180 + Math.random() * 160);
  }

  function cellFromEvent(e) {
    const rect = cv.getBoundingClientRect();
    const x = ((e.clientX ?? e.touches?.[0]?.clientX) - rect.left) * (S / rect.width);
    const y = ((e.clientY ?? e.touches?.[0]?.clientY) - rect.top) * (S / rect.height);
    const c = Math.round((x - pad) / cell);
    const r = Math.round((y - pad) / cell);
    if (!inBound(r, c)) return null;
    return [r, c];
  }

  cv.addEventListener("pointerdown", (e) => {
    if (!started || ended || thinking) return;
    e.preventDefault();
    const pos = cellFromEvent(e);
    if (!pos) return;
    const [r, c] = pos;
    if (board[idx(r, c)] !== EMPTY) return;
    const done = place(r, c, PLAYER);
    if (!done) aiTurn();
  });
  cv.addEventListener("pointermove", (e) => {
    if (!started || ended) return;
    const pos = cellFromEvent(e);
    hover = pos;
    draw();
  });
  cv.addEventListener("pointerleave", () => { hover = null; draw(); });

  function start() {
    stopTimer();
    emptyBoard();
    started = true;
    ended = false;
    thinking = false;
    moves = 0;
    score = 0;
    seconds = 0;
    winLine = null;
    lastMove = null;
    placePulse = null;
    hover = null;
    parts = [];
    stO.hidden = true;
    rsO.hidden = true;
    if (nh) nh.hidden = true;
    if (rankEl) rankEl.textContent = "";
    hud();
    startTimer();
    draw();
  }

  play.onclick = start;
  again.onclick = start;
  fav && (fav.onclick = () => {
    try {
      const k = "maeil-favs";
      const a = JSON.parse(localStorage.getItem(k) || "[]");
      if (!a.includes(G)) a.push(G);
      localStorage.setItem(k, JSON.stringify(a));
      fav.textContent = "★";
    } catch (e) {}
  });

  emptyBoard();
  resize();
  // idle preview: a few stones
  const demo = [[7,7,AI],[7,8,PLAYER],[6,7,PLAYER],[8,7,AI],[7,6,PLAYER],[7,9,AI]];
  for (const [r, c, w] of demo) board[idx(r, c)] = w;
  lastMove = { r: 7, c: 9 };
  draw();
})();
