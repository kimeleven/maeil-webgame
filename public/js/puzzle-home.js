// 홈 '오늘의 퍼즐' 카드에 연속일·오늘 기록 표시 (t_2d0c7a9f). localStorage pz.v1 만 읽는다.
import { kstDate, streakShown, fmtTime } from '/js/puzzle-core.js';
try {
  const o = JSON.parse(localStorage.getItem('pz.v1')) || {}, today = kstDate();
  for (const k of ['sudoku', 'minesweeper']) {
    const el = document.querySelector(`[data-pz="${k}"]`); if (!el) continue;
    const rec = o[k], l = rec?.last;
    el.querySelector('[data-pz-streak]').textContent = streakShown(rec, today);
    if (l && l.date === today && (k === 'sudoku' || l.win)) el.querySelector('[data-pz-last]').textContent = `⏱ ${fmtTime(l.time)}`;
  }
} catch {}
