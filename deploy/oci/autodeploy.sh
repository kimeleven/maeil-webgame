#!/bin/bash
# main push = production 유지 (Vercel 자동 배포 대체). Hermes cron이 10분마다 실행.
# origin/main 커밋이 OCI current 릴리스와 다르면 deploy.sh 실행. 바뀐 게 없으면 조용히 끝남.
set -euo pipefail
REPO=$(cd "$(dirname "$0")/../.." && pwd)
git -C "$REPO" fetch -q origin main
SHA=$(git -C "$REPO" rev-parse --short origin/main)
ST=$(ssh -i $HOME/.ssh/id_ed25519_mintech -o ConnectTimeout=10 ubuntu@193.123.228.142 'test -f /srv/maeil/HOLD && echo "HOLD $(cat /srv/maeil/HOLD)" || basename $(readlink -f /srv/maeil/current)')
# 롤백 뒤 HOLD가 있으면 같은 커밋을 다시 올리지 않는다 (해제: deploy.sh --release-hold)
case "$ST" in HOLD*) exit 0;; esac
CUR=$ST
case "$CUR" in *-"$SHA") exit 0;; esac
echo "$(date '+%F %T') main $SHA != OCI $CUR → deploy"
bash "$REPO/deploy/oci/deploy.sh" origin/main
