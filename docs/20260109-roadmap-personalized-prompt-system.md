# 맞춤형 프롬프트 시스템 코드 수정 로드맵

## 1단계: 기본 설정 (선호도)

### 1.1 신규 파일 생성

| 순서 | 파일 | 설명 |
|------|------|------|
| 1 | `prisma/schema.prisma` | UserPreference 모델 추가 |
| 2 | `lib/preferences.ts` | 선호도 조회/저장 유틸 |
| 3 | `app/api/preferences/route.ts` | 선호도 API |
| 4 | `app/(dashboard)/settings/page.tsx` | 설정 페이지 |
| 5 | `components/settings/preference-form.tsx` | 선호도 폼 컴포넌트 |

### 1.2 수정 파일

| 순서 | 파일 | 변경 내용 |
|------|------|----------|
| 1 | `lib/claude.ts` | generateSQL에 선호도 컨텍스트 주입 |
| 2 | `app/api/query/route.ts` | 선호도 로드 후 generateSQL 호출 |
| 3 | `components/layout/sidebar.tsx` | 설정 메뉴 추가 |

---

### 1.3 상세 수정 내용

#### prisma/schema.prisma

```prisma
// User 모델에 relation 추가
model User {
  // ... 기존 필드
  preference      UserPreference?
}

// 신규 모델
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
```

#### lib/preferences.ts

```typescript
import prisma from './db';

export interface UserPreferenceData {
  sqlKeywordCase: 'uppercase' | 'lowercase';
  aliasStyle: 'short' | 'meaningful';
  indentation: '2spaces' | '4spaces' | 'tab';
  explanationDetail: 'brief' | 'detailed';
  responseTone: 'formal' | 'casual';
}

const DEFAULT_PREFERENCE: UserPreferenceData = {
  sqlKeywordCase: 'uppercase',
  aliasStyle: 'meaningful',
  indentation: '2spaces',
  explanationDetail: 'detailed',
  responseTone: 'formal',
};

export async function getUserPreference(userId: string): Promise<UserPreferenceData> {
  const pref = await prisma.userPreference.findUnique({
    where: { userId },
  });

  return pref ? {
    sqlKeywordCase: pref.sqlKeywordCase as 'uppercase' | 'lowercase',
    aliasStyle: pref.aliasStyle as 'short' | 'meaningful',
    indentation: pref.indentation as '2spaces' | '4spaces' | 'tab',
    explanationDetail: pref.explanationDetail as 'brief' | 'detailed',
    responseTone: pref.responseTone as 'formal' | 'casual',
  } : DEFAULT_PREFERENCE;
}

export async function saveUserPreference(
  userId: string,
  data: Partial<UserPreferenceData>
): Promise<UserPreferenceData> {
  const pref = await prisma.userPreference.upsert({
    where: { userId },
    update: data,
    create: { userId, ...DEFAULT_PREFERENCE, ...data },
  });

  return {
    sqlKeywordCase: pref.sqlKeywordCase as 'uppercase' | 'lowercase',
    aliasStyle: pref.aliasStyle as 'short' | 'meaningful',
    indentation: pref.indentation as '2spaces' | '4spaces' | 'tab',
    explanationDetail: pref.explanationDetail as 'brief' | 'detailed',
    responseTone: pref.responseTone as 'formal' | 'casual',
  };
}

export function buildStylePrompt(pref: UserPreferenceData): string {
  const keywordStyle = pref.sqlKeywordCase === 'uppercase'
    ? 'SQL 키워드는 대문자로 작성 (SELECT, FROM, WHERE 등)'
    : 'SQL 키워드는 소문자로 작성 (select, from, where 등)';

  const aliasStyle = pref.aliasStyle === 'short'
    ? '테이블 별칭은 짧게 (t1, t2, u, o 등)'
    : '테이블 별칭은 의미있게 (users u, orders o 등)';

  const indentStyle = {
    '2spaces': '들여쓰기는 2칸 공백',
    '4spaces': '들여쓰기는 4칸 공백',
    'tab': '들여쓰기는 탭 문자',
  }[pref.indentation];

  const detailStyle = pref.explanationDetail === 'brief'
    ? '설명은 간략하게 1-2문장으로'
    : '설명은 상세하게 (쿼리 동작, 주의사항 포함)';

  const toneStyle = pref.responseTone === 'formal'
    ? '격식체 (~습니다, ~입니다)'
    : '비격식체 (~해요, ~예요)';

  return `## 스타일 가이드
