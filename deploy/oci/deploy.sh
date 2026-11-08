#!/bin/bash
# 매일웹겜 OCI 배포 (t_a6a9cd42). 맥미니에서: deploy/oci/deploy.sh [git-ref=origin/main] | --rollback
# 빌드(i18n) → 릴리스 디렉터리 rsync → node_modules(prod) 동봉 → current 링크 교체 → maeil-api 재시작 → 점검. 5릴리스 보존.
set -euo pipefail
H=ubuntu@193.123.228.142
SSH="ssh -i $HOME/.ssh/id_ed25519_mintech"
REPO=$(cd "$(dirname "$0")/../.." && pwd)
if [ "${1:-}" = "--rollback" ]; then
  $SSH $H 'cd /srv/maeil/releases && cur=$(basename $(readlink -f /srv/maeil/current)); prev=$(ls | grep -v "^$cur$" | sort | tail -1); [ -n "$prev" ] || { echo "이전 릴리스 없음"; exit 1; }; sudo ln -sfn /srv/maeil/releases/$prev /srv/maeil/current && sudo systemctl restart maeil-api && echo "rollback $cur -> $prev"'
  exit 0
fi
REF=${1:-origin/main}
git -C "$REPO" fetch -q origin
SHA=$(git -C "$REPO" rev-parse --short "$REF")
W=$(mktemp -d)/src
git -C "$REPO" worktree add -q --detach "$W" "$REF"
trap 'git -C "$REPO" worktree remove --force "$W"' EXIT
( cd "$W" && npm ci --omit=dev --no-audit --no-fund >/dev/null && node scripts/build-i18n.mjs | tail -1 )
R=$(date +%Y%m%d%H%M%S)-$SHA
$SSH $H "sudo install -d -o web -g web /srv/maeil/releases/$R"
rsync -az -e "$SSH" --rsync-path="sudo -u web rsync" --exclude .git --exclude handoff --exclude reboot-evidence --exclude hw-evidence --exclude tests "$W/" $H:/srv/maeil/releases/$R/
$SSH $H "sudo ln -sfn /srv/maeil/releases/$R /srv/maeil/current && sudo systemctl restart maeil-api && sleep 1 && systemctl is-active maeil-api && cd /srv/maeil/releases && ls | sort | head -n -5 | xargs -r sudo rm -rf --"
echo "deployed $R"
bash "$REPO/deploy/oci/check.sh" "${CHECK_BASE:-https://www.playtoday.cloud}" | grep -E "^(5|4[0-9][0-9] .* /(ko|en)/ )" && { echo "점검 실패 — deploy.sh --rollback 고려"; exit 1; } || echo "check ok"
