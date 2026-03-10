'use client';

import { useState } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquarePlus, X } from 'lucide-react';

interface FeedbackButtonProps {
  sessionId?: string;
  messageId?: string;
  onFeedbackSent?: () => void;
}

type FeedbackType = 'preference' | 'correction' | 'rule';

const FEEDBACK_OPTIONS = [
  { type: 'preference' as FeedbackType, label: '스타일 개선', placeholder: '예: SQL 키워드를 소문자로 작성해줘' },
  { type: 'correction' as FeedbackType, label: '오류 수정', placeholder: '예: users 테이블의 deleted_at 컬럼을 사용해야 해' },
  { type: 'rule' as FeedbackType, label: '규칙 추가', placeholder: '예: 삭제된 항목 제외: deleted_at IS NULL' },
];

export function FeedbackButton({ sessionId, messageId, onFeedbackSent }: FeedbackButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<FeedbackType | null>(null);
  const [feedback, setFeedback] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!feedback.trim() || !selectedType) return;

    setSending(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedback: feedback.trim(),
          type: selectedType,
          sessionId,
          messageId,
        }),
      });

      if (res.ok) {
        setSent(true);
        setFeedback('');
        setSelectedType(null);
        setTimeout(() => {
          setIsOpen(false);
          setSent(false);
          onFeedbackSent?.();
        }, 1500);
      }
    } catch (err) {
      console.error('Failed to send feedback:', err);
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="flex items-center gap-1 text-green-600 text-sm">
        <ThumbsUp className="w-4 h-4" />
        <span>피드백이 저장되었습니다</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[#8e8ea0] transition-colors hover:bg-[#f7f7f8] hover:text-[#0d0d0d]"
        title="피드백 보내기"
      >
        <MessageSquarePlus className="w-4 h-4" />
        <span>피드백</span>
      </button>

      {isOpen && (
        <div className="absolute bottom-full right-0 z-10 mb-2 w-80 rounded-2xl border border-[#e5e5e5] bg-white p-4 shadow-[0_16px_40px_rgba(13,13,13,0.12)]">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-medium text-[#0d0d0d]">피드백 보내기</h4>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded p-1 text-[#8e8ea0] transition-colors hover:text-[#0d0d0d]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {FEEDBACK_OPTIONS.map((opt) => (
                <button
                  key={opt.type}
                  onClick={() => setSelectedType(opt.type)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    selectedType === opt.type
                      ? 'border-[#10a37f] bg-[#10a37f] text-white'
                      : 'border-[#d9d9df] bg-white text-[#6f6f7b] hover:border-[#10a37f]/40 hover:text-[#0d0d0d]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {selectedType && (
              <>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder={FEEDBACK_OPTIONS.find((o) => o.type === selectedType)?.placeholder}
                  className="w-full resize-none rounded-xl border border-[#d9d9df] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#10a37f]/20"
                  rows={3}
                />
                <button
                  onClick={handleSubmit}
                  disabled={!feedback.trim() || sending}
                  className="w-full rounded-xl bg-[#0d0d0d] py-2 text-sm text-white transition-colors hover:bg-[#2d2d2d] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sending ? '전송 중...' : '피드백 보내기'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// 간단한 좋아요/싫어요 버튼
export function QuickFeedback({ sessionId, messageId }: { sessionId?: string; messageId?: string }) {
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

  const handleQuickFeedback = async (type: 'up' | 'down') => {
    if (feedback) return;

    setFeedback(type);

    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedback: type === 'up' ? '응답이 도움이 되었습니다' : '응답이 도움이 되지 않았습니다',
          type: 'preference',
          sessionId,
          messageId,
        }),
      });
    } catch (err) {
      console.error('Failed to send quick feedback:', err);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => handleQuickFeedback('up')}
        disabled={feedback !== null}
        className={`p-1.5 rounded transition-colors ${
          feedback === 'up'
            ? 'text-green-600 bg-green-50'
            : feedback === null
            ? 'text-gray-400 hover:text-green-600 hover:bg-green-50'
            : 'text-gray-300'
        }`}
        title="도움이 됐어요"
      >
        <ThumbsUp className="w-4 h-4" />
      </button>
      <button
        onClick={() => handleQuickFeedback('down')}
        disabled={feedback !== null}
        className={`p-1.5 rounded transition-colors ${
          feedback === 'down'
            ? 'text-red-600 bg-red-50'
            : feedback === null
            ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
            : 'text-gray-300'
        }`}
        title="도움이 안 됐어요"
      >
        <ThumbsDown className="w-4 h-4" />
      </button>
    </div>
  );
}