- ${keywordStyle}
- ${aliasStyle}
- ${indentStyle}
- ${detailStyle}
- ${toneStyle}`;
}
```

#### lib/claude.ts 수정

```diff
+import { getUserPreference, buildStylePrompt } from './preferences';

export async function generateSQL(
  prompt: string,
  schema?: string,
  history?: ChatHistory[],
- queryResult?: { query: string; data: any[] }
+ queryResult?: { query: string; data: any[] },
+ userId?: string
): Promise<SQLResponse> {
+  // 사용자 선호도 로드
+  let stylePrompt = '';
+  if (userId) {
+    const preference = await getUserPreference(userId);
+    stylePrompt = buildStylePrompt(preference);
+  }

  // ... 기존 대화 히스토리 포맷팅 ...

  const fullPrompt = `당신은 SQL 전문가입니다.
사용자의 자연어 요청을 SQL 쿼리로 변환하고, 쿼리에 대한 설명을 한국어로 제공합니다.

+${stylePrompt}
+
**중요**: 질문에 정확히 답변하기 위해 실제 데이터 확인이 필요한 경우:
...
```

#### app/api/preferences/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserPreference, saveUserPreference } from '@/lib/preferences';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const preference = await getUserPreference(session.user.id);
  return NextResponse.json({ preference });
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await request.json();
  const preference = await saveUserPreference(session.user.id, data);

  return NextResponse.json({ success: true, preference });
}
```

---

## 2단계: 도메인 컨텍스트

### 2.1 신규 파일 생성

| 순서 | 파일 | 설명 |
|------|------|------|
| 1 | `prisma/schema.prisma` | DomainTerm, BusinessRule 모델 추가 |
| 2 | `lib/context.ts` | 컨텍스트 조회 유틸 |
| 3 | `app/api/terms/route.ts` | 용어집 API |
| 4 | `app/api/terms/[id]/route.ts` | 용어집 상세 API |
| 5 | `app/api/rules/route.ts` | 규칙 API |
| 6 | `app/api/rules/[id]/route.ts` | 규칙 상세 API |
| 7 | `app/(dashboard)/settings/terms/page.tsx` | 용어집 관리 페이지 |
| 8 | `app/(dashboard)/settings/rules/page.tsx` | 규칙 관리 페이지 |
| 9 | `components/settings/term-list.tsx` | 용어집 목록 컴포넌트 |
| 10 | `components/settings/rule-list.tsx` | 규칙 목록 컴포넌트 |

### 2.2 상세 수정 내용

#### prisma/schema.prisma

```prisma
// User 모델에 relation 추가
model User {
  // ... 기존 필드
  domainTerms     DomainTerm[]
  businessRules   BusinessRule[]
}

model DomainTerm {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  term        String   // 비즈니스 용어
  mapping     String   // DB 매핑
  description String?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([userId, term])
  @@index([userId])
}

model BusinessRule {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  name        String
  condition   String   // SQL 조건
  scope       String   @default("global")
  isActive    Boolean  @default(true)
  isLearned   Boolean  @default(false)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([userId])
}
```

#### lib/context.ts

```typescript
import prisma from './db';

export async function getUserContext(userId: string) {
  const [terms, rules] = await Promise.all([
    prisma.domainTerm.findMany({ where: { userId } }),
    prisma.businessRule.findMany({ where: { userId, isActive: true } }),
  ]);

  return { terms, rules };
}

export function buildContextPrompt(
  terms: { term: string; mapping: string; description?: string | null }[],
  rules: { name: string; condition: string; scope: string }[]
): string {
  let prompt = '';

  if (terms.length > 0) {
    prompt += '\n\n## 도메인 용어집\n';
    prompt += '다음 비즈니스 용어가 언급되면 해당 DB 매핑을 사용하세요:\n';
    for (const t of terms) {
      prompt += `- "${t.term}" → ${t.mapping}`;
      if (t.description) prompt += ` (${t.description})`;
      prompt += '\n';
    }
  }

  if (rules.length > 0) {
    prompt += '\n\n## 비즈니스 규칙 (자동 적용)\n';
    prompt += '다음 조건을 쿼리에 자동으로 적용하세요:\n';
    for (const r of rules) {
      const scopeNote = r.scope === 'global' ? '전체' : `${r.scope} 테이블`;
      prompt += `- ${r.name}: ${r.condition} (적용: ${scopeNote})\n`;
    }
  }

  return prompt;
}
```

#### lib/claude.ts 수정 (2단계)

