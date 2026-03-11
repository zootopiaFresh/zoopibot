#!/bin/bash
set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OPENCLAW_CMD="${OPENCLAW_CMD:-$PROJECT_DIR/scripts/openclaw-cli.sh}"

print_header() {
  echo ""
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}  Zoopibot + OpenClaw 셋업 도우미${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
}

print_step() {
  echo ""
  echo -e "${BLUE}[$1/$TOTAL_STEPS]${NC} ${BOLD}$2${NC}"
  echo -e "${BLUE}$(printf '%.0s─' {1..50})${NC}"
}

print_ok() {
  echo -e "  ${GREEN}OK${NC} $1"
}

print_skip() {
  echo -e "  ${YELLOW}SKIP${NC} $1"
}

print_fail() {
  echo -e "  ${RED}FAIL${NC} $1"
}

prompt_input() {
  local prompt="$1"
  local default="$2"
  local var_name="$3"

  if [ -n "$default" ]; then
    echo -ne "  ${prompt} ${YELLOW}[${default}]${NC}: "
  else
    echo -ne "  ${prompt}: "
  fi

  read input
  if [ -z "$input" ] && [ -n "$default" ]; then
    eval "$var_name='$default'"
  else
    eval "$var_name='$input'"
  fi
}

prompt_secret() {
  local prompt="$1"
  local default="$2"
  local var_name="$3"

  if [ -n "$default" ]; then
    echo -ne "  ${prompt} ${YELLOW}[${default}]${NC}: "
  else
    echo -ne "  ${prompt}: "
  fi

  read -s input
  echo ""
  if [ -z "$input" ] && [ -n "$default" ]; then
    eval "$var_name='$default'"
  else
    eval "$var_name='$input'"
  fi
}

TOTAL_STEPS=6

# ─────────────────────────────────────────────
print_header

echo -e "이 스크립트는 다음을 수행합니다:"
echo -e "  1. Node.js 버전 확인"
echo -e "  2. OpenClaw 설치"
echo -e "  3. .env 파일 생성 (MySQL, 인증, OpenClaw Gateway 설정)"
echo -e "  4. Prisma 마이그레이션 + 클라이언트 생성"
echo -e "  5. OpenClaw 초기 설정 + Codex API 연결"
echo -e "  6. 실행 방법 안내"
echo ""
echo -ne "계속 진행할까요? (Y/n): "
read proceed
if [[ "$proceed" =~ ^[Nn] ]]; then
  echo "취소되었습니다."
  exit 0
fi

# ─────────────────────────────────────────────
# Step 1: Node.js 버전 확인
print_step 1 "Node.js 버전 확인"

if ! command -v node &> /dev/null; then
  print_fail "Node.js가 설치되지 않았습니다"
  echo -e "  ${YELLOW}Node.js 22 이상을 설치해주세요: https://nodejs.org${NC}"
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
  print_fail "Node.js $NODE_VERSION 감지 (22 이상 필요)"
  echo -e "  ${YELLOW}OpenClaw은 Node.js 22 이상이 필요합니다${NC}"
  echo -ne "  그래도 계속 진행할까요? (y/N): "
  read force
  if [[ ! "$force" =~ ^[Yy] ]]; then
    exit 1
  fi
else
  print_ok "Node.js v$(node -v | sed 's/v//') 감지"
fi

# ─────────────────────────────────────────────
# Step 2: OpenClaw 설치
print_step 2 "OpenClaw 설치"

if [ -x "$OPENCLAW_CMD" ]; then
  OPENCLAW_VER=$("$OPENCLAW_CMD" --version 2>/dev/null || echo "unknown")
  print_skip "OpenClaw 실행 래퍼 준비됨 ($OPENCLAW_VER)"
else
  print_fail "OpenClaw 실행 래퍼가 없습니다: $OPENCLAW_CMD"
  exit 1
fi

# ─────────────────────────────────────────────
# Step 3: .env 파일 생성
print_step 3 ".env 파일 생성"

ENV_FILE="$PROJECT_DIR/.env"

if [ -f "$ENV_FILE" ]; then
  echo -e "  ${YELLOW}.env 파일이 이미 존재합니다.${NC}"
  echo -ne "  덮어쓸까요? (y/N): "
  read overwrite
  if [[ ! "$overwrite" =~ ^[Yy] ]]; then
    print_skip ".env 파일 유지"
    # 기존 .env에서 값 읽기
    source "$ENV_FILE" 2>/dev/null || true
    SKIP_ENV=true
  fi
fi

