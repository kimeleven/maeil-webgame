// Static i18n site builder (REBOOT-SPEC §2, §7). node scripts/build-i18n.mjs
// i18n/{lang}.json + templates below → public/{lang}/…/index.html, sitemap.xml, robots.txt.
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { CODES, COLORS, bestBuddy } from '../public/js/logic.js';
import { HEAD_SNIPPET } from '../public/js/theme.js';
// 검색엔진 인증 메타 슬롯 (t_a3c54872): env 값이 있을 때만 출력. NAVER_SITE_VERIFICATION / GOOGLE_SITE_VERIFICATION (Vercel env, 영숫자 토큰만)
const vtok = (v) => (/^[A-Za-z0-9_-]{8,128}$/.test(v || '') ? v : '');
const VERIFY = (vtok(process.env.NAVER_SITE_VERIFICATION) ? `<meta name="naver-site-verification" content="${vtok(process.env.NAVER_SITE_VERIFICATION)}">` : '') + (vtok(process.env.GOOGLE_SITE_VERIFICATION) ? `<meta name="google-site-verification" content="${vtok(process.env.GOOGLE_SITE_VERIFICATION)}">` : '');
import { buildMagnet, MAGNET_LANGS } from './build-magnet.mjs'; // magnet-harbor public game (t_1c491685, launch t_45f1a325)
import { buildPuzzle, PUZZLE_HOME, PUZZLE_FOOTER_LINKS } from './build-puzzle.mjs'; // 오늘의 퍼즐 ko (t_2d0c7a9f)
import { buildCalc, CALC_HOME, CALC_FOOTER_LINKS, CALC_LASTMOD } from './build-calc.mjs'; // 오늘 계산기 10종 (t_61344aaa)
import { buildOrbit, ORBIT_LANGS } from './build-orbit.mjs'; // orbit-switch public game (t_06bfa4bc, launch t_5537bd3e)
const OT = JSON.parse(readFileSync(new URL('../i18n/orbit-switch.json', import.meta.url), 'utf8'));
const MT = JSON.parse(readFileSync(new URL('../i18n/magnet-harbor.json', import.meta.url), 'utf8'));
const ET = JSON.parse(readFileSync(new URL('../i18n/echo-courier.json', import.meta.url), 'utf8'));
import { buildEcho, ECHO_LANGS } from './build-echo.mjs'; // echo-courier public game (t_0e812a29, launch t_5aed60dd)

const ROOT = new URL('..', import.meta.url).pathname;
export const SITE = 'https://www.playtoday.cloud';
export const LANGS = ['ko', 'en', 'ja', 'zh-hans', 'es', 'pt-br'];
const dict = Object.fromEntries(LANGS.map((l) => [l, JSON.parse(readFileSync(`${ROOT}i18n/${l}.json`, 'utf8'))]));

