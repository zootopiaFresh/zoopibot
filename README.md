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
- **AI**: Claude API
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
NEXTAUTH_URL="http://localhost:2999"
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

브라우저에서 http://localhost:2999 접속

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
