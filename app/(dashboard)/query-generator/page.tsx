'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { QuickFeedback, FeedbackButton } from '@/components/chat/feedback-button';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sql?: string | null;
  createdAt?: string;
}

interface ChatSession {
  id: string;
  title: string | null;
  updatedAt: string;
}

interface QueryResult {
  rows: any[];
  fields: { name: string }[];
  totalRows: number;
  truncated: boolean;
}

function CodeBlock({ children, ...props }: any) {
  const [copied, setCopied] = useState(false);
  const codeElement = children?.props?.children;
  const codeText = typeof codeElement === 'string' ? codeElement : String(codeElement || '');
  const className = children?.props?.className || '';
  const language = className.replace('language-', '') || 'Code';

  const handleCopy = () => {
    navigator.clipboard.writeText(codeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="not-prose bg-gray-900 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800">
        <span className="text-xs text-gray-400">{language.toUpperCase()}</span>
        <button
          onClick={handleCopy}
          className={`text-xs transition-colors flex items-center gap-1 ${
            copied ? 'text-green-400' : 'text-gray-400 hover:text-white'
          }`}
        >
          {copied ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              복사됨
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              복사
            </>
          )}
        </button>
      </div>
      <pre className="p-4 text-sm text-green-400 overflow-x-auto" {...props}>
        {children}
      </pre>
    </div>
  );
}

