// Read-only OG/meta reachability check for challenge links (1121-09). Usage: node scripts/og-check.mjs [base]
const base = (process.argv[2] || 'https://www.playtoday.cloud').replace(/\/$/, '');
const LANGS = ['ko', 'en', 'ja', 'zh-hans', 'es', 'pt-br'];
const UAS = { kakao: 'kakaotalk-scrap/1.0', facebook: 'facebookexternalhit/1.1', twitter: 'Twitterbot/1.0', slack: 'Slackbot-LinkExpanding 1.0' };
const pick = (h, re) => (h.match(re) || [])[1] || '';
const attr = (h, tag, key, val, want) => { for (const m of h.matchAll(new RegExp(`<${tag}\\b[^>]*>`, 'gi'))) if (new RegExp(`${key}=["']${val}["']`, 'i').test(m[0])) return pick(m[0], new RegExp(`${want}=["']([^"']*)["']`, 'i')); return ''; };
function png(buf) { return buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47 ? [buf.readUInt32BE(16), buf.readUInt32BE(20)] : null; }
let ok = 0, total = 0; const rows = [];
for (const l of LANGS) for (const q of ['', '?vs=x']) {
  const url = `${base}/${l}/c/seed-1${q}`; total++;
  const bad = [];
  for (const [n, ua] of Object.entries(UAS)) {
    let r; try { r = await fetch(url, { headers: { 'user-agent': ua }, redirect: 'follow' }); } catch (e) { bad.push(`${n}:ERR`); continue; }
    const h = await r.text();
    if (r.status !== 200) bad.push(`${n}:${r.status}`);
    if (!attr(h, 'meta', 'property', 'og:title', 'content')) bad.push(`${n}:title`);
    if (!attr(h, 'meta', 'property', 'og:description', 'content')) bad.push(`${n}:desc`);
    if (n === 'kakao') {
      const img = attr(h, 'meta', 'property', 'og:image', 'content');
      if (!img) bad.push('image:none'); else { const ir = await fetch(img); const d = png(Buffer.from(await ir.arrayBuffer())); if (ir.status !== 200 || !d || d[0] !== 1200 || d[1] !== 630) bad.push(`image:${ir.status}:${d ? d.join('x') : 'notpng'}`); }
      // challenge shells are intentionally noindex (no canonical); language switcher carries hreflang links
      if (!/name="robots"[^>]*noindex/i.test(h)) bad.push('noindex');
      if ((h.match(/hreflang=/gi) || []).length < 6) bad.push('hreflang');
    }
  }
  if (!bad.length) ok++;
  rows.push(`| /${l}/c/seed-1${q} | ${bad.length ? 'FAIL ' + bad.join(',') : 'PASS'} |`);
}
console.log('| URL (4 UA: kakao/facebook/twitter/slack) | 결과 |\n|---|---|\n' + rows.join('\n') + `\n\n통과 ${ok}/${total}`);
process.exit(ok === total ? 0 : 1);
