// 오늘 계산기 공통 화면 (t_61344aaa). 입력 즉시 계산(버튼 없음), 입력값 ↔ URL 쿼리, 복사·공유(선택), 익명 이벤트.
import { compute, kstToday, UNITS } from '/js/calc-core.js';
const $ = (s, r = document) => r.querySelector(s);
const slug = document.body.dataset.calc;
const form = $('#calc-form');
if (form && slug) {
  const qs = new URLSearchParams(location.search);
  const today = kstToday();
  const gv = (n, d) => { try { if (window.gev && !/[?&]qa=1/.test(location.search)) window.gev(n, Object.assign({ g: 'calc', k: slug }, d)); } catch (e) {} };
  let used = false;

  const fillUnits = (keepF, keepT) => {
    const c = form.elements.c; if (!c) return;
    const u = UNITS[c.value].u, keys = Object.keys(u), opts = keys.map((k) => `<option value="${k}">${u[k][0]}</option>`).join('');
    for (const [n, keep, def] of [['f', keepF, keys[c.value === 'temp' ? 0 : 2]], ['t', keepT, keys[c.value === 'temp' ? 1 : 4]]]) {
      const el = form.elements[n]; el.innerHTML = opts; el.value = keep && u[keep] ? keep : def;
    }
  };
  // 쿼리 → 입력칸. 날짜 칸이 비면 오늘(KST).
  for (const el of form.elements) {
    if (!el.name) continue;
    if (form.elements.c && (el.name === 'f' || el.name === 't')) continue; // 단위 폼만 fillUnits 가 채운다 (이자 폼 과세 t 는 일반 복원, t_54d54a22 D1)
    const q = qs.get(el.name);
    if (el.type === 'checkbox') { if (q != null) el.checked = q === '1'; }
    else if (q != null && q !== '') el.value = q;
    else if (el.type === 'date' && !el.value) el.value = el.dataset.def === 'xmas' ? `${today.slice(0, 4)}-12-25` : today;
  }
  fillUnits(qs.get('f'), qs.get('t'));
  const setMode = (m) => {
    if (!form.elements.m) return;
    form.elements.m.value = m;
    for (const b of form.querySelectorAll('[data-mode]')) b.setAttribute('aria-pressed', String(b.dataset.mode === m));
    for (const el of form.querySelectorAll('[data-show]')) el.hidden = !el.dataset.show.split(' ').includes(m);
  };
  if (form.elements.m) setMode(qs.get('m') || form.elements.m.value);

  const values = () => { const v = {}; for (const el of form.elements) if (el.name) v[el.name] = el.type === 'checkbox' ? (el.checked ? '1' : '0') : el.value.trim(); return v; };
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  let last = null;
  function run(user) {
    const v = values(), r = compute(slug, v, today);
    last = r;
    $('#calc-main').textContent = r ? r.main : '값을 확인해 주세요';
    $('#calc-formula').textContent = r ? r.formula : '';
    $('#calc-lines').innerHTML = r ? r.lines.map(([k, x]) => `<div><dt>${esc(k)}</dt><dd>${esc(x)}</dd></div>`).join('') : '';
    $('#calc-result').classList.toggle('bad', !r);
    if (user) {
      const p = new URLSearchParams();
      for (const [k, x] of Object.entries(v)) if (x !== '') p.set(k, x); // 날짜도 넣는다: 공유 링크를 다른 날 열어도 같은 결과
      history.replaceState(null, '', `${location.pathname}${p.toString() ? `?${p}` : ''}`);
      if (r && !used) { used = true; gv('calc_use', { via: r.mode }); }
    }
  }
  form.addEventListener('input', (e) => { if (e.target.name === 'c') fillUnits(); run(true); });
  form.addEventListener('change', (e) => { if (e.target.name === 'c') { fillUnits(); run(true); } });
  form.addEventListener('submit', (e) => e.preventDefault());
  form.addEventListener('click', (e) => { const b = e.target.closest('[data-mode]'); if (b) { e.preventDefault(); setMode(b.dataset.mode); run(true); } });
  run(false);

  const flash = (b, t) => { const o = b.dataset.label || (b.dataset.label = b.textContent); b.textContent = t; setTimeout(() => { b.textContent = o; }, 1600); };
  // 1119-08: 공유 문구·알림을 페이지 언어로 (계산기는 현재 ko만 있고, lang 속성이 늘면 그대로 따라간다). 게임 유입 한 줄 포함.
  const TX = {
    ko: ['복사됨 ✓', '링크 복사됨 ✓', '오늘 30초 웹겜도 한 판 →'],
    en: ['Copied ✓', 'Link copied ✓', 'Also try a 30-second web game today →'],
    ja: ['コピーしました ✓', 'リンクをコピーしました ✓', '今日は30秒ゲームも一息 →'],
    'zh-hans': ['已复制 ✓', '链接已复制 ✓', '今天也来一局30秒网页游戏 →'],
    es: ['Copiado ✓', 'Enlace copiado ✓', 'Hoy también un juego web de 30 s →'],
    'pt-br': ['Copiado ✓', 'Link copiado ✓', 'Hoje também um jogo web de 30 s →'],
  };
  const L = (document.documentElement.lang || 'ko').toLowerCase(), LK = TX[L] ? L : TX[L.split('-')[0]] ? L.split('-')[0] : 'ko', T = TX[LK];
  const gameUrl = `https://www.playtoday.cloud/${LK}/play/gate-rush/`;
  const shareText = () => (last ? `${document.querySelector('h1').textContent}: ${last.main} (${last.formula})` : document.title) + `\n${T[2]} ${gameUrl}`;
  async function copy(t) { try { await navigator.clipboard.writeText(t); return true; } catch { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch {} ta.remove(); return ok; } }
  $('#calc-copy')?.addEventListener('click', async (e) => { if (await copy(shareText())) flash(e.currentTarget, T[0]); gv('share_click', { via: 'copy' }); });
  $('#calc-share')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget, url = location.href;
    if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) { gv('share_click', { via: 'share' }); try { await navigator.share({ title: document.title, text: shareText(), url }); } catch {} return; }
    gv('share_click', { via: 'copy' });
    if (await copy(url)) flash(btn, T[1]);
  });
}
