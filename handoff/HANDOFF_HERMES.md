# 매일웹겜(playtoday.cloud) → 에르메스 인수인계 문서

작성: 2026-10-15 23:40 KST · **최종본 갱신: 2026-10-17 10:40 KST** · 작성 기준: 박스 파일·레포·Neon 직접 확인. 확인 못 한 항목은 **미확인**으로 표기.
**에르메스 준비 완료 전까지 기존 루틴은 그대로 운영 중**(정지하지 말 것).
> 시크릿 값(토큰·비밀번호·DB 연결문자열)은 이 문서에 없음. 위치만 적음.

## 1. 프로젝트 개요
- 서비스: **매일웹겜** — 회원가입 없이 게스트로 바로 하는 모바일 웹게임. 주 1개 클래식 게임 출시 + 1주간 매일 광고.
- 라이브: https://www.playtoday.cloud (로비) · 게임 URL 패턴 `https://www.playtoday.cloud/games/<id>/`
- YouTube 채널: 매일웹겜 (@lifeclipfromkorea7460, UCTPHVn57f9b2RKMKUkwQNgA)

### 게임 목록 (레포 `public/games/` + `public/data/games.json` 기준, 16개)
| id | 제목 | URL |
|---|---|---|
| 001-tap-dodge | 탭 닷지 | /games/001-tap-dodge/ |
| 002-pair-flip | 짝 뒤집기 | /games/002-pair-flip/ |
| 003-star-catch | 별 캐치 | /games/003-star-catch/ |
| 004-gem-match | 젬 매치 | /games/004-gem-match/ |
| 005-beat-tap | 비트 탭 | /games/005-beat-tap/ |
| 006-flash-tap | 플래시 탭 | /games/006-flash-tap/ |
| 007-lane-rush | 레인 러시 | /games/007-lane-rush/ |
| 008-seq-glow | 시퀀스 글로우 | /games/008-seq-glow/ |
| 009-ripple-pop | 리플 팝 | /games/009-ripple-pop/ |
| 010-petal-catch | 페탈 캐치 | /games/010-petal-catch/ |
| 011-orb-link | 오브 링크 | /games/011-orb-link/ |
| 012-snap-ring | 스냅 링 | /games/012-snap-ring/ |
| 013-nova-tap | 노바 탭 | /games/013-nova-tap/ |
| 014-minesweeper | 지뢰찾기 (W01) | /games/014-minesweeper/ |
| 015-snake | 스네이크 (W02) | /games/015-snake/ |
| 016-omok | 오목 (W03) | /games/016-omok/ |

### W03 오목 광고 현황 (promo_week_log.json)
| Day | 날짜 | 텔레그램 msg | 쇼츠 |
|---|---|---|---|
| 0 | 10/12 | 2429 | https://youtube.com/shorts/VsucM240fF0 |
| 1 | 10/13 | 2477 | https://youtube.com/shorts/18MMAz1jXac |
| 2 | 10/14 | 2522 | https://youtube.com/shorts/qCKyFY3YSqk |
| 3 | 10/15 | 2526 | https://youtube.com/shorts/r5Di02vYNEs |
| 4 | 10/16 «빨리 이길수록 점수가 쑥쑥» | 2534 | https://youtube.com/shorts/4f9jagDWHjk |
| 5 | 10/17 «친구 기록, 이길 수 있어?» | 2558 | https://youtube.com/shorts/BPiaBOsio2E (업로드 시 "콘텐츠 검토 중" 안내, 공개 정상) |
X는 전 Day 보류(@kimeleven2 로그인 없음). 음성은 전부 제미나이 Autonoe.

### 현재 주간 게임 (CURRENT_WEEK_GAME.json)
- **W03 016-omok 오목**, 출시·홍보 시작 2026-10-12(월). 다음 주 W04 = 2048.
- promo_week_log.json 진행: Day0(10/12)~Day5(10/17) 완료. 남은 날: Day6 10/18 «주간 마무리 · 다음 주 2048 예고».

| Day | 날짜 | 쇼츠 | 음성 | 텔레그램 | X |
|---|---|---|---|---|---|
| 0 | 10/12 | https://youtube.com/shorts/VsucM240fF0 | 제미나이 Autonoe | OK (msg 2429) | 보류 |
| 1 | 10/13 | https://youtube.com/shorts/18MMAz1jXac | 제미나이 Autonoe | OK | 보류 |
| 2 | 10/14 | https://youtube.com/shorts/qCKyFY3YSqk | 제미나이 Autonoe | OK | 보류 |
| 3 | 10/15 | https://youtube.com/shorts/r5Di02vYNEs | 제미나이 Autonoe | OK | 보류 |

