'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { QuickFeedback, FeedbackButton } from '@/components/chat/feedback-button';
import { ReportRenderer } from '@/components/chat/report-renderer';
import type { QueryResultSnapshot, ReportPresentation } from '@/lib/presentation';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sql?: string | null;
  parseError?: boolean;  // SQL 파싱 실패 플래그
  presentation?: ReportPresentation | null;
  resultSnapshot?: QueryResultSnapshot | null;
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
  presentation?: ReportPresentation;
  resultSnapshot?: QueryResultSnapshot;
}

interface ChartPoint {
  label: string;
  value: number;
}

function toDisplayText(value: unknown) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? value.toLocaleString('ko-KR')
      : value.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
  }
  return String(value);
}

function toNumericValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim().replace(/,/g, '');
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function isDateLike(value: unknown) {
  if (value instanceof Date) return true;
  if (typeof value !== 'string') return false;
  return !Number.isNaN(Date.parse(value));
}

function isSqlOnlyRequest(input: string) {
  return /sql만|쿼리만|문장만|실행하지\s*마|실행 없이|only sql|sql only/i.test(input);
}

function buildVisualization(result: QueryResult) {
  const rows = result.rows;
  const fields = result.fields;

  if (rows.length === 0) {
    return { type: 'empty' as const };
  }

  const numericFields = fields.filter((field) =>
    rows.some((row) => toNumericValue(row[field.name]) !== null) &&
    rows.every((row) => row[field.name] === null || row[field.name] === undefined || toNumericValue(row[field.name]) !== null)
  );

  const dimensionFields = fields.filter((field) => !numericFields.some((numericField) => numericField.name === field.name));

  if (rows.length === 1 && numericFields.length > 0) {
    return {
      type: 'metric' as const,
      metrics: numericFields.map((field) => ({
        label: field.name,
        value: toNumericValue(rows[0][field.name]) ?? 0,
      })),
    };
  }

  if (numericFields.length > 0 && dimensionFields.length > 0) {
    const xField = dimensionFields[0];
    const yField = numericFields[0];
    const points: ChartPoint[] = rows
      .map((row) => ({
        label: toDisplayText(row[xField.name]),
        value: toNumericValue(row[yField.name]),
      }))
      .filter((point): point is ChartPoint => point.value !== null)
      .slice(0, 12);

    if (points.length >= 2) {
      return {
        type: isDateLike(rows[0][xField.name]) ? 'line' as const : 'bar' as const,
        points,
      };
    }
  }

  return { type: 'table' as const };
}

