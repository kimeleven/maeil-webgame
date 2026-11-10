// 오늘의 지뢰찾기 UI (t_2d0c7a9f). 첫 클릭 0 보장, 모바일 길게 누르기=깃발, 깃발 모드, 더블탭/숫자 탭=주변 열기.
import { MINE_LEVELS, placeMines, countAdj, openCell, minesWon, neighbors, kstDate, streakAfterSolve, streakShown, fmtTime, shareMines } from '/js/puzzle-core.js';

const $ = (s, r = document) => r.querySelector(s);
const qs = new URLSearchParams(location.search);
const override = /^\d{4}-\d{2}-\d{2}$/.test(qs.get('date') || '') ? qs.get('date') : '';
const today = override || kstDate();
const KEY = 'pz.v1';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const save = (o) => { if (override) return; try { localStorage.setItem(KEY, JSON.stringify(o)); } catch {} };

let level = MINE_LEVELS[qs.get('level')] ? qs.get('level') : (load().minesweeper?.lastLevel || 'intermediate');
let st, started = false, over = false, flagMode = false, t0 = 0, timer = 0, sec = 0;
const boardEl = $('#ms-board');

function init(lv) {
  level = lv; const L = MINE_LEVELS[lv];
  st = { w: L.w, h: L.h, mines: null, adj: null, open: new Uint8Array(L.w * L.h), flag: new Uint8Array(L.w * L.h) };
  started = false; over = false; sec = 0; clearInterval(timer); t0 = 0;
  boardEl.style.setProperty('--w', L.w); boardEl.style.setProperty('--h', L.h);
  boardEl.dataset.size = L.w > 20 ? 'l' : L.w > 10 ? 'm' : 's';
  boardEl.innerHTML = '';
  for (let i = 0; i < L.w * L.h; i++) { const b = document.createElement('button'); b.type = 'button'; b.className = 'ms-c'; b.dataset.i = i; boardEl.append(b); }
  document.querySelectorAll('.ms-lv').forEach((b) => b.setAttribute('aria-pressed', b.dataset.lv === lv));
  $('#ms-done').hidden = true; $('#ms-date').textContent = today;
  paint(); streakView(); $('#ms-time').textContent = '0:00';
  const o = load(); o.minesweeper = { ...(o.minesweeper || {}), lastLevel: lv }; save(o);
}
function paint() {
  const { w, h, open, flag, mines, adj } = st;
  const cells = boardEl.children; let fl = 0;
  for (let i = 0; i < w * h; i++) {
    const c = cells[i]; let cls = 'ms-c', txt = '';
    if (open[i]) {
      cls += ' o';
      if (mines && mines[i]) { cls += ' mine' + (over && !st.win && st.hit === i ? ' hit' : ''); txt = '💣'; }
      else if (adj[i]) { cls += ' n' + adj[i]; txt = adj[i]; }
    } else if (flag[i] === 1) { txt = '🚩'; cls += ' f'; fl++; }
    else if (flag[i] === 2) { txt = '?'; cls += ' q'; }
    else if (over && mines && mines[i] && !st.win) { cls += ' o mine'; txt = '💣'; }
    c.className = cls; c.textContent = txt;
  }
  $('#ms-left').textContent = MINE_LEVELS[level].mines - fl;
}
function tick() { sec = Math.floor((Date.now() - t0) / 1000); $('#ms-time').textContent = fmtTime(sec); }
function start(i) {
  st.mines = placeMines(today, level, i); st.adj = countAdj(st.mines, st.w, st.h);
  started = true; t0 = Date.now(); timer = setInterval(tick, 250);
}
function progress() { let o = 0, tot = 0; for (let i = 0; i < st.w * st.h; i++) if (!(st.mines && st.mines[i])) { tot++; if (st.open[i]) o++; } return tot ? o / tot : 0; }
function finish(win) {
  over = true; st.win = win; clearInterval(timer); tick(); paint();
  const t = sec, name = MINE_LEVELS[level].name;
  const o = load(); o.minesweeper = o.minesweeper || {};
  if (win) { o.minesweeper = streakAfterSolve(o.minesweeper, today); }
  o.minesweeper.lastLevel = level;
  o.minesweeper.last = { date: today, level, time: t, win: win ? 1 : 0 };
  save(o);
  $('#ms-title').textContent = win ? '클리어! 🎉' : '폭발 💥';
  $('#ms-result').textContent = win ? `${name} ${fmtTime(t)} · 연속 ${o.minesweeper.streak}일` : `${name} · ${Math.round(progress() * 100)}%까지 열었어요`;
  $('#ms-share-text').value = shareMines(today, name, win, t, progress());
  $('#ms-done').hidden = false; streakView();
  window.__pzDone = { type: 'minesweeper', win, time: t, streak: win ? o.minesweeper.streak : undefined };
}
function streakView() {
  const rec = load().minesweeper;
  $('#ms-streak').textContent = streakShown(rec, today);
  const l = rec?.last;
  $('#ms-last').textContent = l && l.date === today ? `오늘 기록 ${l.win ? fmtTime(l.time) + ' 클리어' : '도전 중'} (${MINE_LEVELS[l.level]?.name || ''})` : '오늘 기록 없음';
}
function reveal(i) {
  if (over) return;
  if (st.flag[i] === 1) return;
  if (!started) start(i);
  if (st.open[i]) return chord(i);
  const hit = openCell(st, i);
  if (hit) { st.hit = i; paint(); return finish(false); }
  paint(); if (minesWon(st)) { for (let k = 0; k < st.w * st.h; k++) if (st.mines[k]) st.flag[k] = 1; paint(); finish(true); }
}
function chord(i) {
  if (!st.adj[i]) return;
  const ns = neighbors(i, st.w, st.h);
  if (ns.filter((n) => st.flag[n] === 1).length !== st.adj[i]) return;
  let hit = -1;
  for (const n of ns) if (!st.open[n] && st.flag[n] !== 1) { if (openCell(st, n)) hit = n; }
  if (hit >= 0) { st.hit = hit; paint(); return finish(false); }
  paint(); if (minesWon(st)) { for (let k = 0; k < st.w * st.h; k++) if (st.mines[k]) st.flag[k] = 1; paint(); finish(true); }
}
function toggleFlag(i) {
  if (over || st.open[i]) return;
  const q = $('#ms-q').getAttribute('aria-pressed') === 'true';
  st.flag[i] = st.flag[i] === 0 ? 1 : st.flag[i] === 1 && q ? 2 : 0;
  paint();
}

