# Admin Panel 구현 작업 내역

**작업일**: 2026-01-08
**작업자**: Claude
**버전**: v0.2.0

---

## 1. 개요

### 1.1 배경
- 회원가입이 별도 인증 없이 가능하여 관리 필요성 대두
- 사용자 활동 히스토리 모니터링 요구

### 1.2 목표
- 관리자 전용 어드민 패널 구현
- 회원 관리 (조회, 상태 변경, 삭제) 기능
- 사용 히스토리 조회 기능
- 서비스 통계 대시보드

---

## 2. 변경 사항 요약

### 2.1 데이터베이스 변경

| 항목 | 변경 내용 |
|------|----------|
| User 모델 | `role` 필드 추가 (user/admin) |
| User 모델 | `status` 필드 추가 (active/inactive) |
| 마이그레이션 | `20260108015529_add_user_role_status` |

### 2.2 신규 파일

#### API 엔드포인트 (5개)
| 파일 | 메서드 | 설명 |
|------|--------|------|
| `lib/admin.ts` | - | 관리자 권한 확인 헬퍼 |
| `app/api/admin/stats/route.ts` | GET | 대시보드 통계 |
| `app/api/admin/users/route.ts` | GET | 회원 목록 (페이지네이션, 검색) |
| `app/api/admin/users/[id]/route.ts` | GET | 회원 상세 |
| `app/api/admin/users/[id]/route.ts` | PATCH | 회원 상태/역할 변경 |
| `app/api/admin/users/[id]/route.ts` | DELETE | 회원 삭제 |
| `app/api/admin/histories/route.ts` | GET | 히스토리 목록 (필터링) |

#### 컴포넌트 (5개)
| 파일 | 설명 |
|------|------|
| `components/admin/sidebar.tsx` | 어드민 사이드바 네비게이션 |
| `components/admin/stats-card.tsx` | 통계 카드 컴포넌트 |
| `components/admin/users-table.tsx` | 회원 목록 테이블 |
| `components/admin/user-detail-modal.tsx` | 회원 상세 정보 모달 |
| `components/ui/pagination.tsx` | 페이지네이션 컴포넌트 |

#### 페이지 (4개)
| 파일 | 경로 | 설명 |
|------|------|------|
| `app/(admin)/layout.tsx` | - | 어드민 레이아웃 (권한 체크) |
| `app/(admin)/admin/page.tsx` | `/admin` | 대시보드 |
| `app/(admin)/admin/users/page.tsx` | `/admin/users` | 회원 관리 |
| `app/(admin)/admin/histories/page.tsx` | `/admin/histories` | 히스토리 |

### 2.3 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `prisma/schema.prisma` | User 모델에 role, status 필드 추가 |
| `lib/auth.ts` | JWT/세션에 role 포함 |
| `components/layout/header.tsx` | 관리자용 Admin 링크 추가 |

---

## 3. 상세 변경 내역

### 3.1 Prisma 스키마 변경

```prisma
// prisma/schema.prisma

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  password      String
  role          String    @default("user")    // 추가: "user" | "admin"
  status        String    @default("active")  // 추가: "active" | "inactive"
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  histories     History[]
  chatSessions  ChatSession[]
}
```

### 3.2 인증 변경 (lib/auth.ts)

```typescript
// authorize 함수 반환값에 role 추가
return {
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role  // 추가
};

// JWT callback에 role 추가
async jwt({ token, user }) {
  if (user) {
    token.id = user.id;
    token.role = (user as any).role;  // 추가
  }
  return token;
}

// session callback에 role 추가
async session({ session, token }) {
  if (session.user) {
    (session.user as any).id = token.id as string;
    (session.user as any).role = token.role as string;  // 추가
  }
  return session;
}
```

### 3.3 API 스펙

#### GET /api/admin/stats
```typescript
// Response
{
  totalUsers: number;
  todayUsers: number;
  totalQueries: number;
  activeSessions: number;
  recentUsers: User[];
  recentHistories: History[];
}
```

#### GET /api/admin/users
```typescript
// Query Parameters
page: number (default: 1)
limit: number (default: 20)
search: string (optional)
status: 'all' | 'active' | 'inactive' (optional)

// Response
{
  users: User[];
  total: number;
  page: number;
  totalPages: number;
}
```

#### GET /api/admin/users/[id]
```typescript
// Response
{
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    chatSessions: ChatSession[];
    histories: History[];
    _count: { chatSessions: number; histories: number };
  }
}
```

#### PATCH /api/admin/users/[id]
```typescript
// Request Body
{
  status?: 'active' | 'inactive';
  role?: 'user' | 'admin';
}

// Response
{
  user: User;
}
```

#### DELETE /api/admin/users/[id]
```typescript
// Response
{
  success: boolean;
}

// Error (본인 삭제 시도)
{
  error: '본인 계정은 삭제할 수 없습니다';
}
```

#### GET /api/admin/histories
```typescript
// Query Parameters
page: number (default: 1)
limit: number (default: 20)
type: 'all' | 'documentation' | 'query' (optional)
startDate: string (optional, YYYY-MM-DD)
endDate: string (optional, YYYY-MM-DD)

// Response
{
  histories: History[];
  total: number;
  page: number;
  totalPages: number;
}
```

---

