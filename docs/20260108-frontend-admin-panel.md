# 어드민 패널 구현 가이드

## 1. Implementation Summary

- **핵심 기능**: 관리자 전용 회원 관리 및 사용 히스토리 조회 패널
- **주요 라이브러리**: Next.js 14 (App Router), TailwindCSS, Prisma, NextAuth
- **백엔드 API 의존성**: 신규 Admin API 엔드포인트 필요 (회원 목록, 히스토리 조회, 회원 상태 변경)
- **주요 UI/UX 특징**:
  - 테이블 기반 데이터 표시
  - 검색/필터/페이지네이션
  - 회원 상세 정보 모달
  - 히스토리 타임라인 뷰

---

## 2. Task Breakdown

### Phase 1: 데이터베이스 스키마 확장
- [ ] [DB] User 모델에 `role`, `status` 필드 추가
- [ ] [DB] Prisma 마이그레이션 실행

### Phase 2: API 엔드포인트 구현
- [ ] [API] `GET /api/admin/users` - 회원 목록 조회 (페이지네이션, 검색)
- [ ] [API] `GET /api/admin/users/[id]` - 회원 상세 조회
- [ ] [API] `PATCH /api/admin/users/[id]` - 회원 상태 변경 (활성/비활성)
- [ ] [API] `DELETE /api/admin/users/[id]` - 회원 삭제
- [ ] [API] `GET /api/admin/histories` - 전체 히스토리 조회
- [ ] [API] `GET /api/admin/stats` - 대시보드 통계

### Phase 3: 프론트엔드 구현
- [ ] [FE] 어드민 레이아웃 컴포넌트 생성
- [ ] [FE] 사이드바 네비게이션 컴포넌트
- [ ] [FE] 대시보드 페이지 (통계 카드)
- [ ] [FE] 회원 목록 페이지 (테이블, 검색, 페이지네이션)
- [ ] [FE] 회원 상세 모달 컴포넌트
- [ ] [FE] 히스토리 목록 페이지
- [ ] [FE] 헤더에 어드민 메뉴 링크 추가

### Phase 4: 권한 및 보안
- [ ] [AUTH] 관리자 권한 미들웨어 구현
- [ ] [AUTH] 어드민 페이지 접근 제어

### Phase 5: 테스트
- [ ] [TEST] 관리자 로그인 및 권한 확인
- [ ] [TEST] 회원 목록 CRUD 동작 확인
- [ ] [TEST] 히스토리 조회 동작 확인

---

## 3. Frontend Changes

### 3.1 컴포넌트 구조

#### AdminLayout 컴포넌트
- **파일 경로**: `app/(admin)/layout.tsx`
- **Props**: `children: React.ReactNode`
- **주요 로직**:
  1. 세션 확인 및 관리자 권한 검증
  2. 권한 없을 시 리다이렉트
  3. 사이드바 + 메인 콘텐츠 레이아웃 렌더링
- **사용 라이브러리**: next-auth, next/navigation

#### AdminSidebar 컴포넌트
- **파일 경로**: `components/admin/sidebar.tsx`
- **Props**: 없음
- **주요 로직**:
  1. 현재 경로 기반 활성 메뉴 표시
  2. 네비게이션 링크 렌더링
- **사용 라이브러리**: next/navigation, lucide-react

#### UsersTable 컴포넌트
- **파일 경로**: `components/admin/users-table.tsx`
- **Props**:
  ```typescript
  interface UsersTableProps {
    users: User[];
    onEdit: (user: User) => void;
    onDelete: (userId: string) => void;
    onStatusChange: (userId: string, status: string) => void;
  }
  ```
- **주요 로직**:
  1. 사용자 목록 테이블 렌더링
  2. 정렬 기능
  3. 행 클릭 시 상세 모달 열기
  4. 상태 변경 드롭다운

#### UserDetailModal 컴포넌트
- **파일 경로**: `components/admin/user-detail-modal.tsx`
- **Props**:
  ```typescript
  interface UserDetailModalProps {
    user: UserDetail | null;
    isOpen: boolean;
    onClose: () => void;
  }
  ```
