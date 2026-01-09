# 회원 승인 시스템 코드 수정 로드맵

## 1. 수정 파일 목록

| 순서 | 파일 | 수정 위치 | 변경 유형 |
|------|------|----------|----------|
| 1 | `prisma/schema.prisma` | line 18 | 수정 |
| 2 | `lib/auth.ts` | line 14-42, 45-47 | 수정 |
| 3 | `app/(auth)/login/page.tsx` | line 21-36 | 수정 |
| 4 | `app/(auth)/register/page.tsx` | line 34 | 수정 |
| 5 | `app/(admin)/admin/users/page.tsx` | line 32, 149-154 | 수정 |
| 6 | `components/admin/users-table.tsx` | line 146-152 | 수정 |

---

## 2. 의존성 분석

```
prisma/schema.prisma
    └── 변경 후 prisma generate 필요

lib/auth.ts
    └── authorize 함수 변경 → 로그인 로직에 영향
    └── session maxAge 추가

app/(auth)/login/page.tsx
    └── authorize 에러 핸들링에 따른 메시지 분기

app/(admin)/admin/users/page.tsx
    └── 필터 옵션에 'pending' 추가

components/admin/users-table.tsx
    └── pending 상태 UI 표시
```

---

## 3. 상세 수정 내용

### 3.1 prisma/schema.prisma

- **파일**: `prisma/schema.prisma`
- **위치**: line 18
- **변경 내용**: status 기본값을 "active"에서 "pending"으로 변경

```diff
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  password      String
  role          String    @default("user")    // "user" | "admin"
-  status        String    @default("active")  // "active" | "inactive"
+  status        String    @default("pending") // "pending" | "active" | "inactive"
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  ...
}
```

---

### 3.2 lib/auth.ts

- **파일**: `lib/auth.ts`
- **위치**: line 14-42 (authorize 함수)
- **변경 내용**: status 체크 로직 추가, 세션 maxAge 설정

```diff
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user || !user.password) {
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isValid) {
          return null;
        }

+        // 회원 상태 체크
+        if (user.status === 'pending') {
+          throw new Error('pending');
+        }
+
+        if (user.status === 'inactive') {
+          throw new Error('inactive');
+        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        };
      }
    })
  ],
  session: {
-    strategy: 'jwt'
+    strategy: 'jwt',
+    maxAge: 30 * 24 * 60 * 60, // 30일
  },
  pages: {
    signIn: '/login'
  },
  ...
};
```

---

### 3.3 app/(auth)/login/page.tsx

- **파일**: `app/(auth)/login/page.tsx`
- **위치**: line 21-36 (handleSubmit 함수)
- **변경 내용**: 에러 메시지 분기 처리

```diff
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');
  setLoading(true);

  try {
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false
    });

-    if (result?.error) {
-      setError('이메일 또는 비밀번호가 올바르지 않습니다.');
-    } else {
+    if (result?.error) {
+      if (result.error.includes('pending')) {
+        setError('관리자 승인 대기 중입니다. 승인 후 로그인이 가능합니다.');
+      } else if (result.error.includes('inactive')) {
+        setError('비활성화된 계정입니다. 관리자에게 문의하세요.');
+      } else {
+        setError('이메일 또는 비밀번호가 올바르지 않습니다.');
+      }
+    } else {
      router.push('/query-generator');
    }
  } catch (error) {
    setError('로그인 중 오류가 발생했습니다.');
  } finally {
    setLoading(false);
  }
};
```

---

### 3.4 app/(auth)/register/page.tsx

- **파일**: `app/(auth)/register/page.tsx`
- **위치**: line 34
- **변경 내용**: 회원가입 완료 후 안내 메시지 파라미터 변경

```diff
if (!res.ok) {
  setError(data.error || '회원가입 중 오류가 발생했습니다.');
  return;
}

-router.push('/login?registered=true');
+router.push('/login?pending=true');
```

- **위치**: 로그인 페이지에서 pending 파라미터 처리 추가 필요

**app/(auth)/login/page.tsx 추가 수정 (line 8-13 부근):**

```diff
+'use client';
+
+import { signIn } from 'next-auth/react';
+import { useRouter, useSearchParams } from 'next/navigation';
+import { useState, useEffect } from 'react';
+import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
+  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
+  const [successMessage, setSuccessMessage] = useState('');
+
+  useEffect(() => {
+    if (searchParams.get('pending') === 'true') {
+      setSuccessMessage('회원가입이 완료되었습니다. 관리자 승인 후 로그인이 가능합니다.');
+    }
+  }, [searchParams]);
```

**JSX에 successMessage 표시 추가 (error 메시지 위):**

```diff
+{successMessage && (
+  <div className="bg-blue-50 text-blue-700 text-sm text-center p-3 rounded-md">
+    {successMessage}
+  </div>
+)}

{error && (
  <div className="text-red-600 text-sm text-center">{error}</div>
)}
```

