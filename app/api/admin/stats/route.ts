import { NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/admin';
import { prisma } from '@/lib/db';

export async function GET() {
  const auth = await checkAdminAuth();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    // KST 기준 오늘 시작 시간
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 24시간 전
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      todayUsers,
      totalQueries,
      activeSessions,
      recentUsers,
      recentHistories
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: today } } }),
      prisma.history.count({ where: { type: 'query' } }),
      prisma.chatSession.count({ where: { updatedAt: { gte: yesterday } } }),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, email: true, name: true, status: true, createdAt: true }
      }),
      prisma.history.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          input: true,
          createdAt: true,
          user: { select: { email: true } }
        }
      }),
    ]);

    return NextResponse.json({
      totalUsers,
      todayUsers,
      totalQueries,
      activeSessions,
      recentUsers,
      recentHistories,
    });
  } catch (error) {
    console.error('Stats fetch error:', error);
    return NextResponse.json({ error: '통계 조회 실패' }, { status: 500 });
  }
}
