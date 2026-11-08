#!/bin/bash
# nginx 설정만 갱신 (서버에서 sudo bash /tmp/nginx-update.sh). certbot 블록이 있으면 덮지 않고 중단.
set -euo pipefail
F=/srv/maeil/current/deploy/oci/nginx-maeil.conf
T=/etc/nginx/sites-available/maeil
if grep -q ssl_certificate $T; then echo "certbot 적용됨: 수동 병합 필요"; exit 1; fi
cp $T $T.bak
install -m 644 $F $T
if nginx -t 2>/dev/null; then systemctl reload nginx; echo reloaded; else cp $T.bak $T; nginx -t; echo ROLLED_BACK; exit 1; fi
