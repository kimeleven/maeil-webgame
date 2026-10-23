// Echo Courier preview pages (t_0e812a29): public/{lang}/play/echo-courier/index.html, noindex.
// Not in PAGES / sitemap / lobby / footer nav (preview only, not a confirmed production URL).
// Single self-contained HTML: CSS + core + UI inlined so the first tap needs one request.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
export const ECHO_LANGS = ['ko', 'en', 'ja', 'zh-hans', 'es', 'pt-br'];
const HTML_LANG = { ko: 'ko', en: 'en', ja: 'ja', 'zh-hans': 'zh-Hans', es: 'es', 'pt-br': 'pt-BR' };
const NUMPAD = [7, 8, 9, 4, 5, 6, 1, 2, 3];
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const CSS = `:root{--bg:#07080c;--panel:rgba(255,255,255,.045);--edge:rgba(255,255,255,.09);--fg:#e8eaf0;--muted:rgba(214,219,232,.72);--cyan:#22d3ee;--gold:#facc15;--red:#ff4d5e;--glass:rgba(10,11,18,.72);color-scheme:dark}
*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:radial-gradient(1200px 700px at 50% -10%,rgba(79,70,229,.22),transparent),var(--bg);color:var(--fg);font:15px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;overflow-x:hidden}
body{display:flex;flex-direction:column;align-items:center;touch-action:manipulation;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
.top{width:100%;max-width:1080px;display:flex;justify-content:space-between;align-items:center;padding:10px 16px;gap:8px}
.logo{white-space:nowrap;color:var(--fg);text-decoration:none;font-weight:800;display:inline-flex;align-items:center;gap:8px;min-height:44px}.logo i{width:10px;height:10px;border-radius:50%;background:var(--cyan);box-shadow:0 0 12px var(--cyan)}
.tag{white-space:nowrap;padding:4px 10px;border-radius:99px;font-size:12px;font-weight:700;background:rgba(250,204,21,.18);color:var(--gold)}.tr{display:flex;gap:6px;align-items:center}
.langs{position:relative}.langs summary{list-style:none;cursor:pointer;min-height:44px;min-width:44px;display:flex;align-items:center;justify-content:center;padding:0 10px;border-radius:12px;border:1px solid var(--edge);color:var(--muted)}.langs summary::-webkit-details-marker{display:none}.langs nav{position:absolute;right:0;top:48px;z-index:5;display:flex;flex-direction:column;background:var(--glass);border:1px solid var(--edge);border-radius:14px;padding:6px;backdrop-filter:blur(24px)}.langs a{color:var(--fg);text-decoration:none;min-height:44px;min-width:96px;display:flex;align-items:center;padding:0 12px;border-radius:10px}.langs a[aria-current]{font-weight:800;color:var(--cyan)}
.stage{position:relative;width:100%;max-width:min(100vw,calc((100dvh - 64px)*9/16),540px);min-height:min(calc(100dvh - 64px),960px);display:flex;flex-direction:column;padding:0 16px 12px}
.hud{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:8px 0;font-variant-numeric:tabular-nums}.hud div{display:flex;flex-direction:column;align-items:center;min-width:0;background:var(--panel);border:1px solid var(--edge);border-radius:14px;padding:6px 4px;backdrop-filter:blur(18px)}
.hud span{font-size:11px;color:var(--muted);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.hud b{font-size:20px}
.status{text-align:center;font-weight:700;min-height:28px;font-size:18px;color:var(--muted);margin:6px 0}.status.input{color:var(--fg)}.status.fail{color:#ff8a96}.status.ok{color:var(--gold)}
.wrap{position:relative;width:88%;max-width:480px;margin:8px auto;aspect-ratio:1}
#board{position:absolute;inset:0;display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:10px;border-radius:24px;background:var(--panel);border:1px solid var(--edge);backdrop-filter:blur(20px) saturate(140%);-webkit-backdrop-filter:blur(20px) saturate(140%)}
.cell{position:relative;min-width:44px;min-height:44px;border-radius:18px;border:1px solid var(--edge);background:linear-gradient(rgba(255,255,255,.08),rgba(255,255,255,.03));color:var(--fg);cursor:pointer;padding:0;font:800 26px/1 inherit;transition:background .12s,box-shadow .12s}
.cell small{position:absolute;left:8px;top:6px;font-size:11px;font-weight:600;color:var(--muted)}.cell i{font-style:normal}
.cell.lit{background:rgba(34,211,238,.55);box-shadow:0 0 28px rgba(34,211,238,.8),inset 0 0 0 2px var(--cyan)}
.cell.got{background:rgba(34,211,238,.18);box-shadow:inset 0 0 0 2px rgba(34,211,238,.6)}
.cell.ans{background:rgba(34,211,238,.14);box-shadow:inset 0 0 0 2px rgba(34,211,238,.7)}.cell.gold{background:rgba(250,204,21,.2);box-shadow:inset 0 0 0 2px var(--gold),0 0 18px rgba(250,204,21,.5)}
.cell.bad{background:rgba(255,77,94,.35);box-shadow:inset 0 0 0 3px var(--red)}.cell.bad::after{content:"✕";position:absolute;right:8px;top:4px;color:#fff;font-size:20px}
#lines{position:absolute;inset:10px;width:calc(100% - 20px);height:calc(100% - 20px);pointer-events:none}
.draw{stroke-dasharray:1200;stroke-dashoffset:1200;animation:dr .6s ease-out forwards}@keyframes dr{to{stroke-dashoffset:0}}
.shake{animation:sh .3s}@keyframes sh{20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}
.rm .shake,.rm .draw{animation:none;stroke-dashoffset:0}.rm .cell{transition:none}
.follow{display:flex;justify-content:center;align-items:center;gap:6px;color:var(--muted);font-size:14px;min-height:24px}.follow[hidden]{display:none}
.bar{display:flex;justify-content:center;align-items:center;gap:8px;margin-top:auto;padding-top:6px}
.ic,.tg{min-width:44px;min-height:44px;border-radius:14px;border:1px solid var(--edge);background:linear-gradient(rgba(255,255,255,.12),rgba(255,255,255,.05));color:var(--fg);font:600 14px/1.2 inherit;cursor:pointer;padding:0 12px}
.ic.off,.tg.off{opacity:.55;text-decoration:line-through}
.sheet{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(7,8,12,.55);z-index:3}.sheet[hidden]{display:none}
.panel{width:100%;max-width:420px;background:var(--glass);border:1px solid var(--edge);border-radius:20px;padding:18px;backdrop-filter:blur(24px) saturate(140%);-webkit-backdrop-filter:blur(24px) saturate(140%);display:flex;flex-direction:column;gap:10px;box-shadow:0 30px 60px -30px rgba(0,0,0,.8)}
.panel h2{margin:0;font-size:22px}.ready .panel{align-items:center;text-align:center;cursor:pointer}.goal{margin:0;font-size:16px;font-weight:600}.how{margin:0;font-size:15px;color:var(--muted)}
.go{min-height:56px;display:flex;align-items:center;justify-content:center;width:100%;border-radius:14px;font-weight:800;font-size:19px;color:#fff;padding:0 10px;background:linear-gradient(135deg,#6366f1,#0ea5c6)}
.card{display:flex;gap:14px;align-items:center}.card .nums{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;font-size:14px;min-width:0}.card .nums span{color:var(--muted)}.card .nums b{font-size:18px}.card .nums b.big{font-size:32px;color:var(--cyan)}
.new{color:#4ade80;font-weight:800}.new[hidden]{display:none}.cmp{font-size:13px;color:var(--muted)}
.btn{min-height:46px;border-radius:14px;border:1px solid var(--edge);font:700 15px/1.2 inherit;color:var(--fg);cursor:pointer;padding:6px 10px;background:linear-gradient(rgba(255,255,255,.12),rgba(255,255,255,.05))}
.btn.main{min-height:64px;font-size:22px;border:0;color:#fff;background:linear-gradient(135deg,#6366f1,#0ea5c6);box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 12px 24px -12px rgba(99,102,241,.9)}
.row{display:flex;gap:8px;flex-wrap:wrap}.row .btn{flex:1 1 110px}.tgs{display:flex;gap:6px;flex-wrap:wrap}.tgs .tg{flex:1 1 80px}
.seed{color:var(--muted);font-size:12px;text-align:center}
.toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:var(--glass);border:1px solid var(--edge);border-radius:12px;padding:10px 14px;opacity:0;transition:opacity .2s;pointer-events:none;max-width:90vw}.toast.show{opacity:1}
@media (prefers-reduced-motion:reduce){.toast,.cell{transition:none}.shake,.draw{animation:none;stroke-dashoffset:0}}`;

