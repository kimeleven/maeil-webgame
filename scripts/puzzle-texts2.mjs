// 오늘의 퍼즐 2차 페이지 본문·마크업 (t_49b0ed25): 단어묶음 · 어제 정답 · 2048 · 솔리테어 · 노노그램. 페이지마다 본문 1,000자 이상 + FAQ.
export const T2 = {
  'wg-hub': {
    title: '단어 묶음 퍼즐 — 16개 단어를 4묶음으로, 매일 새 판 | 매일웹겜', desc: '16개 한국어 단어를 공통점이 같은 4묶음으로 나누는 무료 퍼즐. 4번 틀리면 끝, 매일 새 판과 어제 정답까지.',
    h1: '단어 묶음 — 16개 단어, 4개의 공통점', lead: '화면에 섞여 있는 16개 단어를 공통점이 같은 네 개씩 묶는 분류 퍼즐이에요. 설치도 가입도 없이 바로 풀 수 있고, 날짜가 바뀌면 새 판이 열려요.',
    sections: [
      ['단어 묶음 규칙', ['16개의 한국어 단어가 4×4 칸에 섞여 나와요. 이 중 공통점이 같은 단어 네 개를 골라 제출 버튼을 누르면 돼요. 맞으면 그 묶음의 이름이 공개되고 칸에서 사라져요. 네 묶음을 모두 찾으면 클리어예요.', '틀린 제출이 네 번이 되면 게임이 끝나고 정답이 공개돼요. 세 개는 같은 묶음인데 하나만 다르면 한 개 차이라고 알려 줘요. 이 힌트를 믿고 하나만 바꿔 보세요.']],
      ['난이도 색깔', ['묶음은 노랑, 초록, 파랑, 보라 네 가지 난이도로 나뉘어요. 노랑은 과일이나 가족 호칭처럼 누구나 아는 분류이고, 초록은 한국의 산이나 십이지처럼 조금 더 아는 만큼 보이는 분류예요. 파랑은 서양 악기나 보석처럼 전문 어휘가 섞이고, 보라는 앞이나 뒤에 같은 글자를 붙여 새 단어를 만드는 말놀이예요.', '가장 쉬운 노랑부터 풀면 남은 단어가 줄어서 어려운 묶음이 오히려 쉬워져요. 단어 하나가 두 묶음에 모두 어울려 보이는 함정이 있으니, 확신이 서는 묶음부터 제출하세요.']],
      ['풀이 요령', ['제출하기 전에 먼저 눈으로 후보를 찾아보세요. 같은 범주로 보이는 단어가 다섯 개 이상이면 그중 하나는 다른 묶음의 단어예요. 이럴 때는 그 단어가 다른 묶음에도 어울리는지 살펴보면 정답이 좁혀져요.', '보라 말놀이는 단어 뜻이 아니라 글자를 보세요. 단어 앞에 같은 글자를 붙여서 말이 되는지 하나씩 대 보면 쉽게 찾아져요. 섞기 버튼으로 칸의 순서를 바꾸면 새로운 연결이 보이기도 해요.']],
      ['오늘의 단어 묶음은 이렇게 달라요', ['한국 시간 기준 날짜마다 판이 정해져 같은 날에는 누구나 같은 판을 풀어요. 완료하면 오답 횟수와 힌트가 기록되고 연속으로 클리어한 날수가 쌓여요. 결과는 단어를 숨긴 색깔 칸으로만 공유돼서 정답이 노출되지 않아요.', '전날 판의 정답은 어제 정답 페이지에서 확인할 수 있어요. 스포일러를 피할 수 있게 접어 두었으니 풀고 나서 펼쳐 보세요.']],
      ['이런 분께 맞아요', ['단어 묶음은 점심시간이나 출퇴근길처럼 짧은 틈에 하기 좋은 퍼즐이에요. 한 판이 보통 몇 분이면 끝나고, 어휘력과 연상력을 함께 쓰는 재미가 있어요. 혼자 풀어도 좋고 가족이나 친구와 같은 판을 풀고 답을 비교해도 즐거워요. 한글 단어만 쓰기 때문에 한국어를 공부하는 분께도 어휘 연습이 돼요.']],
    ],
    faq: [['단어 묶음은 무료인가요?', '네, 모두 무료이고 가입이 필요 없어요.'], ['몇 번까지 틀릴 수 있나요?', '네 번 틀리면 끝나고 정답이 공개돼요.'], ['같은 날 모두 같은 판인가요?', '네. 한국 시간 날짜로 판이 정해져요.'], ['어제 판의 정답은 어디서 보나요?', '어제 정답 페이지에서 접힌 정답을 펼쳐 볼 수 있어요.']],
  },
  'wg-play': {
    title: '오늘의 단어 묶음 — 16개 단어 4묶음 분류 퍼즐 | 매일웹겜', desc: '오늘 날짜 단어 묶음 한 판. 4번 틀리면 종료, 한 개 차이 힌트, 결과 공유와 연속 기록. 설치·가입 없이 무료.',
    h1: '오늘의 단어 묶음', lead: '네 개씩 공통점이 같은 단어를 골라 제출하세요. 네 번 틀리면 끝나요.',
    sections: [
      ['이렇게 풀어요', ['단어 칸을 눌러 네 개를 고르면 제출 버튼이 켜져요. 잘못 고른 칸은 다시 누르면 선택이 풀리고, 선택 해제 버튼으로 한 번에 비울 수도 있어요. 맞히면 윗줄에 묶음 이름과 단어가 색깔 띠로 쌓여요.', '남은 칸이 헷갈리면 섞기를 눌러 배치를 바꿔 보세요. 힌트를 누르면 아직 못 찾은 묶음 중 가장 쉬운 묶음의 이름을 알려 주고, 힌트 횟수는 기록에 남아요.']],
      ['오답과 한 개 차이', ['틀리면 위쪽의 남은 기회 표시가 하나씩 줄어요. 네 개 중 세 개가 같은 묶음이면 한 개 차이라고 알려 주니, 그 말은 선택한 네 단어 중 하나만 바꾸면 정답이라는 뜻이에요. 어느 단어를 바꿀지는 남은 단어에서 찾아보세요.', '기회를 모두 쓰면 정답이 공개되고 그날 판은 끝나요. 다음 날 새 판이 열리면 다시 도전할 수 있어요.']],
      ['연속 기록과 공유', ['판을 클리어하면 연속 도전일이 하루 늘어요. 하루를 건너뛰면 1일부터 다시 시작해요. 실패한 날은 기록을 줄이지 않지만 연속 일수도 늘지 않아요.', '결과 공유 글에는 제출한 순서대로 난이도 색깔 칸만 들어가고 단어는 나오지 않아요. 공유는 선택이라서 하지 않아도 다음 판을 풀 수 있어요. 기록은 이 기기의 브라우저에만 저장돼요.']],
      ['처음 하는 분께', ['처음에는 노랑 묶음, 곧 가장 쉬운 분류부터 찾아보세요. 과일이나 동물처럼 이름만 봐도 한 번에 묶이는 단어가 대개 있어요. 한 개 차이 알림을 받으면 당황하지 말고 의심스러운 단어 하나만 바꿔 보세요. 어려운 보라 묶음은 마지막에 남는 단어들이니 서두르지 않아도 돼요. 하루 한 판이면 충분해요.']],
      ['자주 하는 실수', ['가장 흔한 실수는 단어 하나의 뜻만 보고 서둘러 제출하는 거예요. 같은 단어가 두 묶음에 모두 어울려 보이는 경우가 많으니, 남은 열여섯 단어를 한 번 훑어서 이 단어가 정말 이 묶음에만 맞는지 확인하세요. 또 한 번 틀리면 같은 조합을 다시 고르지 않도록 기억해 두는 것도 중요해요. 한 개 차이 알림을 받은 조합은 그중 한 단어만 바꾸면 되니 그 점을 활용하세요.']],
      ['모바일에서 하는 법', ['모바일에서는 단어 칸을 손가락으로 가볍게 누르면 선택돼요. 칸이 작게 느껴지면 화면을 세로로 두고 천천히 눌러 보세요. 제출 버튼은 네 개를 골랐을 때만 눌려요. 풀던 판은 브라우저에 저장되니 다른 앱을 보다가 돌아와도 이어서 할 수 있어요.']],
    ],
    faq: [['힌트는 몇 번 쓸 수 있나요?', '횟수 제한은 없지만 쓴 횟수가 기록에 남아요.'], ['중간에 나가도 이어서 하나요?', '네. 같은 날 돌아오면 푼 묶음과 오답 횟수가 그대로예요.'], ['날짜는 언제 바뀌나요?', '한국 시간 0시에 새 판이 열려요.']],
  },
  'wg-yest': {
    title: '단어 묶음 어제 정답 — 어제의 4묶음 정답 보기 | 매일웹겜', desc: '어제 단어 묶음 퍼즐의 정답. 스포일러를 피할 수 있게 접어 두었어요. 펼치면 4개 묶음과 단어가 보여요.',
    h1: '단어 묶음 — 어제 정답', lead: '어제 판의 정답이에요. 아직 오늘 판을 풀지 않았다면 먼저 풀고 오세요. 정답은 접혀 있어요.',
    sections: [
      ['정답 보는 법', ['아래 정답 보기 버튼을 누르면 어제 판의 네 개 묶음과 단어가 펼쳐져요. 한 번 펼친 뒤 다시 누르면 접혀서 가릴 수 있어요. 오늘 판을 풀기 전에는 열지 않는 것을 권해요. 어제와 오늘 판은 서로 다른 묶음이라 정답을 알아도 오늘 판에 도움이 되지는 않아요.']],
      ['이 페이지를 쓰는 법', ['매일 오늘의 단어 묶음을 푼 다음 어제 판을 이 페이지에서 확인하면 복습이 돼요. 내가 고른 조합과 실제 정답을 비교하면 어떤 분류에서 자주 틀렸는지 알 수 있어요. 노랑은 쉬운데 보라에서만 막힌다면 말놀이 묶음을 따로 연습해 보세요. 친구와 같은 판을 풀었다면 정답을 함께 보며 이야기해 보는 것도 재미있어요.']],
      ['정답을 보고 배우기', ['못 푼 묶음이 있었다면 정답의 묶음 이름과 단어를 함께 보세요. 보라 말놀이는 같은 글자를 앞뒤에 붙여 새 단어를 만드는 규칙이 반복돼서, 몇 번 보면 패턴이 눈에 익어요. 초록과 파랑 묶음은 한국의 지리나 전통, 일상 전문 어휘가 자주 나와요. 모르는 단어는 이번 기회에 뜻을 찾아 두면 다음 판에서 쓸모가 있어요.', '정답 페이지는 날짜가 바뀌면 자동으로 그 전날 판을 보여 줘요. 매일 새로운 어제 정답이 열리니 틀린 판을 복습하는 용도로 활용해 보세요.']],
      ['정답 페이지 이용 팁', ['정답은 한국 시간 기준 어제 날짜의 판을 보여 줘요. 자정을 넘기기 전까지는 전날 판의 정답이 이 페이지에 그대로 있어요. 아직 풀지 못한 판이 있어도 지난 판은 새로 풀 수 없으니, 정답을 보고 어떤 분류였는지 익혀 두는 정도로 활용하세요.']],
      ['오늘 판으로 돌아가기', ['정답을 확인했다면 오늘의 단어 묶음에서 새 판에 도전해 보세요. 스도쿠, 지뢰찾기, 2048, 솔리테어, 노노그램도 매일 새 판이 열려요. 같은 날 여러 퍼즐을 풀면서 연속 기록을 함께 쌓을 수 있어요. 연속 기록은 이 기기의 브라우저에 저장돼요.']],
      ['이런 분께 맞아요', ['어제 판을 놓친 분, 풀다가 막혀서 정답이 궁금한 분, 보라 말놀이의 규칙을 복습하고 싶은 분께 이 페이지가 도움이 돼요. 정답은 접혀 있어서 원하지 않으면 볼 일이 없고, 열고 싶을 때만 열면 돼요. 이 페이지를 본다고 오늘의 기록이 바뀌지는 않아요.']],
    ],
    faq: [['정답은 왜 접혀 있나요?', '아직 어제 판을 풀지 않은 분이 실수로 보지 않도록 스포일러를 막아 둔 거예요.'], ['더 옛날 정답도 볼 수 있나요?', '지금은 바로 전날 판만 보여 줘요.'], ['정답을 보면 기록이 바뀌나요?', '아니요. 정답을 펼쳐도 기록에는 영향이 없어요.']],
  },
  g2048: {
    title: '2048 무료 — 오늘의 2048, 날짜마다 새 판 | 매일웹겜', desc: '설치·가입 없이 하는 무료 2048 퍼즐. 방향키·스와이프, 날짜 시드 새 타일, 최고 점수 기록.',
    h1: '오늘의 2048 — 같은 숫자를 합쳐 2048 만들기', lead: '같은 숫자 타일이 부딪치면 합쳐지는 숫자 퍼즐이에요. 날짜가 바뀌면 새 판이 열리고, 같은 날에는 같은 순서로 새 타일이 나와요.',
    sections: [
      ['2048 규칙', ['4×4 칸에서 방향키나 화면 스와이프로 모든 타일을 한쪽으로 밀어요. 같은 숫자 두 개가 부딪치면 합쳐져 두 배가 돼요. 2와 2가 만나면 4가 되고 4와 4가 만나면 8이 되는 식이에요.', '한 번 움직일 때마다 빈 칸에 2나 4 타일이 새로 나와요. 2048 타일을 만들면 성공이고, 칸이 가득 차서 더 움직일 수 없으면 끝나요.']],
      ['요령', ['가장 큰 타일을 한 모서리에 고정해 두는 것이 기본이에요. 예를 들어 오른쪽 아래 구석을 큰 숫자 자리로 정하면 아래와 오른쪽 방향으로만 주로 움직이고, 반대 방향은 꼭 필요할 때만 써요. 큰 타일이 한가운데로 나오면 정리하기가 갑자기 어려워져요.', '한 줄을 큰 수부터 작은 수 순서로 줄 세우면 합치기가 연쇄로 일어나요. 빈 칸을 아끼는 것도 중요해서, 같은 숫자를 보이는 대로 서둘러 합치기보다 합칠 순서를 한 수 앞서 생각하세요.']],
      ['오늘의 2048은 이렇게 달라요', ['새 타일의 위치와 숫자가 날짜와 이동 횟수로 정해져서, 같은 날에 똑같이 움직이면 모두 같은 판이 나와요. 판이 막히면 다시 시작해서 같은 날의 같은 시작점에서 다른 길로 도전해 볼 수 있어요.', '2048을 만들거나 더 움직일 수 없을 때 최고 타일과 점수가 기록되고, 하루를 이어서 도전한 연속 기록이 쌓여요. 결과 공유 글은 최고 타일과 점수만 보여 줘요.']],
      ['처음 하는 분께', ['처음에는 2048을 목표로 하기보다 512나 1024까지 가 보는 것을 목표로 하세요. 한 방향 키를 연타하지 말고 방향 두 개를 번갈아 쓰면 타일이 한쪽에 쌓여요. 화면이 작은 모바일에서는 보드 위에서 손가락을 짧게 밀면 돼요. 한 판이 길지 않아서 짬이 날 때마다 해 보기 좋아요.']],
      ['모바일과 키보드', ['컴퓨터에서는 방향키로, 모바일에서는 보드 위를 손가락으로 밀어 움직여요. 보드 아래의 방향 버튼도 쓸 수 있어서 스와이프가 어려운 환경에서도 편하게 할 수 있어요. 한 판은 보통 몇 분이면 끝나고, 풀던 판은 브라우저에 저장돼요.']],
    ],
    faq: [['2048은 무료인가요?', '네, 설치와 가입 없이 무료로 할 수 있어요.'], ['모바일에서 어떻게 움직이나요?', '보드 위에서 손가락으로 밀어 방향을 정하세요. 아래 방향 버튼도 쓸 수 있어요.'], ['2048을 만든 뒤에도 계속할 수 있나요?', '결과 창을 닫고 계속 움직여서 더 높은 타일에 도전할 수 있어요.']],
  },
  sol: {
    title: '솔리테어 무료 — 오늘의 클론다이크 카드 게임 | 매일웹겜', desc: '설치·가입 없이 하는 무료 솔리테어(클론다이크). 1장 뽑기, 날짜마다 같은 카드 배치, 되돌리기와 연속 기록.',
    h1: '오늘의 솔리테어 — 카드를 모두 위로 올리세요', lead: '가장 유명한 한 사람 카드 게임, 클론다이크 솔리테어예요. 날짜마다 카드 배치가 정해져 같은 날에는 누구나 같은 판을 풀어요.',
    sections: [
      ['솔리테어 규칙', ['카드 52장을 A부터 K까지 무늬별로 오른쪽 위의 네 칸에 차례로 쌓으면 클리어예요. 아래 일곱 개의 줄에서는 빨간 카드와 검은 카드를 번갈아 가며 큰 숫자에서 작은 숫자 순으로 이어 붙일 수 있어요. 예를 들어 검은 7 위에 빨간 6을 올릴 수 있어요.', '왼쪽 위의 더미를 누르면 한 장씩 뽑아 옆에 펼쳐요. 더미가 비면 한 번 더 누를 때 펼친 카드가 다시 더미가 돼요. 빈 줄에는 K와 K에 이어진 카드 묶음만 놓을 수 있어요.']],
      ['조작법', ['옮길 카드를 누르면 강조 표시가 되고, 이어서 옮길 줄이나 칸을 누르면 규칙에 맞을 때만 이동해요. 줄 중간의 카드를 누르면 그 카드와 아래에 이어진 카드를 한꺼번에 옮겨요. 같은 카드를 한 번 더 누르면 기초 칸으로 바로 올라가요.', '뒤집힌 카드는 그 위의 카드를 다른 줄로 옮겨서 맨 위로 드러나야 열려요. 잘못 옮겼다면 되돌리기 버튼으로 한 수씩 취소할 수 있어요.']],
      ['요령', ['뒤집힌 카드가 가장 많은 줄을 먼저 열어 보세요. 숨은 카드가 풀릴수록 선택지가 늘어나요. 에이스와 2는 보이면 바로 기초 칸으로 올려도 손해가 없지만, 큰 숫자를 너무 일찍 올리면 줄에 이어 붙일 자리가 사라질 수 있어요.', '빈 줄은 K가 나올 때까지 비워 두는 편이 좋아요. 뽑은 카드를 급하게 쓰기보다 뽑기 더미를 한 바퀴 돌려 어떤 카드가 있는지 확인한 뒤 가장 도움이 되는 수를 고르세요.']],
      ['오늘의 솔리테어는 이렇게 달라요', ['날짜를 씨앗으로 카드를 섞어서 같은 날에는 누구나 같은 배치예요. 모든 판이 반드시 풀리는 것은 아니에요. 클리어하면 사용한 수가 기록되고 연속 도전일이 늘어요. 다시 하기를 누르면 같은 날의 같은 배치로 처음부터 도전해요.']],
      ['모바일에서 하는 법', ['모바일에서는 카드를 가볍게 탭해서 고르고, 옮길 곳을 탭하면 돼요. 줄이 길어져서 화면에 다 안 보이면 위아래로 스크롤하세요. 카드 글씨가 작게 느껴지면 화면을 세로로 두고 천천히 눌러 보세요. 풀던 판은 브라우저에 저장돼서 이어서 할 수 있어요.']],
    ],
    faq: [['솔리테어는 무료인가요?', '네, 설치와 가입 없이 무료로 할 수 있어요.'], ['한 장씩 뽑나요, 세 장씩 뽑나요?', '한 장씩 뽑는 쉬운 규칙이에요.'], ['모든 판을 풀 수 있나요?', '아니요. 카드 배치에 따라 풀리지 않는 판도 있어요.'], ['되돌리기는 몇 번 가능한가요?', '최근 200수까지 한 수씩 되돌릴 수 있어요.']],
  },
  nono: {
    title: '노노그램 무료 — 오늘의 노노그램, 5×5·10×10 | 매일웹겜', desc: '숫자 힌트로 그림을 맞히는 무료 노노그램. 5×5 쉬움, 10×10 보통, 날짜마다 새 판과 연속 기록.',
    h1: '오늘의 노노그램 — 숫자 힌트로 그림 맞히기', lead: '줄 옆의 숫자 힌트만 보고 어떤 칸이 칠해져 있는지 맞히는 논리 퍼즐이에요. 날짜가 바뀌면 새 판이 열려요.',
    sections: [
      ['노노그램 규칙', ['가로줄 왼쪽과 세로줄 위쪽에 적힌 숫자는 그 줄에서 연속으로 칠해진 칸의 개수예요. 예를 들어 3 1이라면 칸이 세 개 이어서 칠해지고 한 칸 이상 띄운 뒤 한 칸이 칠해진다는 뜻이에요. 0은 그 줄에 칠할 칸이 없다는 뜻이에요.', '모든 줄의 힌트를 만족하게 칸을 채우면 완성이에요. 5×5는 쉬움, 10×10은 보통이에요. 오늘의 판은 그림 하나와 똑같이 맞히는 것이 아니라 모든 줄 힌트를 만족하면 인정돼요.']],
      ['풀이 요령', ['힌트 합이 줄 길이에 가까운 줄부터 보세요. 5칸 줄에 4가 적혀 있으면 가운데 세 칸은 어느 쪽으로 밀어도 칠해지니 확실해요. 칠하지 않을 칸이 확실하면 ✕ 모드를 켜고 표시해 두세요. ✕ 표시는 정답 판정에 쓰이지 않고 헷갈리지 않게 돕는 메모예요.', '가로 줄과 세로 줄의 정보를 번갈아 보면서 확실한 칸을 늘리는 것이 핵심이에요. 한 줄에서 막히면 다른 줄로 넘어가세요. 10×10 판은 5칸마다 굵은 선이 있어 위치를 세기 편해요.']],
      ['자주 하는 실수', ['가장 흔한 실수는 확신 없이 칸을 칠하는 거예요. 한 칸이 틀리면 그 줄과 열의 판단이 모두 어긋나서 나중에 모순이 생겨요. 확실한 칸만 칠하고, 모순이 생기면 가장 최근에 칠한 칸부터 의심하세요. 또 칠할 칸만 신경 쓰고 비어 있어야 하는 칸을 표시하지 않으면 같은 줄을 여러 번 다시 계산하게 돼요. ✕ 표시를 적극적으로 쓰는 것이 시간을 줄이는 지름길이에요.']],
      ['기록과 공유', ['완성하면 걸린 시간이 기록되고 연속 도전일이 하루 늘어요. 하루를 건너뛰면 1일부터 다시 시작해요. 풀던 판은 같은 날 같은 난이도에서 이어서 풀 수 있어요.', '공유 글에는 난이도와 시간만 들어가고 정답 그림은 나오지 않아요. 공유는 선택이에요. 기록은 이 기기의 브라우저에만 저장돼요.']],
      ['처음 하는 분께', ['처음에는 5×5 쉬운 판으로 규칙을 익히세요. 숫자가 5나 0인 줄은 바로 풀려요. 칸을 눌러 칠하고 다시 누르면 지워져요. 모르는 칸을 억지로 칠하지 말고 확실한 칸부터 채우면 나머지가 차례로 풀려요. 하루 한 판으로 천천히 속도를 올려 보세요.']],
    ],
    faq: [['노노그램은 무료인가요?', '네, 설치와 가입 없이 무료로 할 수 있어요.'], ['정답 그림과 다르면 틀린 건가요?', '모든 줄 힌트를 만족하면 완성으로 인정돼요.'], ['✕ 표시는 뭔가요?', '칠하지 않을 칸을 기억해 두는 메모예요. 판정에는 쓰이지 않아요.']],
  },
};