## 2. 기술 구조
- 레포: https://github.com/kimeleven/maeil-webgame (로컬 `/workspace/maeil-webgame`, origin 동일). 최신 커밋 `d363c44 Add W03 오목 (016-omok)`.
- 스택: Vercel(정적 `public/` + Serverless `api/`) + Neon Postgres, 리전 `sin1`.
```
api/      favorites.js, games.js, scores.js   (/api/games, /api/scores, /api/favorites)
lib/      db.js, games-fallback.js, http.js
public/   index.html(로비), js/(lobby.js, guest.js 등), css/, data/games.json, games/<id>/, sitemap.xml, robots.txt, manifest
vercel.json  outputDirectory=public, api/*.js 에 public/data/games.json 포함
```
- 환경변수: Vercel Production `DATABASE_URL`(Neon). 값은 Vercel 프로젝트 설정에만 있음. 없으면 `/api/scores` 503, `/api/games`는 games.json 폴백.

### 게임 추가 방법 (W02/W03 실제 흐름 기준)
1. `public/games/<id>/` 에 `index.html` + `game.js` + `game.css` (실본, 스텁 금지).
2. `public/data/games.json` 맨 앞에 항목 추가, `lib/games-fallback.js` 동기화, `public/sitemap.xml` URL 추가 (로비는 API/카탈로그 기반).
3. Neon `games` 테이블에 INSERT (id, title, genre, published_on, path, description). 
4. git 커밋(작성자 kimeleven <kimeleven@gmail.com>) → push.
5. 전체 미러 배포 → 스모크 → 통과 후에만 홍보.

### Neon
- project `restless-frost-72571297` (Neon MCP 커넥터로 접근). 테이블(public):
  - `games`(id, title, genre, published_on, path, description, created_at)
  - `guests`(id uuid, anon_id, nickname, created_at, updated_at)
  - `high_scores`(id, game_id, anon_id, nickname, score, created_at)
  - `favorites`(anon_id, game_id, created_at)
- 참고: WEEKLY_015_RESULT에 "010-014 were not seeded" 메모 있음(실제 /api/games는 source=neon, 16개 반환 — 016 스모크 기준).

### Vercel 배포 (Hobby)
- 개인 프로젝트 `maeil-webgame`, **teamId 넣지 말 것**, production. 도메인 alias www.playtoday.cloud.
- 방법: Vercel CLI `vercel --prod --yes` 를 전체 미러 디렉터리에서 실행 (W02 기록: `/workspace/_deploy_015`).
- CLI 토큰: `/home/box/agent-data/box-secrets.json` 의 `card.VERCEL_TOKEN` (값은 문서에 쓰지 않음).
- 배포는 **전체 교체**: 모든 게임 실본 포함한 미러여야 함. 미러: `/workspace/_deploy_010` ~ `_deploy_016` (최신 박스 미러 = **`_deploy_016`**).
- W03(016) production 배포: **`dpl_HKghXSZNn74QFEDi4uYdT6DxCw3S`** (maeil-webgame, 2026-10-12 08:21 KST, READY). 2026-10-17 Vercel API 확인 결과 www.playtoday.cloud alias가 이 배포를 가리킴 = **현재 production = last-good**. 016 스모크 2026-10-12 08:30 PASS.
- 같은 시각 `maeil-webgame-smoke-do-not-use` 프로젝트 배포(dpl_9YXHsykF…)와 maeil-webgame 다른 배포(dpl_2FXy4nyA…)도 있음 — production alias 아님, 쓰지 말 것.
- `/workspace/_deploy_016` 미러: 2026-10-17에 레포 `d363c44` 상태(.git·node_modules·.vercel 제외)로 생성. 라이브와 대조: 016-omok index.html/game.js/game.css, 로비 index.html md5 일치, /games/016-omok/ 200. (재배포는 하지 않음.) W04 배포는 이 미러에 017 추가해서 해야 함.
- 롤백: Vercel에서 last-good 배포를 다시 production으로 promote/alias. 기록된 last-good: 015 = `dpl_9L7Wes7GWDxAL9Z86aAnVv6t98zy`, 그 이전 014 = `dpl_8oG3pxa6vWG7DVckKJdzmEFdFBFn`. **016 last-good = `dpl_HKghXSZNn74QFEDi4uYdT6DxCw3S`**.