function renderLineChart(points: ChartPoint[]) {
  const width = 640;
  const height = 220;
  const padding = 24;
  const maxValue = Math.max(...points.map((point) => point.value), 1);
  const minValue = Math.min(...points.map((point) => point.value), 0);
  const range = maxValue - minValue || 1;
  const chartPoints = points.map((point, index) => {
    const x = padding + (index * (width - padding * 2)) / Math.max(points.length - 1, 1);
    const y = height - padding - ((point.value - minValue) / range) * (height - padding * 2);
    return { ...point, x, y };
  });
  const polyline = chartPoints.map((point) => `${point.x},${point.y}`).join(' ');

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-800">추이 그래프</span>
        <span className="text-xs text-gray-500">상위 {points.length}개 포인트</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full">
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#cbd5e1" strokeWidth="1" />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#cbd5e1" strokeWidth="1" />
        <polyline fill="none" stroke="#4f46e5" strokeWidth="3" points={polyline} />
        {chartPoints.map((point) => (
          <g key={`${point.label}-${point.value}`}>
            <circle cx={point.x} cy={point.y} r="4" fill="#4f46e5" />
            <text x={point.x} y={point.y - 10} textAnchor="middle" fontSize="10" fill="#475569">
              {toDisplayText(point.value)}
            </text>
          </g>
        ))}
      </svg>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-500 sm:grid-cols-4">
        {points.map((point) => (
          <div key={`${point.label}-${point.value}`} className="truncate rounded-lg bg-gray-50 px-2 py-1">
            {point.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function renderBarChart(points: ChartPoint[]) {
  const maxValue = Math.max(...points.map((point) => point.value), 1);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-800">비교 그래프</span>
        <span className="text-xs text-gray-500">상위 {points.length}개 항목</span>
      </div>
      <div className="space-y-3">
        {points.map((point) => (
          <div key={`${point.label}-${point.value}`} className="space-y-1">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate text-gray-600">{point.label}</span>
              <span className="font-medium text-gray-900">{toDisplayText(point.value)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-indigo-500"
                style={{ width: `${Math.max((point.value / maxValue) * 100, 4)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
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
        body: JSON.stringify({
          content: userContent,
          autoExecute: !isSqlOnlyRequest(userContent),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        const assistantMessage: Message = {
          ...data.assistantMessage,
          sql: data.assistantMessage.sql || null,
          parseError: data.assistantMessage.parseError || false,
          presentation: data.assistantMessage.presentation || null,
          resultSnapshot: data.assistantMessage.resultSnapshot || null,
        };

        setMessages(prev => {
          const filtered = prev.filter(m => m.id !== tempUserMessage.id);
          return [
            ...filtered,
            data.userMessage,
            assistantMessage
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

  const executeQuery = async (messageId: string, sql: string, question?: string, explanation?: string) => {
    setExecutingQuery(messageId);
    try {
      const res = await fetch('/api/sql/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sql,
          question,
          explanation,
          sessionId: currentSessionId,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        setMessages(prev => prev.map((message) => (
          message.id === messageId
            ? {
                ...message,
                presentation: data.presentation || message.presentation || null,
                resultSnapshot: data.resultSnapshot || message.resultSnapshot || null,
              }
            : message
        )));

        if (!data.presentation || !data.resultSnapshot) {
          setQueryResults(prev => ({
            ...prev,
            [messageId]: data
          }));
        }
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

  const getQuestionForAssistant = (index: number) => {
    for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
      if (messages[cursor]?.role === 'user') {
        return messages[cursor].content;
      }
    }

    return '';
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

    const visualization = buildVisualization(result);

    return (
      <div className="mt-3 space-y-3">
        {visualization.type === 'metric' && (
          <div className="grid gap-3 sm:grid-cols-2">
            {visualization.metrics.map((metric) => (
              <div key={metric.label} className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-indigo-500">{metric.label}</div>
                <div className="mt-2 text-2xl font-semibold text-gray-900">{toDisplayText(metric.value)}</div>
              </div>
            ))}
          </div>
        )}

        {visualization.type === 'bar' && renderBarChart(visualization.points)}
        {visualization.type === 'line' && renderLineChart(visualization.points)}

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
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
                        {toDisplayText(row[field.name])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
      {messages.map((message, index) => (
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
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => executeQuery(
                              message.id,
                              message.sql!,
                              getQuestionForAssistant(index),
                              message.content
                            )}
                            disabled={executingQuery === message.id}
                            className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
                          >
                            {executingQuery === message.id ? '리포트 준비 중...' : (message.presentation && message.resultSnapshot) || queryResults[message.id] ? '다시 실행' : '리포트 보기'}
                          </button>
                          <span className="text-xs text-gray-500">AI가 표, 요약, 차트 블록을 결정하고 SQL은 아래에 접어둡니다.</span>
                        </div>
                      )}
                      {message.presentation && message.resultSnapshot && (
                        <ReportRenderer
                          presentation={message.presentation}
                          snapshot={message.resultSnapshot}
                        />
                      )}
                      {message.sql && !message.presentation && renderQueryResult(message.id)}
                      {!message.sql && message.parseError && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                          <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <span className="text-sm text-amber-700">SQL을 생성하지 못했습니다. 질문을 다시 시도해주세요.</span>
                        </div>
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
                      {message.sql && (
                        <details className="rounded-xl border border-gray-200 bg-gray-50">
                          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-gray-700">
                            생성된 SQL 보기
                          </summary>
                          <div className="border-t border-gray-200 bg-gray-900 rounded-b-xl overflow-hidden">
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
                        </details>
                      )}
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
