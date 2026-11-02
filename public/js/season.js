// Season copy windows (KST). Home hero shows spans whose [from, until) contains now.
export const SEASON1_END = Date.parse('2026-11-13T00:00:00+09:00'); // 1794495600000, after the exam
export const SEASON2_END = Date.parse('2026-12-01T00:00:00+09:00'); // 1796050800000
export const inWindow = (now, from, until) => now >= from && now < until;
export function applySeason(root = document, now = Date.now()) {
  root.querySelectorAll('[data-from][data-until]').forEach((el) => { el.hidden = !inWindow(now, +el.dataset.from, +el.dataset.until); });
}
if (typeof document !== 'undefined') applySeason(document, Date.now());
