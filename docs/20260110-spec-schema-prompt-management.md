# 스키마 프롬프트 관리 시스템 기술 기획서

## 1. Summary

- 기존 마크다운 파일 기반 스키마 프롬프트를 DB에서 관리 가능하도록 변경
- 관리자 전용 UI에서 마크다운 에디터를 통해 스키마 프롬프트 입력/수정
- 도메인별 청크 단위 관리 유지 (01-member, 02-pet 등)
- 기존 마크다운 파일 내용을 DB로 마이그레이션

---

## 2. Requirements

### 2.1 Functional Requirements

| 기능 | 입력 | 출력 |
|------|------|------|
| 스키마 프롬프트 목록 조회 | - | 전체 프롬프트 목록 (정렬순) |
| 스키마 프롬프트 상세 조회 | promptId | 마크다운 내용 |
| 스키마 프롬프트 생성 | name, content, order | SchemaPrompt 저장 |
| 스키마 프롬프트 수정 | promptId, content | SchemaPrompt 업데이트 |
| 스키마 프롬프트 삭제 | promptId | 삭제 처리 |
| 프롬프트 활성화/비활성화 | promptId, isActive | 상태 토글 |
| 전체 스키마 조회 (시스템용) | - | 결합된 마크다운 문자열 |

### 2.2 Non-Functional Requirements

- 기존 SQL 생성 기능과 완벽 호환
- 관리자(Admin) 권한만 수정 가능
- DB 조회 결과 캐싱으로 성능 유지
- 기존 마크다운 파일에서 원활한 마이그레이션

---

## 3. 관리 체계

### 3.1 관리 단위

| 항목 | 설명 |
|------|------|
| 단위 | 도메인별 청크 (현재 파일 단위 유지) |
| 예시 | 01-member, 02-pet, 03-item 등 |
| 순서 | 숫자 접두어(01-, 02-)로 정렬 |

### 3.2 권한 체계

| 역할 | 권한 |
|------|------|
| Admin | 전체 CRUD 가능 |
| User | 조회 불가 (시스템 내부에서만 사용) |

### 3.3 스키마 프롬프트 구조

```
┌─────────────────────────────────────────┐
│ 01-member                               │
│ - 회원 관련 테이블 스키마               │
│ - users, user_profiles 등              │
├─────────────────────────────────────────┤
│ 02-pet                                  │
│ - 반려동물 관련 테이블 스키마           │
│ - pets, pet_types 등                   │
├─────────────────────────────────────────┤
│ 03-item                                 │
│ - 상품 관련 테이블 스키마               │
│ - items, categories 등                 │
├─────────────────────────────────────────┤
│ ...                                     │
└─────────────────────────────────────────┘
```

---

## 4. Workflow

### 4.1 스키마 프롬프트 수정 플로우

```
1. 관리자가 /admin/schema-prompts 페이지 접속
2. 프롬프트 목록 확인 (순서대로 정렬)
3. 수정할 프롬프트 선택
4. 마크다운 에디터에서 내용 수정
5. 실시간 미리보기 확인
6. 저장 버튼 클릭
7. DB 업데이트 및 캐시 무효화
```

### 4.2 SQL 생성 시 스키마 로드 플로우

```
1. /api/query 요청 수신
2. getCachedSchema() 호출
3. 캐시 히트 → 캐시된 스키마 반환
4. 캐시 미스 → DB에서 활성화된 프롬프트 조회
   - name 기준 오름차순 정렬 (01-, 02- 순)
   - 모든 content 결합
5. 결과 캐싱 및 반환
6. Claude CLI로 SQL 생성
```

### 4.3 마이그레이션 플로우

```
1. 마이그레이션 스크립트 실행
2. schema/ 폴더의 모든 .md 파일 읽기
3. 파일명에서 name 추출 (01-member.md → 01-member)
4. 각 파일 내용을 SchemaPrompt로 저장
5. 중복 체크 (이미 존재하면 스킵)
6. 완료 로그 출력
```

---

## 5. API Spec

### [스키마 프롬프트 목록 조회]
```
GET /api/admin/schema-prompts

Response:
{
  "prompts": [
    {
      "id": "clxx...",
      "name": "01-member",
      "content": "# 회원 스키마\n...",
      "isActive": true,
      "createdAt": "2026-01-10T...",
      "updatedAt": "2026-01-10T..."
    },
    ...
  ]
}
```

