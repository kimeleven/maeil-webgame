# 매일웹겜 SEO + Analytics APPLY

대상: https://www.playtoday.cloud (Vercel Hobby · project `maeil-webgame` · **teamId 없이** 배포)

## 권장 분석 스택 (1개)

**Primary: Vercel Web Analytics**

| 옵션 | Hobby 적합성 | 비고 |
|------|-------------|------|
| **Vercel Web Analytics** | ✅ 추천 | Hobby **월 5만 events 무료**, 쿠키 최소화·프라이버시 라이트, 대시보드 토글만으로 시작. MCP로 확인 시 현재 **미활성** (`web_analytics_not_enabled`). |
| GA4 | 가능하나 무거움 | 무료·강력하지만 쿠키/동의(GDPR·PIPA) 부담, 스크립트 큼 |
| Plausible / Umami self-host | 비추(초기) | 프라이버시 좋지만 Hobby에 호스팅·유지비/시간 발생 |
| Cloudflare Web Analytics | 조건부 | CF 프록시(네임서버) 필요. 도메인이 Vercel DNS만이면 추가 작업 |

**왜 Vercel 하나면 충분한가:** 이미 Vercel에 있고, 가입 없는 한국 모바일 웹겜에 쿠키 배너 부담을 키우지 않으며, Hobby 한도(5만/월)면 초기 트래픽에 충분.

### 사용자 할 일 (Analytics)
1. Vercel → Project `maeil-webgame` → **Analytics** → Enable Web Analytics  
2. 정적 HTML이면 로비 `index.html`에 다음 한 줄 추가(또는 `@vercel/analytics` — 현재 정적 트리엔 스크립트 방식이 안전):
   ```html
   <script defer src="/_vercel/insights/script.js"></script>
   ```
   (`seo-overlay/live-index.head.html`에 주석으로 준비됨)

---

## 라이브 현황 (점검 결과, KST 2026-09-17)

- `/` : title만 있음 · **description/OG/canonical 없음**
- `/robots.txt`, `/sitemap.xml` : **404**
- 게임 경로: `/games/<id>/` (예: `/games/001-tap-dodge/`) — `/games/001/` 는 404
- 프로덕션 로비는 **compact stub** (`#list` + `/js/lobby.js`).  
  `/workspace/maeil-src/public/index.html` 은 **탭바 풀 로비** → **통째 배포 시 UI가 바뀜**. SEO만 올릴 때는 overlay 권장.

---

## 준비된 파일

### A) 풀 소스 트리 (모듈러) — `/workspace/maeil-src/public/`
이미 반영됨:
- `robots.txt`, `sitemap.xml` (로비 + 001–006)
- `index.html` — description / OG / canonical / WebSite JSON-LD · 브랜드 오타(매일웹게댓→매일웹겜) 수정
- `games/*/index.html` — description / OG / canonical / VideoGame JSON-LD
- `manifest.webmanifest` — description 보강

### B) 프로덕션-안전 오버레이 — `/workspace/maeil-src/seo-overlay/`
- `robots.txt`, `sitemap.xml` — **즉시 배포해도 UI 무영향**
- `live-index.html` — **현재 라이브 compact body 유지** + SEO head
- `live-index.head.html` — head만 참고용

---

## 배포 권장 순서 (크기·안전)

**1단계 (권장, 초소형):** `robots.txt` + `sitemap.xml` 만 public 루트에 추가 배포.  
**2단계:** 라이브 `index.html`을 `seo-overlay/live-index.html`로 교체 (로비 UI 동일).  
**3단계:** 각 `games/*/index.html` 메타는 `maeil-src/public/games/` 버전을 머지(게임 JS/CSS는 그대로).  
**금지/주의:** Hobby 배포 크기 이슈 이력 있음 → **전체 maeil-src 일괄 재배포는 SEO만으로는 비추**. teamId 없이 `maeil-webgame`만.

이 작업에서는 **배포하지 않음** (소스 준비만).

---

## Search Console / Bing (사용자 1회)

### Google Search Console
1. https://search.google.com/search-console → 속성 추가  
2. URL prefix: `https://www.playtoday.cloud`  
3. 소유권 확인 (택1):
   - **HTML 태그** meta를 로비 head에 넣거나
   - **DNS TXT** (도메인 DNS)
   - Vercel이면 HTML 파일 업로드도 가능
4. 확인 후 **Sitemaps** → `https://www.playtoday.cloud/sitemap.xml` 제출  
5. URL 검사로 `/` 및 대표 게임 1개 색인 요청

### Bing Webmaster
1. https://www.bing.com/webmasters  
2. 사이트 추가 → GSC 연동(가장 빠름) 또는 XML/메타/DNS 확인  
3. 동일 sitemap URL 제출

hreflang: **KO-only라 불필요.**

---

## SEO 체크리스트

| 항목 | 소스 준비 | 라이브 반영 | 사용자 |
|------|-----------|-------------|--------|
| title/description/OG (로비) | ✅ maeil-src + overlay | ❌ 아직 | 배포 |
| title/description/OG (게임 001–006) | ✅ maeil-src | ❌ (라이브는 title만) | 배포 |
| canonical | ✅ | ❌ | 배포 |
| robots.txt | ✅ | ❌ 404 | 배포 |
| sitemap.xml | ✅ | ❌ 404 | 배포 + GSC 제출 |
| WebSite / VideoGame JSON-LD | ✅ | ❌ | 배포 |
| OG 이미지(전용 PNG/JPG 1200×630) | ⚠️ favicon.svg 임시 | — | 나중에 교체 권장 |
| Vercel Web Analytics | — | ❌ 미활성 | 대시보드 Enable |
| GSC / Bing 소유권 | — | — | 사용자 1회 |
| hreflang | N/A (KO only) | — | — |

---

## 블록커

1. **Vercel Analytics**: 프로젝트에 Web Analytics **미활성** → 대시보드에서 Enable 필요.  
2. **GSC/Bing 도메인 verify**: 에이전트가 대신 로그인·DNS 수정 불가 → 사용자.  
3. **라이브 vs maeil-src UI 불일치**: 풀 소스 배포 시 로비가 탭바 UI로 바뀜 → SEO는 `seo-overlay` 우선.
