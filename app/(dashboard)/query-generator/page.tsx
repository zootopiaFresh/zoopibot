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
  Check,
  ChevronDown,
  Copy,
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
  Trash2,
} from 'lucide-react';

import { FeedbackButton, QuickFeedback } from '@/components/chat/feedback-button';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sql?: string | null;
  parseError?: boolean;
  createdAt?: string;
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
    <div className="not-prose overflow-hidden rounded-2xl border border-[#e5e5e5] bg-[#1e1e1e] shadow-[0_14px_28px_rgba(13,13,13,0.08)]">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-4 py-2.5">
        <span className="text-xs uppercase tracking-[0.18em] text-[#8e8ea0]">{language}</span>
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-colors',
            copied ? 'text-[#10a37f]' : 'text-[#c5c5d2] hover:bg-white/[0.06] hover:text-white'
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
    <div className="overflow-hidden rounded-2xl bg-[#1e1e1e] shadow-[0_18px_36px_rgba(13,13,13,0.1)]">
      <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="inline-flex items-center gap-2 text-sm text-[#c5c5d2] transition-colors hover:text-white"
        >
          <Sparkles className="h-4 w-4 text-[#10a37f]" />
          <span>sql</span>
          <ChevronDown className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')} />
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-colors',
            copied ? 'text-[#10a37f]' : 'text-[#8e8ea0] hover:bg-white/[0.06] hover:text-white'
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isSubmitting = useRef(false);
  const wasDesktop = useRef(false);

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
  }, [messages]);

  useEffect(() => {
    if (!textareaRef.current) {
      return;
    }

    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
  }, [input]);

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/chat/sessions');
      const data = await response.json();

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
      const data = await response.json();

      if (!data.session) {
        return;
      }

      setCurrentSessionId(sessionId);
      setMessages(data.session.messages);

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
      }

      fetchSessions();
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  const submitMessage = async () => {
    if (!input.trim() || loading || isSubmitting.current) {
      return;
    }

    isSubmitting.current = true;
    setLoading(true);

    let tempUserMessageId: string | null = null;

    try {
      let sessionId = currentSessionId;

      if (!sessionId) {
        const sessionResponse = await fetch('/api/chat/sessions', { method: 'POST' });
        const sessionData = await sessionResponse.json();

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
        body: JSON.stringify({ content: userContent }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '오류가 발생했습니다.');
      }

      setMessages((previous) => {
        const filtered = previous.filter((message) => message.id !== tempUserMessageId);
        return [
          ...filtered,
          data.userMessage,
          {
            ...data.assistantMessage,
            sql: data.assistantMessage.sql || null,
            parseError: data.assistantMessage.parseError || false,
          },
        ];
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

  const handleTextareaKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void submitMessage();
    }
  };

  const handleNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setInput('');

    if (!isDesktop) {
      setSidebarOpen(false);
    }
  };

  const currentSessionTitle =
    sessions.find((item) => item.id === currentSessionId)?.title || 'SQL Assistant';

  return (
    <div className="relative flex h-full min-h-0 bg-white">
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
        <aside className="flex h-full w-[280px] flex-col border-r border-[#e5e5e5] bg-[#f9f9f9]">
          <div className="flex items-center gap-2 p-3">
            <button
              type="button"
              onClick={handleNewChat}
              className="flex flex-1 items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left text-[14px] tracking-tight text-[#0d0d0d] transition-colors hover:bg-[#ececec]"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#10a37f] text-white">
                <Plus className="h-3.5 w-3.5" />
              </div>
              새 대화
            </button>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-[#8e8ea0] transition-colors hover:bg-[#ececec] hover:text-[#0d0d0d]"
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
                        ? 'bg-[#ececec]'
                        : 'hover:bg-[#ececec]/70'
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => loadSession(chatSession.id)}
                      className="flex min-w-0 flex-1 items-start gap-2.5 text-left"
                    >
                      <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#8e8ea0]" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] tracking-tight text-[#0d0d0d]">
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
                      className="mt-0.5 rounded-md p-1 text-[#b0b0ba] opacity-0 transition hover:bg-white hover:text-[#0d0d0d] group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="border-t border-[#e5e5e5] p-2">
            <Link
              href="/settings"
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] tracking-tight text-[#6f6f7b] transition-colors hover:bg-[#ececec] hover:text-[#0d0d0d]"
            >
              <Settings className="h-4 w-4" />
              설정
            </Link>
          </div>
        </aside>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-[#e5e5e5]/80 bg-white/90 px-3 backdrop-blur sm:px-4">
          <div className="flex h-14 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              {!sidebarOpen && (
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#8e8ea0] transition-colors hover:bg-[#f7f7f8] hover:text-[#0d0d0d]"
                >
                  <PanelLeft className="h-4 w-4" />
                </button>
              )}

              <button
                type="button"
                className="inline-flex min-w-0 items-center gap-2 rounded-xl px-3 py-1.5 transition-colors hover:bg-[#f7f7f8]"
              >
                <Sparkles className="h-4 w-4 shrink-0 text-[#10a37f]" />
                <span className="truncate text-[14px] tracking-tight text-[#0d0d0d]">
                  {currentSessionTitle}
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-[#8e8ea0]" />
              </button>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <Link
                href="/settings"
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-[#6f6f7b] transition-colors hover:bg-[#f7f7f8] hover:text-[#0d0d0d]"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">설정</span>
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-[#6f6f7b] transition-colors hover:bg-[#f7f7f8] hover:text-[#0d0d0d]"
                >
                  <Shield className="h-4 w-4" />
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              )}
              <span className="hidden rounded-full bg-[#f7f7f8] px-3 py-1.5 text-sm text-[#6f6f7b] lg:inline">
                {session?.user?.email}
              </span>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="inline-flex items-center gap-2 rounded-full px-2 py-2 text-sm text-[#6f6f7b] transition-colors hover:bg-[#f7f7f8] hover:text-[#0d0d0d] sm:px-3"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#10a37f] text-xs font-semibold text-white">
                  {userInitial}
                </div>
                <LogOut className="h-4 w-4 sm:hidden" />
                <span className="hidden sm:inline">로그아웃</span>
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_left,rgba(16,163,127,0.08),transparent_28%),linear-gradient(180deg,#ffffff_0%,#fcfcfc_100%)]">
          {messages.length === 0 ? (
            <div className="mx-auto flex min-h-full max-w-[760px] flex-col items-center justify-center px-4 py-12 text-center sm:py-20">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-[22px] bg-white shadow-[0_20px_40px_rgba(13,13,13,0.08)] ring-1 ring-black/5">
                <Sparkles className="h-7 w-7 text-[#10a37f]" />
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
                    className="rounded-[24px] border border-[#e5e5e5] bg-white px-4 py-4 text-left text-[14px] leading-6 tracking-tight text-[#0d0d0d] shadow-[0_14px_28px_rgba(13,13,13,0.04)] transition-all hover:-translate-y-0.5 hover:border-[#d1d1d1] hover:shadow-[0_20px_40px_rgba(13,13,13,0.08)]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-[760px] px-4 py-6 sm:py-8">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn('mb-8', message.role === 'user' ? 'flex justify-end' : '')}
                >
                  {message.role === 'user' ? (
                    <div className="max-w-[min(82%,540px)] rounded-[28px] bg-[#f7f7f8] px-4 py-3 text-[15px] leading-7 tracking-tight text-[#0d0d0d] shadow-[inset_0_0_0_1px_rgba(229,229,229,0.8)]">
                      {message.content}
                    </div>
                  ) : (
                    <div className="flex w-full gap-4">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#10a37f] text-white">
                        <Sparkles className="h-4 w-4" />
                      </div>

                      <div className="min-w-0 flex-1 space-y-4">
                        {message.sql ? <SqlCard sql={message.sql} /> : null}

                        {message.parseError ? (
                          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                            SQL을 생성하지 못했습니다. 질문을 조금 더 구체적으로 다시 시도해주세요.
                          </div>
                        ) : null}

                        <div className="prose prose-neutral max-w-none text-[15px] leading-7 text-[#0d0d0d] prose-p:my-0 prose-p:leading-7 prose-ul:my-3 prose-ol:my-3 prose-li:my-1 prose-strong:text-[#0d0d0d] prose-code:rounded prose-code:bg-[#f7f7f8] prose-code:px-1 prose-code:py-0.5 prose-code:text-[#0d0d0d] prose-code:before:content-none prose-code:after:content-none prose-pre:bg-transparent prose-pre:p-0">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              pre: CodeBlock,
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>

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
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-3 pl-11 text-sm text-[#8e8ea0]">
                  <div className="flex gap-1">
                    <span
                      className="h-2 w-2 rounded-full bg-[#10a37f] animate-bounce"
                      style={{ animationDelay: '0ms' }}
                    />
                    <span
                      className="h-2 w-2 rounded-full bg-[#10a37f] animate-bounce"
                      style={{ animationDelay: '150ms' }}
                    />
                    <span
                      className="h-2 w-2 rounded-full bg-[#10a37f] animate-bounce"
                      style={{ animationDelay: '300ms' }}
                    />
                  </div>
                  응답을 생성하는 중입니다...
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="border-t border-[#e5e5e5] bg-white/95 px-4 pb-4 pt-3 backdrop-blur">
          <form onSubmit={handleSubmit} className="mx-auto max-w-[760px]">
            <div className="relative rounded-[28px] border border-[#e5e5e5] bg-[#f7f7f8] transition-all duration-200 focus-within:border-[#d1d1d1] focus-within:shadow-[0_0_0_1px_rgba(13,13,13,0.04)]">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleTextareaKeyDown}
                placeholder="메시지를 입력하세요"
                rows={1}
                disabled={loading}
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
                  disabled={!input.trim() || loading}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-white transition-all duration-200',
                    input.trim() && !loading
                      ? 'bg-[#0d0d0d] hover:bg-[#2d2d2d]'
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
