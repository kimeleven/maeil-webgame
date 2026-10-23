// Magnet Harbor preview pages (t_1c491685): public/{lang}/play/magnet-harbor/index.html, noindex.
// Not in PAGES / sitemap / lobby / footer nav / manifest (preview only). One self-contained HTML (CSS + core + UI inlined).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
export const MAGNET_LANGS = ['ko', 'en', 'ja', 'zh-hans', 'es', 'pt-br'];
const HTML_LANG = { ko: 'ko', en: 'en', ja: 'ja', 'zh-hans': 'zh-Hans', es: 'es', 'pt-br': 'pt-BR' };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const CSS = `:root{--bg:#07080c;--panel:rgba(255,255,255,.045);--edge:rgba(255,255,255,.09);--fg:#e8eaf0;--muted:rgba(214,219,232,.72);--cyan:#22d3ee;--gold:#facc15;--glass:rgba(10,11,18,.72);color-scheme:dark}
*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:radial-gradient(1200px 700px at 50% -10%,rgba(79,70,229,.22),transparent),var(--bg);color:var(--fg);font:15px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;overflow-x:hidden;overscroll-behavior:contain}
body{display:flex;flex-direction:column;align-items:center;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
.top{width:100%;max-width:1080px;display:flex;justify-content:space-between;align-items:center;padding:8px 12px;gap:6px}
.logo{white-space:nowrap;color:var(--fg);text-decoration:none;font-weight:800;display:inline-flex;align-items:center;gap:8px;min-height:44px}.logo i{width:10px;height:10px;border-radius:50%;background:var(--cyan);box-shadow:0 0 12px var(--cyan)}
.tag{white-space:nowrap;padding:4px 10px;border-radius:99px;font-size:12px;font-weight:700;background:rgba(250,204,21,.18);color:var(--gold)}.tr{display:flex;gap:6px;align-items:center}
.langs{position:relative}.langs summary{list-style:none;cursor:pointer;min-height:44px;min-width:44px;display:flex;align-items:center;justify-content:center;padding:0 10px;border-radius:12px;border:1px solid var(--edge);color:var(--muted)}.langs summary::-webkit-details-marker{display:none}.langs nav{position:absolute;right:0;top:48px;z-index:5;display:flex;flex-direction:column;background:var(--glass);border:1px solid var(--edge);border-radius:14px;padding:6px;backdrop-filter:blur(24px)}.langs a{color:var(--fg);text-decoration:none;min-height:44px;min-width:96px;display:flex;align-items:center;padding:0 12px;border-radius:10px}.langs a[aria-current]{font-weight:800;color:var(--cyan)}
.stage{position:relative;width:min(100vw,calc((100dvh - 64px)*9/16),540px);height:min(calc(100dvh - 64px),960px);display:flex;flex-direction:column;padding:0 10px 8px}
.hud{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;padding:4px 0 6px;font-variant-numeric:tabular-nums}.hud div{display:flex;flex-direction:column;align-items:center;min-width:0;background:var(--panel);border:1px solid var(--edge);border-radius:12px;padding:4px 2px;backdrop-filter:blur(18px)}
.hud span{font-size:11px;color:var(--muted);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.hud b{font-size:17px;white-space:nowrap}
#play{position:relative;flex:1;min-height:0;border-radius:20px;overflow:hidden;border:1px solid var(--edge);touch-action:none;cursor:grab}#play:active{cursor:grabbing}
#cv{position:absolute;inset:0;width:100%;height:100%;display:block}
.bar{display:flex;justify-content:space-between;align-items:center;gap:8px;padding-top:6px}.hint{color:var(--muted);font-size:13px}
.ic,.tg{min-width:44px;min-height:44px;border-radius:14px;border:1px solid var(--edge);background:linear-gradient(rgba(255,255,255,.12),rgba(255,255,255,.05));color:var(--fg);font:600 14px/1.2 inherit;cursor:pointer;padding:0 12px}
.ic.off,.tg.off{opacity:.55}.tg.off{text-decoration:line-through}[hidden]{display:none!important}
.sheet{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(7,8,12,.55);z-index:3}
.panel{width:100%;max-width:420px;background:var(--glass);border:1px solid var(--edge);border-radius:20px;padding:18px;backdrop-filter:blur(24px) saturate(140%);-webkit-backdrop-filter:blur(24px) saturate(140%);display:flex;flex-direction:column;gap:10px;box-shadow:0 30px 60px -30px rgba(0,0,0,.8)}
.panel h2{margin:0;font-size:22px}.ready .panel,.pz .panel{align-items:center;text-align:center}.goal{margin:0;font-size:16px;font-weight:600}.how{margin:0;font-size:15px;color:var(--muted)}
.icon{font-size:34px;letter-spacing:6px}.t90{font-size:13px;color:var(--muted)}
.btn{min-height:46px;border-radius:14px;border:1px solid var(--edge);font:700 15px/1.2 inherit;color:var(--fg);cursor:pointer;padding:6px 10px;background:linear-gradient(rgba(255,255,255,.12),rgba(255,255,255,.05))}
.btn.main{min-height:64px;width:100%;font-size:22px;border:0;color:#fff;background:linear-gradient(135deg,#6366f1,#0ea5c6);box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 12px 24px -12px rgba(99,102,241,.9)}
.nums{display:grid;grid-template-columns:auto 1fr;gap:2px 12px;font-size:14px}.nums span{color:var(--muted)}.nums b{font-size:18px}.nums b.big{font-size:34px;color:var(--cyan)}
.new{color:#4ade80;font-weight:800}.cmp{font-size:13px;color:var(--muted)}.why{font-size:14px;color:var(--muted)}
.row{display:flex;gap:8px;flex-wrap:wrap}.row .btn{flex:1 1 120px}.tgs{display:flex;gap:6px;flex-wrap:wrap}.tgs .tg{flex:1 1 80px}
.seed{color:var(--muted);font-size:12px;text-align:center}
.toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:var(--glass);border:1px solid var(--edge);border-radius:12px;padding:10px 14px;opacity:0;transition:opacity .2s;pointer-events:none;max-width:90vw}.toast.show{opacity:1}
@media (min-width:900px){body{background:radial-gradient(900px 600px at 15% 30%,rgba(34,211,238,.10),transparent),radial-gradient(900px 600px at 85% 70%,rgba(99,102,241,.16),transparent),var(--bg)}}
@media (prefers-reduced-motion:reduce){.toast{transition:none}}`;

