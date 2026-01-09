# 맞춤형 프롬프트 시스템 기술 기획서

## 1. Summary

- 사용자별로 SQL 쿼리 생성 프롬프트를 맞춤화하는 시스템
- 선호 스타일, 도메인 용어집, 비즈니스 규칙을 학습하여 점진적으로 개선
- 사용 중 피드백과 대화 로그를 배치 분석하여 자동 학습

---

## 2. Requirements

### 2.1 Functional Requirements

| 기능 | 입력 | 출력 |
|------|------|------|
| 선호도 설정 | 스타일, 톤 선택 | UserPreference 저장 |
| 용어집 관리 | 비즈니스 용어 ↔ DB 컬럼 매핑 | DomainTerm 저장 |
| 규칙 관리 | 비즈니스 규칙 텍스트 | BusinessRule 저장 |
| 피드백 수집 | 텍스트 피드백 | PromptFeedback 저장 |
| 맞춤 프롬프트 생성 | 사용자 요청 + 컨텍스트 | 개인화된 SQL 응답 |
| 배치 학습 | 대화 로그 분석 | 패턴 추출 및 저장 |

### 2.2 Non-Functional Requirements

- 기존 SQL 생성 기능과 호환 (점진적 적용)
- 설정이 없는 사용자도 기본 동작 보장
- 배치 학습은 시스템 부하 최소화

---

## 3. 개인화 항목

### 3.1 선호 스타일 (UserPreference)

| 항목 | 옵션 | 기본값 |
|------|------|--------|
| SQL 키워드 대소문자 | uppercase / lowercase | uppercase |
| 테이블 별칭 스타일 | short (t1, t2) / meaningful (users u) | meaningful |
| 들여쓰기 | 2spaces / 4spaces / tab | 2spaces |
| 설명 상세도 | brief / detailed | detailed |
| 응답 톤 | formal / casual | formal |

### 3.2 도메인 용어집 (DomainTerm)

사용자가 사용하는 비즈니스 용어와 실제 DB 컬럼/테이블 매핑

| 비즈니스 용어 | DB 매핑 | 설명 |
|---------------|---------|------|
| 주문 | orders 테이블 | 주문 정보 |
| 회원 | users 테이블 | 가입 회원 |
| 매출 | orders.total_amount | 주문 총액 |
| 활성 회원 | users.status = 'active' | 활성 상태 회원 |

### 3.3 비즈니스 규칙 (BusinessRule)

자동 적용되는 규칙

| 규칙 | SQL 조건 | 적용 범위 |
|------|----------|-----------|
| 삭제 데이터 제외 | deleted_at IS NULL | 전체 |
| 테스트 데이터 제외 | email NOT LIKE '%@test.com' | users 테이블 |
| 최근 1년만 조회 | created_at >= DATE_SUB(...) | orders 테이블 |

### 3.4 자주 사용하는 테이블 (FrequentTable)

사용자가 주로 조회하는 테이블과 컬럼 패턴 (자동 학습)

---

## 4. Workflow

### 4.1 SQL 생성 플로우 (개인화 적용)

```
1. 사용자가 자연어로 쿼리 요청
2. 사용자 컨텍스트 로드
   - UserPreference (스타일, 톤)
   - DomainTerm (용어집)
   - BusinessRule (규칙)
   - FrequentTable (자주 쓰는 테이블)
3. 개인화된 시스템 프롬프트 생성
4. Claude CLI로 SQL 생성
5. 결과 반환 및 히스토리 저장
```

### 4.2 피드백 수집 플로우

```
1. 사용자가 생성된 쿼리에 피드백 제공
   - 텍스트: "앞으로 JOIN은 LEFT JOIN으로 해줘"
   - 후속 대화: "아니 status 조건도 추가해줘"
2. PromptFeedback 테이블에 저장
3. 다음 요청부터 피드백 반영
```

### 4.3 배치 학습 플로우

