// t_6b058523 probe 2: is the touch timeStamp lag a harness (emulated touch) artifact? Blank page, no game, no rAF loop.
import { chromium } from 'playwright'; import { writeFileSync } from 'node:fs';
const EV = process.env.OT_EV; const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const b = await chromium.launch({ headless: process.env.HEADED ? false : true }); const out = {};
const html = '<html><body style="margin:0"><div id=d style="width:400px;height:400px;background:#333;touch-action:manipulation"></div><script>window.L=[];d.addEventListener("pointerdown",e=>{L.push({type:e.pointerType,lag:performance.now()-e.timeStamp,trusted:e.isTrusted})});</script></body></html>';
for (const [name, opt, how] of [['mouse', {}, 'mouse'], ['touch-isMobile', { hasTouch: true, isMobile: true }, 'tap'], ['touch-noMobile', { hasTouch: true }, 'tap'], ['cdp-touch-ts', { hasTouch: true, isMobile: true }, 'cdpts'], ['cdp-tapGesture', { hasTouch: true, isMobile: true }, 'gesture']]) {
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, ...opt }); const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p); await p.setContent(html);
  for (let i = 0; i < 8; i++) {
    if (how === 'mouse') await p.mouse.click(200, 200); else if (how === 'tap') await p.touchscreen.tap(200, 200);
    else if (how === 'cdpts') { const ts = Date.now() / 1000; await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 200, y: 200 }], timestamp: ts }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [], timestamp: ts + 0.05 }); }
    else await cdp.send('Input.synthesizeTapGesture', { x: 200, y: 200, gestureSourceType: 'touch' });
    await sleep(300 + 37 * i);
  }
  out[name] = (await p.evaluate(() => L)).map((x) => +x.lag.toFixed(1)); console.log(name, JSON.stringify(out[name])); await ctx.close();
}
writeFileSync(EV + (process.env.HEADED ? 'ts-probe2-headed.json' : 'ts-probe2.json'), JSON.stringify(out, null, 1)); await b.close();
