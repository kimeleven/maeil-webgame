// 오늘 계산기 10종 순수 계산 (t_61344aaa). 브라우저(ESM)·빌드·시험에서 같이 쓴다. DOM 없음.
// 해마다 바뀌는 값은 RATES 한 곳에만 둔다 (빌드가 /calc/rates.json 으로도 내보낸다).
export const RATES = {
  minWage: { year: 2026, hourly: 10320, source: '고용노동부 2026년 적용 최저임금 고시', asOf: '2026-01-01' },
  vat: { rate: 0.1, source: '부가가치세법 제30조(세율 10%)', asOf: '2026-01-01' },
  interestTax: { normal: 0.154, source: '소득세 14% + 지방소득세 1.4%', asOf: '2026-01-01' },
};
export const SLUGS = ['percent', 'date', 'dday', 'pyeong', 'age', 'wage', 'vat', 'discount', 'unit', 'interest'];

// ---------- 공통 ----------
export const num = (v) => { if (typeof v === 'number') return v; const s = String(v ?? '').replace(/[,\s원%]/g, ''); if (s === '' || s === '-' || s === '.') return NaN; return Number(s); };
export const ok = (...xs) => xs.every((x) => Number.isFinite(x));
export const round = (x, d = 2) => { const p = 10 ** d; return Math.round((x + Math.sign(x) * Number.EPSILON) * p) / p; };
export function fmt(x, d = 2) { if (!Number.isFinite(x)) return '-'; const r = round(x, d); return r.toLocaleString('ko-KR', { maximumFractionDigits: d }); }
export const won = (x) => `${Math.trunc(x).toLocaleString('ko-KR')}원`;
export function kstToday(now = Date.now()) { return new Date(now + 9 * 3600e3).toISOString().slice(0, 10); }
const D = /^(\d{4})-(\d{2})-(\d{2})$/;
export function parseDate(s) { const m = D.exec(String(s || '')); if (!m) return null; const t = Date.UTC(+m[1], +m[2] - 1, +m[3]); const d = new Date(t); return d.getUTCDate() === +m[3] && d.getUTCMonth() === +m[2] - 1 ? t : null; }
const iso = (t) => new Date(t).toISOString().slice(0, 10);
const WD = ['일', '월', '화', '수', '목', '금', '토'];
export const weekday = (s) => { const t = parseDate(s); return t == null ? '' : WD[new Date(t).getUTCDay()]; };
export const withWd = (s) => `${s} (${weekday(s)})`;
export const daysBetween = (a, b) => Math.round((parseDate(b) - parseDate(a)) / 86400e3);
export const addDays = (s, n) => iso(parseDate(s) + n * 86400e3);
const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
const mdays = (y, m) => [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m];
// 개월 더하기: 말일 보정 (1/31 + 1개월 = 2/28 또는 2/29)
export function addMonths(s, n) {
  const d = new Date(parseDate(s)); let y = d.getUTCFullYear(), m = d.getUTCMonth() + n; const day = d.getUTCDate();
  y += Math.floor(m / 12); m = ((m % 12) + 12) % 12;
  return iso(Date.UTC(y, m, Math.min(day, mdays(y, m))));
}
// a→b 를 '개월 + 일' 로 (a<=b)
export function monthsDays(a, b) {
  let lo = 0, hi = 12 * 300;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (parseDate(addMonths(a, mid)) <= parseDate(b)) lo = mid; else hi = mid - 1; }
  return { months: lo, days: daysBetween(addMonths(a, lo), b) };
}

// ---------- 1. 퍼센트 ----------
export function percent(mode, a, b) {
  a = num(a); b = num(b); if (!ok(a, b)) return null;
  if (mode === 'of') return { value: (a * b) / 100, text: `${fmt(a)}의 ${fmt(b)}% = ${fmt((a * b) / 100, 4)}` };
  if (mode === 'ratio') { if (b === 0) return null; const v = (a / b) * 100; return { value: v, text: `${fmt(a)}은(는) ${fmt(b)}의 ${fmt(v, 4)}%` }; }
  if (mode === 'change') { if (a === 0) return null; const v = ((b - a) / Math.abs(a)) * 100; return { value: v, text: `${fmt(a)} → ${fmt(b)} : ${v >= 0 ? '+' : ''}${fmt(v, 4)}% ${v >= 0 ? '증가' : '감소'}` }; }
  if (mode === 'apply') { const up = a * (1 + b / 100), down = a * (1 - b / 100); return { value: up, down, text: `${fmt(a)}에서 ${fmt(b)}% 증가 = ${fmt(up, 4)} / 감소 = ${fmt(down, 4)}` }; }
  return null;
}

