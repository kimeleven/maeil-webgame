// 오늘의 노노그램 UI (t_49b0ed25): 탭=칠하기, ✕ 모드=표시, 줄 힌트를 모두 맞추면 완료.
import { streakAfterSolve, streakShown, fmtTime } from '/js/puzzle-core.js';
import { NONO_LEVELS, nonoGen, nonoSolved, nonoShare } from '/js/puzzle-extra-core.js';
import { $, today, load, save, copyText, timer, param } from '/js/puzzle-ui.js';
let level = NONO_LEVELS[param('level')] ? param('level') : (load().nono?.lastLevel || 'easy');
let P, cells, xmode = false, done = false;
const tm = timer($('#n-time')), board = $('#n-board');
function persist() { if (done) return; const o = load(); o.nono = o.nono || {}; o.nono.cur = { date: today, level, cells, elapsed: tm.now() }; o.nono.lastLevel = level; save(o); }
function paint() {
  const n = P.n; board.style.setProperty('--n', n);
  let h = '<i class="n-corner"></i>' + P.cols.map((c) => `<span class="n-ch">${c.join('<br>')}</span>`).join('');
  for (let r = 0; r < n; r++) {
    h += `<span class="n-rh">${P.rows[r].join(' ')}</span>`;
    for (let c = 0; c < n; c++) { const v = cells[r * n + c]; h += `<button type="button" class="n-c${v === 1 ? ' on' : ''}${v === 2 ? ' x' : ''}${c % 5 === 4 && c < n - 1 ? ' br' : ''}${r % 5 === 4 && r < n - 1 ? ' bb' : ''}" data-i="${r * n + c}" aria-label="${r + 1}행 ${c + 1}열">${v === 2 ? '✕' : ''}</button>`; }
  }
  board.innerHTML = h; $('#n-x').setAttribute('aria-pressed', xmode); $('#n-streak').textContent = streakShown(load().nono, today);
  const l = load().nono?.last; $('#n-last').textContent = l && l.date === today ? `오늘 기록 ${fmtTime(l.time)} (${NONO_LEVELS[l.level]?.name})` : '오늘 기록 없음';
}
function newGame(lv) {
  level = lv; done = false; P = nonoGen(today, level); cells = new Array(P.n * P.n).fill(0); tm.set(0);
  const c = load().nono?.cur; if (c && c.date === today && c.level === level && c.cells?.length === cells.length) { cells = c.cells; tm.set(c.elapsed || 0); }
  document.querySelectorAll('.n-lv').forEach((b) => b.setAttribute('aria-pressed', b.dataset.lv === level)); $('#n-done').hidden = true; $('#n-date').textContent = today; paint();
}
function finish() {
  done = true; tm.stop(); const t = tm.now(), o = load(); o.nono = streakAfterSolve(o.nono, today); o.nono.last = { date: today, level, time: t }; o.nono.lastLevel = level; delete o.nono.cur; save(o);
  $('#n-result').textContent = `${fmtTime(t)} · 연속 ${o.nono.streak}일`; $('#n-share-text').value = nonoShare(today, NONO_LEVELS[level].name, t); $('#n-done').hidden = false; paint();
  window.__pzDone = { type: 'nonogram', time: t };
}
board.addEventListener('click', (e) => { const b = e.target.closest('.n-c'); if (!b || done) return; tm.start(); const i = +b.dataset.i, w = xmode ? 2 : 1; cells[i] = cells[i] === w ? 0 : w; paint(); persist(); if (nonoSolved(cells, P.n, P.rows, P.cols)) finish(); });
$('#n-x').addEventListener('click', () => { xmode = !xmode; paint(); });
$('#n-reset').addEventListener('click', () => { const o = load(); if (o.nono) delete o.nono.cur; save(o); newGame(level); });
document.querySelectorAll('.n-lv').forEach((b) => b.addEventListener('click', () => { persist(); newGame(b.dataset.lv); }));
$('#n-copy').addEventListener('click', () => copyText($('#n-copy'), $('#n-share-text')));
$('#n-close').addEventListener('click', () => { $('#n-done').hidden = true; });
document.addEventListener('visibilitychange', () => { if (document.hidden) { tm.stop(); persist(); } });
window.addEventListener('pagehide', persist);
newGame(level); window.__pz = { get P() { return P; }, get cells() { return cells; }, click: (i) => board.querySelector(`[data-i="${i}"]`).click() };
