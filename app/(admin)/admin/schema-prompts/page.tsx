'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Save, Trash2, RefreshCw, Eye, EyeOff, FileCode } from 'lucide-react';
import dynamic from 'next/dynamic';

// SSR 이슈 방지를 위해 dynamic import
const MDEditor = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => mod.default),
  {
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-full text-gray-400">에디터 로딩 중...</div>
  }
);

interface SchemaPrompt {
  id: string;
  name: string;
  content: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function SchemaPromptsPage() {
  const [prompts, setPrompts] = useState<SchemaPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrompt, setSelectedPrompt] = useState<SchemaPrompt | null>(null);
  const [editName, setEditName] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isNewMode, setIsNewMode] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 목록 조회
  const fetchPrompts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/schema-prompts');
      if (res.ok) {
        const data = await res.json();
        setPrompts(data.prompts);
      } else {
        showMessage('error', '목록 조회에 실패했습니다');
      }
    } catch (error) {
      console.error('Failed to fetch prompts:', error);
      showMessage('error', '목록 조회에 실패했습니다');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  // 메시지 표시
  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // 프롬프트 선택
  const handleSelect = (prompt: SchemaPrompt) => {
    setSelectedPrompt(prompt);
    setEditName(prompt.name);
    setEditContent(prompt.content);
    setEditIsActive(prompt.isActive);
    setIsNewMode(false);
  };

  // 새로 만들기
  const handleNew = () => {
    setSelectedPrompt(null);
    setEditName('');
    setEditContent('# 새 스키마 프롬프트\n\n');
    setEditIsActive(true);
    setIsNewMode(true);
  };

  // 저장
  const handleSave = async () => {
    if (!editName.trim()) {
      showMessage('error', '이름을 입력해주세요');
      return;
    }
    if (!editContent.trim() || editContent.length < 10) {
      showMessage('error', '내용은 10자 이상 입력해주세요');
      return;
    }

    setSaving(true);
    try {
      const url = isNewMode
        ? '/api/admin/schema-prompts'
        : `/api/admin/schema-prompts/${selectedPrompt?.id}`;
      const method = isNewMode ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          content: editContent,
          isActive: editIsActive,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        showMessage('success', isNewMode ? '생성되었습니다' : '저장되었습니다');
        await fetchPrompts();
        if (isNewMode && data.prompt) {
          setSelectedPrompt(data.prompt);
          setIsNewMode(false);
        }
      } else {
        showMessage('error', data.error || '저장에 실패했습니다');
      }
    } catch (error) {
      console.error('Failed to save:', error);
      showMessage('error', '저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  // 삭제
  const handleDelete = async () => {
    if (!selectedPrompt) return;
    if (!confirm(`"${selectedPrompt.name}"을(를) 삭제하시겠습니까?`)) return;

    try {
      const res = await fetch(`/api/admin/schema-prompts/${selectedPrompt.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        showMessage('success', '삭제되었습니다');
        setSelectedPrompt(null);
        setEditName('');
        setEditContent('');
        await fetchPrompts();
      } else {
        const data = await res.json();
        showMessage('error', data.error || '삭제에 실패했습니다');
      }
    } catch (error) {
      console.error('Failed to delete:', error);
      showMessage('error', '삭제에 실패했습니다');
    }
  };

  // 캐시 무효화
  const handleInvalidateCache = async () => {
    try {
      const res = await fetch('/api/admin/schema-prompts/invalidate-cache', {
        method: 'POST',
      });

      if (res.ok) {
        showMessage('success', '캐시가 무효화되었습니다');
      } else {
        showMessage('error', '캐시 무효화에 실패했습니다');
      }
    } catch (error) {
      console.error('Failed to invalidate cache:', error);
      showMessage('error', '캐시 무효화에 실패했습니다');
    }
  };

  // 활성화 토글
  const handleToggleActive = async (prompt: SchemaPrompt, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/admin/schema-prompts/${prompt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !prompt.isActive }),
      });

      if (res.ok) {
        await fetchPrompts();
        if (selectedPrompt?.id === prompt.id) {
          setEditIsActive(!prompt.isActive);
        }
      }
    } catch (error) {
      console.error('Failed to toggle active:', error);
    }
  };

  return (
    <div className="h-[calc(100vh-3rem)] flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">스키마 프롬프트 관리</h1>
          <p className="text-gray-500">SQL 생성에 사용되는 DB 스키마 프롬프트를 관리합니다</p>
        </div>
        <button
          onClick={handleInvalidateCache}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          캐시 초기화
        </button>
      </div>

      {/* 메시지 */}
      {message && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* 메인 콘텐츠 */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* 좌측: 목록 */}
        <div className="w-72 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-3 border-b border-gray-200">
            <button
              onClick={handleNew}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              새 프롬프트
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full" />
              </div>
            ) : prompts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                등록된 프롬프트가 없습니다
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {prompts.map((prompt) => (
                  <li
                    key={prompt.id}
                    onClick={() => handleSelect(prompt)}
                    className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors ${
                      selectedPrompt?.id === prompt.id
                        ? 'bg-indigo-50 border-l-4 border-indigo-600'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p
                        className={`font-medium truncate ${
                          prompt.isActive ? 'text-gray-900' : 'text-gray-400'
                        }`}
                      >
                        {prompt.name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {Math.round(prompt.content.length / 1024)}KB
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleToggleActive(prompt, e)}
                      className={`p-1.5 rounded-full transition-colors ${
                        prompt.isActive
                          ? 'text-green-600 hover:bg-green-50'
                          : 'text-gray-400 hover:bg-gray-100'
                      }`}
                      title={prompt.isActive ? '활성화됨' : '비활성화됨'}
                    >
                      {prompt.isActive ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <EyeOff className="w-4 h-4" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* 우측: 에디터 */}
        <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {selectedPrompt || isNewMode ? (
            <>
              {/* 에디터 헤더 */}
              <div className="flex items-center gap-4 p-4 border-b border-gray-200">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="프롬프트 이름 (예: 01-member)"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editIsActive}
                    onChange={(e) => setEditIsActive(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-600">활성화</span>
                </label>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {saving ? '저장 중...' : '저장'}
                </button>
                {!isNewMode && (
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-2 px-4 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    삭제
                  </button>
                )}
              </div>

              {/* 마크다운 에디터 */}
              <div className="flex-1 overflow-hidden" data-color-mode="light">
                <MDEditor
                  value={editContent}
                  onChange={(val) => setEditContent(val || '')}
                  height="100%"
                  preview="live"
                  hideToolbar={false}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <FileCode className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>좌측에서 프롬프트를 선택하거나</p>
                <p>새 프롬프트를 생성해주세요</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