- **주요 로직**:
  1. 사용자 기본 정보 표시
  2. 채팅 세션 목록 표시
  3. 히스토리 타임라인 표시

#### StatsCard 컴포넌트
- **파일 경로**: `components/admin/stats-card.tsx`
- **Props**:
  ```typescript
  interface StatsCardProps {
    title: string;
    value: number | string;
    icon: React.ReactNode;
    trend?: { value: number; isUp: boolean };
  }
  ```

#### Pagination 컴포넌트
- **파일 경로**: `components/ui/pagination.tsx`
- **Props**:
  ```typescript
  interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  }
  ```

---

### 3.2 페이지 구성

#### 대시보드 페이지
- **파일 경로**: `app/(admin)/admin/page.tsx`
- **위치**: 신규 생성
- **변경 내용**:
  - 통계 카드 4개 (총 회원 수, 오늘 가입, 총 쿼리 수, 활성 세션)
  - 최근 가입 회원 5명 목록
  - 최근 활동 히스토리 10개

#### 회원 관리 페이지
- **파일 경로**: `app/(admin)/admin/users/page.tsx`
- **위치**: 신규 생성
- **변경 내용**:
  - 검색 입력 필드 (이메일, 이름)
  - 상태 필터 (전체, 활성, 비활성)
  - 회원 테이블
  - 페이지네이션

#### 히스토리 페이지
- **파일 경로**: `app/(admin)/admin/histories/page.tsx`
- **위치**: 신규 생성
- **변경 내용**:
  - 타입 필터 (전체, documentation, query)
  - 날짜 범위 필터
  - 히스토리 테이블
  - 페이지네이션

---

### 3.3 State 관리

```typescript
// 회원 목록 페이지 상태
const [users, setUsers] = useState<User[]>([]);
const [loading, setLoading] = useState(true);
const [searchTerm, setSearchTerm] = useState('');
const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
const [currentPage, setCurrentPage] = useState(1);
const [totalPages, setTotalPages] = useState(1);
const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
const [isModalOpen, setIsModalOpen] = useState(false);

// 히스토리 페이지 상태
const [histories, setHistories] = useState<History[]>([]);
const [typeFilter, setTypeFilter] = useState<'all' | 'documentation' | 'query'>('all');
const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
```

---

### 3.4 API 연동

#### 회원 목록 조회
```typescript
// GET /api/admin/users?page=1&limit=20&search=&status=
interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  totalPages: number;
}
```

#### 회원 상세 조회
```typescript
// GET /api/admin/users/[id]
interface UserDetailResponse {
  user: UserDetail;
  chatSessions: ChatSession[];
  histories: History[];
  stats: {
    totalQueries: number;
    totalSessions: number;
    lastActive: string;
  };
}
```

#### 회원 상태 변경
```typescript
// PATCH /api/admin/users/[id]
interface UpdateUserRequest {
  status?: 'active' | 'inactive';
  role?: 'user' | 'admin';
}
```

#### 통계 조회
```typescript
// GET /api/admin/stats
interface StatsResponse {
  totalUsers: number;
  todayUsers: number;
  totalQueries: number;
  activeSessions: number;
  recentUsers: User[];
  recentHistories: History[];
}
```

---

### 3.5 스타일링

TailwindCSS 기반으로 기존 프로젝트 스타일 패턴 유지:

```css
/* 어드민 사이드바 */
.admin-sidebar {
  @apply w-64 bg-gray-900 text-white min-h-screen;
}

/* 테이블 스타일 */
.admin-table {
  @apply w-full text-sm;
}
.admin-table th {
  @apply px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50;
}
.admin-table td {
  @apply px-4 py-3 text-gray-700 border-b border-gray-100;
}
.admin-table tr:hover {
  @apply bg-gray-50;
}

/* 상태 배지 */
.status-badge-active {
  @apply px-2 py-1 text-xs rounded-full bg-green-100 text-green-700;
}
.status-badge-inactive {
  @apply px-2 py-1 text-xs rounded-full bg-red-100 text-red-700;
}
```

---

## 4. Component Skeleton (Code)

### 4.1 Prisma 스키마 수정

