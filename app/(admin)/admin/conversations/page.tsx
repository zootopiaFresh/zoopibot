'use client';

import { useState, useEffect } from 'react';
import { Eye, MessageCircle, User, Bot, X, Search, Calendar } from 'lucide-react';
import { Pagination } from '@/components/ui/pagination';

interface ChatSession {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  _count: {
    messages: number;
  };
}

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  sql: string | null;
  createdAt: string;
}

interface ConversationDetail {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  messages: ChatMessage[];
}

export default function AdminConversationsPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedSession, setSelectedSession] = useState<ConversationDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, [currentPage]);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(search && { search }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      });

      const res = await fetch(`/api/admin/conversations?${params}`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchSessions();
  };

  const handleViewDetail = async (sessionId: string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/admin/conversations/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedSession(data);
      }
    } catch (error) {
      console.error('Failed to fetch conversation detail:', error);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">대화내역</h1>
        <p className="text-gray-500">전체 회원들의 대화 세션을 조회합니다</p>
      </div>

      {/* 필터 영역 - 모바일 반응형 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
        <div className="flex flex-col gap-3">
          {/* 검색 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="대화 제목 또는 내용 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* 날짜 필터 */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <span className="text-gray-400 hidden sm:inline">~</span>
              <span className="text-gray-400 sm:hidden text-center">~</span>
              <div className="relative flex-1">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <button
              onClick={handleSearch}
              className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              검색
            </button>
          </div>
        </div>
      </div>

      {/* 대화 세션 목록 - 모바일 반응형 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <MessageCircle className="w-12 h-12 mb-4" />
            <p>대화 기록이 없습니다</p>
          </div>
        ) : (
          <>
            {/* 데스크톱 테이블 뷰 */}
            <div className="hidden lg:block">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">제목</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">사용자</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">메시지 수</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">생성일</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">최근 활동</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">액션</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sessions.map((session) => (
                    <tr key={session.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 max-w-md">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {session.title || '제목 없음'}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-indigo-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{session.user.name || '-'}</p>
                            <p className="text-xs text-gray-500">{session.user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {session._count.messages}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(session.createdAt).toLocaleString('ko-KR')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(session.updatedAt).toLocaleString('ko-KR')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleViewDetail(session.id)}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                          title="대화 상세 보기"
                        >
                          <Eye className="w-5 h-5 text-gray-400" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 모바일/태블릿 카드 뷰 */}
            <div className="lg:hidden divide-y divide-gray-100">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="p-4 hover:bg-gray-50 active:bg-gray-100 cursor-pointer transition-colors"
                  onClick={() => handleViewDetail(session.id)}
                >
                  {/* 상단: 제목 + 메시지 수 */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="text-sm font-medium text-gray-900 line-clamp-2 flex-1">
                      {session.title || '제목 없음'}
                    </h3>
                    <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {session._count.messages}개
                    </span>
                  </div>

                  {/* 중간: 사용자 정보 */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-indigo-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-900 truncate">{session.user.name || session.user.email}</p>
                      {session.user.name && (
                        <p className="text-xs text-gray-500 truncate">{session.user.email}</p>
                      )}
                    </div>
                  </div>

                  {/* 하단: 날짜 정보 */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>생성: {new Date(session.createdAt).toLocaleDateString('ko-KR')}</span>
                    <span>최근: {new Date(session.updatedAt).toLocaleDateString('ko-KR')}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
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

      {/* 대화 상세 모달 - ChatGPT 스타일 */}
      {(selectedSession || loadingDetail) && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={() => !loadingDetail && setSelectedSession(null)} />
          <div className="relative min-h-full flex items-center justify-center p-2 sm:p-4">
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
              {loadingDetail ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
                </div>
              ) : selectedSession && (
                <>
                  {/* 헤더 */}
                  <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 bg-white sticky top-0 z-10">
                    <div className="min-w-0 flex-1 mr-4">
                      <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                        {selectedSession.title || '제목 없음'}
                      </h2>
                      <p className="text-xs sm:text-sm text-gray-500 truncate">
                        {selectedSession.user.name || selectedSession.user.email} · {selectedSession.messages.length}개 메시지
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedSession(null)}
                      className="flex-shrink-0 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>

                  {/* 메시지 목록 - ChatGPT 스타일 */}
                  <div className="flex-1 overflow-y-auto">
                    {selectedSession.messages.map((message) => (
                      <div
                        key={message.id}
                        className={`${message.role === 'user' ? 'bg-white' : 'bg-gray-50'}`}
                      >
                        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
                          <div className="flex gap-3 sm:gap-4">
                            {/* 아바타 */}
                            <div className={`flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ${
                              message.role === 'user'
                                ? 'bg-indigo-600'
                                : 'bg-emerald-600'
                            }`}>
                              {message.role === 'user' ? (
                                <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                              ) : (
                                <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                              )}
                            </div>

                            {/* 메시지 내용 */}
                            <div className="flex-1 min-w-0">
                              {/* 역할 표시 */}
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-semibold text-gray-900">
                                  {message.role === 'user' ? '사용자' : 'AI'}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {new Date(message.createdAt).toLocaleString('ko-KR')}
                                </span>
                              </div>

                              {/* 텍스트 내용 */}
                              <div className="text-sm sm:text-base text-gray-800 whitespace-pre-wrap break-words">
                                {message.content}
                              </div>

                              {/* SQL 코드 블록 */}
                              {message.sql && (
                                <div className="mt-3 rounded-lg overflow-hidden border border-gray-700">
                                  <div className="bg-gray-800 px-3 py-2 flex items-center justify-between">
                                    <span className="text-xs text-gray-400 font-medium">SQL</span>
                                    <button
                                      onClick={() => navigator.clipboard.writeText(message.sql || '')}
                                      className="text-xs text-gray-400 hover:text-white transition-colors"
                                    >
                                      복사
                                    </button>
                                  </div>
                                  <div className="bg-gray-900 p-3 overflow-x-auto">
                                    <pre className="text-xs sm:text-sm text-green-400 font-mono whitespace-pre">
                                      {message.sql}
                                    </pre>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 푸터 */}
                  <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 bg-white flex flex-col sm:flex-row justify-between items-center gap-2">
                    <div className="text-xs sm:text-sm text-gray-500">
                      생성: {new Date(selectedSession.createdAt).toLocaleString('ko-KR')}
                    </div>
                    <button
                      onClick={() => setSelectedSession(null)}
                      className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      닫기
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
