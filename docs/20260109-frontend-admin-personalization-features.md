# 어드민 패널 - 맞춤형 프롬프트 시스템 관리 기능

## 1. Implementation Summary

- 맞춤형 프롬프트 시스템(선호도/용어집/규칙/피드백/학습)을 어드민에서 관리
- 기존 어드민 컴포넌트 패턴 재사용 (StatsCard, UsersTable, Modal)
- Lucide React 아이콘, TailwindCSS 스타일링
- 백엔드 API 의존: `/api/admin/feedbacks`, `/api/admin/learning`, `/api/admin/users/[id]` 확장

---

## 2. Task Breakdown

- [ ] [FE] 사이드바에 "학습 관리" 메뉴 추가
- [ ] [FE] 피드백 관리 페이지 생성 (`/admin/feedbacks`)
- [ ] [FE] 학습 관리 페이지 생성 (`/admin/learning`)
- [ ] [FE] 사용자 상세 모달에 선호도/컨텍스트 탭 추가
- [ ] [FE] 대시보드에 피드백 통계 카드 추가
- [ ] [BE] 어드민용 피드백 조회 API 추가
- [ ] [BE] 사용자 상세 API에 선호도/용어집/규칙 포함
- [ ] [TEST] 피드백 목록 조회 확인
- [ ] [TEST] 배치 학습 트리거 동작 확인
- [ ] [TEST] 사용자별 설정 조회 확인

---

## 3. Frontend Changes

### 3.1 사이드바 메뉴 추가

- **파일 경로**: `components/admin/sidebar.tsx`
- **위치**: line 14-18 (menuItems 배열)
- **변경 내용**: 학습 관리, 피드백 메뉴 추가

```diff
import {
  LayoutDashboard,
  Users,
  History,
  LogOut,
- Database
+ Database,
+ MessageSquareText,
+ Brain
} from 'lucide-react';

const menuItems = [
  { href: '/admin', label: '대시보드', icon: LayoutDashboard },
  { href: '/admin/users', label: '회원 관리', icon: Users },
  { href: '/admin/histories', label: '히스토리', icon: History },
+ { href: '/admin/feedbacks', label: '피드백', icon: MessageSquareText },
+ { href: '/admin/learning', label: '학습 관리', icon: Brain },
];
```

### 3.2 피드백 관리 페이지

- **파일 경로**: `app/(admin)/admin/feedbacks/page.tsx` (신규)
- **주요 기능**:
  1. 전체 사용자 피드백 목록 조회
  2. 타입별 필터 (preference/correction/rule)
  3. 처리 상태 필터 (처리됨/미처리)
  4. 페이지네이션

### 3.3 학습 관리 페이지

- **파일 경로**: `app/(admin)/admin/learning/page.tsx` (신규)
- **주요 기능**:
  1. 배치 학습 트리거 버튼 (전체 사용자 / 특정 사용자)
  2. 최근 학습 로그 조회
  3. 자주 사용되는 테이블 통계

### 3.4 사용자 상세 모달 확장

- **파일 경로**: `components/admin/user-detail-modal.tsx`
- **위치**: line 110-126 (통계 섹션 아래)
- **변경 내용**: 탭 UI 추가 (기본정보 | 선호도 | 용어집 | 규칙)

### 3.5 대시보드 통계 추가

- **파일 경로**: `app/(admin)/admin/page.tsx`
- **위치**: line 67-88 (StatsCard 영역)
- **변경 내용**: 피드백 관련 통계 카드 추가

---

## 4. Component Skeleton (Code)

### 4.1 피드백 관리 페이지