```prisma
// prisma/schema.prisma
// User 모델 수정 (line 12-22)

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  password      String
  role          String    @default("user")  // "user" | "admin"
  status        String    @default("active") // "active" | "inactive"
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  histories     History[]
  chatSessions  ChatSession[]
}
```

### 4.2 Admin Layout

```typescript
// app/(admin)/layout.tsx

'use client';

import { SessionProvider, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AdminSidebar } from '@/components/admin/sidebar';

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // 1. 로그인 확인
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    // 2. 관리자 권한 확인
    if (status === 'authenticated' && (session?.user as any)?.role !== 'admin') {
      router.push('/query-generator');
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  // 3. 레이아웃 렌더링
  return (
    <div className="min-h-screen flex bg-gray-100">
      <AdminSidebar />
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </SessionProvider>
  );
}
```

### 4.3 Admin Sidebar

```typescript
// components/admin/sidebar.tsx

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  LayoutDashboard,
  Users,
  History,
  LogOut,
  Database
} from 'lucide-react';

const menuItems = [
  { href: '/admin', label: '대시보드', icon: LayoutDashboard },
  { href: '/admin/users', label: '회원 관리', icon: Users },
  { href: '/admin/histories', label: '히스토리', icon: History },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen flex flex-col">
      {/* 1. 로고 영역 */}
      <div className="p-4 border-b border-gray-800">
        <Link href="/admin" className="flex items-center gap-2">
          <Database className="w-6 h-6 text-indigo-400" />
          <span className="font-semibold text-lg">Admin Panel</span>
        </Link>
      </div>

      {/* 2. 네비게이션 메뉴 */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/admin' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* 3. 하단 메뉴 */}
      <div className="p-4 border-t border-gray-800">
        <Link
          href="/query-generator"
          className="flex items-center gap-3 px-3 py-2 text-gray-400 hover:text-white transition-colors"
        >
          <Database className="w-5 h-5" />
          SQL Assistant
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center gap-3 px-3 py-2 text-gray-400 hover:text-white transition-colors"
        >
          <LogOut className="w-5 h-5" />
          로그아웃
        </button>
      </div>
    </aside>
  );
}
```

### 4.4 대시보드 페이지

```typescript
// app/(admin)/admin/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { Users, UserPlus, MessageSquare, Activity } from 'lucide-react';
import { StatsCard } from '@/components/admin/stats-card';

interface Stats {
  totalUsers: number;
  todayUsers: number;
  totalQueries: number;
  activeSessions: number;
  recentUsers: Array<{
    id: string;
    email: string;
    name: string | null;
    createdAt: string;
  }>;
  recentHistories: Array<{
    id: string;
    type: string;
    input: string;
    createdAt: string;
    user: { email: string };
  }>;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. 통계 데이터 로드
  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 2. 페이지 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
        <p className="text-gray-500">서비스 현황을 한눈에 확인하세요</p>
      </div>

      {/* 3. 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="총 회원 수"
          value={stats?.totalUsers || 0}
          icon={<Users className="w-6 h-6" />}
        />
        <StatsCard
          title="오늘 가입"
          value={stats?.todayUsers || 0}
          icon={<UserPlus className="w-6 h-6" />}
        />
        <StatsCard
          title="총 쿼리 수"
          value={stats?.totalQueries || 0}
          icon={<MessageSquare className="w-6 h-6" />}
        />
        <StatsCard
          title="활성 세션"
          value={stats?.activeSessions || 0}
          icon={<Activity className="w-6 h-6" />}
        />
      </div>

      {/* 4. 최근 가입 회원 & 최근 활동 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 최근 가입 회원 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">최근 가입 회원</h2>
          <div className="space-y-3">
            {stats?.recentUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="font-medium text-gray-900">{user.name || user.email.split('@')[0]}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(user.createdAt).toLocaleDateString('ko-KR')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 최근 활동 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">최근 활동</h2>
          <div className="space-y-3">
            {stats?.recentHistories.map((history) => (
              <div key={history.id} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
                <span className={`px-2 py-0.5 text-xs rounded ${
                  history.type === 'query'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-purple-100 text-purple-700'
                }`}>
                  {history.type === 'query' ? 'SQL' : 'Doc'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 truncate">{history.input.slice(0, 50)}...</p>
                  <p className="text-xs text-gray-500">{history.user.email}</p>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {new Date(history.createdAt).toLocaleDateString('ko-KR')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 4.5 회원 관리 페이지

```typescript
// app/(admin)/admin/users/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { UsersTable } from '@/components/admin/users-table';
import { UserDetailModal } from '@/components/admin/user-detail-modal';
import { Pagination } from '@/components/ui/pagination';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  createdAt: string;
  _count: {
    chatSessions: number;
    histories: number;
  };
}

