---
name: 매일웹겜 배포 스모크
description: >-
  use this when deploying or restoring maeil-webgame / playtoday.cloud — run the
  post-deploy smoke gate before calling success or promo
---
# 매일웹겜 배포 스모크 게이트

Vercel `deploy_to_vercel` files 배포는 **전체 교체**. SEO·Analytics·로그인·순위만 고쳐도 카탈로그 **모든** 게임 실본을 포함할 것.

## 배포 전
1. 기준 페이로드 `/workspace/FINAL_CALLMCP_ARGUMENTS.json` (또는 최신 DEPLOY_*.json)에서 전 게임 `index.html`+`game.js`+`game.css` 존재 확인.
2. `teamId` 넣지 말 것. `name=maeil-webgame`, `target=production`.
3. 금지: 클릭카운터 스텁 `b.onclick=()=>{n++`, PLACEHOLDER/FILE00x/LOAD_FROM_DISK, HTML-only 게임.

## 배포 직후 (실패 시 성공 금지 · 즉시 롤백)
curl로 확인:
1. `https://www.playtoday.cloud/` → 200
2. 카탈로그 각 `/games/<id>/`, `game.js`, `game.css` → 200
3. 각 `game.js` 서로 다름 · 스텁 패턴 없음 · 대체로 ≥1KB
4. `/api/games` → 200 (가능하면 `source=neon`)
5. `/api/scores?game_id=<기존게임>` → 200 이고 `source`가 `stub`이 아님
6. 로비 닉네임/순위 UI가 있으면 마크업·`/js/guest.js`(또는 동등 스크립트) 존재

## 홍보
스모크 전부 통과 전에는 텔레그램·쇼츠 홍보 금지.
