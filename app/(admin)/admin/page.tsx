'use client';

import { useState, useEffect } from 'react';
import { Users, UserPlus, MessageSquare, Activity, MessageSquareText } from 'lucide-react';
import { StatsCard } from '@/components/admin/stats-card';

interface Stats {
  totalUsers: number;
  todayUsers: number;
  totalQueries: number;
  activeSessions: number;
  totalFeedbacks: number;
  pendingFeedbacks: number;
  recentUsers: Array<{
    id: string;
    email: string;
    name: string | null;
    status: string;
    createdAt: string;
  }>;
  recentHistories: Array<{
    id: string;
    type: string;
    input: string;
    createdAt: string;
    user: { email: string };
  }>;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
        <p className="text-gray-500">서비스 현황을 한눈에 확인하세요</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard
          title="총 회원 수"
          value={stats?.totalUsers || 0}
          icon={<Users className="w-6 h-6" />}
        />
        <StatsCard
          title="오늘 가입"
          value={stats?.todayUsers || 0}
          icon={<UserPlus className="w-6 h-6" />}
        />
        <StatsCard
          title="총 쿼리 수"
          value={stats?.totalQueries || 0}
          icon={<MessageSquare className="w-6 h-6" />}
        />
        <StatsCard
          title="활성 세션 (24h)"
          value={stats?.activeSessions || 0}
          icon={<Activity className="w-6 h-6" />}
        />
        <StatsCard
          title="미처리 피드백"
          value={stats?.pendingFeedbacks || 0}
          icon={<MessageSquareText className="w-6 h-6" />}
          subtitle={`전체 ${stats?.totalFeedbacks || 0}건`}
        />
      </div>

      {/* 최근 가입 회원 & 최근 활동 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 최근 가입 회원 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">최근 가입 회원</h2>
          {stats?.recentUsers && stats.recentUsers.length > 0 ? (
            <div className="space-y-3">
              {stats.recentUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">{user.name || user.email.split('@')[0]}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      user.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {user.status === 'active' ? '활성' : '비활성'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(user.createdAt).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">최근 가입한 회원이 없습니다</p>
          )}
        </div>

        {/* 최근 활동 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">최근 활동</h2>
          {stats?.recentHistories && stats.recentHistories.length > 0 ? (
            <div className="space-y-3">
              {stats.recentHistories.map((history) => (
                <div key={history.id} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
                  <span className={`px-2 py-0.5 text-xs rounded flex-shrink-0 ${
                    history.type === 'query'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-purple-100 text-purple-700'
                  }`}>
                    {history.type === 'query' ? 'SQL' : 'Doc'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{history.input.slice(0, 50)}...</p>
                    <p className="text-xs text-gray-500">{history.user.email}</p>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {new Date(history.createdAt).toLocaleDateString('ko-KR')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">최근 활동이 없습니다</p>
          )}
        </div>
      </div>
    </div>
  );
}