```diff
import { getUserPreference, buildStylePrompt } from './preferences';
+import { getUserContext, buildContextPrompt } from './context';

export async function generateSQL(
  prompt: string,
  schema?: string,
  history?: ChatHistory[],
  queryResult?: { query: string; data: any[] },
  userId?: string
): Promise<SQLResponse> {
  let stylePrompt = '';
+  let contextPrompt = '';

  if (userId) {
    const preference = await getUserPreference(userId);
    stylePrompt = buildStylePrompt(preference);
+
+    const { terms, rules } = await getUserContext(userId);
+    contextPrompt = buildContextPrompt(terms, rules);
  }

  const fullPrompt = `당신은 SQL 전문가입니다.
...

${stylePrompt}
+${contextPrompt}

**중요**: ...
```

---

## 3단계: 학습 시스템

### 3.1 신규 파일 생성

| 순서 | 파일 | 설명 |
|------|------|------|
| 1 | `prisma/schema.prisma` | FrequentTable, PromptFeedback, LearningLog 모델 |
| 2 | `lib/feedback.ts` | 피드백 저장 유틸 |
| 3 | `lib/learning.ts` | 배치 학습 로직 |
| 4 | `app/api/feedback/route.ts` | 피드백 API |
| 5 | `app/api/admin/learning/route.ts` | 배치 학습 트리거 API |
| 6 | `scripts/batch-learning.ts` | 배치 학습 스크립트 |
| 7 | `components/chat/feedback-button.tsx` | 피드백 버튼 컴포넌트 |

### 3.2 상세 수정 내용

#### prisma/schema.prisma

```prisma
model User {
  // ... 기존 필드
  frequentTables  FrequentTable[]
  promptFeedbacks PromptFeedback[]
}

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

model PromptFeedback {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  sessionId   String?
  messageId   String?
  feedback    String
  type        String   // "preference" | "correction" | "rule"
  isProcessed Boolean  @default(false)

  createdAt   DateTime @default(now())

  @@index([userId])
  @@index([isProcessed])
}

model LearningLog {
  id          String   @id @default(cuid())
  userId      String

  learnedAt   DateTime @default(now())
  summary     String   // JSON

  @@index([userId])
}
```

#### lib/feedback.ts

```typescript
import prisma from './db';

export async function saveFeedback(
  userId: string,
  feedback: string,
  type: 'preference' | 'correction' | 'rule',
  sessionId?: string,
  messageId?: string
) {
  return prisma.promptFeedback.create({
    data: {
      userId,
      feedback,
      type,
      sessionId,
      messageId,
    },
  });
}

