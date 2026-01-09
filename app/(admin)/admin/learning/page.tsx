'use client';

import { useState, useEffect } from 'react';
import { Brain, Play, RefreshCw, Table2, User } from 'lucide-react';

interface LearningLog {
  id: string;
  userId: string;
  learnedAt: string;
  summary: string;
}

interface FrequentTable {
  tableName: string;
  totalUsage: number;
  userCount: number;
}

export default function AdminLearningPage() {
  const [logs, setLogs] = useState<LearningLog[]>([]);
  const [tables, setTables] = useState<FrequentTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/learning');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTables(data.frequentTables || []);
      }
    } catch (error) {
      console.error('Failed to fetch learning data:', error);
    } finally {
      setLoading(false);
    }
  };

  const runBatchLearning = async () => {
    if (!confirm('전체 활성 사용자에 대해 배치 학습을 실행하시겠습니까?')) return;

    setRunning(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/learning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
        fetchData();
      } else {
        setMessage({ type: 'error', text: data.error || '학습 실행 실패' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '네트워크 오류' });
    } finally {
      setRunning(false);
    }
  };

  const parseSummary = (summary: string) => {
    try {
      return JSON.parse(summary);
    } catch {
      return { tablesProcessed: 0, rulesCreated: 0 };
    }
  };

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">학습 관리</h1>
          <p className="text-gray-500">피드백 기반 배치 학습을 관리합니다</p>
        </div>
        <button
          onClick={runBatchLearning}
          disabled={running}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {running ? '실행 중...' : '배치 학습 실행'}
        </button>
      </div>

      {/* 알림 메시지 */}
      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 최근 학습 로그 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-900">최근 학습 로그</h2>
            </div>
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Brain className="w-10 h-10 mb-3 opacity-50" />
                <p>학습 로그가 없습니다</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {logs.slice(0, 15).map((log) => {
                  const summary = parseSummary(log.summary);
                  return (
                    <div key={log.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-xs text-gray-500 font-mono">{log.userId.slice(0, 8)}...</span>
                          </div>
                          <div className="text-sm font-medium text-gray-900">
                            테이블 {summary.tablesProcessed}개, 규칙 {summary.rulesCreated}개
                          </div>
                        </div>
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {new Date(log.learnedAt).toLocaleString('ko-KR')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 자주 사용되는 테이블 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Table2 className="w-5 h-5 text-green-600" />
              <h2 className="text-lg font-semibold text-gray-900">자주 사용되는 테이블</h2>
            </div>
            {tables.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Table2 className="w-10 h-10 mb-3 opacity-50" />
                <p>데이터가 없습니다</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {tables.map((t, i) => (
                  <div key={t.tableName} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 flex items-center justify-center bg-gray-200 text-gray-600 text-xs font-medium rounded-full">
                        {i + 1}
                      </span>
                      <code className="text-sm text-gray-900 font-mono">{t.tableName}</code>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{t.totalUsage.toLocaleString()}회</p>
                      <p className="text-xs text-gray-500">{t.userCount}명</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
