// Orbit Switch preview pages (t_34f9c354): public/{lang}/play/orbit-switch/index.html, noindex.
// Not in PAGES / sitemap / lobby / footer nav (preview only, not a confirmed production URL).
// Single self-contained HTML: CSS + core + UI inlined so first tap needs one request.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
export const ORBIT_LANGS = ['ko', 'en', 'ja', 'zh-hans', 'es', 'pt-br'];
const HTML_LANG = { ko: 'ko', en: 'en', ja: 'ja', 'zh-hans': 'zh-Hans', es: 'es', 'pt-br': 'pt-BR' };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const CSS = `:root{--bg:#07080c;--panel:rgba(255,255,255,.045);--edge:rgba(255,255,255,.09);--fg:#e8eaf0;--muted:rgba(214,219,232,.72);--accent2:#22d3ee;--glass:rgba(10,11,18,.72);color-scheme:dark}
*{box-sizing:border-box}html,body{margin:0;height:100%;background:radial-gradient(1200px 700px at 50% -10%,rgba(79,70,229,.22),transparent),var(--bg);color:var(--fg);font:15px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;overflow-x:hidden}
body{display:flex;flex-direction:column;align-items:center;touch-action:manipulation;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
.top{width:100%;max-width:1080px;display:flex;justify-content:space-between;align-items:center;padding:10px 16px;gap:8px}
.logo{white-space:nowrap;color:var(--fg);text-decoration:none;font-weight:800;display:inline-flex;align-items:center;gap:8px;min-height:44px}.logo i{width:10px;height:10px;border-radius:50%;background:var(--accent2);box-shadow:0 0 12px var(--accent2)}
.tag{white-space:nowrap;padding:4px 10px;border-radius:99px;font-size:12px;font-weight:700;background:rgba(250,204,21,.18);color:#facc15}
.langs{position:relative}.langs summary{list-style:none;cursor:pointer;min-height:44px;min-width:44px;display:flex;align-items:center;justify-content:center;padding:0 10px;border-radius:12px;border:1px solid var(--edge);color:var(--muted)}.langs summary::-webkit-details-marker{display:none}.langs nav{position:absolute;right:0;top:48px;z-index:5;display:flex;flex-direction:column;background:var(--glass);border:1px solid var(--edge);border-radius:14px;padding:6px;backdrop-filter:blur(24px)}.langs a{color:var(--fg);text-decoration:none;min-height:44px;min-width:96px;display:flex;align-items:center;padding:0 12px;border-radius:10px}.langs a[aria-current]{font-weight:800;color:var(--accent2)}
.stage{position:relative;width:100%;max-width:min(100vw,calc((100dvh - 64px)*9/16));aspect-ratio:9/16;max-height:calc(100dvh - 64px);display:flex;flex-direction:column;padding:0 16px 12px}
.hud{display:flex;justify-content:space-between;gap:8px;padding:8px 4px;font-variant-numeric:tabular-nums}.hud div{display:flex;flex-direction:column;align-items:center;flex:1;background:var(--panel);border:1px solid var(--edge);border-radius:14px;padding:6px 4px;backdrop-filter:blur(18px)}
.hud span{font-size:11px;color:var(--muted)}.hud b{font-size:20px}
canvas{width:100%;aspect-ratio:1;display:block;margin:auto 0;touch-action:none}
.bar{display:flex;justify-content:space-between;align-items:center;gap:8px;padding-top:6px}.hint{color:var(--muted);font-size:13px}
.ic,.tg{min-width:44px;min-height:44px;border-radius:14px;border:1px solid var(--edge);background:linear-gradient(rgba(255,255,255,.12),rgba(255,255,255,.05));color:var(--fg);font:600 14px/1 inherit;cursor:pointer;padding:0 12px}
.ic.off,.tg.off{opacity:.55;text-decoration:line-through}
.sheet{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(7,8,12,.45)}.sheet[hidden]{display:none}
.panel{width:100%;max-width:420px;background:var(--glass);border:1px solid var(--edge);border-radius:20px;padding:18px;backdrop-filter:blur(24px) saturate(140%);-webkit-backdrop-filter:blur(24px) saturate(140%);display:flex;flex-direction:column;gap:10px;box-shadow:0 30px 60px -30px rgba(0,0,0,.8)}
.panel h2{margin:0;font-size:22px}.cmp{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-size:14px}.cmp span{color:var(--muted)}
.big{display:flex;gap:14px;align-items:baseline;flex-wrap:wrap}.big b{font-size:34px;color:var(--accent2)}.big i{font-style:normal;font-size:20px;color:var(--fg)}
.near{color:#facc15;font-weight:700;min-height:0}.new{color:#4ade80;font-weight:800}
.btn{min-height:46px;border-radius:14px;border:1px solid var(--edge);font:700 16px/1.2 inherit;color:var(--fg);cursor:pointer;background:linear-gradient(rgba(255,255,255,.12),rgba(255,255,255,.05))}
.btn.main{min-height:64px;font-size:22px;border:0;color:#fff;background:linear-gradient(135deg,#6366f1,#0ea5c6);box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 12px 24px -12px rgba(99,102,241,.9)}
.row{display:flex;gap:8px;flex-wrap:wrap}.row .btn{flex:1 1 120px}.tgs{display:flex;gap:6px;flex-wrap:wrap}.tgs .tg{flex:1}
.seed{color:var(--muted);font-size:12px;text-align:center}
.toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:var(--glass);border:1px solid var(--edge);border-radius:12px;padding:10px 14px;opacity:0;transition:opacity .2s;pointer-events:none;max-width:90vw}.toast.show{opacity:1}
.ready{background:rgba(7,8,12,.55)}.ready .panel{align-items:center;text-align:center}.goal{margin:0;font-size:16px;font-weight:600}.legend{list-style:none;margin:0;padding:0;display:flex;gap:14px;flex-wrap:wrap;justify-content:center;font-size:14px;color:var(--muted)}.legend li{display:flex;align-items:center;gap:6px}.how{margin:0;font-size:15px}.go{min-height:56px;display:flex;align-items:center;justify-content:center;width:100%;border-radius:14px;font-weight:800;font-size:20px;color:#fff;background:linear-gradient(135deg,#6366f1,#0ea5c6)}\n.cause{display:flex;flex-direction:column;gap:2px;padding:10px 12px;border-radius:14px;background:rgba(255,77,94,.12);border:1px solid rgba(255,77,94,.35)}.cause b{color:#ff8a96}.cause span{font-size:14px}.cause[hidden]{display:none}\n@media (prefers-reduced-motion:reduce){.toast{transition:none}}`;