// ---------- 2. 날짜 ----------
export function dateDiff(a, b, inclusive) {
  if (parseDate(a) == null || parseDate(b) == null) return null;
  const neg = parseDate(b) < parseDate(a); const [x, y] = neg ? [b, a] : [a, b];
  const days = daysBetween(x, y) + (inclusive ? 1 : 0);
  const md = monthsDays(x, inclusive ? addDays(y, 1) : y);
  return { days: neg ? -days : days, weeks: Math.floor(days / 7), rest: days % 7, months: md.months, mdays: md.days };
}
export function dateAdd(base, n, unit) {
  n = num(n); if (parseDate(base) == null || !Number.isInteger(n)) return null;
  const out = unit === 'month' ? addMonths(base, n) : unit === 'year' ? addMonths(base, n * 12) : addDays(base, unit === 'week' ? n * 7 : n);
  return { date: out, wd: weekday(out) };
}

// ---------- 3. D-day ----------
export function dday(base, target) {
  if (parseDate(base) == null || parseDate(target) == null) return null;
  const n = daysBetween(base, target);
  return { n, label: n > 0 ? `D-${n}` : n === 0 ? 'D-day' : `D+${-n}` };
}
// 기념일: 시작일을 1일로 센다 (사귄 날 = 1일 → 100일 = 시작일 + 99일)
export const ANNIV = [100, 200, 300, 365, 500, 1000, 2000, 3000];
export function anniversaries(start, today) {
  if (parseDate(start) == null) return null;
  return ANNIV.map((d) => { const date = d === 365 ? addMonths(start, 12) : addDays(start, d - 1); return { label: d === 365 ? '1주년' : `${d}일`, date, wd: weekday(date), left: today ? daysBetween(today, date) : null }; });
}
export const dayCount = (start, today) => (parseDate(start) == null || parseDate(today) == null ? null : daysBetween(start, today) + 1);

// ---------- 4. 평수 ----------
export const M2_PER_PY = 400 / 121; // 1평 = 3.3058㎡
export const pyToM2 = (p) => num(p) * M2_PER_PY;
export const m2ToPy = (m) => num(m) / M2_PER_PY;

