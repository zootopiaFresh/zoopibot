'use client';

import { X, MessageSquare, History } from 'lucide-react';

interface ChatSession {
  id: string;
  title: string | null;
  updatedAt: string;
  _count: { messages: number };
}

interface HistoryItem {
  id: string;
  type: string;
  input: string;
  createdAt: string;
}

interface UserDetail {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  chatSessions: ChatSession[];
  histories: HistoryItem[];
  _count: {
    chatSessions: number;
    histories: number;
  };
}

interface UserDetailModalProps {
  user: UserDetail | null;
  isOpen: boolean;
  onClose: () => void;
}

export function UserDetailModal({ user, isOpen, onClose }: UserDetailModalProps) {
  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative min-h-full flex items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">회원 상세 정보</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-120px)]">
            {/* 기본 정보 */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-500 mb-3">기본 정보</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">이메일</span>
                  <span className="font-medium text-gray-900">{user.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">이름</span>
                  <span className="font-medium text-gray-900">{user.name || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">역할</span>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    user.role === 'admin'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {user.role === 'admin' ? '관리자' : '사용자'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">상태</span>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    user.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {user.status === 'active' ? '활성' : '비활성'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">가입일</span>
                  <span className="font-medium text-gray-900">
                    {new Date(user.createdAt).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* 통계 */}
            <div className="mb-6 grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-600 mb-1">
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-sm font-medium">채팅 세션</span>
                </div>
                <p className="text-2xl font-bold text-blue-700">{user._count.chatSessions}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-purple-600 mb-1">
                  <History className="w-4 h-4" />
                  <span className="text-sm font-medium">총 쿼리</span>
                </div>
                <p className="text-2xl font-bold text-purple-700">{user._count.histories}</p>
              </div>
            </div>

            {/* 최근 세션 */}
            {user.chatSessions.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-3">최근 채팅 세션</h3>
                <div className="space-y-2">
                  {user.chatSessions.slice(0, 5).map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {session.title || '제목 없음'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {session._count.messages}개 메시지
                        </p>
                      </div>
                      <span className="text-xs text-gray-400 ml-4">
                        {new Date(session.updatedAt).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 최근 히스토리 */}
            {user.histories.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">최근 활동</h3>
                <div className="space-y-2">
                  {user.histories.slice(0, 5).map((history) => (
                    <div
                      key={history.id}
                      className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <span className={`px-2 py-0.5 text-xs rounded flex-shrink-0 ${
                        history.type === 'query'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {history.type === 'query' ? 'SQL' : 'Doc'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 truncate">
                          {history.input.slice(0, 50)}...
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(history.createdAt).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
