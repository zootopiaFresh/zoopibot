# 회원 승인 시스템 기술 기획서

## 1. Summary

- 신규 가입 회원은 `pending` 상태로 등록되어 어드민 승인 전까지 로그인 불가
- 어드민 패널에서 회원 승인(active) 처리 시 로그인 가능
- 로그인 후 세션이 유지되어 로그아웃 전까지 재로그인 불필요

---

## 2. Requirements

### 2.1 Functional Requirements

| 기능 | 입력 | 출력 |
|------|------|------|
| 회원가입 | email, password, name | 회원 생성 (status: pending) |
| 로그인 | email, password | 승인된 회원만 로그인 성공 |
| 회원 승인 | userId | status: pending → active |
| 세션 유지 | - | 로그아웃 전까지 자동 로그인 |

- **회원가입**: 가입 시 기본 status를 `pending`으로 설정
- **로그인**: `pending` 상태 회원은 로그인 거부, 승인 대기 메시지 표시
- **어드민 승인**: 기존 active/inactive 외에 pending 상태 추가
- **세션 유지**: next-auth JWT 세션 maxAge를 30일로 설정

### 2.2 Non-Functional Requirements

- 기존 활성 회원(status: active)은 영향 없음
- 승인 대기 중인 회원에게 명확한 안내 메시지 제공
- 어드민 패널에서 pending 회원 필터링 가능

---

## 3. Workflow

### 3.1 회원가입 플로우

```
1. 사용자가 회원가입 폼 제출
2. 서버에서 회원 생성 (status: "pending")
3. 회원가입 완료 페이지로 이동
4. "관리자 승인 후 로그인 가능" 메시지 표시
```

### 3.2 로그인 플로우

```
1. 사용자가 로그인 폼 제출
2. 서버에서 이메일/비밀번호 검증
3. 회원 status 확인:
   - "pending": 로그인 거부 + "승인 대기 중" 메시지
   - "inactive": 로그인 거부 + "비활성화된 계정" 메시지
   - "active": 로그인 성공 + JWT 토큰 발급
4. 세션 유지 (maxAge: 30일)
```

### 3.3 어드민 승인 플로우

```
1. 어드민이 회원 관리 페이지 접근
2. status 필터에서 "승인대기" 선택
3. 대기 중인 회원 목록 확인
4. 승인 버튼 클릭 → status: "pending" → "active"
5. 해당 회원 로그인 가능
```

---

## 4. API Spec

### [회원가입 - 변경 없음]
현재 API 그대로 유지 (status 기본값이 스키마에서 처리됨)

### [로그인 - authorize 함수 수정]
next-auth authorize 콜백에서 status 체크 추가

```
CredentialsProvider.authorize()

Request: { email, password }

Response (성공):
{
  id: string,
  email: string,
  name: string,
  role: string
}

Response (실패):
- null (credentials 불일치)
- throw Error("pending") - 승인 대기
- throw Error("inactive") - 비활성화
```

### [회원 상태 변경 - 기존 API 유지]
```
PATCH /api/admin/users/[id]

Request:
{
  "status": "active" | "inactive" | "pending"
}

Response:
{
  "user": { id, email, name, role, status }
}
```

---

## 5. Data Model

### User 엔티티 변경

| 필드 | 타입 | 변경 | 설명 |
|------|------|------|------|
| status | String | 기본값 변경 | `"active"` → `"pending"` |

**status 값 체계:**
- `pending`: 승인 대기 (신규 가입 기본값)
- `active`: 활성 (로그인 가능)
- `inactive`: 비활성 (로그인 불가)

---

## 6. Edge Cases & Validation Rules

- 기존 회원 (status: active)은 영향 없음
- 어드민 계정은 자동 승인 상태로 생성 (별도 처리 필요 시)
- pending 상태에서 inactive로 직접 변경 가능
- 비밀번호 틀림과 승인 대기 상태를 구분하여 메시지 표시
- 이미 active인 회원을 다시 승인해도 오류 없이 처리

---

## 7. Test Scenarios

### 정상 케이스

| 시나리오 | 기대 결과 |
|----------|-----------|
| 신규 회원가입 | status: pending으로 생성 |
| pending 회원 로그인 시도 | "승인 대기 중" 메시지 |
| 어드민이 회원 승인 | status → active |
| 승인된 회원 로그인 | 로그인 성공, 세션 생성 |
| 30일 후에도 세션 유지 | 브라우저 종료 후에도 자동 로그인 |

### 예외 케이스

| 시나리오 | 기대 결과 |
|----------|-----------|
| inactive 회원 로그인 | "비활성화된 계정" 메시지 |
| 잘못된 비밀번호 | "이메일/비밀번호 불일치" 메시지 |
| pending 필터 조회 | 승인 대기 회원만 표시 |

---

## 8. Dev Notes

### next-auth 세션 설정
```typescript
session: {
  strategy: 'jwt',
  maxAge: 30 * 24 * 60 * 60, // 30일
}
```

### authorize 에러 처리
- next-auth CredentialsProvider에서는 null 반환 시 기본 에러 메시지 표시
- 커스텀 에러 메시지를 위해 에러를 throw하고 클라이언트에서 분기 처리 필요

### DB 마이그레이션
- Prisma 스키마 기본값 변경은 기존 데이터에 영향 없음
- 신규 가입 회원부터 pending 적용

### 어드민 필터 UI
- 기존 "전체/활성/비활성" → "전체/승인대기/활성/비활성" 변경