if [ "$SKIP_ENV" != "true" ]; then
  echo ""
  echo -e "  ${BOLD}[ MySQL 접속 정보 ]${NC}"
  prompt_input "호스트" "localhost" MYSQL_HOST
  prompt_input "포트" "3306" MYSQL_PORT
  prompt_input "사용자" "root" MYSQL_USER
  prompt_secret "비밀번호" "" MYSQL_PASSWORD
  prompt_input "데이터베이스명" "" MYSQL_DATABASE

  echo ""
  echo -e "  ${BOLD}[ 인증 설정 ]${NC}"
  # 랜덤 시크릿 생성
  DEFAULT_SECRET=$(openssl rand -hex 32 2>/dev/null || echo "change-me-$(date +%s)")
  prompt_input "NextAuth Secret" "$DEFAULT_SECRET" NEXTAUTH_SECRET
  prompt_input "NextAuth URL" "http://localhost:3000" NEXTAUTH_URL

  echo ""
  echo -e "  ${BOLD}[ AI 백엔드 설정 ]${NC}"
  echo -e "  1) ${GREEN}openclaw + Codex API${NC} - OpenClaw Gateway 뒤에 OpenAI API 연결 (권장)"
  echo -e "  2) openclaw + Codex OAuth - ChatGPT/Codex 구독 인증 사용"
  echo -e "  3) claude-cli - Claude CLI 직접 호출 (기존 방식)"
  echo -ne "  선택 [1]: "
  read ai_choice
  if [ "$ai_choice" = "3" ]; then
    AI_BACKEND="claude-cli"
  else
    AI_BACKEND="openclaw"
  fi

  OPENCLAW_PROVIDER_MODE="openai-api-key"
  OPENCLAW_PRIMARY_MODEL="openai/gpt-5.4"
  OPENAI_API_KEY=""

  if [ "$AI_BACKEND" = "openclaw" ]; then
    if [ "$ai_choice" = "2" ]; then
      OPENCLAW_PROVIDER_MODE="openai-codex"
      OPENCLAW_PRIMARY_MODEL="openai-codex/gpt-5.4"
    fi
  fi

  # Gateway 토큰 생성
  DEFAULT_GW_TOKEN=$(openssl rand -hex 16 2>/dev/null || echo "gw-token-$(date +%s)")
  DEFAULT_SVC_TOKEN=$(openssl rand -hex 16 2>/dev/null || echo "svc-token-$(date +%s)")

  if [ "$AI_BACKEND" = "openclaw" ]; then
    prompt_input "OpenClaw Gateway URL" "http://127.0.0.1:18789" OPENCLAW_URL
    prompt_input "OpenClaw Gateway Token" "$DEFAULT_GW_TOKEN" OPENCLAW_GATEWAY_TOKEN

    if [ "$OPENCLAW_PROVIDER_MODE" = "openai-api-key" ]; then
      echo ""
      echo -e "  ${BOLD}[ Codex API 설정 ]${NC}"
      prompt_secret "OpenAI API Key" "" OPENAI_API_KEY
      if [ -z "$OPENAI_API_KEY" ]; then
        print_fail "Codex API를 쓰려면 OpenAI API Key가 필요합니다"
        exit 1
      fi
    fi
  fi

  prompt_input "v2 API 서비스 토큰" "$DEFAULT_SVC_TOKEN" ZOOPIBOT_SERVICE_TOKEN

  # .env 파일 작성
  cat > "$ENV_FILE" << ENVEOF
# ============================================
# Zoopibot 환경변수 (자동 생성: $(date '+%Y-%m-%d %H:%M'))
# ============================================

# --- DB (Prisma + SQLite) ---
DATABASE_URL="file:./dev.db"

# --- MySQL (대상 데이터베이스) ---
MYSQL_HOST=${MYSQL_HOST}
MYSQL_PORT=${MYSQL_PORT}
MYSQL_USER=${MYSQL_USER}
MYSQL_PASSWORD=${MYSQL_PASSWORD}
MYSQL_DATABASE=${MYSQL_DATABASE}

# --- 인증 (NextAuth) ---
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
NEXTAUTH_URL=${NEXTAUTH_URL}

