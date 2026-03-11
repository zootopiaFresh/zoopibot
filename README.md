# Zoopibot - AI 코딩 어시스턴트

Claude Code 기반 사내 AI 어시스턴트 웹 애플리케이션

## 주요 기능

- **코드 문서화**: 코드를 입력하면 한국어 설명, 주석, README를 자동 생성
- **SQL 쿼리 생성**: 자연어를 SQL 쿼리로 변환
- **사용자 인증**: 이메일/비밀번호 기반 로그인
- **채팅 세션**: 대화 기반 AI 어시스턴트

## 기술 스택

- **Frontend**: Next.js 14 (App Router), React, TailwindCSS
- **Backend**: Next.js API Routes
- **Database**: SQLite (Prisma ORM)
- **AI**: Claude CLI 또는 OpenClaw Gateway (Codex API 연동 가능)
- **Auth**: NextAuth.js

## 시작하기

### 1. 패키지 설치

```bash
yarn install
```

### 2. 환경 변수 설정

`.env` 파일을 생성하고 필요한 환경 변수를 설정하세요:

```bash
# .env 예시
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
MYSQL_HOST="localhost"
MYSQL_PORT="3306"
MYSQL_USER="root"
MYSQL_PASSWORD=""
MYSQL_DATABASE=""
AI_BACKEND="openclaw"
OPENCLAW_URL="http://127.0.0.1:18789"
OPENCLAW_GATEWAY_TOKEN="your-gateway-token"
ZOOPIBOT_SERVICE_TOKEN="your-service-token"
```

### 3. 데이터베이스 초기화

```bash
npx prisma generate
npx prisma migrate dev
```

### 4. 개발 서버 실행

```bash
yarn dev
```

브라우저에서 http://localhost:3000 접속

### OpenClaw + Codex API 사용

OpenClaw Gateway를 API처럼 두고, 실제 모델은 Codex API로 붙이려면 아래 순서로 설정합니다.

```bash
./scripts/setup-openclaw.sh
```

기본 권장 경로는 `openclaw + Codex API`이며, 스크립트가 다음을 처리합니다.

- Zoopibot `.env` 생성
- `~/.openclaw/openclaw.json` 생성
- OpenClaw 기본 모델을 `openai/gpt-5.2-codex`로 설정
- Gateway `chatCompletions` 엔드포인트 활성화

실행:

```bash
openclaw gateway
yarn dev
```

또는:

```bash
./scripts/start.sh
```

### 서버 배포용 OpenClaw 부트스트랩

운영 서버에서는 대화형 `setup-openclaw.sh` 대신 `.env`만 채워두고 아래 스크립트를 쓰는 편이 낫습니다.

```bash
./scripts/bootstrap-openclaw.sh
```

지원 모드:

- `OPENCLAW_PROVIDER_MODE=openai-api-key`
  - 필요: `OPENAI_API_KEY`
  - 기본 모델: `openai/gpt-5.4`
- `OPENCLAW_PROVIDER_MODE=openai-codex`
  - 필요: 서버에서 1회 `openclaw models auth login --provider openai-codex`
  - 기본 모델: `openai-codex/gpt-5.4`
- `OPENCLAW_PROVIDER_MODE=anthropic-api-key`
  - 필요: `ANTHROPIC_API_KEY`, `OPENCLAW_PRIMARY_MODEL`

최소 예시:

```bash
AI_BACKEND=openclaw
OPENCLAW_PROVIDER_MODE=openai-api-key
OPENAI_API_KEY=...
OPENCLAW_GATEWAY_TOKEN=...
ZOOPIBOT_SERVICE_TOKEN=...
NEXTAUTH_URL=https://zoopibot.example.com
```

그 다음:

```bash
openclaw gateway
yarn dev
```

## 프로젝트 구조

```
zoopibot/
├── app/
│   ├── (auth)/              # 인증 관련 페이지
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/         # 대시보드 페이지
│   │   └── documentation/
│   ├── api/                 # API 라우트
│   │   ├── auth/
│   │   ├── chat/
│   │   ├── documentation/
│   │   ├── query/
│   │   └── sql/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── layout/
├── lib/
│   ├── auth.ts              # NextAuth 설정
│   ├── claude.ts            # Claude API 연동
│   ├── db.ts                # Prisma 클라이언트
│   ├── mysql.ts             # MySQL 연동
│   ├── schema.ts            # 스키마 관리
│   └── utils.ts
├── prisma/
│   └── schema.prisma
├── schema/                  # DB 스키마 문서
└── package.json
```

## API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| POST | /api/auth/register | 회원가입 |
| POST | /api/auth/signin | 로그인 (NextAuth) |
| POST | /api/documentation | 코드 문서화 |
| POST | /api/query | SQL 쿼리 생성 |
| POST | /api/sql/execute | SQL 실행 |
| GET/POST | /api/chat/sessions | 채팅 세션 관리 |

## 트러블슈팅

### Prisma 오류

```bash
# Prisma Client 재생성
npx prisma generate

# 데이터베이스 리셋
npx prisma migrate reset
```

### 포트 충돌

```bash
PORT=3001 yarn dev
```

## 라이선스

MIT
