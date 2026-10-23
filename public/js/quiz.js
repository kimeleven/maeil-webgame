// Character quiz UI (REBOOT-SPEC §4). Answers stay in memory only; no network calls until the user shares.
import { scoreQuiz, bestBuddy, COLORS } from './logic.js';
import { quizCard, saveCanvas, shareOrCopy } from './card.js';
import { api } from './net.js';
import { track } from './track.js';

const fmt = (s, v) => String(s).replace(/\{(\w+)\}/g, (_, k) => (k in v ? v[k] : ''));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// runs the 10 questions inside el; resolves {code,pct}
export function runQuiz(el, D) {
  const Q = D.quiz;
  return new Promise((done) => {
    const ans = [];
    const render = () => {
      const i = ans.length, q = Q.q[i];
      el.innerHTML = `<div class="stack"><div class="row" style="justify-content:space-between"><span class="muted">${fmt(Q.progress, { n: i + 1 })}</span>${i ? `<button class="btn ghost" data-back style="min-height:44px;padding:8px 14px">← ${esc(D.common.back)}</button>` : ''}</div>
      <div class="progress"><i style="width:${(i / 10) * 100}%"></i></div><h2 style="margin:10px 0">${esc(q.q)}</h2>
      <button class="choice" data-a="a"><b>A</b>${esc(q.a)}</button><button class="choice" data-a="b"><b>B</b>${esc(q.b)}</button></div>`;
      el.querySelectorAll('[data-a]').forEach((b) => (b.onclick = () => { ans.push(b.dataset.a); ans.length === 10 ? done(scoreQuiz(ans)) : render(); }));
      el.querySelector('[data-back]')?.addEventListener('click', () => { ans.pop(); render(); });
    };
    render();
  });
}

export function resultHtml(D, code, pct) {
  const T = D.types[code], b = bestBuddy(code), ax = D.quiz.axes;
  return `<div class="result"><img class="char" src="/img/chars/${code}.svg" width="240" height="240" alt="${esc(T.name)}"><div>
  <span class="tag" style="background:${COLORS[code]}33;color:${COLORS[code]}">${esc(D.quiz.title)}</span><h2 style="font-size:30px;margin:8px 0">${esc(T.name)}</h2><p><b>${esc(T.one)}</b></p><p>${esc(T.desc)}</p>
  <div class="bars">${pct.map((p, i) => `<div class="bar"><span>${esc(ax[i][0])} ${p}%</span><div class="progress"><i style="width:${p}%"></i></div><span>${100 - p}% ${esc(ax[i][1])}</span></div>`).join('')}</div>
  <p>${esc(D.quiz.best)}: <a href="/${D.lang}/me/play-character/types/${b.toLowerCase()}/"><img src="/img/chars/${b}.svg" width="32" height="32" alt="" style="vertical-align:middle"> ${esc(D.types[b].name)}</a></p></div></div>`;
}

export function mountQuiz(el, D) {
  const start = () => { track('quiz_start'); return runQuiz(el, D).then(({ code, pct }) => { track('quiz_done'); showResult(el, D, code, pct, start); }); };
  el.querySelector('[data-start]')?.addEventListener('click', start);
}

export function showResult(el, D, code, pct, retry) {
  try { localStorage.setItem('play-character', JSON.stringify({ code, pct, at: Date.now() })); } catch {}
  track('result_land', { from: 'quiz' });
  el.innerHTML = resultHtml(D, code, pct) + `<p class="muted" data-share-hint style="margin:16px 0 6px">${esc(D.quiz.shareHint)}</p><div class="row" style="margin-top:6px"><button class="btn" data-share>${esc(D.cta.share)}</button><button class="btn ghost" data-save>${esc(D.cta.save)}</button><a class="btn ghost" href="/${D.lang}/friends/chemistry/">${esc(D.cta.chem)}</a><button class="btn ghost" data-retry>${esc(D.cta.retry)}</button></div><p class="status" role="status"></p>`;
  const st = el.querySelector('.status');
  el.querySelector('[data-save]').onclick = async () => saveCanvas(await quizCard(D, code, pct), `play-character-${code}.png`);
  el.querySelector('[data-share]').onclick = async () => {
    track('share_click', { from: 'quiz' });
    let url = `${location.origin}/${D.lang}/me/play-character/`;
    try { const r = await api('/api/share', { method: 'POST', body: { kind: 'quiz', lang: D.lang, payload: { code } } }); url = `${location.origin}/${D.lang}/r/${r.id}`; } catch {}
    const r = await shareOrCopy({ title: D.quiz.title, text: fmt(D.quiz.shareText, { name: D.types[code].name, url }), canvas: await quizCard(D, code, pct), name: 'play-character.png' });
    track('share_result', { from: 'quiz', r: r === 'shared' ? 'shared' : r === 'copied' ? 'copied' : r === 'failed' ? 'failed' : 'cancel' });
    st.textContent = r === 'copied' ? D.common.copied : r === 'failed' ? D.common.error : '';
  };
  el.querySelector('[data-retry]').onclick = retry || (() => location.reload());
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
