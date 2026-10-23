// OG images for Magnet Harbor (t_45f1a325): public/og/magnet-harbor-{lang}.png, 1200×630. Run once: node scripts/build-magnet-og.mjs
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { MAGNET_LANGS } from './build-magnet.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const T = JSON.parse(readFileSync(`${ROOT}i18n/magnet-harbor.json`, 'utf8'));
const svg = readFileSync(`${ROOT}public/img/magnet-harbor.svg`, 'utf8');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
for (const l of MAGNET_LANGS) {
  const D = T[l];
  await p.setContent(`<html><body style="margin:0;width:1200px;height:630px;display:flex;align-items:center;gap:56px;padding:0 80px;box-sizing:border-box;font-family:system-ui,'Apple SD Gothic Neo','Hiragino Sans','PingFang SC',sans-serif;color:#e8eaf0;background:radial-gradient(900px 600px at 20% 20%,rgba(34,211,238,.18),transparent),radial-gradient(900px 600px at 90% 90%,rgba(99,102,241,.28),transparent),#07080c">
<div style="width:300px;height:300px;flex:none;border-radius:48px;overflow:hidden;box-shadow:0 30px 60px -20px rgba(0,0,0,.8)">${svg.replace('<svg ', '<svg width="300" height="300" ')}</div>
<div><div style="font-size:84px;font-weight:900;line-height:1.05">${esc(D.name)}</div><div style="margin-top:22px;font-size:32px;line-height:1.35;color:rgba(214,219,232,.85)">${esc(D.desc)}</div>
<div style="margin-top:30px;font-size:28px;font-weight:700;color:#22d3ee">90s · playtoday.cloud</div></div></body></html>`);
  await p.screenshot({ path: `${ROOT}public/og/magnet-harbor-${l}.png` });
}
await b.close();
console.log(`og: ${MAGNET_LANGS.length} magnet-harbor images`);
