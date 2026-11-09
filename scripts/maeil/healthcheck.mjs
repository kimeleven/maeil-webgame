// 12시간 사이클 앞단 헬스체크: 6언어 홈·/ko/webgame/·sitemap(loc 128)·/api/stats(토큰 없이 401=정상) 본다.
// 사용: node scripts/maeil/healthcheck.mjs [baseUrl]   (실패 시 종료코드 1)
const LANGS = ['ko', 'en', 'ja', 'zh-hans', 'es', 'pt-br'];
export const EXPECT_LOC = 128;
export function countLoc(xml) { return (String(xml).match(/<loc>/g) || []).length; }
export function buildChecks(base) {
  const b = base.replace(/\/$/, '');
  return [
    ...LANGS.map((l) => ({ name: `home-${l}`, url: `${b}/${l}/` })),
    { name: 'ko-webgame', url: `${b}/ko/webgame/` },
    { name: 'sitemap', url: `${b}/sitemap.xml`, loc: true },
    { name: 'stats', url: `${b}/api/stats`, ok: 401 }, // 토큰 필수 API: 토큰 없이 401이 정상(살아 있고 잠김)
  ];
}
export async function run(base, fetchFn = fetch) {
  const out = [];
  for (const c of buildChecks(base)) {
    let status = 0, ok = false, note = '';
    try {
      const r = await fetchFn(c.url, { redirect: 'follow' });
      status = r.status; ok = status === (c.ok || 200);
      if (ok && c.loc) { const n = countLoc(await r.text()); note = `loc=${n}`; ok = n === EXPECT_LOC; }
    } catch (e) { note = String(e.message || e); }
    out.push({ name: c.name, status, ok, note });
  }
  return out;
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const res = await run(process.argv[2] || 'https://www.playtoday.cloud');
  for (const r of res) console.log(`${r.ok ? 'OK  ' : 'FAIL'} ${r.name} ${r.status} ${r.note}`.trim());
  const bad = res.filter((r) => !r.ok).length;
  console.log(bad ? `RESULT FAIL ${bad}/${res.length}` : `RESULT OK ${res.length}/${res.length}`);
  process.exit(bad ? 1 : 0);
}