export function buildMagnet() {
  const T = JSON.parse(readFileSync(`${ROOT}i18n/magnet-harbor.json`, 'utf8'));
  const core = readFileSync(`${ROOT}public/js/magnet-core.js`, 'utf8').replace(/^export /gm, '');
  const ui = readFileSync(`${ROOT}public/js/magnet.js`, 'utf8');
  const keys = Object.keys(T.ko);
  for (const l of MAGNET_LANGS) for (const k of keys) if (!(k in T[l])) throw new Error(`magnet i18n ${l} missing ${k}`);
  for (const l of MAGNET_LANGS) {
    const D = T[l];
    const langs = MAGNET_LANGS.map((x) => `<a href="/${x}/play/magnet-harbor/" hreflang="${HTML_LANG[x]}"${x === l ? ' aria-current="true"' : ''}>${x}</a>`).join('');
    const tg = (k) => `<button class="tg" type="button" data-ui data-set="${k}" aria-pressed="true">${esc(D[k])}</button>`;
    const html = `<!doctype html><html lang="${HTML_LANG[l]}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#07080c">
<title>${esc(D.title)}</title><meta name="description" content="${esc(D.desc)}"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><link rel="icon" href="data:,">
<style>${CSS}</style></head>
<body data-page="magnet-harbor" data-lang="${l}">
<header class="top"><a class="logo" href="/${l}/"><i></i>${esc(D.back)}</a><span class="tag">${esc(D.preview)}</span><div class="tr"><button class="ic" type="button" data-ui data-set="sound" data-icon="1" aria-label="${esc(D.sound)}" aria-pressed="true">🔊</button><button class="ic" type="button" data-ui data-set="haptic" data-icon="1" aria-label="${esc(D.haptic)}" aria-pressed="true">📳</button><details class="langs" data-ui><summary aria-label="Language">${l} ▾</summary><nav>${langs}</nav></details></div></header>
<main class="stage" id="stage">
<div class="hud"><div><span>${esc(D.time)}</span><b id="h-time">90</b></div><div><span>${esc(D.ships)}</span><b id="h-ships">0</b></div><div><span>${esc(D.target)}</span><b id="h-tgt">0/6</b></div><div><span>${esc(D.cols)}</span><b id="h-cols">0/4</b></div><div><span>${esc(D.lives)}</span><b id="h-lives">⚓⚓⚓</b></div></div>
<div id="play" role="application" aria-label="${esc(D.name)}"><canvas id="cv"></canvas>
<div class="sheet ready" id="ready" data-ui><div class="panel">
<h2>${esc(D.name)}</h2><p class="goal">${esc(D.goal)}</p><div class="icon" aria-hidden="true">👆↔️✋⬇️</div><p class="how" id="r-how">${esc(D.howDesktop)}</p>
<button class="btn main" id="b-start" type="button">${esc(D.start)}</button><div class="t90">${esc(D.time)} 90 · Space / Enter</div>
</div></div>
<div class="sheet pz" id="pz" data-ui hidden><div class="panel"><h2>${esc(D.paused)}</h2><p class="how">${esc(D.resume)}</p><span id="pz-n"></span><div class="tgs">${tg('motion')}</div></div></div>
<div class="sheet" id="res" data-ui hidden><div class="panel" role="dialog" aria-labelledby="r-title">
<h2 id="r-title">${esc(D.over)}</h2><div class="why" id="r-why"></div><div class="new" id="r-new" hidden>${esc(D.newBest)}</div><div class="new" id="r-first" hidden>${esc(D.first)}</div>
<div class="nums"><span>${esc(D.now)}</span><b class="big" id="r-ships"></b><span>${esc(D.score)}</span><b id="r-score"></b><span>${esc(D.perfect)}</span><b id="r-perf"></b><span>${esc(D.best)}</span><b id="r-best"></b><span>${esc(D.diff)}</span><b id="r-diff"></b></div>
<div class="cmp" id="r-near" hidden></div>
<button class="btn main" id="b-again" type="button">${esc(D.again)}</button>
<div class="row"><button class="btn" id="b-png" type="button">${esc(D.png)}</button><button class="btn" id="b-link" type="button">${esc(D.link)}</button></div>
<div class="tgs">${tg('sound')}${tg('haptic')}${tg('motion')}</div><div class="seed">seed <span id="seed"></span></div>
</div></div>
</div>
<div class="bar"><span class="hint">${esc(D.hint)}</span><button class="ic" id="b-pause" type="button" data-ui aria-label="${esc(D.pause)}">⏸</button></div>
</main><div class="toast" id="toast" role="status"></div>
<script id="mt" type="application/json">${JSON.stringify(D).replace(/</g, '\\u003c')}</script>
<script>(()=>{${core}
${ui}})()</script>
</body></html>`;
    mkdirSync(`${ROOT}public/${l}/play/magnet-harbor`, { recursive: true });
    writeFileSync(`${ROOT}public/${l}/play/magnet-harbor/index.html`, html);
  }
  console.log(`magnet-harbor preview: ${MAGNET_LANGS.length} pages (noindex, not in sitemap)`);
  return MAGNET_LANGS.length;
}

if (import.meta.url === `file://${process.argv[1]}`) buildMagnet();