### 스모크 스킬 (`/home/box/agent-data/workflows/skill-1789689140899/SKILL.md`)
- 배포 전: 전 게임 index.html+game.js+game.css 존재, teamId 없음, 스텁(`b.onclick=()=>{n++`, PLACEHOLDER 등)·HTML-only 금지.
- 배포 직후 curl: 로비 200, 각 게임 페이지·game.js·game.css 200, game.js 서로 다르고 ≥1KB, `/api/games` 200(source=neon), `/api/scores?game_id=…` 200 & source≠stub, 로비 닉네임/순위 UI.
- 실패 시 성공 선언 금지·즉시 롤백. **스모크 전부 통과 전 홍보 금지.**
- 예시 스크립트: `/workspace/smoke_015.py`, 결과 `/workspace/SMOKE_015_RESULT.json`, `016-omok/SMOKE_RESULT.json`.

## 3. 운영 규칙 (전부)
- **Git 작성자**: kimeleven <kimeleven@gmail.com>.
- **텔레그램**: 소유자 DM `5799051013` 에만. 오상(-5396172801)·샵가이드(-5278661601) **절대 금지**. 봇 토큰 위치: `/home/box/.local/telegram/bot_token` (값 금지). 발송 예시: `<game>/dayN/tg_send.py`.
- **X**: @kimeleven2 계정만. @COMBIZSAFETY·@chocogjbi로 게시 금지. 현재 브라우저에 @kimeleven2 로그인 없어 **10/6경부터 계속 보류**(캡션 x_caption.txt는 매일 생성됨).
- **YouTube Shorts**: 채널 매일웹겜(@lifeclipfromkorea7460, UCTPHVn57f9b2RKMKUkwQNgA). kimeleven 구글 계정을 경제뉴스채널운영(홈즈 채널)과 공유 → **쿠키 복사 금지**, 로그인 풀리면 사용자에게 새 로그인 요청, 채널 전환은 필요할 때만.
- **Chrome 프로필 2개**(`/home/box/chrome-profile`): Default = kimeleven(GitHub·YouTube·Vercel·X·AI Studio) / Typecast 전용 ksanghun717. 서로 덮어쓰기 금지.
- **쇼츠 음성**: 제미나이 TTS(Gemini 3.8 Flash TTS, 목소리 **Autonoe**, AI Studio 브라우저, kimeleven@gmail.com 구독, **API 키 사용 금지**). 실패 시 edge-tts `ko-KR-SunHiNeural` +8%. Typecast는 기본 제외(사용자 요청 시만). 결과는 `voice_used.txt`, `gemini_tts_result.json`에 기록.
- **자막**: 화면 중앙, 한 줄 12자·최대 2줄, 흰색 굵은 글씨+검은 외곽선, Noto Sans CJK Bold. 렌더러 `/workspace/maeil-webgame-promo/_tools/render_slides_kr.py`(+ 날짜별 `render_dayN.py`, `mux_shorts.py`).
- **BGM**: 자체 신스 루프(원본 013-nova-tap/day1/bgm.wav 재사용), 믹스 나레이션 1.0 + BGM 0.12, 끝 1.2초 페이드. 매 편 `bgm_license.txt` 기록. (원본 생성 경위 상세 기록은 박스에 없음)
- **그래픽**: 다크 ink + 크림 톤, 캐주얼 모바일, 60fps.
- **게임 기획**: 클래식·심플, 최근 30일 동일 원작·메커닉 중복 금지, 주 1개 월요일 출시.
- **광고**: 같은 주 게임을 7일(Day0~6), 매일 각도 변형, 동일본 금지.
- **배포+200(스모크) 확인 전 홍보 금지.**
- 이미지 생성은 Grok Imagine 브라우저(공용 원칙). 비용 최소화.
- 실패 시 즉시 사용자에게 알리고, 원인 확인·재시도 후 보고.
- 사용자와는 **한국어 반말**.

## 4. 루틴 2개 (일정·프롬프트)
**현재 둘 다 실행 중 — 에르메스 준비 전까지 정지·수정 금지.**

