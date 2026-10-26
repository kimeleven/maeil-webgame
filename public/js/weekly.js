// "이번 주 신작" 추천 슬롯. /data/weekly.json 이 비었거나 시작일 전이거나 링크가 200 이 아니면 null (화면 변화 0).
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const todayKst = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);

export async function weeklyPick(lang, fetcher = fetch) {
  try {
    const r = await fetcher('/data/weekly.json'); if (!r.ok) return null;
    const items = ((await r.json()).items || []).filter((x) => x && x.path && x.since && x.since <= todayKst() && x.name && x.name[lang]);
    for (const it of items.sort((a, b) => (a.since < b.since ? 1 : -1))) {
      const href = String(it.path).replace('{lang}', lang);
      if (!href.startsWith('/')) continue;
      try { const h = await fetcher(href, { method: 'HEAD' }); if (!h.ok) continue; } catch { continue; }
      return { href, name: it.name[lang], desc: (it.desc && it.desc[lang]) || '' };
    }
  } catch {}
  return null;
}

export async function weeklyCard(lang) {
  const p = await weeklyPick(lang); if (!p) return null;
  const el = document.createElement('section'); el.className = 'card row weekly'; el.style.justifyContent = 'space-between';
  el.innerHTML = `<div><span class="tag">NEW</span><h3 style="margin:6px 0 0">${esc(p.name)}</h3>${p.desc ? `<p class="muted" style="margin:0">${esc(p.desc)}</p>` : ''}</div><a class="btn" href="${esc(p.href)}" data-weekly>${esc(p.name)} →</a>`;
  return el;
}
