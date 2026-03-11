#!/bin/bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$PROJECT_DIR/.env}"
OPENCLAW_DIR="${OPENCLAW_DIR:-$HOME/.openclaw}"
WORKSPACE_DIR="$OPENCLAW_DIR/workspace"
SKILLS_DIR="$WORKSPACE_DIR/skills"
CONFIG_FILE="$OPENCLAW_DIR/openclaw.json"

log() {
  echo "[bootstrap-openclaw] $1"
}

fail() {
  echo "[bootstrap-openclaw] ERROR: $1" >&2
  exit 1
}

require_var() {
  local name="$1"
  if [ -z "${!name:-}" ]; then
    fail "$name 환경변수가 필요합니다."
  fi
}

if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

AI_BACKEND="${AI_BACKEND:-openclaw}"
OPENCLAW_PROVIDER_MODE="${OPENCLAW_PROVIDER_MODE:-openai-api-key}"
OPENCLAW_URL="${OPENCLAW_URL:-http://127.0.0.1:18789}"
OPENCLAW_GATEWAY_PORT="${OPENCLAW_GATEWAY_PORT:-18789}"
OPENCLAW_GATEWAY_TOKEN="${OPENCLAW_GATEWAY_TOKEN:-}"
OPENCLAW_PRIMARY_MODEL="${OPENCLAW_PRIMARY_MODEL:-}"
ZOOPIBOT_SERVICE_TOKEN="${ZOOPIBOT_SERVICE_TOKEN:-}"
ZOOPIBOT_PUBLIC_URL="${ZOOPIBOT_PUBLIC_URL:-${NEXTAUTH_URL:-http://localhost:3000}}"
OPENCLAW_AGENT_WORKSPACE="${OPENCLAW_AGENT_WORKSPACE:-$WORKSPACE_DIR}"
INSTALL_OPENCLAW="${INSTALL_OPENCLAW:-1}"

if [ "$AI_BACKEND" != "openclaw" ]; then
  fail "이 스크립트는 AI_BACKEND=openclaw 환경에서만 사용합니다."
fi

if ! command -v openclaw >/dev/null 2>&1; then
  if [ "$INSTALL_OPENCLAW" = "1" ]; then
    log "openclaw가 없어 전역 설치를 시도합니다."
    npm install -g openclaw
  else
    fail "openclaw 명령이 없습니다. INSTALL_OPENCLAW=1 또는 수동 설치가 필요합니다."
  fi
fi

require_var OPENCLAW_GATEWAY_TOKEN
require_var ZOOPIBOT_SERVICE_TOKEN

case "$OPENCLAW_PROVIDER_MODE" in
  openai-api-key)
    require_var OPENAI_API_KEY
    if [ -z "$OPENCLAW_PRIMARY_MODEL" ]; then
      OPENCLAW_PRIMARY_MODEL="openai/gpt-5.4"
    fi
    ENV_BLOCK=$(cat <<EOF
  "env": {
    "OPENAI_API_KEY": "${OPENAI_API_KEY}"
  },

EOF
)
    AUTH_HINT=""
    ;;
  openai-codex)
    if [ -z "$OPENCLAW_PRIMARY_MODEL" ]; then
      OPENCLAW_PRIMARY_MODEL="openai-codex/gpt-5.4"
    fi
    ENV_BLOCK=""
    AUTH_HINT="openclaw models auth login --provider openai-codex"
    ;;
  anthropic-api-key)
    require_var ANTHROPIC_API_KEY
    if [ -z "$OPENCLAW_PRIMARY_MODEL" ]; then
      fail "anthropic-api-key 모드에서는 OPENCLAW_PRIMARY_MODEL도 지정해주세요. 예: anthropic/claude-opus-4-1"
    fi
    ENV_BLOCK=$(cat <<EOF
  "env": {
    "ANTHROPIC_API_KEY": "${ANTHROPIC_API_KEY}"
  },

EOF
)
    AUTH_HINT=""
    ;;
  *)
    fail "지원하지 않는 OPENCLAW_PROVIDER_MODE=${OPENCLAW_PROVIDER_MODE}"
    ;;
esac

mkdir -p "$SKILLS_DIR" "$WORKSPACE_DIR"

if [ -d "$PROJECT_DIR/openclaw/skills/zoopibot-query" ]; then
  rm -rf "$SKILLS_DIR/zoopibot-query"
  cp -R "$PROJECT_DIR/openclaw/skills/zoopibot-query" "$SKILLS_DIR/"
  log "zoopibot-query 스킬을 복사했습니다."
fi

cat > "$CONFIG_FILE" <<EOF
{
  "\$schema": "https://openclaw.ai/schema/openclaw.json",

${ENV_BLOCK}  "agents": {
    "defaults": {
      "workspace": "${OPENCLAW_AGENT_WORKSPACE}",
      "model": {
        "primary": "${OPENCLAW_PRIMARY_MODEL}"
      }
    }
  },

  "gateway": {
    "mode": "local",
    "port": ${OPENCLAW_GATEWAY_PORT},
    "auth": {
      "token": "${OPENCLAW_GATEWAY_TOKEN}"
    },
    "http": {
      "endpoints": {
        "chatCompletions": { "enabled": true }
      }
    }
  },

  "skills": {
    "entries": {
      "zoopibot-query": {
        "enabled": true,
        "env": {
          "ZOOPIBOT_URL": "${ZOOPIBOT_PUBLIC_URL}",
          "ZOOPIBOT_SERVICE_TOKEN": "${ZOOPIBOT_SERVICE_TOKEN}"
        }
      }
    }
  }
}
EOF

log "OpenClaw 설정 파일을 생성했습니다: $CONFIG_FILE"
log "Provider mode: $OPENCLAW_PROVIDER_MODE"
log "Primary model: $OPENCLAW_PRIMARY_MODEL"
log "Gateway port: $OPENCLAW_GATEWAY_PORT"

if [ -n "$AUTH_HINT" ]; then
  log "추가 인증이 필요합니다: $AUTH_HINT"
fi

log "다음 단계:"
log "  1) openclaw gateway"
log "  2) yarn dev"
