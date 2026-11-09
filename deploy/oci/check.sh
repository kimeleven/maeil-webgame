#!/bin/bash
# 호스트명 기반 점검. usage: check.sh <base-url> [curl extra e.g. --resolve ...]
B=$1; shift
X=("$@")
c(){ curl -s -o /dev/null -w "%{http_code} %{size_download}B %{content_type} $1 -> %{redirect_url}\n" "${X[@]}" "$B$1"; }
for p in / /ko/ /en/ /ja/ /ko/play/ /ko/play/commute/ /ko/play/echo-courier/ /ko/webgame/ /ko/about/ /ko/privacy/ /ko/me/ /ko/friends/ /games /games/x /ko/r/abc123 /ko/c/mh-12345 /ko/i/tok /robots.txt /sitemap.xml /manifest.webmanifest /favicon.svg /data/games.json /js/logic.js /og/game.png /_vercel/insights/script.js /nope /.env /api/games /api/stats /api/scores; do c $p; done
echo "--- headers /ko/"
curl -s -D - -o /dev/null -H 'Accept-Encoding: gzip' "${X[@]}" "$B/ko/" | grep -i -E "cache-control|content-encoding|x-content|etag"
echo "--- headers /ko/r/abc"
curl -s -D - -o /dev/null "${X[@]}" "$B/ko/r/abc" | grep -i -E "referrer|robots"
echo "--- stats"
curl -s "${X[@]}" -H "x-stats-token: $(cat ~/AIAgents/workspace/maeil-reboot/.stats-token)" "$B/api/stats" | head -c 300; echo
echo "--- og meta"
curl -s "${X[@]}" "$B/ko/" | grep -o -E '<meta property="og:(title|image|url)"[^>]*>' | head -3
