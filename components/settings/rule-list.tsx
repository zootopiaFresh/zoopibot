'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Check, ToggleLeft, ToggleRight } from 'lucide-react';

interface BusinessRule {
  id: string;
  name: string;
  condition: string;
  scope: string;
  isActive: boolean;
  isLearned: boolean;
}

export function RuleList() {
  const [rules, setRules] = useState<BusinessRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', condition: '', scope: 'global' });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const res = await fetch('/api/rules');
      const data = await res.json();
      setRules(data.rules || []);
    } catch (err) {
      console.error('Failed to fetch rules:', err);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleAdd = async () => {
    if (!formData.name || !formData.condition) {
      showMessage('error', '규칙 이름과 조건은 필수입니다.');
      return;
    }

    try {
      const res = await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const data = await res.json();
        setRules([data.rule, ...rules]);
        setFormData({ name: '', condition: '', scope: 'global' });
        setIsAdding(false);
        showMessage('success', '규칙이 추가되었습니다.');
      } else {
        const data = await res.json();
        showMessage('error', data.error || '추가에 실패했습니다.');
      }
    } catch (err) {
      showMessage('error', '네트워크 오류가 발생했습니다.');
    }
  };

  const handleUpdate = async (id: string, data?: Partial<BusinessRule>) => {
    const updateData = data || formData;

    try {
      const res = await fetch(`/api/rules/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (res.ok) {
        const result = await res.json();
        setRules(rules.map((r) => (r.id === id ? result.rule : r)));
        if (!data) {
          setEditingId(null);
          setFormData({ name: '', condition: '', scope: 'global' });
        }
        showMessage('success', '규칙이 수정되었습니다.');
      } else {
        const result = await res.json();
        showMessage('error', result.error || '수정에 실패했습니다.');
      }
    } catch (err) {
      showMessage('error', '네트워크 오류가 발생했습니다.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 규칙을 삭제하시겠습니까?')) return;

    try {
      const res = await fetch(`/api/rules/${id}`, { method: 'DELETE' });

      if (res.ok) {
        setRules(rules.filter((r) => r.id !== id));
        showMessage('success', '규칙이 삭제되었습니다.');
      } else {
        showMessage('error', '삭제에 실패했습니다.');
      }
    } catch (err) {
      showMessage('error', '네트워크 오류가 발생했습니다.');
    }
  };

  const toggleActive = (rule: BusinessRule) => {
    handleUpdate(rule.id, { isActive: !rule.isActive });
  };

  const startEdit = (rule: BusinessRule) => {
    setEditingId(rule.id);
    setFormData({
      name: rule.name,
      condition: rule.condition,
      scope: rule.scope,
    });
    setIsAdding(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData({ name: '', condition: '', scope: 'global' });
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
          SQL 쿼리에 자동으로 적용할 조건을 설정하세요.
        </p>
        <button
          onClick={() => {
            setIsAdding(true);
            setEditingId(null);
            setFormData({ name: '', condition: '', scope: 'global' });
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          추가
        </button>
      </div>

      {isAdding && (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
          <input
            type="text"
            placeholder="규칙 이름 (예: 삭제된 항목 제외)"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="text"
            placeholder="SQL 조건 (예: deleted_at IS NULL)"
            value={formData.condition}
            onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            value={formData.scope}
            onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="global">전체 테이블</option>
            <option value="users">users 테이블</option>
            <option value="orders">orders 테이블</option>
            <option value="products">products 테이블</option>
          </select>
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

      {rules.length === 0 && !isAdding ? (
        <div className="text-center py-8 text-gray-500">
          등록된 규칙이 없습니다.
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) =>
            editingId === rule.id ? (
              <div key={rule.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="text"
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <select
                  value={formData.scope}
                  onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="global">전체 테이블</option>
                  <option value="users">users 테이블</option>
                  <option value="orders">orders 테이블</option>
                  <option value="products">products 테이블</option>
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdate(rule.id)}
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
                key={rule.id}
                className={`flex items-center justify-between p-4 bg-white rounded-lg border ${
                  rule.isActive ? 'border-gray-200' : 'border-gray-200 opacity-50'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800">{rule.name}</span>
                    {rule.isLearned && (
                      <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
                        자동 학습
                      </span>
                    )}
                    <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                      {rule.scope === 'global' ? '전체' : rule.scope}
                    </span>
                  </div>
                  <code className="text-sm text-gray-600 mt-1 block">{rule.condition}</code>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleActive(rule)}
                    className={`p-2 rounded-lg transition-colors ${
                      rule.isActive
                        ? 'text-green-600 hover:bg-green-50'
                        : 'text-gray-400 hover:bg-gray-100'
                    }`}
                    title={rule.isActive ? '비활성화' : '활성화'}
                  >
                    {rule.isActive ? (
                      <ToggleRight className="w-5 h-5" />
                    ) : (
                      <ToggleLeft className="w-5 h-5" />
                    )}
                  </button>
                  <button
                    onClick={() => startEdit(rule)}
                    className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(rule.id)}
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