// 입력: 탭=열기(깃발 모드면 깃발), 길게 누르기(450ms)=깃발, 우클릭=깃발
let press = null, lastLong = 0;
boardEl.addEventListener('pointerdown', (e) => {
  const b = e.target.closest('.ms-c'); if (!b || e.button === 2) return;
  press = { i: +b.dataset.i, long: false, x: e.clientX, y: e.clientY };
  press.tm = setTimeout(() => { if (press) { press.long = true; lastLong = Date.now(); toggleFlag(press.i); try { navigator.vibrate && navigator.vibrate(25); } catch {} } }, 450);
});
boardEl.addEventListener('pointermove', (e) => { if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 12) { clearTimeout(press.tm); press = null; } });
const endPress = (e) => {
  if (!press) return; clearTimeout(press.tm);
  const p = press; press = null;
  if (e.type === 'pointercancel' || p.long) return;
  if (flagMode) toggleFlag(p.i); else reveal(p.i);
};
boardEl.addEventListener('pointerup', endPress); boardEl.addEventListener('pointercancel', endPress);
boardEl.addEventListener('contextmenu', (e) => { e.preventDefault(); if (Date.now() - lastLong < 1000) return; /* 길게 누르기가 이미 깃발 처리 */ const b = e.target.closest('.ms-c'); if (b) toggleFlag(+b.dataset.i); });
boardEl.addEventListener('keydown', (e) => { const b = e.target.closest('.ms-c'); if (!b) return; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); reveal(+b.dataset.i); } else if (e.key === 'f' || e.key === 'F') toggleFlag(+b.dataset.i); });

$('#ms-flag').addEventListener('click', () => { flagMode = !flagMode; $('#ms-flag').setAttribute('aria-pressed', flagMode); $('#ms-flag').textContent = flagMode ? '🚩 깃발 모드 켜짐' : '🚩 깃발 모드'; });
$('#ms-q').addEventListener('click', () => { const on = $('#ms-q').getAttribute('aria-pressed') !== 'true'; $('#ms-q').setAttribute('aria-pressed', on); });
$('#ms-reset').addEventListener('click', () => init(level));
$('#ms-again').addEventListener('click', () => init(level));
document.querySelectorAll('.ms-lv').forEach((b) => b.addEventListener('click', () => init(b.dataset.lv)));
$('#ms-copy').addEventListener('click', async () => {
  const t = $('#ms-share-text').value;
  try { if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) await navigator.share({ text: t }); else await navigator.clipboard.writeText(t); $('#ms-copy').textContent = '복사됨 ✓'; }
  catch { $('#ms-share-text').select(); try { document.execCommand('copy'); $('#ms-copy').textContent = '복사됨 ✓'; } catch {} }
});
$('#ms-close').addEventListener('click', () => { $('#ms-done').hidden = true; });
init(level);
window.__pz = { get st() { return st; }, today };