```
1. 스케줄러가 주기적으로 실행 (1일 1회)
2. 사용자별 최근 대화 로그 분석
3. 패턴 추출
   - 자주 조회하는 테이블
   - 반복되는 조건
   - 수정 요청 패턴
4. FrequentTable, BusinessRule 자동 업데이트
5. 학습 결과 로그 저장
```

---

## 5. API Spec

### [선호도 조회]
```
GET /api/preferences

Response:
{
  "preference": {
    "sqlKeywordCase": "uppercase",
    "aliasStyle": "meaningful",
    "indentation": "2spaces",
    "explanationDetail": "detailed",
    "responseTone": "formal"
  }
}
```

### [선호도 저장]
```
PUT /api/preferences

Request:
{
  "sqlKeywordCase": "uppercase",
  "aliasStyle": "meaningful",
  ...
}

Response:
{
  "success": true,
  "preference": { ... }
}
```

### [용어집 CRUD]
```
GET    /api/terms              // 목록 조회
POST   /api/terms              // 추가
PUT    /api/terms/:id          // 수정
DELETE /api/terms/:id          // 삭제

Request (POST/PUT):
{
  "term": "주문",
  "mapping": "orders 테이블",
  "description": "주문 정보"
}
```

### [비즈니스 규칙 CRUD]
```
GET    /api/rules              // 목록 조회
POST   /api/rules              // 추가
PUT    /api/rules/:id          // 수정
DELETE /api/rules/:id          // 삭제

Request (POST/PUT):
{
  "name": "삭제 데이터 제외",
  "condition": "deleted_at IS NULL",
  "scope": "global",           // "global" | "테이블명"
  "isActive": true
}
```

### [피드백 저장]
```
POST /api/feedback

Request:
{
  "sessionId": "clxx...",
  "messageId": "clxx...",
  "feedback": "앞으로 JOIN은 LEFT JOIN으로 해줘",
  "type": "preference"         // "preference" | "correction" | "rule"
}

Response:
{
  "success": true,
  "feedbackId": "clxx..."
}
```

---

## 6. Data Model

### 신규 테이블

```prisma
// 사용자 선호도
model UserPreference {
  id                  String   @id @default(cuid())
  userId              String   @unique
  user                User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // SQL 스타일
  sqlKeywordCase      String   @default("uppercase")    // "uppercase" | "lowercase"
  aliasStyle          String   @default("meaningful")   // "short" | "meaningful"
  indentation         String   @default("2spaces")      // "2spaces" | "4spaces" | "tab"

  // 응답 스타일
  explanationDetail   String   @default("detailed")     // "brief" | "detailed"
  responseTone        String   @default("formal")       // "formal" | "casual"

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}

// 도메인 용어집
model DomainTerm {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  term        String   // 비즈니스 용어 (예: "주문")
  mapping     String   // DB 매핑 (예: "orders 테이블")
  description String?  // 설명

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([userId, term])
  @@index([userId])
}

// 비즈니스 규칙
model BusinessRule {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  name        String   // 규칙 이름 (예: "삭제 데이터 제외")
  condition   String   // SQL 조건 (예: "deleted_at IS NULL")
  scope       String   @default("global")  // "global" | 특정 테이블명
  isActive    Boolean  @default(true)
  isLearned   Boolean  @default(false)     // 배치 학습으로 생성된 규칙

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([userId])
}

// 자주 사용하는 테이블 (자동 학습)
model FrequentTable {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  tableName   String
  usageCount  Int      @default(1)
  lastUsedAt  DateTime @default(now())

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([userId, tableName])
  @@index([userId])
}

// 프롬프트 피드백
model PromptFeedback {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  sessionId   String?
  messageId   String?
  feedback    String   // 피드백 내용
  type        String   // "preference" | "correction" | "rule"
  isProcessed Boolean  @default(false)  // 배치에서 처리 완료 여부

  createdAt   DateTime @default(now())

  @@index([userId])
  @@index([isProcessed])
}

// 배치 학습 로그
model LearningLog {
  id          String   @id @default(cuid())
  userId      String

  learnedAt   DateTime @default(now())
  summary     String   // 학습 요약 (JSON)

  @@index([userId])
}
```

