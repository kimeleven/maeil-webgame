// Odd Tile preview pages (t_2964ede9): public/{lang}/play/odd-tile/index.html — noindex, preview only.
// NOT in PAGES / sitemap / lobby / footer / manifest(PWA). No /c/ shell, no /api. One self-contained HTML (CSS + core + UI inlined).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const ROOT = new URL('..', import.meta.url).pathname;
export const ODD_LANGS = ['ko', 'en', 'ja', 'zh-hans', 'es', 'pt-br'];
const HTML_LANG = { ko: 'ko', en: 'en', ja: 'ja', 'zh-hans': 'zh-Hans', es: 'es', 'pt-br': 'pt-BR' };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const CSS = `:root{--bg:#07080c;--panel:rgba(255,255,255,.045);--edge:rgba(255,255,255,.09);--fg:#e8eaf0;--muted:rgba(214,219,232,.72);--cyan:#22d3ee;--gold:#facc15;--glass:rgba(10,11,18,.72);color-scheme:dark}
*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:radial-gradient(1200px 700px at 50% -10%,rgba(79,70,229,.22),transparent),var(--bg);color:var(--fg);font:15px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;overflow-x:hidden;overscroll-behavior:contain}
body{display:flex;flex-direction:column;align-items:center;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
.top{width:100%;max-width:1080px;display:flex;justify-content:space-between;align-items:center;padding:8px 12px;gap:6px}
.logo{white-space:nowrap;color:var(--fg);text-decoration:none;font-weight:800;display:inline-flex;align-items:center;gap:8px;min-height:44px}.logo i{width:10px;height:10px;border-radius:50%;background:var(--cyan);box-shadow:0 0 12px var(--cyan)}
.tag{white-space:nowrap;padding:4px 10px;border-radius:99px;font-size:12px;font-weight:700;background:rgba(250,204,21,.18);color:var(--gold)}.tr{display:flex;gap:6px;align-items:center}
.langs{position:relative}.langs summary{list-style:none;cursor:pointer;min-height:44px;min-width:44px;display:flex;align-items:center;justify-content:center;padding:0 10px;border-radius:12px;border:1px solid var(--edge);color:var(--muted)}.langs summary::-webkit-details-marker{display:none}.langs nav{position:absolute;right:0;top:48px;z-index:5;display:flex;flex-direction:column;background:var(--glass);border:1px solid var(--edge);border-radius:14px;padding:6px;backdrop-filter:blur(24px)}.langs a{color:var(--fg);text-decoration:none;min-height:44px;min-width:96px;display:flex;align-items:center;padding:0 12px;border-radius:10px}.langs a[aria-current]{font-weight:800;color:var(--cyan)}
.stage{position:relative;width:min(100vw,calc((100dvh - 64px)*9/16),540px);min-width:min(100vw,360px);min-height:min(calc(100dvh - 64px),960px);display:flex;flex-direction:column;align-items:center;padding:0 12px 8px}
.hud{width:100%;display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding:4px 0 6px;font-variant-numeric:tabular-nums}.hud>div{position:relative;display:flex;flex-direction:column;align-items:center;min-width:0;background:var(--panel);border:1px solid var(--edge);border-radius:12px;padding:4px 2px;backdrop-filter:blur(18px);overflow:hidden}
.hud span{font-size:11px;color:var(--muted);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.hud b{font-size:17px;white-space:nowrap}
.tbar{position:absolute;left:0;bottom:0;height:4px;width:100%;background:linear-gradient(90deg,#6366f1,#22d3ee)}.tbar.low{background:#f87171}
.dl{width:min(100%,380px);height:6px;border-radius:3px;background:rgba(255,255,255,.06);margin:6px 0 8px;overflow:hidden}.dl i{display:block;height:100%;width:0;background:linear-gradient(90deg,#22d3ee,#6366f1)}
#grid{width:min(100%,380px);aspect-ratio:1/1;display:grid;grid-template-columns:repeat(var(--n,3),1fr);gap:6px;touch-action:manipulation}
.cell{position:relative;min-width:44px;min-height:44px;padding:0;border-radius:14px;border:2px solid var(--edge);background:linear-gradient(rgba(255,255,255,.07),rgba(255,255,255,.03));cursor:pointer;overflow:hidden;touch-action:manipulation}
.cell canvas{position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none}
.cell.focus{border:4px solid var(--cyan)}.cell.down{background:rgba(34,211,238,.18)}
.cell.ok{border:4px solid #4ade80}.cell.ok::after{content:"✓";position:absolute;right:6px;top:2px;font:800 20px system-ui;color:#4ade80}
.cell.bad{border:4px solid #f87171}.cell.bad::after{content:"✕";position:absolute;right:6px;top:2px;font:800 20px system-ui;color:#f87171}
.cell.show{border:4px dashed #facc15}
.cell.breathe{animation:br 1s ease-in-out 1}@keyframes br{50%{box-shadow:0 0 0 6px rgba(34,211,238,.45)}}
.rm .cell.breathe{animation:none;border-width:5px;border-color:rgba(34,211,238,.7)}
.under{display:flex;flex-direction:column;align-items:center;gap:8px;padding-top:10px;min-height:60px}
.chip{font-size:14px;font-weight:700;padding:6px 12px;border-radius:99px;border:1px solid var(--edge);background:var(--panel);font-variant-numeric:tabular-nums}.chip.hit{color:#4ade80}.chip.wrong,.chip.miss{color:#fca5a5}
.hint{color:var(--muted);font-size:13px;text-align:center}
.ic,.tg{min-width:44px;min-height:44px;border-radius:14px;border:1px solid var(--edge);background:linear-gradient(rgba(255,255,255,.12),rgba(255,255,255,.05));color:var(--fg);font:600 14px/1.2 inherit;cursor:pointer;padding:0 12px}
.ic.off,.tg.off{opacity:.55}.tg.off{text-decoration:line-through}[hidden]{display:none!important}
.sheet{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(7,8,12,.55);z-index:3}
.sheet.pz{backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);background:rgba(7,8,12,.86)}
.panel{width:100%;max-width:420px;background:var(--glass);border:1px solid var(--edge);border-radius:20px;padding:18px;backdrop-filter:blur(24px) saturate(140%);-webkit-backdrop-filter:blur(24px) saturate(140%);display:flex;flex-direction:column;gap:10px;box-shadow:0 30px 60px -30px rgba(0,0,0,.8);max-height:100%;overflow-y:auto}
.panel>*{flex-shrink:0}.panel h2{margin:0;font-size:22px}.ready .panel,.pz .panel{align-items:center;text-align:center}
.goal{margin:0;font-size:17px;font-weight:700}.how{margin:0;font-size:15px;color:var(--muted)}.icon{font-size:30px;letter-spacing:4px}.small{font-size:13px;color:var(--muted)}
.btn{min-height:46px;border-radius:14px;border:1px solid var(--edge);font:700 15px/1.2 inherit;color:var(--fg);cursor:pointer;padding:6px 10px;background:linear-gradient(rgba(255,255,255,.12),rgba(255,255,255,.05))}
.btn.main{min-height:64px;width:100%;font-size:22px;border:0;color:#fff;background:linear-gradient(135deg,#6366f1,#0ea5c6);box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 12px 24px -12px rgba(99,102,241,.9)}
.nums{display:grid;grid-template-columns:auto 1fr;gap:2px 12px;font-size:14px;font-variant-numeric:tabular-nums}.nums span{color:var(--muted)}.nums b{font-size:18px}.nums b.big{font-size:34px;color:var(--cyan)}
.new{color:#4ade80;font-weight:800}.warn{color:#fca5a5;font-size:13px;font-weight:700}
.line{font-size:14px;letter-spacing:2px;word-break:break-all;color:var(--fg)}.lineT{font-size:12px;color:var(--muted);font-weight:700}
.row{display:flex;gap:8px;flex-wrap:wrap}.row .btn{flex:1 1 120px}.tgs{display:flex;gap:6px;flex-wrap:wrap;width:100%}.tgs .tg{flex:1 1 80px}
.seed{color:var(--muted);font-size:12px;text-align:center;word-break:break-all}
.toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:var(--glass);border:1px solid var(--edge);border-radius:12px;padding:10px 14px;opacity:0;transition:opacity .2s;pointer-events:none;max-width:90vw}.toast.show{opacity:1}
@media (min-width:900px){body{background:radial-gradient(900px 600px at 15% 30%,rgba(34,211,238,.10),transparent),radial-gradient(900px 600px at 85% 70%,rgba(99,102,241,.16),transparent),var(--bg)}}
@media (prefers-reduced-motion:reduce){.toast{transition:none}.cell.breathe{animation:none;border-width:5px;border-color:rgba(34,211,238,.7)}}
@media (max-height:860px){.ready .icon{display:none}.panel{gap:6px;padding:12px}.btn.main{min-height:54px;font-size:20px}.nums b.big{font-size:26px}.tgs .tg,.row .btn{min-height:44px}}`;
export function buildOdd() {
  const T = JSON.parse(readFileSync(`${ROOT}i18n/odd-tile.json`, 'utf8'));
  const core = readFileSync(`${ROOT}public/js/odd-core.js`, 'utf8').replace(/^export /gm, '');
  const ui = readFileSync(`${ROOT}public/js/odd.js`, 'utf8');
  const keys = Object.keys(T.ko);
  for (const l of ODD_LANGS) for (const k of keys) if (!(k in T[l])) throw new Error(`odd i18n ${l} missing ${k}`);
  for (const l of ODD_LANGS) {
    const D = T[l];
    const langs = ODD_LANGS.map((x) => `<a href="/${x}/play/odd-tile/" hreflang="${HTML_LANG[x]}"${x === l ? ' aria-current="true"' : ''}>${x}</a>`).join('');
    const tg = (k) => `<button class="tg" type="button" data-ui data-set="${k}" aria-pressed="true">${esc(D[k])}</button>`;
    const html = `<!doctype html><html lang="${HTML_LANG[l]}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#07080c">
<title>${esc(D.name)} (${esc(D.preview)}) | playtoday</title><meta name="description" content="${esc(D.desc)}"><meta name="robots" content="noindex,nofollow"><link rel="icon" href="data:,">
<style>${CSS}</style></head>
<body data-page="odd-tile" data-lang="${l}">
<header class="top"><a class="logo" href="/${l}/"><i></i>${esc(D.back)}</a><span class="tag">${esc(D.preview)}</span><div class="tr"><button class="ic" type="button" data-ui data-set="sound" data-icon="1" aria-label="${esc(D.sound)}" aria-pressed="true">🔊</button><button class="ic" type="button" data-ui data-set="haptic" data-icon="1" aria-label="${esc(D.haptic)}" aria-pressed="true">📳</button><button class="ic" id="b-pause" type="button" data-ui aria-label="${esc(D.pause)}">⏸</button><details class="langs" data-ui><summary aria-label="Language">${l} ▾</summary><nav>${langs}</nav></details></div></header>
<main class="stage" id="stage">
<div class="hud"><div><span>${esc(D.time)}</span><b id="h-time">60.0</b><i class="tbar" id="h-bar"></i></div><div><span>${esc(D.found)}</span><b id="h-found">0</b></div><div><span>${esc(D.score)}</span><b id="h-score">0</b></div><div><span>${esc(D.combo)}</span><b id="h-combo">—</b></div></div>
<div class="dl" aria-hidden="true"><i id="dbar"></i></div>
<div id="grid" role="grid" aria-label="${esc(D.name)}"></div>
<div class="under"><div class="chip" id="chip" hidden></div><span class="hint">${esc(D.keys)}</span></div>
<div class="sheet ready" id="ready" data-ui><div class="panel">
<h2>${esc(D.name)}</h2><p class="goal">${esc(D.goal)}</p><div class="icon" aria-hidden="true">● ● ● ◐ → !</div><p class="how">${esc(D.how)}</p>
<button class="btn main" id="b-start" type="button">${esc(D.start)}</button><div class="small">${esc(D.keys)}</div>
</div></div>
<div class="sheet pz" id="pz" data-ui hidden><div class="panel"><h2>${esc(D.paused)}</h2><button class="btn main" id="b-resume" type="button">${esc(D.resume)}</button><button class="btn" id="b-restart" type="button">${esc(D.restart)}</button><div class="tgs">${tg('motion')}</div></div></div>
<div class="sheet" id="res" data-ui hidden><div class="panel" role="dialog" aria-labelledby="r-title">
<h2 id="r-title">${esc(D.over)}</h2><div class="new" id="r-new" hidden>${esc(D.newBest)}</div><div class="new" id="r-first" hidden>${esc(D.first)}</div>
<div class="nums"><span>${esc(D.now)}</span><b class="big" id="r-score"></b><span>${esc(D.best)}</span><b id="r-best"></b><span>${esc(D.diff)}</span><b id="r-diff"></b><span>${esc(D.found)}</span><b id="r-found"></b><span>${esc(D.acc)}</span><b id="r-acc"></b><span>${esc(D.maxCombo)}</span><b id="r-combo"></b></div>
<div class="warn" id="r-cut" hidden>${esc(D.lastCut)}</div><span class="lineT">${esc(D.line)}</span><div class="line" id="r-line" aria-hidden="true"></div>
<button class="btn main" id="b-again" type="button">${esc(D.again)}</button>
<div class="row"><button class="btn" id="b-png" type="button">${esc(D.png)}</button><button class="btn" id="b-link" type="button">${esc(D.link)}</button></div>
<div class="tgs">${tg('sound')}${tg('haptic')}${tg('motion')}</div><div class="seed">seed <span id="seed"></span> <span id="r-fb"></span></div>
</div></div>
</main><div class="toast" id="toast" role="status"></div>
<script id="ot" type="application/json">${JSON.stringify(D).replace(/</g, '\\u003c')}</script>
<script>(()=>{${core}
${ui}})()</script>
</body></html>`;
    mkdirSync(`${ROOT}public/${l}/play/odd-tile`, { recursive: true });
    writeFileSync(`${ROOT}public/${l}/play/odd-tile/index.html`, html);
  }
  console.log(`odd-tile: ${ODD_LANGS.length} preview pages (noindex, unlisted)`);
  return ODD_LANGS.length;
}
if (import.meta.url === `file://${process.argv[1]}`) buildOdd();