// ---- i18n completeness check: every lang must have exactly ko's key paths / array lengths ----
function paths(o, p = '') {
  if (Array.isArray(o)) return [`${p}[${o.length}]`, ...o.flatMap((v, i) => paths(v, `${p}[${i}]`))];
  if (o && typeof o === 'object') return Object.keys(o).flatMap((k) => paths(o[k], p ? `${p}.${k}` : k));
  return [p];
}
export function checkI18n() {
  const base = new Set(paths(dict.ko));
  const errs = [];
  for (const l of LANGS) {
    const mine = new Set(paths(dict[l]));
    for (const k of base) if (!mine.has(k)) errs.push(`${l}: missing ${k}`);
    for (const k of mine) if (!base.has(k)) errs.push(`${l}: extra ${k}`);
    const str = JSON.stringify(dict[l]);
    const mb = (str.match(/MBTI/g) || []).length, mbd = (dict[l].quiz.disclaimer.match(/MBTI/g) || []).length;
    if (mb !== mbd) errs.push(`${l}: MBTI outside disclaimer`);
    if (/\b(quiz|game|chem|cta|seo)\.[a-zA-Z]+\b/.test(Object.values(dict[l].game).filter((v) => typeof v === 'string').join(' '))) errs.push(`${l}: raw key in text`);
  }
  return errs;
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = (s, v) => String(s).replace(/\{(\w+)\}/g, (_, k) => (k in v ? v[k] : `{${k}}`));

// page registry: key → path suffix (after /{lang}/)
const PAGES = [
  ['lobby', ''], ['game', 'play/gate-rush/'], ['quiz', 'me/play-character/'],
  ...CODES.map((c) => [`type-${c}`, `me/play-character/types/${c.toLowerCase()}/`]),
  ['chem', 'friends/chemistry/'], ['quickbreak', 'play/quick-break/'], ['friendplay', 'friends/things-to-do/'], ['commute', 'play/commute/'], ['winter', 'play/winter-break/'], ['about', 'about/'], ['privacy', 'privacy/'],
];
const SHELLS = [['r', 'r/'], ['c', 'c/'], ['i', 'i/']];
const url = (l, suf) => `${SITE}/${l}/${suf}`;

function langMenu(l, suf, dyn) {
  const D = dict[l];
  return `<details class="lang"><summary aria-label="${esc(D.nav.lang)}">${esc(D.langName)} ▾</summary><ul>${LANGS.map((x) =>
    `<li><a hreflang="${dict[x].htmlLang}" lang="${dict[x].htmlLang}" href="/${x}/${suf}"${dyn ? ' data-dyn' : ''}${x === l ? ' aria-current="true"' : ''}>${esc(dict[x].langName)}</a></li>`).join('')}</ul></details>`;
}

function head({ l, title, desc, suf, og, noindex, jsonld, extra = '' }) {
  const D = dict[l];
  const alt = noindex ? '' : LANGS.map((x) => `<link rel="alternate" hreflang="${dict[x].htmlLang}" href="${url(x, suf)}">`).join('') + `<link rel="alternate" hreflang="x-default" href="${SITE}/">`;
  return `<!doctype html><html lang="${D.htmlLang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#07080c">${VERIFY}${HEAD_SNIPPET}
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}">
${noindex ? '<meta name="robots" content="noindex,follow"><meta name="referrer" content="no-referrer">' : `<link rel="canonical" href="${url(l, suf)}">${alt}`}
<meta property="og:type" content="website"><meta property="og:site_name" content="${esc(D.brand)}"><meta property="og:title" content="${esc(title)}" data-og-title><meta property="og:description" content="${esc(desc)}"><meta property="og:image" content="${SITE}${og}" data-og-image><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:url" content="${url(l, suf)}"><meta property="og:locale" content="${D.ogLocale}">
<meta name="twitter:card" content="summary_large_image"><link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/css/site.css">${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ''}${extra}</head>`;
}

function shell(l, page, suf, main, opts = {}) {
  const D = dict[l];
  const t = opts.title, d = opts.desc;
  return `${head({ l, title: t, desc: d, suf, og: opts.og || `/og/site-${l}.png`, noindex: opts.noindex, jsonld: opts.jsonld, extra: opts.extra })}
<body data-page="${page}" data-lang="${l}">
<header class="top"><a class="logo" href="/${l}/"><i></i>${esc(D.brand)}</a>${langMenu(l, suf, opts.dyn)}</header>
<main class="wrap">${main}</main>
<footer><a href="/${l}/play/gate-rush/">${esc(D.nav.play)}</a><a href="/${l}/me/play-character/">${esc(D.nav.me)}</a><a href="/${l}/friends/chemistry/">${esc(D.nav.friends)}</a><a href="/${l}/play/commute/">${esc(D.commute.link)}</a><a href="/${l}/play/quick-break/">${esc(D.quickbreak.link)}</a><a href="/${l}/play/winter-break/">${esc(D.winter.link)}</a><a href="/${l}/friends/things-to-do/">${esc(D.friendplay.link)}</a><a href="/${l}/play/magnet-harbor/">${esc(MT[l].name)}</a><a href="/${l}/play/echo-courier/">${esc(ET[l].name)}</a><a href="/${l}/play/orbit-switch/">${esc(OT[l].name)}</a>${l === 'ko' ? PUZZLE_FOOTER_LINKS + CALC_FOOTER_LINKS + '<a href="/ko/webgame/">웹겜 모아보기</a>' : WEBGAME_X[l] ? `<a href="/${l}/webgame/">${esc(WEBGAME_X[l].link)}</a>` : ''}<a href="/${l}/about/">${esc(D.nav.about)}</a><a href="/${l}/privacy/">${esc(D.nav.privacy)}</a><span>© ${esc(D.brand)} · playtoday.cloud</span></footer>
<script id="i18n" type="application/json">${JSON.stringify(D).replace(/</g, '\\u003c')}</script>
<script src="/js/gev.js"></script>
<script type="module" src="/js/season.js"></script>
<script type="module" src="/js/track.js"></script>
<script type="module" src="/js/app.js"></script>
</body></html>`;
}

const hwBanner = (D) => `<aside class="hw-banner" aria-label="Notice"><b>${esc(D.halloween.banner)}</b><span>${esc(D.halloween.sub)}</span></aside>`;
const charImg = (c, size = 96, alt = '') => `<img src="/img/chars/${c}.svg" width="${size}" height="${size}" alt="${esc(alt)}" loading="lazy">`;

const faqHtml = (D) => `<div class="prose" data-faq><h2>FAQ</h2><h3>${esc(D.faq.q1)}</h3><p>${esc(D.faq.a1)}</p><h3>${esc(D.faq.q2)}</h3><p>${esc(D.faq.a2)}</p></div>`;

function pageBody(l, key) {
  const D = dict[l], g = D.game, q = D.quiz;
  const disc = `<p class="disc" data-disclaimer>${esc(q.disclaimer)}</p>`;
  if (key === 'lobby') {
    const c = D.lobby.cards;
    return `${hwBanner(D)}<section class="hero"><span class="tag">${esc(D.common.free)}</span><h1>${esc(D.lobby.h1)}</h1><p>${esc(D.lobby.sub)}<span data-from="0" data-until="1794495600000" hidden> ${esc(D.lobby.subSeason)}</span><span data-from="1794495600000" data-until="1796050800000" hidden> ${esc(D.lobby.subSeason2)}</span></p></section>
${l === 'ko' ? PUZZLE_HOME + CALC_HOME + '<section><h2>심심할 때 5분게임, 30초면 시작</h2><p class="muted">5분게임 찾는 중이라면 게이트 러시 한 판부터. <a href="/ko/webgame/">웹겜 모아보기</a></p></section>' : ''}<nav class="grid3" aria-label="${esc(D.brand)}">
<a class="card cat hl" href="/${l}/play/gate-rush/" aria-label="${esc(c.play.aria)}"><span class="tag">${esc(D.nav.play)}</span><img src="/img/gate-rush.svg" width="150" height="150" alt=""><h3>${esc(c.play.t)}</h3><p>${esc(c.play.d)}</p><span class="btn go">${esc(c.play.cta)}</span></a>
<a class="card cat" href="/${l}/me/play-character/"><span class="tag">${esc(D.nav.me)}</span>${charImg('SPH', 150)}<h3>${esc(c.me.t)}</h3><p>${esc(c.me.d)}</p><span class="btn ghost go">${esc(c.me.cta)}</span></a>
<a class="card cat" href="/${l}/friends/chemistry/"><span class="tag">${esc(D.nav.friends)}</span><span class="pair">${charImg('SIH', 72)}${charImg('CPT', 72)}</span><h3>${esc(c.friends.t)}</h3><p>${esc(c.friends.d)}</p><span class="btn ghost go">${esc(c.friends.cta)}</span></a>
</nav>
<section class="card row" style="justify-content:space-between"><div><h3>${esc(D.lobby.daily)}</h3><p class="muted" style="margin:0">${esc(D.lobby.dailyDesc)}</p></div><a class="btn ghost" href="/${l}/play/gate-rush/" data-daily>${esc(D.lobby.daily)} →</a></section>
<a class="card row" href="/${l}/play/magnet-harbor/" data-game="magnet-harbor" style="margin-top:14px;justify-content:space-between;text-decoration:none;color:inherit"><img src="/img/magnet-harbor.svg" width="64" height="64" alt=""><div style="flex:1;min-width:0"><h3>${esc(MT[l].name)}</h3><p class="muted" style="margin:0">${esc(MT[l].desc)}</p></div><span class="btn ghost">${esc(MT[l].start)} →</span></a>
<a class="card row" href="/${l}/play/echo-courier/" data-game="echo-courier" style="margin-top:14px;justify-content:space-between;text-decoration:none;color:inherit"><div style="flex:1;min-width:0"><h3>${esc(ET[l].name)}</h3><p class="muted" style="margin:0">${esc(ET[l].desc)}</p></div><span class="btn ghost">${esc(MT[l].start)} →</span></a>
<a class="card row" href="/${l}/play/orbit-switch/" data-game="orbit-switch" style="margin-top:14px;justify-content:space-between;text-decoration:none;color:inherit"><div style="flex:1;min-width:0"><h3>${esc(OT[l].name)}</h3><p class="muted" style="margin:0">${esc(OT[l].desc)}</p></div><span class="btn ghost">${esc(MT[l].start)} →</span></a>
<p class="muted"><a href="/${l}/play/quick-break/">${esc(D.quickbreak.link)}</a> · <a href="/${l}/friends/things-to-do/">${esc(D.friendplay.link)}</a> · <a href="/${l}/play/commute/">${esc(D.commute.link)}</a> · <a href="/${l}/play/winter-break/">${esc(D.winter.link)}</a></p>`;
  }
  if (key === 'game') {
    return `${hwBanner(D)}<div class="layout-game"><section class="intro"><span class="tag">${esc(D.nav.play)} · 30s</span><h1>${esc(g.name)} — ${esc(g.h1)}</h1><p>${esc(g.intro)}</p>
<p class="muted"><a href="/${l}/play/quick-break/">${esc(D.quickbreak.link)}</a> · <a href="/${l}/play/commute/">${esc(D.commute.link)}</a> · <a href="/${l}/play/magnet-harbor/">${esc(MT[l].name)}</a></p>
<h2>${esc(g.controlsTitle)}</h2><ul class="prose">${g.controls.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
<h2>${esc(g.tipsTitle)}</h2><ol class="prose">${g.tips.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>
<h2>${esc(g.patternsTitle)}</h2><ul class="prose">${Object.values(g.patterns).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
<div class="shots"><img src="/img/shots/rush-1.png" width="540" height="960" alt="${esc(g.shotAlt[0])}" loading="lazy"><img src="/img/shots/rush-2.png" width="540" height="960" alt="${esc(g.shotAlt[1])}" loading="lazy"></div></section>
<section class="gamecol" id="game" aria-label="${esc(g.name)}"></section></div>`;
  }
  if (key === 'quiz') {
    return `<section class="hero"><span class="tag">${esc(D.nav.me)}</span><h1>${esc(q.title)}</h1><p>${esc(q.intro)}</p></section>
<section id="quiz" class="card"><button class="btn" data-start>${esc(q.start)}</button></section>${disc}
<h2>${esc(q.charsTitle)}</h2><div class="chars">${CODES.map((c) => `<a class="card" href="/${l}/me/play-character/types/${c.toLowerCase()}/">${charImg(c, 96, D.types[c].name)}<b>${esc(D.types[c].name)}</b><span>${esc(D.types[c].one)}</span></a>`).join('')}</div>`;
  }
  if (key.startsWith('type-')) {
    const c = key.slice(5), T = D.types[c], b = bestBuddy(c);
    return `<section class="hero result"><img class="char" src="/img/chars/${c}.svg" width="240" height="240" alt="${esc(T.name)}"><div><span class="tag" style="background:${COLORS[c]}33;color:${COLORS[c]}">${esc(q.title)}</span><h1>${esc(T.name)}</h1><p><b>${esc(T.one)}</b></p><p>${esc(T.desc)}</p>
<p>${esc(q.best)}: <a href="/${l}/me/play-character/types/${b.toLowerCase()}/">${esc(D.types[b].name)}</a></p><div class="row"><a class="btn" href="/${l}/me/play-character/">${esc(q.takeQuiz)}</a><a class="btn ghost" href="/${l}/friends/chemistry/">${esc(D.cta.chem)}</a><a class="btn ghost" href="/${l}/play/gate-rush/">${esc(D.lobby.cards.play.cta)}</a></div></div></section>${disc}
<p class="muted"><a href="/${l}/friends/things-to-do/">${esc(D.friendplay.link)}</a></p>
<h2>${esc(q.charsTitle)}</h2><div class="chars">${CODES.filter((x) => x !== c).map((x) => `<a class="card" href="/${l}/me/play-character/types/${x.toLowerCase()}/">${charImg(x, 72, D.types[x].name)}<b>${esc(D.types[x].name)}</b></a>`).join('')}</div>`;
  }
  if (key === 'quickbreak') {
    const Q = D.quickbreak;
    return `<section class="hero"><span class="tag">${esc(D.common.free)}</span><h1>${esc(Q.h1)}</h1><p>${esc(Q.p1)}</p><p>${esc(Q.p2)}</p><div class="row"><a class="btn" href="/${l}/play/gate-rush/">${esc(D.lobby.cards.play.cta)}</a><a class="btn ghost" href="/${l}/me/play-character/">${esc(D.lobby.cards.me.cta)}</a><a class="btn ghost" href="/${l}/friends/chemistry/">${esc(D.cta.chem)}</a></div><p class="muted"><a href="/${l}/friends/things-to-do/">${esc(D.friendplay.link)}</a> · <a href="/${l}/play/commute/">${esc(D.commute.link)}</a> · <a href="/${l}/play/winter-break/">${esc(D.winter.link)}</a> · <a href="/${l}/play/magnet-harbor/">${esc(MT[l].name)}</a> · <a href="/${l}/play/echo-courier/">${esc(ET[l].name)}</a> · <a href="/${l}/play/orbit-switch/">${esc(OT[l].name)}</a></p>${faqHtml(D)}</section>`;
  }
  if (key === 'friendplay') {
    const F = D.friendplay;
    return `<section class="hero"><span class="tag">${esc(D.common.free)}</span><h1>${esc(F.h1)}</h1><p>${esc(F.p1)}</p><p>${esc(F.p2)}</p><div class="row"><a class="btn" href="/${l}/friends/chemistry/">${esc(D.cta.chem)}</a><a class="btn ghost" href="/${l}/me/play-character/">${esc(D.lobby.cards.me.cta)}</a><a class="btn ghost" href="/${l}/play/gate-rush/">${esc(D.lobby.cards.play.cta)}</a></div><p class="muted"><a href="/${l}/play/quick-break/">${esc(D.quickbreak.link)}</a> · <a href="/${l}/play/commute/">${esc(D.commute.link)}</a> · <a href="/${l}/play/winter-break/">${esc(D.winter.link)}</a> · <a href="/${l}/play/magnet-harbor/">${esc(MT[l].name)}</a> · <a href="/${l}/play/echo-courier/">${esc(ET[l].name)}</a> · <a href="/${l}/play/orbit-switch/">${esc(OT[l].name)}</a></p></section>`;
  }
  if (key === 'commute') {
    const M = D.commute;
    return `<section class="hero"><span class="tag">${esc(D.common.free)}</span><h1>${esc(M.h1)}</h1><p>${esc(M.p1)}</p><p>${esc(M.p2)}</p><div class="row"><a class="btn" href="/${l}/play/gate-rush/">${esc(D.lobby.cards.play.cta)}</a><a class="btn ghost" href="/${l}/me/play-character/">${esc(D.lobby.cards.me.cta)}</a><a class="btn ghost" href="/${l}/friends/chemistry/">${esc(D.cta.chem)}</a></div><p class="muted"><a href="/${l}/play/quick-break/">${esc(D.quickbreak.link)}</a> · <a href="/${l}/friends/things-to-do/">${esc(D.friendplay.link)}</a> · <a href="/${l}/play/winter-break/">${esc(D.winter.link)}</a> · <a href="/${l}/play/magnet-harbor/">${esc(MT[l].name)}</a> · <a href="/${l}/play/echo-courier/">${esc(ET[l].name)}</a> · <a href="/${l}/play/orbit-switch/">${esc(OT[l].name)}</a></p></section>`;
  }
  if (key === 'winter') {
    const W = D.winter;
    return `<section class="hero"><span class="tag">${esc(D.common.free)}</span><h1>${esc(W.h1)}</h1><p>${esc(W.p1)}</p><p>${esc(W.p2)}</p><div class="row"><a class="btn" href="/${l}/play/gate-rush/">${esc(D.lobby.cards.play.cta)}</a><a class="btn ghost" href="/${l}/me/play-character/">${esc(D.lobby.cards.me.cta)}</a><a class="btn ghost" href="/${l}/friends/chemistry/">${esc(D.cta.chem)}</a></div><p class="muted"><a href="/${l}/play/quick-break/">${esc(D.quickbreak.link)}</a> · <a href="/${l}/friends/things-to-do/">${esc(D.friendplay.link)}</a> · <a href="/${l}/play/commute/">${esc(D.commute.link)}</a> · <a href="/${l}/play/magnet-harbor/">${esc(MT[l].name)}</a> · <a href="/${l}/play/echo-courier/">${esc(ET[l].name)}</a> · <a href="/${l}/play/orbit-switch/">${esc(OT[l].name)}</a></p>${faqHtml(D)}</section>`;
  }
  if (key === 'chem') {
    const C = D.chem;
    return `<section class="hero"><span class="tag">${esc(D.nav.friends)}</span><h1>${esc(C.h1)}</h1><p>${esc(C.intro)}</p><ol class="prose">${C.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></section>
<section id="chem" class="card"><p>${esc(D.common.loading)}</p></section>${disc}<p class="muted"><a href="/${l}/friends/things-to-do/">${esc(D.friendplay.link)}</a> · <a href="/${l}/play/commute/">${esc(D.commute.link)}</a></p>`;
  }
  if (key === 'about' || key === 'privacy') {
    const P = D[key];
    return `<section class="hero"><h1>${esc(P.h1)}</h1></section><section class="card prose">${P.body.map((p) => `<p>${esc(p)}</p>`).join('')}${key === 'about' ? `<p>${esc(q.disclaimer)}</p>` : ''}</section>`;
  }
  throw new Error(key);
}

function meta(l, key) {
  const D = dict[l], S = D.seo;
  if (key.startsWith('type-')) { const T = D.types[key.slice(5)]; const full = `${T.name} — ${T.one} | ${D.brand}`, short = `${T.name} | ${D.brand}`; return { title: full.length <= 60 ? full : short.length <= 60 ? short : T.name, desc: T.desc.split(/(?<=[.!?。！？])\s*/).slice(0, 2).join(' ').trim() }; }
  if (key === 'quickbreak') return { title: D.quickbreak.title, desc: D.quickbreak.desc };
  if (key === 'winter') return { title: D.winter.title, desc: D.winter.desc };
  if (key === 'friendplay') return { title: D.friendplay.title, desc: D.friendplay.desc };
  if (key === 'commute') return { title: D.commute.title, desc: D.commute.desc };
  const k = { lobby: 'lobby', game: 'game', quiz: 'quiz', chem: 'chem', quickbreak: 'quickbreak', about: 'about', privacy: 'privacy' }[key];
  return { title: S[k].title, desc: S[k].desc };
}

function jsonld(l, key, m) {
  const D = dict[l];
  if (key === 'lobby') {
    const c = D.lobby.cards, items = [[c.play.t, 'play/gate-rush/'], [c.me.t, 'me/play-character/'], [c.friends.t, 'friends/chemistry/'], [D.quickbreak.link, 'play/quick-break/'], [D.commute.link, 'play/commute/'], [D.friendplay.link, 'friends/things-to-do/'], [D.winter.link, 'play/winter-break/']];
    return { '@context': 'https://schema.org', '@graph': [
      { '@type': 'WebSite', name: D.brand, url: url(l, ''), inLanguage: D.htmlLang },
      { '@type': 'ItemList', name: D.brand, itemListElement: items.map(([name, p], i) => ({ '@type': 'ListItem', position: i + 1, name, url: url(l, p) })) }] };
  }
  if (key === 'game') return { '@context': 'https://schema.org', '@graph': [{ '@type': 'VideoGame', name: D.game.name, description: m.desc, genre: 'Arcade', gamePlatform: 'Web browser', inLanguage: D.htmlLang, url: url(l, 'play/gate-rush/'), offers: { '@type': 'Offer', price: 0, priceCurrency: 'USD' } }, { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: D.brand, item: url(l, '') }, { '@type': 'ListItem', position: 2, name: D.nav.play, item: url(l, 'play/gate-rush/') }] }] };
  const self = url(l, PAGES.find((p) => p[0] === key)[1]);
  const page = { '@type': 'WebPage', name: m.title, description: m.desc, inLanguage: D.htmlLang, url: self };
  const crumbs = [[D.brand, url(l, '')]];
  const quizUrl = url(l, 'me/play-character/'), gameUrl = url(l, 'play/gate-rush/');
  if (key === 'quiz') crumbs.push([D.nav.me, quizUrl]);
  else if (key.startsWith('type-')) crumbs.push([D.nav.me, quizUrl], [D.types[key.slice(5)].name, self]);
  else if (key === 'chem') crumbs.push([D.nav.friends, self]);
  else if (key === 'quickbreak') crumbs.push([D.nav.play, gameUrl], [D.quickbreak.h1, self]);
  else if (key === 'winter') crumbs.push([D.nav.play, gameUrl], [D.winter.h1, self]);
  else if (key === 'commute') crumbs.push([D.nav.play, gameUrl], [D.commute.h1, self]);
  else if (key === 'friendplay') crumbs.push([D.nav.friends, url(l, 'friends/chemistry/')], [D.friendplay.h1, self]);
  else crumbs.push([D.nav[key], self]); // about, privacy
  const graph = [page, { '@type': 'BreadcrumbList', itemListElement: crumbs.map(([name, item], i) => ({ '@type': 'ListItem', position: i + 1, name, item })) }];
  if (key === 'quickbreak' || key === 'winter') graph.push({ '@type': 'FAQPage', mainEntity: [[D.faq.q1, D.faq.a1], [D.faq.q2, D.faq.a2]].map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });
  // quiz: ItemList of the 8 types shown on the page (names + links only, no ratings/reviews)
  if (key === 'quiz') graph.push({ '@type': 'ItemList', name: D.quiz.charsTitle, itemListElement: CODES.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: D.types[c].name, url: url(l, `me/play-character/types/${c.toLowerCase()}/`) })) });
  return { '@context': 'https://schema.org', '@graph': graph };
}

