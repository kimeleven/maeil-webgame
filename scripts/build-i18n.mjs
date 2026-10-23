// Static i18n site builder (REBOOT-SPEC §2, §7). node scripts/build-i18n.mjs
// i18n/{lang}.json + templates below → public/{lang}/…/index.html, sitemap.xml, robots.txt.
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { CODES, COLORS, bestBuddy } from '../public/js/logic.js';
import { HEAD_SNIPPET } from '../public/js/theme.js';
import { buildMagnet, MAGNET_LANGS } from './build-magnet.mjs'; // magnet-harbor public game (t_1c491685, launch t_45f1a325)
import { buildFair } from './build-fair.mjs'; // fair-slice preview (noindex, not in sitemap) [t_bbb6c617]
const MT = JSON.parse(readFileSync(new URL('../i18n/magnet-harbor.json', import.meta.url), 'utf8'));

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
  ['chem', 'friends/chemistry/'], ['quickbreak', 'play/quick-break/'], ['friendplay', 'friends/things-to-do/'], ['commute', 'play/commute/'], ['about', 'about/'], ['privacy', 'privacy/'],
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
  return `<!doctype html><html lang="${D.htmlLang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#07080c">${HEAD_SNIPPET}
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
<footer><a href="/${l}/play/gate-rush/">${esc(D.nav.play)}</a><a href="/${l}/me/play-character/">${esc(D.nav.me)}</a><a href="/${l}/friends/chemistry/">${esc(D.nav.friends)}</a><a href="/${l}/about/">${esc(D.nav.about)}</a><a href="/${l}/privacy/">${esc(D.nav.privacy)}</a><span>© ${esc(D.brand)} · playtoday.cloud</span></footer>
<script id="i18n" type="application/json">${JSON.stringify(D).replace(/</g, '\\u003c')}</script>
<script type="module" src="/js/track.js"></script>
<script type="module" src="/js/app.js"></script>
</body></html>`;
}

const hwBanner = (D) => `<aside class="hw-banner" aria-label="Halloween"><b>${esc(D.halloween.banner)}</b><span>${esc(D.halloween.sub)}</span></aside>`;
const charImg = (c, size = 96, alt = '') => `<img src="/img/chars/${c}.svg" width="${size}" height="${size}" alt="${esc(alt)}" loading="lazy">`;

