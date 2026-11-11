// t_61344aaa: 오늘 계산기 10종 계산 규칙 시험 (GDD §4 계산 규칙 · §8 필수 시험값)
import test from 'node:test';
import assert from 'node:assert/strict';
import { percent, dateDiff, dateAdd, addMonths, dday, anniversaries, pyToM2, m2ToPy, age, wage, monthHours, vat, discount, discountRate, convert, interest, compute, todayPreview, SLUGS, round, kstToday } from '../public/js/calc-core.js';

test('percent: 4 modes', () => {
  assert.equal(percent('of', 200, 15).value, 30); // 필수
  assert.equal(percent('change', 80, 100).value, 25); // 필수
  assert.equal(percent('change', 100, 80).value, -20);
  assert.equal(percent('ratio', 30, 200).value, 15);
  assert.equal(round(percent('apply', 50000, 10).value), 55000);
  assert.equal(round(percent('apply', 50000, 10).down), 45000);
  assert.equal(percent('ratio', 1, 0), null);
  assert.equal(percent('of', '1,000', '5').value, 50);
});

test('date: diff, inclusive, leap year, month-end add', () => {
  assert.equal(dateDiff('2026-01-01', '2026-12-31', true).days, 365); // 필수
  assert.equal(dateDiff('2026-01-01', '2026-12-31', false).days, 364);
  assert.equal(dateDiff('2024-01-01', '2024-12-31', true).days, 366);
  assert.equal(dateDiff('2026-11-11', '2026-12-25', false).days, 44);
  assert.equal(addMonths('2026-01-31', 1), '2026-02-28');
  assert.equal(addMonths('2024-01-31', 1), '2024-02-29');
  assert.equal(dateAdd('2026-11-11', 100, 'day').date, '2027-02-19');
  assert.equal(dateAdd('2026-11-11', 100, 'day').wd, '금');
  const r = dateDiff('2026-01-15', '2026-03-20', false); assert.deepEqual([r.months, r.mdays], [2, 5]);
});

test('dday: D-N / D-day / D+N, anniversaries count start as day 1', () => {
  assert.equal(dday('2026-11-11', '2026-12-25').label, 'D-44');
  assert.equal(dday('2026-11-11', '2026-11-11').label, 'D-day');
  assert.equal(dday('2026-11-11', '2026-11-01').label, 'D+10');
  const a = anniversaries('2026-01-01', '2026-01-01');
  assert.equal(a.find((x) => x.label === '100일').date, '2026-04-10');
  assert.equal(a.find((x) => x.label === '1주년').date, '2027-01-01');
  assert.equal(a.find((x) => x.label === '1000일').date, '2028-09-26');
});

test('pyeong: 1평 = 400/121㎡', () => {
  assert.equal(round(m2ToPy(33)), 9.98); // 필수
  assert.equal(round(pyToM2(1), 4), 3.3058);
  assert.equal(round(pyToM2(30)), 99.17);
  assert.equal(round(m2ToPy(84)), 25.41);
  assert.equal(round(pyToM2(m2ToPy(59)), 6), 59);
});

test('age: 만 나이, 2/29 생, 띠, 다음 생일', () => {
  assert.equal(age('2000-02-29', '2026-11-11').man, 26); // 필수
  assert.equal(age('2000-02-29', '2027-02-28').man, 26); // 평년은 3/1 기준
  assert.equal(age('2000-02-29', '2027-03-01').man, 27);
  assert.equal(age('1990-12-01', '2026-11-11').man, 35);
  assert.equal(age('1990-12-01', '2026-11-11').year, 36);
  assert.equal(age('1990-12-01', '2026-11-11').zodiac, '말');
  assert.equal(age('2000-01-01', '2026-11-11').zodiac, '용');
  assert.equal(age('1990-12-01', '2026-11-11').toNext, 20);
  assert.equal(age('2027-01-01', '2026-11-11'), null);
});

