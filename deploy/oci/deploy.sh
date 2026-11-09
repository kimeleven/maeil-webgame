#!/bin/bash
# 매일웹겜 OCI 배포 (t_a6a9cd42, t_6f271a92). 맥미니에서:
#   deploy.sh [git-ref=origin/main]   운영(current) 배포
#   deploy.sh --stage [git-ref]       격리 배포: staging 링크만 바꾼다(운영 current·API 재시작 없음)
#   deploy.sh --promote               staging 릴리스를 운영 current로 올린다
#   deploy.sh --rollback              직전 릴리스로 되돌리고 HOLD를 건다(자동배포 정지)
#   deploy.sh --release-hold          HOLD 해제(자동배포 재개)
# 빌드(i18n) → 릴리스 rsync(node_modules prod 동봉) → 링크 교체 → 점검. 5릴리스 보존(current·staging 대상은 지우지 않음).
# 동시 실행 방지: 맥미니 잠금 디렉터리 /tmp/maeil-deploy.lock.d (macOS엔 flock 없음).
# 점검 주소: www가 이 VM을 가리키면 https://www, 아니면 DNS 전환 전 검증 주소(sslip). CHECK_BASE로 덮어쓰기.
set -euo pipefail
IP=193.123.228.142
H=ubuntu@$IP
SSH="ssh -i $HOME/.ssh/id_ed25519_mintech -o ConnectTimeout=10"
REPO=$(cd "$(dirname "$0")/../.." && pwd)
if [ -z "${CHECK_BASE:-}" ]; then
  if dig +short www.playtoday.cloud | grep -qx "$IP"; then CHECK_BASE=https://www.playtoday.cloud; else CHECK_BASE=http://maeil.193-123-228-142.sslip.io; fi
fi

L=/tmp/maeil-deploy.lock.d
if ! mkdir "$L" 2>/dev/null; then
  if [ -n "$(find "$L" -maxdepth 0 -mmin +30)" ]; then rm -rf "$L"; mkdir "$L"; else echo "다른 배포가 실행 중 — 건너뜀"; exit 3; fi
fi
W=""
cleanup(){ [ -n "$W" ] && git -C "$REPO" worktree remove --force "$W" 2>/dev/null; rm -rf "$L"; }
trap cleanup EXIT

check(){ # $1 base. 핵심 경로(/, 언어 홈, 게임, /api/games)에 4xx/5xx 있으면 실패
  local out; out=$(bash "$REPO/deploy/oci/check.sh" "$1")
  if echo "$out" | grep -E "^[45][0-9][0-9] .* (/|/ko/|/en/|/ja/|/ko/play/[a-z-]+/|/api/games) -> $"; then echo "점검 실패: $1"; return 1; fi
  echo "check ok: $1"
}

case "${1:-}" in
--rollback)
  $SSH $H 'cd /srv/maeil/releases && cur=$(basename $(readlink -f /srv/maeil/current)); prev=$(ls | sort | awk -v c="$cur" "\$0<c" | tail -1); [ -n "$prev" ] || { echo "이전 릴리스 없음"; exit 1; }; sudo ln -sfn /srv/maeil/releases/$prev /srv/maeil/current && sudo systemctl restart maeil-api && echo "$(date +%F_%T) rollback $cur -> $prev" | sudo tee /srv/maeil/HOLD'
  echo "HOLD 설정: 자동배포 정지. 원인 수정 뒤 deploy.sh --release-hold"; exit 0;;
--release-hold)
  $SSH $H 'sudo rm -f /srv/maeil/HOLD && echo "HOLD 해제"'; exit 0;;
--promote)
  $SSH $H 'set -e; s=$(readlink -f /srv/maeil/staging); [ -d "$s" ] || { echo "staging 없음"; exit 1; }; sudo ln -sfn "$s" /srv/maeil/current && sudo systemctl restart maeil-api && sleep 1 && systemctl is-active maeil-api && echo "promote -> $(basename $s)"'
  check "$CHECK_BASE"; exit $?;;
--stage) MODE=stage; REF=${2:-origin/main};;
*) MODE=prod; REF=${1:-origin/main};;
esac

git -C "$REPO" fetch -q origin
SHA=$(git -C "$REPO" rev-parse --short "$REF")
W=$(mktemp -d)/src
git -C "$REPO" worktree add -q --detach "$W" "$REF"
( cd "$W" && npm ci --omit=dev --no-audit --no-fund >/dev/null && node scripts/build-i18n.mjs | tail -1 )
R=$(date +%Y%m%d%H%M%S)-$SHA
$SSH $H "sudo install -d -o web -g web /srv/maeil/releases/$R"
rsync -az -e "$SSH" --rsync-path="sudo -u web rsync" --exclude .git --exclude handoff --exclude reboot-evidence --exclude hw-evidence --exclude tests "$W/" $H:/srv/maeil/releases/$R/
PRUNE='cd /srv/maeil/releases && keep="$(basename $(readlink -f /srv/maeil/current)) $(basename $(readlink -f /srv/maeil/staging 2>/dev/null || echo none))"; ls | sort | head -n -5 | while read d; do case " $keep " in *" $d "*) ;; *) sudo rm -rf -- "$d";; esac; done'
if [ $MODE = stage ]; then
  $SSH $H "sudo ln -sfn /srv/maeil/releases/$R /srv/maeil/staging && $PRUNE"
  echo "staged $R (운영 current·nginx·maeil-api 변경 없음)"
  # 격리 점검: VM 127.0.0.1 빈 포트에 staging 릴리스의 dev 서버(DB는 닿지 않는 가짜 주소 = 운영 DB에 쓰지 않음)를 잠깐 띄워 정적 경로만 확인 후 종료
  $SSH $H 'bash -s' <<'EOS'
set -e
cd /srv/maeil/staging
P=$(python3 -c "import socket;s=socket.socket();s.bind(('127.0.0.1',0));print(s.getsockname()[1])")
sudo -u web env DATABASE_URL=postgres://stage@127.0.0.1:1/none timeout 60 node -e "const h=require('http');const l=h.Server.prototype.listen;h.Server.prototype.listen=function(p,cb){return l.call(this,p,'127.0.0.1',cb)};import('./scripts/dev.mjs').then(m=>m.startServer($P))" >/tmp/maeil-stage.log 2>&1 &
for i in $(seq 20); do curl -s -o /dev/null http://127.0.0.1:$P/ && break; sleep 0.5; done
bad=0
for p in /ko/ /en/ /ja/ /ko/webgame/ /ko/about/ /robots.txt /sitemap.xml /manifest.webmanifest /data/games.json $(ls public/ko/play | sed 's#.*#/ko/play/&/#'); do
  c=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:$P$p || true); echo "stage $c $p"; [ "$c" = 200 ] || bad=1
done
c=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:$P/nope/ || true); echo "stage $c /nope/ (404 기대)"; [ "$c" = 404 ] || bad=1
sudo pkill -u web -f "startServer.$P" || true
[ $bad = 0 ] && echo "stage check ok (port $P)" || { echo "stage check FAIL"; exit 1; }
EOS
else
  $SSH $H "sudo ln -sfn /srv/maeil/releases/$R /srv/maeil/current && sudo systemctl restart maeil-api && sleep 1 && systemctl is-active maeil-api && $PRUNE"
  echo "deployed $R"
  check "$CHECK_BASE" || { echo "deploy.sh --rollback 고려"; exit 1; }
fi