export const CSS2 = `.wg-g{border-radius:14px;padding:10px 12px;margin:6px 0;text-align:center;color:#0b0c10}.wg-g b{display:block}.wg-g span{font-size:14px}.wg-l0{background:#facc15}.wg-l1{background:#4ade80}.wg-l2{background:#60a5fa}.wg-l3{background:#c084fc}
#wg-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:8px 0}.wg-w{min-height:64px;padding:4px;border-radius:14px;border:1px solid var(--edge);background:linear-gradient(rgba(255,255,255,.12),rgba(255,255,255,.04));color:var(--fg);font:700 clamp(14px,4vw,18px)/1.2 inherit;cursor:pointer;word-break:keep-all}.wg-w.on{background:rgba(79,70,229,.65);border-color:var(--cyan)}#wg-msg{min-height:24px;text-align:center;margin:4px 0}#wg-dots{letter-spacing:4px;color:var(--cyan)}
#g-board{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;width:min(100%,400px);aspect-ratio:1;margin:8px auto;padding:8px;border-radius:16px;background:var(--panel);border:1px solid var(--edge);touch-action:none;user-select:none}.g-t{display:flex;align-items:center;justify-content:center;border-radius:10px;background:rgba(255,255,255,.06);font:800 clamp(18px,6vw,30px)/1 inherit;color:var(--fg)}
.g-v2{background:#334155}.g-v4{background:#475569}.g-v8{background:#0e7490}.g-v16{background:#0891b2}.g-v32{background:#4f46e5}.g-v64{background:#6d28d9}.g-v128{background:#a21caf;font-size:clamp(16px,5vw,26px)}.g-v256{background:#be185d;font-size:clamp(16px,5vw,26px)}.g-v512{background:#c2410c;font-size:clamp(16px,5vw,26px)}.g-v1024{background:#ca8a04;font-size:clamp(14px,4.4vw,22px)}.g-v2048,.g-v4096{background:var(--gold);color:#0b0c10;font-size:clamp(14px,4.4vw,22px)}
.dirs{display:grid;grid-template-columns:repeat(3,56px);gap:6px;justify-content:center;margin:6px auto}.dirs .btn{padding:0}.dirs .up{grid-column:2}
#n-board{display:grid;grid-template-columns:auto repeat(var(--n),1fr);gap:1px;width:min(100%,460px);margin:8px auto;user-select:none;touch-action:manipulation}.n-ch,.n-rh{display:flex;align-items:flex-end;justify-content:center;font-size:12px;line-height:1.1;color:var(--muted);font-variant-numeric:tabular-nums;text-align:center}.n-rh{justify-content:flex-end;padding-right:6px;white-space:nowrap;align-items:center}.n-c{aspect-ratio:1;min-width:0;border:0;padding:0;background:var(--panel);color:var(--muted);font:700 14px/1 inherit;cursor:pointer}.n-c.on{background:var(--cyan)}.n-c.br{border-right:2px solid var(--fg)}.n-c.bb{border-bottom:2px solid var(--fg)}
#s-top,#s-tab{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;align-items:start;margin:6px 0}#s-top .gap{grid-column:span 1}.s-found{display:contents}.s-col{min-height:64px;display:flex;flex-direction:column;position:relative}.s-card{display:block;width:100%;aspect-ratio:3/4;min-height:48px;border-radius:7px;border:1px solid var(--edge);background:#e8eaf2;color:#111827;font:800 clamp(11px,3.4vw,16px)/1 inherit;padding:3px 2px 0;text-align:left;cursor:pointer}.s-card.red{color:#dc2626}.s-card.back{background:repeating-linear-gradient(45deg,#4f46e5,#4f46e5 4px,#3730a3 4px,#3730a3 8px)}.s-col .s-card+.s-card{margin-top:calc(-0.75 * min(15vw,100px))}.s-col .s-card{aspect-ratio:3/4}.s-card.sel{outline:3px solid var(--cyan);z-index:2}.s-slot{display:flex;align-items:center;justify-content:center;width:100%;aspect-ratio:3/4;border:1px dashed var(--edge);border-radius:7px;color:var(--muted);background:transparent;font-size:16px}`;