interface UserDetail extends User {
  chatSessions: Array<{ id: string; title: string | null; updatedAt: string }>;
  histories: Array<{ id: string; type: string; input: string; createdAt: string }>;
}

export default function AdminUsersPage() {
  // 1. State 정의
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 2. 데이터 로드
  useEffect(() => {
    fetchUsers();
  }, [currentPage, statusFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
      });

      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      setUsers(data.users);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  // 3. 검색 핸들러
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchUsers();
  };

  // 4. 상세 조회
  const handleViewDetail = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      const data = await res.json();
      setSelectedUser(data.user);
      setIsModalOpen(true);
    } catch (error) {
      console.error('Failed to fetch user detail:', error);
    }
  };

  // 5. 상태 변경
  const handleStatusChange = async (userId: string, status: string) => {
    try {
      await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      fetchUsers();
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  // 6. 삭제
  const handleDelete = async (userId: string) => {
    if (!confirm('정말 이 회원을 삭제하시겠습니까?')) return;
    try {
      await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      fetchUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">회원 관리</h1>
        <p className="text-gray-500">등록된 회원을 조회하고 관리합니다</p>
      </div>

      {/* 필터 영역 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* 검색 */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="이메일 또는 이름으로 검색..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </form>

          {/* 상태 필터 */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="all">전체 상태</option>
              <option value="active">활성</option>
              <option value="inactive">비활성</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 회원 테이블 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <UsersTable
          users={users}
          loading={loading}
          onViewDetail={handleViewDetail}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
        />
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      {/* 상세 모달 */}
      <UserDetailModal
        user={selectedUser}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedUser(null);
        }}
      />
    </div>
  );
}
```

### 4.6 Admin API - 회원 목록

```typescript
// app/api/admin/users/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// 관리자 권한 확인 헬퍼
async function checkAdminAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: 'Unauthorized', status: 401 };
  }

  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    select: { role: true }
  });

  if (user?.role !== 'admin') {
    return { error: 'Forbidden', status: 403 };
  }

  return { session };
}

export async function GET(req: NextRequest) {
  const auth = await checkAdminAuth();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status');

  // 1. where 조건 구성
  const where: any = {};
  if (search) {
    where.OR = [
      { email: { contains: search } },
      { name: { contains: search } },
    ];
  }
  if (status && status !== 'all') {
    where.status = status;
  }

  // 2. 데이터 조회
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
        _count: {
          select: {
            chatSessions: true,
            histories: true,
          }
        }
      }
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({
    users,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
```

### 4.7 Admin API - 통계

```typescript
// app/api/admin/stats/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    select: { role: true }
  });

  if (user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 1. KST 기준 오늘 시작 시간
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 2. 통계 조회
  const [totalUsers, todayUsers, totalQueries, activeSessions, recentUsers, recentHistories] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: today } } }),
    prisma.history.count({ where: { type: 'query' } }),
    prisma.chatSession.count({ where: { updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
    prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, name: true, createdAt: true }
    }),
    prisma.history.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        input: true,
        createdAt: true,
        user: { select: { email: true } }
      }
    }),
  ]);

  return NextResponse.json({
    totalUsers,
    todayUsers,
    totalQueries,
    activeSessions,
    recentUsers,
    recentHistories,
  });
}
```

### 4.8 Auth 설정 수정

```typescript
// lib/auth.ts (line 36-40 수정)