# --- AI 백엔드 ---
# "openclaw" = OpenClaw Gateway | "claude-cli" = Claude CLI 직접 호출
AI_BACKEND=${AI_BACKEND}
OPENCLAW_URL=${OPENCLAW_URL:-http://127.0.0.1:18789}
OPENCLAW_GATEWAY_TOKEN=${OPENCLAW_GATEWAY_TOKEN:-$DEFAULT_GW_TOKEN}
OPENCLAW_PROVIDER_MODE=${OPENCLAW_PROVIDER_MODE}
OPENCLAW_PRIMARY_MODEL=${OPENCLAW_PRIMARY_MODEL}

# --- v2 API 서비스 토큰 ---
ZOOPIBOT_SERVICE_TOKEN=${ZOOPIBOT_SERVICE_TOKEN}
ENVEOF

  print_ok ".env 파일 생성 완료"
fi

# ─────────────────────────────────────────────
# Step 4: Prisma 마이그레이션
print_step 4 "Prisma 마이그레이션 + 클라이언트 생성"

cd "$PROJECT_DIR"

# yarn 의존성 확인
if [ ! -d "node_modules" ]; then
  echo -e "  의존성 설치 중..."
  yarn install 2>&1 | tail -3
fi

# .env 로드
source "$ENV_FILE" 2>/dev/null || true

echo -e "  마이그레이션 실행 중..."
DATABASE_URL="file:./dev.db" npx prisma@5.22.0 migrate dev 2>&1 | grep -E "(Applying|Applied|already in sync|Generated)" | head -10

print_ok "Prisma 설정 완료"

# ─────────────────────────────────────────────
# Step 5: OpenClaw 설정
print_step 5 "OpenClaw 초기 설정 + 스킬 복사"

OPENCLAW_DIR="$HOME/.openclaw"
SKILLS_DIR="$OPENCLAW_DIR/workspace/skills"

# OpenClaw 디렉토리 생성
mkdir -p "$SKILLS_DIR"
mkdir -p "$OPENCLAW_DIR/workspace"

# 스킬 복사
if [ -d "$PROJECT_DIR/openclaw/skills/zoopibot-query" ]; then
  cp -r "$PROJECT_DIR/openclaw/skills/zoopibot-query" "$SKILLS_DIR/"
  print_ok "zoopibot-query 스킬 복사 완료 → $SKILLS_DIR/zoopibot-query/"
fi

# openclaw.json 생성 (토큰 주입)
GW_TOKEN="${OPENCLAW_GATEWAY_TOKEN:-$DEFAULT_GW_TOKEN}"
SVC_TOKEN="${ZOOPIBOT_SERVICE_TOKEN:-$DEFAULT_SVC_TOKEN}"
PROVIDER_MODE="${OPENCLAW_PROVIDER_MODE:-openai-api-key}"
PRIMARY_MODEL="${OPENCLAW_PRIMARY_MODEL:-openai/gpt-5.4}"
ENV_BLOCK=""

if [ "$PROVIDER_MODE" = "openai-api-key" ]; then
  if [ -z "${OPENAI_API_KEY:-}" ]; then
    echo ""
    echo -e "  ${BOLD}[ Codex API 설정 ]${NC}"
    prompt_secret "OpenAI API Key" "" OPENAI_API_KEY
    if [ -z "$OPENAI_API_KEY" ]; then
      print_fail "Codex API를 쓰려면 OpenAI API Key가 필요합니다"
      exit 1
    fi
  fi

  OPENAI_KEY_VALUE="${OPENAI_API_KEY:-}"
  ENV_BLOCK=$(cat <<EOF
  "env": {
    "OPENAI_API_KEY": "${OPENAI_KEY_VALUE}"
  },

EOF
)
fi

cat > "$OPENCLAW_DIR/openclaw.json" << OCEOF
{
  "\$schema": "https://openclaw.ai/schema/openclaw.json",

${ENV_BLOCK}  "agents": {
    "defaults": {
      "workspace": "$OPENCLAW_DIR/workspace",
      "model": {
        "primary": "${PRIMARY_MODEL}"
      }
    }
  },

  "gateway": {
    "mode": "local",
    "port": 18789,
    "auth": {
      "token": "${GW_TOKEN}"
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
          "ZOOPIBOT_URL": "http://localhost:3000",
          "ZOOPIBOT_SERVICE_TOKEN": "${SVC_TOKEN}"
        }
      }
    }
  }
}
OCEOF

print_ok "openclaw.json 생성 완료 → $OPENCLAW_DIR/openclaw.json"

if [ "$PROVIDER_MODE" = "openai-codex" ]; then
  echo -e "  ${YELLOW}추가 인증 필요:${NC} $OPENCLAW_CMD models auth login --provider openai-codex"
fi

# ─────────────────────────────────────────────
# Step 6: 실행 안내
print_step 6 "완료! 실행 방법"

echo ""
echo -e "  ${GREEN}${BOLD}셋업이 완료되었습니다!${NC}"
echo ""
echo -e "  ${BOLD}실행 방법 (터미널 2개 필요):${NC}"
echo ""
echo -e "  ${CYAN}터미널 1 — OpenClaw Gateway:${NC}"
echo -e "  $ ${BOLD}$OPENCLAW_CMD gateway${NC}"
echo ""
echo -e "  ${CYAN}터미널 2 — Zoopibot:${NC}"
echo -e "  $ ${BOLD}cd $PROJECT_DIR && yarn dev${NC}"
echo ""
echo -e "  ${CYAN}테스트:${NC}"
echo -e "  $ ${BOLD}curl -s http://localhost:3000/api/v2/health | jq .${NC}"
echo ""
echo -e "  ${BOLD}빠른 실행 (백그라운드):${NC}"
echo -e "  $ ${BOLD}$PROJECT_DIR/scripts/start.sh${NC}"
echo ""

# start.sh 생성
cat > "$PROJECT_DIR/scripts/start.sh" << 'STARTEOF'
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
STARTEOF

chmod +x "$PROJECT_DIR/scripts/start.sh"
chmod +x "$PROJECT_DIR/scripts/setup-openclaw.sh"

print_ok "start.sh 생성 완료"
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
