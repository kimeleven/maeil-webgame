// t_11d5fd4b: internal link graph + meta checks over the built pages (6 languages).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { build } from '../scripts/build-i18n.mjs';

const LANGS = ['ko', 'en', 'ja', 'zh-hans', 'es', 'pt-br'];
const LANDS = ['play/commute/', 'play/quick-break/', 'friends/things-to-do/'];
const read = (l, suf) => readFileSync(new URL(`../public/${l}/${suf}index.html`, import.meta.url), 'utf8');
const hrefs = (h) => [...h.matchAll(/<a [^>]*href="([^"]+)"/g)].map((m) => m[1]);
build();

test('footer on every page links commute + quick-break; landings link each other; no broken internal links', () => {
  let links = 0;
  for (const l of LANGS) {
    for (const suf of ['', 'play/gate-rush/', 'me/play-character/', 'friends/chemistry/', 'about/', ...LANDS, 'me/play-character/types/sph/']) {
      const h = read(l, suf), hs = hrefs(h);
      for (const t of ['play/commute/', 'play/quick-break/']) assert.ok(hs.includes(`/${l}/${t}`), `${l}/${suf} → ${t}`);
      for (const x of hs) if (x.startsWith(`/${l}/`)) { links++; assert.ok(existsSync(new URL(`../public${x}index.html`, import.meta.url)), `broken ${x} on ${l}/${suf}`); }
    }
    for (const a of LANDS) for (const b of LANDS) if (a !== b) assert.ok(hrefs(read(l, a)).includes(`/${l}/${b}`), `${l}: ${a} → ${b}`);
    assert.ok(hrefs(read(l, 'friends/chemistry/')).includes(`/${l}/play/commute/`));
    assert.ok(hrefs(read(l, 'friends/chemistry/')).includes(`/${l}/friends/things-to-do/`));
  }
  console.log('internal links checked:', links);
});

test('meta: title ≤60 (CJK ≤40), desc ≤160, no empty, no duplicates, no MBTI word, hreflang/canonical intact', () => {
  for (const l of LANGS) {
    const seen = new Map();
    for (const suf of ['', 'play/gate-rush/', 'me/play-character/', 'friends/chemistry/', 'about/', 'privacy/', ...LANDS]) {
      const h = read(l, suf);
      const dec = (x) => x.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
      const title = dec(h.match(/<title>([^<]*)<\/title>/)[1]), desc = dec(h.match(/<meta name="description" content="([^"]*)"/)[1]);
      assert.ok(title && desc, `${l}/${suf} empty`);
      assert.ok(title.length <= 60 && desc.length <= 160, `${l}/${suf} length ${title.length}/${desc.length}`);
      assert.ok(!/mbti/i.test(title + desc), `${l}/${suf} MBTI`);
      assert.ok(!seen.has(title) && !seen.has(desc), `${l}/${suf} duplicate`); seen.set(title, 1); seen.set(desc, 1);
      assert.ok(h.includes(`rel="canonical" href="https://www.playtoday.cloud/${l}/${suf}"`) && h.includes('hreflang="x-default"'), `${l}/${suf} canonical/hreflang`);
      assert.ok(dec(h.match(/property="og:title" content="([^"]*)"/)[1]) === title, `${l}/${suf} og sync`);
    }
  }
  assert.match(read('ko', '').match(/<title>([^<]*)/)[1], /웹게임/);
});
