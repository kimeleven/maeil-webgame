(() => {
  const G = "014-minesweeper";
  const BK = "maeil-best-014";
  const ROWS = 9;
  const COLS = 9;
  const MINE_COUNT = 10;
  const CREAM = "#efe6d4";
  const GOLD = "#e8c87a";
  const TEAL = "#7ddec0";

  const boardEl = document.getElementById("board");
  const scEl = document.getElementById("score");
  const mineEl = document.getElementById("mines");
  const tmEl = document.getElementById("time");
  const bsEl = document.getElementById("best");
  const stO = document.getElementById("start");
  const rsO = document.getElementById("results");
  const fn = document.getElementById("final-score");
  const nh = document.getElementById("new-high");
  const detailEl = document.getElementById("result-detail");
  const titleEl = document.getElementById("result-title");
  const play = document.getElementById("btn-play");
  const again = document.getElementById("btn-again");
  const fav = document.getElementById("btn-fav");
  const modeBtn = document.getElementById("btn-mode");
  const resetBtn = document.getElementById("btn-reset");
  const fx = document.getElementById("fx");
  const fxCtx = fx.getContext("2d");

  let best = +localStorage.getItem(BK) || 0;
  bsEl.textContent = best;

  let cells = [];
  let grid = [];
  let started = false;
  let ended = false;
  let flagMode = false;
  let flags = 0;
  let wrongFlags = 0;
  let revealed = 0;
  let score = 0;
  let seconds = 0;
  let timerId = null;
  let firstClick = true;
  let parts = [];
  let fxRaf = 0;
  let longTimer = null;
  let longFired = false;
  const LONG_MS = 420;

  boardEl.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
  boardEl.style.gridTemplateRows = `repeat(${ROWS}, 1fr)`;

  function resizeFx() {
    const r = fx.parentElement.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    fx.width = r.width * dpr;
    fx.height = r.height * dpr;
    fx.style.width = r.width + "px";
    fx.style.height = r.height + "px";
    fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  addEventListener("resize", resizeFx);
  resizeFx();

  function rnd(a, b) {
    return a + Math.random() * (b - a);
  }

  function burst(px, py, color, n, spread) {
    for (let i = 0; i < n; i++) {
      parts.push({
        x: px,
        y: py,
        vx: rnd(-spread, spread),
        vy: rnd(-spread * 1.1, -0.4),
        life: 1,
        c: color,
        r: rnd(1.4, 3.6),
        g: rnd(10, 22),
      });
    }
    if (!fxRaf) fxRaf = requestAnimationFrame(tickFx);
  }

  function tickFx() {
    const W = fx.clientWidth;
    const H = fx.clientHeight;
    fxCtx.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.g * 0.012;
      p.life -= 0.028;
      p.r *= 0.985;
      fxCtx.globalAlpha = Math.max(0, p.life);
      fxCtx.fillStyle = p.c;
      fxCtx.beginPath();
      fxCtx.arc(p.x, p.y, p.r, 0, 7);
      fxCtx.fill();
    }
    fxCtx.globalAlpha = 1;
    parts = parts.filter((p) => p.life > 0);
    if (parts.length) fxRaf = requestAnimationFrame(tickFx);
    else fxRaf = 0;
  }

  function cellCenter(r, c) {
    const el = cells[r * COLS + c];
    if (!el) return { x: 0, y: 0 };
    const br = boardEl.getBoundingClientRect();
    const wr = fx.parentElement.getBoundingClientRect();
    const cr = el.getBoundingClientRect();
    return {
      x: cr.left - wr.left + cr.width / 2,
      y: cr.top - wr.top + cr.height / 2,
    };
  }

  function idx(r, c) {
    return r * COLS + c;
  }

  function inBound(r, c) {
    return r >= 0 && r < ROWS && c >= 0 && c < COLS;
  }

  function neighbors(r, c) {
    const out = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const rr = r + dr;
        const cc = c + dc;
        if (inBound(rr, cc)) out.push([rr, cc]);
      }
    }
    return out;
  }

  function placeMines(safeR, safeC) {
    const forbidden = new Set();
    forbidden.add(idx(safeR, safeC));
    for (const [rr, cc] of neighbors(safeR, safeC)) forbidden.add(idx(rr, cc));
    let placed = 0;
    while (placed < MINE_COUNT) {
      const r = (Math.random() * ROWS) | 0;
      const c = (Math.random() * COLS) | 0;
      const i = idx(r, c);
      if (forbidden.has(i) || grid[i].mine) continue;
      grid[i].mine = true;
      placed++;
    }
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const i = idx(r, c);
        if (grid[i].mine) {
          grid[i].n = -1;
          continue;
        }
        let n = 0;
        for (const [rr, cc] of neighbors(r, c)) if (grid[idx(rr, cc)].mine) n++;
        grid[i].n = n;
      }
    }
  }

  function buildBoard() {
    boardEl.innerHTML = "";
    cells = [];
    grid = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        grid.push({ mine: false, n: 0, open: false, flag: false });
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "cell";
        btn.setAttribute("role", "gridcell");
        btn.setAttribute("aria-label", `${r + 1}행 ${c + 1}열`);
        btn.dataset.r = String(r);
        btn.dataset.c = String(c);
        bindCell(btn, r, c);
        boardEl.appendChild(btn);
        cells.push(btn);
      }
    }
  }

  function bindCell(btn, r, c) {
    btn.addEventListener("pointerdown", (e) => {
      if (ended || !started) return;
      e.preventDefault();
      longFired = false;
      try {
        btn.setPointerCapture(e.pointerId);
      } catch (_) {}
      longTimer = setTimeout(() => {
        longFired = true;
        toggleFlag(r, c);
        try {
          if (navigator.vibrate) navigator.vibrate(18);
        } catch (_) {}
      }, LONG_MS);
    });
    const clearLong = () => {
      if (longTimer) {
        clearTimeout(longTimer);
        longTimer = null;
      }
    };
    btn.addEventListener("pointerup", (e) => {
      clearLong();
      if (ended || !started) return;
      if (longFired) return;
      if (flagMode) toggleFlag(r, c);
      else reveal(r, c);
    });
    btn.addEventListener("pointercancel", clearLong);
    btn.addEventListener("pointerleave", clearLong);
    btn.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      if (ended || !started) return;
      toggleFlag(r, c);
    });
  }

  function paintCell(r, c) {
    const i = idx(r, c);
    const g = grid[i];
    const el = cells[i];
    el.className = "cell";
    el.textContent = "";
    if (g.flag && !g.open) {
      el.classList.add("flag");
      el.textContent = "🚩";
      return;
    }
    if (!g.open) return;
    el.classList.add("open");
    if (g.mine) {
      el.classList.add(g.hit ? "mine-hit" : "mine-show");
      el.textContent = "💣";
      return;
    }
    if (g.n > 0) {
      el.classList.add("n" + g.n);
      el.textContent = String(g.n);
    }
  }

  function updateHud() {
    const left = Math.max(0, MINE_COUNT - flags);
    mineEl.textContent = String(left);
    scEl.textContent = String(score);
    tmEl.textContent = String(seconds);
  }

  function startTimer() {
    if (timerId) return;
    timerId = setInterval(() => {
      if (ended) return;
      seconds++;
      tmEl.textContent = String(seconds);
      // mild time pressure on live score preview
      score = Math.max(0, liveScore());
      scEl.textContent = String(score);
    }, 1000);
  }

  function stopTimer() {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function liveScore() {
    const opened = revealed;
    const timePen = seconds * 6;
    const flagPen = wrongFlags * 40;
    const base = opened * 18;
    return Math.max(0, base - timePen - flagPen);
  }

  function toggleFlag(r, c) {
    const i = idx(r, c);
    const g = grid[i];
    if (g.open) return;
    g.flag = !g.flag;
    if (g.flag) {
      flags++;
      if (!g.mine) wrongFlags++;
      const p = cellCenter(r, c);
      burst(p.x, p.y, GOLD, 8, 2.2);
    } else {
      flags = Math.max(0, flags - 1);
      if (!g.mine) wrongFlags = Math.max(0, wrongFlags - 1);
    }
    paintCell(r, c);
    updateHud();
  }

  function reveal(r, c) {
    const i = idx(r, c);
    const g = grid[i];
    if (g.open || g.flag) return;

    if (firstClick) {
      firstClick = false;
      placeMines(r, c);
      startTimer();
    }

    if (g.mine) {
      g.open = true;
      g.hit = true;
      paintCell(r, c);
      const p = cellCenter(r, c);
      burst(p.x, p.y, "#ff6a4a", 28, 4.5);
      burst(p.x, p.y, GOLD, 14, 3);
      revealAllMines();
      endGame(false);
      return;
    }

    flood(r, c);
    score = liveScore();
    updateHud();
    checkWin();
  }

  function flood(sr, sc) {
    const stack = [[sr, sc]];
    while (stack.length) {
      const [r, c] = stack.pop();
      const i = idx(r, c);
      const g = grid[i];
      if (!inBound(r, c) || g.open || g.flag || g.mine) continue;
      g.open = true;
      revealed++;
      paintCell(r, c);
      const p = cellCenter(r, c);
      if (g.n === 0) {
        burst(p.x, p.y, TEAL, 6, 1.8);
        burst(p.x, p.y, CREAM, 4, 1.4);
        for (const [rr, cc] of neighbors(r, c)) stack.push([rr, cc]);
      } else {
        burst(p.x, p.y, GOLD, 5, 1.6);
      }
    }
  }

  function revealAllMines() {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const g = grid[idx(r, c)];
        if (g.mine) {
          g.open = true;
          paintCell(r, c);
        } else if (g.flag) {
          cells[idx(r, c)].classList.add("wrong");
        }
      }
    }
  }

  function checkWin() {
    const safe = ROWS * COLS - MINE_COUNT;
    if (revealed < safe) return;
    // auto-flag remaining mines for polish
    for (let i = 0; i < grid.length; i++) {
      if (grid[i].mine && !grid[i].flag) {
        grid[i].flag = true;
        flags++;
        paintCell((i / COLS) | 0, i % COLS);
      }
    }
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const p = cellCenter(r, c);
        if (((r + c) & 1) === 0) burst(p.x, p.y, GOLD, 3, 2);
      }
    }
    endGame(true);
  }

  function finalScore(won) {
    const opened = revealed;
    const timePen = seconds * 6;
    const flagPen = wrongFlags * 40;
    let s = opened * 18 - timePen - flagPen;
    if (won) {
      const speedBonus = Math.max(0, 900 - seconds * 12);
      const cleanBonus = Math.max(0, 200 - wrongFlags * 50);
      s += 500 + speedBonus + cleanBonus;
    } else {
      s = Math.max(0, Math.floor(s * 0.55));
    }
    return Math.max(0, Math.round(s));
  }

  function endGame(won) {
    if (ended) return;
    ended = true;
    stopTimer();
    score = finalScore(won);
    scEl.textContent = String(score);
    updateHud();

    let neu = 0;
    if (score > best) {
      best = score;
      localStorage.setItem(BK, String(best));
      bsEl.textContent = best;
      neu = 1;
    }
    fn.textContent = String(score);
    if (nh) nh.hidden = !neu;
    titleEl.textContent = won ? "클리어!" : "지뢰 폭발";
    detailEl.textContent = won
      ? `${seconds}초 · 오깃발 ${wrongFlags}`
      : `부분 점수 · ${seconds}초 · 연 ${revealed}`;
    rsO.hidden = false;

    try {
      fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: G, score }),
      });
    } catch (e) {}
    try {
      window.MaeilGuest &&
        window.MaeilGuest.postScore &&
        window.MaeilGuest.postScore(G, score);
    } catch (e) {}
  }

  function resetRound(keepOverlay) {
    stopTimer();
    started = true;
    ended = false;
    flagMode = false;
    flags = 0;
    wrongFlags = 0;
    revealed = 0;
    score = 0;
    seconds = 0;
    firstClick = true;
    parts = [];
    modeBtn.classList.remove("on");
    modeBtn.setAttribute("aria-pressed", "false");
    modeBtn.textContent = "🚩 깃발 모드";
    updateHud();
    buildBoard();
    if (!keepOverlay) {
      stO.hidden = true;
      rsO.hidden = true;
      if (nh) nh.hidden = true;
    }
  }

  function start() {
    resetRound(false);
  }

  modeBtn.onclick = () => {
    flagMode = !flagMode;
    modeBtn.classList.toggle("on", flagMode);
    modeBtn.setAttribute("aria-pressed", flagMode ? "true" : "false");
    modeBtn.textContent = flagMode ? "🚩 깃발 ON" : "🚩 깃발 모드";
  };
  resetBtn.onclick = () => {
    if (!started) return;
    start();
  };
  play.onclick = start;
  again.onclick = start;
  fav &&
    (fav.onclick = () => {
      try {
        const k = "maeil-favs";
        const a = JSON.parse(localStorage.getItem(k) || "[]");
        if (!a.includes(G)) a.push(G);
        localStorage.setItem(k, JSON.stringify(a));
        fav.textContent = "★";
      } catch (e) {}
    });

  // idle board preview behind start overlay
  buildBoard();
  updateHud();
})();
