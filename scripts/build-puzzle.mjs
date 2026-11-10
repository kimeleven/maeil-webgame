// 오늘의 퍼즐 (t_2d0c7a9f): ko 전용 /ko/스도쿠/, /ko/스도쿠/오늘/, /ko/지뢰찾기/, /ko/지뢰찾기/오늘/ 와 홈 카드.
import { writeFileSync, mkdirSync } from 'node:fs';
import { T2, GAMES2, CSS2 } from './puzzle-texts2.mjs'; // 2차: 단어묶음·어제 정답·2048·솔리테어·노노그램 (t_49b0ed25)

const ROOT = new URL('..', import.meta.url).pathname;
const SITE = 'https://www.playtoday.cloud';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const PUZZLE_PATHS = ['스도쿠/', '스도쿠/오늘/', '지뢰찾기/', '지뢰찾기/오늘/', '단어묶음/', '단어묶음/오늘/', '단어묶음/어제/', '2048/', '솔리테어/', '노노그램/'];
const enc = (suf) => `/ko/${suf.split('/').map(encodeURIComponent).join('/')}`;
const href = (suf) => enc(suf);
const abs = (suf) => SITE + enc(suf);

// ---------- 본문 (규칙 · 전략 · FAQ), 페이지마다 1,000자 이상 ----------
const T = {
  'sd-hub': {
    title: '스도쿠 무료 — 오늘의 스도쿠, 매일 새 판 | 매일웹겜', desc: '설치·가입 없이 하는 무료 스도쿠. 날짜마다 새 판, 쉬움·보통·어려움, 메모·힌트·연속 기록까지.',
    h1: '스도쿠 — 매일 새로 나오는 무료 퍼즐', lead: '9×9 칸에 1부터 9까지 숫자를 채우는 스도쿠예요. 설치도 가입도 없이 바로 풀 수 있고, 날짜가 바뀌면 새 판이 열려요.',
    sections: [
      ['스도쿠 규칙', ['스도쿠는 9×9 칸을 숫자 1부터 9까지로 채우는 논리 퍼즐이에요. 규칙은 단 세 가지예요. 같은 가로줄에 같은 숫자가 두 번 나오면 안 되고, 같은 세로줄에도 안 되며, 굵은 선으로 나뉜 3×3 블록 안에서도 1부터 9가 한 번씩만 들어가야 해요.', '처음부터 채워져 있는 숫자는 단서예요. 단서가 많을수록 쉬운 판이고 적을수록 어려운 판이에요. 오늘의 스도쿠는 해가 정확히 하나뿐인 판만 내보내기 때문에 찍어서 맞히는 일 없이 논리만으로 끝까지 풀 수 있어요.']],
      ['풀이 요령', ['가장 먼저 해 볼 것은 "이 칸에는 이 숫자밖에 못 들어간다"를 찾는 거예요. 한 줄에 칸이 하나만 남았거나, 어떤 칸의 가로·세로·블록에 이미 8개 숫자가 보이면 남은 숫자가 정답이에요. 이걸 단독 후보라고 불러요.', '다음은 숨은 단독이에요. 어떤 블록에서 숫자 7이 들어갈 수 있는 칸이 딱 한 곳이면, 그 칸에 다른 후보가 있어도 7이 정답이에요. 막히면 메모 모드로 칸마다 후보를 적어 두고, 두 칸이 같은 후보 두 개만 갖는 쌍을 찾아 같은 줄의 다른 칸 후보를 지워 보세요. 어려움 단계에서는 이런 후보 지우기를 여러 번 이어야 풀려요.']],
      ['오늘의 스도쿠는 이렇게 달라요', ['날짜를 씨앗으로 판을 만들기 때문에 같은 날에는 누구나 같은 판을 풀어요. 쉬움·보통·어려움 세 단계가 있고 단계마다 판이 달라요. 완료하면 걸린 시간과 힌트 횟수가 기록되고, 이어서 푼 날수가 연속 기록으로 쌓여요. 하루를 건너뛰면 연속 기록은 처음으로 돌아가요.', '막힐 때는 힌트를 쓸 수 있어요. 힌트는 횟수 제한이 없지만 기록에 사용 횟수가 남아요. 결과 공유는 선택이고, 공유하지 않아도 다음 판을 바로 풀 수 있어요.']],
      ['처음 하는 분께', ['스도쿠에 숫자 계산은 필요 없어요. 1부터 9까지 숫자는 그냥 서로 다른 아홉 개의 기호라고 생각하면 돼요. 처음에는 쉬움 단계에서 단독 후보만 찾아도 한 판을 끝낼 수 있어요. 틀린 숫자를 넣으면 같은 줄에 겹친 숫자가 빨갛게 보이니, 그 칸부터 다시 살펴보세요. 한 칸에 오래 매달리지 말고 다른 칸으로 넘어가면 막힌 곳이 저절로 풀리는 경우가 많아요. 하루에 한 판씩 꾸준히 풀면 일주일만 지나도 속도가 눈에 띄게 빨라져요.']],
    ],
    faq: [['스도쿠는 무료인가요?', '네, 모두 무료이고 가입이 필요 없어요. 브라우저에서 바로 열려요.'], ['같은 날이면 모두 같은 판인가요?', '네. 한국 시간 기준 날짜로 판이 정해져서 같은 날 같은 단계는 같은 판이에요.'], ['중간에 나가도 이어서 풀 수 있나요?', '네. 진행 상황이 이 기기의 브라우저에 저장돼서 같은 날 돌아오면 이어서 풀 수 있어요.'], ['연속 기록은 어디에 저장되나요?', '이 기기의 브라우저(로컬 저장소)에만 저장돼요. 브라우저 데이터를 지우면 함께 지워져요.']],
  },
  'sd-play': {
    title: '오늘의 스도쿠 — 매일 새 판, 쉬움·보통·어려움 | 매일웹겜', desc: '오늘 날짜 스도쿠 한 판. 시간과 힌트가 기록되고 연속 도전일이 쌓여요. 설치·가입 없이 무료.',
    h1: '오늘의 스도쿠', lead: '오늘 날짜로 정해진 한 판이에요. 난이도를 고르고 숫자 패드나 키보드로 채워 보세요.',
    sections: [
      ['이렇게 풀어요', ['칸을 누르고 아래 숫자 패드(또는 키보드 1~9)로 숫자를 넣어요. 같은 줄·블록에 같은 숫자가 생기면 빨간색으로 표시돼요. 메모 버튼을 켜면 확정이 아닌 후보 숫자를 칸 안에 작게 적을 수 있고, 숫자를 확정하면 같은 줄과 블록의 후보 메모가 자동으로 지워져요.', '실수했다면 되돌리기로 한 단계씩 돌아갈 수 있어요. 지우개는 선택한 칸의 숫자를 지워요. 처음 주어진 단서 칸은 바꿀 수 없어요.']],
      ['난이도 고르는 법', ['쉬움은 단서가 많아서 단독 후보만으로 대부분 풀려요. 스도쿠가 처음이거나 출퇴근길에 짧게 풀고 싶을 때 맞아요. 보통은 단서가 중간 정도라 숨은 단독과 메모가 필요해요. 어려움은 단서가 가장 적어서 후보 쌍 지우기 같은 한 단계 위의 추론이 필요해요.', '난이도마다 같은 날에도 판이 달라서, 세 판을 모두 풀어 보는 재미가 있어요. 처음이라면 쉬움으로 규칙을 익힌 뒤 보통으로 올라가 보세요.']],
      ['연속 기록과 공유', ['오늘 판을 끝내면 걸린 시간과 힌트 사용 횟수가 기록돼요. 어제도 풀었다면 연속 기록이 하루 늘고, 하루를 건너뛰면 1일부터 다시 시작해요. 기록은 이 기기의 브라우저에만 저장돼요.', '완료 화면의 공유 글은 숫자 없이 시간과 힌트만 보여 줘서 정답이 노출되지 않아요. 친구에게 보내거나 붙여 넣어 자랑할 수 있고, 공유하지 않아도 불이익은 없어요. 내일 새 판이 열리면 다시 도전해서 연속 기록을 이어 가 보세요. 하루 한 판이면 충분해요.']],
      ['자주 하는 실수', ['가장 흔한 실수는 확신 없이 숫자를 넣는 거예요. 후보가 둘 남았을 때는 하나를 찍기보다 메모로 남겨 두고 다른 칸의 단서가 늘어나기를 기다리세요. 빨간 칸이 생겼다면 방금 넣은 숫자뿐 아니라 같은 줄과 블록의 숫자도 함께 의심해 보세요. 시간이 걸려도 힌트 없이 끝내면 기록이 더 깔끔해요. 너무 막힐 때는 힌트를 한 번만 쓰고, 힌트로 열린 칸에서 이어지는 추론을 따라가 보세요. 같은 날 다른 단계의 판도 풀어 보면 감각이 훨씬 빨리 붙어요.']],
    ],
    faq: [['힌트를 쓰면 기록이 어떻게 되나요?', '힌트는 몇 번 써도 되고, 사용 횟수가 기록과 공유 글에 같이 표시돼요.'], ['모바일에서도 할 수 있나요?', '네. 칸을 탭하고 숫자 패드를 누르면 돼요. 화면이 작아도 칸이 꽉 차게 맞춰져요.'], ['날짜가 바뀌면 어떻게 되나요?', '한국 시간 0시에 새 판이 열려요. 풀던 어제 판은 새 판으로 바뀌어요.']],
  },
  'ms-hub': {
    title: '지뢰찾기 무료 — 오늘의 지뢰찾기, 첫 클릭 안전 | 매일웹겜', desc: '설치·가입 없이 하는 무료 지뢰찾기. 초급·중급·고급, 첫 클릭은 항상 안전, 모바일 깃발 모드 지원.',
    h1: '지뢰찾기 — 첫 클릭이 항상 안전한 무료 웹 지뢰찾기', lead: '클래식 지뢰찾기를 브라우저에서 바로 해 보세요. 첫 칸은 반드시 안전하고, 날짜마다 새 판이 열려요.',
    sections: [
      ['지뢰찾기 규칙', ['지뢰찾기는 숨겨진 지뢰를 건드리지 않고 지뢰가 없는 칸을 모두 여는 게임이에요. 칸을 열었을 때 숫자가 나오면 그 칸을 둘러싼 8칸 안에 지뢰가 몇 개 있는지 알려 주는 거예요. 숫자가 없는 빈 칸을 열면 주변이 한꺼번에 열려요.', '지뢰라고 확신하는 칸에는 깃발을 꽂아 표시해요. 깃발은 실수로 열지 않게 막아 주는 표시일 뿐이고, 지뢰를 열면 그 판은 끝나요. 초급은 9×9에 지뢰 10개, 중급은 16×16에 40개, 고급은 30×16에 99개예요.']],
      ['풀이 요령', ['가장 기본은 숫자와 닫힌 칸의 개수를 맞춰 보는 거예요. 1이 닫힌 칸 하나만 이웃으로 가졌다면 그 칸이 지뢰예요. 숫자가 이웃 깃발 수와 같아지면 나머지 이웃은 모두 안전하니 한 번에 열 수 있어요. 이 열기를 코드라고 하고, 이미 열린 숫자를 다시 누르면 실행돼요.', '1-2 패턴도 자주 쓰여요. 벽을 따라 1과 2가 나란히 있을 때 2의 바깥쪽 닫힌 칸이 지뢰인 경우가 많아요. 막히면 남은 지뢰 수를 보고 확률이 가장 낮은 칸을 열어 보세요. 한 곳에서 막히면 다른 곳을 먼저 여는 게 좋아요.']],
      ['첫 클릭 안전과 오늘의 판', ['이 지뢰찾기는 첫 번째로 연 칸과 그 주변 8칸에 지뢰가 없도록 판을 만들어요. 그래서 시작하자마자 지뢰를 밟는 일이 없고 첫 클릭은 항상 빈 칸이 열려요. 지뢰 배치는 날짜를 씨앗으로 해서, 같은 날 같은 칸으로 시작하면 같은 판이에요.', '모바일에서는 칸을 길게 누르면 깃발이 꽂히고, 깃발 모드 버튼을 켜면 탭이 깃발이 돼요. 한 판을 클리어하면 시간이 기록되고 연속 도전일이 쌓여요.']],
      ['자주 하는 실수', ['지뢰찾기에서 가장 흔한 실수는 확신이 없는데 깃발을 꽂는 거예요. 깃발이 하나만 틀려도 주변 숫자를 잘못 읽게 돼서 나중에 큰 사고로 이어져요. 확실하지 않은 칸은 깃발 대신 그냥 두고 다른 곳을 먼저 열어 단서를 늘리세요. 또 숫자를 볼 때는 이미 표시한 깃발 수를 빼고 남은 지뢰 수만 생각하면 계산이 쉬워져요. 속도에 욕심내기보다 정확하게 푸는 습관을 들이면 결국 더 빨리 끝낼 수 있어요.']],
    ],
    faq: [['첫 클릭에 지뢰가 나올 수 있나요?', '아니요. 첫 칸과 주변 8칸은 항상 안전해서 첫 클릭은 빈 칸이에요.'], ['모바일에서 깃발은 어떻게 꽂나요?', '칸을 길게 누르거나, 깃발 모드 버튼을 켠 뒤 탭하세요.'], ['난이도는 몇 개인가요?', '초급(9×9, 지뢰 10), 중급(16×16, 지뢰 40), 고급(30×16, 지뢰 99) 세 가지예요.'], ['무료인가요?', '네, 설치와 가입 없이 무료로 할 수 있어요.']],
  },
  'ms-play': {
    title: '오늘의 지뢰찾기 — 매일 새 판, 초급·중급·고급 | 매일웹겜', desc: '오늘 날짜 지뢰찾기 한 판. 첫 클릭 안전, 모바일 깃발 모드, 기록과 연속 도전일. 설치·가입 없이 무료.',
    h1: '오늘의 지뢰찾기', lead: '오늘 날짜로 정해진 지뢰 판이에요. 난이도를 고르고 첫 칸을 열어 시작하세요.',
    sections: [
      ['조작법', ['PC에서는 왼쪽 클릭으로 칸을 열고 오른쪽 클릭으로 깃발을 꽂아요. 모바일에서는 탭하면 열리고, 길게 누르면 깃발이 꽂혀요. 아래 깃발 모드를 켜면 탭이 깃발이 돼서 더 편하게 표시할 수 있어요.', '이미 열린 숫자를 누르면, 그 숫자만큼 이웃에 깃발이 꽂혀 있을 때 나머지 이웃 칸을 한꺼번에 열어 줘요. 깃발이 틀렸다면 지뢰가 열리니 확신이 있을 때만 쓰세요. 물음표 칸 옵션을 켜면 깃발을 한 번 더 눌러 물음표로 바꿀 수 있어요.']],
      ['난이도 고르는 법', ['초급은 9×9 칸에 지뢰 10개라 규칙을 익히기에 좋아요. 중급은 16×16에 40개로 가장 많이 하는 표준 난이도예요. 고급은 30×16의 넓은 판에 지뢰 99개라 PC 화면에서 하기를 권해요.', '난이도마다 같은 날에도 판이 달라요. 지뢰찾기는 운보다 논리가 중요한 게임이라서, 숫자 패턴을 읽는 연습을 하면 같은 중급도 점점 빨리 끝낼 수 있어요.']],
      ['기록과 공유', ['클리어하면 걸린 시간이 기록되고 연속 도전일이 하루 늘어요. 하루를 건너뛰면 연속 기록은 1일부터 다시 시작해요. 지뢰를 밟아 실패한 판은 연속 기록에 반영되지 않지만 언제든 다시 도전할 수 있어요.', '결과 공유 글에는 난이도와 시간만 들어가고 지뢰 위치는 나오지 않아요. 공유는 선택이라서 하지 않아도 다음 판을 바로 할 수 있어요. 내일 같은 시간에 다시 오면 새 판이 기다리고 있어요. 매일 한 판씩 이어서 도전하며 연속 기록을 늘려 보세요.']],
      ['처음 하는 분께', ['처음이라면 초급에서 숫자 읽는 법부터 익히세요. 첫 칸을 열면 항상 빈 칸이 열리고 그 경계에 숫자가 나타나요. 그 숫자들을 하나씩 닫힌 칸의 수와 맞춰 보는 게 전부예요. 어디에도 확실한 칸이 없으면 다른 경계로 눈을 옮기세요. 시간 기록은 처음에는 신경 쓰지 말고 한 판을 끝까지 풀어 보는 데 집중하면 돼요. 하루 한 판으로 연속 기록을 쌓으며 천천히 속도를 올려 보세요.']],
    ],
    faq: [['판을 다시 시작할 수 있나요?', '네. 다시 시작 버튼을 누르면 같은 날의 같은 판으로 새로 시작해요.'], ['실패하면 연속 기록이 사라지나요?', '실패는 기록을 줄이지 않아요. 하루 동안 한 번이라도 클리어하면 연속 기록이 이어져요.'], ['모바일 화면에서 고급은 너무 작지 않나요?', '고급은 가로로 넓어서 모바일에서는 화면이 좁아요. 모바일에서는 초급이나 중급을 권해요.']],
  },
};
Object.assign(T, T2);
const FAQ_LD = (faq) => ({ '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });
export const textLen = (t) => [t.lead, ...t.sections.flatMap(([h, ps]) => [h, ...ps]), ...t.faq.flat()].join('').length;

// ---------- 공통 CSS (dark-glass) ----------
const CSS = `:root{--bg:#07080c;--fg:#eef0f6;--muted:#9aa3b8;--edge:rgba(255,255,255,.14);--panel:rgba(255,255,255,.05);--glass:rgba(24,26,38,.72);--cyan:#22d3ee;--gold:#facc15;--bad:#f87171}
*{box-sizing:border-box}html,body{margin:0;background:radial-gradient(1100px 650px at 50% -10%,rgba(79,70,229,.24),transparent),var(--bg);color:var(--fg);font:15px/1.6 system-ui,-apple-system,"Segoe UI","Noto Sans KR",sans-serif;-webkit-tap-highlight-color:transparent;overflow-x:hidden}
a{color:var(--cyan)}.top{max-width:720px;margin:0 auto;padding:8px 14px;display:flex;justify-content:space-between;align-items:center}.logo{display:inline-flex;gap:8px;align-items:center;min-height:44px;color:var(--fg);text-decoration:none;font-weight:800}.logo i{width:10px;height:10px;border-radius:50%;background:var(--cyan);box-shadow:0 0 12px var(--cyan)}
.wrap{max-width:720px;margin:0 auto;padding:0 14px 28px}h1{font-size:26px;line-height:1.25;margin:10px 0 8px}h2{font-size:19px;margin:26px 0 6px}h3{font-size:16px;margin:16px 0 4px}p{margin:8px 0}.muted{color:var(--muted)}
.card{display:block;background:var(--glass);border:1px solid var(--edge);border-radius:20px;padding:16px;backdrop-filter:blur(24px) saturate(140%);-webkit-backdrop-filter:blur(24px) saturate(140%)}
.cta{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0}.btn{min-height:44px;padding:0 18px;border-radius:14px;border:1px solid var(--edge);background:linear-gradient(rgba(255,255,255,.14),rgba(255,255,255,.05));color:var(--fg);font:700 15px/1 inherit;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;text-decoration:none}.btn.pri{background:linear-gradient(135deg,#4f46e5,#06b6d4);border-color:transparent}.btn[aria-pressed=true]{outline:2px solid var(--cyan)}.btn:disabled{opacity:.35}
.stat{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:8px 0}.stat div{background:var(--panel);border:1px solid var(--edge);border-radius:14px;padding:6px;text-align:center;font-variant-numeric:tabular-nums}.stat span{display:block;font-size:11px;color:var(--muted)}.stat b{font-size:18px}
.seg{display:flex;gap:8px;margin:8px 0}.seg .btn{flex:1;padding:0 8px}.bar{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}.bar .btn{flex:1;min-width:64px}
.more{display:flex;flex-wrap:wrap;gap:6px 16px;margin:22px 0 0;font-size:14px}footer{max-width:720px;margin:0 auto;padding:0 14px 40px;color:var(--muted);font-size:13px}
.dlg{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(7,8,12,.6);z-index:5;padding:16px}.dlg[hidden]{display:none}.dlg .card{max-width:380px;width:100%;text-align:center}.dlg textarea{width:100%;height:96px;background:var(--panel);color:var(--fg);border:1px solid var(--edge);border-radius:12px;padding:8px;font:inherit;resize:none}
.faq h3{margin-top:14px}
/* sudoku */
#sd-board{display:grid;grid-template-columns:repeat(9,1fr);width:min(100%,460px);aspect-ratio:1;margin:8px auto;border:2px solid var(--fg);border-radius:10px;overflow:hidden;background:var(--panel);touch-action:manipulation}
.sd-c{border:0;border-right:1px solid var(--edge);border-bottom:1px solid var(--edge);background:transparent;color:var(--cyan);font:700 clamp(16px,5.4vw,26px)/1 inherit;padding:0;min-width:0;position:relative;cursor:pointer}.sd-c.g{color:var(--fg)}.sd-c.br{border-right:2px solid var(--fg)}.sd-c.bb{border-bottom:2px solid var(--fg)}.sd-c.peer{background:rgba(255,255,255,.07)}.sd-c.same{background:rgba(34,211,238,.18)}.sd-c.sel{background:rgba(79,70,229,.55)}.sd-c.bad{color:var(--bad);background:rgba(248,113,113,.16)}
.nt{display:grid;grid-template-columns:repeat(3,1fr);width:100%;height:100%;font-size:clamp(7px,2vw,10px);font-weight:600;color:var(--muted);line-height:1}.nt i{font-style:normal;display:flex;align-items:center;justify-content:center}
.pad{display:grid;grid-template-columns:repeat(9,1fr);gap:6px;max-width:460px;margin:8px auto}.pad .btn{padding:0;min-height:48px;font-size:20px}#sd-board,.pad,.bar,.stat{max-width:460px}.stat,.bar{margin-left:auto;margin-right:auto}
/* minesweeper */
#ms-wrap{overflow-x:auto;padding:4px 0}#ms-board{display:grid;grid-template-columns:repeat(var(--w),var(--cs));gap:1px;width:max-content;margin:6px auto;background:var(--edge);border:2px solid var(--edge);border-radius:8px;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;touch-action:manipulation;--cs:min(calc((100vw - 34px)/var(--w)),40px)}#ms-board[data-size=l]{--cs:26px}
.ms-c{width:var(--cs);height:var(--cs);border:0;padding:0;background:linear-gradient(#3a3f55,#2a2e40);color:var(--fg);font:800 calc(var(--cs)*.55)/1 inherit;cursor:pointer}.ms-c.o{background:#12141e;cursor:default}.ms-c.mine{background:#3b1d1d}.ms-c.hit{background:#b91c1c}.ms-c.f{font-size:calc(var(--cs)*.5)}
.n1{color:#60a5fa}.n2{color:#4ade80}.n3{color:#f87171}.n4{color:#a78bfa}.n5{color:#fb923c}.n6{color:#2dd4bf}.n7{color:#e5e7eb}.n8{color:#9ca3af}
.hubgrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}@media(max-width:480px){.hubgrid{grid-template-columns:1fr}}
${CSS2}
@media(prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}`;

const NAV = `<nav class="more" aria-label="오늘의 퍼즐"><a href="${href('스도쿠/오늘/')}">오늘의 스도쿠</a><a href="${href('지뢰찾기/오늘/')}">오늘의 지뢰찾기</a><a href="${href('단어묶음/오늘/')}">오늘의 단어 묶음</a><a href="${href('2048/')}">2048</a><a href="${href('솔리테어/')}">솔리테어</a><a href="${href('노노그램/')}">노노그램</a><a href="${href('스도쿠/')}">스도쿠 규칙·요령</a><a href="${href('지뢰찾기/')}">지뢰찾기 규칙·요령</a><a href="/ko/webgame/">웹겜 모아보기</a><a href="/ko/">홈</a></nav>`;

const GAMES = {
  ...GAMES2,
  'sd-play': `<div class="card" id="sd-app"><div class="seg" role="group" aria-label="난이도"><button class="btn sd-lv" data-lv="easy" aria-pressed="false">쉬움</button><button class="btn sd-lv" data-lv="normal" aria-pressed="true">보통</button><button class="btn sd-lv" data-lv="hard" aria-pressed="false">어려움</button></div>
<div class="stat"><div><span>시간</span><b id="sd-time">0:00</b></div><div><span>힌트</span><b id="sd-hints">0</b></div><div><span>연속</span><b><span id="sd-streak" style="display:inline;font-size:inherit;color:inherit">0</span>일</b></div></div>
<p class="muted" style="margin:0;text-align:center;font-size:13px"><span id="sd-date"></span> · <span id="sd-last"></span></p>
<div id="sd-board" role="grid" aria-label="스도쿠 판"></div>
<div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button class="btn sd-n" data-n="${n}" type="button">${n}</button>`).join('')}</div>
<div class="bar"><button class="btn" id="sd-undo" type="button">↩ 되돌리기</button><button class="btn" id="sd-erase" type="button">⌫ 지우개</button><button class="btn" id="sd-note" type="button" aria-pressed="false">✏️ 메모</button><button class="btn" id="sd-hint" type="button">💡 힌트</button><button class="btn" id="sd-reset" type="button">↻ 처음부터</button></div></div>
<div class="dlg" id="sd-done" hidden role="dialog" aria-label="완료"><div class="card"><h2 style="margin-top:0">완료! 🎉</h2><p id="sd-result"></p><textarea id="sd-share-text" readonly aria-label="공유 글"></textarea><div class="cta" style="justify-content:center"><button class="btn pri" id="sd-copy" type="button">결과 복사</button><button class="btn" id="sd-close" type="button">닫기</button></div><p class="muted" style="font-size:13px">공유는 선택이에요. 안 해도 다음 판을 바로 풀 수 있어요.</p></div></div>
<script type="module" src="/js/puzzle-sudoku.js"></script>`,
  'ms-play': `<div class="card" id="ms-app"><div class="seg" role="group" aria-label="난이도"><button class="btn ms-lv" data-lv="beginner" aria-pressed="false">초급 9×9</button><button class="btn ms-lv" data-lv="intermediate" aria-pressed="true">중급 16×16</button><button class="btn ms-lv" data-lv="expert" aria-pressed="false">고급 30×16</button></div>
<div class="stat"><div><span>남은 지뢰</span><b id="ms-left">40</b></div><div><span>시간</span><b id="ms-time">0:00</b></div><div><span>연속</span><b><span id="ms-streak" style="display:inline;font-size:inherit;color:inherit">0</span>일</b></div></div>
<p class="muted" style="margin:0;text-align:center;font-size:13px"><span id="ms-date"></span> · <span id="ms-last"></span></p>
<div id="ms-wrap"><div id="ms-board" role="grid" aria-label="지뢰찾기 판"></div></div>
<div class="bar"><button class="btn" id="ms-flag" type="button" aria-pressed="false">🚩 깃발 모드</button><button class="btn" id="ms-q" type="button" aria-pressed="false" title="깃발을 한 번 더 누르면 물음표">? 물음표</button><button class="btn" id="ms-reset" type="button">↻ 다시</button></div>
<p class="muted" style="font-size:13px;margin:4px 0 0">탭=열기 · 길게 누르기/오른쪽 클릭=깃발 · 열린 숫자 탭=주변 한꺼번에 열기</p></div>
<div class="dlg" id="ms-done" hidden role="dialog" aria-label="결과"><div class="card"><h2 style="margin-top:0" id="ms-title"></h2><p id="ms-result"></p><textarea id="ms-share-text" readonly aria-label="공유 글"></textarea><div class="cta" style="justify-content:center"><button class="btn pri" id="ms-copy" type="button">결과 복사</button><button class="btn" id="ms-again" type="button">다시 도전</button><button class="btn" id="ms-close" type="button">닫기</button></div><p class="muted" style="font-size:13px">공유는 선택이에요.</p></div></div>
<script type="module" src="/js/puzzle-mines.js"></script>`,
};

const SEEALSO = {
  'wg-hub': `<div class="cta"><a class="btn pri" href="${href('단어묶음/오늘/')}">오늘의 단어 묶음 풀기</a><a class="btn" href="${href('단어묶음/어제/')}">어제 정답</a></div>`,
  'wg-play': `<p class="muted">규칙은 <a href="${href('단어묶음/')}">단어 묶음 안내</a>, 지난 판은 <a href="${href('단어묶음/어제/')}">어제 정답</a>에서 볼 수 있어요.</p>`,
  'wg-yest': `<div class="cta"><a class="btn pri" href="${href('단어묶음/오늘/')}">오늘의 단어 묶음 풀기</a></div>`,
  g2048: '', sol: '', nono: '',
  'sd-hub': `<div class="cta"><a class="btn pri" href="${href('스도쿠/오늘/')}">오늘의 스도쿠 풀기</a><a class="btn" href="${href('지뢰찾기/오늘/')}">오늘의 지뢰찾기</a></div>`,
  'ms-hub': `<div class="cta"><a class="btn pri" href="${href('지뢰찾기/오늘/')}">오늘의 지뢰찾기 하기</a><a class="btn" href="${href('스도쿠/오늘/')}">오늘의 스도쿠</a></div>`,
  'sd-play': `<p class="muted">규칙이 헷갈리면 <a href="${href('스도쿠/')}">스도쿠 규칙과 풀이 요령</a>을 읽어 보세요.</p>`,
  'ms-play': `<p class="muted">규칙이 헷갈리면 <a href="${href('지뢰찾기/')}">지뢰찾기 규칙과 풀이 요령</a>을 읽어 보세요.</p>`,
};
const PAGE_OF = { '단어묶음/': 'wg-hub', '단어묶음/오늘/': 'wg-play', '단어묶음/어제/': 'wg-yest', '2048/': 'g2048', '솔리테어/': 'sol', '노노그램/': 'nono', '스도쿠/': 'sd-hub', '스도쿠/오늘/': 'sd-play', '지뢰찾기/': 'ms-hub', '지뢰찾기/오늘/': 'ms-play' };
const NAME = { 'wg-hub': '단어 묶음', 'wg-play': '오늘의 단어 묶음', 'wg-yest': '단어 묶음 어제 정답', g2048: '오늘의 2048', sol: '오늘의 솔리테어', nono: '오늘의 노노그램', 'sd-hub': '스도쿠', 'sd-play': '오늘의 스도쿠', 'ms-hub': '지뢰찾기', 'ms-play': '오늘의 지뢰찾기' };
const OTHER_HUB = { 단어묶음: ['스도쿠/', '스도쿠'], '2048': ['단어묶음/', '단어 묶음'], 솔리테어: ['2048/', '2048'], 노노그램: ['솔리테어/', '솔리테어'], 스도쿠: ['지뢰찾기/', '지뢰찾기'], 지뢰찾기: ['스도쿠/', '스도쿠'] };

function page(suf) {
  const key = PAGE_OF[suf], t = T[key], play = key.endsWith('play') || key.endsWith('yest') || ['g2048', 'sol', 'nono'].includes(key), single = ['g2048', 'sol', 'nono'].includes(key), group = suf.split('/')[0];
  const sec = t.sections.map(([h, ps]) => `<h2>${esc(h)}</h2>${ps.map((p) => `<p>${esc(p)}</p>`).join('')}`).join('');
  const faq = `<section class="faq"><h2>자주 묻는 질문</h2>${t.faq.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join('')}</section>`;
  const ld = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'Game', name: NAME[key], description: t.desc, numberOfPlayers: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 1 }, gamePlatform: ['Web Browser'], inLanguage: 'ko', url: abs(suf), offers: { '@type': 'Offer', price: 0, priceCurrency: 'KRW' } },
    { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: '매일웹겜', item: SITE + '/ko/' }, ...(play && !single ? [{ '@type': 'ListItem', position: 2, name: group, item: abs(group + '/') }, { '@type': 'ListItem', position: 3, name: NAME[key], item: abs(suf) }] : [{ '@type': 'ListItem', position: 2, name: group, item: abs(suf) }])] },
    FAQ_LD(t.faq)] };
  const [oh, on] = OTHER_HUB[group];
  const body = play ? `<h1>${esc(t.h1)}</h1><p class="muted">${esc(t.lead)}</p>${GAMES[key]}${SEEALSO[key]}${sec}${faq}` : `<h1>${esc(t.h1)}</h1><p>${esc(t.lead)}</p>${SEEALSO[key]}${sec}${faq}`;
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#07080c">
<title>${esc(t.title)}</title><meta name="description" content="${esc(t.desc)}"><link rel="canonical" href="${abs(suf)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="매일웹겜"><meta property="og:title" content="${esc(t.title)}"><meta property="og:description" content="${esc(t.desc)}"><meta property="og:image" content="${SITE}/og/site-ko.png"><meta property="og:url" content="${abs(suf)}"><meta property="og:locale" content="ko_KR"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg"><script src="/js/gev.js"></script><style>${CSS}</style><script type="application/ld+json">${JSON.stringify(ld)}</script></head>
<body data-page="${key}" data-lang="ko"><header class="top"><a class="logo" href="/ko/"><i></i>매일웹겜</a><a href="${href(oh)}" class="muted">${on} →</a></header>
<main class="wrap">${body}${NAV}</main><footer>© 매일웹겜 · playtoday.cloud · <a href="/ko/about/">소개</a> · <a href="/ko/privacy/">개인정보</a></footer><script src="/js/puzzle-ev.js"></script></body></html>`;
  const dir = `${ROOT}public/ko/${suf}`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}index.html`, html);
  return abs(suf);
}

export function buildPuzzle() { return PUZZLE_PATHS.map(page); }

// 홈(ko) '오늘의 퍼즐 3종' 카드. 연속·오늘 기록은 puzzle-home.js 가 localStorage 에서 채운다.
export const PUZZLE_HOME = `<section class="pz-home" aria-label="오늘의 퍼즐"><h2 style="margin:6px 0 8px;font-size:20px">오늘의 퍼즐 3종 <span class="muted" style="font-size:13px;font-weight:400">매일 새 판</span></h2>
<div class="hubgrid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px">
<a class="card" data-pz="sudoku" href="${href('스도쿠/오늘/')}" style="text-decoration:none;color:inherit"><b style="font-size:18px">🔢 오늘의 스도쿠</b><p class="muted" style="margin:4px 0">쉬움·보통·어려움, 해는 단 하나</p><p style="margin:0;font-size:13px"><span data-pz-last>오늘 기록 없음</span> · 🔥 <span data-pz-streak>0</span>일</p></a>
<a class="card" data-pz="minesweeper" href="${href('지뢰찾기/오늘/')}" style="text-decoration:none;color:inherit"><b style="font-size:18px">💣 오늘의 지뢰찾기</b><p class="muted" style="margin:4px 0">첫 클릭은 항상 안전</p><p style="margin:0;font-size:13px"><span data-pz-last>오늘 기록 없음</span> · 🔥 <span data-pz-streak>0</span>일</p></a>
<a class="card" data-pz="wordgroup" href="${href('단어묶음/오늘/')}" style="text-decoration:none;color:inherit"><b style="font-size:18px">🧩 오늘의 단어 묶음</b><p class="muted" style="margin:4px 0">16개 단어를 4묶음으로</p><p style="margin:0;font-size:13px"><span data-pz-last>오늘 기록 없음</span> · 🔥 <span data-pz-streak>0</span>일</p></a></div>
<p class="muted" style="margin:10px 0 0;font-size:14px">더 많은 퍼즐: <a href="${href('2048/')}">2048</a> · <a href="${href('솔리테어/')}">솔리테어</a> · <a href="${href('노노그램/')}">노노그램</a> · <a href="${href('단어묶음/어제/')}">단어 묶음 어제 정답</a></p></div>
<p class="muted" style="margin:8px 0 14px;font-size:14px"><a href="${href('스도쿠/')}">스도쿠 규칙·요령</a> · <a href="${href('지뢰찾기/')}">지뢰찾기 규칙·요령</a></p>
<script type="module" src="/js/puzzle-home.js"></script></section>`;
export const PUZZLE_FOOTER_LINKS = `<a href="${href('스도쿠/오늘/')}">오늘의 스도쿠</a><a href="${href('지뢰찾기/오늘/')}">오늘의 지뢰찾기</a><a href="${href('단어묶음/오늘/')}">오늘의 단어 묶음</a><a href="${href('2048/')}">2048</a><a href="${href('솔리테어/')}">솔리테어</a><a href="${href('노노그램/')}">노노그램</a>`;

if (import.meta.url === `file://${process.argv[1]}`) console.log(buildPuzzle().join('\n'));