export function buildEcho() {
  const T = JSON.parse(readFileSync(`${ROOT}i18n/echo-courier.json`, 'utf8'));
  const core = readFileSync(`${ROOT}public/js/echo-core.js`, 'utf8').replace(/^export /gm, '');
  const ui = readFileSync(`${ROOT}public/js/echo.js`, 'utf8');
  const keys = Object.keys(T.ko);
  for (const l of ECHO_LANGS) for (const k of keys) if (!(k in T[l])) throw new Error(`echo i18n ${l} missing ${k}`);
  for (const l of ECHO_LANGS) {
    const D = T[l];
    const langs = ECHO_LANGS.map((x) => `<a href="/${x}/play/echo-courier/" hreflang="${HTML_LANG[x]}"${x === l ? ' aria-current="true"' : ''}>${x}</a>`).join('');
    const tg = (k) => `<button class="tg" type="button" data-set="${k}" aria-pressed="true">${esc(D[k])}</button>`;
    const cells = NUMPAD.map((n, c) => `<button class="cell" type="button" data-cell="${c}" aria-label="${n}"><small>${n}</small><i></i></button>`).join('');
    const html = `<!doctype html><html lang="${HTML_LANG[l]}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#07080c">
<title>${esc(D.title)}</title><meta name="description" content="${esc(D.desc)}"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><link rel="icon" href="data:,">
<style>${CSS}</style></head>
<body data-page="echo-courier" data-lang="${l}">
<header class="top"><a class="logo" href="/${l}/"><i></i>${esc(D.back)}</a><span class="tag">${esc(D.preview)}</span><div class="tr"><button class="ic" type="button" data-set="sound" data-icon="1" aria-label="${esc(D.sound)}" aria-pressed="true">🔊</button><details class="langs"><summary aria-label="Language">${l} ▾</summary><nav>${langs}</nav></details></div></header>
<main class="stage" id="stage">
<div class="hud"><div><span>${esc(D.time)}</span><b id="h-time">90</b></div><div><span>${esc(D.done)}</span><b id="h-done">0</b></div><div><span>${esc(D.cells)}</span><b id="h-len">3</b></div><div><span>${esc(D.score)}</span><b id="h-score">0</b></div></div>
<div class="status" id="status" aria-live="polite"></div>
<div class="wrap"><div id="board" role="group" aria-label="${esc(D.name)}">${cells}</div><svg id="lines" viewBox="0 0 300 300" preserveAspectRatio="none" aria-hidden="true"></svg></div>
<div class="follow" id="follow"><span aria-hidden="true">👆</span><span>${esc(D.yourTurn)}</span></div>
<div class="bar">${tg('haptic')}${tg('motion')}</div>
<div class="sheet ready" id="ready"><div class="panel">
<h2>${esc(D.name)}</h2><p class="goal">${esc(D.goal)}</p><p class="how" id="r-how">${esc(D.howDesktop)}</p><div class="go" id="r-go">${esc(D.goDesktop)}</div>
</div></div>
<div class="sheet" id="res" hidden><div class="panel" role="dialog" aria-labelledby="r-title">
<h2 id="r-title">${esc(D.over)}</h2><div class="new" id="r-new" hidden>${esc(D.newBest)}</div><div class="new" id="r-first" hidden>${esc(D.first)}</div>
<div class="card"><div id="r-path"></div><div class="nums"><span>${esc(D.done)}</span><b class="big" id="r-done"></b><span>${esc(D.longest)}</span><b id="r-long"></b><span>${esc(D.score)}</span><b id="r-score"></b></div></div>
<div class="cmp">${esc(D.best)}: <span id="r-best"></span></div>
<button class="btn main" id="b-again" type="button">${esc(D.again)}</button>
<div class="row"><button class="btn" id="b-share" type="button">${esc(D.share)}</button><button class="btn" id="b-link" type="button">${esc(D.link)}</button><button class="btn" id="b-png" type="button">${esc(D.png)}</button></div>
<div class="tgs">${tg('sound')}${tg('haptic')}${tg('motion')}</div><div class="seed">seed <span id="seed"></span></div>
</div></div>
</main><div class="toast" id="toast" role="status"></div>
<script id="et" type="application/json">${JSON.stringify(D).replace(/</g, '\\u003c')}</script>
<script>(()=>{${core}
${ui}})()</script>
</body></html>`;
    mkdirSync(`${ROOT}public/${l}/play/echo-courier`, { recursive: true });
    writeFileSync(`${ROOT}public/${l}/play/echo-courier/index.html`, html);
  }
  console.log(`echo-courier preview: ${ECHO_LANGS.length} pages (noindex, not in sitemap)`);
  return ECHO_LANGS.length;
}

if (import.meta.url === `file://${process.argv[1]}`) buildEcho();