### [스키마 프롬프트 상세 조회]
```
GET /api/admin/schema-prompts/:id

Response:
{
  "prompt": {
    "id": "clxx...",
    "name": "01-member",
    "content": "# 회원 스키마\n...",
    "isActive": true,
    "createdAt": "2026-01-10T...",
    "updatedAt": "2026-01-10T..."
  }
}
```

### [스키마 프롬프트 생성]
```
POST /api/admin/schema-prompts

Request:
{
  "name": "10-new-domain",
  "content": "# 새 도메인 스키마\n..."
}

Response:
{
  "success": true,
  "prompt": { ... }
}
```

### [스키마 프롬프트 수정]
```
PUT /api/admin/schema-prompts/:id

Request:
{
  "name": "01-member",      // 선택적
  "content": "# 수정된 내용...",
  "isActive": true          // 선택적
}

Response:
{
  "success": true,
  "prompt": { ... }
}
```

### [스키마 프롬프트 삭제]
```
DELETE /api/admin/schema-prompts/:id

Response:
{
  "success": true
}
```

### [캐시 무효화]
```
POST /api/admin/schema-prompts/invalidate-cache

Response:
{
  "success": true,
  "message": "Schema cache invalidated"
}
```

---

## 6. Data Model

### 신규 테이블

```prisma
// 스키마 프롬프트
model SchemaPrompt {
  id        String   @id @default(cuid())

  name      String   @unique   // "01-member", "02-pet" 등 (정렬용)
  content   String   @db.Text  // 마크다운 내용
  isActive  Boolean  @default(true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([isActive])
  @@index([name])
}
```

### 필드 설명

| 필드 | 타입 | 설명 |
|------|------|------|
| id | String | Primary key (cuid) |
| name | String | 프롬프트 이름, 정렬에 사용 (unique) |
| content | Text | 마크다운 내용 (대용량 지원) |
| isActive | Boolean | 활성화 여부 (비활성화 시 스키마에서 제외) |
| createdAt | DateTime | 생성 시간 |
| updatedAt | DateTime | 수정 시간 |

---

## 7. UI 설계

### 7.1 페이지 구조

```
/admin/schema-prompts
├── 목록 영역 (좌측 사이드바)
│   ├── + 새 프롬프트 버튼
│   └── 프롬프트 목록 (드래그 불가, 이름순 정렬)
│       ├── 01-member [활성]
│       ├── 02-pet [활성]
│       ├── 03-item [비활성]
│       └── ...
│
└── 편집 영역 (우측 메인)
    ├── 상단: 이름 입력, 활성화 토글, 저장/삭제 버튼
    └── 하단: 마크다운 에디터 (@uiw/react-md-editor)
              - 좌: 에디터
              - 우: 실시간 미리보기
```

### 7.2 컴포넌트 구성

| 컴포넌트 | 역할 |
|----------|------|
| `SchemaPromptList` | 좌측 목록 표시 |
| `SchemaPromptEditor` | 마크다운 에디터 래퍼 |
| `SchemaPromptForm` | 이름, 활성화 상태 폼 |

### 7.3 에디터 설정

```typescript
import MDEditor from '@uiw/react-md-editor';

<MDEditor
  value={content}
  onChange={setContent}
  height={600}
  preview="live"  // 실시간 미리보기
  hideToolbar={false}
/>
```

---

## 8. 캐싱 전략

### 8.1 캐시 구조

```typescript
// lib/schema.ts

let schemaCache: string | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5분

export async function getCachedSchema(): Promise<string> {
  const now = Date.now();

  if (schemaCache && (now - cacheTimestamp) < CACHE_TTL) {
    return schemaCache;
  }

  schemaCache = await loadSchemaFromDB();
  cacheTimestamp = now;

  return schemaCache;
}

export function invalidateSchemaCache(): void {
  schemaCache = null;
  cacheTimestamp = 0;
}
```

### 8.2 캐시 무효화 시점

- 스키마 프롬프트 생성/수정/삭제 시
- 관리자가 수동으로 캐시 무효화 요청 시
- TTL(5분) 만료 시

---

## 9. 마이그레이션 스크립트

### 9.1 스크립트 위치

`scripts/migrate-schema-to-db.ts`

### 9.2 스크립트 내용