## 4. 디렉토리 구조

```
app/
├── (admin)/
│   ├── layout.tsx              # 어드민 레이아웃
│   └── admin/
│       ├── page.tsx            # 대시보드
│       ├── users/
│       │   └── page.tsx        # 회원 관리
│       └── histories/
│           └── page.tsx        # 히스토리
├── api/
│   └── admin/
│       ├── stats/
│       │   └── route.ts        # 통계 API
│       ├── users/
│       │   ├── route.ts        # 회원 목록 API
│       │   └── [id]/
│       │       └── route.ts    # 회원 상세/수정/삭제 API
│       └── histories/
│           └── route.ts        # 히스토리 API

components/
├── admin/
│   ├── sidebar.tsx             # 사이드바
│   ├── stats-card.tsx          # 통계 카드
│   ├── users-table.tsx         # 회원 테이블
│   └── user-detail-modal.tsx   # 상세 모달
├── ui/
│   └── pagination.tsx          # 페이지네이션
└── layout/
    └── header.tsx              # 헤더 (수정됨)

lib/
├── admin.ts                    # 관리자 권한 헬퍼
└── auth.ts                     # 인증 설정 (수정됨)

prisma/
├── schema.prisma               # 스키마 (수정됨)
└── migrations/
    └── 20260108015529_add_user_role_status/
        └── migration.sql
```

---

## 5. 권한 체계

### 5.1 역할 (Role)
| 역할 | 설명 | 권한 |
|------|------|------|
| `user` | 일반 사용자 | SQL Assistant 사용 |
| `admin` | 관리자 | SQL Assistant + Admin Panel |

### 5.2 상태 (Status)
| 상태 | 설명 |
|------|------|
| `active` | 활성 (로그인 가능) |
| `inactive` | 비활성 (로그인 불가 - 추후 구현) |

### 5.3 접근 제어
- `/admin/*` 경로는 `role === 'admin'`인 사용자만 접근 가능
- 권한 없는 사용자는 `/query-generator`로 리다이렉트
- Admin API는 서버 사이드에서 권한 검증

---

## 6. UI/UX 특징

### 6.1 대시보드
- 4개 통계 카드 (총 회원, 오늘 가입, 총 쿼리, 활성 세션)
- 최근 가입 회원 5명 목록
- 최근 활동 히스토리 10개

### 6.2 회원 관리
- 검색 (이메일, 이름)
- 상태 필터 (전체/활성/비활성)
- 테이블 표시 (이름, 이메일, 역할, 상태, 세션 수, 쿼리 수, 가입일)
- 액션 메뉴 (상세 보기, 활성화/비활성화, 삭제)
- 상세 모달 (기본 정보, 통계, 최근 세션, 최근 활동)
- 페이지네이션

### 6.3 히스토리
- 타입 필터 (전체/SQL/문서화)
- 날짜 범위 필터
- 테이블 표시 (타입, 입력 내용, 사용자, 일시)
- 상세 모달 (입력/출력 전문)
- 페이지네이션

---

## 7. 설정 가이드

### 7.1 관리자 계정 생성

**방법 1: SQLite 직접 수정**
```bash
sqlite3 prisma/dev.db "UPDATE User SET role = 'admin' WHERE email = 'admin@example.com';"
```

**방법 2: Prisma Studio**
```bash
npx prisma studio
# User 테이블에서 해당 사용자의 role을 'admin'으로 변경
```

### 7.2 접속 방법
1. 관리자 계정으로 로그인
2. 헤더 우측 **Admin** 버튼 클릭
3. 또는 직접 `/admin` URL 접속

---

## 8. 향후 개선 사항

### 8.1 단기
- [ ] 비활성 사용자 로그인 차단
- [ ] 회원 역할 변경 UI 추가
- [ ] 대량 작업 (일괄 삭제, 상태 변경)

### 8.2 중기
- [ ] 감사 로그 (관리자 행동 기록)
- [ ] 대시보드 차트 시각화
- [ ] Excel/CSV 내보내기

### 8.3 장기
- [ ] 권한 세분화 (슈퍼관리자, 운영자 등)
- [ ] 알림 시스템
- [ ] 실시간 모니터링

---

## 9. 테스트 체크리스트

### 9.1 권한 테스트
- [x] 비로그인 → `/admin` 접근 시 로그인 페이지 리다이렉트
- [x] 일반 사용자 → `/admin` 접근 시 query-generator 리다이렉트
- [x] 관리자 → `/admin` 정상 접근

### 9.2 기능 테스트
- [x] 대시보드 통계 로드
- [x] 회원 목록 조회
- [x] 회원 검색
- [x] 회원 상태 필터
- [x] 회원 상세 모달
- [x] 회원 상태 변경
- [x] 회원 삭제
- [x] 히스토리 조회
- [x] 히스토리 필터
- [x] 페이지네이션

### 9.3 빌드 테스트
- [x] `npm run build` 성공
- [x] TypeScript 타입 체크 통과
- [x] ESLint 경고만 (에러 없음)

---

## 10. 참고 문서

- [구현 가이드](./20260108-frontend-admin-panel.md)
- [Next.js App Router](https://nextjs.org/docs/app)
- [NextAuth.js](https://next-auth.js.org/)
- [Prisma](https://www.prisma.io/docs)