// 기존 코드
return {
  id: user.id,
  email: user.email,
  name: user.name
};

// 수정 후
return {
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role  // role 필드 추가
};

// callbacks 수정 (line 51-62)
callbacks: {
  async jwt({ token, user }) {
    if (user) {
      token.id = user.id;
      token.role = (user as any).role;  // role 추가
    }
    return token;
  },
  async session({ session, token }) {
    if (session.user) {
      (session.user as any).id = token.id as string;
      (session.user as any).role = token.role as string;  // role 추가
    }
    return session;
  }
}
```

---

## 5. Critical Files

### 신규 생성 파일
| 파일 경로 | 설명 |
|----------|------|
| `app/(admin)/layout.tsx` | 어드민 레이아웃 |
| `app/(admin)/admin/page.tsx` | 대시보드 페이지 |
| `app/(admin)/admin/users/page.tsx` | 회원 관리 페이지 |
| `app/(admin)/admin/histories/page.tsx` | 히스토리 페이지 |
| `components/admin/sidebar.tsx` | 사이드바 컴포넌트 |
| `components/admin/stats-card.tsx` | 통계 카드 컴포넌트 |
| `components/admin/users-table.tsx` | 회원 테이블 컴포넌트 |
| `components/admin/user-detail-modal.tsx` | 회원 상세 모달 |
| `components/ui/pagination.tsx` | 페이지네이션 컴포넌트 |
| `app/api/admin/users/route.ts` | 회원 목록 API |
| `app/api/admin/users/[id]/route.ts` | 회원 상세/수정/삭제 API |
| `app/api/admin/stats/route.ts` | 통계 API |
| `app/api/admin/histories/route.ts` | 히스토리 API |

### 수정 파일
| 파일 경로 | 수정 내용 |
|----------|----------|
| `prisma/schema.prisma` | User 모델에 role, status 필드 추가 |
| `lib/auth.ts` | JWT/세션에 role 필드 포함 |
| `components/layout/header.tsx` | 관리자일 경우 Admin 링크 추가 |

---

## 6. Testing Checklist

### 권한 테스트
- [ ] 비로그인 사용자가 /admin 접근 시 로그인 페이지로 리다이렉트
- [ ] 일반 사용자가 /admin 접근 시 query-generator로 리다이렉트
- [ ] 관리자 계정으로 /admin 정상 접근

### 회원 관리 테스트
- [ ] 회원 목록 정상 로드
- [ ] 검색 기능 동작 (이메일, 이름)
- [ ] 상태 필터 동작 (전체, 활성, 비활성)
- [ ] 페이지네이션 동작
- [ ] 회원 상세 모달 표시
- [ ] 회원 상태 변경 (활성 <-> 비활성)
- [ ] 회원 삭제 및 확인 다이얼로그

### 히스토리 테스트
- [ ] 히스토리 목록 정상 로드
- [ ] 타입 필터 동작
- [ ] 날짜 범위 필터 동작

### 대시보드 테스트
- [ ] 통계 카드 데이터 정확성
- [ ] 최근 가입 회원 목록
- [ ] 최근 활동 목록

### 반응형 테스트
- [ ] 데스크톱 (1920px)
- [ ] 태블릿 (768px)
- [ ] 모바일 (375px) - 사이드바 토글

---

## 7. 마이그레이션 명령어

```bash
# 1. Prisma 스키마 변경 후 마이그레이션
npx prisma migrate dev --name add_user_role_status

# 2. 기존 사용자 중 첫 번째 사용자를 관리자로 설정 (선택)
npx prisma db seed
# 또는 수동 SQL:
# UPDATE User SET role = 'admin' WHERE email = 'admin@example.com';
```

---

## 8. 추가 고려사항

### 보안
- 모든 Admin API는 관리자 권한 확인 필수
- 본인 계정은 삭제 불가 처리
- 감사 로그 기록 (추후 확장)

### 성능
- 대량 데이터 시 페이지네이션 필수
- 통계 쿼리 캐싱 고려 (Redis 등)

### UX
- 로딩 상태 표시
- 에러 메시지 토스트
- 확인 다이얼로그 (삭제 등 위험 작업)
