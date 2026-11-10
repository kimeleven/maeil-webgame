// 오늘의 단어 묶음 UI (t_49b0ed25): 16개 단어 → 4묶음, 4번 틀리면 종료.
import { streakAfterSolve, streakShown } from '/js/puzzle-core.js';
import { wgDay, wgBoard, wgGuess, wgShare, WG_LEVELS, WG_MAX_MISTAKES } from '/js/puzzle-extra-core.js';
import { $, today, load, save, copyText } from '/js/puzzle-ui.js';

const data = await (await fetch('/data/wordgroup-days.json')).json();
const day = wgDay(data, today), order0 = wgBoard(day, today);
let words = order0.slice(), sel = [], solved = [], rows = [], mistakes = 0, hints = 0, over = false, win = false;
const grid = $('#wg-grid'), msg = (t) => { $('#wg-msg').textContent = t; };

function restore() {
  const c = load().wordgroup?.cur;
  if (c && c.date === today) { solved = c.solved || []; rows = c.rows || []; mistakes = c.mistakes || 0; hints = c.hints || 0; over = !!c.over; win = !!c.win; if (c.words?.length === 16) words = c.words; }
}
function persist() { const o = load(); o.wordgroup = o.wordgroup || {}; o.wordgroup.cur = { date: today, solved, rows, mistakes, hints, over, win, words }; save(o); }
function paint() {
  const left = words.filter((w) => !solved.some((gi) => day.groups[gi].words.includes(w)));
  $('#wg-solved').innerHTML = solved.map((gi) => { const g = day.groups[gi]; return `<div class="wg-g wg-l${g.level}"><b>${g.name}</b><span>${g.words.join(' · ')}</span></div>`; }).join('');
  grid.innerHTML = left.map((w) => `<button type="button" class="wg-w${sel.includes(w) ? ' on' : ''}" data-w="${w}" aria-pressed="${sel.includes(w)}">${w}</button>`).join('');
  $('#wg-left').textContent = WG_MAX_MISTAKES - mistakes;
  $('#wg-dots').textContent = '●'.repeat(WG_MAX_MISTAKES - mistakes) + '○'.repeat(mistakes);
  $('#wg-submit').disabled = sel.length !== 4 || over;
  $('#wg-clear').disabled = !sel.length || over; $('#wg-shuf').disabled = over; $('#wg-hint').disabled = over;
  $('#wg-streak').textContent = streakShown(load().wordgroup, today);
  const l = load().wordgroup?.last;
  $('#wg-last').textContent = l && l.date === today ? (l.win ? `오늘 클리어 · 오답 ${l.mistakes}` : '오늘은 아쉽게 실패') : '오늘 기록 없음';
}
function finish(w) {
  over = true; win = w;
  if (!w) solved = [...solved, ...[0, 1, 2, 3].filter((g) => !solved.includes(g))]; // 정답 공개
  const o = load(); o.wordgroup = o.wordgroup || {};
  if (w) o.wordgroup = streakAfterSolve(o.wordgroup, today);
  o.wordgroup.last = { date: today, win: w, mistakes, hints }; save(o); persist();
  $('#wg-title').textContent = w ? '모두 맞혔어요! 🎉' : '아쉬워요, 정답을 공개했어요';
  $('#wg-result').textContent = `오답 ${mistakes} · 힌트 ${hints}${w ? ' · 연속 ' + o.wordgroup.streak + '일' : ''}`;
  $('#wg-share-text').value = wgShare(today, rows, w, mistakes);
  $('#wg-done').hidden = false; paint();
  window.__pzDone = { type: 'wordgroup', win: w, mistakes, hints };
}
function submit() {
  if (sel.length !== 4 || over) return;
  const r = wgGuess(day, sel, solved);
  if (r.ok) { solved.push(r.gi); rows.push(day.groups[r.gi].level); sel = []; msg(`${day.groups[r.gi].name} — 정답!`); if (solved.length === 3) { const last = [0, 1, 2, 3].find((g) => !solved.includes(g)); solved.push(last); rows.push(day.groups[last].level); finish(true); return; } }
  else { mistakes++; rows.push(-1); msg(r.oneAway ? '하나만 바꾸면 돼요! (한 개 차이)' : '틀렸어요'); sel = []; if (mistakes >= WG_MAX_MISTAKES) { finish(false); return; } }
  persist(); paint();
}
grid.addEventListener('click', (e) => { const b = e.target.closest('.wg-w'); if (!b || over) return; const w = b.dataset.w; sel = sel.includes(w) ? sel.filter((x) => x !== w) : sel.length < 4 ? [...sel, w] : sel; paint(); });
$('#wg-submit').addEventListener('click', submit);
$('#wg-clear').addEventListener('click', () => { sel = []; paint(); });
$('#wg-shuf').addEventListener('click', () => { const left = words.filter((w) => !solved.some((gi) => day.groups[gi].words.includes(w))); for (let i = left.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [left[i], left[j]] = [left[j], left[i]]; } words = [...words.filter((w) => !left.includes(w)), ...left]; persist(); paint(); });
$('#wg-hint').addEventListener('click', () => { const g = day.groups.findIndex((x, i) => !solved.includes(i)); if (g < 0) return; hints++; msg(`힌트: ${WG_LEVELS[day.groups[g].level].name} 묶음은 "${day.groups[g].name}"`); persist(); });
$('#wg-copy').addEventListener('click', () => copyText($('#wg-copy'), $('#wg-share-text')));
$('#wg-close').addEventListener('click', () => { $('#wg-done').hidden = true; });
$('#wg-date').textContent = `${today} · ${day.n}번째 판`;
restore(); paint();
if (over) { $('#wg-share-text').value = wgShare(today, rows, win, mistakes); }
window.__pz = { day, today, get sel() { return sel; } };