---

### 3.5 app/(admin)/admin/users/page.tsx

- **파일**: `app/(admin)/admin/users/page.tsx`
- **위치**: line 32 (statusFilter 타입)
- **변경 내용**: pending 상태 추가

```diff
-const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
+const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'active' | 'inactive'>('all');
```

- **위치**: line 149-154 (select 옵션)

```diff
<select
  value={statusFilter}
  onChange={(e) => {
    setStatusFilter(e.target.value as any);
    setCurrentPage(1);
  }}
  className="appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
>
  <option value="all">전체 상태</option>
+  <option value="pending">승인대기</option>
  <option value="active">활성</option>
  <option value="inactive">비활성</option>
</select>
```

---

### 3.6 components/admin/users-table.tsx

- **파일**: `components/admin/users-table.tsx`
- **위치**: line 64-79 (ActionMenu 내 상태 변경 버튼)
- **변경 내용**: pending 상태 처리 추가

```diff
-{user.status === 'active' ? (
-  <button
-    onClick={() => { onStatusChange('inactive'); setIsOpen(false); }}
-    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-orange-600 hover:bg-gray-50"
-  >
-    <UserX className="w-4 h-4" />
-    비활성화
-  </button>
-) : (
-  <button
-    onClick={() => { onStatusChange('active'); setIsOpen(false); }}
-    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-600 hover:bg-gray-50"
-  >
-    <UserCheck className="w-4 h-4" />
-    활성화
-  </button>
-)}
+{user.status === 'pending' && (
+  <button
+    onClick={() => { onStatusChange('active'); setIsOpen(false); }}
+    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-600 hover:bg-gray-50"
+  >
+    <UserCheck className="w-4 h-4" />
+    승인
+  </button>
+)}
+{user.status === 'active' && (
+  <button
+    onClick={() => { onStatusChange('inactive'); setIsOpen(false); }}
+    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-orange-600 hover:bg-gray-50"
+  >
+    <UserX className="w-4 h-4" />
+    비활성화
+  </button>
+)}
+{user.status === 'inactive' && (
+  <button
+    onClick={() => { onStatusChange('active'); setIsOpen(false); }}
+    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-600 hover:bg-gray-50"
+  >
+    <UserCheck className="w-4 h-4" />
+    활성화
+  </button>
+)}
```

- **위치**: line 146-152 (상태 뱃지)
- **변경 내용**: pending 상태 뱃지 추가

```diff
<td className="px-4 py-3">
-  <span className={`px-2 py-1 text-xs rounded-full ${
-    user.status === 'active'
-      ? 'bg-green-100 text-green-700'
-      : 'bg-red-100 text-red-700'
-  }`}>
-    {user.status === 'active' ? '활성' : '비활성'}
-  </span>
+  <span className={`px-2 py-1 text-xs rounded-full ${
+    user.status === 'pending'
+      ? 'bg-yellow-100 text-yellow-700'
+      : user.status === 'active'
+        ? 'bg-green-100 text-green-700'
+        : 'bg-red-100 text-red-700'
+  }`}>
+    {user.status === 'pending' ? '승인대기' : user.status === 'active' ? '활성' : '비활성'}
+  </span>
</td>
```

---

## 4. 데이터베이스 마이그레이션

### 스키마 변경 적용
```bash
# Prisma 클라이언트 재생성 (기본값만 변경이므로 마이그레이션 불필요)
npx prisma generate
```

### 기존 데이터 확인 (필요시)
```sql
-- 현재 회원 status 분포 확인
SELECT status, COUNT(*) as cnt FROM User GROUP BY status;
```

### 롤백 스크립트
```diff
# prisma/schema.prisma
-  status        String    @default("pending")
+  status        String    @default("active")
```

```bash
npx prisma generate
```

---

## 5. 체크리스트

### 배포 전 확인
- [ ] prisma generate 실행
- [ ] 기존 admin 계정이 active 상태인지 확인
- [ ] 로컬 환경에서 전체 플로우 테스트

### 테스트 항목
- [ ] 신규 회원가입 시 status: pending 확인
- [ ] pending 회원 로그인 시 "승인 대기" 메시지 표시
- [ ] inactive 회원 로그인 시 "비활성화" 메시지 표시
- [ ] 어드민에서 승인대기 필터 동작 확인
- [ ] 어드민에서 승인 버튼 클릭 시 active로 변경
- [ ] 승인 후 로그인 가능 확인
- [ ] 브라우저 종료 후 재접속 시 세션 유지 확인 (30일)

### 롤백 계획
1. prisma/schema.prisma에서 기본값을 "active"로 복원
2. lib/auth.ts에서 status 체크 로직 제거
3. npx prisma generate 실행
4. 앱 재시작