function ogFor(l, key) {
  if (key === 'game') return '/og/game.png';
  if (key.startsWith('type-')) return `/og/type-${key.slice(5)}-${l}.png`;
  return `/og/site-${l}.png`;
}

function write(rel, html) {
  const p = `${ROOT}public/${rel}`;
  mkdirSync(p.replace(/[^/]*$/, ''), { recursive: true });
  writeFileSync(p, html);
}

// 의견남기기 위젯(t_3a1c9b31): 모든 언어 페이지 </body> 앞에 공개 모드 위젯을 붙인다. 수집은 nara-web 공개 API.
// site = maeil-<게임 slug>(play/<slug>/), 그 밖의 페이지는 maeil-site. 캡처는 사용자가 켤 때만(public="1").
export const FEEDBACK_ENDPOINT = 'https://nara.salusai.kr/api/feedback/public';
const FB_LABEL = { ko: '의견남기기', en: 'Feedback', ja: 'ご意見', 'zh-hans': '意见反馈', es: 'Comentarios', 'pt-br': 'Feedback' };
export function feedbackTag(rel) {
  const m = rel.match(/^([a-z-]+)\/play\/([a-z0-9-]+)\//);
  const l = rel.split('/')[0];
  const site = 'maeil-' + (m ? m[2] : 'site');
  return `<feedback-widget public="1" site="${site}" endpoint="${FEEDBACK_ENDPOINT}" label="${FB_LABEL[l] || 'Feedback'}"></feedback-widget><script src="/js/feedback-widget.js" defer></script>\n`;
}
function injectFeedback() {
  const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${d}/${e.name}`) : e.name.endsWith('.html') ? [`${d}/${e.name}`] : []));
  const files = ['index.html', ...LANGS.flatMap((l) => walk(`${ROOT}public/${l}`).map((p) => p.slice(`${ROOT}public/`.length)))];
  for (const rel of files) {
    const p = `${ROOT}public/${rel}`;
    const h = readFileSync(p, 'utf8');
    if (h.includes('<feedback-widget') || !h.includes('</body>')) continue;
    writeFileSync(p, h.replace('</body>', feedbackTag(rel) + '</body>'));
  }
}

// 1106-21: ko 전용 얇은 '웹겜' 랜딩 (hreflang 없음, 타 언어 불변). 홈 H1/desc는 건드리지 않는다.
// 1107-09: /ko/webgame/ 본문 보강(게임별 설명·키워드 단락·FAQ·내부 링크). title/desc/H1/카드 불변.
const WEBGAME_FAQ = [
  ['웹겜은 무료인가요?', '네, 매일웹겜의 웹겜 4종은 모두 무료예요. 결제나 구독 없이 바로 즐길 수 있어요.'],
  ['가입이 필요한가요?', '아니요. 설치도 가입도 없이 브라우저에서 바로 시작해요. 기록을 공유할 때만 별명(선택)이 쓰여요.'],
  ['모바일에서도 할 수 있나요?', '네. 스마트폰과 PC 브라우저에서 같은 주소로 열려요. 모바일은 화면을 탭하거나 드래그하고, PC는 키보드를 써요.'],
  ['한 판은 얼마나 걸리나요?', '게이트 러시는 한 판이 약 30초이고, 자석 항구·궤도 스위치·잔상 배달은 한 판이 약 90초예요.'],
];
const WEBGAME_BODY = `<section><h2>5분게임으로 웹겜, 이렇게 골라요</h2>
<p><b>게이트 러시</b> — 30초 동안 좌우 게이트 중 하나를 골라 군단을 키우고, 드론과 레이저를 피해 구역 끝의 보스를 넘는 러너예요. 키보드 ← → 또는 모바일 드래그로 움직이고, 구역을 깰수록 빨라져서 짧게 여러 번 하기 좋아요.</p>
<p><b>자석 항구</b> — 자석 크레인으로 흔들리는 화물을 배에 쌓아 90초 동안 최대한 많이 보내는 게임이에요. 타이밍과 균형이 중요해서 차분하게 집중하고 싶을 때 잘 맞아요.</p>
<p><b>궤도 스위치</b> — 화면을 탭할 때마다 궤도가 바뀌어 장애물을 피하는 90초 웹게임이에요. 조작은 탭 하나뿐이라 처음 해도 금방 익숙해지고, 점점 빨라지는 속도가 난이도를 만들어요.</p>
<p><b>잔상 배달</b> — 잔상으로 남은 이전 경로를 기억해서 같은 길로 배달하는 90초 게임이에요. 기억력과 순발력을 같이 쓰는 편이라 가볍게 머리를 쓰고 싶을 때 좋아요.</p></section>
<section><h2>설치 없이 바로 하는 웹겜이란?</h2>
<p>웹겜(웹게임)은 앱을 내려받지 않고 브라우저에서 바로 실행하는 무료 브라우저 게임이에요. 매일웹겜의 짧은 게임은 링크를 열면 곧바로 시작되고, 가입이나 설치가 없어요. 스마트폰과 PC 모두 같은 주소로 즐길 수 있어서 이동 중이나 쉬는 시간에 한 판 하기 좋아요.</p>
<p>한 판이 30초에서 90초라서 부담 없는 짧은 게임을 찾는 분께 맞아요. 마음에 들면 같은 판 도전 링크로 친구에게 기록을 겨뤄 보자고 보낼 수도 있어요. 공유는 언제나 선택이고, 공유하지 않아도 모든 게임을 끝까지 즐길 수 있어요. 처음이라면 가장 짧은 게이트 러시 한 판으로 가볍게 시작해 보세요. 게임을 마친 뒤에는 10문항 캐릭터 테스트와 친구 케미도 이어서 해 볼 수 있어요.</p></section>
<section><h2>자주 묻는 질문</h2>
${WEBGAME_FAQ.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join('\n')}</section>
<p>게임 말고 숫자 계산이 필요하면: <a href="/calc/">오늘 계산기 10종</a> · <a href="/calc/percent/">퍼센트 계산기</a> · <a href="/calc/wage/">시급 계산기</a> · <a href="/calc/age/">만 나이 계산기</a></p>
<p>30초 게임 다음엔 나 알아보기: <a href="/ko/me/play-character/">나의 놀이 캐릭터 테스트</a> · <a href="/ko/friends/chemistry/">친구 케미 보기</a></p>`;
const WEBGAME = { title: '웹겜 모음 — 설치·로그인 없이 5분 안에 끝나는 무료 웹게임 4종', desc: '5분게임 찾는다면 여기. 설치·로그인 없이 바로 하는 무료 웹겜 4종, 한 판 30~90초, 모바일·PC 모두 가능.', h1: '설치 없이 바로 하는 웹겜 4종' };
function buildWebgame() {
  const D = dict.ko, suf = 'webgame/', self = url('ko', suf);
  const cards = [[D.game.name, 'play/gate-rush/', '30초 안에 문을 골라 달리는 무료 웹겜'], [MT.ko.name, 'play/magnet-harbor/', MT.ko.seoDesc], [OT.ko.name, 'play/orbit-switch/', OT.ko.seoDesc], [ET.ko.name, 'play/echo-courier/', ET.ko.seoDesc]];
  const main = `<section class="hero"><h1>${esc(WEBGAME.h1)}</h1><p>${esc(WEBGAME.desc)}</p></section>
<section class="cards" style="display:grid;grid-template-columns:1fr;gap:12px">${cards.map(([n, p, d]) => `<a class="card" style="display:block" href="/ko/${p}"><b>${esc(n)}</b><br><span class="muted">${esc(d)}</span></a>`).join('')}</section>
${WEBGAME_BODY}
<p><a href="/ko/">${esc(D.brand)} 홈으로</a></p>`;
  const jsonld = { '@context': 'https://schema.org', '@graph': [{ '@type': 'WebPage', name: WEBGAME.title, description: WEBGAME.desc, inLanguage: D.htmlLang, url: self }, { '@type': 'FAQPage', mainEntity: WEBGAME_FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }, { '@type': 'ItemList', name: WEBGAME.h1, itemListElement: cards.map(([name, p], i) => ({ '@type': 'ListItem', position: i + 1, name, url: url('ko', p) })) }] };
  let html = shell('ko', 'webgame', suf, main, { title: WEBGAME.title, desc: WEBGAME.desc, og: '/og/site-ko.png', jsonld });
  html = html.replace(/<link rel="alternate"[^>]*>/g, '').replace(/<details class="lang">.*?<\/details>/s, '');
  html = html.replace('</head>', WEBGAME_ALT + '</head>');
  write(`ko/${suf}index.html`, html);
  return self;
}


// 1119-08: /en·/ja /webgame/, 1119-09: zh-hans·es·pt-br 추가 — 6언어 hreflang 상호.
const WEBGAME_X = {
  en: { link: 'All web games', title: 'Free Web Games — No Install, No Login, 30-Second Rounds', h1: 'Free web games you can play right now', desc: 'Looking for a quick browser game? Four free web games, 30–90 seconds a round, on phone or PC. No install, no sign-up.',
    cards: [['gate-rush', 'Pick a gate, grow your squad and beat the boss in a 30-second runner.'], ['magnet-harbor', 'Stack swinging cargo with a magnet crane and ship boats in 90 seconds.'], ['orbit-switch', 'Tap to switch orbits and dodge obstacles for 90 seconds.'], ['echo-courier', 'Remember your echo trail and deliver along the same route for 90 seconds.']],
    h2a: 'How to pick a web game', pa: 'Gate Rush takes about 30 seconds a round. Magnet Harbor, Orbit Switch and Echo Courier take about 90 seconds. Controls are a drag or a tap, so you can start in seconds.',
    h2b: 'What is a no-install web game?', pb: 'A web game runs in your browser: open the link and play. There is nothing to download and no account to create, on phone or desktop. Sharing a challenge link with a friend is always optional.',
    faq: [['Are these web games free?', 'Yes. All four are free, with no purchase or subscription.'], ['Do I need to sign up?', 'No. Open the page and press start. A nickname is only used if you choose to share a score.'], ['Can I play on my phone?', 'Yes. The same address works on phone and desktop browsers.'], ['How long is one round?', 'Gate Rush is about 30 seconds; the other three are about 90 seconds.']], faqH: 'FAQ', home: 'Back to Daily Arcade' },
  ja: { link: 'ブラウザゲーム一覧', title: '無料ブラウザゲーム集 — インストール・ログイン不要の30秒ゲーム', h1: '今すぐ遊べる無料ブラウザゲーム', desc: '暇つぶしに30秒ゲームを。無料ブラウザゲーム4種、1回30〜90秒、スマホでもPCでも。インストール・登録なし。',
    cards: [['gate-rush', 'ゲートを選んで軍団を育て、30秒でボスを突破するランゲーム。'], ['magnet-harbor', '磁石クレーンで揺れる荷物を積み、90秒で船を出港させる。'], ['orbit-switch', 'タップで軌道を切り替えて障害物を避ける90秒ゲーム。'], ['echo-courier', '残像の軌道を覚えて同じ道で届ける90秒ゲーム。']],
    h2a: 'ブラウザゲームの選び方', pa: 'ゲートラッシュは1回約30秒、マグネットハーバー・オービットスイッチ・残像デリバリーは約90秒です。操作はドラッグかタップだけなので、すぐ始められます。',
    h2b: 'インストール不要のブラウザゲームとは', pb: 'ブラウザゲームはアプリを入れずに、リンクを開くだけで遊べるゲームです。登録も不要で、スマホでもPCでも同じアドレスで遊べます。挑戦リンクの共有は任意です。',
    faq: [['無料で遊べますか？', 'はい。4種すべて無料で、課金や購読はありません。'], ['登録は必要ですか？', 'いいえ。ページを開いてスタートを押すだけです。ニックネームはスコアを共有する時だけ使います。'], ['スマホでも遊べますか？', 'はい。スマホでもPCでも同じアドレスで開けます。'], ['1回はどのくらいですか？', 'ゲートラッシュは約30秒、ほかの3種は約90秒です。']], faqH: 'よくある質問', home: 'まいにちアーケードのホームへ' },
  'zh-hans': { link: '网页游戏合集', title: '免费网页游戏合集 — 免安装、免登录的30秒小游戏', h1: '打开就能玩的免费网页游戏', desc: '想打发时间？4款免费网页游戏，每局30至90秒，手机电脑都能玩，无需安装、无需注册。',
    cards: [['gate-rush', '选择闸门壮大队伍，30秒内击败终点Boss的跑酷游戏。'], ['magnet-harbor', '用磁力吊机堆叠摇晃的货物，90秒内让货船出港。'], ['orbit-switch', '点击切换轨道躲避障碍的90秒游戏。'], ['echo-courier', '记住残影轨迹，沿着同一路线送货的90秒游戏。']],
    h2a: '如何挑选网页游戏', pa: '闸门冲刺每局约30秒，磁力港口、轨道切换和残影快递每局约90秒。操作只有拖动或点击，几秒就能上手。',
    h2b: '什么是免安装的网页游戏？', pb: '网页游戏直接在浏览器中运行：打开链接就能玩，无需下载，也无需创建账号，手机和电脑都能用。把挑战链接分享给朋友完全是自愿的。',
    faq: [['这些网页游戏免费吗？', '是的，4款全部免费，没有付费或订阅。'], ['需要注册吗？', '不需要。打开页面点击开始即可。只有在你选择分享成绩时才会用到昵称。'], ['可以在手机上玩吗？', '可以。手机和电脑浏览器使用同一个地址。'], ['一局要多久？', '闸门冲刺约30秒，其余三款约90秒。']], faqH: '常见问题', home: '返回每日街机' },
  es: { link: 'Todos los juegos web', title: 'Juegos web gratis — sin instalar ni registrarte, partidas de 30 s', h1: 'Juegos web gratis para jugar ahora mismo', desc: '¿Buscas un juego rápido en el navegador? Cuatro juegos web gratis, de 30 a 90 segundos, en móvil o PC. Sin instalar ni registrarte.',
    cards: [['gate-rush', 'Elige una puerta, haz crecer tu escuadrón y vence al jefe en 30 segundos.'], ['magnet-harbor', 'Apila carga que se balancea con una grúa magnética y zarpa en 90 segundos.'], ['orbit-switch', 'Toca para cambiar de órbita y esquiva obstáculos durante 90 segundos.'], ['echo-courier', 'Recuerda tu estela y entrega por la misma ruta durante 90 segundos.']],
    h2a: 'Cómo elegir un juego web', pa: 'Gate Rush dura unos 30 segundos por partida. Magnet Harbor, Orbit Switch y Echo Courier duran unos 90 segundos. Solo arrastras o tocas, así que empiezas en segundos.',
    h2b: '¿Qué es un juego web sin instalación?', pb: 'Un juego web se ejecuta en tu navegador: abres el enlace y juegas. No hay nada que descargar ni cuenta que crear, en móvil o en ordenador. Compartir un reto con un amigo es siempre opcional.',
    faq: [['¿Estos juegos web son gratis?', 'Sí. Los cuatro son gratis, sin compras ni suscripciones.'], ['¿Necesito registrarme?', 'No. Abre la página y pulsa empezar. El apodo solo se usa si decides compartir tu puntuación.'], ['¿Puedo jugar en el móvil?', 'Sí. La misma dirección funciona en el navegador del móvil y del ordenador.'], ['¿Cuánto dura una partida?', 'Gate Rush dura unos 30 segundos; los otros tres, unos 90.']], faqH: 'Preguntas frecuentes', home: 'Volver a Arcade Diario' },
  'pt-br': { link: 'Todos os jogos web', title: 'Jogos web grátis — sem instalar nem cadastro, rodadas de 30 s', h1: 'Jogos web grátis para jogar agora', desc: 'Quer um jogo rápido no navegador? Quatro jogos web grátis, de 30 a 90 segundos, no celular ou no PC. Sem instalar e sem cadastro.',
    cards: [['gate-rush', 'Escolha um portão, aumente seu esquadrão e vença o chefe em 30 segundos.'], ['magnet-harbor', 'Empilhe cargas balançando com um guindaste magnético e parta em 90 segundos.'], ['orbit-switch', 'Toque para trocar de órbita e desviar de obstáculos por 90 segundos.'], ['echo-courier', 'Lembre o rastro do eco e entregue pelo mesmo caminho por 90 segundos.']],
    h2a: 'Como escolher um jogo web', pa: 'Gate Rush leva cerca de 30 segundos por rodada. Magnet Harbor, Orbit Switch e Echo Courier levam cerca de 90 segundos. Você só arrasta ou toca, então começa em segundos.',
    h2b: 'O que é um jogo web sem instalação?', pb: 'Um jogo web roda no navegador: abra o link e jogue. Não há nada para baixar nem conta para criar, no celular ou no computador. Compartilhar um desafio com um amigo é sempre opcional.',
    faq: [['Esses jogos web são grátis?', 'Sim. Os quatro são grátis, sem compras nem assinatura.'], ['Preciso me cadastrar?', 'Não. Abra a página e toque em começar. O apelido só é usado se você escolher compartilhar a pontuação.'], ['Posso jogar no celular?', 'Sim. O mesmo endereço funciona no navegador do celular e do computador.'], ['Quanto dura uma rodada?', 'Gate Rush leva cerca de 30 segundos; os outros três, cerca de 90.']], faqH: 'Perguntas frequentes', home: 'Voltar ao Arcade Diário' },
};
const WEBGAME_ALT = LANGS
  .map((x) => `<link rel="alternate" hreflang="${dict[x].htmlLang}" href="${url(x, 'webgame/')}">`).join('') + `<link rel="alternate" hreflang="x-default" href="${SITE}/en/webgame/">`;
function buildWebgameX(l) {
  const X = WEBGAME_X[l], D = dict[l], suf = 'webgame/', self = url(l, suf);
  const names = { 'gate-rush': D.game.name, 'magnet-harbor': MT[l].name, 'orbit-switch': OT[l].name, 'echo-courier': ET[l].name };
  const cards = X.cards.map(([k, d]) => [names[k], `play/${k}/`, d]);
  const main = `<section class="hero"><h1>${esc(X.h1)}</h1><p>${esc(X.desc)}</p></section>
<section class="cards" style="display:grid;grid-template-columns:1fr;gap:12px">${cards.map(([n, p, d]) => `<a class="card" style="display:block" href="/${l}/${p}"><b>${esc(n)}</b><br><span class="muted">${esc(d)}</span></a>`).join('')}</section>
<section><h2>${esc(X.h2a)}</h2><p>${esc(X.pa)}</p></section>
<section><h2>${esc(X.h2b)}</h2><p>${esc(X.pb)}</p></section>
<section><h2>${esc(X.faqH)}</h2>${X.faq.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join('\n')}</section>
<p><a href="/${l}/">${esc(X.home)}</a></p>`;
  const jsonld = { '@context': 'https://schema.org', '@graph': [{ '@type': 'WebPage', name: X.title, description: X.desc, inLanguage: D.htmlLang, url: self }, { '@type': 'FAQPage', mainEntity: X.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }, { '@type': 'ItemList', name: X.h1, itemListElement: cards.map(([name, p], i) => ({ '@type': 'ListItem', position: i + 1, name, url: url(l, p) })) }] };
  let html = shell(l, 'webgame', suf, main, { title: X.title, desc: X.desc, og: `/og/site-${l}.png`, jsonld });
  html = html.replace(/<link rel="alternate"[^>]*>/g, '').replace(/<details class="lang">.*?<\/details>/s, '');
  html = html.replace('</head>', WEBGAME_ALT + '</head>');
  write(`${l}/${suf}index.html`, html);
  return self;
}

export function build() {
  const errs = checkI18n();
  if (errs.length) { console.error('i18n check FAILED:\n' + errs.join('\n')); process.exit(1); }
  console.log(`i18n check ok: ${LANGS.length} langs, ${paths(dict.ko).length} key paths each, MBTI only in disclaimer`);
  for (const l of LANGS) if (existsSync(`${ROOT}public/${l}`)) rmSync(`${ROOT}public/${l}`, { recursive: true });
  let n = 0;
  for (const l of LANGS) {
    for (const [key, suf] of PAGES) {
      const m = meta(l, key);
      write(`${l}/${suf}index.html`, shell(l, key, suf, pageBody(l, key), { ...m, og: ogFor(l, key), jsonld: jsonld(l, key, m) }));
      n++;
    }
    const D = dict[l];
    for (const [key, suf] of SHELLS) {
      const title = key === 'i' ? D.seo.chem.title : key === 'c' || key === 'r' ? `${D.game.challengeTitle} | ${D.brand}` : D.brand;
      const desc = key === 'i' ? D.seo.chem.desc : key === 'c' ? D.seo.game.desc : D.seo.lobby.desc;
      const main = key === 'c' ? `<section class="gamecol" id="game"></section>` : key === 'i' ? `<section id="chem" class="card"><p>${esc(D.common.loading)}</p></section><p class="disc" data-disclaimer>${esc(D.quiz.disclaimer)}</p>` : `<section id="share" class="card"><p>${esc(D.common.loading)}</p></section>`;
      write(`${l}/${suf}index.html`, shell(l, key, suf, main, { title, desc, noindex: true, dyn: true, og: key === 'c' || key === 'r' ? `/og/challenge-${l}.png` : `/og/site-${l}.png` }));
    }
  }
  // root: language picker, English body, x-default
  const en = dict.en;
  const alt = LANGS.map((x) => `<link rel="alternate" hreflang="${dict[x].htmlLang}" href="${url(x, '')}">`).join('') + `<link rel="alternate" hreflang="x-default" href="${SITE}/">`;
  writeFileSync(`${ROOT}public/index.html`, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#07080c">${VERIFY}<title>${esc(en.seo.root.title)}</title><meta name="description" content="${esc(en.seo.root.desc)}"><link rel="canonical" href="${SITE}/">${alt}
<meta property="og:type" content="website"><meta property="og:title" content="${esc(en.seo.root.title)}"><meta property="og:description" content="${esc(en.seo.root.desc)}"><meta property="og:image" content="${SITE}/og/site-en.png"><meta property="og:url" content="${SITE}/"><meta name="twitter:card" content="summary_large_image"><link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/css/site.css">
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebSite', name: 'Daily Arcade', url: SITE + '/' })}</script></head>
<body data-page="root" data-lang="en"><header class="top"><a class="logo" href="/"><i></i>Daily Arcade · 매일웹겜</a></header>
<div class="banner" id="suggest"></div>
<main class="wrap"><section class="hero"><h1>${esc(en.lobby.h1)}</h1><p>${esc(en.seo.lobby.desc)}</p></section>
<nav class="langs" aria-label="Language">${LANGS.map((x) => `<a class="card" href="/${x}/" hreflang="${dict[x].htmlLang}" lang="${dict[x].htmlLang}">${esc(dict[x].langName)}<br><span class="muted">${esc(dict[x].brand)}</span></a>`).join('')}</nav>
<section class="card" style="margin-top:20px"><h2 style="margin-top:0">${esc(en.game.name)} · ${esc(en.quiz.title)} · ${esc(en.chem.title)}</h2><p>${esc(en.lobby.sub)}</p></section></main>
<footer><a href="/en/about/">About</a><a href="/en/privacy/">Privacy</a><span>playtoday.cloud</span></footer>
<script>(function(){var m={ko:'ko',en:'en',ja:'ja',zh:'zh-hans',es:'es',pt:'pt-br'},t=${JSON.stringify(Object.fromEntries(LANGS.map((x) => [x, dict[x].common.viewIn])))};var n=(navigator.language||'').toLowerCase(),k=m[n.slice(0,2)];if(n.indexOf('zh')===0&&/tw|hk|hant/.test(n))k=null;if(k&&k!=='en'){var b=document.getElementById('suggest');b.innerHTML='<a class="card btn ghost" style="display:flex;margin:8px 0" href="/'+k+'/">'+t[k]+' →</a>';b.className='banner show'}})()</script>
</body></html>`);
  const webgameUrl = buildWebgame();
  const webgameX = Object.keys(WEBGAME_X).map((l) => buildWebgameX(l));
  // sitemap + robots
  const urls = [`  <url><loc>${SITE}/</loc>${LANGS.map((x) => `<xhtml:link rel="alternate" hreflang="${dict[x].htmlLang}" href="${url(x, '')}"/>`).join('')}<xhtml:link rel="alternate" hreflang="x-default" href="${SITE}/"/></url>`];
  for (const l of LANGS) for (const [, suf] of PAGES) urls.push(`  <url><loc>${url(l, suf)}</loc>${LANGS.map((x) => `<xhtml:link rel="alternate" hreflang="${dict[x].htmlLang}" href="${url(x, suf)}"/>`).join('')}<xhtml:link rel="alternate" hreflang="x-default" href="${SITE}/"/></url>`);
  for (const l of MAGNET_LANGS) urls.push(`  <url><loc>${url(l, 'play/magnet-harbor/')}</loc>${MAGNET_LANGS.map((x) => `<xhtml:link rel="alternate" hreflang="${dict[x].htmlLang}" href="${url(x, 'play/magnet-harbor/')}"/>`).join('')}<xhtml:link rel="alternate" hreflang="x-default" href="${url('en', 'play/magnet-harbor/')}"/></url>`);
  for (const l of ECHO_LANGS) urls.push(`  <url><loc>${url(l, 'play/echo-courier/')}</loc>${ECHO_LANGS.map((x) => `<xhtml:link rel="alternate" hreflang="${dict[x].htmlLang}" href="${url(x, 'play/echo-courier/')}"/>`).join('')}<xhtml:link rel="alternate" hreflang="x-default" href="${url('en', 'play/echo-courier/')}"/></url>`);
  for (const l of ORBIT_LANGS) urls.push(`  <url><loc>${url(l, 'play/orbit-switch/')}</loc>${ORBIT_LANGS.map((x) => `<xhtml:link rel="alternate" hreflang="${dict[x].htmlLang}" href="${url(x, 'play/orbit-switch/')}"/>`).join('')}<xhtml:link rel="alternate" hreflang="x-default" href="${url('en', 'play/orbit-switch/')}"/></url>`);
  urls.push(`  <url><loc>${webgameUrl}</loc>${WEBGAME_ALT.replace(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g, '<xhtml:link rel="alternate" hreflang="$1" href="$2"/>')}</url>`);
  for (const u of webgameX) urls.push(`  <url><loc>${u}</loc>${WEBGAME_ALT.replace(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g, '<xhtml:link rel="alternate" hreflang="$1" href="$2"/>')}</url>`);
  for (const u of buildPuzzle()) urls.push(`  <url><loc>${u}</loc></url>`);
  for (const u of buildCalc()) urls.push(`  <url><loc>${u}</loc><lastmod>${CALC_LASTMOD}</lastmod></url>`);
  writeFileSync(`${ROOT}public/sitemap.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`);
  writeFileSync(`${ROOT}public/robots.txt`, `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /*/r/\nDisallow: /*/i/\nDisallow: /*/c/\n\nSitemap: ${SITE}/sitemap.xml\n`);
  buildMagnet();
  buildEcho();
  buildOrbit();
  injectFeedback();
  console.log(`built ${n} index pages + ${LANGS.length * SHELLS.length} noindex shells + / ; sitemap ${urls.length} urls`);
  return { pages: n, sitemap: urls.length };
}

if (import.meta.url === `file://${process.argv[1]}`) build();