```typescript
import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  const schemaDir = path.join(process.cwd(), 'schema');
  const files = await fs.readdir(schemaDir);

  const mdFiles = files
    .filter(f => f.endsWith('.md'))
    .sort();

  console.log(`Found ${mdFiles.length} schema files`);

  for (const file of mdFiles) {
    const name = file.replace('.md', '');
    const filePath = path.join(schemaDir, file);
    const content = await fs.readFile(filePath, 'utf-8');

    const existing = await prisma.schemaPrompt.findUnique({
      where: { name }
    });

    if (existing) {
      console.log(`Skipping ${name} (already exists)`);
      continue;
    }

    await prisma.schemaPrompt.create({
      data: { name, content, isActive: true }
    });

    console.log(`Migrated: ${name}`);
  }

  console.log('Migration complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

### 9.3 실행 방법

```bash
npx ts-node scripts/migrate-schema-to-db.ts
```

---

## 10. Edge Cases & Validation Rules

### 10.1 Validation

| 필드 | 규칙 |
|------|------|
| name | 필수, unique, 영문/숫자/하이픈만 허용, 최대 50자 |
| content | 필수, 최소 10자, 최대 100KB |

### 10.2 Edge Cases

| 상황 | 처리 |
|------|------|
| 모든 프롬프트가 비활성화됨 | 경고 메시지 표시, 빈 스키마로 동작 |
| 동일 이름 생성 시도 | 409 Conflict 에러 반환 |
| 마이그레이션 중 중복 | 기존 데이터 유지, 스킵 처리 |
| 캐시 무효화 실패 | 로그 기록, 5분 후 자동 갱신 |
| 대용량 콘텐츠 | 100KB 초과 시 거부 |

---

## 11. Test Scenarios

### 정상 케이스

| 시나리오 | 기대 결과 |
|----------|-----------|
| 프롬프트 목록 조회 | 이름순 정렬된 목록 반환 |
| 새 프롬프트 생성 | DB 저장, 캐시 무효화 |
| 프롬프트 수정 | 내용 업데이트, 캐시 무효화 |
| 프롬프트 비활성화 | isActive=false, 스키마에서 제외 |
| SQL 생성 시 스키마 로드 | 활성화된 프롬프트만 결합 |
| 마이그레이션 실행 | 기존 파일 내용 DB 저장 |

### 예외 케이스

| 시나리오 | 기대 결과 |
|----------|-----------|
| 빈 이름으로 생성 | 400 Bad Request |
| 중복 이름 생성 | 409 Conflict |
| 비관리자 접근 | 403 Forbidden |
| 존재하지 않는 ID 수정 | 404 Not Found |

---

## 12. 단계별 구현 계획

### 1단계: DB 모델 및 마이그레이션
- Prisma 스키마에 SchemaPrompt 모델 추가
- DB 마이그레이션 실행
- 기존 마크다운 파일 → DB 마이그레이션 스크립트 작성/실행

### 2단계: API 구현
- `/api/admin/schema-prompts` CRUD 엔드포인트
- 관리자 권한 체크 미들웨어 적용
- 캐시 무효화 API

### 3단계: 스키마 로딩 로직 수정
- `lib/schema.ts` 수정 (파일 → DB 조회)
- 캐싱 로직 구현
- 기존 `getCachedSchema()` 호출부 호환성 유지

### 4단계: 관리자 UI 구현
- `/admin/schema-prompts` 페이지 생성
- `@uiw/react-md-editor` 패키지 설치 및 적용
- 목록/편집 UI 구현
- 저장/삭제/활성화 토글 기능

---

## 13. Dev Notes

### 패키지 설치

```bash
npm install @uiw/react-md-editor
```

### lib/schema.ts 수정 포인트

```typescript
// 기존: 파일 시스템에서 로드
// export async function loadSchema(): Promise<string> {
//   const files = await fs.readdir(schemaDir);
//   ...
// }

// 변경: DB에서 로드
export async function loadSchemaFromDB(): Promise<string> {
  const prompts = await prisma.schemaPrompt.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' }
  });

  return prompts.map(p => p.content).join('\n\n---\n\n');
}
```

### 관리자 권한 체크

```typescript
// middleware 또는 API 내부
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const session = await getServerSession(authOptions);
if (session?.user?.role !== 'admin') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

### 마크다운 에디터 SSR 이슈

`@uiw/react-md-editor`는 SSR에서 이슈가 있을 수 있으므로 dynamic import 사용:

```typescript
import dynamic from 'next/dynamic';

const MDEditor = dynamic(
  () => import('@uiw/react-md-editor'),
  { ssr: false }
);
```
