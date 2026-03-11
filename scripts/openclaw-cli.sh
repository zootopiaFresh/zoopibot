#!/bin/bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOCAL_BIN="$PROJECT_DIR/node_modules/.bin/openclaw"

if [ -x "$LOCAL_BIN" ]; then
  exec "$LOCAL_BIN" "$@"
fi

if command -v openclaw >/dev/null 2>&1; then
  exec openclaw "$@"
fi

if [ -f "$PROJECT_DIR/package.json" ]; then
  echo "[openclaw-cli] 로컬 openclaw가 없어 yarn install을 실행합니다."
  (
    cd "$PROJECT_DIR"
    yarn install --frozen-lockfile
  )

  if [ -x "$LOCAL_BIN" ]; then
    exec "$LOCAL_BIN" "$@"
  fi
fi

echo "[openclaw-cli] ERROR: openclaw 실행 파일을 찾지 못했습니다." >&2
echo "[openclaw-cli] package.json과 node_modules 상태를 확인하세요." >&2
exit 1
