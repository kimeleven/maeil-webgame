// 오늘 계산기 10종 (t_61344aaa, 기획 workspace/maeil-arcade-local/calc/GDD.md): /calc/ 목록 + /calc/<slug>/ 정적 HTML.
// 서버 렌더 HTML 에 title·description·H1·설명·FAQ·JSON-LD(WebApplication+FAQPage+BreadcrumbList)가 다 들어 있어 JS 없이도 읽힌다.
// 계산은 public/js/calc-core.js 하나(브라우저·빌드·시험 공용). 해마다 바뀌는 값(RATES)은 /calc/rates.json 으로도 내보낸다.
import { writeFileSync, mkdirSync } from 'node:fs';
import { compute, RATES, SLUGS, UNITS } from '../public/js/calc-core.js';

const ROOT = new URL('..', import.meta.url).pathname;
const SITE = 'https://www.playtoday.cloud';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const BRAND = '오늘 계산기';
const asOf = '2026-11-11'; // 설명문 작성 기준일 (글·RATES 를 고치면 같이 올린다 → sitemap lastmod)
export const CALC_LASTMOD = asOf;

// ---------- 입력 칸 ----------
const show = (s) => (s ? ` data-show="${s}"` : '');
const seg = (def, modes) => `<input type="hidden" name="m" value="${def}"><div class="seg" role="group" aria-label="계산 방식">${modes.map(([m, t]) => `<button type="button" class="btn" data-mode="${m}" aria-pressed="${m === def}">${esc(t)}</button>`).join('')}</div>`;
const numF = (n, label, def, s, unit = '') => `<label class="fld"${show(s)}><span>${esc(label)}</span><span class="in"><input name="${n}" inputmode="decimal" autocomplete="off" value="${esc(def)}">${unit ? `<i>${esc(unit)}</i>` : ''}</span></label>`;
const dateF = (n, label, s, def = '') => `<label class="fld"${show(s)}><span>${esc(label)}</span><span class="in"><input type="date" name="${n}"${def ? ` data-def="${def}"` : ''}></span></label>`;
const dateV = (n, label, v, s) => `<label class="fld"${show(s)}><span>${esc(label)}</span><span class="in"><input type="date" name="${n}" value="${v}"></span></label>`;
const sel = (n, label, opts, def, s) => `<label class="fld"${show(s)}><span>${esc(label)}</span><span class="in"><select name="${n}">${opts.map(([v, t]) => `<option value="${v}"${v === def ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></span></label>`;
const chk = (n, label, on, s) => `<label class="chk"${show(s)}><input type="checkbox" name="${n}"${on ? ' checked' : ''}> ${esc(label)}</label>`;
const unitOpts = (c) => Object.entries(UNITS[c].u).map(([k, [t]]) => [k, t]);
const pyTable = () => `<table class="tbl"><caption>자주 쓰는 평형</caption><thead><tr><th>평</th><th>㎡</th><th>평</th><th>㎡</th></tr></thead><tbody>${[10, 15, 20, 25, 30, 35, 40, 45, 50, 60].reduce((a, p, i, arr) => (i % 2 ? a : a + `<tr><td>${p}평</td><td>${(p * 400 / 121).toFixed(2)}㎡</td><td>${arr[i + 1]}평</td><td>${(arr[i + 1] * 400 / 121).toFixed(2)}㎡</td></tr>`), '')}</tbody></table>`;

// ---------- 종목별 글 (직접 작성, 대량 생성 아님) ----------
const C = {
  percent: {
    name: '퍼센트 계산기', icon: '％', kw: '퍼센트계산기',
    title: '퍼센트 계산기 - 증감률·비율 바로 계산 | 오늘 계산기',
    desc: 'A의 B%는 얼마인지, A가 B의 몇 %인지, 증감률과 몇 % 올린 값까지 숫자만 넣으면 바로 나와요. 계산식도 같이 보여 줘요.',
    lead: '숫자를 넣는 즉시 결과가 바뀌어요. 위에서 계산 방식을 고르세요.',
    form: () => seg('of', [['of', 'A의 B%'], ['ratio', 'A는 B의 몇 %'], ['change', '증감률'], ['apply', 'B% 올리기·내리기']]) + numF('a', 'A', '200', '', '') + numF('b', 'B', '15', ''),
    how: ['A의 B% = A × B ÷ 100', 'A는 B의 몇 % = A ÷ B × 100', '증감률 = (B - A) ÷ A × 100 (A가 이전 값, B가 바뀐 값)', 'A에서 B% 증가 = A × (1 + B÷100), 감소 = A × (1 - B÷100)'],
    ex: ['200의 15%는 30이에요.', '80에서 100으로 오르면 증감률은 +25%예요. 거꾸로 100에서 80이 되면 -20%예요.', '월급 300만 원이 5% 오르면 315만 원이에요.'],
    faq: [['증감률과 퍼센트포인트는 다른가요?', '네. 금리가 3%에서 4%가 되면 1%포인트 오른 것이고, 증감률로는 약 33.3% 오른 거예요.'], ['10% 올리고 10% 내리면 원래 값인가요?', '아니요. 100을 10% 올리면 110, 다시 10% 내리면 99라서 1% 줄어요.'], ['음수도 넣을 수 있나요?', '네. 손익처럼 음수인 값도 계산돼요. 증감률은 이전 값의 절댓값을 기준으로 나눠요.'], ['소수점은 몇 자리까지 보여 주나요?', '결과는 소수 넷째 자리까지 보여 주고, 그 아래는 반올림해요.']],
    rel: ['discount', 'vat', 'interest'],
  },
  date: {
    name: '날짜 계산기', icon: '📅', kw: '날짜계산기',
    title: '날짜 계산기 - 두 날짜 사이 일수·며칠 뒤 날짜 | 오늘 계산기',
    desc: '두 날짜 사이가 며칠인지(첫날 포함 선택), 몇 주·몇 개월인지, 오늘부터 100일 뒤가 언제이고 무슨 요일인지 바로 계산해요.',
    lead: '기본값은 오늘(한국 시간)이에요. 날짜를 바꾸면 바로 다시 계산돼요.',
    form: () => seg('diff', [['diff', '날짜 사이 일수'], ['add', '며칠 뒤·전']]) + dateF('s', '시작일(기준일)', '') + dateF('e', '종료일', 'diff', 'xmas') + chk('i', '첫날 포함 (+1일)', false, 'diff') + numF('n', '더할 수 (빼려면 -)', '100', 'add') + sel('u', '단위', [['day', '일'], ['week', '주'], ['month', '개월'], ['year', '년']], 'day', 'add'),
    how: ['일수 = 종료일 - 시작일. 첫날 포함이면 1일을 더해요.', '윤년(2월 29일)을 반영해요.', '개월 더하기는 말일을 맞춰요. 1월 31일 + 1개월 = 2월 28일(윤년은 29일).'],
    ex: ['2026년 1월 1일부터 12월 31일까지는 첫날 포함 365일이에요.', '2026년 11월 11일부터 100일 뒤는 2027년 2월 19일(금)이에요.', '1월 15일부터 3월 20일까지는 2개월 5일이에요.'],
    faq: [['첫날 포함은 언제 켜나요?', '근무일·투약일처럼 시작한 날도 하루로 세면 켜세요. 단순히 날짜 간격만 보려면 끄면 돼요.'], ['시간대는 어떻게 되나요?', '한국 시간(KST) 날짜 기준이에요. 시·분은 따지지 않아요.'], ['과거 날짜도 되나요?', '네. 종료일이 시작일보다 앞이면 음수 일수로 보여 줘요.']],
    rel: ['dday', 'age', 'wage'],
  },
  dday: {
    name: 'D-day 계산기', icon: '⏳', kw: '디데이계산기',
    title: 'D-day 계산기 - 디데이·100일·1000일 기념일 | 오늘 계산기',
    desc: '목표일까지 D-며칠인지, 지난 날은 D+며칠인지 바로 보여 줘요. 사귄 날을 넣으면 100일·200일·1주년·1000일 날짜와 요일도 나와요.',
    lead: '시험·여행·기념일까지 며칠 남았는지 확인하세요. 기본 목표일은 올해 크리스마스예요.',
    form: () => seg('dday', [['dday', 'D-day'], ['anniv', '기념일 (100일·1000일)']]) + dateF('s', '기준일 / 시작한 날', '') + dateF('e', '목표일', 'dday', 'xmas'),
    how: ['D-N = 목표일 - 기준일. 목표일이 지나면 D+N이에요.', '기념일은 시작한 날을 1일로 세요. 그래서 100일 = 시작일 + 99일이에요.', '1주년은 같은 날짜의 다음 해예요.'],
    ex: ['2026년 11월 11일 기준 크리스마스(12월 25일)는 D-44예요.', '2026년 1월 1일에 사귀었다면 100일은 4월 10일이에요.', '같은 날 시작했다면 1000일은 2028년 9월 26일이에요.'],
    faq: [['100일은 시작일 포함인가요?', '네. 우리나라에서 많이 쓰는 방식대로 시작한 날을 1일로 세요.'], ['D-day 당일은 어떻게 표시되나요?', '목표일이 오늘이면 D-day로 보여 줘요.'], ['결과를 저장할 수 있나요?', '주소에 날짜가 들어가서, 즐겨찾기하거나 링크를 보내면 같은 결과가 나와요.']],
    rel: ['date', 'age', 'percent'],
  },
  pyeong: {
    name: '평수 계산기', icon: '🏠', kw: '평수계산기',
    title: '평수 계산기 - 평↔㎡ 제곱미터 바로 변환 | 오늘 계산기',
    desc: '평을 제곱미터(㎡)로, ㎡를 평으로 바로 바꿔요. 1평은 400/121㎡(약 3.3058㎡) 기준이고 10평부터 60평까지 자주 쓰는 평형 표도 있어요.',
    lead: '아파트 공고의 ㎡를 평으로, 평을 ㎡로 바꿔 보세요.',
    form: () => seg('py', [['py', '평 → ㎡'], ['m2', '㎡ → 평']]) + numF('x', '값', '30', ''),
    how: ['1평 = 400 ÷ 121 ㎡ ≈ 3.3058㎡', '㎡ → 평 = ㎡ × 121 ÷ 400 (≈ ㎡ × 0.3025)', '결과는 소수 둘째 자리까지 반올림해요.'],
    ex: ['33㎡는 9.98평이에요.', '30평은 99.17㎡예요.', '전용 84㎡는 약 25.41평이에요(공급면적 평형과는 달라요).'],
    faq: [['1평은 정확히 몇 ㎡인가요?', '1평은 400/121㎡, 약 3.3058㎡예요. 흔히 3.3으로 줄여 쓰면 약간 차이가 나요.'], ['84㎡가 왜 34평이라고 하나요?', '분양에서 말하는 34평은 전용면적에 공용 부분을 더한 공급면적 기준이라 전용 84㎡(약 25.4평)와 달라요.'], ['법정 단위는 무엇인가요?', '공식 문서는 ㎡를 써요. 평은 생활 단위로 참고만 하세요.']],
    rel: ['unit', 'percent', 'interest'], extra: pyTable,
  },
  age: {
    name: '만 나이 계산기', icon: '🎂', kw: '만나이계산기',
    title: '만 나이 계산기 - 생년월일로 만 나이·띠·생일 | 오늘 계산기',
    desc: '생년월일을 넣으면 오늘 기준 만 나이, 연 나이, 띠, 다음 생일까지 며칠 남았는지 알려 줘요. 2월 29일생도 민법 관행대로 계산해요.',
    lead: '기준일은 오늘(한국 시간)이에요. 다른 날 기준으로도 바꿀 수 있어요.',
    form: () => dateV('b', '생년월일', '2000-01-01', '') + dateF('r', '기준일', ''),
    how: ['만 나이 = 기준 연도 - 출생 연도. 올해 생일이 아직 안 지났으면 1을 빼요.', '연 나이 = 기준 연도 - 출생 연도 (생일과 상관없이).', '2월 29일생은 평년에는 3월 1일에 한 살 더 먹는 것으로 봐요.'],
    ex: ['2000년 2월 29일생은 2026년 11월 11일 기준 만 26세예요.', '1990년 12월 1일생은 2026년 11월 11일 기준 만 35세, 연 나이 36세, 말띠예요.', '같은 사람의 다음 생일은 20일 뒤예요.'],
    faq: [['요즘 나이는 어떤 걸 쓰나요?', '2023년 6월부터 법과 행정에서는 만 나이를 기본으로 써요.'], ['띠는 양력 기준인가요?', '여기서는 출생 연도(양력) 기준으로 보여 줘요. 설 이전 출생이면 음력 기준 띠와 다를 수 있어요.'], ['2월 29일생은 생일이 언제인가요?', '평년에는 2월 28일이 지나고 3월 1일이 되는 때 나이가 늘어난다고 보는 것이 민법 관행이에요.']],
    rel: ['date', 'dday', 'wage'],
  },
  wage: {
    name: '시급 계산기', icon: '💰', kw: '시급계산기',
    title: '시급 계산기 - 시급을 월급·연봉으로 (주휴 포함) | 오늘 계산기',
    desc: `시급과 주 근로시간을 넣으면 주휴수당을 포함한 월급과 연봉을 계산해요. ${RATES.minWage.year}년 최저시급 ${RATES.minWage.hourly.toLocaleString('ko-KR')}원, 주 40시간이면 월 209시간 기준이에요.`,
    lead: `기본값은 ${RATES.minWage.year}년 최저시급이에요. 세전 금액이고 4대 보험·세금은 빼지 않았어요.`,
    form: () => numF('h', '시급', String(RATES.minWage.hourly), '', '원') + numF('w', '주 근로시간', '40', '', '시간') + chk('j', '주휴수당 포함 (주 15시간 이상)', true, ''),
    how: ['주휴시간 = 주 근로시간 ÷ 40 × 8 (주 15시간 이상, 최대 8시간)', '월 환산 시간 = (주 근로시간 + 주휴시간) × 365 ÷ 7 ÷ 12, 반올림 → 주 40시간이면 209시간', '월급 = 시급 × 월 환산 시간, 연봉 = 월급 × 12'],
    ex: [`시급 10,320원, 주 40시간이면 월 209시간 × 10,320원 = 2,156,880원이에요.`, '주휴를 빼면 월 174시간 기준이에요.', '주 10시간이면 15시간 미만이라 주휴수당이 없어요.'],
    faq: [['209시간은 어디서 나오나요?', '주 40시간 + 주휴 8시간 = 48시간에 한 달 평균 주 수(365÷7÷12 ≈ 4.345)를 곱해 반올림한 값이에요.'], ['실수령액인가요?', '아니요. 세전 금액이에요. 4대 보험과 소득세는 빼지 않았어요.'], ['최저시급은 언제 바뀌나요?', `매년 8월쯤 다음 해 금액이 고시돼요. 이 페이지는 ${RATES.minWage.year}년 값(${RATES.minWage.hourly.toLocaleString('ko-KR')}원)을 써요.`]],
    rel: ['percent', 'vat', 'date'], rate: `최저시급 ${RATES.minWage.hourly.toLocaleString('ko-KR')}원: ${RATES.minWage.source} (${RATES.minWage.year}년 적용)`,
  },
  vat: {
    name: '부가세 계산기', icon: '🧾', kw: '부가세계산기',
    title: '부가세 계산기 - 공급가액·부가세 10% 역산 | 오늘 계산기',
    desc: '합계금액에서 공급가액과 부가세를 거꾸로 나누거나, 공급가액에 부가세 10%를 더한 합계를 바로 구해요. 원 단위 처리 규칙도 같이 보여 줘요.',
    lead: '견적서·영수증 금액을 넣어 보세요.',
    form: () => seg('total', [['total', '합계 → 공급가·부가세'], ['supply', '공급가 → 합계']]) + numF('x', '금액', '11000', '', '원'),
    how: ['공급가 → 부가세 = 공급가 × 10%, 원 미만은 버려요.', '합계 → 공급가 = 합계 ÷ 1.1을 반올림, 부가세 = 합계 - 공급가', '그래서 공급가 + 부가세는 언제나 합계와 같아요.'],
    ex: ['합계 11,000원은 공급가 10,000원 + 부가세 1,000원이에요.', '합계 10,000원은 공급가 9,091원 + 부가세 909원이에요.', '공급가 12,345원이면 부가세 1,234원, 합계 13,579원이에요.'],
    faq: [['부가세율은 몇 %인가요?', '일반과세자는 10%예요. 간이과세자는 업종별 부가가치율을 곱해서 실제 부담이 더 낮아요.'], ['원 단위는 반올림인가요?', '공급가에서 부가세를 구할 때는 원 미만을 버리고, 합계에서 나눌 때는 공급가를 반올림해요. 세금계산서 발행 프로그램마다 다를 수 있어요.'], ['면세 품목도 계산되나요?', '면세 품목은 부가세가 없어서 이 계산이 필요 없어요.']],
    rel: ['discount', 'percent', 'wage'], rate: `부가세율 10%: ${RATES.vat.source}`,
  },
  discount: {
    name: '할인율 계산기', icon: '🏷️', kw: '할인율계산기',
    title: '할인율 계산기 - 할인가·중복 할인·할인율 역산 | 오늘 계산기',
    desc: '정가와 할인율로 판매가를 구하고, 20%에 10%를 더 깎는 중복 할인이 실제로 몇 %인지, 정가와 판매가로 할인율을 거꾸로 계산해요.',
    lead: '쇼핑할 때 쿠폰을 겹쳐 쓰면 얼마가 되는지 바로 확인하세요.',
    form: () => seg('rate', [['rate', '할인가 구하기'], ['sale', '할인율 구하기']]) + numF('p', '정가', '10000', '', '원') + numF('r', '할인율', '20', 'rate', '%') + numF('r2', '추가 할인율 (선택)', '10', 'rate', '%') + numF('s', '판매가', '7500', 'sale', '원'),
    how: ['판매가 = 정가 × (1 - 할인율), 원 단위 반올림', '중복 할인은 곱해요: (1 - 20%) × (1 - 10%) = 0.72 → 28% 할인', '할인율 = (정가 - 판매가) ÷ 정가 × 100'],
    ex: ['정가 10,000원에 20% + 10% 중복 할인이면 7,200원이에요(28% 할인).', '39,900원 30% 할인이면 27,930원이에요.', '10,000원짜리를 7,500원에 사면 25% 할인이에요.'],
    faq: [['20% + 10%는 30% 할인인가요?', '아니요. 두 번째 할인은 이미 깎인 금액에 적용돼서 실제로는 28% 할인이에요.'], ['원 단위는 어떻게 처리하나요?', '판매가는 원 단위로 반올림해요. 매장마다 버림을 쓰기도 해요.'], ['적립금도 넣을 수 있나요?', '적립은 다음 구매 때 쓰는 돈이라 할인과 달라요. 할인율 칸에는 즉시 할인만 넣으세요.']],
    rel: ['percent', 'vat', 'unit'],
  },
  unit: {
    name: '단위 변환기', icon: '📏', kw: '단위변환',
    title: '단위 변환기 - 인치·파운드·화씨·평 바로 변환 | 오늘 계산기',
    desc: '길이·무게·넓이·온도·부피를 바로 바꿔요. 인치↔센티미터, 파운드↔킬로그램, 화씨↔섭씨, 평↔㎡, 갤런↔리터 같은 생활 단위를 한 번에 봐요.',
    lead: '분류를 고르고 값을 넣으면 다른 단위 값도 아래에 한꺼번에 보여 줘요.',
    form: () => sel('c', '분류', Object.entries(UNITS).map(([k, x]) => [k, x.name]), 'length', '') + numF('x', '값', '1', '') + sel('f', '바꿀 단위', unitOpts('length'), 'm', '') + sel('t', '결과 단위', unitOpts('length'), 'in', ''),
    how: ['모든 단위를 기준 단위(미터·킬로그램·제곱미터·리터)로 바꾼 뒤 결과 단위로 다시 바꿔요.', '온도는 비율이 아니라 식으로 바꿔요: ℉ = ℃ × 9/5 + 32, K = ℃ + 273.15', '1인치 = 2.54cm, 1파운드 = 0.45359237kg, 1미국갤런 = 3.785411784L'],
    ex: ['1인치는 2.54cm예요.', '화씨 212도는 섭씨 100도예요.', '1파운드는 약 0.4536kg이에요.'],
    faq: [['갤런은 미국 기준인가요?', '네. 미국 갤런(3.785L)이에요. 영국 갤런(4.546L)과는 달라요.'], ['근은 몇 그램인가요?', '고기 기준 1근 = 600g으로 계산해요. 채소 1근(375g)과 다를 수 있어요.'], ['소수점은 몇 자리까지 나오나요?', '소수 넷째 자리까지 보여 주고 반올림해요.']],
    rel: ['pyeong', 'percent', 'date'],
  },
  interest: {
    name: '이자 계산기', icon: '🏦', kw: '적금이자계산기',
    title: '이자 계산기 - 적금·예금 이자, 세후 수령액 | 오늘 계산기',
    desc: '적금(매달 납입)과 예금(한 번에 맡김)의 세전 이자, 이자 과세 15.4%, 세후 수령액을 단리·월복리로 계산해요. 비과세도 고를 수 있어요.',
    lead: '은행 상품 설명서의 연이율과 기간을 넣어 보세요. 우대금리는 더해서 넣으면 돼요.',
    form: () => sel('k', '상품', [['savings', '적금 (매달 납입)'], ['deposit', '예금 (한 번에)']], 'savings', '') + numF('p', '월 납입액 / 원금', '300000', '', '원') + numF('n', '기간', '12', '', '개월') + numF('r', '연이율', '3.5', '', '%') + sel('q', '이자 방식', [['simple', '단리'], ['monthly', '월복리']], 'simple', '') + sel('t', '과세', [['normal', '일반과세 15.4%'], ['none', '비과세']], 'normal', ''),
    how: ['적금 단리 이자 = 월납입액 × n(n+1)/2 × 연이율 ÷ 12 (n = 개월 수)', '예금 단리 이자 = 원금 × 연이율 × 개월 ÷ 12', '세금 = 세전 이자 × 15.4%, 원 미만은 버려요. 실제 은행은 소득세·지방세를 따로 10원 단위로 끊어 몇 원 다를 수 있어요.'],
    ex: ['월 10만 원, 12개월, 연 3% 단리 적금이면 세전 이자 19,500원, 세후 16,497원이에요.', '1,000만 원을 연 3.5%로 1년 예금하면 세전 350,000원, 세금 53,900원이에요.', '같은 1,000만 원을 연 3% 월복리로 1년 두면 세전 이자 304,159원이에요.'],
    faq: [['적금 이자가 생각보다 적은 이유는?', '적금은 매달 넣은 돈마다 맡긴 기간이 달라서, 첫 달 돈만 12개월 이자를 받아요. 그래서 같은 연이율 예금보다 이자가 약 절반이에요.'], ['15.4%는 무엇인가요?', '이자소득세 14%와 지방소득세 1.4%를 합친 일반 과세율이에요.'], ['세금우대는 계산되나요?', '이번 버전은 일반과세와 비과세만 있어요. 세금우대(9.5%)는 다음에 추가할게요.']],
    rel: ['percent', 'wage', 'date'], rate: `이자 과세 15.4%: ${RATES.interestTax.source}`,
  },
};
export const CALC = C;

// ---------- 공통 CSS (dark-glass) ----------
const CSS = `:root{--bg:#07080c;--fg:#eef0f6;--muted:#9aa3b8;--edge:rgba(255,255,255,.14);--panel:rgba(255,255,255,.05);--glass:rgba(24,26,38,.72);--cyan:#22d3ee;--bad:#f87171}
*{box-sizing:border-box}html,body{margin:0;background:radial-gradient(1100px 650px at 50% -10%,rgba(79,70,229,.24),transparent),var(--bg);color:var(--fg);font:15px/1.6 system-ui,-apple-system,"Segoe UI","Noto Sans KR",sans-serif;-webkit-tap-highlight-color:transparent;overflow-x:hidden}
a{color:var(--cyan)}.top,.wrap,footer{max-width:960px;margin:0 auto;padding-left:16px;padding-right:16px}.top{display:flex;justify-content:space-between;align-items:center;padding-top:8px;padding-bottom:8px}.logo{display:inline-flex;gap:8px;align-items:center;min-height:44px;color:var(--fg);text-decoration:none;font-weight:800}.logo i{width:10px;height:10px;border-radius:50%;background:var(--cyan);box-shadow:0 0 12px var(--cyan)}
.wrap{padding-bottom:28px}h1{font-size:26px;line-height:1.25;margin:10px 0 6px}h2{font-size:19px;margin:28px 0 8px}h3{font-size:16px;margin:16px 0 4px}p{margin:8px 0}.muted{color:var(--muted)}
.card{background:var(--glass);border:1px solid var(--edge);border-radius:20px;padding:16px;backdrop-filter:blur(24px) saturate(140%);-webkit-backdrop-filter:blur(24px) saturate(140%);min-width:0}
.calc{display:grid;grid-template-columns:1fr;gap:12px;margin:14px 0}@media(min-width:860px){.calc{grid-template-columns:1fr 1fr;align-items:start}.calc #calc-result{position:sticky;top:12px}}
.btn{min-height:44px;padding:0 14px;border-radius:14px;border:1px solid var(--edge);background:linear-gradient(rgba(255,255,255,.12),rgba(255,255,255,.04));color:var(--fg);font:700 14px/1.2 inherit;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;text-decoration:none}.btn.pri{background:linear-gradient(135deg,#4f46e5,#06b6d4);border-color:transparent}.btn[aria-pressed=true]{background:rgba(34,211,238,.18);border-color:var(--cyan)}
.seg{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:6px;margin:0 0 10px}.fld{display:block;margin:10px 0}.fld>span:first-child{display:block;font-size:13px;color:var(--muted);margin-bottom:4px}.fld[hidden],.chk[hidden]{display:none}
.in{display:flex;align-items:center;background:var(--panel);border:1px solid var(--edge);border-radius:12px;padding:0 12px}.in:focus-within{border-color:var(--cyan)}.in input,.in select{flex:1;min-width:0;min-height:46px;background:transparent;border:0;color:var(--fg);font:600 17px/1 inherit;outline:0;color-scheme:dark}.in select option{background:#141622}.in i{font-style:normal;color:var(--muted);margin-left:6px}
.chk{display:flex;gap:8px;align-items:center;min-height:44px}.chk input{width:20px;height:20px;accent-color:#22d3ee}
#calc-main{font-size:clamp(28px,8vw,40px);font-weight:800;line-height:1.15;margin:4px 0;word-break:break-all;font-variant-numeric:tabular-nums}#calc-result.bad #calc-main{color:var(--bad);font-size:20px}#calc-formula{color:var(--muted);font-size:14px;margin:4px 0 8px;word-break:break-all}
#calc-lines{margin:0}#calc-lines div{display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-top:1px solid var(--edge)}#calc-lines dt{color:var(--muted)}#calc-lines dd{margin:0;text-align:right;font-weight:600;font-variant-numeric:tabular-nums}
.acts{display:flex;gap:8px;margin-top:12px}.acts .btn{flex:1}
.tbl{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums}.tbl caption{text-align:left;color:var(--muted);font-size:13px;margin-bottom:4px}.tbl th,.tbl td{border-bottom:1px solid var(--edge);padding:6px 4px;text-align:right}.tbl th{color:var(--muted);font-weight:600}
ul.how{padding-left:18px}ul.how li{margin:4px 0}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px}.grid a.card{text-decoration:none;color:inherit;display:block}.grid b{font-size:17px}.grid p{margin:4px 0 0;font-size:14px}
.note{font-size:13px;color:var(--muted)}.more{display:flex;flex-wrap:wrap;gap:6px 16px;margin:22px 0 0;font-size:14px}footer{color:var(--muted);font-size:13px;padding-bottom:40px}
@media(prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}`;

const url = (slug) => `${SITE}/calc/${slug ? `${slug}/` : ''}`;
const FAQ_LD = (faq) => ({ '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });
const NAV = `<nav class="more" aria-label="오늘 계산기">${SLUGS.map((s) => `<a href="/calc/${s}/">${C[s].name}</a>`).join('')}<a href="/calc/">전체 계산기</a><a href="/ko/">매일웹겜 홈</a></nav>`;

function doc({ title, desc, canon, ld, body, page, script = '' }) {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#07080c">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${canon}">
<meta property="og:type" content="website"><meta property="og:site_name" content="${BRAND}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:image" content="${SITE}/og/site-ko.png"><meta property="og:url" content="${canon}"><meta property="og:locale" content="ko_KR"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg"><link rel="modulepreload" href="/js/calc-core.js"><style>${CSS}</style><script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script></head>
<body data-page="calc" data-calc="${page}" data-lang="ko"><header class="top"><a class="logo" href="/calc/"><i></i>${BRAND}</a><a href="/ko/" class="muted">매일웹겜 →</a></header>
<main class="wrap">${body}${NAV}</main><footer>© 매일웹겜 · playtoday.cloud · <a href="/ko/about/">소개</a> · <a href="/ko/privacy/">개인정보</a> · 참고용 계산이에요. 실제 금액은 기관·회사 기준을 따르세요.</footer>
<script src="/js/gev.js" defer></script>${script}</body></html>`;
}

function calcPage(slug) {
  const t = C[slug];
  const r = compute(slug, {}, asOf); // 서버 렌더 기본 결과 (날짜 종목은 화면에서 오늘 기준으로 바로 다시 계산)
  const res = `<section class="card" id="calc-result" aria-live="polite"><span class="muted" style="font-size:13px">결과</span><div id="calc-main">${esc(r?.main ?? '')}</div><p id="calc-formula">${esc(r?.formula ?? '')}</p><dl id="calc-lines">${(r?.lines ?? []).map(([k, x]) => `<div><dt>${esc(k)}</dt><dd>${esc(x)}</dd></div>`).join('')}</dl>
<div class="acts"><button type="button" class="btn" id="calc-copy">결과 복사</button><button type="button" class="btn pri" id="calc-share">결과 공유</button></div><p class="note" style="margin:8px 0 0">공유는 선택이에요. 링크에는 입력한 숫자만 들어가요.</p></section>`;
  const body = `<h1>${esc(t.name)}</h1><p class="muted">${esc(t.lead)}</p>
<div class="calc"><form class="card" id="calc-form" autocomplete="off" novalidate>${t.form()}</form>${res}</div>
${t.extra ? t.extra() : ''}<h2>계산 방법</h2><ul class="how">${t.how.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
<h2>예시</h2><ul class="how">${t.ex.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
<section class="faq"><h2>자주 묻는 질문</h2>${t.faq.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join('')}</section>
<p class="note">기준일 ${asOf}${t.rate ? ` · 출처 ${esc(t.rate)}` : ''} · 참고용 계산이에요. 실제 금액은 기관·회사 기준을 따르세요.</p>
<h2>관련 계산기</h2><div class="grid">${t.rel.map((s) => `<a class="card" href="/calc/${s}/"><b>${C[s].icon} ${C[s].name}</b><p class="muted">${esc(C[s].lead)}</p></a>`).join('')}</div>`;
  const ld = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'WebApplication', name: t.name, url: url(slug), description: t.desc, applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any', inLanguage: 'ko', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: 0, priceCurrency: 'KRW' } },
    { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: BRAND, item: url('') }, { '@type': 'ListItem', position: 2, name: t.name, item: url(slug) }] },
    FAQ_LD(t.faq)] };
  return doc({ title: t.title, desc: t.desc, canon: url(slug), ld, body, page: slug, script: '<script type="module" src="/js/calc-ui.js"></script>' });
}

const HUB = {
  title: '오늘 계산기 - 퍼센트·날짜·D-day·만 나이 등 10종 | 오늘 계산기',
  desc: '퍼센트, 날짜, D-day, 평수, 만 나이, 시급, 부가세, 할인율, 단위, 이자까지 자주 쓰는 계산기 10종을 설치·가입 없이 바로 써요. 오늘 날짜가 기본값이에요.',
  faq: [['무료인가요?', '네. 설치·가입 없이 무료로 써요. 입력한 숫자는 서버에 저장하지 않아요.'], ['계산 결과를 믿어도 되나요?', '공식과 시험값으로 확인했지만 참고용이에요. 세금·급여처럼 중요한 금액은 기관·회사 기준을 따르세요.'], ['결과를 다른 사람에게 보낼 수 있나요?', '결과 공유 버튼을 누르면 입력값이 담긴 링크가 만들어져요. 공유는 선택이에요.']],
};
function hubPage() {
  const body = `<h1>오늘 계산기 10종</h1><p class="muted">자주 찾는 생활 계산기를 한곳에 모았어요. 숫자를 넣으면 버튼 없이 바로 결과가 나와요.</p>
<p id="calc-today" class="muted" style="font-size:14px"></p>
<div class="grid">${SLUGS.map((s) => `<a class="card" href="/calc/${s}/"><b>${C[s].icon} ${C[s].name}</b><p class="muted">${esc(C[s].lead)}</p></a>`).join('')}</div>
<section class="faq"><h2>자주 묻는 질문</h2>${HUB.faq.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join('')}</section>`;
  const ld = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'CollectionPage', name: '오늘 계산기', url: url(''), description: HUB.desc, inLanguage: 'ko', hasPart: SLUGS.map((s) => ({ '@type': 'WebApplication', name: C[s].name, url: url(s), applicationCategory: 'UtilitiesApplication', offers: { '@type': 'Offer', price: 0, priceCurrency: 'KRW' } })) },
    { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: '매일웹겜', item: `${SITE}/ko/` }, { '@type': 'ListItem', position: 2, name: BRAND, item: url('') }] },
    FAQ_LD(HUB.faq)] };
  return doc({ title: HUB.title, desc: HUB.desc, canon: url(''), ld, body, page: 'hub', script: '<script type="module">import{kstToday,withWd}from"/js/calc-core.js";document.getElementById("calc-today").textContent="오늘은 "+withWd(kstToday())+" (한국 시간)";</script>' });
}