```typescript
// app/(admin)/admin/feedbacks/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { MessageSquareText, Filter, CheckCircle, Clock } from 'lucide-react';
import { Pagination } from '@/components/ui/pagination';

interface Feedback {
  id: string;
  feedback: string;
  type: 'preference' | 'correction' | 'rule';
  isProcessed: boolean;
  createdAt: string;
  user: { email: string; name: string | null };
}

export default function AdminFeedbacksPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchFeedbacks();
  }, [currentPage, typeFilter, statusFilter]);

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(typeFilter !== 'all' && { type: typeFilter }),
        ...(statusFilter !== 'all' && { isProcessed: statusFilter }),
      });
      const res = await fetch(`/api/admin/feedbacks?${params}`);
      if (res.ok) {
        const data = await res.json();
        setFeedbacks(data.feedbacks);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch feedbacks:', error);
    } finally {
      setLoading(false);
    }
  };

  const typeLabels: Record<string, { label: string; color: string }> = {
    preference: { label: '스타일', color: 'bg-blue-100 text-blue-700' },
    correction: { label: '수정', color: 'bg-orange-100 text-orange-700' },
    rule: { label: '규칙', color: 'bg-purple-100 text-purple-700' },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">피드백 관리</h1>
        <p className="text-gray-500">사용자가 제출한 피드백을 조회합니다</p>
      </div>

      {/* 필터 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex gap-4">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg"
        >
          <option value="all">전체 타입</option>
          <option value="preference">스타일</option>
          <option value="correction">수정</option>
          <option value="rule">규칙</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg"
        >
          <option value="all">전체 상태</option>
          <option value="false">미처리</option>
          <option value="true">처리됨</option>
        </select>
      </div>

      {/* 피드백 목록 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">로딩 중...</div>
        ) : feedbacks.length === 0 ? (
          <div className="p-8 text-center text-gray-500">피드백이 없습니다</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">타입</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">내용</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">사용자</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">일시</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {feedbacks.map((fb) => (
                <tr key={fb.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${typeLabels[fb.type]?.color}`}>
                      {typeLabels[fb.type]?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 max-w-md truncate">{fb.feedback}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{fb.user.email}</td>
                  <td className="px-4 py-3">
                    {fb.isProcessed ? (
                      <span className="flex items-center gap-1 text-green-600 text-sm">
                        <CheckCircle className="w-4 h-4" /> 처리됨
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-orange-600 text-sm">
                        <Clock className="w-4 h-4" /> 미처리
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {new Date(fb.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      )}
    </div>
  );
}
```

### 4.2 학습 관리 페이지

```typescript
// app/(admin)/admin/learning/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Brain, Play, RefreshCw, Table2 } from 'lucide-react';

interface LearningLog {
  id: string;
  userId: string;
  learnedAt: string;
  summary: string;
}

interface FrequentTable {
  tableName: string;
  totalUsage: number;
  userCount: number;
}

export default function AdminLearningPage() {
  const [logs, setLogs] = useState<LearningLog[]>([]);
  const [tables, setTables] = useState<FrequentTable[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 학습 로그 및 자주 사용하는 테이블 조회
      const res = await fetch('/api/admin/learning');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTables(data.frequentTables || []);
      }
    } catch (error) {
      console.error('Failed to fetch learning data:', error);
    } finally {
      setLoading(false);
    }
  };

  const runBatchLearning = async () => {
    if (!confirm('전체 활성 사용자에 대해 배치 학습을 실행하시겠습니까?')) return;

    setRunning(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/learning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
        fetchData();
      } else {
        setMessage({ type: 'error', text: data.error || '학습 실행 실패' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '네트워크 오류' });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">학습 관리</h1>
          <p className="text-gray-500">피드백 기반 배치 학습을 관리합니다</p>
        </div>
        <button
          onClick={runBatchLearning}
          disabled={running}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {running ? '실행 중...' : '배치 학습 실행'}
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 최근 학습 로그 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">최근 학습 로그</h2>
          </div>
          {logs.length === 0 ? (
            <p className="text-gray-500 text-center py-8">학습 로그가 없습니다</p>
          ) : (
            <div className="space-y-3">
              {logs.slice(0, 10).map((log) => {
                const summary = JSON.parse(log.summary);
                return (
                  <div key={log.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-900">
                        테이블 {summary.tablesProcessed}개, 규칙 {summary.rulesCreated}개
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(log.learnedAt).toLocaleString('ko-KR')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 자주 사용되는 테이블 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Table2 className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">자주 사용되는 테이블</h2>
          </div>
          {tables.length === 0 ? (
            <p className="text-gray-500 text-center py-8">데이터가 없습니다</p>
          ) : (
            <div className="space-y-2">
              {tables.slice(0, 10).map((t, i) => (
                <div key={t.tableName} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 flex items-center justify-center bg-gray-200 text-gray-600 text-xs rounded-full">
                      {i + 1}
                    </span>
                    <code className="text-sm text-gray-900">{t.tableName}</code>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{t.totalUsage}회</p>
                    <p className="text-xs text-gray-500">{t.userCount}명</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

### 4.3 사용자 상세 모달 확장 (탭 추가)

```typescript
// components/admin/user-detail-modal.tsx 수정
// line 41 근처에 탭 상태 추가

const [activeTab, setActiveTab] = useState<'info' | 'preference' | 'terms' | 'rules'>('info');

// 탭 UI 추가 (Header 아래)
<div className="flex border-b border-gray-200">
  {[
    { key: 'info', label: '기본 정보' },
    { key: 'preference', label: '선호도' },
    { key: 'terms', label: '용어집' },
    { key: 'rules', label: '규칙' },
  ].map((tab) => (
    <button
      key={tab.key}
      onClick={() => setActiveTab(tab.key as any)}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        activeTab === tab.key
          ? 'border-indigo-600 text-indigo-600'
          : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      {tab.label}
    </button>
  ))}
</div>

// 탭별 컨텐츠 렌더링
{activeTab === 'info' && (/* 기존 기본정보 섹션 */)}
{activeTab === 'preference' && (
  <div className="space-y-3">
    <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
      <span className="text-gray-500">SQL 키워드</span>
      <span className="font-medium">{user.preference?.sqlKeywordCase || 'uppercase'}</span>
    </div>
    {/* ... 나머지 선호도 필드 */}
  </div>
)}
{activeTab === 'terms' && (
  <div className="space-y-2">
    {user.domainTerms?.map((term) => (
      <div key={term.id} className="p-3 bg-gray-50 rounded-lg">
        <span className="font-medium">"{term.term}"</span> → <code>{term.mapping}</code>
      </div>
    ))}
  </div>
)}
{activeTab === 'rules' && (
  <div className="space-y-2">
    {user.businessRules?.map((rule) => (
      <div key={rule.id} className="p-3 bg-gray-50 rounded-lg flex justify-between">
        <div>
          <span className="font-medium">{rule.name}</span>
          <code className="text-sm text-gray-600 block">{rule.condition}</code>
        </div>
        <span className={rule.isActive ? 'text-green-600' : 'text-gray-400'}>
          {rule.isActive ? '활성' : '비활성'}
        </span>
      </div>
    ))}
  </div>
)}
```

---

## 5. Backend API 추가 필요

### 5.1 피드백 조회 API

```typescript
// app/api/admin/feedbacks/route.ts (신규)
// GET: 전체 피드백 조회 (페이지네이션, 필터)
```

### 5.2 학습 관리 API 확장

```typescript
// app/api/admin/learning/route.ts 수정
// GET: 학습 로그 + 자주 사용되는 테이블 통계 반환
```

### 5.3 사용자 상세 API 확장

```typescript
// app/api/admin/users/[id]/route.ts 수정
// GET 응답에 preference, domainTerms, businessRules 포함
```

---

## 6. Critical Files

| 파일 | 작업 |
|------|------|
| `components/admin/sidebar.tsx` | 메뉴 추가 |
| `app/(admin)/admin/feedbacks/page.tsx` | 신규 생성 |
| `app/(admin)/admin/learning/page.tsx` | 신규 생성 |
| `components/admin/user-detail-modal.tsx` | 탭 UI 추가 |
| `app/(admin)/admin/page.tsx` | 통계 카드 추가 |
| `app/api/admin/feedbacks/route.ts` | 신규 생성 |
| `app/api/admin/learning/route.ts` | GET 핸들러 추가 |
| `app/api/admin/users/[id]/route.ts` | 응답 확장 |

---

## 7. Testing Checklist

- [ ] 사이드바에 피드백/학습 관리 메뉴 표시 확인
- [ ] 피드백 목록 조회 및 필터링 동작 확인
- [ ] 배치 학습 트리거 버튼 동작 확인
- [ ] 학습 로그 조회 확인
- [ ] 자주 사용되는 테이블 통계 표시 확인
- [ ] 사용자 상세 모달 탭 전환 동작 확인
- [ ] 선호도/용어집/규칙 데이터 표시 확인
- [ ] 권한 없는 사용자 접근 차단 확인
