import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { runBatchLearning, runBatchLearningForAllUsers } from '@/lib/learning';

// 학습 로그 및 통계 조회 (Admin 전용)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = session.user as any;
  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // 최근 학습 로그 조회 (최근 50개)
    const logs = await prisma.learningLog.findMany({
      take: 50,
      orderBy: { learnedAt: 'desc' },
      select: {
        id: true,
        userId: true,
        learnedAt: true,
        summary: true,
      },
    });

    // 자주 사용되는 테이블 통계 (전체 사용자 기준)
    const frequentTables = await prisma.frequentTable.groupBy({
      by: ['tableName'],
      _sum: {
        usageCount: true,
      },
      _count: {
        userId: true,
      },
      orderBy: {
        _sum: {
          usageCount: 'desc',
        },
      },
      take: 20,
    });

    const formattedTables = frequentTables.map(t => ({
      tableName: t.tableName,
      totalUsage: t._sum.usageCount || 0,
      userCount: t._count.userId,
    }));

    return NextResponse.json({
      logs,
      frequentTables: formattedTables,
    });
  } catch (error) {
    console.error('[Learning API] GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch learning data' }, { status: 500 });
  }
}

// 배치 학습 트리거 (Admin 전용)
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = session.user as any;
  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const data = await request.json();

    if (data.userId) {
      // 특정 사용자에 대해 학습 실행
      const log = await runBatchLearning(data.userId);
      return NextResponse.json({
        success: true,
        message: 'Batch learning completed for user',
        log,
      });
    } else {
      // 모든 활성 사용자에 대해 학습 실행
      const result = await runBatchLearningForAllUsers();
      return NextResponse.json({
        success: true,
        message: `Batch learning completed for ${result.usersProcessed} users`,
        ...result,
      });
    }
  } catch (error) {
    console.error('[Learning API] Error:', error);
    return NextResponse.json({ error: 'Failed to run batch learning' }, { status: 500 });
  }
}
