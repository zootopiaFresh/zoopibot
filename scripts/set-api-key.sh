#!/bin/bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$PROJECT_DIR/.env}"

usage() {
  cat <<'EOF'
사용법:
  ./scripts/set-api-key.sh [openai-api-key|openai-codex|anthropic-api-key]

설명:
  - openai-api-key: OPENAI_API_KEY를 설정합니다.
  - openai-codex: API 키 없이 Codex OAuth 모드로 전환합니다.
  - anthropic-api-key: ANTHROPIC_API_KEY와 OPENCLAW_PRIMARY_MODEL을 설정합니다.
EOF
}

prompt_input() {
  local prompt="$1"
  local default="${2:-}"
  if [ -n "$default" ]; then
    printf "%s [%s]: " "$prompt" "$default" >&2
  else
    printf "%s: " "$prompt" >&2
  fi
  read -r input
  if [ -z "$input" ]; then
    printf "%s" "$default"
  else
    printf "%s" "$input"
  fi
}

prompt_secret() {
  local prompt="$1"
  printf "%s: " "$prompt" >&2
  read -r -s input
  echo "" >&2
  printf "%s" "$input"
}

upsert_env() {
  local key="$1"
  local value="$2"
  local tmp
  tmp="$(mktemp)"
  touch "$ENV_FILE"
  awk -v key="$key" -v value="$value" '
    BEGIN { done = 0 }
    index($0, key "=") == 1 {
      print key "=\"" value "\""
      done = 1
      next
    }
    { print }
    END {
      if (!done) {
        print key "=\"" value "\""
      }
    }
  ' "$ENV_FILE" > "$tmp"
  mv "$tmp" "$ENV_FILE"
}

delete_env() {
  local key="$1"
  local tmp
  tmp="$(mktemp)"
  touch "$ENV_FILE"
  awk -v key="$key" 'index($0, key "=") != 1 { print }' "$ENV_FILE" > "$tmp"
  mv "$tmp" "$ENV_FILE"
}

load_existing_env() {
  if [ -f "$ENV_FILE" ]; then
    # shellcheck disable=SC1090
    source "$ENV_FILE"
  fi
}

select_provider() {
  echo "Provider를 선택하세요:"
  echo "  1) openai-api-key"
  echo "  2) openai-codex"
  echo "  3) anthropic-api-key"
  printf "선택 [1]: "
  read -r choice
  case "$choice" in
    ""|"1") printf "%s" "openai-api-key" ;;
    "2") printf "%s" "openai-codex" ;;
    "3") printf "%s" "anthropic-api-key" ;;
    *) echo "잘못된 선택입니다." >&2; exit 1 ;;
  esac
}

load_existing_env

PROVIDER="${1:-}"
if [ -z "$PROVIDER" ]; then
  PROVIDER="$(select_provider)"
fi

mkdir -p "$(dirname "$ENV_FILE")"
touch "$ENV_FILE"

upsert_env AI_BACKEND "openclaw"
upsert_env OPENCLAW_PROVIDER_MODE "$PROVIDER"

case "$PROVIDER" in
  openai-api-key)
    OPENAI_KEY="$(prompt_secret "OpenAI API Key")"
    if [ -z "$OPENAI_KEY" ]; then
      echo "[set-api-key] ERROR: OPENAI_API_KEY는 비워둘 수 없습니다." >&2
      exit 1
    fi
    upsert_env OPENAI_API_KEY "$OPENAI_KEY"
    upsert_env OPENCLAW_PRIMARY_MODEL "openai/gpt-5.4"
    delete_env ANTHROPIC_API_KEY
    echo "[set-api-key] OPENAI_API_KEY와 OPENCLAW_PROVIDER_MODE를 저장했습니다."
    ;;
  openai-codex)
    upsert_env OPENCLAW_PRIMARY_MODEL "openai-codex/gpt-5.4"
    delete_env OPENAI_API_KEY
    delete_env ANTHROPIC_API_KEY
    echo "[set-api-key] OPENCLAW_PROVIDER_MODE를 openai-codex로 저장했습니다."
    echo "[set-api-key] 다음 명령으로 1회 인증하세요: ./scripts/openclaw-cli.sh models auth login --provider openai-codex"
    ;;
  anthropic-api-key)
    ANTHROPIC_KEY="$(prompt_secret "Anthropic API Key")"
    if [ -z "$ANTHROPIC_KEY" ]; then
      echo "[set-api-key] ERROR: ANTHROPIC_API_KEY는 비워둘 수 없습니다." >&2
      exit 1
    fi
    DEFAULT_MODEL="anthropic/claude-opus-4-1"
    PRIMARY_MODEL="$(prompt_input "OpenClaw Primary Model" "$DEFAULT_MODEL")"
    if [ -z "$PRIMARY_MODEL" ]; then
      echo "[set-api-key] ERROR: OPENCLAW_PRIMARY_MODEL은 비워둘 수 없습니다." >&2
      exit 1
    fi
    upsert_env ANTHROPIC_API_KEY "$ANTHROPIC_KEY"
    upsert_env OPENCLAW_PRIMARY_MODEL "$PRIMARY_MODEL"
    delete_env OPENAI_API_KEY
    echo "[set-api-key] ANTHROPIC_API_KEY와 OPENCLAW_PROVIDER_MODE를 저장했습니다."
    ;;
  -h|--help|help)
    usage
    ;;
  *)
    echo "[set-api-key] ERROR: 지원하지 않는 provider입니다: $PROVIDER" >&2
    usage
    exit 1
    ;;
esac

echo "[set-api-key] ENV_FILE=$ENV_FILE"