const dlg = (p, title, extra = '') => `<div class="dlg" id="${p}-done" hidden role="dialog" aria-label="결과"><div class="card"><h2 style="margin-top:0" id="${p}-title">${title}</h2><p id="${p}-result"></p><textarea id="${p}-share-text" readonly aria-label="공유 글"></textarea><div class="cta" style="justify-content:center"><button class="btn pri" id="${p}-copy" type="button">결과 복사</button>${extra}<button class="btn" id="${p}-close" type="button">닫기</button></div><p class="muted" style="font-size:13px">공유는 선택이에요. 안 해도 다음 판을 바로 할 수 있어요.</p></div></div>`;
const statRow = (a, b, c) => `<div class="stat"><div><span>${a[0]}</span><b id="${a[1]}">${a[2]}</b></div><div><span>${b[0]}</span><b id="${b[1]}">${b[2]}</b></div><div><span>연속</span><b><span id="${c}" style="display:inline;font-size:inherit;color:inherit">0</span>일</b></div></div>`;

export const GAMES2 = {
  'wg-play': `<div class="card" id="wg-app">${statRow(['남은 기회', 'wg-left', '4'], ['오답', 'wg-dots', '○○○○'], 'wg-streak')}
<p class="muted" style="margin:0;text-align:center;font-size:13px"><span id="wg-date"></span> · <span id="wg-last"></span></p>
<div id="wg-solved"></div><div id="wg-grid" role="group" aria-label="단어 16개"></div><p id="wg-msg" role="status" aria-live="polite"></p>
<div class="bar"><button class="btn pri" id="wg-submit" type="button" disabled>제출</button><button class="btn" id="wg-clear" type="button" disabled>선택 해제</button><button class="btn" id="wg-shuf" type="button">🔀 섞기</button><button class="btn" id="wg-hint" type="button">💡 힌트</button></div></div>
${dlg('wg', '완료')}<script type="module" src="/js/puzzle-words.js"></script>`,
  'wg-yest': `<div class="card"><p>어제 판: <b id="wy-date"></b></p><noscript><p>정답을 보려면 자바스크립트가 필요해요.</p></noscript><p id="wy-fallback" class="muted">불러오는 중…</p>
<details id="wy-box" hidden><summary class="btn" style="list-style:none;display:inline-flex">정답 보기 (스포일러 주의)</summary><div id="wy-list" style="margin-top:10px"></div></details></div><script type="module" src="/js/puzzle-yesterday.js"></script>`,
  g2048: `<div class="card" id="g-app">${statRow(['점수', 'g-score', '0'], ['최고 타일', 'g-max', '2'], 'g-streak')}<p class="muted" style="margin:0;text-align:center;font-size:13px"><span id="g-date"></span> · 오늘 최고 점수 <span id="g-best">0</span></p>
<div id="g-board" role="grid" aria-label="2048 판"></div>
<div class="dirs"><button class="btn g-dir up" data-d="U" type="button" aria-label="위">↑</button><button class="btn g-dir" data-d="L" type="button" aria-label="왼쪽">←</button><button class="btn g-dir" data-d="D" type="button" aria-label="아래">↓</button><button class="btn g-dir" data-d="R" type="button" aria-label="오른쪽">→</button></div>
<div class="bar"><button class="btn" id="g-reset" type="button">↻ 다시 시작</button></div></div>
${dlg('g', '결과', '<button class="btn" id="g-keep" type="button">계속하기</button>')}<script type="module" src="/js/puzzle-2048.js"></script>`,
  nono: `<div class="card" id="n-app"><div class="seg" role="group" aria-label="난이도"><button class="btn n-lv" data-lv="easy" aria-pressed="true">5×5 쉬움</button><button class="btn n-lv" data-lv="normal" aria-pressed="false">10×10 보통</button></div>
${statRow(['시간', 'n-time', '0:00'], ['', 'n-spacer', ''], 'n-streak').replace('<div><span></span><b id="n-spacer"></b></div>', '<div><span>방식</span><b>탭=칠하기</b></div>')}<p class="muted" style="margin:0;text-align:center;font-size:13px"><span id="n-date"></span> · <span id="n-last"></span></p>
<div id="n-board" role="grid" aria-label="노노그램 판"></div>
<div class="bar"><button class="btn" id="n-x" type="button" aria-pressed="false">✕ 표시 모드</button><button class="btn" id="n-reset" type="button">↻ 처음부터</button></div></div>
${dlg('n', '완성! 🎉')}<script type="module" src="/js/puzzle-nono.js"></script>`,
  sol: `<div class="card" id="s-app">${statRow(['수', 's-moves', '0'], ['올린 카드', 's-found-n', '0'], 's-streak')}<p class="muted" style="margin:0;text-align:center;font-size:13px"><span id="s-date"></span></p>
<div id="s-top"><div id="s-stock"></div><div id="s-waste"></div><div class="gap"></div><div class="s-found" id="s-found"></div></div>
<div id="s-table"><div id="s-tab"></div></div>
<div class="bar"><button class="btn" id="s-undo" type="button">↩ 되돌리기</button><button class="btn" id="s-reset" type="button">↻ 다시 하기</button></div></div>
${dlg('s', '클리어! 🎉')}<script type="module" src="/js/puzzle-sol.js"></script>`,
};
