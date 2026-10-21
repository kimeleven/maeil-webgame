// Seasonal theme switch. Halloween runs until 2026-11-01 00:00 KST, then turns itself off (no redeploy).
// ?theme=halloween forces it on, ?theme=off forces it off (QA / screenshots).
export const HALLOWEEN_END = 1793458800000; // Date.parse('2026-11-01T00:00:00+09:00')
export function isHalloween(now = Date.now(), search = typeof location !== 'undefined' ? location.search : '') {
  const q = new URLSearchParams(search).get('theme');
  if (q === 'halloween') return true;
  if (q === 'off') return false;
  return now < HALLOWEEN_END;
}
// inline <head> snippet (same rule, no module load → no flash of the normal theme)
export const HEAD_SNIPPET = `<script>(function(){try{var q=new URLSearchParams(location.search).get('theme');if(q==='halloween'||(q!=='off'&&Date.now()<${HALLOWEEN_END}))document.documentElement.classList.add('halloween')}catch(e){}})()</script>`;