export async function getUnprocessedFeedbacks(userId: string, limit = 10) {
  return prisma.promptFeedback.findMany({
    where: { userId, isProcessed: false },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export function buildFeedbackPrompt(
  feedbacks: { feedback: string; type: string; createdAt: Date }[]
): string {
  if (feedbacks.length === 0) return '';

  let prompt = '\n\n## 최근 피드백\n';
  prompt += '사용자가 제공한 피드백을 반영하세요:\n';

  for (const f of feedbacks) {
    prompt += `- [${f.type}] ${f.feedback}\n`;
  }

  return prompt;
}
```

#### scripts/batch-learning.ts

```typescript
import prisma from '../lib/db';
import { runClaudeCLI } from '../lib/claude';

async function runBatchLearning() {
  console.log('[BatchLearning] Starting...');

  // 활성 사용자 목록
  const users = await prisma.user.findMany({
    where: { status: 'active' },
    select: { id: true },
  });

  for (const user of users) {
    await learnForUser(user.id);
  }

  console.log('[BatchLearning] Completed');
}

async function learnForUser(userId: string) {
  // 최근 7일 대화 로그 조회
  const sessions = await prisma.chatSession.findMany({
    where: {
      userId,
      updatedAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    },
    include: { messages: true },
  });

  if (sessions.length === 0) return;

  // 자주 사용하는 테이블 집계
  await updateFrequentTables(userId, sessions);

  // 미처리 피드백에서 규칙 추출
  await processFeedbacks(userId);

  // 학습 로그 저장
  await prisma.learningLog.create({
    data: {
      userId,
      summary: JSON.stringify({
        sessionsAnalyzed: sessions.length,
        timestamp: new Date().toISOString(),
      }),
    },
  });
}

async function updateFrequentTables(userId: string, sessions: any[]) {
  const tableUsage: Record<string, number> = {};

  for (const session of sessions) {
    for (const msg of session.messages) {
      if (msg.sql) {
        // 간단한 테이블명 추출 (FROM, JOIN 뒤)
        const tables = msg.sql.match(/(?:FROM|JOIN)\s+(\w+)/gi) || [];
        for (const match of tables) {
          const tableName = match.split(/\s+/)[1]?.toLowerCase();
          if (tableName) {
            tableUsage[tableName] = (tableUsage[tableName] || 0) + 1;
          }
        }
      }
    }
  }

  for (const [tableName, count] of Object.entries(tableUsage)) {
    await prisma.frequentTable.upsert({
      where: { userId_tableName: { userId, tableName } },
      update: {
        usageCount: { increment: count },
        lastUsedAt: new Date(),
      },
      create: { userId, tableName, usageCount: count },
    });
  }
}

async function processFeedbacks(userId: string) {
  const feedbacks = await prisma.promptFeedback.findMany({
    where: { userId, isProcessed: false },
  });

  if (feedbacks.length === 0) return;

  // Claude를 사용해 피드백에서 규칙 추출
  const prompt = `다음 사용자 피드백들을 분석하여 SQL 생성에 적용할 규칙을 추출하세요.

피드백:
${feedbacks.map(f => `- ${f.feedback}`).join('\n')}

응답 형식 (JSON 배열):
[
  { "name": "규칙 이름", "condition": "SQL 조건", "scope": "global 또는 테이블명" }
]

규칙이 없으면 빈 배열 []을 반환하세요.`;

  const result = await runClaudeCLI(prompt);

  try {
    const rules = JSON.parse(result);
    for (const rule of rules) {
      await prisma.businessRule.create({
        data: {
          userId,
          name: rule.name,
          condition: rule.condition,
          scope: rule.scope || 'global',
          isLearned: true,
        },
      });
    }
  } catch (e) {
    console.error('[BatchLearning] Failed to parse rules:', e);
  }

  // 피드백 처리 완료 표시
  await prisma.promptFeedback.updateMany({
    where: { id: { in: feedbacks.map(f => f.id) } },
    data: { isProcessed: true },
  });
}

runBatchLearning().catch(console.error);
```

---

## 4. 의존성 분석

```
1단계: 기본 설정
├── prisma/schema.prisma (UserPreference)
│   └── npx prisma generate && npx prisma db push
├── lib/preferences.ts
├── app/api/preferences/route.ts
├── lib/claude.ts (수정)
└── app/(dashboard)/settings/page.tsx

2단계: 도메인 컨텍스트
├── prisma/schema.prisma (DomainTerm, BusinessRule)
│   └── npx prisma generate && npx prisma db push
├── lib/context.ts
├── app/api/terms/*, app/api/rules/*
├── lib/claude.ts (수정)
└── app/(dashboard)/settings/terms/*, rules/*

3단계: 학습 시스템
├── prisma/schema.prisma (FrequentTable, PromptFeedback, LearningLog)
│   └── npx prisma generate && npx prisma db push
├── lib/feedback.ts
├── lib/learning.ts
├── app/api/feedback/route.ts
├── scripts/batch-learning.ts
└── 스케줄러 설정 (cron 또는 외부 서비스)
```

---

## 5. 체크리스트

### 1단계 배포 전 확인
- [ ] prisma generate && db push 실행
- [ ] 기존 사용자 테스트 (설정 없어도 동작)
- [ ] 선호도 저장/조회 테스트
- [ ] SQL 생성 시 스타일 적용 확인

### 2단계 배포 전 확인
- [ ] 용어집 CRUD 테스트
- [ ] 규칙 CRUD 테스트
- [ ] 프롬프트에 컨텍스트 주입 확인
- [ ] 용어 매핑이 실제 SQL에 반영되는지 확인

### 3단계 배포 전 확인
- [ ] 피드백 저장 테스트
- [ ] 배치 스크립트 단독 실행 테스트
- [ ] 자주 쓰는 테이블 집계 확인
- [ ] 학습된 규칙 생성 확인
- [ ] 스케줄러 설정

---

## 6. 롤백 계획

### 1단계 롤백
```bash
# lib/claude.ts에서 선호도 관련 코드 제거
# app/api/preferences 삭제
# prisma에서 UserPreference 모델 제거 후 migrate
```

### 2단계 롤백
```bash
# lib/claude.ts에서 컨텍스트 관련 코드 제거
# app/api/terms, rules 삭제
# prisma에서 DomainTerm, BusinessRule 모델 제거 후 migrate
```

### 3단계 롤백
```bash
# 배치 스크립트 비활성화
# 피드백 관련 API/UI 제거
# prisma에서 FrequentTable, PromptFeedback, LearningLog 제거 후 migrate
```
