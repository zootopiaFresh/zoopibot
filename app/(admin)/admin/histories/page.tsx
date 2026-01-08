'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, Eye } from 'lucide-react';
import { Pagination } from '@/components/ui/pagination';

interface History {
  id: string;
  type: string;
  input: string;
  output: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
}

export default function AdminHistoriesPage() {
  const [histories, setHistories] = useState<History[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<'all' | 'documentation' | 'query'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedHistory, setSelectedHistory] = useState<History | null>(null);

  useEffect(() => {
    fetchHistories();
  }, [currentPage, typeFilter]);

  const fetchHistories = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(typeFilter !== 'all' && { type: typeFilter }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      });

      const res = await fetch(`/api/admin/histories?${params}`);
      if (res.ok) {
        const data = await res.json();
        setHistories(data.histories);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch histories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateFilter = () => {
    setCurrentPage(1);
    fetchHistories();
  };

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">히스토리</h1>
        <p className="text-gray-500">사용자들의 활동 기록을 조회합니다</p>
      </div>

      {/* 필터 영역 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* 타입 필터 */}
          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="all">전체 타입</option>
              <option value="query">SQL 쿼리</option>
              <option value="documentation">문서화</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>

          {/* 날짜 필터 */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-gray-400">~</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleDateFilter}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              적용
            </button>
          </div>
        </div>
      </div>

      {/* 히스토리 테이블 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
          </div>
        ) : histories.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>기록이 없습니다</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">타입</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">입력</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">사용자</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">일시</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {histories.map((history) => (
                <tr key={history.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      history.type === 'query'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {history.type === 'query' ? 'SQL' : 'Doc'}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-md">
                    <p className="text-sm text-gray-900 truncate">{history.input.slice(0, 100)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{history.user.name || '-'}</p>
                      <p className="text-xs text-gray-500">{history.user.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(history.createdAt).toLocaleString('ko-KR')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelectedHistory(history)}
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
      {selectedHistory && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSelectedHistory(null)} />
          <div className="relative min-h-full flex items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">히스토리 상세</h2>
                <button
                  onClick={() => setSelectedHistory(null)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-120px)] space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">입력</p>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <pre className="text-sm text-gray-900 whitespace-pre-wrap">{selectedHistory.input}</pre>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">출력</p>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <pre className="text-sm text-gray-900 whitespace-pre-wrap max-h-96 overflow-y-auto">{selectedHistory.output}</pre>
                  </div>
                </div>
                <div className="flex gap-4 text-sm text-gray-500">
                  <span>사용자: {selectedHistory.user.email}</span>
                  <span>일시: {new Date(selectedHistory.createdAt).toLocaleString('ko-KR')}</span>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => setSelectedHistory(null)}
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