export function buildCalc() {
  const out = [];
  mkdirSync(`${ROOT}public/calc`, { recursive: true });
  writeFileSync(`${ROOT}public/calc/index.html`, hubPage()); out.push(url(''));
  for (const s of SLUGS) { mkdirSync(`${ROOT}public/calc/${s}`, { recursive: true }); writeFileSync(`${ROOT}public/calc/${s}/index.html`, calcPage(s)); out.push(url(s)); }
  writeFileSync(`${ROOT}public/calc/rates.json`, JSON.stringify(RATES, null, 2) + '\n');
  return out;
}

// 홈(ko) '오늘 계산기' 섹션: 카드 6개 + 전체 10종 링크. 오늘 값 미리보기 줄은 calc-home 인라인 모듈이 KST 로 채운다.
const HOME6 = ['percent', 'date', 'dday', 'age', 'pyeong', 'wage'];
export const CALC_HOME = `<section class="calc-home" aria-label="오늘 계산기"><h2 style="margin:14px 0 8px;font-size:20px">오늘 계산기 <span class="muted" style="font-size:13px;font-weight:400">숫자만 넣으면 바로</span></h2>
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px">${HOME6.map((s) => `<a class="card" data-calc-card="${s}" href="/calc/${s}/" style="text-decoration:none;color:inherit;padding:14px"><b style="font-size:16px">${C[s].icon} ${C[s].name}</b><p class="muted" style="margin:4px 0 0;font-size:13px" data-calc-prev>${esc(C[s].kw)}</p></a>`).join('')}</div>
<p style="margin:10px 0 14px;font-size:14px"><a href="/calc/">전체 10종 보기 →</a> <span class="muted">부가세 · 할인율 · 단위 · 이자</span></p>
<script type="module">import{todayPreview}from"/js/calc-core.js";const p=todayPreview();for(const a of document.querySelectorAll("[data-calc-card]")){const e=a.querySelector("[data-calc-prev]");if(p[a.dataset.calcCard])e.textContent=p[a.dataset.calcCard];}</script></section>`;
export const CALC_FOOTER_LINKS = `<a href="/calc/">오늘 계산기</a>`;

if (import.meta.url === `file://${process.argv[1]}`) console.log(buildCalc().join('\n'));
