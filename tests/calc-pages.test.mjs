// t_61344aaa: /calc 정적 페이지 (JS 없이 title·description·H1·FAQ·FAQPage JSON-LD), 홈 '오늘 계산기' 6카드, sitemap.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildCalc, CALC } from '../scripts/build-calc.mjs';
import { SLUGS } from '../public/js/calc-core.js';
const ROOT = new URL('..', import.meta.url).pathname;
buildCalc();

test('10 calc pages + hub: SEO fields, JSON-LD FAQ matches body, no forced share', () => {
  assert.equal(SLUGS.length, 10);
  for (const s of ['', ...SLUGS]) {
    const h = readFileSync(`${ROOT}public/calc/${s ? s + '/' : ''}index.html`, 'utf8');
    const title = /<title>([^<]+)<\/title>/.exec(h)[1], desc = /<meta name="description" content="([^"]+)"/.exec(h)[1];
    assert.ok(title.length <= 60, `${s} title ${title.length}`);
    assert.ok(desc.length >= 60 && desc.length <= 130, `${s} desc ${desc.length}`);
    assert.match(h, /<h1>[^<]+<\/h1>/);
    assert.match(h, new RegExp(`<link rel="canonical" href="https://www.playtoday.cloud/calc/${s ? s + '/' : ''}">`));
    const ld = JSON.parse(/<script type="application\/ld\+json">(.+?)<\/script>/.exec(h)[1]);
    const faq = ld['@graph'].find((x) => x['@type'] === 'FAQPage');
    assert.ok(faq.mainEntity.length >= 3);
    for (const q of faq.mainEntity) assert.ok(h.includes(`<h3>${q.name.replace(/&/g, '&amp;')}</h3>`), q.name);
    if (s) { const app = ld['@graph'].find((x) => x['@type'] === 'WebApplication'); assert.equal(app.applicationCategory, 'UtilitiesApplication'); assert.equal(app.offers.price, 0); assert.ok(CALC[s].faq.length >= 3 && CALC[s].faq.length <= 5); }
    assert.doesNotMatch(h, /type="email"|type="tel"|연락처를 입력/);
  }
});

test('home ko has 오늘 계산기 6 cards + /calc link; sitemap has /calc and 10 slugs', () => {
  const home = readFileSync(`${ROOT}public/ko/index.html`, 'utf8');
  assert.equal((home.match(/data-calc-card=/g) || []).length, 6);
  assert.ok(home.includes('href="/calc/"'));
  const sm = readFileSync(`${ROOT}public/sitemap.xml`, 'utf8');
  for (const s of ['', ...SLUGS]) assert.ok(sm.includes(`<loc>https://www.playtoday.cloud/calc/${s ? s + '/' : ''}</loc>`), s);
});