test('wage: 209h 기준', () => {
  assert.equal(monthHours(40), 209);
  assert.equal(wage(10320, 40, true).monthly, 2156880); // 필수
  assert.equal(wage(10320, 40, true).annual, 25882560);
  assert.equal(monthHours(40, false), 174);
  assert.equal(monthHours(10, true), 43); // 15시간 미만 주휴 없음
  assert.equal(wage(9000, 40).belowMin, true);
});

test('vat: 역산·정산', () => {
  assert.deepEqual(vat('total', 11000), { supply: 10000, tax: 1000, total: 11000 }); // 필수
  assert.deepEqual(vat('supply', 10000), { supply: 10000, tax: 1000, total: 11000 });
  assert.deepEqual(vat('total', 10000), { supply: 9091, tax: 909, total: 10000 });
  assert.deepEqual(vat('supply', 12345), { supply: 12345, tax: 1234, total: 13579 });
  assert.equal(vat('total', -1), null);
});

test('discount: 중복 할인·역산', () => {
  assert.equal(discount(10000, [20, 10]).sale, 7200); // 필수
  assert.equal(discount(10000, [20, 10]).rate, 28);
  assert.equal(discount(39900, 30).sale, 27930);
  assert.equal(discountRate(10000, 7500).rate, 25);
  assert.equal(discount(10000, 120), null);
});

test('unit: 길이·무게·넓이·온도·부피', () => {
  assert.equal(round(convert('length', 'in', 'cm', 1), 2), 2.54);
  assert.equal(round(convert('weight', 'lb', 'kg', 1), 4), 0.4536);
  assert.equal(round(convert('area', 'py', 'm2', 1), 4), 3.3058);
  assert.equal(convert('temp', 'F', 'C', 212), 100);
  assert.equal(round(convert('temp', 'C', 'K', 0), 2), 273.15);
  assert.equal(round(convert('volume', 'gal', 'L', 1), 3), 3.785);
  assert.equal(convert('length', 'xx', 'm', 1), null);
});

test('interest: 적금 단리 공식·과세 절사·예금', () => {
  const s = interest('savings', 100000, 12, 3, 'simple', 'normal'); // 100000×78×0.0025 = 19500
  assert.equal(s.gross, 19500); assert.equal(s.tax, 3003); assert.equal(s.net, 16497); assert.equal(s.total, 1216497);
  assert.equal(interest('savings', 100000, 12, 3, 'simple', 'none').tax, 0);
  assert.equal(interest('deposit', 10000000, 12, 3.5, 'simple').gross, 350000);
  assert.equal(interest('deposit', 10000000, 12, 3.5, 'simple').tax, 53900);
  assert.equal(interest('deposit', 10000000, 12, 3, 'monthly').gross, 304159);
  assert.equal(interest('savings', 100000, 0, 3), null);
});

test('compute: every slug renders default values and today preview is KST', () => {
  for (const s of SLUGS) { const r = compute(s, {}, '2026-11-11'); assert.ok(r && r.main && r.formula, s); }
  assert.equal(compute('percent', { m: 'of', a: '200', b: '15' }).main, '30');
  assert.equal(compute('vat', { m: 'total', x: '11000' }).lines[1][1], '1,000원');
  const p = todayPreview('2026-11-11');
  assert.equal(p.date, '오늘은 2026-11-11 (수)'); assert.equal(p.age, '올해 남은 날 50일'); assert.equal(p.dday, '크리스마스 D-44');
  assert.equal(kstToday(Date.parse('2026-11-11T15:30:00Z')), '2026-11-12');
});

test('t_54d54a22 D2: 날짜 더하기 범위 밖은 null(오류 없이)', () => {
  assert.equal(dateAdd('2026-11-11', 99999999, 'year'), null);
  assert.equal(dateAdd('2026-11-11', 99999999, 'day'), null);
  assert.equal(compute('date', { m: 'add', s: '2026-11-11', n: '99999999', u: 'year' }, '2026-11-11'), null);
  assert.equal(dateAdd('2026-11-11', 1, 'year').date, '2027-11-11');
});
