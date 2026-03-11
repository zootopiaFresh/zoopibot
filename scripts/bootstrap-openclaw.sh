#!/bin/bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OPENCLAW_CMD="${OPENCLAW_CMD:-$PROJECT_DIR/scripts/openclaw-cli.sh}"
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

generate_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  elif command -v node >/dev/null 2>&1; then
    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  else
    date +%s | sha256sum | cut -d' ' -f1
  fi
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

if [ ! -x "$OPENCLAW_CMD" ]; then
  fail "OpenClaw 실행 래퍼가 없습니다: $OPENCLAW_CMD"
fi

if [ "${INSTALL_OPENCLAW}" = "1" ]; then
  log "로컬 openclaw 실행 파일을 확인합니다."
  "$OPENCLAW_CMD" --version >/dev/null
fi

if [ -z "$OPENCLAW_GATEWAY_TOKEN" ]; then
  OPENCLAW_GATEWAY_TOKEN="$(generate_secret)"
  upsert_env OPENCLAW_GATEWAY_TOKEN "$OPENCLAW_GATEWAY_TOKEN"
  log "OPENCLAW_GATEWAY_TOKEN이 없어 새 값을 생성해 .env에 저장했습니다."
fi

if [ -z "$ZOOPIBOT_SERVICE_TOKEN" ]; then
  ZOOPIBOT_SERVICE_TOKEN="$(generate_secret)"
  upsert_env ZOOPIBOT_SERVICE_TOKEN "$ZOOPIBOT_SERVICE_TOKEN"
  log "ZOOPIBOT_SERVICE_TOKEN이 없어 새 값을 생성해 .env에 저장했습니다."
fi

upsert_env AI_BACKEND "$AI_BACKEND"
upsert_env OPENCLAW_URL "$OPENCLAW_URL"
upsert_env OPENCLAW_PROVIDER_MODE "$OPENCLAW_PROVIDER_MODE"

case "$OPENCLAW_PROVIDER_MODE" in
  openai-api-key)
    require_var OPENAI_API_KEY
    if [ -z "$OPENCLAW_PRIMARY_MODEL" ]; then
      OPENCLAW_PRIMARY_MODEL="openai/gpt-5.4"
    fi
    upsert_env OPENCLAW_PRIMARY_MODEL "$OPENCLAW_PRIMARY_MODEL"
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
    upsert_env OPENCLAW_PRIMARY_MODEL "$OPENCLAW_PRIMARY_MODEL"
    ENV_BLOCK=""
    AUTH_HINT="$OPENCLAW_CMD models auth login --provider openai-codex"
    ;;
  anthropic-api-key)
    require_var ANTHROPIC_API_KEY
    if [ -z "$OPENCLAW_PRIMARY_MODEL" ]; then
      fail "anthropic-api-key 모드에서는 OPENCLAW_PRIMARY_MODEL도 지정해주세요. 예: anthropic/claude-opus-4-1"
    fi
    upsert_env OPENCLAW_PRIMARY_MODEL "$OPENCLAW_PRIMARY_MODEL"
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

${ENV_BLOCK}
  "agents": {
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
log "  1) yarn dev"
log "  2) 운영 빌드 실행 시 yarn start"
