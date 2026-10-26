// Page bootstrap. Each static page embeds its dictionary in <script id="i18n">.
import { track } from './track.js';
const D = JSON.parse(document.getElementById('i18n').textContent);
const page = document.body.dataset.page, lang = D.lang;
const seg = location.pathname.split('/').filter(Boolean); // [lang, kind, id]
const fmt = (s, v) => String(s).replace(/\{(\w+)\}/g, (_, k) => (k in v ? v[k] : ''));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// dynamic shells: keep path id when switching language
document.querySelectorAll('a[data-dyn]').forEach((a) => { const l = a.getAttribute('href').split('/')[1]; a.href = `/${l}/${seg.slice(1).join('/')}${location.search}`; });

async function main() {
  if (page === 'game' || page === 'c') {
    const { mountRush } = await import('./rush.js');
    const q = new URLSearchParams(location.search);
    let seed = null, challenge = null;
    if (page === 'c') {
      const id = seg[2] || '';
      const m = id.match(/^([a-z0-9-]{1,32})-1$/) || id.match(/^([a-z0-9-]{1,32})$/);
      seed = m ? m[1] : null;
      if (q.get('vs')) { try { const r = await (await fetch(`/api/share/${encodeURIComponent(q.get('vs'))}`)).json(); if (r && r.kind === 'rush' && !r.payload.assist) challenge = { stage: r.payload.stage, score: r.payload.score }; } catch {} }
    }
    if (page === 'c') { track('challenge_land'); try { window.gev && window.gev('challenge_land', { g: 'rush' }); } catch (e) {} }
    const capture = q.get('capture') === '1';
    if (capture) document.documentElement.classList.add('capture');
    mountRush(document.getElementById('game'), { D, lang, seed: q.get('seed') || seed, challenge, capture, landing: page === 'c' });
  } else if (page === 'quiz') {
    const { mountQuiz } = await import('./quiz.js'); mountQuiz(document.getElementById('quiz'), D);
  } else if (page === 'chem') {
    const { mountChem } = await import('./chem.js'); mountChem(document.getElementById('chem'), D);
  } else if (page === 'i') {
    const { mountInvite } = await import('./chem.js'); track('invite_land'); mountInvite(document.getElementById('chem'), D, seg[2] || '');
  } else if (page === 'r') {
    const el = document.getElementById('share');
    try {
      const r = await fetch(`/api/share/${encodeURIComponent(seg[2] || '')}`); if (!r.ok) throw 0; const s = await r.json();
      track('result_land', { kind: s.kind === 'quiz' ? 'quiz' : 'rush' });
      if (s.kind === 'quiz') {
        const T = D.types[s.payload.code];
        el.innerHTML = `<div class="result"><img class="char" src="/img/chars/${s.payload.code}.svg" width="240" height="240" alt="${esc(T.name)}"><div><span class="tag">${esc(D.quiz.title)}</span><h1>${esc(T.name)}</h1><p><b>${esc(T.one)}</b></p><p>${esc(T.desc)}</p><div class="row"><a class="btn" href="/${lang}/me/play-character/">${esc(D.quiz.takeQuiz)}</a><a class=\"sublink\" href=\"/${lang}/friends/chemistry/\">${esc(D.cta.chem)}</a></div></div></div><p class=\"disc">${esc(D.quiz.disclaimer)}</p>`;
        document.title = `${T.name} | ${D.brand}`;
      } else {
        const p = s.payload;
        el.innerHTML = `<span class="tag">${esc(D.game.name)}${p.assist ? ' · ASSIST' : ''}</span><h1>${esc(D.game.sector)} ${p.stage}</h1><p>${esc(fmt(D.game.lostDesc, { stage: Math.max(0, p.stage - 1), score: Number(p.score).toLocaleString() }))}</p><div class="row"><a class="btn" href="/${lang}/c/${esc(p.seed)}-1${p.assist ? '' : `?vs=${esc(s.id)}`}">${esc(D.game.challenge)}</a><a class="btn ghost" href="/${lang}/play/gate-rush/">${esc(D.game.start)}</a></div>`;
        document.title = `${D.game.name} ${D.game.sector} ${p.stage} | ${D.brand}`;
      }
    } catch { el.innerHTML = `<h2>${esc(D.common.notFound)}</h2><a class="btn" href="/${lang}/">${esc(D.nav.home)}</a>`; }
  } else if (page === 'lobby') {
    const s = (() => { try { return JSON.parse(localStorage.getItem('gate-rush-v3')); } catch { return null; } })();
    const a = document.querySelector('[data-daily]'); if (a && s && s.bestStage) a.textContent = `${D.game.best} ${s.bestStage} →`;
    import('./weekly.js').then(async (m) => { const c = await m.weeklyCard(lang); const anchor = a && a.closest('section'); if (c && anchor) anchor.before(c); }).catch(() => {});
  }
}
main();
