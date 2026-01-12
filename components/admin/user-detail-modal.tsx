'use client';

import { useState } from 'react';
import { X, MessageSquare, History, Settings, BookOpen, Scale } from 'lucide-react';

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

interface UserPreference {
  sqlKeywordCase: string;
  aliasStyle: string;
  indentation: string;
  includeComments: boolean;
  explainLevel: string;
  defaultLimit: number;
}

interface DomainTerm {
  id: string;
  term: string;
  mapping: string;
  description: string | null;
  createdAt: string;
}

interface BusinessRule {
  id: string;
  name: string;
  condition: string;
  sqlSnippet: string;
  isActive: boolean;
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
  preference: UserPreference | null;
  domainTerms: DomainTerm[];
  businessRules: BusinessRule[];
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

type TabType = 'info' | 'preference' | 'terms' | 'rules';

const preferenceLabels: Record<string, { label: string; format?: (v: any) => string }> = {
  sqlKeywordCase: { label: 'SQL 키워드', format: v => v === 'uppercase' ? '대문자' : '소문자' },
  aliasStyle: { label: '별칭 스타일', format: v => v === 'meaningful' ? '의미있는' : '짧은' },
  indentation: { label: '들여쓰기', format: v => v === '2spaces' ? '2칸' : v === '4spaces' ? '4칸' : '탭' },
  includeComments: { label: '주석 포함', format: v => v ? '예' : '아니오' },
  explainLevel: { label: '설명 수준', format: v => v === 'detailed' ? '상세' : v === 'moderate' ? '보통' : '간략' },
  defaultLimit: { label: '기본 LIMIT' },
};

export function UserDetailModal({ user, isOpen, onClose }: UserDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('info');

  if (!isOpen || !user) return null;

  const tabs = [
    { key: 'info' as const, label: '기본 정보', icon: MessageSquare },
    { key: 'preference' as const, label: '선호도', icon: Settings },
    { key: 'terms' as const, label: '용어집', icon: BookOpen },
    { key: 'rules' as const, label: '규칙', icon: Scale },
  ];

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

          {/* Tabs */}
          <div className="flex border-b border-gray-200 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-180px)]">
            {/* 기본 정보 탭 */}
            {activeTab === 'info' && (
              <>
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
              </>
            )}

            {/* 선호도 탭 */}
            {activeTab === 'preference' && (
              <div className="space-y-3">
                {user.preference ? (
                  Object.entries(preferenceLabels).map(([key, config]) => {
                    const value = user.preference?.[key as keyof UserPreference];
                    return (
                      <div key={key} className="flex justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-500">{config.label}</span>
                        <span className="font-medium text-gray-900">
                          {config.format ? config.format(value) : value}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                    <Settings className="w-10 h-10 mb-3 opacity-50" />
                    <p>설정된 선호도가 없습니다</p>
                  </div>
                )}
              </div>
            )}

            {/* 용어집 탭 */}
            {activeTab === 'terms' && (
              <div className="space-y-2">
                {user.domainTerms.length > 0 ? (
                  user.domainTerms.map((term) => (
                    <div key={term.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">&ldquo;{term.term}&rdquo;</span>
                        <span className="text-gray-400">→</span>
                        <code className="text-sm text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{term.mapping}</code>
                      </div>
                      {term.description && (
                        <p className="text-xs text-gray-500">{term.description}</p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                    <BookOpen className="w-10 h-10 mb-3 opacity-50" />
                    <p>등록된 용어가 없습니다</p>
                  </div>
                )}
              </div>
            )}

            {/* 규칙 탭 */}
            {activeTab === 'rules' && (
              <div className="space-y-2">
                {user.businessRules.length > 0 ? (
                  user.businessRules.map((rule) => (
                    <div key={rule.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">{rule.name}</span>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          rule.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {rule.isActive ? '활성' : '비활성'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mb-1">조건: {rule.condition}</p>
                      <code className="text-xs text-gray-500 block bg-gray-100 p-2 rounded">{rule.sqlSnippet}</code>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                    <Scale className="w-10 h-10 mb-3 opacity-50" />
                    <p>등록된 규칙이 없습니다</p>
                  </div>
                )}
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
