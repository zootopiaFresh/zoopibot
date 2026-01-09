'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, CheckCircle, Clock, Eye } from 'lucide-react';
import { Pagination } from '@/components/ui/pagination';

interface Feedback {
  id: string;
  feedback: string;
  type: 'preference' | 'correction' | 'rule';
  isProcessed: boolean;
  createdAt: string;
  user: {
    email: string;
    name: string | null;
  };
}

const typeLabels: Record<string, { label: string; color: string }> = {
  preference: { label: '스타일', color: 'bg-blue-100 text-blue-700' },
  correction: { label: '수정', color: 'bg-orange-100 text-orange-700' },
  rule: { label: '규칙', color: 'bg-purple-100 text-purple-700' },
};

export default function AdminFeedbacksPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);

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

  const toggleProcessed = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch('/api/admin/feedbacks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isProcessed: !currentStatus }),
      });
      if (res.ok) {
        setFeedbacks(prev =>
          prev.map(fb =>
            fb.id === id ? { ...fb, isProcessed: !currentStatus } : fb
          )
        );
        if (selectedFeedback?.id === id) {
          setSelectedFeedback({ ...selectedFeedback, isProcessed: !currentStatus });
        }
      }
    } catch (error) {
      console.error('Failed to update feedback:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">피드백 관리</h1>
        <p className="text-gray-500">사용자가 제출한 피드백을 조회하고 관리합니다</p>
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
              <option value="preference">스타일</option>
              <option value="correction">수정</option>
              <option value="rule">규칙</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>

          {/* 상태 필터 */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="all">전체 상태</option>
              <option value="false">미처리</option>
              <option value="true">처리됨</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 피드백 테이블 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
          </div>
        ) : feedbacks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p>피드백이 없습니다</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">타입</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">내용</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">사용자</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">일시</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {feedbacks.map((fb) => (
                <tr key={fb.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${typeLabels[fb.type]?.color || 'bg-gray-100 text-gray-700'}`}>
                      {typeLabels[fb.type]?.label || fb.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-md">
                    <p className="text-sm text-gray-900 truncate">{fb.feedback.slice(0, 100)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{fb.user.name || '-'}</p>
                      <p className="text-xs text-gray-500">{fb.user.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleProcessed(fb.id, fb.isProcessed)}
                      className="flex items-center gap-1 text-sm transition-colors hover:opacity-75"
                    >
                      {fb.isProcessed ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="w-4 h-4" /> 처리됨
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-orange-600">
                          <Clock className="w-4 h-4" /> 미처리
                        </span>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(fb.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelectedFeedback(fb)}
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
      {selectedFeedback && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSelectedFeedback(null)} />
          <div className="relative min-h-full flex items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-gray-900">피드백 상세</h2>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${typeLabels[selectedFeedback.type]?.color}`}>
                    {typeLabels[selectedFeedback.type]?.label}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedFeedback(null)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-180px)] space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">피드백 내용</p>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedFeedback.feedback}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">사용자</p>
                    <p className="text-gray-900">{selectedFeedback.user.email}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">일시</p>
                    <p className="text-gray-900">{new Date(selectedFeedback.createdAt).toLocaleString('ko-KR')}</p>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
                <button
                  onClick={() => toggleProcessed(selectedFeedback.id, selectedFeedback.isProcessed)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    selectedFeedback.isProcessed
                      ? 'text-orange-700 bg-orange-100 hover:bg-orange-200'
                      : 'text-green-700 bg-green-100 hover:bg-green-200'
                  }`}
                >
                  {selectedFeedback.isProcessed ? '미처리로 변경' : '처리됨으로 표시'}
                </button>
                <button
                  onClick={() => setSelectedFeedback(null)}
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
