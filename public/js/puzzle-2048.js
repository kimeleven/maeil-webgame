// 오늘의 2048 UI (t_49b0ed25): 날짜 시드 새 타일, 방향키·스와이프, 최고 타일 기록.
import { streakAfterSolve, streakShown } from '/js/puzzle-core.js';
import { g2048New, g2048Move, g2048Over, g2048Max, g2048Share } from '/js/puzzle-extra-core.js';
import { $, today, load, save, copyText } from '/js/puzzle-ui.js';
let s = g2048New(today), over = false;
const board = $('#g-board');
const restore = () => { const c = load().g2048?.cur; if (c && c.date === today && c.s?.b?.length === 16) { s = c.s; over = g2048Over(s); } };
function persist() { const o = load(); o.g2048 = o.g2048 || {}; o.g2048.cur = { date: today, s }; save(o); }
function paint() {
  board.innerHTML = s.b.map((v) => `<div class="g-t g-v${Math.min(v, 4096)}">${v || ''}</div>`).join('');
  $('#g-score').textContent = s.score; $('#g-max').textContent = g2048Max(s);
  $('#g-best').textContent = load().g2048?.bestScore || 0; $('#g-streak').textContent = streakShown(load().g2048, today);
}
function end(w) {
  over = true; const o = load(); o.g2048 = o.g2048 || {}; const rec = streakAfterSolve(o.g2048, today); Object.assign(o.g2048, rec);
  o.g2048.bestScore = Math.max(o.g2048.bestScore || 0, s.score); o.g2048.last = { date: today, score: s.score, max: g2048Max(s), win: w }; save(o); persist();
  $('#g-title').textContent = w ? '2048 달성! 🎉' : '더 움직일 수 없어요';
  $('#g-result').textContent = `최고 타일 ${g2048Max(s)} · 점수 ${s.score}`; $('#g-share-text').value = g2048Share(today, s);
  $('#g-done').hidden = false; paint(); window.__pzDone = { type: '2048', max: g2048Max(s), score: s.score };
}
function move(d) {
  if (over) return; const n = g2048Move(s, d); if (!n) return;
  const was = s.won; s = n; persist(); paint();
  if (n.won && !was) end(true); else if (g2048Over(s)) end(false);
}
document.addEventListener('keydown', (e) => { const d = { ArrowLeft: 'L', ArrowRight: 'R', ArrowUp: 'U', ArrowDown: 'D' }[e.key]; if (d && !e.target.closest('textarea,input')) { e.preventDefault(); move(d); } });
let t0 = null;
board.addEventListener('touchstart', (e) => { t0 = e.touches[0]; }, { passive: true });
board.addEventListener('touchend', (e) => { if (!t0) return; const t = e.changedTouches[0], dx = t.clientX - t0.clientX, dy = t.clientY - t0.clientY; t0 = null; if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return; move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : (dy > 0 ? 'D' : 'U')); });
board.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
document.querySelectorAll('.g-dir').forEach((b) => b.addEventListener('click', () => move(b.dataset.d)));
$('#g-reset').addEventListener('click', () => { s = g2048New(today); over = false; $('#g-done').hidden = true; persist(); paint(); });
$('#g-keep').addEventListener('click', () => { $('#g-done').hidden = true; if (s.won && !g2048Over(s)) over = false; });
$('#g-copy').addEventListener('click', () => copyText($('#g-copy'), $('#g-share-text')));
$('#g-close').addEventListener('click', () => { $('#g-done').hidden = true; });
$('#g-date').textContent = today; restore(); paint();
window.__pz = { get s() { return s; }, set s(v) { s = v; paint(); }, move };
