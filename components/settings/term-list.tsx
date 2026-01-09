'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';

interface DomainTerm {
  id: string;
  term: string;
  mapping: string;
  description: string | null;
}

export function TermList() {
  const [terms, setTerms] = useState<DomainTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ term: '', mapping: '', description: '' });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchTerms();
  }, []);

  const fetchTerms = async () => {
    try {
      const res = await fetch('/api/terms');
      const data = await res.json();
      setTerms(data.terms || []);
    } catch (err) {
      console.error('Failed to fetch terms:', err);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleAdd = async () => {
    if (!formData.term || !formData.mapping) {
      showMessage('error', '용어와 매핑은 필수입니다.');
      return;
    }

    try {
      const res = await fetch('/api/terms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const data = await res.json();
        setTerms([data.term, ...terms]);
        setFormData({ term: '', mapping: '', description: '' });
        setIsAdding(false);
        showMessage('success', '용어가 추가되었습니다.');
      } else {
        const data = await res.json();
        showMessage('error', data.error || '추가에 실패했습니다.');
      }
    } catch (err) {
      showMessage('error', '네트워크 오류가 발생했습니다.');
    }
  };

  const handleUpdate = async (id: string) => {
    if (!formData.term || !formData.mapping) {
      showMessage('error', '용어와 매핑은 필수입니다.');
      return;
    }

    try {
      const res = await fetch(`/api/terms/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const data = await res.json();
        setTerms(terms.map((t) => (t.id === id ? data.term : t)));
        setEditingId(null);
        setFormData({ term: '', mapping: '', description: '' });
        showMessage('success', '용어가 수정되었습니다.');
      } else {
        const data = await res.json();
        showMessage('error', data.error || '수정에 실패했습니다.');
      }
    } catch (err) {
      showMessage('error', '네트워크 오류가 발생했습니다.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 용어를 삭제하시겠습니까?')) return;

    try {
      const res = await fetch(`/api/terms/${id}`, { method: 'DELETE' });

      if (res.ok) {
        setTerms(terms.filter((t) => t.id !== id));
        showMessage('success', '용어가 삭제되었습니다.');
      } else {
        showMessage('error', '삭제에 실패했습니다.');
      }
    } catch (err) {
      showMessage('error', '네트워크 오류가 발생했습니다.');
    }
  };

  const startEdit = (term: DomainTerm) => {
    setEditingId(term.id);
    setFormData({
      term: term.term,
      mapping: term.mapping,
      description: term.description || '',
    });
    setIsAdding(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData({ term: '', mapping: '', description: '' });
  };

  if (loading) {
    return <div className="text-gray-500">로딩 중...</div>;
  }

  return (
    <div className="space-y-4">
      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          비즈니스 용어를 DB 컬럼이나 테이블에 매핑하세요.
        </p>
        <button
          onClick={() => {
            setIsAdding(true);
            setEditingId(null);
            setFormData({ term: '', mapping: '', description: '' });
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          추가
        </button>
      </div>

      {isAdding && (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="용어 (예: 활성 회원)"
              value={formData.term}
              onChange={(e) => setFormData({ ...formData, term: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="text"
              placeholder="매핑 (예: users.status = 'active')"
              value={formData.mapping}
              onChange={(e) => setFormData({ ...formData, mapping: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <input
            type="text"
            placeholder="설명 (선택사항)"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <Check className="w-4 h-4" />
              저장
            </button>
            <button
              onClick={cancelEdit}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              <X className="w-4 h-4" />
              취소
            </button>
          </div>
        </div>
      )}

      {terms.length === 0 && !isAdding ? (
        <div className="text-center py-8 text-gray-500">
          등록된 용어가 없습니다.
        </div>
      ) : (
        <div className="space-y-2">
          {terms.map((term) =>
            editingId === term.id ? (
              <div key={term.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={formData.term}
                    onChange={(e) => setFormData({ ...formData, term: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="text"
                    value={formData.mapping}
                    onChange={(e) => setFormData({ ...formData, mapping: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdate(term.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    <Check className="w-4 h-4" />
                    저장
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    <X className="w-4 h-4" />
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <div
                key={term.id}
                className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800">&ldquo;{term.term}&rdquo;</span>
                    <span className="text-gray-400">→</span>
                    <code className="px-2 py-0.5 bg-gray-100 text-sm rounded">{term.mapping}</code>
                  </div>
                  {term.description && (
                    <p className="text-sm text-gray-500 mt-1">{term.description}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => startEdit(term)}
                    className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(term.id)}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