### 4-1. 매주웹겜 한 판
- 일정: 매주 **월 08:11 KST** (W03 실제 실행: 10/12 08:21 배포, 08:30 스모크, ~08:28 Day0 게시 기록)
- 프롬프트(운영 기록으로 복원한 요지 — **원문 전문 미확인**):
  1. CLASSIC_WEEKLY_CALENDAR에서 이번 주 게임 선택(클래식·심플, 30일 내 원작·메커닉 중복 금지).
  2. `public/games/<id>/` index.html+game.js+game.css 제작(모바일, 다크 ink+크림, 60fps, 닉네임·점수·자랑하기 연동).
  3. games.json/fallback/sitemap 갱신, Neon games 등록, git commit(kimeleven) & push.
  4. 이전 미러 + 새 게임으로 `_deploy_0XX` 만들고 `vercel --prod --yes`(teamId 없음, 토큰은 box-secrets.json card.VERCEL_TOKEN, 값 출력 금지).
  5. 스모크 스킬 전부 PASS + 게임 URL 200 확인. 실패 시 롤백·사용자에게 즉시 알림, 홍보 금지.
  6. CURRENT_WEEK_GAME.json·promo_week_log 새로 작성, 텔레그램 DM(5799051013) 출시 카드, Day0 쇼츠(제미나이 Autonoe) 업로드, X(@kimeleven2만) 시도.
  7. `WEEKLY_0XX_RESULT.json` 기록, 사용자에게 한국어 반말 보고.

### 4-2. 매일웹겜 X·쇼츠 광고
- 일정: **매일 10:11 KST**
- 프롬프트(운영 기록으로 복원한 요지 — **원문 전문 미확인**):
  1. CURRENT_WEEK_GAME.json에서 오늘 Day 각도·훅 확인. 이미 오늘 게시했으면 중복 게시 금지(Day0는 월요일 루틴이 처리).
  2. 게임 URL 200 확인 후 진행.
  3. 슬라이드 5장·자막 렌더(Noto Sans CJK, 중앙 12자×2줄, 흰 굵은+검은 외곽선, 두부(□) 있으면 업로드 금지).
  4. 나레이션: AI Studio 브라우저 제미나이 3.8 Flash TTS Autonoe, 스타일 "밝고 경쾌하고 신나는 20대 여성 목소리로, 게임 광고처럼 빠르고 생기 있게 읽어 줘." 실패/브라우저 없음 → edge-tts ko-KR-SunHiNeural +8%.
  5. 상업 무료 BGM 믹스 + bgm_license.txt, mux → shorts.mp4.
  6. 텔레그램 DM(5799051013만) → YouTube 매일웹겜 채널 Shorts 공개 업로드 → X @kimeleven2(없으면 보류 기록).
  7. dayN/RESULT.md·promo_week_log 갱신, 사용자에게 한국어 반말 결과 보고. 실패 시 즉시 알림·원인 확인·재시도.
- 미확인: 루틴 프롬프트 원문 전문, 정확한 cron/스케줄 설정값(위 시각은 실행 기록 기준). 박스·전사 요약에 원문이 남아 있지 않음.

## 5. 파일 맵 (`/workspace/maeil-webgame-promo`)
- `CLASSIC_WEEKLY_CALENDAR.md/.json` — 주간 캘린더(W01~W30). `CLASSIC_30DAY_CALENDAR.*` — 이전 30일 계획.
- `CURRENT_WEEK_GAME.json` — 이번 주 게임·Day별 각도/훅.
- `promo_week_log.json`(현재 주), `promo_week_log_W01_014-minesweeper.json`, `promo_week_log_W02_015-snake.json`.
- `<game-id>/` (002~016) — `SMOKE_RESULT.json`, `dayN/`: `narration.txt`, `narration_gemini.wav`/`narration_edge.mp3`, `slide1~5.png`, `captions/`, `card.png`/`card_tg.jpg`, `bgm.wav`+`bgm_license.txt`, `shorts.mp4`, `render_dayN.py`, `mux_shorts.py`, `tg_send.py`+`tg_send_result.json`, `yt-title.txt`/`yt-description.txt`/`yt_upload_result.json`, `x_caption.txt`/`x_post_result.json`, `voice_used.txt`, `gemini_tts_result.json`, `RESULT.md`.
- `_tools/render_slides_kr.py` 공용 렌더러. `tts_compare/`, `typecast-auditions/`, `edge_tts_sample_SunHi.*`, `channel-branding/`.
- 주간 결과: `/workspace/WEEKLY_014_RESULT.json`, `/workspace/WEEKLY_015_RESULT.json`, `/workspace/_deploy_015/WEEKLY_015_RESULT.json`.

## 6. 앞으로 일정
- 실제 운영 기준 월요일: W02 10/5, W03 10/12 → W04 **2048** 10/19(월), W05 벽돌깨기 10/26, W06 커넥트4 11/2, W07 플래피 라이트 11/9, W08 테트리스 라이트 11/16.
- ⚠ **캘린더 날짜 오프셋**: CLASSIC_WEEKLY_CALENDAR 표의 날짜(10/13, 10/20…)는 **화요일**로 하루 밀려 있음. 실제 운영은 **월요일**(10/5, 10/12) → **W04 2048 = 10/19(월)**. 파일은 수정하지 않았음(루틴이 읽는 파일이라 그대로 둠) — 에르메스는 주차(W번호)만 보고 날짜는 월요일로 환산할 것.

