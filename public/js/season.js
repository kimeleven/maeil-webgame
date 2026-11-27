// Season copy windows (KST). Home hero shows spans whose [from, until) contains now.
export const SEASON1_END = Date.parse('2026-11-13T00:00:00+09:00'); // 1794495600000, after the exam
export const SEASON2_END = Date.parse('2026-12-01T00:00:00+09:00'); // 1796050800000
export const SEASON3_END = Date.parse('2027-01-01T00:00:00+09:00'); // 1798729200000, December window
export const inWindow = (now, from, until) => now >= from && now < until;
export function applySeason(root = document, now = Date.now()) {
  root.querySelectorAll('[data-from][data-until]').forEach((el) => { el.hidden = !inWindow(now, +el.dataset.from, +el.dataset.until); });
}
// 공유 텍스트 시즌 문구 (1127-09): 12/1~12/25(KST)에만 D-{n} 문구를 뒤에 덧붙인다. 기간 밖은 ''.
export const XMAS_SHARE_UNTIL = Date.parse('2026-12-26T00:00:00+09:00');
export function seasonShareSuffix(D, now = Date.now()) {
  const s = D && D.share && D.share.season;
  if (!s || !inWindow(now, SEASON2_END, XMAS_SHARE_UNTIL)) return '';
  const kstDay = Math.floor((now + 9 * 3600e3) / 86400e3), xmas = Math.floor(Date.parse('2026-12-25T00:00:00Z') / 86400e3);
  return ' ' + s.replace('{n}', xmas - kstDay);
}
if (typeof document !== 'undefined') applySeason(document, Date.now());
