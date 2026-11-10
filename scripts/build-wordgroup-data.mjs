// 단어묶음 50일치 데이터 생성 (t_49b0ed25): public/data/wordgroup-days.json
// 일마다 노랑·초록·파랑·보라 묶음 1개씩, 단어 4개씩. 같은 날 단어 중복 없음, 같은 묶음은 연달아 나오지 않음.
import { writeFileSync, mkdirSync } from 'node:fs';
import { parsePool, COLORS } from './wordgroup-pool.mjs';
import { rng } from '../public/js/puzzle-core.js';

export const START = '2026-11-18';
export const DAYS = 50;
const ROOT = new URL('..', import.meta.url).pathname;

export function buildDays() {
  const pool = parsePool();
  const r = rng('wordgroup-days-v1');
  // 색마다 묶음 순서를 섞어 14개를 돌려 쓴다 (50일 = 3바퀴+8, 바퀴마다 새로 섞기, 바퀴 경계에서 직전 묶음 반복 금지)
  const order = {};
  for (const c of COLORS) {
    let seq = [], last = -1;
    while (seq.length < DAYS) {
      const idx = [...Array(pool[c].length).keys()];
      for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
      if (idx[0] === last) idx.push(idx.shift());
      seq = seq.concat(idx); last = idx[idx.length - 1];
    }
    order[c] = seq.slice(0, DAYS);
  }
  // 같은 날 묶음끼리 단어가 하나라도 겹치면(예: 동물·십이지의 토끼) 헷갈리므로 뒤쪽 날과 맞바꿔 피한다.
  const sets = (d) => COLORS.map((c) => new Set(pool[c][order[c][d]].words));
  const clash = (d) => { const s = sets(d); for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) for (const w of s[a]) if (s[b].has(w)) return true; return false; };
  for (let d = 0; d < DAYS; d++) {
    for (let k = 1; clash(d); k++) {
      if (d + k >= DAYS) throw new Error(`day ${d}: 겹침 해소 실패`);
      for (const c of COLORS) { // 충돌 해소될 때까지 색 하나씩 뒤와 교환
        [order[c][d], order[c][d + k]] = [order[c][d + k], order[c][d]];
        if (!clash(d)) break;
        [order[c][d], order[c][d + k]] = [order[c][d + k], order[c][d]];
      }
    }
  }
  const days = [];
  for (let d = 0; d < DAYS; d++) {
    const used = new Set(), groups = [];
    for (const c of COLORS) {
      const g = pool[c][order[c][d]];
      const words = [...g.words];
      for (let i = words.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [words[i], words[j]] = [words[j], words[i]]; }
      const pick = words.filter((w) => !used.has(w)).slice(0, 4);
      if (pick.length < 4) throw new Error(`day ${d} ${g.name}: 단어 중복으로 4개 못 채움`);
      pick.forEach((w) => used.add(w));
      groups.push({ level: COLORS.indexOf(c), name: g.name, words: pick });
    }
    days.push({ n: d + 1, groups });
  }
  return days;
}
export function writeDays() {
  const days = buildDays();
  mkdirSync(`${ROOT}public/data`, { recursive: true });
  writeFileSync(`${ROOT}public/data/wordgroup-days.json`, JSON.stringify({ start: START, days }));
  return days;
}
if (import.meta.url === `file://${process.argv[1]}`) { const d = writeDays(); console.log(`wordgroup-days.json ${d.length}일`); }
