# 스키마 프롬프트 관리 시스템 로드맵

## 개요

마크다운 파일 기반 스키마 프롬프트를 DB 관리 방식으로 전환하는 작업 로드맵

---

## 1단계: DB 모델 및 마이그레이션

### 작업 목록

- [ ] Prisma 스키마에 `SchemaPrompt` 모델 추가
  - `prisma/schema.prisma` 수정
  - name (unique), content (Text), isActive 필드

- [ ] DB 마이그레이션 실행
  ```bash
  npx prisma migrate dev --name add-schema-prompt
  ```

- [ ] 마이그레이션 스크립트 작성
  - `scripts/migrate-schema-to-db.ts` 생성
  - schema/*.md 파일 읽어서 DB에 저장

- [ ] 마이그레이션 스크립트 실행 및 검증
  ```bash
  npx ts-node scripts/migrate-schema-to-db.ts
  ```

### 예상 산출물
- `prisma/schema.prisma` (수정)
- `prisma/migrations/xxx_add_schema_prompt/` (생성)
- `scripts/migrate-schema-to-db.ts` (생성)

---

## 2단계: API 구현

### 작업 목록

- [ ] 스키마 프롬프트 CRUD API 구현
  - `app/api/admin/schema-prompts/route.ts` (GET, POST)
  - `app/api/admin/schema-prompts/[id]/route.ts` (GET, PUT, DELETE)

- [ ] 관리자 권한 체크 적용
  - session.user.role === 'admin' 검증

- [ ] 캐시 무효화 API 구현
  - `app/api/admin/schema-prompts/invalidate-cache/route.ts` (POST)

- [ ] API 테스트
  - Postman/curl로 각 엔드포인트 테스트

### 예상 산출물
- `app/api/admin/schema-prompts/route.ts`
- `app/api/admin/schema-prompts/[id]/route.ts`
- `app/api/admin/schema-prompts/invalidate-cache/route.ts`

---

## 3단계: 스키마 로딩 로직 수정

### 작업 목록

- [ ] `lib/schema.ts` 수정
  - `loadSchemaFromDB()` 함수 추가
  - DB에서 활성화된 프롬프트 조회
  - name 기준 오름차순 정렬 후 결합

- [ ] 캐싱 로직 구현
  - 메모리 캐시 + TTL (5분)
  - `invalidateSchemaCache()` 함수

- [ ] 기존 호환성 유지
  - `getCachedSchema()` 함수 시그니처 유지
  - 호출부 수정 불필요하도록

- [ ] 통합 테스트
  - SQL 생성 시 DB 스키마 정상 로드 확인

### 예상 산출물
- `lib/schema.ts` (수정)

---

## 4단계: 관리자 UI 구현

### 작업 목록

- [ ] 패키지 설치
  ```bash
  npm install @uiw/react-md-editor
  ```

- [ ] 관리자 페이지 생성
  - `app/admin/schema-prompts/page.tsx`

- [ ] 컴포넌트 구현
  - `components/admin/SchemaPromptList.tsx` (목록)
  - `components/admin/SchemaPromptEditor.tsx` (에디터)
  - `components/admin/SchemaPromptForm.tsx` (폼)

- [ ] 마크다운 에디터 설정
  - dynamic import (SSR 이슈 회피)
  - preview="live" 설정

- [ ] CRUD 기능 연동
  - 목록 조회
  - 생성/수정/삭제
  - 활성화 토글

- [ ] UI/UX 테스트
  - 반응형 레이아웃
  - 저장 성공/실패 피드백

### 예상 산출물
- `app/admin/schema-prompts/page.tsx`
- `components/admin/SchemaPromptList.tsx`
- `components/admin/SchemaPromptEditor.tsx`
- `components/admin/SchemaPromptForm.tsx`

---

## 5단계: 마무리 및 정리

### 작업 목록

- [ ] 기존 schema/*.md 파일 처리
  - 백업 또는 삭제 결정
  - .gitignore에 추가 또는 별도 보관

- [ ] 관리자 네비게이션에 메뉴 추가
  - 사이드바에 "스키마 프롬프트 관리" 링크

- [ ] 문서 업데이트
  - README에 관리 방법 설명 추가

- [ ] 최종 테스트
  - 전체 플로우 E2E 테스트
  - SQL 생성 → 스키마 로드 → 결과 확인

---

## 체크리스트

### 1단계
- [ ] SchemaPrompt 모델 추가
- [ ] DB 마이그레이션
- [ ] 마이그레이션 스크립트 작성
- [ ] 스크립트 실행

### 2단계
- [ ] GET /api/admin/schema-prompts
- [ ] POST /api/admin/schema-prompts
- [ ] GET /api/admin/schema-prompts/:id
- [ ] PUT /api/admin/schema-prompts/:id
- [ ] DELETE /api/admin/schema-prompts/:id
- [ ] POST /api/admin/schema-prompts/invalidate-cache

### 3단계
- [ ] loadSchemaFromDB() 구현
- [ ] 캐싱 로직 구현
- [ ] invalidateSchemaCache() 구현
- [ ] 통합 테스트

### 4단계
- [ ] @uiw/react-md-editor 설치
- [ ] 관리자 페이지 구현
- [ ] 목록 컴포넌트
- [ ] 에디터 컴포넌트
- [ ] CRUD 연동

### 5단계
- [ ] 기존 파일 정리
- [ ] 네비게이션 추가
- [ ] 문서화
- [ ] 최종 테스트

---

## 의존성

```
1단계 → 2단계 → 3단계 → 4단계 → 5단계
         ↘        ↗
          (병렬 가능)
```

- 1단계 완료 후 2단계, 3단계 병렬 진행 가능
- 4단계는 2단계(API) 완료 후 진행
- 5단계는 모든 단계 완료 후 진행
