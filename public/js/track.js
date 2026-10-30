// Anonymous funnel events (Vercel Web Analytics custom events). No cookies, no ids, no result content or seeds.
// Only whitelisted, bucketed props are ever passed. Safe no-op if analytics is not enabled.
export const EVENTS = ['play_start', 'play_end', 'share_click', 'challenge_copy', 'challenge_land', 'quiz_start', 'quiz_done', 'invite_land', 'chem_done', 'result_land', 'share_result', 'share_cta_click', 'internal_link'];
const w = typeof window !== 'undefined' ? window : null;
const local = !w || /^(localhost|127\.0\.0\.1)$/.test(location.hostname);

if (w && !w.__trackInit) {
  w.__trackInit = true;
  w.va = w.va || function () { (w.vaq = w.vaq || []).push(arguments); };
  if (!local) { const s = document.createElement('script'); s.defer = true; s.src = '/_vercel/insights/script.js'; document.head.append(s); }
}

export const stageBucket = (n) => (n <= 3 ? '1-3' : n <= 7 ? '4-7' : '8+');

// props: only short enum-like strings are forwarded
export function track(name, props) {
  if (!EVENTS.includes(name) || !w) return;
  const clean = {};
  for (const [k, v] of Object.entries(props || {})) if (typeof v === 'string' && v.length <= 12) clean[k] = v;
  (w.__trackLog = w.__trackLog || []).push(name);
  try { w.va('event', Object.keys(clean).length ? { name, data: clean } : { name }); } catch {}
}

// internal_link (1029-21): fixed-enum click measurement for internal navigation. No URL, id or cookie is sent.
const TO = { 'play/gate-rush': 'gate-rush', 'play/commute': 'commute', 'play/quick-break': 'quick-break', 'play/magnet-harbor': 'magnet', 'me/play-character': 'char', 'friends/chemistry': 'chem', 'friends/things-to-do': 'todo' };
const FROM = { play: 'game', me: 'char', friends: 'chem', c: 'c' };
export function linkInfo(path, href) {
  const seg = String(href || '').split(/[?#]/)[0].split('/').filter(Boolean);
  const to = seg.length >= 3 ? TO[seg[1] + '/' + seg[2]] : null;
  const f = String(path || '').split('/').filter(Boolean);
  const from = f.length <= 1 ? 'home' : (FROM[f[1]] || null);
  return to && from ? { to, from } : null;
}
if (w && !w.__trackLinkInit) {
  w.__trackLinkInit = true;
  document.addEventListener('click', (e) => {
    const a = e.target && e.target.closest && e.target.closest('a[href^="/"]');
    if (!a || a.closest('.langs') || a.hasAttribute('data-daily')) return;
    const info = linkInfo(location.pathname, a.getAttribute('href'));
    if (info) track('internal_link', info);
  });
}