### User 모델 수정

```prisma
model User {
  // ... 기존 필드

  // 신규 relation 추가
  preference      UserPreference?
  domainTerms     DomainTerm[]
  businessRules   BusinessRule[]
  frequentTables  FrequentTable[]
  promptFeedbacks PromptFeedback[]
}
```

---

## 7. 프롬프트 템플릿

### 개인화된 시스템 프롬프트 구조

```
당신은 SQL 전문가입니다.
사용자의 자연어 요청을 SQL 쿼리로 변환합니다.

## 스타일 가이드
- SQL 키워드: {대문자/소문자}
- 테이블 별칭: {짧게/의미있게}
- 들여쓰기: {2칸/4칸/탭}
- 설명: {간략하게/상세하게}
- 톤: {격식체/비격식체}

## 도메인 용어집
{용어집 목록}

## 비즈니스 규칙 (자동 적용)
{규칙 목록}

## 자주 사용하는 테이블
{테이블 목록}

## 최근 피드백
{미처리 피드백 목록}

---

{DB 스키마}

{대화 히스토리}

현재 요청: {사용자 질문}
```

---

## 8. Edge Cases & Validation Rules

- 설정이 없는 사용자: 기본값으로 동작
- 용어집 충돌: 최신 등록 항목 우선
- 규칙 충돌: 좁은 scope(테이블별) > 넓은 scope(global)
- 피드백 누적: 최근 10개만 프롬프트에 포함
- 배치 실패: 다음 주기에 재시도, 3회 실패 시 알림

---

## 9. Test Scenarios

### 정상 케이스

| 시나리오 | 기대 결과 |
|----------|-----------|
| 선호도 저장 | UserPreference 생성/업데이트 |
| 용어집 등록 "주문" → "orders" | 이후 "주문" 언급 시 orders 테이블 사용 |
| 규칙 등록 "삭제 제외" | 모든 쿼리에 deleted_at IS NULL 자동 추가 |
| 피드백 "LEFT JOIN 선호" | 다음 요청부터 LEFT JOIN 사용 |
| 배치 학습 실행 | 자주 쓰는 테이블 자동 등록 |

### 예외 케이스

| 시나리오 | 기대 결과 |
|----------|-----------|
| 설정 없는 신규 사용자 | 기본 프롬프트로 정상 동작 |
| 용어집 없이 "매출 조회" | 일반적인 해석으로 쿼리 생성 |
| 잘못된 규칙 등록 | 검증 실패 메시지, 저장 거부 |

---

## 10. 단계별 구현 계획

### 1단계: 기본 설정 (선호도)
- UserPreference 모델 및 API
- 설정 UI (설정 페이지)
- generateSQL에 스타일 적용

### 2단계: 도메인 컨텍스트
- DomainTerm, BusinessRule 모델 및 API
- 용어집/규칙 관리 UI
- 프롬프트에 컨텍스트 주입

### 3단계: 학습 시스템
- PromptFeedback 수집
- FrequentTable 자동 집계
- 배치 학습 스크립트
- LearningLog 저장

---

## 11. Dev Notes

### Claude CLI 프롬프트 주입
- `lib/claude.ts`의 `generateSQL` 함수 수정
- 개인화 컨텍스트를 시스템 프롬프트에 추가
- 컨텍스트 크기 제한 (토큰 제한 고려)

### 배치 학습 구현
- Node.js 스크립트 또는 API 라우트
- cron 또는 외부 스케줄러로 실행
- 대화 로그에서 패턴 추출 (Claude 활용)

### 성능 고려
- 컨텍스트 로드 시 캐싱 검토
- 배치 학습은 비동기 처리
- 대용량 용어집은 관련 항목만 선별
