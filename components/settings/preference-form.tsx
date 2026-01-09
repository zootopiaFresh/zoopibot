'use client';

import { useState, useEffect } from 'react';
import type { UserPreferenceData } from '@/lib/preferences';

const OPTIONS = {
  sqlKeywordCase: [
    { value: 'uppercase', label: 'SELECT, FROM, WHERE' },
    { value: 'lowercase', label: 'select, from, where' },
  ],
  aliasStyle: [
    { value: 'meaningful', label: '의미있게 (users u, orders o)' },
    { value: 'short', label: '짧게 (t1, t2, u, o)' },
  ],
  indentation: [
    { value: '2spaces', label: '2칸 공백' },
    { value: '4spaces', label: '4칸 공백' },
    { value: 'tab', label: '탭 문자' },
  ],
  explanationDetail: [
    { value: 'detailed', label: '상세하게' },
    { value: 'brief', label: '간략하게' },
  ],
  responseTone: [
    { value: 'formal', label: '격식체 (~습니다)' },
    { value: 'casual', label: '비격식체 (~해요)' },
  ],
};

const LABELS = {
  sqlKeywordCase: 'SQL 키워드 대소문자',
  aliasStyle: '테이블 별칭 스타일',
  indentation: '들여쓰기',
  explanationDetail: '설명 상세도',
  responseTone: '응답 톤',
};

export function PreferenceForm() {
  const [preference, setPreference] = useState<UserPreferenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/preferences')
      .then((res) => res.json())
      .then((data) => {
        setPreference(data.preference);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load preferences:', err);
        setLoading(false);
      });
  }, []);

  const handleChange = (key: keyof UserPreferenceData, value: string) => {
    if (!preference) return;
    setPreference({ ...preference, [key]: value });
  };

  const handleSave = async () => {
    if (!preference) return;
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preference),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: '설정이 저장되었습니다.' });
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || '저장에 실패했습니다.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: '네트워크 오류가 발생했습니다.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-gray-500">로딩 중...</div>;
  }

  if (!preference) {
    return <div className="p-6 text-red-500">설정을 불러올 수 없습니다.</div>;
  }

  return (
    <div className="space-y-6">
      {Object.entries(OPTIONS).map(([key, options]) => (
        <div key={key}>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {LABELS[key as keyof typeof LABELS]}
          </label>
          <div className="flex flex-wrap gap-2">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleChange(key as keyof UserPreferenceData, opt.value)}
                className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                  preference[key as keyof UserPreferenceData] === opt.value
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      ))}

      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        {saving ? '저장 중...' : '저장'}
      </button>
    </div>
  );
}
