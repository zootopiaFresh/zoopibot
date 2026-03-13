'use client';

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ArrowUp,
  BarChart3,
  Check,
  ChevronDown,
  Code2,
  Copy,
  FileText,
  Globe,
  LogOut,
  MessageCircle,
  PanelLeft,
  PanelLeftClose,
  Paperclip,
  Plus,
  Settings,
  Shield,
  Sparkles,
  TableProperties,
  Trash2,
} from 'lucide-react';

import { FeedbackButton, QuickFeedback } from '@/components/chat/feedback-button';
import { ReportRenderer } from '@/components/chat/report-renderer';
import type { QueryResultSnapshot, ReportPresentation } from '@/lib/presentation';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sql?: string | null;
  status?: 'pending' | 'running' | 'completed' | 'failed';
  errorMessage?: string | null;
  parseError?: boolean;
  validated?: boolean | null;
  validationMode?: string | null;
  validationError?: string | null;
  validationAttempts?: number | null;
  presentation?: ReportPresentation | null;
  resultSnapshot?: QueryResultSnapshot | null;
  createdAt?: string;
  startedAt?: string | null;
  completedAt?: string | null;
}

interface ChatSession {
  id: string;
  title: string | null;
  updatedAt: string;
}

const SUGGESTED_PROMPTS = [
  '전체 회원수와 MAU, DAU를 확인해줘',
  '지난 30일간 신규 가입자 수를 일자별로 보여줘',
  '가장 많이 팔린 상품 TOP 10을 알려줘',
  '이번 달 주문 금액 합계를 계산해줘',
];

function formatSessionDate(updatedAt: string) {
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return '오늘';
  }

  if (date.toDateString() === yesterday.toDateString()) {
    return '어제';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

interface QueryResult {
  rows: Record<string, unknown>[];
  fields: { name: string }[];
  totalRows: number;
  truncated: boolean;
  presentation?: ReportPresentation | null;
  resultSnapshot?: QueryResultSnapshot | null;
}

interface QueryResultError {
  error: string;
}

interface ChartPoint {
  label: string;
  value: number;
}

interface ChatSessionEventPayload {
  type: 'message.created' | 'message.updated' | 'message.completed' | 'message.failed';
  sessionId: string;
  message: Message;
}

interface ProgressLogItem {
  state: 'done' | 'run' | 'todo' | 'fail';
  text: string;
}

function AnimatedProgressText({ text }: { text: string }) {
  return (
    <span className="live-progress-line" aria-live="polite">
      {Array.from(text).map((character, index) => (
        <span
          key={`${text}-${index}`}
          className="live-progress-char"
          style={{ animationDelay: `${index * 18}ms` }}
        >
          {character === ' ' ? '\u00A0' : character}
        </span>
      ))}
    </span>
  );
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

function normalizeMessage(message: Message): Message {
  return {
    ...message,
    status: message.status || 'completed',
    errorMessage: message.errorMessage || null,
    parseError: message.parseError || false,
    validated: message.validated ?? null,
    validationMode: message.validationMode || null,
    validationError: message.validationError || null,
    validationAttempts: message.validationAttempts ?? null,
  };
}

function isActiveMessage(message: Message) {
  return message.role === 'assistant' && (message.status === 'pending' || message.status === 'running');
}

function parseProgressLog(message: Message): ProgressLogItem[] {
  const items = message.content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const matched = line.match(/^\[(done|run|todo|fail)\]\s+(.*)$/);
      if (!matched) {
        return null;
      }

      return {
        state: matched[1] as ProgressLogItem['state'],
        text: matched[2],
      };
    })
    .filter((item): item is ProgressLogItem => item !== null);

  if (items.length > 0) {
    return items;
  }

  return [
    {
      state: message.status === 'pending' ? 'run' : 'todo',
      text: message.status === 'pending'
        ? '질문을 접수했습니다.'
        : '응답 생성을 준비하고 있습니다.',
    },
    { state: 'todo', text: '관련 스키마 탐색' },
    { state: 'todo', text: 'SQL 검증 및 결과 확인' },
    { state: 'todo', text: '리포트 정리' },
  ];
}