function pageBody(l, key) {
  const D = dict[l], g = D.game, q = D.quiz;
  const disc = `<p class="disc" data-disclaimer>${esc(q.disclaimer)}</p>`;
  if (key === 'lobby') {
    const c = D.lobby.cards;
    return `${hwBanner(D)}<section class="hero"><span class="tag">${esc(D.common.free)}</span><h1>${esc(D.lobby.h1)}</h1><p>${esc(D.lobby.sub)}</p></section>
<nav class="grid3" aria-label="${esc(D.brand)}">
<a class="card cat hl" href="/${l}/play/gate-rush/"><span class="tag">${esc(D.nav.play)}</span><img src="/img/gate-rush.svg" width="150" height="150" alt=""><h3>${esc(c.play.t)}</h3><p>${esc(c.play.d)}</p><span class="btn go">${esc(c.play.cta)}</span></a>
<a class="card cat" href="/${l}/me/play-character/"><span class="tag">${esc(D.nav.me)}</span>${charImg('SPH', 150)}<h3>${esc(c.me.t)}</h3><p>${esc(c.me.d)}</p><span class="btn ghost go">${esc(c.me.cta)}</span></a>
<a class="card cat" href="/${l}/friends/chemistry/"><span class="tag">${esc(D.nav.friends)}</span><span class="pair">${charImg('SIH', 72)}${charImg('CPT', 72)}</span><h3>${esc(c.friends.t)}</h3><p>${esc(c.friends.d)}</p><span class="btn ghost go">${esc(c.friends.cta)}</span></a>
</nav>
<section class="card row" style="justify-content:space-between"><div><h3>${esc(D.lobby.daily)}</h3><p class="muted" style="margin:0">${esc(D.lobby.dailyDesc)}</p></div><a class="btn ghost" href="/${l}/play/gate-rush/" data-daily>${esc(D.lobby.daily)} →</a></section>
<a class="card row" href="/${l}/play/magnet-harbor/" data-game="magnet-harbor" style="margin-top:14px;justify-content:space-between;text-decoration:none;color:inherit"><img src="/img/magnet-harbor.svg" width="64" height="64" alt=""><div style="flex:1;min-width:0"><h3>${esc(MT[l].name)}</h3><p class="muted" style="margin:0">${esc(MT[l].desc)}</p></div><span class="btn ghost">${esc(MT[l].start)} →</span></a>
<p class="muted"><a href="/${l}/play/quick-break/">${esc(D.quickbreak.link)}</a> · <a href="/${l}/friends/things-to-do/">${esc(D.friendplay.link)}</a> · <a href="/${l}/play/commute/">${esc(D.commute.link)}</a></p>`;
  }
  if (key === 'game') {
    return `${hwBanner(D)}<div class="layout-game"><section class="intro"><span class="tag">${esc(D.nav.play)} · 30s</span><h1>${esc(g.name)} — ${esc(g.h1)}</h1><p>${esc(g.intro)}</p>
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
    return `<section class="hero"><span class="tag">${esc(D.common.free)}</span><h1>${esc(Q.h1)}</h1><p>${esc(Q.p1)}</p><p>${esc(Q.p2)}</p><div class="row"><a class="btn" href="/${l}/play/gate-rush/">${esc(D.lobby.cards.play.cta)}</a><a class="btn ghost" href="/${l}/me/play-character/">${esc(D.lobby.cards.me.cta)}</a><a class="btn ghost" href="/${l}/friends/chemistry/">${esc(D.cta.chem)}</a></div><p class="muted"><a href="/${l}/friends/things-to-do/">${esc(D.friendplay.link)}</a> · <a href="/${l}/play/commute/">${esc(D.commute.link)}</a></p></section>`;
  }
  if (key === 'friendplay') {
    const F = D.friendplay;
    return `<section class="hero"><span class="tag">${esc(D.common.free)}</span><h1>${esc(F.h1)}</h1><p>${esc(F.p1)}</p><p>${esc(F.p2)}</p><div class="row"><a class="btn" href="/${l}/friends/chemistry/">${esc(D.cta.chem)}</a><a class="btn ghost" href="/${l}/me/play-character/">${esc(D.lobby.cards.me.cta)}</a><a class="btn ghost" href="/${l}/play/gate-rush/">${esc(D.lobby.cards.play.cta)}</a></div><p class="muted"><a href="/${l}/play/quick-break/">${esc(D.quickbreak.link)}</a> · <a href="/${l}/play/commute/">${esc(D.commute.link)}</a></p></section>`;
  }
  if (key === 'commute') {
    const M = D.commute;
    return `<section class="hero"><span class="tag">${esc(D.common.free)}</span><h1>${esc(M.h1)}</h1><p>${esc(M.p1)}</p><p>${esc(M.p2)}</p><div class="row"><a class="btn" href="/${l}/play/gate-rush/">${esc(D.lobby.cards.play.cta)}</a><a class="btn ghost" href="/${l}/me/play-character/">${esc(D.lobby.cards.me.cta)}</a><a class="btn ghost" href="/${l}/friends/chemistry/">${esc(D.cta.chem)}</a></div><p class="muted"><a href="/${l}/play/quick-break/">${esc(D.quickbreak.link)}</a> · <a href="/${l}/friends/things-to-do/">${esc(D.friendplay.link)}</a></p></section>`;
  }
  if (key === 'chem') {
    const C = D.chem;
    return `<section class="hero"><span class="tag">${esc(D.nav.friends)}</span><h1>${esc(C.h1)}</h1><p>${esc(C.intro)}</p><ol class="prose">${C.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></section>
<section id="chem" class="card"><p>${esc(D.common.loading)}</p></section>${disc}<p class="muted"><a href="/${l}/friends/things-to-do/">${esc(D.friendplay.link)}</a></p>`;
  }
  if (key === 'about' || key === 'privacy') {
    const P = D[key];
    return `<section class="hero"><h1>${esc(P.h1)}</h1></section><section class="card prose">${P.body.map((p) => `<p>${esc(p)}</p>`).join('')}${key === 'about' ? `<p>${esc(q.disclaimer)}</p>` : ''}</section>`;
  }
  throw new Error(key);
}

function meta(l, key) {
  const D = dict[l], S = D.seo;
  if (key.startsWith('type-')) { const T = D.types[key.slice(5)]; return { title: `${T.name} — ${T.one} | ${D.brand}`, desc: T.desc.split(/(?<=[.!?。！？])\s*/).slice(0, 2).join(' ').trim() }; }
  if (key === 'quickbreak') return { title: D.quickbreak.title, desc: D.quickbreak.desc };
  if (key === 'friendplay') return { title: D.friendplay.title, desc: D.friendplay.desc };
  if (key === 'commute') return { title: D.commute.title, desc: D.commute.desc };
  const k = { lobby: 'lobby', game: 'game', quiz: 'quiz', chem: 'chem', quickbreak: 'quickbreak', about: 'about', privacy: 'privacy' }[key];
  return { title: S[k].title, desc: S[k].desc };
}

function jsonld(l, key, m) {
  const D = dict[l];
  if (key === 'lobby') return { '@context': 'https://schema.org', '@type': 'WebSite', name: D.brand, url: url(l, ''), inLanguage: D.htmlLang };
  if (key === 'game') return { '@context': 'https://schema.org', '@graph': [{ '@type': 'VideoGame', name: D.game.name, description: m.desc, genre: 'Arcade', gamePlatform: 'Web browser', inLanguage: D.htmlLang, url: url(l, 'play/gate-rush/'), offers: { '@type': 'Offer', price: 0, priceCurrency: 'USD' } }, { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: D.brand, item: url(l, '') }, { '@type': 'ListItem', position: 2, name: D.nav.play, item: url(l, 'play/gate-rush/') }] }] };
  const self = url(l, PAGES.find((p) => p[0] === key)[1]);
  const page = { '@type': 'WebPage', name: m.title, description: m.desc, inLanguage: D.htmlLang, url: self };
  const crumbs = [[D.brand, url(l, '')]];
  const quizUrl = url(l, 'me/play-character/'), gameUrl = url(l, 'play/gate-rush/');
  if (key === 'quiz') crumbs.push([D.nav.me, quizUrl]);
  else if (key.startsWith('type-')) crumbs.push([D.nav.me, quizUrl], [D.types[key.slice(5)].name, self]);
  else if (key === 'chem') crumbs.push([D.nav.friends, self]);
  else if (key === 'quickbreak') crumbs.push([D.nav.play, gameUrl], [D.quickbreak.h1, self]);
  else if (key === 'commute') crumbs.push([D.nav.play, gameUrl], [D.commute.h1, self]);
  else if (key === 'friendplay') crumbs.push([D.nav.friends, url(l, 'friends/chemistry/')], [D.friendplay.h1, self]);
  else crumbs.push([D.nav[key], self]); // about, privacy
  const graph = [page, { '@type': 'BreadcrumbList', itemListElement: crumbs.map(([name, item], i) => ({ '@type': 'ListItem', position: i + 1, name, item })) }];
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
      const title = key === 'i' ? D.seo.chem.title : key === 'c' ? `${D.game.challengeTitle} | ${D.brand}` : D.brand;
      const desc = key === 'i' ? D.seo.chem.desc : key === 'c' ? D.seo.game.desc : D.seo.lobby.desc;
      const main = key === 'c' ? `<section class="gamecol" id="game"></section>` : key === 'i' ? `<section id="chem" class="card"><p>${esc(D.common.loading)}</p></section><p class="disc" data-disclaimer>${esc(D.quiz.disclaimer)}</p>` : `<section id="share" class="card"><p>${esc(D.common.loading)}</p></section>`;
      write(`${l}/${suf}index.html`, shell(l, key, suf, main, { title, desc, noindex: true, dyn: true, og: key === 'c' ? `/og/challenge-${l}.png` : `/og/site-${l}.png` }));
    }
  }
  // root: language picker, English body, x-default
  const en = dict.en;
  const alt = LANGS.map((x) => `<link rel="alternate" hreflang="${dict[x].htmlLang}" href="${url(x, '')}">`).join('') + `<link rel="alternate" hreflang="x-default" href="${SITE}/">`;
  writeFileSync(`${ROOT}public/index.html`, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#07080c"><title>${esc(en.seo.root.title)}</title><meta name="description" content="${esc(en.seo.root.desc)}"><link rel="canonical" href="${SITE}/">${alt}
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
  // sitemap + robots
  const urls = [`  <url><loc>${SITE}/</loc>${LANGS.map((x) => `<xhtml:link rel="alternate" hreflang="${dict[x].htmlLang}" href="${url(x, '')}"/>`).join('')}<xhtml:link rel="alternate" hreflang="x-default" href="${SITE}/"/></url>`];
  for (const l of LANGS) for (const [, suf] of PAGES) urls.push(`  <url><loc>${url(l, suf)}</loc>${LANGS.map((x) => `<xhtml:link rel="alternate" hreflang="${dict[x].htmlLang}" href="${url(x, suf)}"/>`).join('')}<xhtml:link rel="alternate" hreflang="x-default" href="${SITE}/"/></url>`);
  for (const l of MAGNET_LANGS) urls.push(`  <url><loc>${url(l, 'play/magnet-harbor/')}</loc>${MAGNET_LANGS.map((x) => `<xhtml:link rel="alternate" hreflang="${dict[x].htmlLang}" href="${url(x, 'play/magnet-harbor/')}"/>`).join('')}<xhtml:link rel="alternate" hreflang="x-default" href="${url('en', 'play/magnet-harbor/')}"/></url>`);
  writeFileSync(`${ROOT}public/sitemap.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`);
  writeFileSync(`${ROOT}public/robots.txt`, `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /*/r/\nDisallow: /*/i/\nDisallow: /*/c/\n\nSitemap: ${SITE}/sitemap.xml\n`);
  buildMagnet();
  buildFair();
  console.log(`built ${n} index pages + ${LANGS.length * SHELLS.length} noindex shells + / ; sitemap ${urls.length} urls`);
  return { pages: n, sitemap: urls.length };
}

if (import.meta.url === `file://${process.argv[1]}`) build();
