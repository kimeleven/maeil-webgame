// 오늘의 스도쿠 UI (t_2d0c7a9f). 날짜 시드 일일판, 메모·힌트·실행취소, 완료 시 기록·연속일·공유.
import { generateSudoku, sudokuConflicts, kstDate, SUDOKU_LEVELS, streakAfterSolve, streakShown, fmtTime, shareSudoku } from '/js/puzzle-core.js';

const $ = (s, r = document) => r.querySelector(s);
const qs = new URLSearchParams(location.search);
const override = /^\d{4}-\d{2}-\d{2}$/.test(qs.get('date') || '') ? qs.get('date') : '';
const today = override || kstDate();
const KEY = 'pz.v1';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const save = (o) => { if (override) return; try { localStorage.setItem(KEY, JSON.stringify(o)); } catch {} };

let level = SUDOKU_LEVELS[qs.get('level')] ? qs.get('level') : (load().sudoku?.lastLevel || 'normal');
let P, S, v, given, notes, sel = -1, noteMode = false, hints = 0, elapsed = 0, startTs = 0, timer = 0, done = false, hist = [];

const boardEl = $('#sd-board');
function cellsHtml() {
  boardEl.innerHTML = '';
  for (let i = 0; i < 81; i++) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'sd-c'; b.dataset.i = i; b.setAttribute('role', 'gridcell');
    boardEl.append(b);
  }
}
function paint() {
  const bad = sudokuConflicts(v);
  const sv = sel >= 0 ? v[sel] : 0;
  boardEl.querySelectorAll('.sd-c').forEach((b, i) => {
    const r = Math.floor(i / 9), c = i % 9;
    const isPeer = sel >= 0 && (r === Math.floor(sel / 9) || c === sel % 9 || (Math.floor(r / 3) === Math.floor(sel / 27) && Math.floor(c / 3) === Math.floor((sel % 9) / 3)));
    b.className = 'sd-c' + (given[i] ? ' g' : '') + (i === sel ? ' sel' : isPeer ? ' peer' : '') + (sv && v[i] === sv && i !== sel ? ' same' : '') + (bad.has(i) ? ' bad' : '') + (c % 3 === 2 && c < 8 ? ' br' : '') + (r % 3 === 2 && r < 8 ? ' bb' : '');
    if (v[i]) b.textContent = v[i];
    else if (notes[i]) b.innerHTML = '<span class="nt">' + [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<i>${notes[i] & (1 << n) ? n : ''}</i>`).join('') + '</span>';
    else b.textContent = '';
    b.setAttribute('aria-label', `${r + 1}행 ${c + 1}열 ${v[i] || '빈 칸'}`);
  });
  const cnt = Array(10).fill(0); v.forEach((x) => cnt[x]++);
  document.querySelectorAll('.sd-n').forEach((b) => { b.disabled = cnt[+b.dataset.n] >= 9; });
  $('#sd-hints').textContent = hints;
  $('#sd-note').setAttribute('aria-pressed', noteMode);
  $('#sd-note').textContent = noteMode ? '✏️ 메모 켜짐' : '✏️ 메모';
}
const nowSec = () => elapsed + (startTs ? Math.floor((Date.now() - startTs) / 1000) : 0);
function tick() { $('#sd-time').textContent = fmtTime(nowSec()); }
function startTimer() { if (done || startTs) return; startTs = Date.now(); clearInterval(timer); timer = setInterval(tick, 500); }
function stopTimer() { if (startTs) { elapsed = nowSec(); startTs = 0; } clearInterval(timer); tick(); }
function persist() {
  if (done) return;
  const o = load(); o.sudoku = o.sudoku || {};
  o.sudoku.cur = { date: today, level, v: [...v], notes: [...notes], hints, elapsed: nowSec() };
  o.sudoku.lastLevel = level;
  save(o);
}
function clearCur() { const o = load(); if (o.sudoku) delete o.sudoku.cur; save(o); }
function streakView() {
  const rec = load().sudoku;
  $('#sd-streak').textContent = streakShown(rec, today);
  const l = rec?.last;
  $('#sd-last').textContent = l && l.date === today ? `오늘 기록 ${fmtTime(l.time)} · 힌트 ${l.hints} (${SUDOKU_LEVELS[l.level]?.name || ''})` : '오늘 기록 없음';
}
function newGame(lv) {
  level = lv; done = false; hist = []; sel = -1; noteMode = false;
  P = generateSudoku(today, level);
  v = P.puzzle.slice(); S = P.solution; given = P.puzzle.map(Boolean); notes = new Array(81).fill(0);
  hints = 0; elapsed = 0; startTs = 0; clearInterval(timer);
  const cur = load().sudoku?.cur;
  if (cur && cur.date === today && cur.level === level && cur.v?.length === 81) {
    v = cur.v.map((x, i) => (given[i] ? P.puzzle[i] : x)); notes = cur.notes || notes; hints = cur.hints || 0; elapsed = cur.elapsed || 0;
  }
  document.querySelectorAll('.sd-lv').forEach((b) => b.setAttribute('aria-pressed', b.dataset.lv === level));
  $('#sd-done').hidden = true;
  $('#sd-date').textContent = today;
  paint(); tick(); streakView();
}
function push() { hist.push({ v: v.slice(), notes: notes.slice(), hints }); if (hist.length > 200) hist.shift(); }
function put(n) {
  if (done || sel < 0 || given[sel]) return;
  startTimer(); push();
  if (noteMode && n) { if (!v[sel]) notes[sel] ^= 1 << n; }
  else {
    v[sel] = v[sel] === n ? 0 : n; notes[sel] = 0;
    if (v[sel]) {
      for (let k = 0; k < 81; k++) if (notes[k] && (Math.floor(k / 9) === Math.floor(sel / 9) || k % 9 === sel % 9 || (Math.floor(k / 27) === Math.floor(sel / 27) && Math.floor((k % 9) / 3) === Math.floor((sel % 9) / 3)))) notes[k] &= ~(1 << v[sel]);
    }
  }
  paint(); persist(); check();
}
function hint() {
  if (done) return;
  const i = sel >= 0 && !given[sel] && v[sel] !== S[sel] ? sel : v.findIndex((x, k) => x !== S[k]);
  if (i < 0) return;
  startTimer(); push(); v[i] = S[i]; notes[i] = 0; given[i] = true; hints++; sel = i;
  paint(); persist(); check();
}
function check() {
  if (!v.every((x, i) => x === S[i])) return;
  done = true; stopTimer();
  const t = nowSec(), o = load(); o.sudoku = streakAfterSolve(o.sudoku, today);
  o.sudoku.last = { date: today, level, time: t, hints, solved: 1 }; delete o.sudoku.cur; o.sudoku.lastLevel = level;
  save(o);
  $('#sd-result').textContent = `${fmtTime(t)} · 힌트 ${hints} · 연속 ${o.sudoku.streak}일`;
  $('#sd-share-text').value = shareSudoku(today, SUDOKU_LEVELS[level].name, t, hints);
  $('#sd-done').hidden = false; streakView();
  window.__pzDone = { type: 'sudoku', time: t, hints, streak: o.sudoku.streak };
}

boardEl.addEventListener('click', (e) => { const b = e.target.closest('.sd-c'); if (!b) return; sel = +b.dataset.i; paint(); });
document.querySelectorAll('.sd-n').forEach((b) => b.addEventListener('click', () => put(+b.dataset.n)));
$('#sd-erase').addEventListener('click', () => put(0));
$('#sd-note').addEventListener('click', () => { noteMode = !noteMode; paint(); });
$('#sd-hint').addEventListener('click', hint);
$('#sd-undo').addEventListener('click', () => { const h = hist.pop(); if (!h || done) return; v = h.v; notes = h.notes; hints = h.hints; paint(); persist(); });
$('#sd-reset').addEventListener('click', () => { clearCur(); newGame(level); });
document.querySelectorAll('.sd-lv').forEach((b) => b.addEventListener('click', () => { persist(); newGame(b.dataset.lv); }));
$('#sd-copy').addEventListener('click', async () => {
  const t = $('#sd-share-text').value;
  try { if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) await navigator.share({ text: t }); else await navigator.clipboard.writeText(t); $('#sd-copy').textContent = '복사됨 ✓'; }
  catch { $('#sd-share-text').select(); try { document.execCommand('copy'); $('#sd-copy').textContent = '복사됨 ✓'; } catch {} }
});
$('#sd-close').addEventListener('click', () => { $('#sd-done').hidden = true; });
document.addEventListener('keydown', (e) => {
  if (e.target.closest('textarea,input')) return;
  if (/^[1-9]$/.test(e.key)) put(+e.key);
  else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') put(0);
  else if (e.key === 'n' || e.key === 'N') { noteMode = !noteMode; paint(); }
  else if (e.key.startsWith('Arrow')) {
    if (sel < 0) { sel = 40; paint(); return; }
    const d = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 }[e.key], n = sel + d;
    if (n >= 0 && n < 81 && !(d === 1 && sel % 9 === 8) && !(d === -1 && sel % 9 === 0)) { sel = n; paint(); e.preventDefault(); }
  }
});
document.addEventListener('visibilitychange', () => { if (document.hidden) { stopTimer(); persist(); } else if (!done && v.some((x, i) => x !== P.puzzle[i])) startTimer(); });
window.addEventListener('pagehide', persist);
cellsHtml(); newGame(level);
window.__pz = { get v() { return v; }, get solution() { return S; }, get level() { return level; }, today };
