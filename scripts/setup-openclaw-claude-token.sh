#!/bin/bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OPENCLAW_CMD="${OPENCLAW_CMD:-$PROJECT_DIR/scripts/openclaw-cli.sh}"
ENV_FILE="${ENV_FILE:-$PROJECT_DIR/.env}"
OPENCLAW_DIR="${OPENCLAW_DIR:-$HOME/.openclaw}"
WORKSPACE_DIR="$OPENCLAW_DIR/workspace"
SKILLS_DIR="$WORKSPACE_DIR/skills"
CONFIG_FILE="$OPENCLAW_DIR/openclaw.json"
COMMON_LIB="$PROJECT_DIR/scripts/lib/openclaw-public.sh"

# shellcheck disable=SC1090
source "$COMMON_LIB"

log() {
  echo "[setup-openclaw-claude-token] $1"
}

fail() {
  echo "[setup-openclaw-claude-token] ERROR: $1" >&2
  exit 1
}

upsert_env() {
  upsert_env_file "$ENV_FILE" "$1" "$2"
}

delete_env() {
  delete_env_file "$ENV_FILE" "$1"
}

if [ ! -x "$OPENCLAW_CMD" ]; then
  fail "OpenClaw 실행 래퍼가 없습니다: $OPENCLAW_CMD"
fi

if ! command -v claude >/dev/null 2>&1; then
  fail "claude CLI가 필요합니다. 먼저 Claude CLI를 설치하고 로그인하세요."
fi

mkdir -p "$(dirname "$ENV_FILE")"
touch "$ENV_FILE"

if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

OPENCLAW_PROJECT_SERVICE_TOKEN="${OPENCLAW_PROJECT_SERVICE_TOKEN:-${!OPENCLAW_PROJECT_SERVICE_TOKEN_ENV_NAME:-}}"

OPENCLAW_URL="${OPENCLAW_URL:-http://127.0.0.1:18789}"
OPENCLAW_GATEWAY_PORT="${OPENCLAW_GATEWAY_PORT:-18789}"
OPENCLAW_GATEWAY_TOKEN="${OPENCLAW_GATEWAY_TOKEN:-}"
OPENCLAW_PRIMARY_MODEL="${OPENCLAW_PRIMARY_MODEL:-anthropic/claude-opus-4-6}"
OPENCLAW_AGENT_WORKSPACE="${OPENCLAW_AGENT_WORKSPACE:-$WORKSPACE_DIR}"
OPENCLAW_PROJECT_SKILL_NAME="${OPENCLAW_PROJECT_SKILL_NAME:-zoopibot-query}"
OPENCLAW_PROJECT_SKILL_SOURCE_DIR="${OPENCLAW_PROJECT_SKILL_SOURCE_DIR:-$PROJECT_DIR/openclaw/skills/$OPENCLAW_PROJECT_SKILL_NAME}"
OPENCLAW_PROJECT_URL_ENV_NAME="${OPENCLAW_PROJECT_URL_ENV_NAME:-ZOOPIBOT_URL}"
OPENCLAW_PROJECT_SERVICE_TOKEN_ENV_NAME="${OPENCLAW_PROJECT_SERVICE_TOKEN_ENV_NAME:-ZOOPIBOT_SERVICE_TOKEN}"
OPENCLAW_PROJECT_PUBLIC_URL="${OPENCLAW_PROJECT_PUBLIC_URL:-${ZOOPIBOT_PUBLIC_URL:-${NEXTAUTH_URL:-http://localhost:3000}}}"
OPENCLAW_PROJECT_SERVICE_TOKEN="${OPENCLAW_PROJECT_SERVICE_TOKEN:-${ZOOPIBOT_SERVICE_TOKEN:-}}"

if ! openclaw_provider_metadata "anthropic-setup-token" "$OPENCLAW_CMD"; then
  fail "anthropic-setup-token provider 메타데이터를 불러올 수 없습니다."
fi

if [ -z "$OPENCLAW_GATEWAY_TOKEN" ]; then
  OPENCLAW_GATEWAY_TOKEN="$(generate_secret)"
  upsert_env OPENCLAW_GATEWAY_TOKEN "$OPENCLAW_GATEWAY_TOKEN"
  log "OPENCLAW_GATEWAY_TOKEN을 생성해 .env에 저장했습니다."
fi

if [ -z "$OPENCLAW_PROJECT_SERVICE_TOKEN" ]; then
  OPENCLAW_PROJECT_SERVICE_TOKEN="$(generate_secret)"
  upsert_env "$OPENCLAW_PROJECT_SERVICE_TOKEN_ENV_NAME" "$OPENCLAW_PROJECT_SERVICE_TOKEN"
  log "$OPENCLAW_PROJECT_SERVICE_TOKEN_ENV_NAME 값을 생성해 .env에 저장했습니다."
fi

upsert_env AI_BACKEND "openclaw"
upsert_env OPENCLAW_URL "$OPENCLAW_URL"
upsert_env OPENCLAW_PROVIDER_MODE "anthropic-setup-token"
upsert_env OPENCLAW_PRIMARY_MODEL "$OPENCLAW_PRIMARY_MODEL"
clear_openclaw_provider_secret_envs "$ENV_FILE"

log "Claude CLI setup-token 인증을 시작합니다."
"$OPENCLAW_CMD" models auth setup-token --provider anthropic --yes

mkdir -p "$SKILLS_DIR" "$WORKSPACE_DIR"

if install_openclaw_skill "$OPENCLAW_PROJECT_SKILL_SOURCE_DIR" "$SKILLS_DIR" "$OPENCLAW_PROJECT_SKILL_NAME"; then
  log "$OPENCLAW_PROJECT_SKILL_NAME 스킬을 복사했습니다."
fi

SKILL_ENTRY_JSON="$(build_openclaw_skill_entry_json \
  "$OPENCLAW_PROJECT_SKILL_NAME" \
  "${OPENCLAW_PROJECT_URL_ENV_NAME}=${OPENCLAW_PROJECT_PUBLIC_URL}" \
  "${OPENCLAW_PROJECT_SERVICE_TOKEN_ENV_NAME}=${OPENCLAW_PROJECT_SERVICE_TOKEN}")"

write_openclaw_config \
  "$CONFIG_FILE" \
  "$OPENCLAW_AGENT_WORKSPACE" \
  "$OPENCLAW_PRIMARY_MODEL" \
  "$OPENCLAW_GATEWAY_PORT" \
  "$OPENCLAW_GATEWAY_TOKEN" \
  "$SKILL_ENTRY_JSON"

log "OpenClaw 설정 파일을 생성했습니다: $CONFIG_FILE"
log "Provider mode: anthropic-setup-token"
log "Primary model: $OPENCLAW_PRIMARY_MODEL"
log "다음 단계:"
log "  1) yarn dev"
log "  2) 필요 시 OPENCLAW_AUTOSTART=0 yarn dev"