// ---------- 5. 만 나이 ----------
const ZODIAC = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지'];
export const zodiac = (y) => ZODIAC[(((y - 4) % 12) + 12) % 12];
// 2/29 생은 평년에 3/1 을 생일로 본다 (민법 관행)
function birthdayIn(birth, y) { const [, m, d] = birth.split('-').map(Number); if (m === 2 && d === 29 && !isLeap(y)) return `${y}-03-01`; return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`; }
export function age(birth, ref) {
  const tb = parseDate(birth), tr = parseDate(ref); if (tb == null || tr == null || tr < tb) return null;
  const by = +birth.slice(0, 4), ry = +ref.slice(0, 4);
  const had = parseDate(birthdayIn(birth, ry)) <= tr;
  const man = ry - by - (had ? 0 : 1);
  const next = birthdayIn(birth, had ? ry + 1 : ry);
  const nb = daysBetween(ref, next);
  return { man, year: ry - by, zodiac: zodiac(by), next, toNext: nb };
}

// ---------- 6. 시급 ----------
// 주휴시간 = 주 15시간 이상일 때 주 근로시간/40×8 (최대 8). 월 환산 = (주 근로 + 주휴) × 365/7/12, 반올림 (40시간 → 209)
export function monthHours(weekly, holiday = true) {
  weekly = num(weekly); if (!ok(weekly) || weekly <= 0) return NaN;
  const hol = holiday && weekly >= 15 ? Math.min(8, (weekly / 40) * 8) : 0;
  return Math.round(((weekly + hol) * 365) / 7 / 12);
}
export function wage(hourly, weekly = 40, holiday = true) {
  hourly = num(hourly); const h = monthHours(weekly, holiday); if (!ok(hourly, h)) return null;
  const monthly = Math.round(hourly * h);
  return { hours: h, monthly, annual: monthly * 12, belowMin: hourly < RATES.minWage.hourly };
}

// ---------- 7. 부가세 ----------
export function vat(mode, amount) {
  const a = num(amount); if (!ok(a) || a < 0) return null; const r = RATES.vat.rate;
  if (mode === 'supply') { const supply = Math.trunc(a), tax = Math.floor(supply * r); return { supply, tax, total: supply + tax }; }
  const total = Math.trunc(a), supply = Math.round(total / (1 + r)); return { supply, tax: total - supply, total };
}

// ---------- 8. 할인율 ----------
export function discount(price, rates) {
  price = num(price); const rs = (Array.isArray(rates) ? rates : [rates]).map(num).filter((x) => Number.isFinite(x));
  if (!ok(price) || !rs.length || rs.some((x) => x < 0 || x > 100)) return null;
  const k = rs.reduce((p, x) => p * (1 - x / 100), 1); const sale = Math.round(price * k);
  return { sale, off: price - sale, rate: round((1 - k) * 100, 4) };
}
export function discountRate(price, sale) {
  price = num(price); sale = num(sale); if (!ok(price, sale) || price <= 0) return null;
  return { rate: round(((price - sale) / price) * 100, 2), off: price - sale };
}

// ---------- 9. 단위 ----------
export const UNITS = {
  length: { name: '길이', base: 'm', u: { mm: ['밀리미터', 0.001], cm: ['센티미터', 0.01], m: ['미터', 1], km: ['킬로미터', 1000], in: ['인치', 0.0254], ft: ['피트', 0.3048], yd: ['야드', 0.9144], mi: ['마일', 1609.344], ja: ['자(척)', 10 / 33] } },
  weight: { name: '무게', base: 'kg', u: { g: ['그램', 0.001], kg: ['킬로그램', 1], t: ['톤', 1000], oz: ['온스', 0.028349523125], lb: ['파운드', 0.45359237], geun: ['근(600g)', 0.6], don: ['돈(3.75g)', 0.00375] } },
  area: { name: '넓이', base: 'm2', u: { m2: ['제곱미터(㎡)', 1], py: ['평', 400 / 121], km2: ['제곱킬로미터', 1e6], ha: ['헥타르', 1e4], a: ['아르', 100], ft2: ['제곱피트', 0.09290304], ac: ['에이커', 4046.8564224] } },
  temp: { name: '온도', base: 'C', u: { C: ['섭씨(℃)'], F: ['화씨(℉)'], K: ['켈빈(K)'] } },
  volume: { name: '부피', base: 'L', u: { ml: ['밀리리터', 0.001], L: ['리터', 1], m3: ['세제곱미터', 1000], gal: ['미국 갤런', 3.785411784], floz: ['미국 액량온스', 0.0295735295625], cup: ['컵(200ml)', 0.2], doe: ['되(1.8L)', 1.8] } },
};
export function convert(cat, from, to, v) {
  v = num(v); const c = UNITS[cat]; if (!c || !c.u[from] || !c.u[to] || !ok(v)) return null;
  if (cat === 'temp') { const C = from === 'C' ? v : from === 'F' ? ((v - 32) * 5) / 9 : v - 273.15; return to === 'C' ? C : to === 'F' ? (C * 9) / 5 + 32 : C + 273.15; }
  return (v * c.u[from][1]) / c.u[to][1];
}

// ---------- 10. 이자 ----------
// kind: deposit(예금, 원금 일시) | savings(적금, 매월 납입). method: simple | monthly(월복리). 이자·세금 원 미만 절사.
export function interest(kind, amount, months, ratePct, method = 'simple', tax = 'normal') {
  const P = num(amount), n = num(months), r = num(ratePct) / 100; if (!ok(P, n, r) || P < 0 || n <= 0 || !Number.isInteger(n) || r < 0) return null;
  const i = r / 12; let principal, gross;
  if (kind === 'deposit') { principal = P; gross = method === 'monthly' ? P * ((1 + i) ** n - 1) : P * r * (n / 12); }
  else { principal = P * n; gross = method === 'monthly' ? Array.from({ length: n }, (_, k) => P * ((1 + i) ** (n - k) - 1)).reduce((a, b) => a + b, 0) : (P * (n * (n + 1)) / 2) * i; }
  gross = Math.floor(gross + 1e-6); const t = tax === 'none' ? 0 : Math.floor(gross * RATES.interestTax.normal);
  return { principal, gross, tax: t, net: gross - t, total: principal + gross - t };
}

// ---------- 페이지 공통: slug + 입력값(문자열 맵) → 결과 줄 ----------
// 반환 { main, lines:[[라벨,값]], formula, mode } | null. UI·빌드(SSR 미리보기)·시험이 함께 쓴다.
export function compute(slug, v, today = kstToday()) {
  const g = (k, d = '') => (v[k] == null || v[k] === '' ? d : String(v[k]));
  switch (slug) {
    case 'percent': {
      const mode = g('m', 'of'), r = percent(mode, g('a', '200'), g('b', '15')); if (!r) return null;
      const main = mode === 'ratio' || mode === 'change' ? `${r.value >= 0 && mode === 'change' ? '+' : ''}${fmt(r.value, 4)}%` : fmt(r.value, 4);
      return { mode, main, lines: mode === 'apply' ? [['증가', fmt(r.value, 4)], ['감소', fmt(r.down, 4)]] : [], formula: r.text };
    }
    case 'date': {
      const mode = g('m', 'diff');
      if (mode === 'add') { const base = g('s', today), r = dateAdd(base, g('n', '100'), g('u', 'day')); if (!r) return null; return { mode, main: withWd(r.date), lines: [['기준일', withWd(base)]], formula: `${base} ${num(g('n', '100')) >= 0 ? '+' : ''}${g('n', '100')}${{ day: '일', week: '주', month: '개월', year: '년' }[g('u', 'day')] || '일'} = ${r.date}` }; }
      const a = g('s', today), b = g('e', today), inc = g('i') === '1', r = dateDiff(a, b, inc); if (!r) return null;
      return { mode, main: `${r.days.toLocaleString('ko-KR')}일`, lines: [['주+일', `${r.weeks}주 ${r.rest}일`], ['개월+일', `${r.months}개월 ${r.mdays}일`], ['시작', withWd(a)], ['끝', withWd(b)]], formula: `${a} ~ ${b}${inc ? ' (첫날 포함)' : ''}` };
    }
    case 'dday': {
      const mode = g('m', 'dday');
      if (mode === 'anniv') { const s = g('s', today), list = anniversaries(s, today); if (!list) return null; const n = dayCount(s, today); return { mode, main: n > 0 ? `오늘 ${n.toLocaleString('ko-KR')}일째` : `시작까지 ${1 - n}일`, lines: list.map((x) => [x.label, `${withWd(x.date)} ${x.left > 0 ? `D-${x.left}` : x.left === 0 ? 'D-day' : '지남'}`]), formula: `${s}을 1일로 세요` }; }
      const base = g('s', today), t = g('e', `${today.slice(0, 4)}-12-25`), r = dday(base, t); if (!r) return null;
      return { mode, main: r.label, lines: [['기준일', withWd(base)], ['목표일', withWd(t)]], formula: `${t} - ${base} = ${r.n}일` };
    }
    case 'pyeong': {
      const mode = g('m', 'py');
      if (mode === 'm2') { const m = num(g('x', '84')); if (!ok(m)) return null; return { mode, main: `${fmt(m2ToPy(m))}평`, lines: [], formula: `${fmt(m)}㎡ × 121 ÷ 400 = ${fmt(m2ToPy(m))}평` }; }
      const p = num(g('x', '30')); if (!ok(p)) return null; return { mode, main: `${fmt(pyToM2(p))}㎡`, lines: [], formula: `${fmt(p)}평 × 400 ÷ 121 = ${fmt(pyToM2(p))}㎡` };
    }
    case 'age': {
      const b = g('b', '2000-01-01'), ref = g('r', today), r = age(b, ref); if (!r) return null;
      return { mode: 'age', main: `만 ${r.man}세`, lines: [['연 나이', `${r.year}세`], ['띠', `${r.zodiac}띠`], ['다음 생일', `${withWd(r.next)} D-${r.toNext}`]], formula: `${ref} 기준, 올해 생일 ${r.man === r.year ? '지남' : '전'}` };
    }
    case 'wage': {
      const h = g('h', String(RATES.minWage.hourly)), w = g('w', '40'), hol = g('j', '1') === '1', r = wage(h, w, hol); if (!r) return null;
      return { mode: hol ? 'holiday' : 'plain', main: won(r.monthly), lines: [['월 환산 시간', `${r.hours}시간`], ['연봉(×12)', won(r.annual)], ...(r.belowMin ? [['주의', `${RATES.minWage.year} 최저시급 ${won(RATES.minWage.hourly)}보다 낮아요`]] : [])], formula: `${won(num(h))} × ${r.hours}시간 = ${won(r.monthly)}` };
    }
    case 'vat': {
      const mode = g('m', 'total'), r = vat(mode, g('x', '11000')); if (!r) return null;
      return { mode, main: mode === 'supply' ? won(r.total) : won(r.supply), lines: [['공급가액', won(r.supply)], ['부가세(10%)', won(r.tax)], ['합계', won(r.total)]], formula: mode === 'supply' ? `${won(r.supply)} × 10% = ${won(r.tax)} (원 미만 버림)` : `${won(r.total)} ÷ 1.1 = ${won(r.supply)} (반올림), 부가세 = 합계 - 공급가` };
    }
    case 'discount': {
      const mode = g('m', 'rate'), p = g('p', '10000');
      if (mode === 'sale') { const r = discountRate(p, g('s', '7500')); if (!r) return null; return { mode, main: `${fmt(r.rate)}% 할인`, lines: [['할인액', won(r.off)]], formula: `(${won(num(p))} - ${won(num(g('s', '7500')))}) ÷ ${won(num(p))}` }; }
      const rs = [g('r', '20'), g('r2', '')].filter((x) => x !== ''), r = discount(p, rs); if (!r) return null;
      return { mode, main: won(r.sale), lines: [['할인액', won(r.off)], ['실제 할인율', `${fmt(r.rate)}%`]], formula: `${won(num(p))} × ${rs.map((x) => `(1 - ${x}%)`).join(' × ')} = ${won(r.sale)}` };
    }
    case 'unit': {
      const c = g('c', 'length'), cat = UNITS[c]; if (!cat) return null; const keys = Object.keys(cat.u);
      const f = cat.u[g('f')] ? g('f') : keys[c === 'temp' ? 0 : 2], t = cat.u[g('t')] ? g('t') : keys[c === 'temp' ? 1 : 4], x = g('x', '1'), r = convert(c, f, t, x); if (r == null) return null;
      return { mode: c, main: `${fmt(r, 4)} ${cat.u[t][0]}`, lines: keys.filter((k) => k !== f).map((k) => [cat.u[k][0], fmt(convert(c, f, k, x), 4)]), formula: `${fmt(num(x), 4)} ${cat.u[f][0]} = ${fmt(r, 4)} ${cat.u[t][0]}` };
    }
    case 'interest': {
      const kind = g('k', 'savings'), meth = g('q', 'simple'), r = interest(kind, g('p', '300000'), g('n', '12'), g('r', '3.5'), meth, g('t', 'normal')); if (!r) return null;
      return { mode: kind, main: won(r.total), lines: [['원금 합계', won(r.principal)], ['세전 이자', won(r.gross)], ['이자 과세', won(r.tax)], ['세후 이자', won(r.net)]], formula: `${kind === 'deposit' ? '예금' : '적금'} ${meth === 'monthly' ? '월복리' : '단리'} 연 ${g('r', '3.5')}%, ${g('n', '12')}개월, ${g('t', 'normal') === 'none' ? '비과세' : '일반과세 15.4%'}` };
    }
  }
  return null;
}

// 홈 '오늘 계산기' 카드 미리보기 한 줄
export function todayPreview(today = kstToday()) {
  const y = today.slice(0, 4), xmas = `${y}-12-25`, n = daysBetween(today, xmas);
  return { percent: '할인·증감률 바로 계산', date: `오늘은 ${withWd(today)}`, dday: n >= 0 ? `크리스마스 D-${n}`.replace('D-0', 'D-day') : `새해 D-${daysBetween(today, `${+y + 1}-01-01`)}`, age: `올해 남은 날 ${daysBetween(today, `${y}-12-31`)}일`, pyeong: '30평 = 99.17㎡', wage: `${RATES.minWage.year} 최저시급 ${RATES.minWage.hourly.toLocaleString('ko-KR')}원` };
}
