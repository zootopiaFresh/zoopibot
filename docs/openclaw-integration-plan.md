# OpenClaw + Zoopibot 통합 계획서 (v2)

> 작성일: 2026-03-09
> 목표: 웹 UI에서 수행하던 모든 사용자 행동을 OpenClaw(Slack) 기반으로 전환

---

## 1. 전환 전략: 웹 행동 → OpenClaw 매핑

### 현재 웹 UI 행동 전체 목록과 전환 방식

| # | 웹에서 하던 행동 | OpenClaw 전환 방식 | Phase |
|---|-----------------|-------------------|-------|
| **핵심 기능** |
| 1 | 자연어로 SQL 생성 (채팅) | Slack DM으로 자연어 질문 → SQL 응답 | 1 |
| 2 | 생성된 SQL 실행 + 결과 조회 | "실행해줘" 또는 자동 실행 → 결과 테이블 | 1 |
| 3 | SQL 결과 해석 요청 | "이 결과 분석해줘" → 한국어 해석 | 1 |
| 4 | 연속 대화 (이전 맥락 유지) | OpenClaw 세션 메모리 활용 (네이티브) | 1 |
| 5 | 대화 세션 관리 (생성/삭제/목록) | `/새대화`, `/대화목록`, `/대화삭제` 명령 | 2 |
| **개인화** |
| 6 | SQL 스타일 선호도 설정 | `/설정 스타일 uppercase` 등 명령 | 2 |
| 7 | 도메인 용어 등록/조회/삭제 | `/용어 추가 "활성회원" "status='active'"` | 2 |
| 8 | 비즈니스 규칙 등록/관리 | `/규칙 추가 "삭제제외" "deleted_at IS NULL"` | 2 |
| 9 | 피드백 제출 (좋아요/수정요청) | Slack 이모지 리액션 또는 `/피드백` 명령 | 2 |
| **관리자** |
| 10 | 사용자 승인/비활성화 | `/관리 사용자승인 email@...` | 3 |
| 11 | 에러 로그 조회 | `/관리 에러목록` | 3 |
| 12 | 피드백 리뷰/처리 | `/관리 피드백목록`, `/관리 피드백처리 [id]` | 3 |
| 13 | 스키마 프롬프트 관리 | 워크스페이스 파일로 관리 (schema/*.md) | 3 |
| 14 | 배치 학습 실행 | `/관리 학습실행` | 3 |

### 전환 아키텍처

```
AS-IS (현재):
[사용자] → [브라우저] → [Next.js Web UI] → [REST API] → [lib/*] → [Claude CLI + MySQL]

TO-BE (전환 후):
[사용자] → [Slack] → [OpenClaw Gateway] → [OpenClaw Agent]
                                              │
                                              ├── zoopibot-query Skill    (SQL 생성/실행/해석)
                                              ├── zoopibot-settings Skill (설정/용어/규칙)
                                              └── zoopibot-admin Skill    (관리자 기능)
                                              │
                                              ▼ (HTTP → Zoopibot API)
                                        [Next.js API Routes]  ← 기존 + 신규 엔드포인트
                                              │
                                              ▼
                                        [lib/*] → [Claude CLI + MySQL]
```

### 핵심 설계 원칙

1. **Backend는 그대로 유지** — lib/* 함수들은 변경 없이 재활용
2. **API 레이어를 범용화** — 웹 전용 → Slack에서도 호출 가능한 API로 확장
3. **OpenClaw 스킬이 UX 담당** — 사용자 의도 파악, 명령 라우팅, 결과 포맷팅
4. **OpenClaw 메모리로 세션 관리** — 별도 SlackSession 모델 불필요 (OpenClaw 네이티브)

---

## 2. 단계별 실행 계획

### Phase 1: 핵심 워크플로우 전환 (3-5일)

> Slack에서 SQL 생성 → 실행 → 결과 확인 → 해석까지 한 플로우로 동작

#### Task 1.1: OpenClaw 설치 + Slack 연결

**작업:**
- OpenClaw Gateway 로컬 설치
- Slack App 생성 및 Bot Token 설정
- Socket Mode로 Slack 연동 (PoC용)

**openclaw.json 기본 설정:**
```json5
{
  "$schema": "https://openclaw.ai/schema/openclaw.json",
  agents: {
    defaults: {
      workspace: "~/.openclaw/workspace",
      model: {
        primary: "anthropic/claude-sonnet-4-5"  // OpenClaw 자체 AI
      }
    }
  },
  channels: {
    slack: {
      mode: "socket",
      allowFrom: ["@회사워크스페이스.slack.com"]
    }
  },
  gateway: {
    port: 18789
  }
}
```

**검증:** Slack DM → OpenClaw 응답 확인

---

#### Task 1.2: Zoopibot 통합 API 구축

기존 웹 전용 API를 Slack에서도 호출 가능하도록 범용 API 레이어 추가.

**새 파일: `app/api/v2/query/route.ts`**
```
POST /api/v2/query
Headers: Authorization: Bearer <service-token>
Body: {
  "question": "이번 달 신규 회원 수",
  "userId": "user-id",           // Zoopibot 내부 userId
  "sessionId": "optional-id",    // 연속 대화용
  "execute": true,               // SQL 자동 실행 여부
  "interpret": false             // 결과 해석 포함 여부
}
Response: {
  "sql": "SELECT COUNT(*) FROM member WHERE ...",
  "explanation": "이 쿼리는...",
  "data": [{"count": 42}],       // execute=true일 때
  "interpretation": "...",        // interpret=true일 때
  "sessionId": "auto-generated"  // 연속 대화 추적용
}
```

**새 파일: `app/api/v2/execute/route.ts`**
```
POST /api/v2/execute
Body: { "sql": "SELECT ...", "userId": "user-id" }
Response: { "data": [...], "rowCount": 42, "columns": [...] }
```

**새 파일: `app/api/v2/interpret/route.ts`**
```
POST /api/v2/interpret
Body: { "question": "분석해줘", "sql": "...", "data": [...], "userId": "..." }
Response: { "interpretation": "조회 결과..." }
```

**구현 요점:**
- 기존 `generateSQL()`, `executeQuery()`, `runClaudeCLI()` 직접 호출
- `userId`로 선호도/용어/규칙 자동 로드 (기존 context 시스템 그대로)
- 서비스 토큰 인증 (OpenClaw ↔ Zoopibot 간 내부 통신)
- 기존 웹 API도 그대로 유지 (v2는 별도 경로)

**새 파일: `lib/service-auth.ts`**
```typescript
// 서비스 간 인증 (OpenClaw → Zoopibot)
// 환경변수 ZOOPIBOT_SERVICE_TOKEN으로 검증
```

---

#### Task 1.3: OpenClaw 스킬 — zoopibot-query

**파일: `openclaw/skills/zoopibot-query/SKILL.md`**
(프로젝트 내에서 관리, 배포 시 ~/.openclaw/workspace/skills/에 복사)

```markdown
---
name: zoopibot-query
description: |
  Zoopibot SQL 도구. 사용자의 자연어 질문을 SQL로 변환하고,
  실행하고, 결과를 해석합니다. 데이터베이스 관련 모든 질문에 사용하세요.
version: 1.0.0
metadata:
  openclaw:
    requires:
      env:
        - ZOOPIBOT_URL
        - ZOOPIBOT_SERVICE_TOKEN
      bins:
        - curl
        - jq
    primaryEnv: ZOOPIBOT_SERVICE_TOKEN
    emoji: "🔍"
---

## 언제 사용하나

사용자가 다음과 같은 요청을 하면 이 스킬을 사용하세요:
- 데이터 조회/분석 요청 ("회원 수 알려줘", "매출 보여줘")
- SQL 관련 질문
- 이전 쿼리 결과에 대한 후속 질문
- "실행해줘" / "결과 보여줘" 등의 실행 요청
- "분석해줘" / "해석해줘" 등의 해석 요청

## SQL 생성 + 실행

사용자의 질문을 SQL로 변환합니다.
`execute`를 true로 설정하면 SQL을 바로 실행하고 결과도 함께 반환합니다.

```bash
curl -s -X POST "${ZOOPIBOT_URL}/api/v2/query" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ZOOPIBOT_SERVICE_TOKEN}" \
  -d '{
    "question": "<사용자 질문>",
    "userId": "<사용자 ID>",
    "sessionId": "<이전 세션 ID 또는 null>",
    "execute": true,
    "interpret": false
  }' | jq .
```

## SQL만 실행 (이미 SQL이 있을 때)

```bash
curl -s -X POST "${ZOOPIBOT_URL}/api/v2/execute" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ZOOPIBOT_SERVICE_TOKEN}" \
  -d '{
    "sql": "<SQL 쿼리>",
    "userId": "<사용자 ID>"
  }' | jq .
```

## 결과 해석

쿼리 결과를 비즈니스 관점에서 한국어로 해석합니다.

```bash
curl -s -X POST "${ZOOPIBOT_URL}/api/v2/interpret" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ZOOPIBOT_SERVICE_TOKEN}" \
  -d '{
    "question": "<해석 요청>",
    "sql": "<원본 SQL>",
    "data": <쿼리 결과 JSON>,
    "userId": "<사용자 ID>"
  }' | jq .
```

## 응답 포맷팅 규칙

1. **SQL은 항상 코드 블록**으로 표시
2. **설명은 한국어**로 간결하게
3. **데이터는 표 형태**로 정리 (10행 이하면 전체, 초과 시 상위 10행 + "외 N건")
4. **에러 시** 사용자에게 친절한 안내 메시지
5. **연속 대화** 시 이전 sessionId를 재사용

## 사용자 ID 매핑

Slack 사용자의 Zoopibot userId를 조회합니다:

```bash
curl -s "${ZOOPIBOT_URL}/api/v2/users/by-slack/<Slack User ID>" \
  -H "Authorization: Bearer ${ZOOPIBOT_SERVICE_TOKEN}" | jq -r '.userId'
```

사용자가 연결되어 있지 않으면 `/연결` 명령을 안내하세요.
```

---

#### Task 1.4: Slack User ↔ Zoopibot User 연결

Phase 1에서 바로 구현 (개인화된 SQL 생성에 필수).

**새 파일: `app/api/v2/users/route.ts`**
```
GET  /api/v2/users/by-slack/:slackUserId → { userId, email, name }
POST /api/v2/users/link → { slackUserId, email } → 매핑 생성
```

**Prisma 스키마 추가:**
```prisma
model SlackUserMapping {
  id          String   @id @default(cuid())
  slackUserId String   @unique
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  linkedAt    DateTime @default(now())

  @@index([slackUserId])
  @@index([userId])
}
```

**Slack에서 연결 플로우:**
```
사용자: "회원 수 알려줘"
봇: "먼저 Zoopibot 계정을 연결해주세요. `/연결 your@email.com` 을 입력하세요."
사용자: "/연결 donghwan@company.com"
봇: "donghwan@company.com 계정과 연결되었습니다! 이제 질문해주세요."
```

---

#### Task 1.5: E2E 테스트

| # | Slack 입력 | 기대 동작 |
|---|-----------|----------|
| 1 | `/연결 user@email.com` | 계정 연결 |
| 2 | "이번 달 신규 회원 수 알려줘" | SQL 생성 + 실행 + 결과 |
| 3 | "이 결과를 분석해줘" | 한국어 해석 |
| 4 | "거기서 VIP만 필터해줘" | 연속 대화 (이전 맥락 반영) |
| 5 | "결과를 CSV로 보여줘" | 데이터 포맷 변환 |

---

### Phase 2: 개인화 + 관리 워크플로우 전환 (3-5일)

> 웹 설정 페이지에서 하던 모든 개인화 행동을 Slack 명령으로 전환

#### Task 2.1: OpenClaw 스킬 — zoopibot-settings

**파일: `openclaw/skills/zoopibot-settings/SKILL.md`**

사용자 설정/용어/규칙 관리를 위한 스킬. 아래 명령들을 처리:

**선호도 관리:**
```
/설정 보기                    → 현재 설정 조회
/설정 키워드 uppercase        → SQL 키워드 대문자
/설정 키워드 lowercase        → SQL 키워드 소문자
/설정 별칭 short              → 짧은 별칭 (t1, t2)
/설정 별칭 meaningful         → 의미있는 별칭 (members, orders)
/설정 들여쓰기 2spaces        → 2칸 들여쓰기
/설정 상세도 brief            → 간단한 설명
/설정 상세도 detailed         → 자세한 설명
/설정 톤 formal               → 격식체
/설정 톤 casual               → 비격식체
```

**도메인 용어 관리:**
```
/용어 목록                           → 등록된 용어 전체 조회
/용어 추가 "활성회원" "status='ACTIVE'" "활성 상태인 회원"
/용어 수정 [id] "수정된매핑"
/용어 삭제 [id]
/용어 검색 "회원"                    → 키워드로 검색
```

**비즈니스 규칙 관리:**
```
/규칙 목록                           → 등록된 규칙 전체 조회
/규칙 추가 "삭제제외" "deleted_at IS NULL" --범위=전체
/규칙 추가 "테스트제외" "email NOT LIKE '%test%'" --범위=member
/규칙 활성화 [id]
/규칙 비활성화 [id]
/규칙 삭제 [id]
```

**새 API 엔드포인트들:**

| Method | Path | 웹 대응 |
|--------|------|---------|
| `GET` | `/api/v2/preferences/:userId` | 설정 조회 |
| `PUT` | `/api/v2/preferences/:userId` | 설정 변경 |
| `GET` | `/api/v2/terms/:userId` | 용어 목록 |
| `POST` | `/api/v2/terms/:userId` | 용어 추가 |
| `PUT` | `/api/v2/terms/:userId/:termId` | 용어 수정 |
| `DELETE` | `/api/v2/terms/:userId/:termId` | 용어 삭제 |
| `GET` | `/api/v2/rules/:userId` | 규칙 목록 |
| `POST` | `/api/v2/rules/:userId` | 규칙 추가 |
| `PUT` | `/api/v2/rules/:userId/:ruleId` | 규칙 수정 |
| `DELETE` | `/api/v2/rules/:userId/:ruleId` | 규칙 삭제 |

**구현 요점:**
- 기존 `lib/preferences.ts`, `lib/context.ts`의 함수들을 그대로 호출
- userId는 SlackUserMapping을 통해 자동 변환
- 명령어 파싱은 OpenClaw Agent가 자연어로 처리 (정확한 슬래시 명령 불필요)

---

#### Task 2.2: 피드백 시스템 전환

**웹에서의 행동:** 채팅 메시지에 좋아요/싫어요 버튼 → 상세 피드백 폼

**Slack 전환:**

| Slack 행동 | 처리 |
|-----------|------|
| SQL 응답에 👍 이모지 리액션 | 긍정 피드백 자동 기록 |
| SQL 응답에 👎 이모지 리액션 | "어떤 점이 잘못되었나요?" 후속 질문 |
| `/피드백 수정 "WHERE절에 날짜 필터 빠짐"` | 수정 피드백 기록 |
| `/피드백 규칙 "항상 deleted_at IS NULL 포함해줘"` | 규칙 제안 피드백 |

**새 API:**
```
POST /api/v2/feedback
Body: { "userId", "type": "preference|correction|rule", "content", "messageContext" }
```

**이모지 리액션 처리:**
- OpenClaw의 Slack 이벤트 구독으로 `reaction_added` 감지
- SKILL.md에 리액션 → 피드백 매핑 규칙 정의

---

#### Task 2.3: 세션 관리 명령

**웹에서의 행동:** 사이드바에서 세션 생성/전환/삭제

**Slack 전환:**
```
/새대화              → 새 세션 시작 (현재 대화 컨텍스트 초기화)
/대화목록            → 최근 대화 세션 목록 (최대 10개)
/대화전환 [id]       → 이전 세션으로 전환
/대화삭제 [id]       → 세션 삭제
```

**구현:**
- 기존 `/api/chat/sessions` API를 v2로 래핑
- OpenClaw 메모리에 현재 활성 sessionId 저장
- "새 대화" 시 OpenClaw 세션 컨텍스트도 초기화

---

### Phase 3: 관리자 워크플로우 + 운영 (3-5일)

> 관리자 웹 페이지에서 하던 행동을 Slack 명령으로 전환

#### Task 3.1: OpenClaw 스킬 — zoopibot-admin

**파일: `openclaw/skills/zoopibot-admin/SKILL.md`**

관리자 전용 스킬. 관리자 권한 확인 후 동작.

**사용자 관리:**
```
/관리 사용자목록                    → 전체 사용자 (상태별 필터 가능)
/관리 사용자승인 user@email.com    → pending → active 전환
/관리 사용자비활성화 user@email.com → active → inactive 전환
/관리 사용자상세 user@email.com    → 사용자 프로필 + 활동 통계
```

**모니터링:**
```
/관리 대시보드                     → 핵심 통계 (사용자 수, 오늘 쿼리 수, 에러 수)
/관리 에러목록                     → 최근 에러 (유형별 필터 가능)
/관리 에러상세 [id]                → 에러 상세 (프롬프트, 응답, 메타데이터)
/관리 에러통계                     → 에러 유형별 집계
```

**피드백 관리:**
```
/관리 피드백목록                   → 미처리 피드백 목록
/관리 피드백처리 [id]              → 피드백을 처리됨으로 마킹
/관리 피드백상세 [id]              → 피드백 상세 (세션 컨텍스트 포함)
```

**학습:**
```
/관리 학습실행                     → 배치 학습 트리거
/관리 학습로그                     → 최근 학습 결과
/관리 자주사용테이블               → 전체 사용자 테이블 사용 통계
```

**스키마 관리:**
```
/관리 스키마목록                   → 활성 스키마 프롬프트 목록
/관리 스키마캐시초기화             → 스키마 캐시 무효화
```
(스키마 수정은 복잡한 마크다운 편집이므로 웹 UI 유지)

**새 API 엔드포인트들:**

기존 `/api/admin/*` API를 v2로 래핑:

| Method | Path | 웹 대응 |
|--------|------|---------|
| `GET` | `/api/v2/admin/stats` | 대시보드 통계 |
| `GET` | `/api/v2/admin/users` | 사용자 목록 |
| `PATCH` | `/api/v2/admin/users/:id` | 사용자 상태 변경 |
| `GET` | `/api/v2/admin/errors` | 에러 목록 |
| `GET` | `/api/v2/admin/feedbacks` | 피드백 목록 |
| `PATCH` | `/api/v2/admin/feedbacks/:id` | 피드백 처리 |
| `POST` | `/api/v2/admin/learning/run` | 배치 학습 실행 |
| `POST` | `/api/v2/admin/schema/invalidate` | 캐시 초기화 |

**권한 체크:**
- SlackUserMapping → userId → User.role 확인
- admin이 아니면 "관리자 권한이 필요합니다" 응답

---

#### Task 3.2: 보안 + 에러 처리

**보안:**
- 서비스 토큰 인증 (ZOOPIBOT_SERVICE_TOKEN)
- Rate limiting: 사용자당 분당 10회
- 관리자 API는 role 검증 필수
- 입력 길이 제한 (10,000자)

**에러 처리:**
- Claude CLI 타임아웃 → "처리 중..." 메시지 표시
- 에러 유형별 한국어 메시지
- 모든 실패를 GenerationError 테이블에 기록

**Slack 포맷팅:**
- SQL → 코드 블록 (```sql```)
- 데이터 → 표 형태 또는 compact JSON
- 에러 → 경고 아이콘 + 안내 메시지
- 긴 응답 → 분할 전송 (4,000자 제한)

---

#### Task 3.3: 배포 + 운영

**Docker Compose:**
```yaml
version: '3.8'
services:
  zoopibot:
    build: .
    ports:
      - "3000:3000"
    env_file: .env.production
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/v2/health"]

  openclaw:
    image: node:22
    command: npx openclaw gateway
    volumes:
      - ./openclaw/skills:/root/.openclaw/workspace/skills
      - ./openclaw/config:/root/.openclaw
    depends_on:
      zoopibot:
        condition: service_healthy
    environment:
      - ZOOPIBOT_URL=http://zoopibot:3000
      - ZOOPIBOT_SERVICE_TOKEN=${ZOOPIBOT_SERVICE_TOKEN}
```

**헬스체크:**
```
GET /api/v2/health → { "status": "ok", "claude": true, "db": true }
```

---

## 3. 파일 변경 전체 목록

### 신규 파일

| 파일 | Phase | 설명 |
|------|-------|------|
| **API v2 — 핵심** |
| `app/api/v2/query/route.ts` | 1 | SQL 생성 통합 API |
| `app/api/v2/execute/route.ts` | 1 | SQL 실행 API |
| `app/api/v2/interpret/route.ts` | 1 | 결과 해석 API |
| `app/api/v2/users/link/route.ts` | 1 | Slack ↔ User 연결 |
| `app/api/v2/users/by-slack/[slackId]/route.ts` | 1 | Slack ID로 User 조회 |
| `app/api/v2/health/route.ts` | 1 | 헬스체크 |
| `lib/service-auth.ts` | 1 | 서비스 토큰 인증 |
| **API v2 — 설정** |
| `app/api/v2/preferences/[userId]/route.ts` | 2 | 선호도 CRUD |
| `app/api/v2/terms/[userId]/route.ts` | 2 | 용어 CRUD |
| `app/api/v2/rules/[userId]/route.ts` | 2 | 규칙 CRUD |
| `app/api/v2/feedback/route.ts` | 2 | 피드백 제출 |
| `app/api/v2/sessions/route.ts` | 2 | 세션 관리 |
| **API v2 — 관리자** |
| `app/api/v2/admin/stats/route.ts` | 3 | 대시보드 통계 |
| `app/api/v2/admin/users/route.ts` | 3 | 사용자 관리 |
| `app/api/v2/admin/errors/route.ts` | 3 | 에러 조회 |
| `app/api/v2/admin/feedbacks/route.ts` | 3 | 피드백 관리 |
| `app/api/v2/admin/learning/route.ts` | 3 | 배치 학습 |
| `app/api/v2/admin/schema/route.ts` | 3 | 스키마 캐시 |
| **OpenClaw 스킬** |
| `openclaw/skills/zoopibot-query/SKILL.md` | 1 | SQL 생성/실행/해석 스킬 |
| `openclaw/skills/zoopibot-settings/SKILL.md` | 2 | 설정/용어/규칙 스킬 |
| `openclaw/skills/zoopibot-admin/SKILL.md` | 3 | 관리자 스킬 |
| **인프라** |
| `openclaw/config/openclaw.json` | 1 | OpenClaw 설정 |
| `docker-compose.yml` | 3 | 통합 배포 |

### 수정 파일

| 파일 | Phase | 변경 내용 |
|------|-------|----------|
| `prisma/schema.prisma` | 1 | SlackUserMapping 모델 추가 |
| `.env.example` | 1 | ZOOPIBOT_SERVICE_TOKEN 추가 |

---

## 4. 웹 행동 → Slack 대화 예시

### 예시 1: SQL 생성 + 실행 + 해석 (Phase 1)

```
👤 이번 달 신규 가입 회원 수 알려줘

🤖 SQL을 생성하고 실행했습니다.

  SELECT COUNT(*) as new_members
  FROM member
  WHERE created_at >= '2026-03-01'
    AND deleted_at IS NULL

📊 결과:
| new_members |
|-------------|
| 42          |

이번 달(3월) 신규 가입 회원은 42명입니다.

👤 그 중에서 VIP 등급인 회원만 보여줘

🤖 이전 쿼리를 기반으로 필터링했습니다.

  SELECT name, email, grade, created_at
  FROM member
  WHERE created_at >= '2026-03-01'
    AND deleted_at IS NULL
    AND grade = 'VIP'
  ORDER BY created_at DESC

📊 결과:
| name   | email              | grade | created_at |
|--------|--------------------|-------|------------|
| 김철수 | cs.kim@example.com | VIP   | 2026-03-08 |
| 이영희 | yh.lee@example.com | VIP   | 2026-03-05 |

2명의 VIP 등급 신규 회원이 있습니다.

👤 이 결과를 좀 더 자세히 분석해줘

🤖 분석 결과:
이번 달 신규 가입 회원 42명 중 VIP 등급은 2명(4.8%)입니다.
VIP 전환율이 낮은 편이며, 두 명 모두 3월 초에 가입했습니다...
```

### 예시 2: 설정 변경 (Phase 2)

```
👤 SQL 키워드를 소문자로 바꿔줘

🤖 SQL 키워드 스타일을 lowercase로 변경했습니다.
변경 전: SELECT, FROM, WHERE
변경 후: select, from, where

👤 /용어 추가 "활성펫" "pet.status='ACTIVE'" "활성 상태의 반려동물"

🤖 도메인 용어를 등록했습니다.
용어: 활성펫
매핑: pet.status='ACTIVE'
설명: 활성 상태의 반려동물

이후 "활성펫"이라고 하면 자동으로 pet.status='ACTIVE' 조건이 적용됩니다.
```

### 예시 3: 관리자 (Phase 3)

```
👤 /관리 대시보드

🤖 📊 Zoopibot 대시보드
━━━━━━━━━━━━━━━
👥 전체 사용자: 15명 (활성 12 / 대기 2 / 비활성 1)
📝 오늘 쿼리 수: 28건
⚠️ 미처리 에러: 3건
💬 미처리 피드백: 5건

👤 /관리 사용자승인 newuser@company.com

🤖 ✅ newuser@company.com 사용자를 승인했습니다.
상태: pending → active
```

---

## 5. 웹 UI에서 계속 유지하는 기능

일부 기능은 Slack보다 웹이 더 적합하므로 유지:

| 기능 | 이유 |
|------|------|
| 스키마 프롬프트 편집 | 마크다운 에디터가 필요, 긴 문서 편집에 Slack 부적합 |
| 사용자 등록 (회원가입) | 최초 1회, 웹 폼이 자연스러움 |
| 대화 히스토리 전체 조회 | 긴 대화 스크롤은 웹이 편리 |
| CSV 다운로드 | 파일 다운로드는 웹이 자연스러움 |

---

## 6. 리스크 및 대응

| 리스크 | 영향 | 대응 |
|--------|------|------|
| Claude CLI 응답 지연 (120초) | Slack UX 저하 | "처리 중..." 선전송 + 결과 업데이트 |
| Slack 메시지 길이 제한 (4,000자) | 긴 SQL/데이터 잘림 | 분할 전송, 10행 초과 시 요약 |
| 동시 사용자 증가 | Claude CLI 병목 | Rate limiting, 필요 시 API 전환 |
| OpenClaw 보안 취약점 | 내부 데이터 노출 | localhost 바인딩, 서비스 토큰 인증 |
| Slack 사용자 명령어 학습 곡선 | 사용자 혼란 | 자연어도 지원 (명령어는 shortcut), /도움말 제공 |

---

## 7. 성공 기준

### Phase 1 완료 조건
- [ ] Slack에서 계정 연결 → SQL 생성 → 실행 → 결과 확인 → 해석 전체 플로우
- [ ] 연속 대화 (이전 맥락 유지) 동작
- [ ] 응답 시간 30초 이내

### Phase 2 완료 조건
- [ ] Slack에서 선호도/용어/규칙 CRUD 전체 동작
- [ ] 피드백 (이모지 리액션 + 명령어) 동작
- [ ] 세션 관리 (생성/전환/삭제) 동작

### Phase 3 완료 조건
- [ ] 관리자 기능 전체 동작 (사용자 관리, 에러 조회, 피드백 리뷰, 학습 실행)
- [ ] Docker Compose로 원클릭 배포
- [ ] 보안 (서비스 토큰 + Rate limiting) 적용

---

## 8. 커밋 전략

```
Phase 1:
  feat: v2 API — SQL 생성/실행/해석 통합 엔드포인트
  feat: Slack 사용자 연결 모델 및 API
  feat: 서비스 토큰 인증 미들웨어
  feat: OpenClaw zoopibot-query 스킬

Phase 2:
  feat: v2 API — 선호도/용어/규칙 관리
  feat: v2 API — 피드백 제출 및 세션 관리
  feat: OpenClaw zoopibot-settings 스킬

Phase 3:
  feat: v2 API — 관리자 기능 (통계, 사용자, 에러, 피드백, 학습)
  feat: OpenClaw zoopibot-admin 스킬
  feat: Docker Compose 배포 구성
  feat: 보안 강화 (Rate limiting, 에러 처리)
```