function getElapsedText(message: Message, nowMs: number) {
  const baseTime = message.startedAt || message.createdAt;
  if (!baseTime) {
    return null;
  }

  const elapsedMs = Math.max(0, nowMs - new Date(baseTime).getTime());
  const elapsedSeconds = Math.floor(elapsedMs / 1000);

  if (elapsedSeconds < 60) {
    return `${elapsedSeconds}초 경과`;
  }

  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  return `${minutes}분 ${seconds}초 경과`;
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text.trim()) {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    const normalized = text.trim();
    if (normalized.startsWith('<')) {
      const titleMatch = normalized.match(/<title>(.*?)<\/title>/i);
      const headingMatch = normalized.match(/<h1[^>]*>(.*?)<\/h1>/i);
      const pageLabel = titleMatch?.[1] ?? headingMatch?.[1] ?? `HTTP ${response.status}`;
      throw new Error(`서버가 JSON 대신 HTML 오류 페이지를 반환했습니다. (${pageLabel})`);
    }

    throw new Error(`서버 응답을 해석하지 못했습니다. (HTTP ${response.status})`);
  }
}

function buildVisualization(result: QueryResult) {
  const rows = result.rows;
  const fields = result.fields;

  if (rows.length === 0) {
    return { type: 'empty' as const };
  }

  const numericFields = fields.filter(
    (field) =>
      rows.some((row) => toNumericValue(row[field.name]) !== null) &&
      rows.every(
        (row) =>
          row[field.name] === null ||
          row[field.name] === undefined ||
          toNumericValue(row[field.name]) !== null
      )
  );

  const dimensionFields = fields.filter(
    (field) => !numericFields.some((numericField) => numericField.name === field.name)
  );

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
        type: isDateLike(rows[0][xField.name]) ? ('line' as const) : ('bar' as const),
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
    const y =
      height - padding - ((point.value - minValue) / range) * (height - padding * 2);
    return { ...point, x, y };
  });
  const polyline = chartPoints.map((point) => `${point.x},${point.y}`).join(' ');

  return (
    <div className="rounded-3xl border border-[#e5e7eb] bg-white p-4 shadow-[0_14px_30px_rgba(15,23,42,0.06)]">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-[#0d0d0d]">추이 그래프</span>
        <span className="text-xs text-[#6f6f7b]">상위 {points.length}개 포인트</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full">
        <line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
          stroke="#d1d5db"
          strokeWidth="1"
        />
        <line
          x1={padding}
          y1={padding}
          x2={padding}
          y2={height - padding}
          stroke="#d1d5db"
          strokeWidth="1"
        />
        <polyline fill="none" stroke="#4b5563" strokeWidth="3" points={polyline} />
        {chartPoints.map((point) => (
          <g key={`${point.label}-${point.value}`}>
            <circle cx={point.x} cy={point.y} r="4" fill="#4b5563" />
            <text
              x={point.x}
              y={point.y - 10}
              textAnchor="middle"
              fontSize="10"
              fill="#6f6f7b"
            >
              {toDisplayText(point.value)}
            </text>
          </g>
        ))}
      </svg>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[#6f6f7b] sm:grid-cols-4">
        {points.map((point) => (
          <div
            key={`${point.label}-${point.value}`}
            className="truncate rounded-full bg-[#f7f7f8] px-3 py-1.5"
          >
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
          <div className="rounded-3xl border border-[#e5e7eb] bg-white p-4 shadow-[0_14px_30px_rgba(15,23,42,0.06)]">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-[#0d0d0d]">비교 그래프</span>
        <span className="text-xs text-[#6f6f7b]">상위 {points.length}개 항목</span>
      </div>
      <div className="space-y-3">
        {points.map((point) => (
          <div key={`${point.label}-${point.value}`} className="space-y-1">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate text-[#6f6f7b]">{point.label}</span>
              <span className="font-medium text-[#0d0d0d]">{toDisplayText(point.value)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#eceff3]">
              <div
                className="h-full rounded-full bg-[#4b5563]"
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
  const language = className.replace('language-', '') || 'code';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(codeText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="not-prose overflow-hidden rounded-2xl border border-[#2f3136] bg-[#202123] shadow-[0_18px_40px_rgba(15,23,42,0.18)]">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-4 py-2.5">
        <span className="text-xs uppercase tracking-[0.18em] text-[#8e8ea0]">{language}</span>
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-colors',
            copied ? 'text-white' : 'text-[#c5c5d2] hover:bg-white/[0.06] hover:text-white'
          )}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? '복사됨' : '복사'}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-sm leading-6 text-[#d4d4d4]" {...props}>
        {children}
      </pre>
    </div>
  );
}

function SqlCard({ sql }: { sql: string }) {
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(sql);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-[#2f3136] bg-[#202123] shadow-[0_18px_40px_rgba(15,23,42,0.18)]">
      <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="inline-flex items-center gap-2 text-sm text-[#c5c5d2] transition-colors hover:text-white"
        >
          <Sparkles className="h-4 w-4 text-[#d1d5db]" />
          <span>sql</span>
          <ChevronDown className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')} />
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-colors',
            copied ? 'text-white' : 'text-[#8e8ea0] hover:bg-white/[0.06] hover:text-white'
          )}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? '복사됨' : '복사'}
        </button>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-3">
          <pre className="overflow-x-auto text-sm leading-6 text-[#d4d4d4]">
            <code>{sql}</code>
          </pre>
        </div>
      )}
    </div>
  );
}

export default function QueryGeneratorPage() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === 'admin';
  const userInitial = session?.user?.email?.charAt(0).toUpperCase() || 'U';

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [executingQuery, setExecutingQuery] = useState<string | null>(null);
  const [queryResults, setQueryResults] = useState<
    Record<string, QueryResult | QueryResultError>
  >({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [progressNow, setProgressNow] = useState(() => Date.now());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isSubmitting = useRef(false);
  const wasDesktop = useRef(false);
  const hasActiveAssistant = messages.some((message) => isActiveMessage(message));

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');

    const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
      const desktop = event.matches;
      setIsDesktop(desktop);

      if (desktop && !wasDesktop.current) {
        setSidebarOpen(true);
      }

      if (!desktop && wasDesktop.current) {
        setSidebarOpen(false);
      }

      wasDesktop.current = desktop;
    };

    handleChange(mediaQuery);
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: messages.length > 0 ? 'smooth' : 'auto',
      block: 'end',
    });
  }, [messages, queryResults]);

  useEffect(() => {
    if (!textareaRef.current) {
      return;
    }

    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
  }, [input]);

  useEffect(() => {
    if (!hasActiveAssistant) {
      return;
    }

    setProgressNow(Date.now());
    const intervalId = window.setInterval(() => {
      setProgressNow(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [hasActiveAssistant]);

  useEffect(() => {
    if (!currentSessionId) {
      return;
    }

    const eventSource = new EventSource(`/api/chat/sessions/${currentSessionId}/events`);
    const handleEvent = (event: Event) => {
      const messageEvent = event as MessageEvent<string>;

      try {
        const payload = JSON.parse(messageEvent.data) as ChatSessionEventPayload;
        const nextMessage = normalizeMessage(payload.message);

        setMessages((previous) => {
          const existingIndex = previous.findIndex((message) => message.id === nextMessage.id);
          if (existingIndex === -1) {
            return [...previous, nextMessage].sort((left, right) => {
              const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
              const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
              return leftTime - rightTime;
            });
          }

          return previous.map((message) =>
            message.id === nextMessage.id ? { ...message, ...nextMessage } : message
          );
        });

        if (
          payload.type === 'message.created' ||
          payload.type === 'message.completed' ||
          payload.type === 'message.failed'
        ) {
          void fetchSessions();
        }
      } catch (error) {
        console.error('Failed to parse chat event:', error);
      }
    };

    eventSource.addEventListener('message.created', handleEvent);
    eventSource.addEventListener('message.updated', handleEvent);
    eventSource.addEventListener('message.completed', handleEvent);
    eventSource.addEventListener('message.failed', handleEvent);

    return () => {
      eventSource.removeEventListener('message.created', handleEvent);
      eventSource.removeEventListener('message.updated', handleEvent);
      eventSource.removeEventListener('message.completed', handleEvent);
      eventSource.removeEventListener('message.failed', handleEvent);
      eventSource.close();
    };
  }, [currentSessionId]);

  useEffect(() => {
    if (!currentSessionId || !hasActiveAssistant) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void (async () => {
        try {
          const response = await fetch(`/api/chat/sessions/${currentSessionId}`);
          const data = await parseJsonResponse<{ session?: { messages: Message[] } }>(response);

          if (!response.ok || !data.session) {
            return;
          }

          setMessages(data.session.messages.map((message) => normalizeMessage(message)));
        } catch (error) {
          console.error('Failed to refresh active session:', error);
        }
      })();
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [currentSessionId, hasActiveAssistant]);

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/chat/sessions');
      const data = await parseJsonResponse<{ sessions?: ChatSession[]; error?: string }>(response);

      if (data.sessions) {
        setSessions(data.sessions);
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  };

  const loadSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/chat/sessions/${sessionId}`);
      const data = await parseJsonResponse<{ session?: { messages: Message[] } }>(response);

      if (!data.session) {
        return;
      }

      setCurrentSessionId(sessionId);
      setMessages(data.session.messages.map((message) => normalizeMessage(message)));
      setQueryResults({});

      if (!isDesktop) {
        setSidebarOpen(false);
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  };

  const deleteSession = async (sessionId: string, event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();

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

  const submitMessage = async () => {
    if (!input.trim() || loading || isSubmitting.current || hasActiveAssistant) {
      return;
    }

    isSubmitting.current = true;
    setLoading(true);

    let tempUserMessageId: string | null = null;

    try {
      let sessionId = currentSessionId;

      if (!sessionId) {
        const sessionResponse = await fetch('/api/chat/sessions', { method: 'POST' });
        const sessionData = await parseJsonResponse<{ session?: { id?: string }; error?: string }>(sessionResponse);

        if (!sessionResponse.ok || !sessionData.session?.id) {
          throw new Error(sessionData.error || '새 대화를 만들지 못했습니다.');
        }

        sessionId = sessionData.session.id;
        setCurrentSessionId(sessionId);
      }

      const userContent = input.trim();
      tempUserMessageId = `temp-user-${Date.now()}`;

      setMessages((previous) => [
        ...previous,
        {
          id: tempUserMessageId!,
          role: 'user',
          content: userContent,
        },
      ]);
      setInput('');

      const response = await fetch(`/api/chat/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: userContent,
          autoExecute: !isSqlOnlyRequest(userContent),
        }),
      });
      const data = await parseJsonResponse<{
        userMessage: Message;
        assistantMessage: Message;
        error?: string;
      }>(response);

      if (!response.ok) {
        throw new Error(data.error || '오류가 발생했습니다.');
      }

      const assistantMessage: Message = {
        ...normalizeMessage(data.assistantMessage),
        sql: data.assistantMessage.sql || null,
        presentation: data.assistantMessage.presentation || null,
        resultSnapshot: data.assistantMessage.resultSnapshot || null,
      };

      setMessages((previous) => {
        const nextMessages = previous.filter((message) => message.id !== tempUserMessageId);

        for (const incomingMessage of [normalizeMessage(data.userMessage), assistantMessage]) {
          const existingIndex = nextMessages.findIndex((message) => message.id === incomingMessage.id);

          if (existingIndex === -1) {
            nextMessages.push(incomingMessage);
            continue;
          }

          nextMessages[existingIndex] = {
            ...nextMessages[existingIndex],
            ...incomingMessage,
          };
        }

        nextMessages.sort((left, right) => {
          const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
          const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
          return leftTime - rightTime;
        });

        return [...nextMessages];
      });

      fetchSessions();
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages((previous) => [
        ...previous,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: error instanceof Error ? error.message : '오류가 발생했습니다.',
          status: 'failed',
        },
      ]);
    } finally {
      setLoading(false);
      isSubmitting.current = false;
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submitMessage();
  };

  const executeQuery = async (messageId: string, sql: string, question?: string, explanation?: string) => {
    setExecutingQuery(messageId);
    try {
      const response = await fetch('/api/sql/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sql,
          question,
          explanation,
          sessionId: currentSessionId,
        }),
      });
      const data = await parseJsonResponse<{
        error?: string;
        presentation?: ReportPresentation | null;
        resultSnapshot?: QueryResultSnapshot | null;
        rows?: Record<string, unknown>[];
        fields?: { name: string }[];
        totalRows?: number;
        truncated?: boolean;
      }>(response);

      if (!response.ok) {
        setQueryResults((previous) => ({
          ...previous,
          [messageId]: { error: data.error || '쿼리를 실행하지 못했습니다.' },
        }));
        return;
      }

      setMessages((previous) =>
        previous.map((message) =>
          message.id === messageId
            ? {
                ...message,
                presentation: data.presentation || message.presentation || null,
                resultSnapshot: data.resultSnapshot || message.resultSnapshot || null,
              }
            : message
        )
      );

      if (data.presentation && data.resultSnapshot) {
        setQueryResults((previous) => {
          const next = { ...previous };
          delete next[messageId];
          return next;
        });
        return;
      }

      setQueryResults((previous) => ({
        ...previous,
        [messageId]: data as QueryResult,
      }));
    } catch (error) {
      setQueryResults((previous) => ({
        ...previous,
        [messageId]: { error: '쿼리 실행 중 오류가 발생했습니다.' },
      }));
    } finally {
      setExecutingQuery(null);
    }
  };

  const handleTextareaKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void submitMessage();
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 2000);
  };

  const handleNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setQueryResults({});
    setInput('');

    if (!isDesktop) {
      setSidebarOpen(false);
    }
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
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {result.error}
        </div>
      );
    }

    const visualization = buildVisualization(result);

    return (
      <div className="space-y-3">
        {visualization.type === 'metric' && (
          <div className="grid gap-3 sm:grid-cols-2">
            {visualization.metrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-[24px] border border-[#e5e7eb] bg-[linear-gradient(180deg,#f9fafb_0%,#ffffff_100%)] p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]"
              >
                <div className="text-xs font-medium uppercase tracking-wide text-[#6b7280]">
                  {metric.label}
                </div>
                <div className="mt-2 text-2xl font-semibold text-[#0d0d0d]">
                  {toDisplayText(metric.value)}
                </div>
              </div>
            ))}
          </div>
        )}

        {visualization.type === 'bar' && renderBarChart(visualization.points)}
        {visualization.type === 'line' && renderLineChart(visualization.points)}

        <div className="overflow-hidden rounded-[24px] border border-[#e5e5e5] bg-white shadow-[0_10px_24px_rgba(13,13,13,0.04)]">
          <div className="flex items-center justify-between border-b border-[#e5e5e5] bg-[#f7f7f8] px-4 py-3">
            <span className="text-xs text-[#6f6f7b]">
              결과: {result.totalRows}행 {result.truncated && '(100개만 표시)'}
            </span>
            <button
              type="button"
              onClick={() => {
                const csv = [
                  result.fields.map((field) => field.name).join(','),
                  ...result.rows.map((row) =>
                    result.fields.map((field) => row[field.name]).join(',')
                  ),
                ].join('\n');
                void copyToClipboard(csv, `csv-${messageId}`);
              }}
              className={cn(
                'inline-flex items-center gap-1 text-xs transition-colors',
                copiedId === `csv-${messageId}`
                  ? 'text-[#111827]'
                  : 'text-[#6f6f7b] hover:text-[#0d0d0d]'
              )}
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
          <div className="max-h-64 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[#f7f7f8]">
                <tr>
                  {result.fields.map((field) => (
                    <th
                      key={field.name}
                      className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-[#8e8ea0]"
                    >
                      {field.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#efefef]">
                {result.rows.map((row, index) => (
                  <tr key={index} className="hover:bg-[#fafafa]">
                    {result.fields.map((field) => (
                      <td
                        key={`${index}-${field.name}`}
                        className="whitespace-nowrap px-4 py-3 text-[#0d0d0d]"
                      >
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

  const currentSessionTitle =
    sessions.find((item) => item.id === currentSessionId)?.title || 'SQL Assistant';

  return (
    <div className="relative flex h-full min-h-0 bg-[#f7f7f8]">
      {sidebarOpen && !isDesktop && (
        <button
          type="button"
          aria-label="사이드바 닫기"
          className="fixed inset-0 z-20 bg-black/35"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex overflow-hidden transition-all duration-300 ease-out lg:relative lg:z-auto',
          sidebarOpen ? 'w-[280px] opacity-100' : 'w-0 opacity-0'
        )}
      >
        <aside className="flex h-full w-[280px] flex-col border-r border-[#2a2b32] bg-[#202123] text-white">
          <div className="flex items-center gap-2 p-3">
            <button
              type="button"
              onClick={handleNewChat}
              className="flex flex-1 items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-left text-[14px] tracking-tight text-white transition-colors hover:bg-white/[0.08]"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#343541] text-white">
                <Plus className="h-3.5 w-3.5" />
              </div>
              새 대화
            </button>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-[#9ca3af] transition-colors hover:bg-white/[0.08] hover:text-white"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-3 pt-1">
            <p className="px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-[#8e8ea0]">
              최근 대화
            </p>

            <div className="space-y-1">
              {sessions.length === 0 ? (
                <div className="rounded-2xl px-3 py-4 text-sm text-[#8e8ea0]">
                  아직 저장된 대화가 없습니다.
                </div>
              ) : (
                sessions.map((chatSession) => (
                  <div
                    key={chatSession.id}
                    className={cn(
                      'group flex items-start gap-2.5 rounded-2xl px-3 py-2.5 transition-colors',
                      currentSessionId === chatSession.id
                        ? 'bg-white/[0.08]'
                        : 'hover:bg-white/[0.05]'
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => loadSession(chatSession.id)}
                      className="flex min-w-0 flex-1 items-start gap-2.5 text-left"
                    >
                      <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#8e8ea0]" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] tracking-tight text-white">
                          {chatSession.title || '새 대화'}
                        </div>
                        <div className="mt-1 text-[11px] text-[#8e8ea0]">
                          {formatSessionDate(chatSession.updatedAt)}
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={(event) => deleteSession(chatSession.id, event)}
                      className="mt-0.5 rounded-md p-1 text-[#8e8ea0] opacity-0 transition hover:bg-white/[0.08] hover:text-white group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="border-t border-white/10 p-2">
            <Link
              href="/settings"
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] tracking-tight text-[#c5c5d2] transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <Settings className="h-4 w-4" />
              설정
            </Link>
          </div>
        </aside>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-[#e5e7eb] bg-[#f7f7f8]/95 px-3 backdrop-blur sm:px-4">
          <div className="flex h-14 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              {!sidebarOpen && (
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#8e8ea0] transition-colors hover:bg-white hover:text-[#0d0d0d]"
                >
                  <PanelLeft className="h-4 w-4" />
                </button>
              )}

              <button
                type="button"
                className="inline-flex min-w-0 items-center gap-2 rounded-xl px-3 py-1.5 transition-colors hover:bg-white"
              >
                <Sparkles className="h-4 w-4 shrink-0 text-[#6b7280]" />
                <span className="truncate text-[14px] tracking-tight text-[#0d0d0d]">
                  {currentSessionTitle}
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-[#8e8ea0]" />
              </button>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <Link
                href="/settings"
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-[#6f6f7b] transition-colors hover:bg-white hover:text-[#0d0d0d]"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">설정</span>
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-[#6f6f7b] transition-colors hover:bg-white hover:text-[#0d0d0d]"
                >
                  <Shield className="h-4 w-4" />
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              )}
              <span className="hidden rounded-full bg-white px-3 py-1.5 text-sm text-[#6f6f7b] shadow-[inset_0_0_0_1px_rgba(229,231,235,1)] lg:inline">
                {session?.user?.email}
              </span>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="inline-flex items-center gap-2 rounded-full px-2 py-2 text-sm text-[#6f6f7b] transition-colors hover:bg-white hover:text-[#0d0d0d] sm:px-3"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#343541] text-xs font-semibold text-white">
                  {userInitial}
                </div>
                <LogOut className="h-4 w-4 sm:hidden" />
                <span className="hidden sm:inline">로그아웃</span>
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_left,rgba(107,114,128,0.08),transparent_26%),linear-gradient(180deg,#f7f7f8_0%,#ffffff_100%)]">
          {messages.length === 0 ? (
            <div className="mx-auto flex min-h-full max-w-[760px] flex-col items-center justify-center px-4 py-12 text-center sm:py-20">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-[22px] bg-white shadow-[0_20px_40px_rgba(15,23,42,0.08)] ring-1 ring-black/5">
                <Sparkles className="h-7 w-7 text-[#4b5563]" />
              </div>
              <h2 className="text-3xl font-medium tracking-tight text-[#0d0d0d]">
                질문을 SQL로 바꿔보세요
              </h2>
              <p className="mt-3 max-w-xl text-[15px] leading-7 text-[#6f6f7b]">
                운영 지표, 매출, 회원 행동처럼 자연어로 요청하면 대화 맥락을 유지한 채 SQL 초안을
                생성합니다.
              </p>

              <div className="mt-10 grid w-full gap-3 sm:grid-cols-2">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setInput(prompt)}
                    className="rounded-[24px] border border-[#e5e7eb] bg-white px-4 py-4 text-left text-[14px] leading-6 tracking-tight text-[#0d0d0d] shadow-[0_14px_28px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 hover:border-[#d7dbdf] hover:shadow-[0_20px_40px_rgba(15,23,42,0.08)]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-[760px] px-4 py-6 sm:py-8">
              {messages.map((message, index) => (
                <div
                  key={message.id}
                  className={cn('mb-8', message.role === 'user' ? 'flex justify-end' : '')}
                >
                  {message.role === 'user' ? (
                    <div className="max-w-[min(82%,540px)] rounded-[28px] bg-white px-4 py-3 text-[15px] leading-7 tracking-tight text-[#0d0d0d] shadow-[0_8px_24px_rgba(15,23,42,0.05),inset_0_0_0_1px_rgba(229,231,235,1)]">
                      {message.content}
                    </div>
                  ) : (
                    <div className="flex w-full gap-4">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#343541] text-white">
                        <Sparkles className="h-4 w-4" />
                      </div>

                      <div className="min-w-0 flex-1 space-y-4">
                        {message.sql && !isActiveMessage(message) ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                void executeQuery(
                                  message.id,
                                  message.sql!,
                                  getQuestionForAssistant(index),
                                  message.content
                                )
                              }
                              disabled={executingQuery === message.id}
                              className="inline-flex items-center gap-2 rounded-full bg-[#202123] px-3.5 py-2 text-sm font-medium text-white shadow-[0_12px_28px_rgba(15,23,42,0.16)] transition-colors hover:bg-[#171717] disabled:cursor-not-allowed disabled:bg-[#b7c5c1]"
                            >
                              {executingQuery === message.id
                                ? '리포트 준비 중...'
                                : (message.presentation && message.resultSnapshot) ||
                                    queryResults[message.id]
                                  ? '다시 실행'
                                  : '리포트 보기'}
                            </button>
                            <div className="flex items-center gap-1.5 text-[#8e8ea0]">
                              <span
                                title="요약"
                                className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-[inset_0_0_0_1px_rgba(229,231,235,1)]"
                              >
                                <FileText className="h-3.5 w-3.5" />
                              </span>
                              <span
                                title="표"
                                className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-[inset_0_0_0_1px_rgba(229,231,235,1)]"
                              >
                                <TableProperties className="h-3.5 w-3.5" />
                              </span>
                              <span
                                title="차트"
                                className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-[inset_0_0_0_1px_rgba(229,231,235,1)]"
                              >
                                <BarChart3 className="h-3.5 w-3.5" />
                              </span>
                              <span
                                title="SQL"
                                className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-[inset_0_0_0_1px_rgba(229,231,235,1)]"
                              >
                                <Code2 className="h-3.5 w-3.5" />
                              </span>
                            </div>
                          </div>
                        ) : null}

                        {isActiveMessage(message) ? (
                          (() => {
                            const progressItems = parseProgressLog(message);
                            const currentItem = progressItems.find((item) => item.state === 'run');
                            const currentIndex = Math.max(
                              0,
                              progressItems.findIndex((item) => item.state === 'run')
                            );
                            const elapsed = getElapsedText(message, progressNow);
                            const currentText = currentItem?.text || '요청을 처리하고 있습니다.';

                            return (
                              <div className="max-w-[min(86%,620px)]">
                                <div className="relative overflow-hidden rounded-full border border-[rgba(255,255,255,0.78)] bg-[linear-gradient(180deg,rgba(255,255,255,0.88)_0%,rgba(248,249,251,0.74)_100%)] px-4 py-3 shadow-[0_16px_36px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.92)] backdrop-blur-xl">
                                  <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.9)_18%,rgba(255,255,255,0.9)_82%,rgba(255,255,255,0)_100%)]" />
                                  <div className="flex items-center gap-3">
                                    <div className="inline-flex shrink-0 items-center gap-2">
                                      <span className="h-2 w-2 animate-pulse rounded-full bg-[#111827]" />
                                      <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#8b9099]">
                                        Live
                                      </span>
                                    </div>

                                    <div className="relative min-w-0 flex-1 overflow-hidden">
                                      <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(251,251,252,0.86)_100%)]" />
                                      <div className="overflow-hidden whitespace-nowrap text-[15px] font-medium tracking-[-0.02em] text-[#111827]">
                                        <AnimatedProgressText key={currentText} text={currentText} />
                                      </div>
                                    </div>

                                    <div className="shrink-0 text-[11px] tracking-[0.03em] text-[#a0a6af]">
                                      {elapsed || 'now'}
                                    </div>
                                  </div>
                                </div>

                                <div className="mt-3 flex items-center gap-2.5 px-1">
                                  {progressItems.map((item, itemIndex) => (
                                    <span
                                      key={`${message.id}-progress-${itemIndex}`}
                                      className={cn(
                                        'h-[3px] rounded-full transition-all duration-500',
                                        item.state === 'run' && 'w-9 bg-[#111827]',
                                        item.state === 'done' && 'w-5 bg-[#9ca3af]',
                                        item.state === 'todo' && 'w-5 bg-[#d7dbe1]',
                                        item.state === 'fail' && 'w-9 bg-[#dc2626]',
                                        itemIndex === currentIndex && item.state === 'run' && 'shadow-[0_0_0_5px_rgba(17,24,39,0.05)]'
                                      )}
                                    >
                                      <span className="sr-only">{item.text}</span>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          })()
                        ) : null}

                        {message.status === 'failed' && message.errorMessage ? (
                          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {message.errorMessage}
                          </div>
                        ) : null}

                        {message.presentation && message.resultSnapshot && !isActiveMessage(message) ? (
                          <ReportRenderer
                            presentation={message.presentation}
                            snapshot={message.resultSnapshot}
                            bodyMarkdown={message.content}
                          />
                        ) : null}

                        {message.sql && !message.presentation && !isActiveMessage(message)
                          ? renderQueryResult(message.id)
                          : null}

                        {message.sql && !isActiveMessage(message) ? <SqlCard sql={message.sql} /> : null}

                        {message.parseError && !isActiveMessage(message) ? (
                          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                            SQL을 생성하지 못했습니다. 질문을 조금 더 구체적으로 다시 시도해주세요.
                          </div>
                        ) : null}

                        {!message.presentation && !isActiveMessage(message) ? (
                          <div className="prose prose-neutral max-w-none text-[15px] leading-7 text-[#0d0d0d] prose-p:my-0 prose-p:leading-7 prose-ul:my-3 prose-ol:my-3 prose-li:my-1 prose-strong:text-[#0d0d0d] prose-code:rounded prose-code:bg-[#f7f7f8] prose-code:px-1 prose-code:py-0.5 prose-code:text-[#0d0d0d] prose-code:before:content-none prose-code:after:content-none prose-pre:bg-transparent prose-pre:p-0 prose-table:border-collapse prose-th:border prose-th:border-[#e5e5e5] prose-th:bg-[#f7f7f8] prose-th:px-3 prose-th:py-2 prose-th:text-left prose-td:border prose-td:border-[#e5e5e5] prose-td:px-3 prose-td:py-2">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                pre: CodeBlock,
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        ) : null}

                        {!isActiveMessage(message) ? (
                          <div className="flex items-center gap-2 border-t border-[#efefef] pt-2">
                            <QuickFeedback
                              sessionId={currentSessionId || undefined}
                              messageId={message.id}
                            />
                            <FeedbackButton
                              sessionId={currentSessionId || undefined}
                              messageId={message.id}
                            />
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="mb-8 flex w-full gap-4">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#343541] text-white">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="inline-flex max-w-[min(82%,540px)] items-center gap-2 rounded-[28px] bg-white px-4 py-3 text-[15px] leading-7 tracking-tight text-[#6f6f7b] shadow-[0_8px_24px_rgba(15,23,42,0.05),inset_0_0_0_1px_rgba(229,231,235,1)]">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-[#9ca3af]" />
                      <span>응답 대기 중...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="border-t border-[#e5e7eb] bg-[#f7f7f8]/95 px-4 pb-4 pt-3 backdrop-blur">
          <form onSubmit={handleSubmit} className="mx-auto max-w-[760px]">
            <div className="relative rounded-[28px] border border-[#dfe3e8] bg-white transition-all duration-200 focus-within:border-[#cbd5e1] focus-within:shadow-[0_0_0_4px_rgba(148,163,184,0.12)]">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleTextareaKeyDown}
                placeholder="메시지를 입력하세요"
                rows={1}
                disabled={loading || hasActiveAssistant}
                className="min-h-[88px] w-full resize-none bg-transparent px-4 pt-4 pb-14 text-[15px] tracking-tight text-[#0d0d0d] outline-none placeholder:text-[#8e8ea0] disabled:cursor-not-allowed"
              />

              <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-0.5 text-[#8e8ea0]">
                  <button
                    type="button"
                    disabled
                    className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled
                    className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
                  >
                    <Globe className="h-4 w-4" />
                  </button>
                  <span className="hidden text-[11px] tracking-tight sm:block">
                    Enter 전송 / Shift+Enter 줄바꿈
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={!input.trim() || loading || hasActiveAssistant}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-white transition-all duration-200',
                    input.trim() && !loading && !hasActiveAssistant
                      ? 'bg-[#202123] hover:bg-[#171717]'
                      : 'bg-[#d1d5db] cursor-not-allowed'
                  )}
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              </div>
            </div>

            <p className="mt-2 text-center text-[11px] tracking-tight text-[#b0b0ba]">
              SQL Assistant는 실수할 수 있습니다. 중요한 정보는 반드시 검증하세요.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