export default function QueryGeneratorPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // 기본적으로 닫힘
  const [executingQuery, setExecutingQuery] = useState<string | null>(null);
  const [queryResults, setQueryResults] = useState<Record<string, QueryResult | { error: string }>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isSubmitting = useRef(false);

  // 데스크톱에서는 사이드바 기본 열림
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      }
    };
    handleResize(); // 초기 실행
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, queryResults]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/chat/sessions');
      const data = await res.json();
      if (data.sessions) {
        setSessions(data.sessions);
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  };

  const loadSession = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}`);
      const data = await res.json();
      if (data.session) {
        setCurrentSessionId(sessionId);
        setMessages(data.session.messages);
        setQueryResults({});
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  };

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/chat/sessions/${sessionId}`, { method: 'DELETE' });
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setMessages([]);
        setQueryResults({});
      }
      fetchSessions();
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || isSubmitting.current) return;

    isSubmitting.current = true;
    let sessionId = currentSessionId;

    if (!sessionId) {
      try {
        const res = await fetch('/api/chat/sessions', { method: 'POST' });
        const data = await res.json();
        sessionId = data.session.id;
        setCurrentSessionId(sessionId);
      } catch (error) {
        console.error('Failed to create session:', error);
        return;
      }
    }

    const userContent = input.trim();
    const tempUserMessage: Message = {
      id: 'temp-user-' + Date.now(),
      role: 'user',
      content: userContent,
    };

    setMessages(prev => [...prev, tempUserMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: userContent }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessages(prev => {
          const filtered = prev.filter(m => m.id !== tempUserMessage.id);
          return [
            ...filtered,
            data.userMessage,
            {
              ...data.assistantMessage,
              sql: data.assistantMessage.sql,
            }
          ];
        });
        fetchSessions();
      } else {
        setMessages(prev => [
          ...prev,
          {
            id: 'error-' + Date.now(),
            role: 'assistant',
            content: data.error || '오류가 발생했습니다.',
          }
        ]);
      }
    } catch (error) {
      setMessages(prev => [
        ...prev,
        {
          id: 'error-' + Date.now(),
          role: 'assistant',
          content: '네트워크 오류가 발생했습니다.',
        }
      ]);
    } finally {
      setLoading(false);
      isSubmitting.current = false;
    }
  };

  const executeQuery = async (messageId: string, sql: string) => {
    setExecutingQuery(messageId);
    try {
      const res = await fetch('/api/sql/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql }),
      });
      const data = await res.json();

      if (res.ok) {
        setQueryResults(prev => ({
          ...prev,
          [messageId]: data
        }));
      } else {
        setQueryResults(prev => ({
          ...prev,
          [messageId]: { error: data.error }
        }));
      }
    } catch (error) {
      setQueryResults(prev => ({
        ...prev,
        [messageId]: { error: '쿼리 실행 중 오류가 발생했습니다.' }
      }));
    } finally {
      setExecutingQuery(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      e.stopPropagation();
      handleSubmit(e);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setQueryResults({});
  };

  const renderQueryResult = (messageId: string) => {
    const result = queryResults[messageId];
    if (!result) return null;

    if ('error' in result) {
      return (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {result.error}
        </div>
      );
    }

    return (
      <div className="mt-3 bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
          <span className="text-xs text-gray-500">
            결과: {result.totalRows}행 {result.truncated && '(100개만 표시)'}
          </span>
          <button
            onClick={() => {
              const csv = [
                result.fields.map(f => f.name).join(','),
                ...result.rows.map(row => result.fields.map(f => row[f.name]).join(','))
              ].join('\n');
              copyToClipboard(csv, `csv-${messageId}`);
            }}
            className={`text-xs transition-colors flex items-center gap-1 ${
              copiedId === `csv-${messageId}` ? 'text-green-500' : 'text-indigo-600 hover:text-indigo-700'
            }`}
          >
            {copiedId === `csv-${messageId}` ? (
              <>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                복사됨
              </>
            ) : (
              'CSV 복사'
            )}
          </button>
        </div>
        <div className="overflow-x-auto max-h-64">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                {result.fields.map((field, i) => (
                  <th key={i} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    {field.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {result.rows.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  {result.fields.map((field, j) => (
                    <td key={j} className="px-3 py-2 text-gray-700 whitespace-nowrap">
                      {row[field.name] === null ? <span className="text-gray-400">NULL</span> : String(row[field.name])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full relative">
      {/* 모바일 오버레이 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 사이드바 */}
      <div className={`
        fixed lg:relative inset-y-0 left-0 z-30 lg:z-auto
        ${sidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full lg:translate-x-0'}
        transition-all duration-300 bg-gray-900 flex flex-col overflow-hidden
      `}>
        <div className="p-3">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            새 대화
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2">
          <div className="text-xs text-gray-500 px-2 py-2">대화 기록</div>
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => {
                loadSession(session.id);
                // 모바일에서 세션 선택 시 사이드바 닫기
                if (window.innerWidth < 1024) {
                  setSidebarOpen(false);
                }
              }}
              className={`group flex items-center gap-2 px-3 py-2 text-sm rounded-lg cursor-pointer mb-1 ${
                currentSessionId === session.id
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <span className="flex-1 truncate">{session.title || '새 대화'}</span>
              <button
                onClick={(e) => deleteSession(session.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400 transition-opacity"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 토글 버튼 - 모바일에서는 항상 보이도록 */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={`
          fixed lg:absolute top-1/2 -translate-y-1/2 z-10
          bg-gray-800 text-white p-1.5 rounded-r-md hover:bg-gray-700
          transition-all duration-300
          ${sidebarOpen ? 'left-64' : 'left-0'}
        `}
      >
        <svg className={`w-4 h-4 transition-transform ${sidebarOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* 메인 채팅 영역 */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 px-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 mb-4 sm:mb-6 rounded-full bg-indigo-100 flex items-center justify-center">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
              </div>
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-700 mb-2 text-center">SQL 쿼리 생성</h2>
              <p className="text-sm sm:text-base text-gray-400 mb-6 sm:mb-8 text-center">자연어로 질문하면 SQL 쿼리를 생성하고 실행할 수 있습니다</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 w-full max-w-2xl">
                {[
                  '지난 30일간 가입한 회원 수',
                  '가장 많이 팔린 상품 TOP 10',
                  '이번 달 주문 금액 합계',
                  '활성 구독자 목록 조회',
                ].map((example) => (
                  <button
                    key={example}
                    onClick={() => setInput(example)}
                    className="text-left px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 active:bg-indigo-100 transition-colors text-sm text-gray-600"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto py-4 sm:py-6 px-3 sm:px-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`mb-4 sm:mb-6 ${message.role === 'user' ? 'flex justify-end' : ''}`}
                >
                  {message.role === 'user' ? (
                    <div className="max-w-[85%] sm:max-w-[80%] bg-indigo-600 text-white px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl rounded-br-md text-sm sm:text-base">
                      {message.content}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {message.sql && (
                        <>
                          <div className="bg-gray-900 rounded-xl overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-2 bg-gray-800">
                              <span className="text-xs text-gray-400">SQL</span>
                              <button
                                onClick={() => copyToClipboard(message.sql!, `sql-${message.id}`)}
                                className={`text-xs transition-colors flex items-center gap-1 ${
                                  copiedId === `sql-${message.id}` ? 'text-green-400' : 'text-gray-400 hover:text-white'
                                }`}
                              >
                                {copiedId === `sql-${message.id}` ? (
                                  <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    복사됨
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    복사
                                  </>
                                )}
                              </button>
                            </div>
                            <pre className="p-4 text-sm text-green-400 overflow-x-auto">
                              <code>{message.sql}</code>
                            </pre>
                          </div>
                        </>
                      )}
                      <div className="text-gray-700 leading-relaxed prose prose-sm max-w-none prose-table:border-collapse prose-td:border prose-td:border-gray-300 prose-td:px-3 prose-td:py-2 prose-th:border prose-th:border-gray-300 prose-th:px-3 prose-th:py-2 prose-th:bg-gray-100 prose-th:font-semibold prose-table:text-sm prose-code:text-indigo-600 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            pre: CodeBlock,
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                      {/* 피드백 버튼 */}
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
                        <QuickFeedback sessionId={currentSessionId || undefined} messageId={message.id} />
                        <FeedbackButton sessionId={currentSessionId || undefined} messageId={message.id} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 text-gray-400">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                    <span className="text-sm">쿼리 생성 중...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* 입력 영역 */}
        <div className="border-t bg-white p-2 sm:p-4">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
            <div className="relative flex items-end bg-gray-100 rounded-2xl border border-gray-200 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="SQL 쿼리가 필요한 내용을 입력하세요..."
                rows={1}
                className="flex-1 bg-transparent px-3 sm:px-4 py-2.5 sm:py-3 resize-none focus:outline-none text-sm sm:text-base text-gray-700 placeholder-gray-400"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="m-1.5 sm:m-2 p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-gray-400 text-center mt-1.5 sm:mt-2">
              Enter로 전송, Shift+Enter로 줄바꿈
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