export function buildOrbit() {
  const T = JSON.parse(readFileSync(`${ROOT}i18n/orbit-switch.json`, 'utf8'));
  const core = readFileSync(`${ROOT}public/js/orbit-core.js`, 'utf8').replace(/^export /gm, '');
  const ui = readFileSync(`${ROOT}public/js/orbit.js`, 'utf8');
  const keys = Object.keys(T.ko);
  for (const l of ORBIT_LANGS) for (const k of keys) if (!(k in T[l])) throw new Error(`orbit i18n ${l} missing ${k}`);
  for (const l of ORBIT_LANGS) {
    const D = T[l];
    const langs = ORBIT_LANGS.map((x) => `<a href="/${x}/play/orbit-switch/" hreflang="${HTML_LANG[x]}"${x === l ? ' aria-current="true"' : ''}>${x}</a>`).join('');
    const tg = (k) => `<button class="tg" type="button" data-set="${k}" aria-pressed="true">${esc(D[k])}</button>`;
    const html = `<!doctype html><html lang="${HTML_LANG[l]}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#07080c">
<title>${esc(D.title)}</title><meta name="description" content="${esc(D.desc)}"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><link rel="icon" href="data:,">
<style>${CSS}</style></head>
<body data-page="orbit-switch" data-lang="${l}">
<header class="top" data-ui><a class="logo" href="/${l}/"><i></i>${esc(D.back)}</a><span class="tag">${esc(D.preview)}</span><details class="langs"><summary aria-label="Language">${l} ▾</summary><nav>${langs}</nav></details></header>
<main class="stage" id="stage">
<div class="hud" aria-live="off"><div><span>${esc(D.time)}</span><b id="h-time">90</b></div><div><span>${esc(D.streak)}</span><b id="h-streak">0</b></div><div><span>${esc(D.mult)}</span><b id="h-mult">×1</b></div><div><span>◆</span><b id="h-shield">◆</b></div></div>
<canvas id="oc" role="img" aria-label="${esc(D.name)}"></canvas>
<div class="bar"><span class="hint" id="hint">${esc(D.startDesktop)}</span><button class="ic" type="button" data-ui data-set="sound" aria-label="${esc(D.sound)}" aria-pressed="true">🔊</button></div>
<div class="sheet ready" id="ready"><div class="panel">
<h2>${esc(D.name)}</h2><p class="goal">${esc(D.startGoal)}</p>
<ul class="legend"><li><svg viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="6" fill="#fff"/><circle cx="12" cy="12" r="9.5" fill="none" stroke="#4ade80" stroke-width="2"/></svg><span>${esc(D.legendYou)}</span></li><li><svg viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="8" fill="none" stroke="#22d3ee" stroke-width="3"/></svg><span>${esc(D.legendRing)}</span></li><li><svg viewBox="0 0 24 24" width="24" height="24"><path d="M3 15 A10 10 0 0 1 21 15" fill="none" stroke="#ff4d5e" stroke-width="6"/></svg><span>${esc(D.legendDanger)}</span></li></ul>
<p class="how" id="r-how">${esc(D.startDesktop)}</p><div class="go" id="r-go">${esc(D.startActionDesktop)}</div>
</div></div>
<div class="sheet" id="ov" hidden><div class="panel"><h2>${esc(D.paused)}</h2><div class="tgs" data-ui>${tg('haptic')}${tg('motion')}</div></div></div>
<div class="sheet" id="res" hidden data-ui><div class="panel" role="dialog" aria-labelledby="r-title">
<h2 id="r-title"></h2><div class="new" id="r-new" hidden>${esc(D.newBest)}</div>
<div class="cause" id="r-cause" hidden><b id="r-cause-t"></b><span id="r-tip"></span></div>
<div class="big"><b id="r-dt"></b><i id="r-ds"></i></div><div class="near" id="r-near"></div>
<div class="cmp"><span>${esc(D.now)}</span><b id="r-now"></b><span>${esc(D.best)}</span><b id="r-best"></b></div>
<button class="btn main" id="b-again" type="button">${esc(D.again)}</button>
<div class="row"><button class="btn" id="b-share" type="button">${esc(D.share)}</button><button class="btn" id="b-link" type="button">${esc(D.link)}</button><button class="btn" id="b-png" type="button">${esc(D.png)}</button></div>
<div class="tgs">${tg('sound')}${tg('haptic')}${tg('motion')}</div><div class="seed">seed <span id="seed"></span></div>
</div></div>
</main><div class="toast" id="toast" role="status"></div>
<script id="ot" type="application/json">${JSON.stringify(D).replace(/</g, '\\u003c')}</script>
<script>(()=>{${core}
${ui}})()</script>
</body></html>`;
    mkdirSync(`${ROOT}public/${l}/play/orbit-switch`, { recursive: true });
    writeFileSync(`${ROOT}public/${l}/play/orbit-switch/index.html`, html);
  }
  console.log(`orbit-switch preview: ${ORBIT_LANGS.length} pages (noindex, not in sitemap)`);
  return ORBIT_LANGS.length;
}

if (import.meta.url === `file://${process.argv[1]}`) buildOrbit();
