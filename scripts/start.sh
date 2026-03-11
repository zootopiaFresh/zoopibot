#!/bin/bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OPENCLAW_CMD="${OPENCLAW_CMD:-$PROJECT_DIR/scripts/openclaw-cli.sh}"
cd "$PROJECT_DIR"

EXISTING_GATEWAY="$(lsof -nP -iTCP:18789 -sTCP:LISTEN 2>/dev/null | tail -n +2 || true)"
if [ -n "$EXISTING_GATEWAY" ]; then
  echo "포트 18789가 이미 사용 중입니다."
  echo "$EXISTING_GATEWAY"
  if echo "$EXISTING_GATEWAY" | grep -q "clawdbot-gateway"; then
    echo ""
    echo "이전 clawdbot LaunchAgent가 실행 중입니다. 아래 명령으로 중지하세요:"
    echo "  launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.clawdbot.gateway.plist"
  else
    echo ""
    echo "기존 Gateway를 중지하거나 OPENCLAW_URL/포트를 조정한 뒤 다시 실행하세요."
  fi
  exit 1
fi

echo "OpenClaw Gateway 시작 중..."
"$OPENCLAW_CMD" gateway &
GW_PID=$!

echo "Zoopibot 시작 중..."
yarn dev &
ZB_PID=$!

echo ""
echo "실행 중:"
echo "  OpenClaw Gateway (PID: $GW_PID) → http://127.0.0.1:18789"
echo "  Zoopibot          (PID: $ZB_PID) → http://localhost:3000"
echo ""
echo "종료하려면 Ctrl+C"

cleanup() {
  echo ""
  echo "서비스 종료 중..."
  kill $GW_PID $ZB_PID 2>/dev/null
  wait $GW_PID $ZB_PID 2>/dev/null
  echo "완료"
}

trap cleanup SIGINT SIGTERM
wait
