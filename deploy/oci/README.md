# 매일웹겜(playtoday.cloud) OCI 운영 (t_a6a9cd42, 2026-11-08)

Vercel(팀 softBlock, 12/7까지 402)을 대신해 OCI VM `mint-ai-log-db`(193.123.228.142)에서 서비스한다.

## 구성
- 정적: nginx가 `/srv/maeil/current/public` 직접 제공 (gzip, ETag, `Cache-Control: public, max-age=0, must-revalidate` = Vercel 기본과 동일)
- API: `maeil-api.service`(user web, MemoryMax 256M) → `scripts/oci-serve.mjs` → `scripts/dev.mjs`의 vercel.json rewrite + `api/*.js` 그대로. 127.0.0.1:3102. `VERCEL_ENV=production`(events 저장 조건 유지)
- DB: 같은 VM PgBouncer 127.0.0.1:6432 / `maeil_webgame` / 역할 `maeil_webgame_app`(비번 키체인 combiz-db-vm). env는 `/etc/maeil/env`(root 600: DATABASE_URL, STATS_TOKEN)
- nginx: `deploy/oci/nginx-maeil.conf` → `/etc/nginx/sites-available/maeil`. vercel.json의 redirects(/games→/ko/ 301), rewrites(/:lang/(r|c|i)/:id, /:lang/c/mh-:seed), headers(no-referrer, noindex, nosniff), 루트→www 308 재현. `/_vercel/insights/*`는 빈 응답(Vercel Web Analytics는 OCI에서 수집 안 됨 → 지표는 /api/stats·GSC)
- 미이전: `middleware.js`(할로윈 OG, 11/1 만료로 무동작)

## 배포 (main push = production 유지)
- 자동: Hermes cron `maeil OCI 자동배포`(10분, 스크립트만) → `deploy/oci/autodeploy.sh` → origin/main이 OCI current와 다르면 `deploy.sh`
- 수동: `deploy/oci/deploy.sh [ref]` — worktree 빌드(i18n) → `/srv/maeil/releases/<시각>-<sha>` → current 교체 → 재시작 → `check.sh`. 5릴리스 보존
- 롤백: `deploy/oci/deploy.sh --rollback` (직전 릴리스로 링크 되돌림). Vercel 롤백은 12/7 20:03 이후에만 가능(가비아 A 216.198.79.1, www CNAME bb11efb320243f6f.vercel-dns-017.com)

## 점검
- `deploy/oci/check.sh https://www.playtoday.cloud` (경로별 상태·헤더·gzip·stats·OG)
- `node deploy/oci/smoke.mjs https://www.playtoday.cloud` (iPhone 13 화면, 콘솔 오류·실패 요청)
- 로그: `journalctl -u maeil-api -f`, `/var/log/nginx/access.log`

## DNS (가비아)
- 전환: `@` A 193.123.228.142, `www` CNAME 삭제 → A 193.123.228.142 (TTL 600)
- 전환 직후: `sudo certbot --nginx -d www.playtoday.cloud -d playtoday.cloud` (VM)
