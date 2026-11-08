#!/bin/bash
# OCI 설치 (t_a6a9cd42). 서버에서 sudo bash /tmp/maeil-setup.sh <release>
set -euo pipefail
R=$1
D=/srv/maeil/releases/$R
test -f $D/scripts/oci-serve.mjs
mkdir -p /etc/maeil
if [ -f /srv/maeil/env ]; then install -m 600 -o root -g root /srv/maeil/env /etc/maeil/env; rm -f /srv/maeil/env; fi
ln -sfn $D /srv/maeil/current
chown -R web:web /srv/maeil/releases
install -m 644 $D/deploy/oci/maeil-api.service /etc/systemd/system/maeil-api.service
if [ ! -f /etc/nginx/sites-available/maeil ] || ! grep -q "ssl_certificate" /etc/nginx/sites-available/maeil; then
  install -m 644 $D/deploy/oci/nginx-maeil.conf /etc/nginx/sites-available/maeil
fi
ln -sfn /etc/nginx/sites-available/maeil /etc/nginx/sites-enabled/maeil
systemctl daemon-reload
systemctl enable --now maeil-api
systemctl restart maeil-api
nginx -t
systemctl reload nginx
sleep 1
systemctl is-active maeil-api
