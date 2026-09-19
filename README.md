# 매일웹겜 (maeil-webgame)

하루 한 판 모바일 웹게임. 회원가입 없이 게스트로 바로 플레이.

- **라이브:** https://www.playtoday.cloud
- **스택:** Vercel (정적 `public/` + Serverless `api/`) · Neon Postgres
- **리전:** `sin1` (vercel.json)

## 구성

```
api/          # /api/games, /api/scores (Neon)
lib/          # db / http / games-fallback
public/       # 로비 + games/001–007 + js/css
package.json
vercel.json
```

현재 로비는 compact lobby v2 (`public/index.html` + `/js/lobby.js` + `/js/guest.js`).
게임: 001 탭 닷지 · 002 짝 뒤집기 · 003 별 캐치 · 004 젬 매치 · 005 비트 탭 · 006 플래시 탭 · 007 레인 러시.

## 환경 변수 (Vercel)

| 이름 | 필수 | 설명 |
|------|------|------|
| `DATABASE_URL` | 점수/게스트 API | Neon Postgres connection string |

Vercel Project → Settings → Environment Variables 에 Production용으로 설정.
로컬에서는 `.env`에 두고 **커밋하지 마세요** (`.gitignore`에 포함).

`DATABASE_URL`이 없으면 `/api/scores`는 503(fallback), 로비/게임 정적 파일은 그대로 동작합니다.
`/api/games`는 Neon 또는 `public/data/games.json` 폴백을 사용합니다.

## Vercel Hobby 배포 메모

- Hobby는 **배포 크기·팀(teamId) 제약**이 있어, 과거 MCP 배포 시 payload를 작게 유지했습니다.
- **teamId 없이** 개인 프로젝트 `maeil-webgame`으로 배포하는 흐름이 기본입니다.
- 프레임워크: `null`, `outputDirectory`: `public` (vercel.json 참고).
- 대용량 프로모 영상·나레이션 mp3·봇 토큰·`.env`는 이 레포에 넣지 않습니다.
- SEO 보강(`sitemap.xml`, `manifest.webmanifest`)은 포함되어 있으나, 라이브에 아직 없을 수 있습니다. 필요 시 별도 배포.

```bash
# 예시 (로컬에서 Vercel CLI)
npm i
npx vercel --prod
# 또는 GitHub 연동 후 push → Production deploy
```

## 스모크 게이트 (배포 후 빠른 확인)

배포 직후 아래가 **HTTP 200**인지 확인하세요.

| 경로 | 기대 |
|------|------|
| `https://www.playtoday.cloud/` | 로비 HTML |
| `/js/lobby.js`, `/js/guest.js` | 로비/게스트 스크립트 |
| `/css/lobby.css` | 스타일 |
| `/data/games.json` | 게임 목록(001–007) |
| `/api/games` | JSON 목록 |
| `/games/001-tap-dodge/` … `/games/007-lane-rush/` | 각 게임 index |
| `/robots.txt` | Allow |

선택: `POST/GET /api/scores`는 `DATABASE_URL` 설정 시에만 정상. 미설정 시 503 fallback이 정상입니다.

## 로컬

```bash
npm i
# 정적 파일은 public/ 을 아무 static server로
# API는 Vercel dev 또는 DATABASE_URL 설정 후 serverless 런타임 필요
npx vercel dev
```

`package.json`의 `dev`/`test` 스크립트는 확장 소스용이며, 이 최소 트리에는 `scripts/`·`tests/`가 없을 수 있습니다.

## 라이선스 / 비고

비공개(`private: true`) 프로젝트입니다. 시크릿·봇 토큰·나레이션 오디오·대형 프로모 영상은 커밋하지 마세요.
