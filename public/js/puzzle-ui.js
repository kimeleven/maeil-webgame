// 오늘의 퍼즐 공통 UI 도구 (t_49b0ed25): 저장소(pz.v1)·날짜(?date= 시험용 덮어쓰기)·공유 복사·타이머.
import { kstDate, fmtTime } from '/js/puzzle-core.js';
export const $ = (s, r = document) => r.querySelector(s);
const qs = new URLSearchParams(location.search);
export const override = /^\d{4}-\d{2}-\d{2}$/.test(qs.get('date') || '') ? qs.get('date') : '';
export const today = override || kstDate();
export const param = (k) => qs.get(k);
const KEY = 'pz.v1';
export const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
export const save = (o) => { if (override) return; try { localStorage.setItem(KEY, JSON.stringify(o)); } catch {} };
// 결과 공유 (t_84bd69d4): navigator.share({title,text,url}) → 클립보드 → 선택복사 순 폴백. 문구 '내 기록 X, 넘어볼래?'. 자발 공유만.
export function beatLine(record) { const r = String(record || '').trim(); return r ? `내 기록 ${r}, 넘어볼래?` : '내 기록 넘어볼래?'; }
export async function copyText(btn, ta, record) {
  const url = location.origin + location.pathname, line = beatLine(record ?? (btn.closest('.card')?.querySelector('[id$="-result"]')?.textContent));
  const t = ta.value.includes('넘어볼래') ? ta.value : `${ta.value}\n${line}`;
  const full = t.includes(url) ? t : `${t}\n${url}`;
  try {
    if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) await navigator.share({ title: document.title, text: t, url });
    else await navigator.clipboard.writeText(full);
    btn.textContent = '복사됨 ✓';
  } catch (e) {
    if (e && e.name === 'AbortError') return;
    ta.select(); try { document.execCommand('copy'); btn.textContent = '복사됨 ✓'; } catch {}
  }
}
export function timer(el) {
  let elapsed = 0, ts = 0, id = 0;
  const now = () => elapsed + (ts ? Math.floor((Date.now() - ts) / 1000) : 0);
  const draw = () => { if (el) el.textContent = fmtTime(now()); };
  return { now, draw, set(v) { elapsed = v; ts = 0; clearInterval(id); draw(); },
    start() { if (ts) return; ts = Date.now(); clearInterval(id); id = setInterval(draw, 500); },
    stop() { if (ts) { elapsed = now(); ts = 0; } clearInterval(id); draw(); } };
}

