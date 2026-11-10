// 오늘의 솔리테어 UI (t_49b0ed25): 클론다이크 1장 뽑기. 카드를 탭해 고르고 목적지를 탭, 같은 카드를 한 번 더 탭하면 기초로 자동.
import { streakAfterSolve, streakShown } from '/js/puzzle-core.js';
import { solDeal, solDraw, solMove, solWon, solFoundTarget, solShare, SUITS, RANKS, cardSuit, cardRank, isRed } from '/js/puzzle-extra-core.js';
import { $, today, load, save, copyText } from '/js/puzzle-ui.js';
let s = solDeal(today), sel = null, hist = [], over = false;
const el = $('#s-app'), lab = (c) => `${SUITS[cardSuit(c)]}${RANKS[cardRank(c)]}`;
const card = (c, attrs, extra = '') => `<button type="button" class="s-card ${isRed(c) ? 'red' : ''}${extra}" ${attrs} aria-label="${lab(c)}">${lab(c)}</button>`;
function persist() { const o = load(); o.solitaire = o.solitaire || {}; o.solitaire.cur = { date: today, s, hist: hist.slice(-50) }; save(o); }
function paint() {
  const isSel = (k, col, idx) => sel && sel.k === k && (k === 'w' || (k === 't' && sel.col === col && idx >= sel.idx) || (k === 'f' && sel.s === col));
  const top = (a) => (a.length ? a[a.length - 1] : null);
  $('#s-stock').innerHTML = s.stock.length ? `<button type="button" class="s-card back" data-a="draw" aria-label="뽑기 (${s.stock.length}장)"></button>` : `<button type="button" class="s-slot" data-a="draw" aria-label="다시 쌓기">↻</button>`;
  $('#s-waste').innerHTML = top(s.waste) !== null && s.waste.length ? card(top(s.waste), 'data-k="w"', isSel('w') ? ' sel' : '') : '<span class="s-slot"></span>';
  $('#s-found').innerHTML = s.found.map((p, i) => (p.length ? card(top(p), `data-k="f" data-s="${i}"`, isSel('f', i) ? ' sel' : '') : `<button type="button" class="s-slot" data-k="f" data-s="${i}" aria-label="기초 ${i + 1}">${SUITS[i]}</button>`)).join('');
  $('#s-tab').innerHTML = s.tab.map((col, ci) => `<div class="s-col" data-k="t" data-col="${ci}">${col.length ? col.map((x, idx) => (x.up ? card(x.c, `data-k="t" data-col="${ci}" data-idx="${idx}"`, isSel('t', ci, idx) ? ' sel' : '') : `<span class="s-card back" data-k="t" data-col="${ci}" data-idx="${idx}"></span>`)).join('') : '<span class="s-slot">K</span>'}</div>`).join('');
  $('#s-moves').textContent = s.moves; $('#s-found-n').textContent = s.found.reduce((a, p) => a + p.length, 0); $('#s-streak').textContent = streakShown(load().solitaire, today);
  $('#s-undo').disabled = !hist.length;
}
function apply(n) { if (!n) return false; hist.push(s); if (hist.length > 200) hist.shift(); s = n; sel = null; persist(); paint(); if (solWon(s)) finish(); return true; }
function finish() {
  over = true; const o = load(); o.solitaire = streakAfterSolve(o.solitaire, today); o.solitaire.last = { date: today, moves: s.moves, win: true }; delete o.solitaire.cur; save(o);
  $('#s-result').textContent = `${s.moves}수 · 연속 ${o.solitaire.streak}일`; $('#s-share-text').value = solShare(today, s, true); $('#s-done').hidden = false; paint();
  window.__pzDone = { type: 'solitaire', moves: s.moves };
}
function pick(t) {
  if (over) return; const a = t.dataset;
  if (a.a === 'draw') { apply(solDraw(s)); return; }
  const to = a.k === 'f' ? { k: 'f', s: +a.s } : { k: 't', col: +a.col };
  const here = a.k === 'w' ? { k: 'w' } : a.k === 'f' ? { k: 'f', s: +a.s } : a.idx !== undefined ? { k: 't', col: +a.col, idx: +a.idx } : null;
  if (sel) {
    const same = here && sel.k === here.k && sel.col === here.col && sel.idx === here.idx && sel.s === here.s;
    if (same) { const c = sel.k === 'w' ? s.waste[s.waste.length - 1] : sel.k === 't' ? s.tab[sel.col][sel.idx].c : null; const f = c === null ? -1 : (sel.k === 't' && sel.idx !== s.tab[sel.col].length - 1 ? -1 : solFoundTarget(s, c)); if (f >= 0 && apply(solMove(s, sel, { k: 'f', s: f }))) return; sel = null; paint(); return; }
    if (apply(solMove(s, sel, to))) return;
    sel = null;
  }
  if (here && !(a.k === 'f' && !s.found[+a.s].length)) { sel = here; }
  paint();
}
el.addEventListener('click', (e) => { const t = e.target.closest('[data-k],[data-a]'); if (!t || t.classList.contains('back') && t.dataset.a !== 'draw') return; pick(t); });
$('#s-undo').addEventListener('click', () => { const h = hist.pop(); if (!h || over) return; s = h; sel = null; persist(); paint(); });
$('#s-reset').addEventListener('click', () => { const o = load(); if (o.solitaire) delete o.solitaire.cur; save(o); s = solDeal(today); hist = []; sel = null; over = false; $('#s-done').hidden = true; paint(); });
$('#s-copy').addEventListener('click', () => copyText($('#s-copy'), $('#s-share-text')));
$('#s-close').addEventListener('click', () => { $('#s-done').hidden = true; });
const c = load().solitaire?.cur; if (c && c.date === today && c.s?.tab?.length === 7) { s = c.s; hist = c.hist || []; }
$('#s-date').textContent = today; paint();
window.__pz = { get s() { return s; }, set s(v) { s = v; paint(); }, pick };