## 7. 미해결 / 할 일
1. X @kimeleven2 로그인 필요(Chrome Default 프로필). 사용자 로그인 대기.
2. YouTube Studio 매일웹겜 채널 비공개 "shorts" 초안 6개(14초×2, 19초×2, 33초×2). 사용자 결정 대기, **삭제 안 함**.
3. 노바 탭(013) Day2·Day3 쇼츠 미업로드(자산은 `013-nova-tap/day2,3/shorts.mp4` 존재, yt_upload_result ok=false).
4. 지뢰찾기 Day4 쇼츠(롱프레스 깃발) 업로드 실패분 — 따로 올릴지 사용자 답 없음.
5. Vercel GitHub 연결 후 OCI 이전 계획 — 세부 내용 **미확인**.
6. 003 별 캐치 그래픽 개선 — 진행 상태 **미확인**.
7. 009 리플 팝 등 밀린 쇼츠(009 폴더엔 슬라이드·카드만, shorts.mp4 없음).
8. 10/5 주간 루틴 중간 끊김 이력(스네이크 재제작 후 같은 날 출시). 월요일 루틴은 중단 감시 필요.
9. 캘린더 날짜 하루 밀림 정정(6절).
10. ~~016 배포 기록~~ → 10/17 정리 완료(deploy id·_deploy_016). WEEKLY_016_RESULT.json 파일은 여전히 없음.
11. 유튜브 유입 부족(9절): 쇼츠 설명·고정 댓글에 게임 링크 강조 — 아직 루틴에 반영 안 됨(사용자 결정 대기).

## 8. 에르메스 이관 체크리스트
**넘겨받을 접근**
- [ ] GitHub kimeleven/maeil-webgame 푸시 권한
- [ ] Vercel 프로젝트 maeil-webgame(개인, teamId 없음) + 토큰(`box-secrets.json` card.VERCEL_TOKEN 위치)
- [ ] Neon project restless-frost-72571297 접근
- [ ] 텔레그램 봇 토큰(`/home/box/.local/telegram/bot_token`) + 소유자 DM 5799051013
- [ ] YouTube 매일웹겜 채널 업로드(kimeleven 구글 계정 — 사용자가 새로 로그인, 쿠키 복사 금지)
- [ ] AI Studio(kimeleven@gmail.com 구독) 브라우저 접근
- [ ] X @kimeleven2 로그인
- [ ] edge-tts, ffmpeg, Noto Sans CJK 폰트 환경

**첫 주 확인 항목**
- [ ] 월요일 출시 → 스모크 PASS → 그 뒤 홍보 순서 지키는지
- [ ] 매일 각도 다른 쇼츠·텔레그램 DM만, 금지 채널 미사용
- [ ] 음성 제미나이 Autonoe, 실패 시 edge-tts 기록
- [ ] promo_week_log·RESULT 파일 갱신, 사용자 한국어 반말 보고

**기존 루틴 정지 순서** (에르메스가 1주 이상 정상 운영 확인 후)
1. 사용자에게 이관 완료 확인 받기.
2. 같은 날 중복 게시 막기 위해 에르메스 첫 운영일 전날 «매일웹겜 X·쇼츠 광고» 일시정지.
3. 다음 월요일 전 «매주웹겜 한 판» 일시정지.
4. 문제 없으면 사용자 확인 후 두 루틴 삭제.

## 9. 접속 통계 (Vercel Web Analytics, 2026-10-17 조회)
| 기간 | 방문자 | 페이지뷰 | 이탈률 |
|---|---|---|---|
| 최근 7일 (10/10~10/17) | 13 | 24 | 92% |
| 최근 30일 | 83 | 115 | — |
- 7일 게임 페이지: 오목 4명, 스네이크 1명. 국가 미국 69%/한국 31%, 데스크톱 67% — 미국·리눅스 데스크톱은 봇/크롤러 가능성.
- **유튜브 유입 30일간 3명뿐** (쇼츠 매일 게시 대비 매우 낮음).
- **권장**: 쇼츠 설명 첫 줄과 고정 댓글에 게임 직링크(https://www.playtoday.cloud/games/<id>/)를 눈에 띄게 넣기. (아직 루틴 미반영 — 사용자 승인 후 적용)
