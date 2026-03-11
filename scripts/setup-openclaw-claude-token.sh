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
  echo "[setup-openclaw-claude-token] $1"
}

fail() {
  echo "[setup-openclaw-claude-token] ERROR: $1" >&2
  exit 1
}

generate_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  elif command -v node >/dev/null 2>&1; then
    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  else
    date +%s | shasum -a 256 | cut -d' ' -f1
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

delete_env() {
  local key="$1"
  local tmp
  tmp="$(mktemp)"
  touch "$ENV_FILE"
  awk -v key="$key" 'index($0, key "=") != 1 { print }' "$ENV_FILE" > "$tmp"
  mv "$tmp" "$ENV_FILE"
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

OPENCLAW_URL="${OPENCLAW_URL:-http://127.0.0.1:18789}"
OPENCLAW_GATEWAY_PORT="${OPENCLAW_GATEWAY_PORT:-18789}"
OPENCLAW_GATEWAY_TOKEN="${OPENCLAW_GATEWAY_TOKEN:-}"
ZOOPIBOT_SERVICE_TOKEN="${ZOOPIBOT_SERVICE_TOKEN:-}"
ZOOPIBOT_PUBLIC_URL="${ZOOPIBOT_PUBLIC_URL:-${NEXTAUTH_URL:-http://localhost:3000}}"
OPENCLAW_PRIMARY_MODEL="${OPENCLAW_PRIMARY_MODEL:-anthropic/claude-opus-4-6}"
OPENCLAW_AGENT_WORKSPACE="${OPENCLAW_AGENT_WORKSPACE:-$WORKSPACE_DIR}"

if [ -z "$OPENCLAW_GATEWAY_TOKEN" ]; then
  OPENCLAW_GATEWAY_TOKEN="$(generate_secret)"
  upsert_env OPENCLAW_GATEWAY_TOKEN "$OPENCLAW_GATEWAY_TOKEN"
  log "OPENCLAW_GATEWAY_TOKEN을 생성해 .env에 저장했습니다."
fi

if [ -z "$ZOOPIBOT_SERVICE_TOKEN" ]; then
  ZOOPIBOT_SERVICE_TOKEN="$(generate_secret)"
  upsert_env ZOOPIBOT_SERVICE_TOKEN "$ZOOPIBOT_SERVICE_TOKEN"
  log "ZOOPIBOT_SERVICE_TOKEN을 생성해 .env에 저장했습니다."
fi

upsert_env AI_BACKEND "openclaw"
upsert_env OPENCLAW_URL "$OPENCLAW_URL"
upsert_env OPENCLAW_PROVIDER_MODE "anthropic-setup-token"
upsert_env OPENCLAW_PRIMARY_MODEL "$OPENCLAW_PRIMARY_MODEL"
delete_env ANTHROPIC_API_KEY
delete_env OPENAI_API_KEY

log "Claude CLI setup-token 인증을 시작합니다."
"$OPENCLAW_CMD" models auth setup-token --provider anthropic --yes

mkdir -p "$SKILLS_DIR" "$WORKSPACE_DIR"

if [ -d "$PROJECT_DIR/openclaw/skills/zoopibot-query" ]; then
  rm -rf "$SKILLS_DIR/zoopibot-query"
  cp -R "$PROJECT_DIR/openclaw/skills/zoopibot-query" "$SKILLS_DIR/"
  log "zoopibot-query 스킬을 복사했습니다."
fi

cat > "$CONFIG_FILE" <<EOF
{
  "\$schema": "https://openclaw.ai/schema/openclaw.json",

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
log "Provider mode: anthropic-setup-token"
log "Primary model: $OPENCLAW_PRIMARY_MODEL"
log "다음 단계:"
log "  1) yarn dev"
log "  2) 필요 시 OPENCLAW_AUTOSTART=0 yarn dev"
