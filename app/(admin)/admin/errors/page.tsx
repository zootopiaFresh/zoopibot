'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, AlertTriangle, Eye, Trash2 } from 'lucide-react';
import { Pagination } from '@/components/ui/pagination';

interface GenerationError {
  id: string;
  errorType: string;
  errorMessage: string;
  userId: string | null;
  sessionId: string | null;
  prompt: string | null;
  rawResponse: string | null;
  metadata: string | null;
  createdAt: string;
}

interface ErrorStats {
  type: string;
  count: number;
}

const errorTypeLabels: Record<string, { label: string; color: string }> = {
  parse_error: { label: 'JSON 파싱', color: 'bg-red-100 text-red-700' },
  db_query_error: { label: 'DB 쿼리', color: 'bg-orange-100 text-orange-700' },
  timeout: { label: '타임아웃', color: 'bg-yellow-100 text-yellow-700' },
  context_load_error: { label: '컨텍스트', color: 'bg-purple-100 text-purple-700' },
  cli_error: { label: 'CLI 오류', color: 'bg-gray-100 text-gray-700' },
};

export default function AdminErrorsPage() {
  const [errors, setErrors] = useState<GenerationError[]>([]);
  const [stats, setStats] = useState<ErrorStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [daysFilter, setDaysFilter] = useState<string>('7');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedError, setSelectedError] = useState<GenerationError | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchErrors = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        days: daysFilter,
        ...(typeFilter !== 'all' && { errorType: typeFilter }),
      });
      const res = await fetch(`/api/admin/errors?${params}`);
      if (res.ok) {
        const data = await res.json();
        setErrors(data.errors);
        setTotalPages(data.totalPages);
        setTotal(data.total);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch errors:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, typeFilter, daysFilter]);

  useEffect(() => {
    fetchErrors();
  }, [fetchErrors]);

  const fetchErrorDetail = async (id: string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch('/api/admin/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedError(data.error);
      }
    } catch (error) {
      console.error('Failed to fetch error detail:', error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const deleteOldErrors = async () => {
    if (!confirm('30일 이상 지난 에러 로그를 삭제하시겠습니까?')) return;

    try {
      const res = await fetch('/api/admin/errors?days=30', {
        method: 'DELETE',
      });
      if (res.ok) {
        const data = await res.json();
        alert(data.message);
        fetchErrors();
      }
    } catch (error) {
      console.error('Failed to delete errors:', error);
      alert('삭제 실패');
    }
  };

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">에러 로그</h1>
          <p className="text-gray-500">SQL 생성 실패 로그를 조회합니다</p>
        </div>
        <button
          onClick={deleteOldErrors}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          오래된 로그 정리
        </button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">전체</p>
          <p className="text-2xl font-bold text-gray-900">{total}</p>
        </div>
        {stats.map((stat) => (
          <div key={stat.type} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-500">{errorTypeLabels[stat.type]?.label || stat.type}</p>
            <p className="text-2xl font-bold text-gray-900">{stat.count}</p>
          </div>
        ))}
      </div>

      {/* 필터 영역 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* 타입 필터 */}
          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="all">전체 타입</option>
              <option value="parse_error">JSON 파싱</option>
              <option value="db_query_error">DB 쿼리</option>
              <option value="timeout">타임아웃</option>
              <option value="context_load_error">컨텍스트</option>
              <option value="cli_error">CLI 오류</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>

          {/* 기간 필터 */}
          <div className="relative">
            <select
              value={daysFilter}
              onChange={(e) => {
                setDaysFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="1">최근 1일</option>
              <option value="7">최근 7일</option>
              <option value="30">최근 30일</option>
              <option value="90">최근 90일</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 에러 테이블 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
          </div>
        ) : errors.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <AlertTriangle className="w-12 h-12 mb-4" />
            <p>에러 로그가 없습니다</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">타입</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">에러 메시지</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">프롬프트</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">일시</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {errors.map((err) => (
                <tr key={err.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${errorTypeLabels[err.errorType]?.color || 'bg-gray-100 text-gray-700'}`}>
                      {errorTypeLabels[err.errorType]?.label || err.errorType}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="text-sm text-gray-900 truncate">{err.errorMessage.slice(0, 80)}</p>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="text-sm text-gray-500 truncate">{err.prompt?.slice(0, 50) || '-'}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                    {new Date(err.createdAt).toLocaleString('ko-KR')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => fetchErrorDetail(err.id)}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                    >
                      <Eye className="w-5 h-5 text-gray-400" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
      {selectedError && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSelectedError(null)} />
          <div className="relative min-h-full flex items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-gray-900">에러 상세</h2>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${errorTypeLabels[selectedError.errorType]?.color}`}>
                    {errorTypeLabels[selectedError.errorType]?.label || selectedError.errorType}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedError(null)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-180px)] space-y-4">
                {loadingDetail ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
                  </div>
                ) : (
                  <>
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">에러 메시지</p>
                      <div className="bg-red-50 rounded-lg p-4">
                        <p className="text-sm text-red-900 whitespace-pre-wrap">{selectedError.errorMessage}</p>
                      </div>
                    </div>

                    {selectedError.prompt && (
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">사용자 프롬프트</p>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedError.prompt}</p>
                        </div>
                      </div>
                    )}

                    {selectedError.rawResponse && (
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">원본 응답 (Claude)</p>
                        <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                          <pre className="text-sm text-green-400 whitespace-pre-wrap">{selectedError.rawResponse}</pre>
                        </div>
                      </div>
                    )}

                    {selectedError.metadata && (
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">메타데이터</p>
                        <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
                          <pre className="text-sm text-gray-700">{JSON.stringify(JSON.parse(selectedError.metadata), null, 2)}</pre>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">사용자 ID</p>
                        <p className="text-gray-900 font-mono">{selectedError.userId || '-'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">세션 ID</p>
                        <p className="text-gray-900 font-mono">{selectedError.sessionId || '-'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">에러 ID</p>
                        <p className="text-gray-900 font-mono text-xs">{selectedError.id}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">발생 일시</p>
                        <p className="text-gray-900">{new Date(selectedError.createdAt).toLocaleString('ko-KR')}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => setSelectedError(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
