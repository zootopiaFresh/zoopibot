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
        className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
        title="피드백 보내기"
      >
        <MessageSquarePlus className="w-4 h-4" />
        <span>피드백</span>
      </button>

      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-10">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-medium text-gray-800">피드백 보내기</h4>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
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
                  className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                    selectedType === opt.type
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
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
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                />
                <button
                  onClick={handleSubmit}
                  disabled={!feedback.trim() || sending}
                  className="w-full py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
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
