// Sort Rail preview pages (t_3f092e76): public/{lang}/play/sort-rail/index.html — noindex, preview only.
// NOT in PAGES / sitemap / lobby / footer / manifest(PWA). No /c/ shell, no /api. One self-contained HTML (CSS + core + UI inlined).
// CSS base copied from scripts/build-wind.mjs (wind-post preview branch) + sort additions at the end.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const ROOT = new URL("..", import.meta.url).pathname;
export const SORT_LANGS = ["ko", "en", "ja", "zh-hans", "es", "pt-br"];
const HTML_LANG = { ko: "ko", en: "en", ja: "ja", "zh-hans": "zh-Hans", es: "es", "pt-br": "pt-BR" };
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const CSS = `:root{--bg:#07080c;--panel:rgba(255,255,255,.045);--edge:rgba(255,255,255,.09);--fg:#e8eaf0;--muted:rgba(214,219,232,.72);--cyan:#22d3ee;--gold:#facc15;--glass:rgba(10,11,18,.72);color-scheme:dark}
*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:radial-gradient(1200px 700px at 50% -10%,rgba(79,70,229,.22),transparent),var(--bg);color:var(--fg);font:15px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;overflow-x:hidden;overscroll-behavior:contain}
body{display:flex;flex-direction:column;align-items:center;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
.top{width:100%;max-width:1080px;display:flex;justify-content:space-between;align-items:center;padding:8px 12px;gap:6px}
.logo{white-space:nowrap;color:var(--fg);text-decoration:none;font-weight:800;display:inline-flex;align-items:center;gap:8px;min-height:44px}.logo i{width:10px;height:10px;border-radius:50%;background:var(--cyan);box-shadow:0 0 12px var(--cyan)}
.tag{white-space:nowrap;padding:4px 10px;border-radius:99px;font-size:12px;font-weight:700;background:rgba(250,204,21,.18);color:var(--gold)}.tr{display:flex;gap:6px;align-items:center}
.langs{position:relative}.langs summary{white-space:nowrap;list-style:none;cursor:pointer;min-height:44px;min-width:44px;display:flex;align-items:center;justify-content:center;padding:0 10px;border-radius:12px;border:1px solid var(--edge);color:var(--muted)}.langs summary::-webkit-details-marker{display:none}.langs nav{position:absolute;right:0;top:48px;z-index:5;display:flex;flex-direction:column;background:var(--glass);border:1px solid var(--edge);border-radius:14px;padding:6px;backdrop-filter:blur(24px)}.langs a{color:var(--fg);text-decoration:none;min-height:44px;min-width:96px;display:flex;align-items:center;padding:0 12px;border-radius:10px}.langs a[aria-current]{font-weight:800;color:var(--cyan)}
.stage{position:relative;width:min(100vw,calc((100dvh - 64px)*9/16),540px);height:min(calc(100dvh - 64px),960px);display:flex;flex-direction:column;padding:0 10px 8px}
.hud{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding:4px 0 6px;font-variant-numeric:tabular-nums}.hud div{display:flex;flex-direction:column;align-items:center;min-width:0;background:var(--panel);border:1px solid var(--edge);border-radius:12px;padding:4px 2px;backdrop-filter:blur(18px)}
.hud span{font-size:11px;color:var(--muted);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.hud b{font-size:17px;white-space:nowrap}
#play{position:relative;flex:1;min-height:0;border-radius:20px;overflow:hidden;border:1px solid var(--edge);touch-action:none;cursor:pointer}
#cv{position:absolute;inset:0;width:100%;height:100%;display:block}
.bar{display:flex;justify-content:space-between;align-items:center;gap:8px;padding-top:6px}.hint{color:var(--muted);font-size:13px}
.ic,.tg{min-width:44px;min-height:44px;border-radius:14px;border:1px solid var(--edge);background:linear-gradient(rgba(255,255,255,.12),rgba(255,255,255,.05));color:var(--fg);font:600 14px/1.2 inherit;cursor:pointer;padding:0 12px}
.ic.off,.tg.off{opacity:.55}.tg.off{text-decoration:line-through}[hidden]{display:none!important}
.sheet{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(7,8,12,.55);z-index:3}
.panel{width:100%;max-width:420px;background:var(--glass);border:1px solid var(--edge);border-radius:20px;padding:18px;backdrop-filter:blur(24px) saturate(140%);-webkit-backdrop-filter:blur(24px) saturate(140%);display:flex;flex-direction:column;gap:10px;box-shadow:0 30px 60px -30px rgba(0,0,0,.8)}
.panel h2{margin:0;font-size:22px}.ready .panel,.pz .panel{align-items:center;text-align:center}
.sheet.ready{align-items:flex-start;padding-top:10px;background:linear-gradient(rgba(7,8,12,.55) 60%,rgba(7,8,12,0) 78%)}.ready .panel{gap:8px;padding:14px}.goal{margin:0;font-size:16px;font-weight:600}.how{margin:0;font-size:15px;color:var(--muted)}
.icon{font-size:34px;letter-spacing:6px}.t90{font-size:13px;color:var(--muted)}
.btn{min-height:46px;border-radius:14px;border:1px solid var(--edge);font:700 15px/1.2 inherit;color:var(--fg);cursor:pointer;padding:6px 10px;background:linear-gradient(rgba(255,255,255,.12),rgba(255,255,255,.05))}
.btn.main{min-height:64px;width:100%;font-size:22px;border:0;color:#fff;background:linear-gradient(135deg,#6366f1,#0ea5c6);box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 12px 24px -12px rgba(99,102,241,.9)}
.nums{display:grid;grid-template-columns:auto 1fr;gap:2px 12px;font-size:14px}.nums span{color:var(--muted)}.nums b{font-size:18px}.nums b.big{font-size:34px;color:var(--cyan)}
.new{color:#4ade80;font-weight:800}.cmp{font-size:13px;color:var(--muted)}.why{font-size:14px;color:var(--muted)}
.row{display:flex;gap:8px;flex-wrap:wrap}.row .btn{flex:1 1 120px}.tgs{display:flex;gap:6px;flex-wrap:wrap}.tgs .tg{flex:1 1 80px}
.seed{color:var(--muted);font-size:12px;text-align:center}
.guide{margin:0;font-size:14px;font-weight:600;color:#4ade80;padding:8px 10px;border-radius:12px;border:1px solid rgba(74,222,128,.35);background:rgba(74,222,128,.08)}
.tip{display:flex;flex-direction:column;gap:2px;padding:10px 12px;border-radius:14px;border:1px solid rgba(250,204,21,.35);background:rgba(250,204,21,.08)}.tip b{font-size:15px;line-height:1.35}.tipk{font-size:12px;color:var(--gold);font-weight:700}
.near{font-size:15px;font-weight:700;color:var(--cyan)}
.toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:var(--glass);border:1px solid var(--edge);border-radius:12px;padding:10px 14px;opacity:0;transition:opacity .2s;pointer-events:none;max-width:90vw}.toast.show{opacity:1}
@media (min-width:900px){body{background:radial-gradient(900px 600px at 15% 30%,rgba(34,211,238,.10),transparent),radial-gradient(900px 600px at 85% 70%,rgba(99,102,241,.16),transparent),var(--bg)}}
@media (prefers-reduced-motion:reduce){.toast{transition:none}}
.sheet .panel{max-height:100%;overflow-y:auto}
@media (max-height:860px){.ready .icon{display:none}.ready .panel{gap:6px;padding:12px}.ready .how,.ready .guide{font-size:13px}.ready .goal{font-size:15px}.btn.main{min-height:54px;font-size:20px}
#res{padding:8px}#res .panel{gap:5px;padding:12px}.panel h2{font-size:19px}.nums b.big{font-size:26px}.nums{font-size:13px}.nums b{font-size:16px}.tip{padding:7px 10px}.tip b{font-size:14px}.near{font-size:14px}.tgs .tg,.row .btn{min-height:44px}}
.hud .warn{border-color:#f87171;animation:bl .5s steps(2) infinite}@keyframes bl{50%{background:rgba(248,113,113,.25)}}.rm .hud .warn{animation:none;background:rgba(248,113,113,.25)}
.skip{min-height:44px}@media (min-width:900px){.stage{width:min(760px,100vw);height:min(calc(100dvh - 64px),860px)}}
.ofs{display:flex;align-items:center;justify-content:center;gap:10px}.ofs b{min-width:84px;text-align:center;font-size:22px;font-variant-numeric:tabular-nums}.lnk{background:none;border:0;color:var(--cyan);font:600 14px/1.2 inherit;min-height:44px;cursor:pointer;text-decoration:underline}
.acc{display:flex;height:14px;border-radius:7px;overflow:hidden;border:1px solid var(--edge)}.acc i{display:block;height:100%}.acc .e{background:#60a5fa}.acc .o{background:#4ade80}.acc .l{background:#f59e0b}.accl{display:flex;justify-content:space-between;font-size:12px;color:var(--muted)}
.cz{display:flex;flex-direction:column;gap:4px}.czt{font-size:12px;color:var(--muted);font-weight:700}.czl{display:flex;flex-wrap:wrap;gap:4px}.czl i{font-style:normal;font-size:13px;padding:3px 8px;border-radius:99px;border:1px solid rgba(248,113,113,.35);background:rgba(248,113,113,.10);color:#fecaca;white-space:nowrap}.czl i.top{border-color:#f87171;background:rgba(248,113,113,.22);font-weight:800}.czl i.zero{border-color:rgba(74,222,128,.35);background:rgba(74,222,128,.08);color:#bbf7d0}
.accn{font-size:12px;color:var(--muted);font-weight:700}#res .panel>*{flex-shrink:0}.czl{align-self:flex-start}
.hud{grid-template-columns:1.1fr 1fr 1fr 1fr}.tbar{height:4px;border-radius:2px;background:rgba(255,255,255,.08);overflow:hidden;margin:-2px 0 6px}.tbar i{display:block;height:100%;background:linear-gradient(90deg,#22d3ee,#6366f1)}
.rules{display:flex;justify-content:center;align-items:center;gap:10px;min-height:30px;padding-bottom:6px;font-size:15px;color:var(--muted)}.rules b{padding:2px 10px;border-radius:99px;border:1px solid var(--edge);background:var(--panel);color:var(--fg);letter-spacing:2px;white-space:nowrap}.rules .rb{border-color:rgba(250,204,21,.5);color:var(--gold)}
#play{display:flex;align-items:center;justify-content:center;cursor:default;touch-action:manipulation;background:radial-gradient(400px 300px at 50% 40%,rgba(99,102,241,.12),transparent)}
.parcel{position:relative;width:min(46%,200px);aspect-ratio:1;border-radius:26px;background:linear-gradient(rgba(255,255,255,.10),rgba(255,255,255,.03));border:2px solid var(--edge);display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 24px 50px -24px rgba(0,0,0,.9);backdrop-filter:blur(18px)}
.parcel .sym{font-size:min(22vw,110px);line-height:1;font-weight:800;text-shadow:0 0 18px currentColor}.parcel .bx{position:absolute;top:8px;right:12px;font:900 30px/1 system-ui;color:#fff;display:none}
.parcel.bang{border:6px dashed #fff}.parcel.bang .bx{display:block}
.dl{position:absolute;left:12px;right:12px;bottom:10px;height:6px;border-radius:3px;background:rgba(255,255,255,.1);overflow:hidden}.dl i{display:block;height:100%;background:linear-gradient(90deg,#f59e0b,#22d3ee)}
.parcel.in{animation:pin .18s ease-out}@keyframes pin{from{transform:translateY(-40px);opacity:.2}to{transform:none;opacity:1}}
.fb{position:absolute;top:12%;left:0;right:0;text-align:center;font:900 44px/1 system-ui;opacity:0;pointer-events:none}.fb.ok{opacity:1;color:#4ade80}.fb.bad{opacity:1;color:#f87171}
#rails{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding-top:8px}
.rail{min-height:64px;min-width:44px;border-radius:16px;border:2px solid var(--edge);background:linear-gradient(rgba(255,255,255,.12),rgba(255,255,255,.04));color:var(--fg);display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;touch-action:manipulation;font:700 15px/1 inherit;padding:0}
.rail i{font-style:normal;font-size:34px;font-weight:800;line-height:1}.rail span{color:var(--muted);font-size:18px}
.rail.on{background:rgba(255,255,255,.22);transform:translateY(2px)}.rail.ok{border-color:#4ade80;box-shadow:0 0 0 3px rgba(74,222,128,.35)}.rail.ok::after{content:"✓";color:#4ade80;font-size:22px;font-weight:900}.rail.bad{border-color:#f87171}.rail.bad::after{content:"✕";color:#f87171;font-size:22px;font-weight:900}
#rails.flash .rail{border-color:#fff;border-width:4px}.rm .parcel.in{animation:none}
.tut{position:absolute;bottom:8px;left:0;right:0;text-align:center;font-size:28px;color:#4ade80;animation:bl .5s steps(2) infinite}.rm .tut{animation:none}
.hid .parcel .sym,.hid .rail i{visibility:hidden}.hid #play>:not(.sheet):not(.note){filter:blur(6px)}.sheet.pz{background:rgba(7,8,12,.78)}.pz .panel{background:rgba(18,20,28,.96)}.pz .panel h2,.pz .panel .how,.pz .btn{color:var(--fg)}.pz .btn{min-height:48px}
.note{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:4;background:rgba(7,8,12,.6)}.note .panel{align-items:center;text-align:center}.note .pic{font-size:44px;font-weight:900;letter-spacing:4px;color:var(--gold)}
.dots{font-size:16px;letter-spacing:1px;word-break:break-all;color:var(--gold);line-height:1.25}.fbn{font-size:11px;color:var(--muted)}.cut{font-size:12px;color:var(--muted)}
@media (min-width:900px){.stage{width:min(560px,100vw)}}
@media (max-width:380px){.rail i{font-size:28px}.rail span{font-size:15px}}
@media(max-width:460px){.top .tag{display:none}.tr{gap:6px}.top{padding-left:12px;padding-right:12px}}`;
export function buildSort() {
  const T = JSON.parse(readFileSync(`${ROOT}i18n/sort-rail.json`, 'utf8'));
  const core = readFileSync(`${ROOT}public/js/sort-core.js`, 'utf8').replace(/^export \{[^}]*\};?\n/gm, '').replace(/^export /gm, '');
  const ui = readFileSync(`${ROOT}public/js/sort.js`, 'utf8');
  const keys = Object.keys(T.ko);
  for (const l of SORT_LANGS) for (const k of keys) if (!(k in T[l])) throw new Error(`sort i18n ${l} missing ${k}`);
  for (const l of SORT_LANGS) {
    const D = T[l], ln = D.lanes.split(',');
    const langs = SORT_LANGS.map((x) => `<a href="/${x}/play/sort-rail/" hreflang="${HTML_LANG[x]}"${x === l ? ' aria-current="true"' : ''}>${x}</a>`).join('');
    const tg = (k) => `<button class="tg" type="button" data-ui data-set="${k}" aria-pressed="true">${esc(D[k])}</button>`;
    const rail = (i, a) => `<button class="rail" type="button" data-lane="${i}" aria-label="${esc(ln[i])}"><span>${a}</span><i></i></button>`;
    const html = `<!doctype html><html lang="${HTML_LANG[l]}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#07080c">
<title>${esc(D.name)} (${esc(D.preview)}) | playtoday</title><meta name="description" content="${esc(D.desc)}"><meta name="robots" content="noindex,nofollow"><link rel="icon" href="data:,">
<style>${CSS}</style></head>
<body data-page="sort-rail" data-lang="${l}">
<header class="top"><a class="logo" href="/${l}/"><i></i>${esc(D.back)}</a><span class="tag">${esc(D.preview)}</span><div class="tr"><button class="ic" type="button" data-ui data-set="sound" data-icon="1" aria-label="${esc(D.sound)}" aria-pressed="true">🔊</button><button class="ic" type="button" data-ui data-set="haptic" data-icon="1" aria-label="${esc(D.haptic)}" aria-pressed="true">📳</button><button class="ic" id="b-pause" type="button" data-ui aria-label="${esc(D.pause)}">⏸</button><details class="langs" data-ui><summary aria-label="Language">${l.split("-")[0]} ▾</summary><nav>${langs}</nav></details></div></header>
<main class="stage" id="stage">
<div class="hud"><div><span>${esc(D.time)}</span><b id="h-time">90</b></div><div><span>${esc(D.sorted)}</span><b id="h-n">0</b></div><div><span>${esc(D.score)}</span><b id="h-score">0</b></div><div><span>${esc(D.combo)}</span><b id="h-combo">0 ×1</b></div></div>
<div class="tbar" aria-hidden="true"><i id="h-bar" style="width:100%"></i></div>
<div class="rules" aria-label="${esc(D.rule)}"><b>★→★</b><b class="rb" id="rule-b" hidden>!→↓</b></div>
<div id="play" role="application" aria-label="${esc(D.name)}">
<div class="parcel" id="parcel" hidden><span class="sym" id="p-sym"></span><span class="bx" aria-hidden="true">!</span><div class="dl" aria-hidden="true"><i id="p-dl"></i></div></div>
<div class="fb" id="fb" aria-live="polite"></div><div class="tut" id="tut" hidden aria-hidden="true">↓</div>
<div class="note" id="note" hidden><div class="panel"><div class="pic" aria-hidden="true">!→↓</div><h2>${esc(D.ruleNew)}</h2></div></div>
<div class="sheet ready" id="ready" data-ui><div class="panel">
<h2>${esc(D.name)}</h2><p class="goal">${esc(D.goal)}</p><div class="icon" aria-hidden="true">📦★→★</div><p class="how">${esc(D.how)}</p>
<button class="btn main" id="b-start" type="button">${esc(D.start)}</button><div class="t90">${esc(D.time)} 90 · ${esc(D.keys)}</div>
</div></div>
<div class="sheet pz" id="pz" data-ui hidden><div class="panel"><h2>${esc(D.paused)}</h2><p class="how">${esc(D.resumeHelp)}</p><button class="btn main" id="b-resume" type="button">${esc(D.cont)}</button><button class="btn" id="b-restart" type="button">${esc(D.restart)}</button><div class="tgs">${tg('sound')}${tg('haptic')}${tg('motion')}</div></div></div>
<div class="sheet" id="res" data-ui hidden><div class="panel" role="dialog" aria-labelledby="r-title">
<h2 id="r-title">${esc(D.over)}</h2><div class="new" id="r-new" hidden>${esc(D.newBest)}</div><div class="new" id="r-first" hidden>${esc(D.first)}</div>
<div class="nums"><span>${esc(D.score)}</span><b class="big" id="r-score"></b><span>${esc(D.best)}</span><b id="r-best"></b><span>${esc(D.diff)}</span><b id="r-diff"></b><span>${esc(D.sorted)}</span><b id="r-n"></b><span>${esc(D.acc)}</span><b id="r-acc"></b><span>${esc(D.maxCombo)}</span><b id="r-max"></b></div>
<div class="czt">${esc(D.dotsT)}</div><div class="dots" id="r-dots"></div><div class="cut" id="r-cut" hidden>${esc(D.lastCut)}</div>
<button class="btn main" id="b-again" type="button">${esc(D.again)}</button>
<div class="row"><button class="btn" id="b-png" type="button">${esc(D.png)}</button><button class="btn" id="b-link" type="button">${esc(D.link)}</button></div>
<div class="tgs">${tg('sound')}${tg('haptic')}${tg('motion')}</div><div class="seed">seed <span id="seed"></span> <span class="fbn" id="r-fb"></span></div>
</div></div>
</div>
<div id="rails">${rail(0, '←')}${rail(1, '↓')}${rail(2, '→')}</div>
<div class="bar"><span class="hint">${esc(D.hint)}</span></div>
</main><div class="toast" id="toast" role="status"></div>
<script id="st" type="application/json">${JSON.stringify(D).replace(/</g, '\\u003c')}</script>
<script>(()=>{${core}
${ui}})()</script>
</body></html>`;
    mkdirSync(`${ROOT}public/${l}/play/sort-rail`, { recursive: true });
    writeFileSync(`${ROOT}public/${l}/play/sort-rail/index.html`, html);
  }
  console.log(`sort-rail: ${SORT_LANGS.length} preview pages (noindex, unlisted)`);
  return SORT_LANGS.length;
}
if (import.meta.url === `file://${process.argv[1]}`) buildSort();
